# Homelab Status Collector — Rust Rewrite Planning Doc

## 0. Codex kickoff prompt

Use this as the first prompt in Codex:

> I want to rewrite an existing TypeScript/Bun homelab status pusher into Rust. The first target is Home Assistant OS running on a Home Assistant Yellow, packaged as a Home Assistant local add-on. The Yellow mode should monitor the device itself only, not Docker services. Later, the same Rust binary should also support normal Linux nodes such as a UGREEN NAS and Raspberry Pi 5.
>
> Please implement this incrementally. Start with a minimal Rust CLI that:
>
> - Collects CPU %, memory %, load average, uptime seconds, and temperature if available.
> - Builds the same `HomelabStatusPayload` JSON shape described in this planning doc.
> - POSTs it to `HOMELAB_STATUS_ENDPOINT` with `Authorization: Bearer $HOMELAB_STATUS_TOKEN`.
> - Supports `--once`, `--daemon`, `--interval-seconds`, and `--dry-run`.
> - Reads config from env vars first, then optionally from a Home Assistant add-on `/data/options.json`.
> - Does not use Docker inspection for the initial HA Yellow mode.
>
> Please keep the code simple, readable, and well-tested. Prefer direct Linux `/proc` and `/sys` parsing for the HAOS/Linux collector first, then add optional crates only when useful.

---

## 1. Project goal

Build a small Rust agent that pushes homelab node health metrics to an API.

Initial target:

- Home Assistant OS on Home Assistant Yellow.
- Runs as a Home Assistant local add-on.
- Measures the Yellow itself as a node.
- No `systemd`, no `systemctl`, no Docker service monitoring.

Future targets:

- UGREEN NAS.
- Raspberry Pi 5.
- Generic Linux hosts.
- Optional Docker container health checks on normal Docker hosts.

---

## 2. Why rewrite from TypeScript/Bun to Rust?

This rewrite is mainly for education/fun, but it has practical benefits:

- Single native binary.
- Lower memory footprint than Bun.
- Easier packaging into small containers.
- Good fit for low-power always-on devices.
- Better learning opportunity around Linux `/proc`, `/sys`, async HTTP, serde, error handling, and cross-compilation.

However, performance is not the primary reason. A 2-minute metrics pusher is not CPU-intensive. The main value is portability and learning.

---

## 3. Existing TypeScript collector behavior to preserve

The current TypeScript script is a one-shot collector and pusher. It:

- Builds a `HomelabStatusPayload`.
- Validates and sanitizes the payload.
- Collects:
  - CPU percentage from `/proc/stat`.
  - Memory percentage from `/proc/meminfo`.
  - Load average from `/proc/loadavg`.
  - Uptime from `/proc/uptime`.
  - Temperature from `sensors -j`.
  - Docker container states via `docker inspect`.
- POSTs the payload to an API endpoint using a bearer token.
- Supports a dry-run mode through `HOMELAB_DRY_RUN=1`.

For the Rust rewrite, preserve the payload contract and most metric semantics, but split host-specific capabilities into collector modes.

---

## 4. Product shape

The Rust project should become:

```text
homelab-status-agent/
├── Cargo.toml
├── README.md
├── docs/
│   └── haos-addon.md
├── crates or src/
│   ├── main.rs
│   ├── config.rs
│   ├── payload.rs
│   ├── validate.rs
│   ├── push.rs
│   ├── collectors/
│   │   ├── mod.rs
│   │   ├── linux.rs
│   │   ├── haos.rs
│   │   └── docker.rs          # later
│   └── util/
│       ├── fs.rs
│       └── timing.rs
└── addons/
    └── homelab-status-agent/
        ├── config.yaml
        ├── Dockerfile
        └── run.sh
```

For the first version, a simple single-crate layout is enough:

```text
src/
├── main.rs
├── config.rs
├── payload.rs
├── validate.rs
├── push.rs
└── collectors/
    ├── mod.rs
    ├── linux.rs
    └── haos.rs
```

---

## 5. Payload contract

Keep this JSON shape compatible with the existing TypeScript script:

```json
{
  "version": 1,
  "node": {
    "id": "ha-yellow",
    "name": "Home Assistant Yellow",
    "role": "home-assistant",
    "uptimeSeconds": 123456
  },
  "kpis": [
    {
      "key": "cpu",
      "label": "cpu",
      "unit": "%",
      "value": 12.34,
      "window": "1m",
      "tone": "ok"
    }
  ],
  "services": []
}
```

