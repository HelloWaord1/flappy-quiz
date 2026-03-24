// ============================================================
// LEADERBOARD — localStorage high score tracking
// ============================================================

const STORAGE_KEY = 'flappy-quiz-highscore';

export function getHighScore() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch (_e) {
    return 0;
  }
}

export function saveHighScore(score) {
  const current = getHighScore();
  if (score > current) {
    try { localStorage.setItem(STORAGE_KEY, String(score)); } catch (_e) { /* noop */ }
    return true; // new record
  }
  return false;
}
