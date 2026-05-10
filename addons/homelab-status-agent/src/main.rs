mod collectors;
mod config;
mod payload;
mod push;
mod validate;

use anyhow::{bail, Result};
use clap::Parser;
use config::{Cli, Config};
use tracing::{error, info};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
    init_tracing();

    let cli = Cli::parse();
    let config = Config::load(cli)?;

    if config.daemon {
        run_daemon(config).await
    } else {
        run_once(&config).await
    }
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .init();
}

async fn run_once(config: &Config) -> Result<()> {
    let payload = collectors::collect(config).await?;
    let payload = validate::validate_payload(payload)?;
    push::push_payload(config, &payload).await
}

async fn run_daemon(config: Config) -> Result<()> {
    if config.interval_seconds == 0 {
        bail!("interval_seconds must be greater than zero");
    }

    info!(
        mode = %config.collector_mode,
        interval_seconds = config.interval_seconds,
        dry_run = config.dry_run,
        "starting homelab status daemon"
    );

    loop {
        if let Err(err) = run_once(&config).await {
            error!(error = %err, "homelab status push failed");
        }

        tokio::select! {
            _ = tokio::time::sleep(std::time::Duration::from_secs(config.interval_seconds)) => {}
            _ = shutdown_signal() => {
                info!("shutdown signal received");
                break;
            }
        }
    }

    Ok(())
}

async fn shutdown_signal() {
    #[cfg(unix)]
    {
        let ctrl_c = tokio::signal::ctrl_c();
        let mut terminate =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                .expect("failed to install SIGTERM handler");

        tokio::select! {
            _ = ctrl_c => {}
            _ = terminate.recv() => {}
        }
    }

    #[cfg(not(unix))]
    {
        let _ = tokio::signal::ctrl_c().await;
    }
}
