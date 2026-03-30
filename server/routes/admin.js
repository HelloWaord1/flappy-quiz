import { Router } from 'express';
import {
  getSessions,
  getSessionCount,
  getSessionById,
  getSessionEvents,
  getFunnelStats,
  getDropOffStats,
  getHourlyStats,
  getAnswerStats,
  getDeviceStats,
} from '../db.js';

const router = Router();

// Simple password protection
function authMiddleware(req, res, next) {
  const password = process.env.ADMIN_PASSWORD || 'flappy2024';
  const provided = req.query.key || req.headers['x-admin-key'];
  if (provided !== password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(authMiddleware);

// Dashboard stats
router.get('/stats', (req, res) => {
  const { from: dateFrom, to: dateTo } = req.query;
  const filter = { dateFrom, dateTo };
  res.json({
    funnel: getFunnelStats(filter),
    dropOff: getDropOffStats(filter),
    hourly: getHourlyStats(filter),
    devices: getDeviceStats(filter),
  });
});

// Answer analytics
router.get('/answers', (req, res) => {
  const { from: dateFrom, to: dateTo } = req.query;
  res.json(getAnswerStats({ dateFrom, dateTo }));
});

// Sessions list
router.get('/sessions', (req, res) => {
  const { limit = '50', offset = '0', from: dateFrom, to: dateTo } = req.query;
  const sessions = getSessions({
    limit: Math.min(parseInt(limit, 10), 200),
    offset: parseInt(offset, 10),
    dateFrom,
    dateTo,
  });
  const total = getSessionCount({ dateFrom, dateTo });
  res.json({ sessions, total });
});

// Single session with all events
router.get('/sessions/:id', (req, res) => {
  const session = getSessionById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  const events = getSessionEvents(req.params.id);
  res.json({ session, events });
});

export default router;
