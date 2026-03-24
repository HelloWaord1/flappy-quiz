// ============================================================
// FLOATING SCORE TEXT
// ============================================================

const floatingTexts = [];

export function addFloatingText(x, y, text, color, size = 22) {
  floatingTexts.push({
    x, y,
    text,
    color,
    size,
    life: 50,
    maxLife: 50,
    vy: -1.5,
  });
}

export function updateFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.vy *= 0.97;
    ft.life--;
    if (ft.life <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
}

export function drawFloatingTexts(ctx) {
  for (const ft of floatingTexts) {
    const alpha = Math.max(0, ft.life / ft.maxLife);
    const scale = 0.8 + 0.4 * (1 - alpha); // starts big, shrinks slightly
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.round(ft.size * scale)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(ft.text, ft.x, ft.y);
    // Fill
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}
