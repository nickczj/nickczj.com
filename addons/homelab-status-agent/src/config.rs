use std::{env, fmt, fs, path::PathBuf};

use anyhow::{bail, Context, Result};
use clap::{Parser, ValueEnum};
use serde::Deserialize;

use crate::payload::normalize_node_id;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, ValueEnum)]
#[serde(rename_all = "lowercase")]
pub enum CollectorMode {
    Haos,
    Linux,
}

impl fmt::Display for CollectorMode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CollectorMode::Haos => f.write_str("haos"),
            CollectorMode::Linux => f.write_str("linux"),
        }
    }
}

#[derive(Debug, Parser)]
#[command(name = "homelab-status-agent")]
#[command(about = "Push homelab node health metrics to a status API")]
pub struct Cli {
    #[arg(long, help = "Collect and push once, then exit")]
    pub once: bool,

    #[arg(long, help = "Run forever, pushing at the configured interval")]
    pub daemon: bool,

    #[arg(long, help = "Print payload JSON instead of pushing")]
    pub dry_run: bool,

    #[arg(long, value_name = "SECONDS")]
    pub interval_seconds: Option<u64>,

    #[arg(long, value_enum)]
    pub mode: Option<CollectorMode>,

    #[arg(long, value_name = "PATH")]
    pub config: Option<PathBuf>,
}

#[derive(Debug, Clone)]
pub struct Config {
    pub endpoint: Option<String>,
    pub token: Option<String>,
    pub node_id: String,
    pub node_name: String,
    pub node_role: String,
    pub collector_mode: CollectorMode,
    pub interval_seconds: u64,
    pub tailscale_enabled: bool,
    pub tailscale_addon_slug: String,
    pub dry_run: bool,
    pub daemon: bool,
}

#[derive(Debug, Default, Deserialize)]
struct OptionsFile {
    endpoint: Option<String>,
    token: Option<String>,
    node_id: Option<String>,
    node_name: Option<String>,
    node_role: Option<String>,
    collector_mode: Option<CollectorMode>,
    interval_seconds: Option<u64>,
    tailscale_enabled: Option<bool>,
    tailscale_addon_slug: Option<String>,
    dry_run: Option<bool>,
}

impl Config {
    pub fn load(cli: Cli) -> Result<Self> {
        let options = load_options(cli.config.clone())?;
        Self::from_sources(cli, options, |key| env::var(key).ok())
    }

    fn from_sources<F>(cli: Cli, options: OptionsFile, env_get: F) -> Result<Self>
    where
        F: Fn(&str) -> Option<String>,
    {
        if cli.once && cli.daemon {
            bail!("--once and --daemon cannot be used together");
        }

        let node_name = first_non_empty([
            env_string(&env_get, "HOMELAB_NODE_NAME"),
            options.node_name,
            Some("Home Assistant Yellow".to_string()),
        ])
        .expect("default node name should be present");

        let raw_node_id = first_non_empty([
            env_string(&env_get, "HOMELAB_NODE_ID"),
            options.node_id,
            Some("ha-yellow".to_string()),
        ])
        .expect("default node id should be present");
        let node_id = {
            let normalized = normalize_node_id(&raw_node_id);
            if normalized.is_empty() {
                let fallback = normalize_node_id(&node_name);
                if fallback.is_empty() {
                    "homelab".to_string()
                } else {
                    fallback
                }
            } else {
                normalized
            }
        };

        let dry_run = cli.dry_run
            || env_bool(&env_get, "HOMELAB_DRY_RUN").unwrap_or(options.dry_run.unwrap_or(false));

        let config = Self {
            endpoint: first_non_empty([
                env_string(&env_get, "HOMELAB_STATUS_ENDPOINT"),
                options.endpoint,
                None,
            ]),
            token: first_non_empty([
                env_string(&env_get, "HOMELAB_STATUS_TOKEN"),
                options.token,
                None,
            ]),
            node_id,
            node_name,
            node_role: first_non_empty([
                env_string(&env_get, "HOMELAB_NODE_ROLE"),
                options.node_role,
                Some("smart home".to_string()),
            ])
            .expect("default node role should be present"),
            collector_mode: cli
                .mode
                .or_else(|| env_collector_mode(&env_get, "HOMELAB_COLLECTOR_MODE"))
                .or(options.collector_mode)
                .unwrap_or(CollectorMode::Haos),
            interval_seconds: cli
                .interval_seconds
                .or_else(|| env_u64(&env_get, "HOMELAB_INTERVAL_SECONDS"))
                .or(options.interval_seconds)
                .unwrap_or(120),
            tailscale_enabled: env_bool(&env_get, "HOMELAB_TAILSCALE_ENABLED")
                .unwrap_or(options.tailscale_enabled.unwrap_or(true)),
            tailscale_addon_slug: first_non_empty([
                env_string(&env_get, "HOMELAB_TAILSCALE_ADDON_SLUG"),
                options.tailscale_addon_slug,
                Some("tailscale".to_string()),
            ])
            .expect("default tailscale add-on slug should be present"),
            dry_run,
            daemon: cli.daemon,
        };

        if !config.dry_run {
            if config.endpoint.is_none() {
                bail!("HOMELAB_STATUS_ENDPOINT or add-on endpoint option is required");
            }
            if config.token.is_none() {
                bail!("HOMELAB_STATUS_TOKEN or add-on token option is required");
            }
        }

        Ok(config)
    }
}

