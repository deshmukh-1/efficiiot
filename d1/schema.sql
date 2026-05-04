-- Run once after creating the D1 database (see wrangler.toml comments).
-- Remote:  npx wrangler d1 execute efficiiot-enquiries --remote --file=./d1/schema.sql
-- Local:   npx wrangler d1 execute efficiiot-enquiries --local --file=./d1/schema.sql

CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries (created_at);
