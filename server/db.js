import initSqlJs from 'sql.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });
const DB_PATH = join(dataDir, 'analytics.db');

let db = null;
let saveTimer = null;

// ============================================================
// INIT
// ============================================================
async function initDb() {
  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const buf = readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`
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
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      timestamp_ms REAL NOT NULL,
      sec_since_start REAL NOT NULL DEFAULT 0,
      phase INTEGER,
      data TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at)');

  // Auto-save to disk every 10 seconds
  saveTimer = setInterval(saveToDisk, 10000);
  process.on('exit', saveToDisk);
  process.on('SIGTERM', () => { saveToDisk(); process.exit(0); });
  process.on('SIGINT', () => { saveToDisk(); process.exit(0); });

  return db;
}

function saveToDisk() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

// ============================================================
// WRITE OPERATIONS
// ============================================================
function insertSession(params) {
  db.run(
    `INSERT OR IGNORE INTO sessions (id, device_type, screen_width, screen_height, user_agent, referrer, utm_source, utm_medium, utm_campaign)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [params.id, params.device_type, params.screen_width, params.screen_height, params.user_agent, params.referrer, params.utm_source, params.utm_medium, params.utm_campaign]
  );
}

function insertEventsBatch(events) {
  const stmt = db.prepare(
    `INSERT INTO events (session_id, event_type, timestamp_ms, sec_since_start, phase, data)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const e of events) {
    stmt.run([e.session_id, e.event_type, e.timestamp_ms, e.sec_since_start, e.phase, e.data]);
  }
  stmt.free();
}

function updateSessionAggregates(params) {
  db.run(
    `UPDATE sessions SET
      max_phase = MAX(max_phase, ?),
      max_score = MAX(max_score, ?),
      max_balance = MAX(max_balance, ?),
      total_taps = total_taps + ?,
      total_correct = total_correct + ?,
      total_wrong = total_wrong + ?,
      duration_sec = MAX(duration_sec, ?)
    WHERE id = ?`,
    [params.max_phase, params.max_score, params.max_balance, params.taps, params.correct, params.wrong, params.duration_sec, params.id]
  );
}

function markLeadSubmitted(id) {
  db.run('UPDATE sessions SET lead_submitted = 1 WHERE id = ?', [id]);
}

function endSession(params) {
  db.run(
    `UPDATE sessions SET ended_at = datetime('now'), duration_sec = ?, drop_phase = ?, drop_state = ? WHERE id = ?`,
    [params.duration_sec, params.drop_phase, params.drop_state, params.id]
  );
}

// ============================================================
// QUERY HELPERS
// ============================================================
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function getSessions({ limit = 50, offset = 0, dateFrom, dateTo } = {}) {
  let sql = 'SELECT * FROM sessions WHERE 1=1';
  const params = [];
  if (dateFrom) { sql += ' AND started_at >= ?'; params.push(dateFrom); }
  if (dateTo) { sql += ' AND started_at <= ?'; params.push(dateTo); }
  sql += ' ORDER BY started_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return queryAll(sql, params);
}

function getSessionCount({ dateFrom, dateTo } = {}) {
  let sql = 'SELECT COUNT(*) as count FROM sessions WHERE 1=1';
  const params = [];
  if (dateFrom) { sql += ' AND started_at >= ?'; params.push(dateFrom); }
  if (dateTo) { sql += ' AND started_at <= ?'; params.push(dateTo); }
  const r = queryOne(sql, params);
  return r ? r.count : 0;
}

function getSessionById(id) {
  return queryOne('SELECT * FROM sessions WHERE id = ?', [id]);
}

function getSessionEvents(sessionId) {
  return queryAll('SELECT * FROM events WHERE session_id = ? ORDER BY timestamp_ms ASC', [sessionId]);
}

function getFunnelStats({ dateFrom, dateTo } = {}) {
  const { where, params } = buildDateFilter(dateFrom, dateTo);
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
    FROM sessions ${where}
  `;
  return queryOne(sql, params);
}

function getDropOffStats({ dateFrom, dateTo } = {}) {
  const { where, params } = buildDateFilter(dateFrom, dateTo);
  const extraWhere = where ? 'AND ' + where.replace('WHERE ', '') : '';
  return queryAll(
    `SELECT drop_phase, drop_state, COUNT(*) as count
     FROM sessions WHERE drop_phase IS NOT NULL ${extraWhere}
     GROUP BY drop_phase, drop_state ORDER BY count DESC`,
    params
  );
}

function getHourlyStats({ dateFrom, dateTo } = {}) {
  const { where, params } = buildDateFilter(dateFrom, dateTo);
  return queryAll(
    `SELECT strftime('%Y-%m-%d %H:00', started_at) as hour, COUNT(*) as sessions, SUM(lead_submitted) as leads
     FROM sessions ${where} GROUP BY hour ORDER BY hour DESC LIMIT 168`,
    params
  );
}

function getAnswerStats({ dateFrom, dateTo } = {}) {
  const { where, params } = buildDateFilter(dateFrom, dateTo);
  const sessionFilter = (dateFrom || dateTo)
    ? `AND session_id IN (SELECT id FROM sessions ${where})`
    : '';
  return queryAll(
    `SELECT
      json_extract(data, '$.question') as question,
      json_extract(data, '$.answer') as answer,
      json_extract(data, '$.correct') as correct,
      COUNT(*) as count,
      ROUND(AVG(json_extract(data, '$.time_sec')), 1) as avg_time_sec
    FROM events
    WHERE event_type = 'answer' ${sessionFilter}
    GROUP BY question, answer
    ORDER BY question, count DESC`,
    params
  );
}

function getDeviceStats({ dateFrom, dateTo } = {}) {
  const { where, params } = buildDateFilter(dateFrom, dateTo);
  return queryAll(
    `SELECT device_type, COUNT(*) as count, ROUND(AVG(duration_sec), 1) as avg_duration, SUM(lead_submitted) as leads
     FROM sessions ${where} GROUP BY device_type ORDER BY count DESC`,
    params
  );
}

function buildDateFilter(dateFrom, dateTo) {
  const parts = [];
  const params = [];
  if (dateFrom) { parts.push('started_at >= ?'); params.push(dateFrom); }
  if (dateTo) { parts.push('started_at <= ?'); params.push(dateTo); }
  return {
    where: parts.length > 0 ? 'WHERE ' + parts.join(' AND ') : '',
    params,
  };
}

export {
  initDb,
  saveToDisk,
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