fn load_options(explicit_path: Option<PathBuf>) -> Result<OptionsFile> {
    let explicit = explicit_path.is_some();
    let path = explicit_path.unwrap_or_else(|| PathBuf::from("/data/options.json"));
    if !path.exists() {
        if explicit {
            bail!("config file does not exist: {}", path.display());
        }
        return Ok(OptionsFile::default());
    }

    let raw = fs::read_to_string(&path)
        .with_context(|| format!("failed to read config file {}", path.display()))?;
    serde_json::from_str(&raw)
        .with_context(|| format!("failed to parse config file {}", path.display()))
}

fn env_string(env_get: &impl Fn(&str) -> Option<String>, key: &str) -> Option<String> {
    env_get(key).and_then(non_empty)
}

fn env_bool(env_get: &impl Fn(&str) -> Option<String>, key: &str) -> Option<bool> {
    let value = env_string(env_get, key)?.to_lowercase();
    match value.as_str() {
        "1" | "true" | "yes" | "on" => Some(true),
        "0" | "false" | "no" | "off" => Some(false),
        _ => None,
    }
}

fn env_u64(env_get: &impl Fn(&str) -> Option<String>, key: &str) -> Option<u64> {
    env_string(env_get, key)?.parse().ok()
}

fn env_collector_mode(
    env_get: &impl Fn(&str) -> Option<String>,
    key: &str,
) -> Option<CollectorMode> {
    match env_string(env_get, key)?.to_lowercase().as_str() {
        "haos" => Some(CollectorMode::Haos),
        "linux" => Some(CollectorMode::Linux),
        _ => None,
    }
}

fn first_non_empty(values: impl IntoIterator<Item = Option<String>>) -> Option<String> {
    values.into_iter().flatten().find_map(non_empty)
}

fn non_empty(value: String) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_to_haos_identity_for_dry_run() {
        let config = Config::from_sources(
            Cli {
                once: true,
                daemon: false,
                dry_run: true,
                interval_seconds: None,
                mode: None,
                config: None,
            },
            OptionsFile::default(),
            |_| None,
        )
        .expect("config should load");

        assert_eq!(config.node_id, "ha-yellow");
        assert_eq!(config.node_name, "Home Assistant Yellow");
        assert_eq!(config.node_role, "smart home");
        assert_eq!(config.collector_mode, CollectorMode::Haos);
        assert_eq!(config.interval_seconds, 120);
        assert!(config.tailscale_enabled);
        assert_eq!(config.tailscale_addon_slug, "tailscale");
        assert!(config.dry_run);
    }

    #[test]
    fn rejects_push_without_endpoint_or_token() {
        let err = Config::from_sources(
            Cli {
                once: true,
                daemon: false,
                dry_run: false,
                interval_seconds: None,
                mode: None,
                config: None,
            },
            OptionsFile::default(),
            |_| None,
        )
        .expect_err("missing push config should fail");

        assert!(err.to_string().contains("endpoint"));
    }
}
