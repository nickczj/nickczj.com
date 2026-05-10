use std::collections::HashSet;

use anyhow::{bail, Result};

use crate::payload::{
    clean_string, normalize_node_id, round2, tone_for_kpi, HomelabKpi, HomelabNode, HomelabService,
    HomelabServiceState, HomelabStatusPayload,
};

pub fn validate_payload(payload: HomelabStatusPayload) -> Result<HomelabStatusPayload> {
    if payload.version != 1 {
        bail!("version must be 1");
    }

    let node_name = clean_string(&payload.node.name, 64);
    if node_name.is_empty() {
        bail!("node.name is required");
    }

    let node_id = {
        let from_id = normalize_node_id(&payload.node.id);
        if from_id.is_empty() {
            normalize_node_id(&node_name)
        } else {
            from_id
        }
    };
    if node_id.is_empty() {
        bail!("node.id is invalid");
    }

    if !payload.node.uptime_seconds.is_finite() || payload.node.uptime_seconds < 0.0 {
        bail!("node.uptimeSeconds must be a non-negative number");
    }

    if payload.kpis.is_empty() || payload.kpis.len() > 8 {
        bail!("kpis must contain 1-8 entries");
    }

    let mut seen_kpis = HashSet::new();
    let mut kpis = Vec::with_capacity(payload.kpis.len());
    for raw in payload.kpis {
        if !seen_kpis.insert(raw.key) {
            bail!("duplicate kpi key: {}", raw.key.label());
        }
        kpis.push(validate_kpi(raw)?);
    }

    if payload.services.len() > 20 {
        bail!("services must contain 0-20 entries");
    }

    let mut seen_services = HashSet::new();
    let mut services = Vec::with_capacity(payload.services.len());
    for raw in payload.services {
        let service = validate_service(raw)?;
        if !seen_services.insert(service.name.clone()) {
            bail!("duplicate service name: {}", service.name);
        }
        services.push(service);
    }

    Ok(HomelabStatusPayload {
        version: 1,
        node: HomelabNode {
            id: node_id,
            name: node_name,
            role: clean_string(&payload.node.role, 48),
            uptime_seconds: round2(payload.node.uptime_seconds),
        },
        kpis,
        services,
    })
}

fn validate_kpi(raw: HomelabKpi) -> Result<HomelabKpi> {
    let label = clean_string(&raw.label, 24);
    if label.is_empty() {
        bail!("kpi {} label is required", raw.key.label());
    }

    let window = clean_string(&raw.window, 16);
    if window.is_empty() {
        bail!("kpi {} window is required", raw.key.label());
    }

    let value = match raw.value {
        Some(value) if value.is_finite() => Some(round2(value)),
        Some(_) => bail!(
            "kpi {} value must be a finite number or null",
            raw.key.label()
        ),
        None => None,
    };

    Ok(HomelabKpi {
        key: raw.key,
        label,
        unit: clean_string(&raw.unit, 8),
        value,
        window,
        tone: tone_for_kpi(raw.key, value),
    })
}

fn validate_service(raw: HomelabService) -> Result<HomelabService> {
    let name = clean_string(&raw.name, 48);
    if name.is_empty() {
        bail!("service.name is required");
    }

    let detail = clean_string(&raw.detail, 80);
    Ok(HomelabService {
        name,
        detail: if detail.is_empty() {
            service_detail(raw.state).to_string()
        } else {
            detail
        },
        state: raw.state,
    })
}

fn service_detail(state: HomelabServiceState) -> &'static str {
    match state {
        HomelabServiceState::Up => "up",
        HomelabServiceState::Slow => "slow",
        HomelabServiceState::Down => "down",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::payload::{kpi, HomelabKpiKey};

    #[test]
    fn validates_haos_payload_with_empty_services() {
        let payload = HomelabStatusPayload {
            version: 1,
            node: HomelabNode {
                id: "Home Assistant Yellow".to_string(),
                name: "Home Assistant Yellow".to_string(),
                role: "smart home".to_string(),
                uptime_seconds: 123.456,
            },
            kpis: vec![
                kpi(HomelabKpiKey::Cpu, Some(12.345)),
                kpi(HomelabKpiKey::Mem, Some(45.0)),
                kpi(HomelabKpiKey::Temp, None),
                kpi(HomelabKpiKey::Load, Some(0.22)),
            ],
            services: vec![],
        };

        let validated = validate_payload(payload).expect("payload should validate");
        assert_eq!(validated.node.id, "home-assistant-yellow");
        assert_eq!(validated.node.uptime_seconds, 123.46);
        assert!(validated.services.is_empty());
        assert_eq!(validated.kpis[0].value, Some(12.35));
    }

    #[test]
    fn rejects_duplicate_kpis() {
        let payload = HomelabStatusPayload {
            version: 1,
            node: HomelabNode {
                id: "ha-yellow".to_string(),
                name: "Home Assistant Yellow".to_string(),
                role: "smart home".to_string(),
                uptime_seconds: 1.0,
            },
            kpis: vec![
                kpi(HomelabKpiKey::Cpu, Some(1.0)),
                kpi(HomelabKpiKey::Cpu, Some(2.0)),
            ],
            services: vec![],
        };

        assert!(validate_payload(payload).is_err());
    }
}
