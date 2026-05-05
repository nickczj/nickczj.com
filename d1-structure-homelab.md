Structured, but with a pragmatic twist: structured for the things you'd ever query or aggregate, JSON blob for the rest.
Why structured wins for D1
D1 is SQLite. The whole point of choosing D1 over KV is that you get SQL — indexes, time-series queries, aggregations, joins. If you store everything as a single JSON blob in a value TEXT column, you've built KV-on-SQLite and paid the complexity tax for nothing. You'd be unable to answer questions like "show me CPU over the last 24h" without parsing every blob in the app layer.
The other thing structured gives you: history for free. With KV's single-key-overwrite model, you only ever have "now." With D1, you append rows and suddenly you have a time-series. That unlocks the sparklines on your dashboard being real (last 60 minutes of actual data) instead of cosmetic. It also unlocks future blog posts like "homelab thermals over a year" — content you can't write if you're overwriting state.
A schema that fits your dashboard
Two tables, kept simple:
sqlCREATE TABLE metrics (
  ts INTEGER NOT NULL,        -- unix seconds
  cpu_pct REAL,
  mem_pct REAL,
  temp_c REAL,
  power_w REAL,
  load_1m REAL,
  PRIMARY KEY (ts)
);
CREATE INDEX idx_metrics_ts ON metrics(ts DESC);

CREATE TABLE service_status (
  ts INTEGER NOT NULL,
  service TEXT NOT NULL,
  state TEXT NOT NULL,        -- 'up' | 'slow' | 'down'
  PRIMARY KEY (ts, service)
);
CREATE INDEX idx_service_ts ON service_status(ts DESC);
Numeric host metrics in their own columns — these are what feeds the four sparklines and you'll absolutely want to query them by time range. Service status as (ts, service, state) rows because the set of services changes over time (you'll add/remove containers) and you don't want a schema migration every time. This shape also makes "uptime % of jellyfin over the last 7 days" a one-line SQL query.
Where the JSON blob still earns its keep
For grab-bag metadata that you only ever display as-is and never aggregate — version strings, container image tags, ZFS pool names, kernel version, last reboot reason — a single meta JSON column on the latest row is fine. SQLite's json_extract() lets you reach into it if you change your mind later, but you avoid 15 columns that exist only to be SELECTed verbatim.
So the rule of thumb: if you'd ever WHERE on it, ORDER BY it, or chart it, give it a column. Otherwise JSON.
Push shape
The pusher still sends one JSON payload per push. The ingest endpoint unpacks it into structured rows on the server side:
tsawait db.prepare(
  "INSERT INTO metrics (ts, cpu_pct, mem_pct, temp_c, power_w, load_1m) VALUES (?,?,?,?,?,?)"
).bind(ts, cpu, mem, temp, power, load).run();

const stmts = services.map(s =>
  db.prepare("INSERT INTO service_status (ts, service, state) VALUES (?,?,?)").bind(ts, s.name, s.state)
);
await db.batch(stmts);
db.batch() is one round trip to D1, so the multi-row service insert is cheap.
Retention — important on free tier
D1 free tier is 5GB and 5M rows read / 100k written per day. At 2-minute push intervals you're writing ~720 metric rows + ~5k service-status rows per day. Comfortable, but the table grows forever if you don't prune. Add a daily cleanup:
sqlDELETE FROM metrics WHERE ts < unixepoch() - 7*86400;
DELETE FROM service_status WHERE ts < unixepoch() - 7*86400;
Run it from a Cloudflare Cron Trigger once a day. Seven days of history is plenty for a personal dashboard — anything older becomes a separate "archive" concern (downsample to hourly averages, or just don't bother).
Read endpoint shape
Two queries, returned as one JSON response:
sqlSELECT * FROM metrics ORDER BY ts DESC LIMIT 60;        -- last ~2h for sparklines
SELECT service, state, MAX(ts) as ts FROM service_status GROUP BY service;  -- current state per service
Cache the response at the edge for 30s as before. The dashboard gets both the current snapshot and the sparkline data in one fetch.
One gotcha
D1 doesn't have a native unix timestamp type — INTEGER storing seconds since epoch is the convention. Don't use SQLite's DATETIME strings for this; integer timestamps are smaller, faster to compare, and trivial to convert in JS (new Date(ts * 1000)).
If you want, I can sketch the pusher payload shape and the ingest endpoint as concrete code next, or we can go deeper on the retention/downsampling story if you think you'll want longer history.