### Types

```rust
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HomelabKpiKey {
    Cpu,
    Mem,
    Temp,
    Power,
    Load,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HomelabServiceState {
    Up,
    Slow,
    Down,
}
```

For HA Yellow mode, `services` should be an empty array.

---

## 6. Collector modes

### 6.1 `haos` mode

Default mode for the Home Assistant Yellow add-on.

Collect:

- CPU percentage.
- Memory percentage.
- Load average.
- Uptime seconds.
- Temperature if readable.
- Optional disk usage later.

Do not collect:

- Docker services.
- `systemd` services.
- `systemctl` output.
- External command output, unless explicitly added later.

### 6.2 `linux` mode

For future normal Linux hosts.

Collect the same base metrics as HAOS mode.

Later additions:

- Docker service/container status.
- Disk usage.
- Network RX/TX.
- Filesystem health.
- Optional SMART or power metrics.

### 6.3 `docker` capability

Do not implement in v0.1 for HA Yellow.

Later, add either:

- Docker CLI based inspection: simpler, external dependency.
- Docker socket/API based inspection: cleaner, but requires API access and permissions.

For HAOS Yellow, avoid Docker API access unless there is a strong reason.

---

## 7. Metric collection design

Prefer direct Linux file parsing first. It is educational, transparent, and avoids surprises inside HAOS add-on containers.

### 7.1 CPU percentage

Read `/proc/stat` twice with a short delay.

Algorithm:

1. Read the first `cpu` aggregate line.
2. Parse fields:
   - user
   - nice
   - system
   - idle
   - iowait
   - irq
   - softirq
   - steal
3. Compute:
   - `idle = idle + iowait`
   - `total = sum(all fields)`
4. Sleep 250ms.
5. Read again.
6. Compute:
   - `idle_delta = idle2 - idle1`
   - `total_delta = total2 - total1`
   - `cpu_percent = (1.0 - idle_delta / total_delta) * 100.0`

Test with sample `/proc/stat` strings.

### 7.2 Memory percentage

Read `/proc/meminfo`.

Use:

- `MemTotal`
- `MemAvailable`

Formula:

```text
memory_percent = ((MemTotal - MemAvailable) / MemTotal) * 100
```

Do not use `MemFree` alone.

### 7.3 Load average

Read `/proc/loadavg`.

Use the first number as 1-minute load average.

### 7.4 Uptime

Read `/proc/uptime`.

Use the first number as uptime seconds.

### 7.5 Temperature

Try in this order:

1. `/sys/class/thermal/thermal_zone*/temp`
2. `/sys/class/hwmon/hwmon*/temp*_input`
3. Optional later: `sensors -j`

Rules:

- Values from `/sys/class/thermal` and `hwmon` are commonly in millidegrees Celsius.
- Convert values like `45678` to `45.678`.
- Ignore nonsense values.
- Return the maximum valid temperature reading.
- If nothing is readable, return `null`.

For HA Yellow, `/sys` may or may not expose the desired temperature from inside the add-on container. The collector should degrade gracefully.

### 7.6 Disk usage

Optional v0.2.

Potential paths:

- `/`
- `/data`
- `/config`, if mounted or available inside add-on context.

Be careful: inside an add-on container, `/` may reflect the container filesystem, not the host’s full storage situation. For HAOS, it may be better to get storage info through Supervisor APIs later.

---

## 8. Config design

### 8.1 Environment variables

Support these first:

```text
HOMELAB_STATUS_ENDPOINT
HOMELAB_STATUS_TOKEN
HOMELAB_NODE_ID
HOMELAB_NODE_NAME
HOMELAB_NODE_ROLE
HOMELAB_COLLECTOR_MODE=haos|linux
HOMELAB_INTERVAL_SECONDS=120
HOMELAB_DRY_RUN=1
```

### 8.2 CLI flags

Use `clap`.

Suggested flags:

```text
homelab-status-agent --once
homelab-status-agent --daemon
homelab-status-agent --dry-run
homelab-status-agent --interval-seconds 120
homelab-status-agent --mode haos
homelab-status-agent --config /data/options.json
```

Priority order:

1. CLI flags.
2. Environment variables.
3. `/data/options.json`, when running as a Home Assistant add-on.
4. Defaults.

### 8.3 Home Assistant add-on options file

The add-on should write options to `/data/options.json`.

Example:

```json
{
  "endpoint": "https://example.com/api/homelab/status",
  "token": "secret",
  "node_id": "ha-yellow",
  "node_name": "Home Assistant Yellow",
  "node_role": "home-assistant",
  "collector_mode": "haos",
  "interval_seconds": 120
}
```

The Rust config loader can support this file directly. That lets `run.sh` stay minimal.

---

## 9. HTTP push design

Use one of these approaches:

### Option A: async

Dependencies:

```toml
tokio = { version = "1", features = ["macros", "rt-multi-thread", "time", "signal"] }
reqwest = { version = "0.13", default-features = false, features = ["json", "rustls-tls"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
clap = { version = "4", features = ["derive", "env"] }
anyhow = "1"
thiserror = "2"
tracing = "0.1"
tracing-subscriber = "0.3"
```

Pros:

- Modern Rust pattern.
- Easy daemon loop with graceful shutdown.
- Good learning value.

Cons:

- More runtime/dependency complexity.

### Option B: blocking

Dependencies:

```toml
reqwest = { version = "0.13", default-features = false, features = ["blocking", "json", "rustls-tls"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
clap = { version = "4", features = ["derive", "env"] }
anyhow = "1"
thiserror = "2"
```

Pros:

- Simpler.
- More than enough for a 2-minute pusher.

Cons:

- Less async learning.

Recommendation: use **Option A async** because this is also an educational Rust rewrite.

### Request behavior

POST JSON to endpoint.

Headers:

```text
Authorization: Bearer <token>
Content-Type: application/json
User-Agent: homelab-status-agent/<version>
```

Timeout:

- 5 seconds default.

Retry:

- Do not retry aggressively in v0.1.
- If push fails, log and try again on the next interval.
- Later, add one retry with short backoff.

Dry run:

- Print pretty JSON.
- Do not POST.

---

## 10. Validation and normalization

Port the existing TypeScript validation concepts.

### Node ID

Normalize:

- trim
- lowercase
- replace non `[a-z0-9-]` with `-`
- trim leading/trailing `-`
- max 32 chars
- fallback to `homelab`

### Strings

Trim and cap lengths:

- node name: 64
- node role: 48
- KPI label: 24
- KPI unit: 8
- KPI window: 16
- service name: 48
- service detail: 80

### Numbers

Round to 2 decimals.

For invalid/unavailable metrics, use `null`.

### KPI tones

Same thresholds as the TypeScript script:

CPU/memory:

```text
>= 90 bad
>= 75 warn
else ok
```

Temperature:

```text
>= 80 bad
>= 65 warn
else ok
```

Load:

```text
>= 8 bad
>= 4 warn
else ok
```

If value is `null`, tone should be `warn`.

---

## 11. Daemon behavior

The binary should support both one-shot and daemon modes.

### One-shot

```sh
homelab-status-agent --once
```

Collect once, push once, exit.

### Daemon

```sh
homelab-status-agent --daemon --interval-seconds 120
```

Loop forever:

1. Collect.
2. Validate/build payload.
3. Push or print dry run.
4. Sleep interval.
5. Repeat.

Handle Ctrl+C/SIGTERM gracefully:

- Finish current push if already in progress.
- Exit cleanly before next interval.

---

## 12. Home Assistant add-on packaging

Initial local add-on:

```text
addons/homelab-status-agent/
├── config.yaml
├── Dockerfile
└── run.sh
```

### 12.1 `config.yaml`

```yaml
name: "Homelab Status Agent"
version: "0.1.0"
slug: homelab_status_agent
description: "Push Home Assistant Yellow node metrics to a homelab status API"
arch:
  - aarch64
startup: application
boot: auto
init: false

options:
  endpoint: "https://example.com/api/homelab/status"
  token: ""
  node_id: "ha-yellow"
  node_name: "Home Assistant Yellow"
  node_role: "home-assistant"
  collector_mode: "haos"
  interval_seconds: 120
  dry_run: false

schema:
  endpoint: url
  token: password
  node_id: str
  node_name: str
  node_role: str
  collector_mode: list(haos|linux)
  interval_seconds: int
  dry_run: bool
```

Do not set `docker_api: true` for HA Yellow v0.1.

### 12.2 Dockerfile strategy

Option A: simple Rust builder + slim runtime.

```dockerfile
FROM rust:1-alpine AS builder

RUN apk add --no-cache musl-dev pkgconfig openssl-dev

WORKDIR /app
COPY . .
RUN cargo build --release

FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/target/release/homelab-status-agent /usr/local/bin/homelab-status-agent
COPY addons/homelab-status-agent/run.sh /run.sh

RUN chmod +x /run.sh

CMD ["/run.sh"]
```

