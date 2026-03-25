// ============================================================
// GRADIENT & OFFSCREEN CANVAS CACHE
// ============================================================
// Caches expensive gradient fills and static elements into
// offscreen canvases. Regenerated only on resize.

let skyCanvasDay = null;
let skyCanvasNight = null;
let groundCanvasDay = null;
let groundCanvasNight = null;
let pipeGreenCanvas = null;
let pipeGoldCanvas = null;
let cachedWidth = 0;
let cachedHeight = 0;
let cachedGroundHeight = 0;

// Bird body gradients cached as small offscreen canvases
let birdBodyNormal = null;
let birdBodyHurt = null;
let birdBodyPhase3 = null;

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
  // Grass strip
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

  // === Pipe gradient strips (width = typical pipe width, height = 1) ===
  // These are 1px tall strips we stretch vertically
  cachePipeStrip('green');
  cachePipeStrip('gold');
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

export function getSkyCanvas(isPhase3) {
  return isPhase3 ? skyCanvasNight : skyCanvasDay;
}

export function getGroundCanvas(isPhase3) {
  return isPhase3 ? groundCanvasNight : groundCanvasDay;
}

export function getPipeCanvas(golden) {
  return golden ? pipeGoldCanvas : pipeGreenCanvas;
}
