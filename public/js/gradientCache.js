// ============================================================
// GRADIENT & OFFSCREEN CANVAS CACHE (OPTIMIZED)
// ============================================================
// Caches expensive gradient fills and static elements into
// offscreen canvases. Regenerated only on resize.

let skyCanvasDay = null;
let skyCanvasNight = null;
let groundCanvasDay = null;
let groundCanvasNight = null;
let pipeGreenCanvas = null;
let pipeGoldCanvas = null;
let pipeCapGreenCanvas = null;
let pipeCapGoldCanvas = null;
let cachedWidth = 0;
let cachedHeight = 0;
let cachedGroundHeight = 0;

// Bird sprite caches (offscreen canvases for each wing frame)
const birdSprites = {
  normal: [null, null, null],   // 3 wing frames
  hurt: [null, null, null],
  phase3: [null, null, null],
};

// Coin offscreen (avoids radial gradient per frame)
let coinCanvas = null;
let coinCanvasLow = null;

function createOffscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function invalidateCache() {
  cachedWidth = 0;
  cachedHeight = 0;
}

export function ensureCaches(W, H, groundHeight) {
  if (W === cachedWidth && H === cachedHeight && groundHeight === cachedGroundHeight) return;
  cachedWidth = W;
  cachedHeight = H;
  cachedGroundHeight = groundHeight;

  const groundY = H - groundHeight;

  // === Sky gradient (day) ===
  skyCanvasDay = createOffscreen(1, groundY);
  const sdCtx = skyCanvasDay.getContext('2d');
  const skyGradDay = sdCtx.createLinearGradient(0, 0, 0, groundY);
  skyGradDay.addColorStop(0, '#4EC0CA');
  skyGradDay.addColorStop(0.6, '#87CEEB');
  skyGradDay.addColorStop(1, '#B0E0E6');
  sdCtx.fillStyle = skyGradDay;
  sdCtx.fillRect(0, 0, 1, groundY);

  // === Sky gradient (night/phase3) ===
  skyCanvasNight = createOffscreen(1, groundY);
  const snCtx = skyCanvasNight.getContext('2d');
  const skyGradNight = snCtx.createLinearGradient(0, 0, 0, groundY);
  skyGradNight.addColorStop(0, '#1a1a2e');
  skyGradNight.addColorStop(0.4, '#2d1b4e');
  skyGradNight.addColorStop(0.7, '#4a2060');
  skyGradNight.addColorStop(1, '#6b3a7a');
  snCtx.fillStyle = skyGradNight;
  snCtx.fillRect(0, 0, 1, groundY);

  // === Ground (day) ===
  groundCanvasDay = createOffscreen(1, groundHeight + 4);
  const gdCtx = groundCanvasDay.getContext('2d');
  const gGradDay = gdCtx.createLinearGradient(0, 0, 0, groundHeight);
  gGradDay.addColorStop(0, '#C8A951');
  gGradDay.addColorStop(0.3, '#DED895');
  gGradDay.addColorStop(1, '#B89A3D');
  gdCtx.fillStyle = gGradDay;
  gdCtx.fillRect(0, 0, 1, groundHeight);
  const grassGradDay = gdCtx.createLinearGradient(0, 0, 0, 12);
  grassGradDay.addColorStop(0, '#4CAF50');
  grassGradDay.addColorStop(0.5, '#388E3C');
  grassGradDay.addColorStop(1, '#C8A951');
  gdCtx.fillStyle = grassGradDay;
  gdCtx.fillRect(0, 0, 1, 12);

  // === Ground (night) ===
  groundCanvasNight = createOffscreen(1, groundHeight + 4);
  const gnCtx = groundCanvasNight.getContext('2d');
  const gGradNight = gnCtx.createLinearGradient(0, 0, 0, groundHeight);
  gGradNight.addColorStop(0, '#3E2723');
  gGradNight.addColorStop(0.3, '#4E342E');
  gGradNight.addColorStop(1, '#2E1B11');
  gnCtx.fillStyle = gGradNight;
  gnCtx.fillRect(0, 0, 1, groundHeight);
  const grassGradNight = gnCtx.createLinearGradient(0, 0, 0, 12);
  grassGradNight.addColorStop(0, '#2E4A3E');
  grassGradNight.addColorStop(0.5, '#1B3A2A');
  grassGradNight.addColorStop(1, '#3E2723');
  gnCtx.fillStyle = grassGradNight;
  gnCtx.fillRect(0, 0, 1, 12);

  // === Pipe gradient strips ===
  cachePipeStrip('green');
  cachePipeStrip('gold');
  cachePipeCapStrip('green');
  cachePipeCapStrip('gold');

  // === Coin cache ===
  cacheCoin();
}

