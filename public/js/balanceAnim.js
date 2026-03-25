// ============================================================
// BALANCE ANIMATION — slot-machine style rolling numbers
// ============================================================
// OPTIMIZED: mutable state to avoid per-frame object creation

import { drawText, drawRoundRect } from './drawing.js';

const STEP_SPEED = 0.08; // fraction of distance per frame

export function createBalanceAnimState() {
  return {
    displayBalance: 1000,
    prevBalance: 1000,
    direction: 0, // 1 = growing, -1 = falling, 0 = stable
  };
}

export function updateBalanceAnim(animState, realBalance) {
  const diff = realBalance - animState.displayBalance;

  if (Math.abs(diff) < 1) {
    animState.displayBalance = realBalance;
    animState.direction = 0;
    return animState;
  }

  const step = Math.max(1, Math.abs(diff) * STEP_SPEED);
  if (diff > 0) {
    animState.displayBalance = Math.min(realBalance, animState.displayBalance + step);
    animState.direction = 1;
  } else {
    animState.displayBalance = Math.max(realBalance, animState.displayBalance - step);
    animState.direction = -1;
  }
  return animState;
}

// Pre-allocated string buffer for display value
let lastDisplayVal = -1;
let displayStr = '$1,000';

export function drawAnimatedBalance(ctx, animState, W) {
  drawRoundRect(ctx, W / 2 - 75, 10, 150, 36, 10, 'rgba(0,0,0,0.6)');

  let color = '#FFFFFF';
  if (animState.direction > 0) color = '#4CAF50';
  else if (animState.direction < 0) color = '#F44336';

  const displayVal = Math.round(animState.displayBalance);
  // Only rebuild string when value changes
  if (displayVal !== lastDisplayVal) {
    displayStr = '$' + displayVal.toLocaleString();
    lastDisplayVal = displayVal;
  }
  drawText(ctx, displayStr, W / 2, 28, 20, color);
}
