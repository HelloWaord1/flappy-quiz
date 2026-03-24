// ============================================================
// BALANCE ANIMATION — slot-machine style rolling numbers
// ============================================================

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
    return {
      ...animState,
      displayBalance: realBalance,
      direction: 0,
    };
  }

  const step = Math.max(1, Math.abs(diff) * STEP_SPEED);
  const newDisplay = diff > 0
    ? Math.min(realBalance, animState.displayBalance + step)
    : Math.max(realBalance, animState.displayBalance - step);

  return {
    ...animState,
    displayBalance: newDisplay,
    direction: diff > 0 ? 1 : -1,
  };
}

export function drawAnimatedBalance(ctx, animState, W) {
  drawRoundRect(ctx, W / 2 - 75, 75, 150, 36, 10, 'rgba(0,0,0,0.6)');

  let color = '#FFFFFF';
  if (animState.direction > 0) color = '#4CAF50';
  else if (animState.direction < 0) color = '#F44336';

  const displayVal = Math.round(animState.displayBalance);
  drawText(ctx, `$${displayVal.toLocaleString()}`, W / 2, 93, 18, color);
}
