import { Router } from 'express';
import { z } from 'zod';
import {
  insertSession,
  insertEventsBatch,
  updateSessionAggregates,
  markLeadSubmitted,
  endSession,
} from '../db.js';

const router = Router();

const eventSchema = z.object({
  event_type: z.string().max(50),
  timestamp_ms: z.number(),
  sec_since_start: z.number().min(0).default(0),
  phase: z.number().optional(),
  data: z.record(z.any()).optional(),
});

const batchSchema = z.object({
  session_id: z.string().uuid(),
  session_info: z.object({
    device_type: z.string().max(30).optional(),
    screen_width: z.number().optional(),
    screen_height: z.number().optional(),
    user_agent: z.string().max(500).optional(),
    referrer: z.string().max(500).optional(),
    utm_source: z.string().max(100).optional(),
    utm_medium: z.string().max(100).optional(),
    utm_campaign: z.string().max(100).optional(),
  }).optional(),
  aggregates: z.object({
    max_phase: z.number().default(1),
    max_score: z.number().default(0),
    max_balance: z.number().default(0),
    taps: z.number().default(0),
    correct: z.number().default(0),
    wrong: z.number().default(0),
    duration_sec: z.number().default(0),
  }).optional(),
  events: z.array(eventSchema).max(500),
});

router.post('/batch', (req, res) => {
  try {
    const batch = batchSchema.parse(req.body);

    // Ensure session exists
    if (batch.session_info) {
      insertSession.run({
        id: batch.session_id,
        device_type: batch.session_info.device_type || null,
        screen_width: batch.session_info.screen_width || null,
        screen_height: batch.session_info.screen_height || null,
        user_agent: batch.session_info.user_agent || null,
        referrer: batch.session_info.referrer || null,
        utm_source: batch.session_info.utm_source || null,
        utm_medium: batch.session_info.utm_medium || null,
        utm_campaign: batch.session_info.utm_campaign || null,
      });
    }

    // Insert events
    if (batch.events.length > 0) {
      const dbEvents = batch.events.map(e => ({
        session_id: batch.session_id,
        event_type: e.event_type,
        timestamp_ms: e.timestamp_ms,
        sec_since_start: e.sec_since_start,
        phase: e.phase || null,
        data: e.data ? JSON.stringify(e.data) : null,
      }));
      insertEventsBatch(dbEvents);
    }

    // Update aggregates
    if (batch.aggregates) {
      updateSessionAggregates.run({
        id: batch.session_id,
        ...batch.aggregates,
      });
    }

    // Check for lead submission or session end events
    for (const e of batch.events) {
      if (e.event_type === 'lead_submitted') {
        markLeadSubmitted.run({ id: batch.session_id });
      }
      if (e.event_type === 'session_end') {
        endSession.run({
          id: batch.session_id,
          duration_sec: e.sec_since_start,
          drop_phase: e.phase || null,
          drop_state: e.data?.state || null,
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ ok: false, errors: err.errors });
    }
    console.error('Events batch error:', err.message);
    res.status(500).json({ ok: false });
  }
});

export default router;
