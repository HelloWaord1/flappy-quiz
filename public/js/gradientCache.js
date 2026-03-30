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

// Bird sprite caches (offscreen canvases for each wing frame & variant)
const birdSprites = {
  normal: [null, null, null],   // 3 wing frames
  hurt: [null, null, null],
  phase2: [null, null, null],
  phase3: [null, null, null],
};
let birdSpritesBuilt = false;

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

  // === Bird sprite cache ===
  if (!birdSpritesBuilt) {
    cacheBirdSprites();
    birdSpritesBuilt = true;
  }
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

// ============================================================
// BIRD SPRITE CACHE — pre-render all variants × wing frames
// ============================================================
const BIRD_SIZE = 28;
const WING_FRAMES = [
  { angle: -0.35, yOff: -4 },
  { angle: -0.1, yOff: 0 },
  { angle: 0.2, yOff: 4 },
];

const BIRD_CONFIGS = {
  normal: {
    bodyGrad: [['#FFF176', 0], ['#F7DC6F', 0.7], ['#E6C349', 1]],
    bodyStroke: '#F39C12',
    wingGrad: [['#F0A830', 0], ['#F39C12', 1]],
    wingStroke: '#D68910',
    glasses: false, tie: false,
  },
  hurt: {
    bodyGrad: [['#FF9999', 0], ['#FF4444', 1]],
    bodyStroke: '#F39C12',
    wingGrad: [['#F0A830', 0], ['#F39C12', 1]],
    wingStroke: '#D68910',
    glasses: false, tie: false,
  },
  phase2: {
    bodyGrad: [['#FFF176', 0], ['#F7DC6F', 0.7], ['#E6C349', 1]],
    bodyStroke: '#F39C12',
    wingGrad: [['#F0A830', 0], ['#F39C12', 1]],
    wingStroke: '#D68910',
    glasses: true, tie: false,
  },
  phase3: {
    bodyGrad: [['#B3E5FC', 0], ['#4FC3F7', 0.7], ['#0288D1', 1]],
    bodyStroke: '#0288D1',
    wingGrad: [['#29B6F6', 0], ['#0288D1', 1]],
    wingStroke: '#0277BD',
    glasses: false, tie: true,
  },
};

function cacheBirdSprites() {
  const pad = 10; // extra space for shadow, beak, tie
  const spriteW = BIRD_SIZE + 40; // enough for beak extending right
  const spriteH = BIRD_SIZE + 30; // enough for tie below

  for (const variant of Object.keys(BIRD_CONFIGS)) {
    const cfg = BIRD_CONFIGS[variant];
    for (let wi = 0; wi < 3; wi++) {
      const c = createOffscreen(spriteW, spriteH);
      const ctx = c.getContext('2d');
      const cx = spriteW / 2 - 4; // bird center, shifted left for beak space
      const cy = spriteH / 2 - 2;
      const wing = WING_FRAMES[wi];

      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(cx + 3, cy + 3, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body gradient
      const bodyGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, BIRD_SIZE / 2);
      for (const [color, stop] of cfg.bodyGrad) bodyGrad.addColorStop(stop, color);
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cfg.bodyStroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Belly highlight
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.ellipse(cx - 2, cy - 4, BIRD_SIZE / 3.5, BIRD_SIZE / 4, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.save();
      ctx.translate(cx - 4, cy + 2);
      ctx.rotate(wing.angle);
      const wingGrad = ctx.createLinearGradient(0, wing.yOff - 6, 0, wing.yOff + 6);
      for (const [color, stop] of cfg.wingGrad) wingGrad.addColorStop(stop, color);
      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.ellipse(0, wing.yOff, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cfg.wingStroke;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx + 8, cy - 5, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pupil
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(cx + 10, cy - 5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx + 11.5, cy - 6.5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Glasses (phase2)
      if (cfg.glasses) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx + 8, cy - 5, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 4, 5.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 1, cy - 5);
        ctx.lineTo(cx - 4 + 5.5, cy - 4);
        ctx.stroke();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#4444FF';
        ctx.beginPath();
        ctx.arc(cx + 8, cy - 5, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Beak (two-tone)
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.moveTo(cx + 14, cy - 1);
      ctx.lineTo(cx + 25, cy + 3);
      ctx.lineTo(cx + 14, cy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#C0392B';
      ctx.beginPath();
      ctx.moveTo(cx + 14, cy + 4);
      ctx.lineTo(cx + 25, cy + 3);
      ctx.lineTo(cx + 14, cy + 7);
      ctx.closePath();
      ctx.fill();

      // Tie (phase3)
      if (cfg.tie) {
        ctx.fillStyle = '#D32F2F';
        ctx.beginPath();
        ctx.moveTo(cx + 12, cy + 8);
        ctx.lineTo(cx + 16, cy + 8);
        ctx.lineTo(cx + 14, cy + 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#B71C1C';
        ctx.beginPath();
        ctx.moveTo(cx + 13, cy + 12);
        ctx.lineTo(cx + 15, cy + 12);
        ctx.lineTo(cx + 16, cy + 20);
        ctx.lineTo(cx + 14, cy + 18);
        ctx.lineTo(cx + 12, cy + 20);
        ctx.closePath();
        ctx.fill();
      }

      birdSprites[variant][wi] = c;
    }
  }
}

export function getBirdSprite(variant, wingIndex) {
  const sprites = birdSprites[variant];
  if (!sprites) return null;
  return sprites[wingIndex] || sprites[1];
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
