-- Home internet (WAN) outages detected by workers/homelab-watchdog.
-- An incident opens when every node's heartbeat in `metrics` is stale and
-- closes when any node pushes again. Unlike `metrics` and `service_status`,
-- these rows are not pruned: this is the long-term outage log.
CREATE TABLE IF NOT EXISTS wan_incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_ts INTEGER NOT NULL,
  end_ts INTEGER,
  duration_s INTEGER,
  source TEXT NOT NULL DEFAULT 'watchdog',
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_wan_incidents_start ON wan_incidents(start_ts DESC);

-- At most one open incident per source, so overlapping cron runs cannot
-- open (and alert on) the same outage twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wan_incidents_open
  ON wan_incidents(source) WHERE end_ts IS NULL;

-- Outages found before the watchdog existed. Times are the last and first
-- upstream DNS reply in the pi5 Pi-hole database; all three nodes' heartbeats
-- and speedtest-tracker agree.
INSERT INTO wan_incidents (start_ts, end_ts, duration_s, source, note) VALUES
  (1794985296, 1794986004, 708, 'backfill',
   '2026-11-18 15:01-15:13 SGT; brief partial recovery ~15:09; likely the Eight cutover'),
  (1795458695, 1795484354, 25659, 'backfill',
   '2026-11-24 02:31-09:39 SGT; router and LAN up throughout; fixed by ONT power-cycle');
