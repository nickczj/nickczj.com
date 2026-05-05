DROP TABLE IF EXISTS homelab_status_current;

CREATE TABLE IF NOT EXISTS metrics (
  ts INTEGER NOT NULL,
  cpu_pct REAL,
  mem_pct REAL,
  temp_c REAL,
  power_w REAL,
  load_1m REAL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (ts)
);

CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics(ts DESC);

CREATE TABLE IF NOT EXISTS service_status (
  ts INTEGER NOT NULL,
  service TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('up', 'slow', 'down')),
  PRIMARY KEY (ts, service)
);

CREATE INDEX IF NOT EXISTS idx_service_ts ON service_status(ts DESC);
