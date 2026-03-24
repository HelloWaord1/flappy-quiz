// ============================================================
// PROGRESS BAR — thin bar showing question progress per phase
// ============================================================

const BAR_HEIGHT = 4;
const BAR_Y_OFFSET = 75; // below question banner
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

  // Filled portion
  if (progress > 0) {
    const fillW = Math.max(BAR_HEIGHT, barW * progress);
    const grad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    grad.addColorStop(0, '#4CAF50');
    grad.addColorStop(1, '#81C784');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, y, fillW, BAR_HEIGHT, BAR_RADIUS);
    ctx.fill();
  }
}
