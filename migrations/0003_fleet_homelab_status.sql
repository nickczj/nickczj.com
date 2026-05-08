CREATE TABLE IF NOT EXISTS metrics_fleet (
  ts INTEGER NOT NULL,
  node_id TEXT NOT NULL DEFAULT 'nas',
  cpu_pct REAL,
  mem_pct REAL,
  temp_c REAL,
  power_w REAL,
  load_1m REAL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (ts, node_id)
);

INSERT OR IGNORE INTO metrics_fleet (ts, node_id, cpu_pct, mem_pct, temp_c, power_w, load_1m, meta_json)
SELECT ts, 'nas', cpu_pct, mem_pct, temp_c, power_w, load_1m, meta_json
FROM metrics;

DROP TABLE metrics;
ALTER TABLE metrics_fleet RENAME TO metrics;

CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics(ts DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_node_ts ON metrics(node_id, ts DESC);

CREATE TABLE IF NOT EXISTS service_status_fleet (
  ts INTEGER NOT NULL,
  node_id TEXT NOT NULL DEFAULT 'nas',
  service TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('up', 'slow', 'down')),
  PRIMARY KEY (ts, node_id, service)
);

INSERT OR IGNORE INTO service_status_fleet (ts, node_id, service, state)
SELECT ts, 'nas', service, state
FROM service_status;

DROP TABLE service_status;
ALTER TABLE service_status_fleet RENAME TO service_status;

CREATE INDEX IF NOT EXISTS idx_service_ts ON service_status(ts DESC);
CREATE INDEX IF NOT EXISTS idx_service_node_ts ON service_status(node_id, ts DESC);