If using `reqwest` with `rustls-tls`, avoid OpenSSL where possible.

Option B later: cross-compile outside HAOS and publish images.

### 12.3 `run.sh`

Keep minimal:

```sh
#!/usr/bin/env sh
set -eu

exec /usr/local/bin/homelab-status-agent \
  --daemon \
  --config /data/options.json
```

Let Rust parse `/data/options.json`.

---

## 13. Suggested Rust modules

### `main.rs`

Responsibilities:

- Initialize tracing/logging.
- Parse CLI.
- Load config.
- Choose mode.
- Run once or daemon.

### `config.rs`

Responsibilities:

- CLI args.
- Env vars.
- `/data/options.json`.
- Merge priority.
- Validate required endpoint/token unless dry-run.

### `payload.rs`

Responsibilities:

- Data structs.
- Enums.
- Serialization.
- Tone functions.
- Node ID normalization.

### `validate.rs`

Responsibilities:

- Optional strict validation before push.
- Ensure payload limits match server expectations.

### `collectors/mod.rs`

Trait:

```rust
#[async_trait]
pub trait Collector {
    async fn collect(&self, config: &Config) -> anyhow::Result<HomelabStatusPayload>;
}
```

For v0.1, you can skip the trait and keep it simpler.

### `collectors/linux.rs`

Responsibilities:

- Parse `/proc/stat`.
- Parse `/proc/meminfo`.
- Parse `/proc/loadavg`.
- Parse `/proc/uptime`.
- Parse `/sys` thermal data.

### `collectors/haos.rs`

Responsibilities:

- Use Linux collector.
- Force `services = []`.
- Set HAOS-friendly defaults.

### `push.rs`

Responsibilities:

- POST payload.
- Timeouts.
- Response status handling.
- Dry-run printing.

---

## 14. Milestones

### Milestone 1 — Compile a dry-run Rust collector

Goal:

```sh
cargo run -- --once --dry-run --mode haos
```

Output:

- Valid JSON payload.
- No HTTP push required.
- `services: []`.

Tasks:

- Create Rust crate.
- Add serde/clap/tracing.
- Implement payload structs.
- Implement config defaults.
- Implement `/proc` parsers.
- Implement dry-run JSON output.

Done when:

- Running locally on macOS may not collect Linux metrics, but unit tests pass.
- Running inside a Linux container prints useful metrics.

### Milestone 2 — HTTP push

Goal:

```sh
HOMELAB_STATUS_ENDPOINT=...
HOMELAB_STATUS_TOKEN=...
cargo run -- --once --mode haos
```

Tasks:

- Add reqwest/tokio.
- POST JSON.
- Handle non-2xx responses.
- Add timeout.
- Add user-agent.

Done when:

- API receives same shape as the TypeScript script.

### Milestone 3 — Daemon mode

Goal:

```sh
cargo run -- --daemon --interval-seconds 120
```

Tasks:

- Loop with interval.
- Graceful shutdown.
- Log failures without exiting by default.

Done when:

- Runs for 10+ minutes and pushes every 2 minutes.

### Milestone 4 — Home Assistant local add-on

Goal:

- Install as a local add-on on HA Yellow.
- Configure endpoint/token in UI.
- Start automatically on boot.

Tasks:

- Add add-on `config.yaml`.
- Add Dockerfile.
- Add run script.
- Parse `/data/options.json`.

Done when:

- Add-on appears in Home Assistant add-on store.
- Logs show successful pushes.
- Payload node name is `Home Assistant Yellow`.

### Milestone 5 — Polish

Tasks:

- Better error types.
- Unit tests for all parsers.
- README.
- Example payload.
- GitHub Actions build.
- Multi-arch container builds.

### Milestone 6 — Normal Linux node mode

Tasks:

- Add `linux` mode.
- Optional Docker health checks.
- Optional disk/network metrics.
- systemd timer/service examples for NAS/Pi.

---

## 15. Unit test plan

Test pure parsing aggressively.

### `/proc/stat`

Input:

```text
cpu  100 0 50 850 0 0 0 0 0 0
```

Expected:

- idle = 850
- total = 1000

Then second sample:

```text
cpu  150 0 70 900 0 0 0 0 0 0
```

Expected:

- total delta = 120
- idle delta = 50
- CPU = `(1 - 50/120) * 100 = 58.33`

### `/proc/meminfo`

Input:

