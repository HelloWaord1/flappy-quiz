// ============================================================
// DEEP ANALYTICS TRACKER
// Tracks every user action with precise timing
// Batches events and sends every 3s + on page unload
// ============================================================

const SESSION_ID = crypto.randomUUID();
const SESSION_START = performance.now();
const EVENT_QUEUE = [];
let lastFlushTime = 0;
const FLUSH_INTERVAL = 3000;
let sessionInfoSent = false;

// Aggregates tracked locally, sent with each batch
const aggregates = {
  max_phase: 1,
  max_score: 0,
  max_balance: 0,
  taps: 0,
  correct: 0,
  wrong: 0,
  duration_sec: 0,
};

// ============================================================
// CORE
// ============================================================
function secSinceStart() {
  return Math.round((performance.now() - SESSION_START) / 100) / 10;
}

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPad/i.test(ua)) return 'mobile';
  if (/Tablet|iPad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function getUTM() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
  };
}

function getSessionInfo() {
  const utm = getUTM();
  return {
    device_type: getDeviceType(),
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    user_agent: navigator.userAgent.substring(0, 500),
    referrer: document.referrer.substring(0, 500) || null,
    ...utm,
  };
}

// ============================================================
// TRACK EVENT
// ============================================================
export function track(eventType, phase, data) {
  const sec = secSinceStart();
  aggregates.duration_sec = sec;

  EVENT_QUEUE.push({
    event_type: eventType,
    timestamp_ms: Date.now(),
    sec_since_start: sec,
    phase: phase || undefined,
    data: data || undefined,
  });

  // Auto-flush if queue is large
  if (EVENT_QUEUE.length >= 50) {
    flush();
  }
}

// Convenience trackers
export function trackTap(phase) {
  aggregates.taps++;
  track('tap', phase);
}

export function trackPhaseChange(newPhase, score, balance) {
  aggregates.max_phase = Math.max(aggregates.max_phase, newPhase);
  track('phase_change', newPhase, { score, balance });
}

export function trackQuestionShown(phase, questionIndex, questionText) {
  track('question_shown', phase, { index: questionIndex, question: questionText });
}

export function trackAnswer(phase, questionText, answer, correct, timeSec) {
  if (correct) aggregates.correct++;
  else aggregates.wrong++;
  track('answer', phase, {
    question: questionText,
    answer,
    correct,
    time_sec: Math.round(timeSec * 10) / 10,
  });
}

export function trackGateResult(phase, passed, questionText) {
  track(passed ? 'gate_passed' : 'gate_failed', phase, { question: questionText });
}

export function trackLifeChange(phase, lives, reason) {
  track('life_change', phase, { lives, reason });
}

export function trackCoin(phase, points, totalScore) {
  aggregates.max_score = Math.max(aggregates.max_score, totalScore);
  track('coin', phase, { points, total: totalScore });
}

export function trackScore(phase, score) {
  aggregates.max_score = Math.max(aggregates.max_score, score);
  track('score', phase, { score });
}

export function trackBalance(phase, balance) {
  aggregates.max_balance = Math.max(aggregates.max_balance, balance);
  track('balance', phase, { balance });
}

export function trackLeadForm(phase, action, data) {
  track('lead_' + action, phase, data); // lead_open, lead_submitted, lead_abandoned
}

export function trackGameOver(phase, score, lives) {
  track('game_over', phase, { score, lives });
}

export function trackMenu(action) {
  track('menu_' + action, null, null); // menu_shown, menu_start
}

// ============================================================
// FLUSH — send batched events to server
// ============================================================
function flush() {
  if (EVENT_QUEUE.length === 0) return;

  const now = Date.now();
  if (now - lastFlushTime < 1000 && EVENT_QUEUE.length < 50) return;
  lastFlushTime = now;

  const events = EVENT_QUEUE.splice(0);
  const payload = {
    session_id: SESSION_ID,
    events,
    aggregates: { ...aggregates, taps: 0, correct: 0, wrong: 0 },
  };

  // Reset delta aggregates after sending
  aggregates.taps = 0;
  aggregates.correct = 0;
  aggregates.wrong = 0;

  // Include session info on first flush
  if (!sessionInfoSent) {
    payload.session_info = getSessionInfo();
    sessionInfoSent = true;
  }

  const body = JSON.stringify(payload);

  // Use sendBeacon if available (for unload), otherwise fetch
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/events/batch', new Blob([body], { type: 'application/json' }));
  } else {
    fetch('/api/events/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {}); // silent fail — analytics should never break the game
  }
}

// ============================================================
// AUTO-FLUSH & LIFECYCLE
// ============================================================
setInterval(flush, FLUSH_INTERVAL);

// Track visibility changes (tab switching)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    track('tab_hidden');
    flush();
  } else {
    track('tab_visible');
  }
});

// Session end on page unload
window.addEventListener('beforeunload', () => {
  track('session_end', aggregates.max_phase, {
    state: 'page_unload',
    duration_sec: secSinceStart(),
  });
  flush();
});

// Track session start immediately
track('session_start', 1);

export { SESSION_ID };
