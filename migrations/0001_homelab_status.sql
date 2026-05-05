CREATE TABLE IF NOT EXISTS homelab_status_current (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  history_json TEXT NOT NULL,
  reported_at TEXT NOT NULL,
  received_at TEXT NOT NULL
);
