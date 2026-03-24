// ============================================================
// COUNTDOWN 3-2-1-GO! before game start
// ============================================================

import { drawText } from './drawing.js';

const COUNTDOWN_STEP_MS = 700;
const COUNTDOWN_STEPS = ['3', '2', '1', 'GO!'];

export function createCountdownState() {
  return {
    active: false,
    step: 0,
    timer: 0,
    scale: 1,
  };
}

export function startCountdown(countdownState) {
  return {
    ...countdownState,
    active: true,
    step: 0,
    timer: COUNTDOWN_STEP_MS / (1000 / 60), // frames at 60fps (~42 frames per step)
    scale: 2.0,
  };
}

export function updateCountdown(countdownState) {
  if (!countdownState.active) return countdownState;

  const newTimer = countdownState.timer - 1;
  const newScale = Math.max(0.8, countdownState.scale - 0.03);

  if (newTimer <= 0) {
    const nextStep = countdownState.step + 1;
    if (nextStep >= COUNTDOWN_STEPS.length) {
      return { ...countdownState, active: false, step: 0, timer: 0, scale: 1 };
    }
    return {
      ...countdownState,
      step: nextStep,
      timer: COUNTDOWN_STEP_MS / (1000 / 60),
      scale: 2.0,
    };
  }

  return { ...countdownState, timer: newTimer, scale: newScale };
}

export function drawCountdown(ctx, countdownState, W, H) {
  if (!countdownState.active) return;

  const label = COUNTDOWN_STEPS[countdownState.step];
  const size = 60 * countdownState.scale;

  // Dim background slightly
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = Math.min(1, countdownState.scale - 0.5);
  drawText(ctx, label, W / 2, H * 0.4, size, label === 'GO!' ? '#4CAF50' : '#F7DC6F');
  ctx.restore();
}
