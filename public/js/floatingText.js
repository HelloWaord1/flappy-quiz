// ============================================================
// FLOATING SCORE TEXT (OPTIMIZED — pool, reduced save/restore)
// ============================================================

const MAX_FLOATING = 20;
const floatingTexts = [];
const ftPool = [];

function acquireFT() {
  if (ftPool.length > 0) return ftPool.pop();
  return {};
}

function releaseFT(ft) {
  if (ftPool.length < MAX_FLOATING) ftPool.push(ft);
}

export function addFloatingText(x, y, text, color, size = 22) {
  if (floatingTexts.length >= MAX_FLOATING) {
    // Recycle oldest
    const old = floatingTexts.shift();
    releaseFT(old);
  }
  const ft = acquireFT();
  ft.x = x;
  ft.y = y;
  ft.text = text;
  ft.color = color;
  ft.size = size;
  ft.life = 50;
  ft.maxLife = 50;
  ft.vy = -1.5;
  floatingTexts.push(ft);
}

export function updateFloatingTexts(dt) {
  const dtFactor = dt || 1;
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy * dtFactor;
    ft.vy *= Math.pow(0.97, dtFactor);
    ft.life -= dtFactor;
    if (ft.life <= 0) {
      // Swap-and-pop
      const last = floatingTexts[floatingTexts.length - 1];
      floatingTexts[i] = last;
      floatingTexts.pop();
      releaseFT(ft);
    }
  }
}

// Font cache for floating texts
const ftFontCache = new Map();
function getFtFont(size) {
  if (ftFontCache.has(size)) return ftFontCache.get(size);
  const font = 'bold ' + size + 'px Arial, sans-serif';
  ftFontCache.set(size, font);
  if (ftFontCache.size > 30) {
    const first = ftFontCache.keys().next().value;
    ftFontCache.delete(first);
  }
  return font;
}

export function drawFloatingTexts(ctx) {
  if (floatingTexts.length === 0) return;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  for (let i = 0; i < floatingTexts.length; i++) {
    const ft = floatingTexts[i];
    const alpha = Math.max(0, ft.life / ft.maxLife);
    const scale = 0.8 + 0.4 * (1 - alpha);
    ctx.globalAlpha = alpha;
    ctx.font = getFtFont(Math.round(ft.size * scale));
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
}