```text
MemTotal:        8000000 kB
MemAvailable:   2000000 kB
```

Expected:

- memory = 75.0

### `/proc/loadavg`

Input:

```text
1.23 0.98 0.76 1/234 5678
```

Expected:

- load = 1.23

### `/proc/uptime`

Input:

```text
12345.67 98765.43
```

Expected:

- uptime = 12345.67

### Temperature

Inputs:

```text
45678
```

Expected:

- 45.68 C after rounding.

Input:

```text
45
```

Expected:

- 45 C, if already Celsius-like.

---

## 16. Manual test commands

### Local Linux dry run

```sh
cargo run -- --once --dry-run --mode haos
```

### Linux daemon dry run

```sh
cargo run -- --daemon --dry-run --interval-seconds 10 --mode haos
```

### Push once

```sh
export HOMELAB_STATUS_ENDPOINT="https://example.com/api/homelab/status"
export HOMELAB_STATUS_TOKEN="secret"
export HOMELAB_NODE_ID="ha-yellow"
export HOMELAB_NODE_NAME="Home Assistant Yellow"
export HOMELAB_NODE_ROLE="home-assistant"

cargo run -- --once --mode haos
```

### Build release

```sh
cargo build --release
```

### Container build

```sh
docker build -t homelab-status-agent:local .
```

### Container dry run

```sh
docker run --rm \
  -e HOMELAB_DRY_RUN=1 \
  -e HOMELAB_NODE_ID=ha-yellow \
  -e HOMELAB_NODE_NAME="Home Assistant Yellow" \
  -e HOMELAB_NODE_ROLE=home-assistant \
  homelab-status-agent:local \
  --once --dry-run --mode haos
```

---

## 17. HAOS-specific notes

Home Assistant OS should be treated as an appliance-like environment.

Do not rely on:

- `systemd`
- `systemctl`
- installing packages directly on the host
- host-level cron
- arbitrary persistent host scripts

Use a Home Assistant add-on/app instead.

For v0.1:

- No Docker API permission.
- No privileged mode.
- No host PID namespace.
- No host network needed.
- No exposed ports needed.
- No ingress UI needed.

This agent is outbound-only.

---

## 18. Security notes

- Token should be configured as a password field in add-on config.
- Do not print token in logs.
- Use HTTPS endpoint.
- Set HTTP timeout.
- Do not mount Docker socket for HA Yellow mode.
- Do not enable privileged mode unless absolutely required.
- Do not collect sensitive values by default.
- Keep payload small and explicit.

---

## 19. Server/API compatibility checklist

Before replacing the TS script, confirm:

- API accepts `version: 1`.
- API accepts `services: []`.
- API accepts missing `power` KPI.
- API accepts `temp.value: null`.
- API accepts node ID `ha-yellow`.
- API accepts Rust JSON field casing:
  - `uptimeSeconds`, not `uptime_seconds`.
- KPI enum casing is lowercase:
  - `cpu`, `mem`, `temp`, `load`.
- Tone enum casing is lowercase:
  - `ok`, `warn`, `bad`.

---

## 20. Optional future improvements

### Home Assistant Supervisor API integration

Later, consider reading some HAOS/Supervisor info via Supervisor endpoints from inside the add-on using `SUPERVISOR_TOKEN`.

Potential future fields:

- Supervisor health.
- Home Assistant Core state.
- OS version.
- Free data disk space.
- Add-on state.

Do not block v0.1 on this.

### Metrics to add later

- Disk usage.
- Network RX/TX.
- Filesystem read-only detection.
- CPU temperature per zone.
- Throttling/undervoltage, if exposed on Raspberry Pi.
- Docker container status for non-HAOS Linux hosts.
- API latency measurement.

### Deployment polish

- GitHub releases with binaries.
- Multi-arch Docker images:
  - `aarch64`
  - `armv7`
  - `amd64`
- Homebrew tap later if useful.
- Example systemd timer for normal Linux hosts.

---

## 21. First implementation target

The first pull request should be intentionally small.

Implement only:

- Rust project setup.
- Payload structs.
- Config from env + CLI.
- Linux `/proc` parsers.
- HAOS collector mode.
- Dry-run JSON output.
- Unit tests for parsers.

Avoid:

- Docker.
- Supervisor API.
- Disk metrics.
- Multi-crate workspace.
- Complex error hierarchy.
- Premature optimization.

Once dry-run output matches the existing TypeScript payload shape, add HTTP pushing and daemon mode.
