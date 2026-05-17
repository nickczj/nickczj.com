use std::{env, time::Duration};

use anyhow::Result;
use serde_json::Value;

use crate::{
    config::Config,
    payload::{HomelabService, HomelabServiceState, HomelabStatusPayload},
};

use super::linux;

pub async fn collect(config: &Config) -> Result<HomelabStatusPayload> {
    let mut payload = linux::collect(config).await?;
    payload.services.clear();
    if config.tailscale_enabled {
        payload
            .services
            .push(collect_tailscale_addon_service(config).await);
    }
    Ok(payload)
}

async fn collect_tailscale_addon_service(config: &Config) -> HomelabService {
    let Some(token) = env::var("SUPERVISOR_TOKEN")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    else {
        return tailscale_service(HomelabServiceState::Slow, "supervisor unavailable");
    };

    let Ok(client) = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
    else {
        return tailscale_service(HomelabServiceState::Slow, "supervisor unavailable");
    };

    let response = match client
        .get("http://supervisor/addons")
        .bearer_auth(token)
        .send()
        .await
    {
        Ok(response) => response,
        Err(_) => return tailscale_service(HomelabServiceState::Slow, "supervisor unavailable"),
    };

    if !response.status().is_success() {
        return tailscale_service(HomelabServiceState::Slow, "supervisor unavailable");
    }

    match response.text().await {
        Ok(body) => tailscale_service_from_supervisor_addons(&body, &config.tailscale_addon_slug),
        Err(_) => tailscale_service(HomelabServiceState::Slow, "supervisor unavailable"),
    }
}

pub fn tailscale_service_from_supervisor_addons(input: &str, expected_slug: &str) -> HomelabService {
    let Ok(parsed) = serde_json::from_str::<Value>(input) else {
        return tailscale_service(HomelabServiceState::Slow, "supervisor unavailable");
    };
    let Some(addons) = addon_entries(&parsed) else {
        return tailscale_service(HomelabServiceState::Slow, "supervisor unavailable");
    };

    let expected = expected_slug.trim().to_lowercase();
    let exact = addons.iter().find(|addon| {
        string_field(addon, "slug")
            .map(|slug| slug.eq_ignore_ascii_case(&expected))
            .unwrap_or(false)
    });
    let fallback = addons.iter().find(|addon| {
        addon_installed(addon)
            && [string_field(addon, "slug"), string_field(addon, "name")]
                .into_iter()
                .flatten()
                .any(|value| value.to_lowercase().contains("tailscale"))
    });

    match exact.or(fallback) {
        Some(addon) => tailscale_service_from_addon(addon),
        None => tailscale_service(HomelabServiceState::Down, "not installed"),
    }
}

fn tailscale_service_from_addon(addon: &Value) -> HomelabService {
    if !addon_installed(addon) {
        return tailscale_service(HomelabServiceState::Down, "not installed");
    }

    let state = string_field(addon, "state")
        .map(|value| value.to_lowercase())
        .unwrap_or_default();
    match state.as_str() {
        "started" => tailscale_service(HomelabServiceState::Up, "started"),
        "" => tailscale_service(HomelabServiceState::Slow, "state unknown"),
        other => tailscale_service(HomelabServiceState::Down, other),
    }
}

fn addon_entries(value: &Value) -> Option<&Vec<Value>> {
    value
        .get("addons")
        .and_then(Value::as_array)
        .or_else(|| value.get("data")?.get("addons")?.as_array())
}

fn addon_installed(addon: &Value) -> bool {
    match addon.get("installed") {
        Some(Value::Bool(value)) => *value,
        Some(Value::String(value)) => matches!(value.as_str(), "true" | "1" | "yes" | "on"),
        Some(Value::Number(value)) => value.as_u64().unwrap_or(0) > 0,
        _ => false,
    }
}

fn string_field(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn tailscale_service(state: HomelabServiceState, detail: &str) -> HomelabService {
    HomelabService {
        name: "tailscale".to_string(),
        state,
        detail: detail.chars().take(80).collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_started_tailscale_addon() {
        let service = tailscale_service_from_supervisor_addons(
            r#"{"data":{"addons":[{"slug":"tailscale","name":"Tailscale","installed":true,"state":"started"}]}}"#,
            "tailscale",
        );

        assert_eq!(service.state, HomelabServiceState::Up);
        assert_eq!(service.detail, "started");
    }

    #[test]
    fn maps_stopped_tailscale_addon() {
        let service = tailscale_service_from_supervisor_addons(
            r#"{"addons":[{"slug":"tailscale","name":"Tailscale","installed":"true","state":"stopped"}]}"#,
            "tailscale",
        );

        assert_eq!(service.state, HomelabServiceState::Down);
        assert_eq!(service.detail, "stopped");
    }

    #[test]
    fn falls_back_to_installed_tailscale_named_addon() {
        let service = tailscale_service_from_supervisor_addons(
            r#"{"addons":[{"slug":"abc123","name":"Tailscale","installed":true,"state":"started"}]}"#,
            "tailscale",
        );

        assert_eq!(service.state, HomelabServiceState::Up);
    }

    #[test]
    fn maps_missing_or_unreadable_addon() {
        let missing = tailscale_service_from_supervisor_addons(r#"{"addons":[]}"#, "tailscale");
        let unreadable = tailscale_service_from_supervisor_addons("{", "tailscale");

        assert_eq!(missing.state, HomelabServiceState::Down);
        assert_eq!(missing.detail, "not installed");
        assert_eq!(unreadable.state, HomelabServiceState::Slow);
        assert_eq!(unreadable.detail, "supervisor unavailable");
    }
}
