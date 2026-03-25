// ============================================================
// PROGRESS BAR — thin bar showing question progress per phase
// ============================================================

const BAR_HEIGHT = 4;
const BAR_Y_OFFSET = 48;
const BAR_RADIUS = 2;

export function drawProgressBar(ctx, W, currentIndex, totalQuestions) {
  if (totalQuestions <= 0) return;

  const progress = Math.min(1, currentIndex / totalQuestions);
  const barX = 14;
  const barW = W - 28;
  const y = BAR_Y_OFFSET;

  // Background track
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.roundRect(barX, y, barW, BAR_HEIGHT, BAR_RADIUS);
  ctx.fill();

  // Filled portion (flat color instead of gradient for perf)
  if (progress > 0) {
    const fillW = Math.max(BAR_HEIGHT, barW * progress);
    ctx.fillStyle = '#66BB6A';
    ctx.beginPath();
    ctx.roundRect(barX, y, fillW, BAR_HEIGHT, BAR_RADIUS);
    ctx.fill();
  }
}