function cachePipeStrip(type) {
  const isGold = type === 'gold';
  const w = 120; // max pipe width with cap extra
  const c = createOffscreen(w, 1);
  const ctx = c.getContext('2d');

  const dark = isGold ? '#DAA520' : '#558B2F';
  const light = isGold ? '#FFE44D' : '#8BC34A';
  const mid = isGold ? '#FFD700' : '#73BF2E';
  const edge = isGold ? '#997A1A' : '#3E7B1E';

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, dark);
  grad.addColorStop(0.15, light);
  grad.addColorStop(0.4, mid);
  grad.addColorStop(0.85, dark);
  grad.addColorStop(1, edge);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, 1);

  if (isGold) {
    pipeGoldCanvas = c;
  } else {
    pipeGreenCanvas = c;
  }
}

function cachePipeCapStrip(type) {
  const isGold = type === 'gold';
  const w = 120;
  const c = createOffscreen(w, 1);
  const ctx = c.getContext('2d');

  const mid = isGold ? '#FFD700' : '#73BF2E';
  const light = isGold ? '#FFE44D' : '#8BC34A';
  const dark = isGold ? '#DAA520' : '#558B2F';
  const edgeStart = isGold ? '#997A1A' : '#3E7B1E';
  const edgeEnd = isGold ? '#806515' : '#2D5E15';

  const capGrad = ctx.createLinearGradient(0, 0, w, 0);
  capGrad.addColorStop(0, edgeStart);
  capGrad.addColorStop(0.15, mid);
  capGrad.addColorStop(0.4, light);
  capGrad.addColorStop(0.85, dark);
  capGrad.addColorStop(1, edgeEnd);
  ctx.fillStyle = capGrad;
  ctx.fillRect(0, 0, w, 1);

  if (isGold) {
    pipeCapGoldCanvas = c;
  } else {
    pipeCapGreenCanvas = c;
  }
}

function cacheCoin() {
  const r = 10; // COIN_RADIUS
  const size = (r + 2) * 2;

  // High quality coin with gradient
  coinCanvas = createOffscreen(size, size);
  const ctx = coinCanvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  const coinGrad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, r);
  coinGrad.addColorStop(0, '#FFF176');
  coinGrad.addColorStop(0.6, '#FFD700');
  coinGrad.addColorStop(1, '#DAA520');
  ctx.fillStyle = coinGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#8B6914';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', cx, cy + 0.5);

  // Low quality coin (flat)
  coinCanvasLow = createOffscreen(size, size);
  const ctxLow = coinCanvasLow.getContext('2d');
  ctxLow.fillStyle = '#FFD700';
  ctxLow.beginPath();
  ctxLow.arc(cx, cy, r, 0, Math.PI * 2);
  ctxLow.fill();
  ctxLow.strokeStyle = '#B8860B';
  ctxLow.lineWidth = 1.5;
  ctxLow.stroke();
  ctxLow.fillStyle = '#8B6914';
  ctxLow.font = 'bold 11px Arial';
  ctxLow.textAlign = 'center';
  ctxLow.textBaseline = 'middle';
  ctxLow.fillText('$', cx, cy + 0.5);
}

export function getSkyCanvas(isPhase3) {
  return isPhase3 ? skyCanvasNight : skyCanvasDay;
}

export function getGroundCanvas(isPhase3) {
  return isPhase3 ? groundCanvasNight : groundCanvasDay;
}

export function getPipeCanvas(golden) {
  return golden ? pipeGoldCanvas : pipeGreenCanvas;
}

export function getPipeCapCanvas(golden) {
  return golden ? pipeCapGoldCanvas : pipeCapGreenCanvas;
}

export function getCoinCanvas(lowQuality) {
  return lowQuality ? coinCanvasLow : coinCanvas;
}
