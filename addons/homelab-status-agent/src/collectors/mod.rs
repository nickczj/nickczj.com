use anyhow::Result;

use crate::{
    config::{CollectorMode, Config},
    payload::HomelabStatusPayload,
};

pub mod haos;
pub mod linux;

pub async fn collect(config: &Config) -> Result<HomelabStatusPayload> {
    match config.collector_mode {
        CollectorMode::Haos => haos::collect(config).await,
        CollectorMode::Linux => linux::collect(config).await,
    }
}
