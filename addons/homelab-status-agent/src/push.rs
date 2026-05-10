use std::time::Duration;

use anyhow::{bail, Context, Result};
use serde_json::Value;
use tracing::info;

use crate::{config::Config, payload::HomelabStatusPayload};

pub async fn push_payload(config: &Config, payload: &HomelabStatusPayload) -> Result<()> {
    if config.dry_run {
        println!("{}", serde_json::to_string_pretty(payload)?);
        return Ok(());
    }

    let endpoint = config
        .endpoint
        .as_deref()
        .context("status endpoint is required")?;
    let token = config
        .token
        .as_deref()
        .context("status token is required")?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .user_agent(format!(
            "homelab-status-agent/{}",
            env!("CARGO_PKG_VERSION")
        ))
        .build()?;

    let response = client
        .post(endpoint)
        .bearer_auth(token)
        .json(payload)
        .send()
        .await
        .context("failed to send status push")?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        bail!(
            "status push failed: {}{}",
            status,
            if body.is_empty() {
                String::new()
            } else {
                format!(" - {}", truncate(&body, 512))
            }
        );
    }

    let source = response.json::<Value>().await.ok().and_then(|value| {
        value
            .get("source")
            .and_then(|source| source.as_str())
            .map(str::to_string)
    });

    info!(
        endpoint = endpoint,
        source = source.as_deref().unwrap_or("unknown"),
        "pushed homelab status"
    );

    Ok(())
}

fn truncate(value: &str, max_chars: usize) -> String {
    value.chars().take(max_chars).collect()
}
