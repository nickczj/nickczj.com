use anyhow::Result;

use crate::{config::Config, payload::HomelabStatusPayload};

use super::linux;

pub async fn collect(config: &Config) -> Result<HomelabStatusPayload> {
    let mut payload = linux::collect(config).await?;
    payload.services.clear();
    Ok(payload)
}
