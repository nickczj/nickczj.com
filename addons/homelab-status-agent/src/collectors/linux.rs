use std::{cmp::Ordering, fs, path::Path};

use anyhow::Result;

use crate::{
    config::Config,
    payload::{kpi, round2, HomelabKpiKey, HomelabNode, HomelabStatusPayload},
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CpuStat {
    idle: u64,
    total: u64,
}

pub async fn collect(config: &Config) -> Result<HomelabStatusPayload> {
    let cpu = collect_cpu_percent().await;
    let mem = collect_memory_percent();
    let temp = collect_temperature();
    let load = collect_load_average();
    let uptime_seconds = collect_uptime_seconds().unwrap_or(0.0);

    Ok(HomelabStatusPayload {
        version: 1,
        node: HomelabNode {
            id: config.node_id.clone(),
            name: config.node_name.clone(),
            role: config.node_role.clone(),
            uptime_seconds,
        },
        kpis: vec![
            kpi(HomelabKpiKey::Cpu, cpu),
            kpi(HomelabKpiKey::Mem, mem),
            kpi(HomelabKpiKey::Temp, temp),
            kpi(HomelabKpiKey::Load, load),
        ],
        services: vec![],
    })
}

async fn collect_cpu_percent() -> Option<f64> {
    let first = parse_cpu_stat(&read_optional_file("/proc/stat")?)?;
    tokio::time::sleep(std::time::Duration::from_millis(250)).await;
    let second = parse_cpu_stat(&read_optional_file("/proc/stat")?)?;
    cpu_percent(first, second)
}

fn collect_memory_percent() -> Option<f64> {
    parse_memory_percent(&read_optional_file("/proc/meminfo")?)
}

fn collect_load_average() -> Option<f64> {
    parse_load_average(&read_optional_file("/proc/loadavg")?)
}

fn collect_uptime_seconds() -> Option<f64> {
    parse_uptime_seconds(&read_optional_file("/proc/uptime")?)
}

fn collect_temperature() -> Option<f64> {
    let mut readings = Vec::new();
    read_thermal_zone_temps(Path::new("/sys/class/thermal"), &mut readings);
    read_hwmon_temps(Path::new("/sys/class/hwmon"), &mut readings);

    readings
        .into_iter()
        .max_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal))
        .map(round2)
}

pub fn parse_cpu_stat(input: &str) -> Option<CpuStat> {
    let line = input.lines().find(|line| line.starts_with("cpu "))?;
    let values: Vec<u64> = line
        .split_whitespace()
        .skip(1)
        .map(str::parse)
        .collect::<std::result::Result<_, _>>()
        .ok()?;

    let idle = values.get(3).copied().unwrap_or(0) + values.get(4).copied().unwrap_or(0);
    let total = values.iter().sum();
    Some(CpuStat { idle, total })
}

pub fn cpu_percent(first: CpuStat, second: CpuStat) -> Option<f64> {
    let idle_delta = second.idle.checked_sub(first.idle)?;
    let total_delta = second.total.checked_sub(first.total)?;
    if total_delta == 0 || idle_delta > total_delta {
        return None;
    }

    Some(round2(
        (1.0 - idle_delta as f64 / total_delta as f64) * 100.0,
    ))
}

pub fn parse_memory_percent(input: &str) -> Option<f64> {
    let mut total = None;
    let mut available = None;

    for line in input.lines() {
        let mut parts = line.split_whitespace();
        let Some(key) = parts.next() else {
            continue;
        };

        match key {
            "MemTotal:" => total = parts.next().and_then(|value| value.parse::<f64>().ok()),
            "MemAvailable:" => available = parts.next().and_then(|value| value.parse::<f64>().ok()),
            _ => {}
        }
    }

    let total = total?;
    let available = available?;
    if total <= 0.0 || available < 0.0 || available > total {
        return None;
    }

    Some(round2(((total - available) / total) * 100.0))
}

pub fn parse_load_average(input: &str) -> Option<f64> {
    input
        .split_whitespace()
        .next()?
        .parse::<f64>()
        .ok()
        .filter(|value| value.is_finite() && *value >= 0.0)
        .map(round2)
}

pub fn parse_uptime_seconds(input: &str) -> Option<f64> {
    input
        .split_whitespace()
        .next()?
        .parse::<f64>()
        .ok()
        .filter(|value| value.is_finite() && *value >= 0.0)
        .map(round2)
}

pub fn parse_temperature_value(input: &str) -> Option<f64> {
    let raw = input.trim().parse::<f64>().ok()?;
    if !raw.is_finite() {
        return None;
    }

    let celsius = if raw.abs() > 1000.0 {
        raw / 1000.0
    } else {
        raw
    };
    if celsius > 0.0 && celsius <= 125.0 {
        Some(round2(celsius))
    } else {
        None
    }
}

fn read_thermal_zone_temps(base: &Path, readings: &mut Vec<f64>) {
    let Ok(entries) = fs::read_dir(base) else {
        return;
    };

    for entry in entries.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if !name.starts_with("thermal_zone") {
            continue;
        }
        read_temperature_file(&entry.path().join("temp"), readings);
    }
}

fn read_hwmon_temps(base: &Path, readings: &mut Vec<f64>) {
    let Ok(hwmons) = fs::read_dir(base) else {
        return;
    };

    for hwmon in hwmons.flatten() {
        let Ok(entries) = fs::read_dir(hwmon.path()) else {
            continue;
        };
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if name.starts_with("temp") && name.ends_with("_input") {
                read_temperature_file(&entry.path(), readings);
            }
        }
    }
}

fn read_temperature_file(path: &Path, readings: &mut Vec<f64>) {
    if let Ok(input) = fs::read_to_string(path) {
        if let Some(value) = parse_temperature_value(&input) {
            readings.push(value);
        }
    }
}

fn read_optional_file(path: &str) -> Option<String> {
    fs::read_to_string(path).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_cpu_stat_and_percent() {
        let first = parse_cpu_stat("cpu  100 0 50 850 0 0 0 0 0 0\n").expect("first sample");
        let second = parse_cpu_stat("cpu  150 0 70 900 0 0 0 0 0 0\n").expect("second sample");

        assert_eq!(
            first,
            CpuStat {
                idle: 850,
                total: 1000
            }
        );
        assert_eq!(cpu_percent(first, second), Some(58.33));
    }

    #[test]
    fn parses_memory_percent_from_memavailable() {
        let input = "MemTotal:        8000000 kB\nMemAvailable:   2000000 kB\n";
        assert_eq!(parse_memory_percent(input), Some(75.0));
    }

    #[test]
    fn parses_load_average() {
        assert_eq!(
            parse_load_average("1.23 0.98 0.76 1/234 5678\n"),
            Some(1.23)
        );
    }

    #[test]
    fn parses_uptime_seconds() {
        assert_eq!(parse_uptime_seconds("12345.67 98765.43\n"), Some(12345.67));
    }

    #[test]
    fn parses_temperature_values() {
        assert_eq!(parse_temperature_value("45678\n"), Some(45.68));
        assert_eq!(parse_temperature_value("45\n"), Some(45.0));
        assert_eq!(parse_temperature_value("200000\n"), None);
    }
}
