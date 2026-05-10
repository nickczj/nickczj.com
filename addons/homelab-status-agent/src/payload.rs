use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomelabStatusPayload {
    pub version: u8,
    pub node: HomelabNode,
    pub kpis: Vec<HomelabKpi>,
    pub services: Vec<HomelabService>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomelabNode {
    pub id: String,
    pub name: String,
    pub role: String,

    #[serde(rename = "uptimeSeconds")]
    pub uptime_seconds: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomelabKpi {
    pub key: HomelabKpiKey,
    pub label: String,
    pub unit: String,
    pub value: Option<f64>,
    pub window: String,
    pub tone: HomelabTone,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HomelabKpiKey {
    Cpu,
    Mem,
    Temp,
    Power,
    Load,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HomelabTone {
    Ok,
    Warn,
    Bad,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomelabService {
    pub name: String,
    pub state: HomelabServiceState,
    pub detail: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HomelabServiceState {
    Up,
    Slow,
    Down,
}

impl HomelabKpiKey {
    pub fn label(self) -> &'static str {
        match self {
            HomelabKpiKey::Cpu => "cpu",
            HomelabKpiKey::Mem => "mem",
            HomelabKpiKey::Temp => "temp",
            HomelabKpiKey::Power => "power",
            HomelabKpiKey::Load => "load",
        }
    }

    pub fn unit(self) -> &'static str {
        match self {
            HomelabKpiKey::Cpu | HomelabKpiKey::Mem => "%",
            HomelabKpiKey::Temp => "C",
            HomelabKpiKey::Power => "W",
            HomelabKpiKey::Load => "",
        }
    }
}

pub fn kpi(key: HomelabKpiKey, value: Option<f64>) -> HomelabKpi {
    HomelabKpi {
        key,
        label: key.label().to_string(),
        unit: key.unit().to_string(),
        value: value.map(round2),
        window: "1m".to_string(),
        tone: tone_for_kpi(key, value),
    }
}

pub fn tone_for_kpi(key: HomelabKpiKey, value: Option<f64>) -> HomelabTone {
    let Some(value) = value else {
        return HomelabTone::Warn;
    };

    match key {
        HomelabKpiKey::Cpu | HomelabKpiKey::Mem => {
            if value >= 90.0 {
                HomelabTone::Bad
            } else if value >= 75.0 {
                HomelabTone::Warn
            } else {
                HomelabTone::Ok
            }
        }
        HomelabKpiKey::Temp => {
            if value >= 80.0 {
                HomelabTone::Bad
            } else if value >= 65.0 {
                HomelabTone::Warn
            } else {
                HomelabTone::Ok
            }
        }
        HomelabKpiKey::Load => {
            if value >= 8.0 {
                HomelabTone::Bad
            } else if value >= 4.0 {
                HomelabTone::Warn
            } else {
                HomelabTone::Ok
            }
        }
        HomelabKpiKey::Power => HomelabTone::Ok,
    }
}

pub fn normalize_node_id(value: &str) -> String {
    let mut output = String::new();
    let mut last_was_dash = false;

    for ch in value.trim().to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            output.push(ch);
            last_was_dash = false;
        } else if !last_was_dash {
            output.push('-');
            last_was_dash = true;
        }

        if output.len() >= 32 {
            break;
        }
    }

    output.trim_matches('-').to_string()
}

pub fn clean_string(value: &str, max_length: usize) -> String {
    value.trim().chars().take(max_length).collect()
}

pub fn round2(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_node_ids_like_the_typescript_pusher() {
        assert_eq!(
            normalize_node_id(" Home Assistant Yellow, CM5 "),
            "home-assistant-yellow-cm5"
        );
        assert_eq!(normalize_node_id("!!!"), "");
    }

    #[test]
    fn assigns_tones_from_thresholds() {
        assert_eq!(
            tone_for_kpi(HomelabKpiKey::Cpu, Some(74.99)),
            HomelabTone::Ok
        );
        assert_eq!(
            tone_for_kpi(HomelabKpiKey::Cpu, Some(75.0)),
            HomelabTone::Warn
        );
        assert_eq!(
            tone_for_kpi(HomelabKpiKey::Mem, Some(90.0)),
            HomelabTone::Bad
        );
        assert_eq!(
            tone_for_kpi(HomelabKpiKey::Temp, Some(65.0)),
            HomelabTone::Warn
        );
        assert_eq!(
            tone_for_kpi(HomelabKpiKey::Load, Some(8.0)),
            HomelabTone::Bad
        );
        assert_eq!(tone_for_kpi(HomelabKpiKey::Load, None), HomelabTone::Warn);
    }
}
