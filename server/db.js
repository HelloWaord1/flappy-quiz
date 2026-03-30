import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, 'analytics.db'));

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// ============================================================
// SCHEMA
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    device_type TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    user_agent TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    max_phase INTEGER DEFAULT 1,
    max_score INTEGER DEFAULT 0,
    max_balance REAL DEFAULT 0,
    total_taps INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    total_wrong INTEGER DEFAULT 0,
    lead_submitted INTEGER DEFAULT 0,
    duration_sec REAL DEFAULT 0,
    drop_phase INTEGER,
    drop_state TEXT
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    timestamp_ms REAL NOT NULL,
    sec_since_start REAL NOT NULL DEFAULT 0,
    phase INTEGER,
    data TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
  CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
  CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
`);

// ============================================================
// PREPARED STATEMENTS
// ============================================================
const insertSession = db.prepare(`
  INSERT OR IGNORE INTO sessions (id, device_type, screen_width, screen_height, user_agent, referrer, utm_source, utm_medium, utm_campaign)
  VALUES (@id, @device_type, @screen_width, @screen_height, @user_agent, @referrer, @utm_source, @utm_medium, @utm_campaign)
`);

const insertEvent = db.prepare(`
  INSERT INTO events (session_id, event_type, timestamp_ms, sec_since_start, phase, data)
  VALUES (@session_id, @event_type, @timestamp_ms, @sec_since_start, @phase, @data)
`);

const updateSessionAggregates = db.prepare(`
  UPDATE sessions SET
    max_phase = MAX(max_phase, @max_phase),
    max_score = MAX(max_score, @max_score),
    max_balance = MAX(max_balance, @max_balance),
    total_taps = total_taps + @taps,
    total_correct = total_correct + @correct,
    total_wrong = total_wrong + @wrong,
    duration_sec = MAX(duration_sec, @duration_sec)
  WHERE id = @id
`);

const markLeadSubmitted = db.prepare(`
  UPDATE sessions SET lead_submitted = 1 WHERE id = @id
`);

const endSession = db.prepare(`
  UPDATE sessions SET
    ended_at = datetime('now'),
    duration_sec = @duration_sec,
    drop_phase = @drop_phase,
    drop_state = @drop_state
  WHERE id = @id
`);

// Batch insert events in a transaction
const insertEventsBatch = db.transaction((events) => {
  for (const e of events) {
    insertEvent.run(e);
  }
});

// ============================================================
// QUERY HELPERS
// ============================================================
function getSessions({ limit = 50, offset = 0, dateFrom, dateTo } = {}) {
  let sql = 'SELECT * FROM sessions WHERE 1=1';
  const params = {};
  if (dateFrom) { sql += ' AND started_at >= @dateFrom'; params.dateFrom = dateFrom; }
  if (dateTo) { sql += ' AND started_at <= @dateTo'; params.dateTo = dateTo; }
  sql += ' ORDER BY started_at DESC LIMIT @limit OFFSET @offset';
  params.limit = limit;
  params.offset = offset;
  return db.prepare(sql).all(params);
}

function getSessionCount({ dateFrom, dateTo } = {}) {
  let sql = 'SELECT COUNT(*) as count FROM sessions WHERE 1=1';
  const params = {};
  if (dateFrom) { sql += ' AND started_at >= @dateFrom'; params.dateFrom = dateFrom; }
  if (dateTo) { sql += ' AND started_at <= @dateTo'; params.dateTo = dateTo; }
  return db.prepare(sql).get(params).count;
}

function getSessionById(id) {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

function getSessionEvents(sessionId) {
  return db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY timestamp_ms ASC').all(sessionId);
}

function getFunnelStats({ dateFrom, dateTo } = {}) {
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  const sql = `
    SELECT
      COUNT(*) as total_sessions,
      SUM(CASE WHEN duration_sec > 3 THEN 1 ELSE 0 END) as engaged,
      SUM(CASE WHEN total_taps > 0 THEN 1 ELSE 0 END) as played,
      SUM(CASE WHEN max_phase >= 2 THEN 1 ELSE 0 END) as reached_phase2,
      SUM(CASE WHEN max_phase >= 3 THEN 1 ELSE 0 END) as reached_phase3,
      SUM(lead_submitted) as leads,
      ROUND(AVG(duration_sec), 1) as avg_duration,
      ROUND(AVG(max_score), 1) as avg_score,
      ROUND(AVG(total_correct), 1) as avg_correct,
      ROUND(AVG(total_wrong), 1) as avg_wrong
    FROM sessions
    ${dateFilter.where}
  `;
  return db.prepare(sql).get(dateFilter.params);
}

function getDropOffStats({ dateFrom, dateTo } = {}) {
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  return db.prepare(`
    SELECT drop_phase, drop_state, COUNT(*) as count
    FROM sessions
    WHERE drop_phase IS NOT NULL ${dateFilter.where ? 'AND ' + dateFilter.where.replace('WHERE ', '') : ''}
    GROUP BY drop_phase, drop_state
    ORDER BY count DESC
  `).all(dateFilter.params);
}

function getHourlyStats({ dateFrom, dateTo } = {}) {
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  return db.prepare(`
    SELECT
      strftime('%Y-%m-%d %H:00', started_at) as hour,
      COUNT(*) as sessions,
      SUM(lead_submitted) as leads
    FROM sessions
    ${dateFilter.where}
    GROUP BY hour
    ORDER BY hour DESC
    LIMIT 168
  `).all(dateFilter.params);
}

function getAnswerStats({ dateFrom, dateTo } = {}) {
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  const sessionFilter = dateFrom || dateTo
    ? `WHERE session_id IN (SELECT id FROM sessions ${dateFilter.where})`
    : '';
  return db.prepare(`
    SELECT
      json_extract(data, '$.question') as question,
      json_extract(data, '$.answer') as answer,
      json_extract(data, '$.correct') as correct,
      COUNT(*) as count,
      ROUND(AVG(json_extract(data, '$.time_sec')), 1) as avg_time_sec
    FROM events
    ${sessionFilter}
    WHERE event_type = 'answer'
    GROUP BY question, answer
    ORDER BY question, count DESC
  `).all(dateFilter.params);
}

function getDeviceStats({ dateFrom, dateTo } = {}) {
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  return db.prepare(`
    SELECT device_type, COUNT(*) as count,
      ROUND(AVG(duration_sec), 1) as avg_duration,
      SUM(lead_submitted) as leads
    FROM sessions
    ${dateFilter.where}
    GROUP BY device_type
    ORDER BY count DESC
  `).all(dateFilter.params);
}

function buildDateFilter(dateFrom, dateTo) {
  const parts = [];
  const params = {};
  if (dateFrom) { parts.push('started_at >= @dateFrom'); params.dateFrom = dateFrom; }
  if (dateTo) { parts.push('started_at <= @dateTo'); params.dateTo = dateTo; }
  return {
    where: parts.length > 0 ? 'WHERE ' + parts.join(' AND ') : '',
    params,
  };
}

export {
  db,
  insertSession,
  insertEventsBatch,
  updateSessionAggregates,
  markLeadSubmitted,
  endSession,
  getSessions,
  getSessionCount,
  getSessionById,
  getSessionEvents,
  getFunnelStats,
  getDropOffStats,
  getHourlyStats,
  getAnswerStats,
  getDeviceStats,
};
