// ============================================================
// PARALLAX BACKGROUND — Flappy Bird style (OPTIMIZED v2)
// ============================================================
// Offscreen canvas caches for hills, trees, bushes.
// Rebuilt only on resize. Scrolled via drawImage offset.

import { ensureCaches, getSkyCanvas, getGroundCanvas } from './gradientCache.js';
import { getQualityLevel } from './perfmon.js';

// Animated background objects state (seeded once)
const BG_OBJECTS = [
  { baseX: 0, y: 55, type: 'bird', speed: 0.12 },
  { baseX: 300, y: 30, type: 'balloon', speed: 0.08 },
  { baseX: 600, y: 70, type: 'bird', speed: 0.10 },
  { baseX: 900, y: 45, type: 'balloon', speed: 0.06 },
];

const BG_OBJECTS_P3 = [
  { baseX: 0, y: 40, type: 'plane', speed: 0.15 },
  { baseX: 400, y: 25, type: 'star', speed: 0.04, blinkOffset: 0 },
  { baseX: 700, y: 55, type: 'plane', speed: 0.12 },
  { baseX: 200, y: 15, type: 'star', speed: 0.03, blinkOffset: 2 },
];

let bgFrameCount = 0;

// === OFFSCREEN CACHES FOR HILLS/TREES/BUSHES ===
let hillCacheFarDay = null;
let hillCacheNearDay = null;
let hillCacheFarNight = null;
let hillCacheNearNight = null;
let hillCacheSimpleDay = null;
let hillCacheSimpleNight = null;
let treeCacheDay = null;
let treeCacheNight = null;
let bushCacheDay = null;
let bushCacheNight = null;

// Offscreen strip widths (2x screen width for seamless scrolling)
let stripW = 0;
let cacheScreenW = 0;
let cacheGroundY = 0;

function createOffscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function rebuildParallaxCaches(W, groundY) {
  if (W === cacheScreenW && groundY === cacheGroundY) return;
  cacheScreenW = W;
  cacheGroundY = groundY;
  stripW = W * 2;

  // Far hills (day)
  hillCacheFarDay = buildHillStrip(stripW, groundY, {
    color1: 'rgba(120,160,130,0.4)',
    color2: 'rgba(100,145,115,0.25)',
    baseHeight: 60, amplitude: 35, frequency: 0.004, yOffset: 0,
  });
  // Near hills (day)
  hillCacheNearDay = buildHillStrip(stripW, groundY, {
    color1: 'rgba(80,130,80,0.45)',
    color2: 'rgba(60,110,60,0.3)',
    baseHeight: 40, amplitude: 25, frequency: 0.006, yOffset: 10,
  });
  // Far hills (night)
  hillCacheFarNight = buildHillStrip(stripW, groundY, {
    color1: 'rgba(60,40,80,0.5)',
    color2: 'rgba(40,25,60,0.35)',
    baseHeight: 60, amplitude: 35, frequency: 0.004, yOffset: 0,
  });
  // Near hills (night)
  hillCacheNearNight = buildHillStrip(stripW, groundY, {
    color1: 'rgba(40,30,60,0.55)',
    color2: 'rgba(25,18,40,0.4)',
    baseHeight: 40, amplitude: 25, frequency: 0.006, yOffset: 10,
  });
  // Simple hills (low quality)
  hillCacheSimpleDay = buildSimpleHillStrip(stripW, groundY, false);
  hillCacheSimpleNight = buildSimpleHillStrip(stripW, groundY, true);

  // Trees
  treeCacheDay = buildTreeStrip(stripW, groundY, false);
  treeCacheNight = buildTreeStrip(stripW, groundY, true);

  // Bushes
  bushCacheDay = buildBushStrip(stripW, groundY, false);
  bushCacheNight = buildBushStrip(stripW, groundY, true);
}

function buildHillStrip(w, groundY, opts) {
  const { color1, color2, baseHeight, amplitude, frequency, yOffset } = opts;
  const h = baseHeight + amplitude * 2 + 20;
  const c = createOffscreen(w, h);
  const ctx = c.getContext('2d');
  const step = 6;

  ctx.beginPath();
  ctx.moveTo(0, h);

  for (let x = 0; x <= w; x += step) {
    const worldX = x;
    const hillH = baseHeight
      + Math.sin(worldX * frequency) * amplitude
      + Math.sin(worldX * frequency * 2.3 + 1.5) * amplitude * 0.4
      + Math.sin(worldX * frequency * 0.7 + 3.0) * amplitude * 0.6;
    ctx.lineTo(x, h - hillH);
  }

  ctx.lineTo(w, h + 10);
  ctx.lineTo(0, h + 10);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Store metadata
  c._hillHeight = h;
  c._yOffset = yOffset;
  return c;
}

function buildSimpleHillStrip(w, groundY, isPhase3) {
  const h = 80;
  const c = createOffscreen(w, h);
  const ctx = c.getContext('2d');

  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 12) {
    const hillH = 40 + Math.sin(x * 0.005) * 30;
    ctx.lineTo(x, h - hillH);
  }
  ctx.lineTo(w, h + 10);
  ctx.lineTo(0, h + 10);
  ctx.closePath();
  ctx.fillStyle = isPhase3 ? 'rgba(40,30,60,0.5)' : 'rgba(80,130,80,0.4)';
  ctx.fill();

  c._hillHeight = h;
  return c;
}

function buildTreeStrip(w, groundY, isPhase3) {
  const h = 60;
  const c = createOffscreen(w, h);
  const ctx = c.getContext('2d');

  const spacing = 55;
  const trunkColor = isPhase3 ? '#4E342E' : '#6D4C41';
  const canopyColor = isPhase3 ? '#2E4A3E' : '#4CAF50';

  for (let i = 0; i < Math.ceil(w / spacing) + 1; i++) {
    const tx = i * spacing;
    const seed = ((i * 7919) % 1000) / 1000;
    const treeH = 28 + seed * 20;
    const canopyW = 12 + seed * 8;

    // Trunk
    ctx.fillStyle = trunkColor;
    ctx.fillRect(tx - 2.5, h - treeH * 0.35, 5, treeH * 0.35);

    // Canopy (flat color for offscreen, no radial gradient needed)
    ctx.fillStyle = canopyColor;
    ctx.beginPath();
    ctx.ellipse(tx, h - treeH * 0.55, canopyW, treeH * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  c._stripSpacing = spacing;
  c._stripH = h;
  return c;
}

function buildBushStrip(w, groundY, isPhase3) {
  const h = 20;
  const c = createOffscreen(w, h);
  const ctx = c.getContext('2d');

  const spacing = 40;
  const bushColor = isPhase3 ? '#3E5E4A' : '#5B8C2A';

  for (let i = 0; i < Math.ceil(w / spacing) + 1; i++) {
    const bx = i * spacing + 15;
    const seed = ((i * 6271) % 1000) / 1000;
    const r = 8 + seed * 7;

    ctx.fillStyle = bushColor;
    ctx.beginPath();
    ctx.ellipse(bx, h - r * 0.25, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  c._stripH = h;
  return c;
}

// Draw a cached strip with parallax scrolling
function drawCachedStrip(ctx, strip, W, groundY, offset) {
  if (!strip) return;
  const h = strip._hillHeight || strip._stripH;
  const yOffset = strip._yOffset || 0;
  const drawY = groundY - h + yOffset;

  // Wrap offset within strip width
  const wrappedOffset = ((offset % stripW) + stripW) % stripW;

  // Draw two segments for seamless scrolling
  const firstW = Math.min(W, stripW - wrappedOffset);
  ctx.drawImage(strip, wrappedOffset, 0, firstW, strip.height, 0, drawY, firstW, strip.height);

  if (firstW < W) {
    const secondW = W - firstW;
    ctx.drawImage(strip, 0, 0, secondW, strip.height, firstW, drawY, secondW, strip.height);
  }
}

export function drawParallaxBackground(ctx, W, H, groundHeight, groundOffset, phase) {
  const groundY = H - groundHeight;
  const isPhase3 = phase === 3;
  const quality = getQualityLevel();
  bgFrameCount++;

  // Ensure gradient caches are ready
  ensureCaches(W, H, groundHeight);

  // Rebuild parallax strip caches on resize
  rebuildParallaxCaches(W, groundY);

  // === Sky gradient (cached 1px-wide strip, stretched) ===
  const skyCanvas = getSkyCanvas(isPhase3);
  if (skyCanvas) {
    ctx.drawImage(skyCanvas, 0, 0, 1, skyCanvas.height, 0, 0, W, groundY);
  }

  // === Stars (phase 3 only) ===
  if (isPhase3) {
    drawStars(ctx, W, groundY, groundOffset, quality);
  }

  // === Animated background objects (skip on low quality) ===
  if (quality !== 'low') {
    drawBackgroundObjects(ctx, W, groundY, groundOffset, isPhase3);
  }

  // === Clouds (very slow, skip on low quality) ===
  if (!isPhase3 && quality !== 'low') {
    drawClouds(ctx, W, groundOffset * 0.15, quality);
  }

  // === Hills (from cached offscreen strips) ===
  if (quality !== 'low') {
    const farHill = isPhase3 ? hillCacheFarNight : hillCacheFarDay;
    const nearHill = isPhase3 ? hillCacheNearNight : hillCacheNearDay;
    drawCachedStrip(ctx, farHill, W, groundY, groundOffset * 0.2);
    drawCachedStrip(ctx, nearHill, W, groundY, groundOffset * 0.4);
  } else {
    const simpleHill = isPhase3 ? hillCacheSimpleNight : hillCacheSimpleDay;
    drawCachedStrip(ctx, simpleHill, W, groundY, groundOffset * 0.3);
  }

  // === Trees (from cached offscreen strip, skip on low quality) ===
  if (quality !== 'low') {
    const treeStrip = isPhase3 ? treeCacheNight : treeCacheDay;
    drawCachedStrip(ctx, treeStrip, W, groundY, groundOffset * 0.55);
  }

  // === Bushes (from cached offscreen strip, high quality only) ===
  if (quality === 'high') {
    const bushStrip = isPhase3 ? bushCacheNight : bushCacheDay;
    drawCachedStrip(ctx, bushStrip, W, groundY, groundOffset * 0.7);
  }

  // === Ground ===
  drawGround(ctx, W, H, groundHeight, groundOffset, isPhase3, quality);
}

// ============================================================
// STARS — twinkling background for phase 3
// ============================================================
function drawStars(ctx, W, groundY, offset, quality) {
  const starCount = quality === 'low' ? 10 : quality === 'medium' ? 20 : 30;
  const loopW = 1400;

  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < starCount; i++) {
    const seed1 = ((i * 7919 + 31) % 1000) / 1000;
    const seed2 = ((i * 6271 + 97) % 1000) / 1000;
    const seed3 = ((i * 3571 + 53) % 1000) / 1000;
    const baseX = seed1 * loopW;
    const sy = seed2 * (groundY * 0.5);
    const sx = ((baseX - offset * 0.05) % loopW + loopW) % loopW;
    if (sx > W + 10) continue;

    const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(bgFrameCount * 0.02 + seed3 * 10));
    const size = 1 + seed3 * 2;

    ctx.globalAlpha = twinkle;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ============================================================
// ANIMATED BACKGROUND OBJECTS
// ============================================================
function drawBackgroundObjects(ctx, W, groundY, groundOffset, isPhase3) {
  const objects = isPhase3 ? BG_OBJECTS_P3 : BG_OBJECTS;
  const loopW = 1200;

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const ox = ((obj.baseX - groundOffset * obj.speed) % loopW + loopW) % loopW;
    if (ox > W + 60) continue;

    ctx.globalAlpha = 0.35;

    if (obj.type === 'bird') {
      drawFlyingBird(ctx, ox, obj.y, groundOffset);
    } else if (obj.type === 'balloon') {
      drawBalloon(ctx, ox, obj.y);
    } else if (obj.type === 'plane') {
      drawPlane(ctx, ox, obj.y);
    } else if (obj.type === 'star') {
      const blink = 0.4 + 0.6 * Math.abs(Math.sin(bgFrameCount * 0.03 + (obj.blinkOffset || 0)));
      ctx.globalAlpha = 0.5 * blink;
      drawBigStar(ctx, ox, obj.y);
    }
  }
  ctx.globalAlpha = 1;
}

function drawFlyingBird(ctx, x, y, offset) {
  const wingFlap = Math.sin(offset * 0.01) * 3;
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + wingFlap);
  ctx.lineTo(x, y);
  ctx.lineTo(x + 8, y + wingFlap);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 14, y + 6 + wingFlap * 0.8);
  ctx.lineTo(x - 6, y + 6);
  ctx.lineTo(x + 2, y + 6 + wingFlap * 0.8);
  ctx.stroke();
}

function drawBalloon(ctx, x, y) {
  ctx.fillStyle = '#E74C3C';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F39C12';
  ctx.beginPath();
  ctx.arc(x, y, 10, -0.3, 0.3);
  ctx.lineTo(x, y + 10);
  ctx.fill();
  ctx.fillStyle = '#8D6E63';
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 12);
  ctx.lineTo(x + 4, y + 12);
  ctx.lineTo(x + 3, y + 16);
  ctx.lineTo(x - 3, y + 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 10);
  ctx.lineTo(x - 4, y + 12);
  ctx.moveTo(x + 3, y + 10);
  ctx.lineTo(x + 4, y + 12);
  ctx.stroke();
}

function drawPlane(ctx, x, y) {
  ctx.fillStyle = '#aaa';
  ctx.beginPath();
  ctx.ellipse(x, y, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x - 2, y - 8);
  ctx.lineTo(x + 4, y);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x - 2, y + 8);
  ctx.lineTo(x + 4, y);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 12, y);
  ctx.lineTo(x - 14, y - 4);
  ctx.lineTo(x - 10, y);
  ctx.fill();
}

function drawBigStar(ctx, x, y) {
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](x + Math.cos(angle) * 6, y + Math.sin(angle) * 6);
  }
  ctx.closePath();
  ctx.fill();
}

// ============================================================
// CLOUDS — simplified on medium quality (3 arcs instead of 5)
// ============================================================
function drawClouds(ctx, W, offset, quality) {
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  const loopW = 1200;
  const useSimple = quality === 'medium';

  // Pre-defined cloud data (avoid object allocation)
  const cloudBaseX = [100, 350, 550, 800, 1050];
  const cloudY = [45, 70, 35, 80, 50];
  const cloudS = [0.9, 0.7, 1.0, 0.6, 0.85];

  for (let i = 0; i < 5; i++) {
    const cx = ((cloudBaseX[i] - offset % loopW) + loopW) % loopW - 80;
    if (cx < -100 || cx > W + 100) continue;

    const s = cloudS[i];
    const ty = cloudY[i];

    ctx.beginPath();
    if (useSimple) {
      ctx.arc(cx, ty, 24 * s, 0, Math.PI * 2);
      ctx.arc(cx + 20 * s, ty - 8 * s, 20 * s, 0, Math.PI * 2);
      ctx.arc(cx + 42 * s, ty - 2 * s, 22 * s, 0, Math.PI * 2);
    } else {
      ctx.arc(cx, ty, 24 * s, 0, Math.PI * 2);
      ctx.arc(cx + 20 * s, ty - 8 * s, 20 * s, 0, Math.PI * 2);
      ctx.arc(cx + 42 * s, ty - 2 * s, 22 * s, 0, Math.PI * 2);
      ctx.arc(cx + 16 * s, ty + 7 * s, 17 * s, 0, Math.PI * 2);
      ctx.arc(cx + 34 * s, ty + 5 * s, 15 * s, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

// ============================================================
// GROUND — cached gradient, optimized grass blades
// ============================================================
function drawGround(ctx, W, H, groundHeight, offset, isPhase3, quality) {
  const gy = H - groundHeight;
  const groundCanvas = getGroundCanvas(isPhase3);

  // Main fill from cached 1px strip
  if (groundCanvas) {
    ctx.drawImage(groundCanvas, 0, 0, 1, groundCanvas.height, 0, gy - 2, W, groundHeight + 2);
  }

  // Grass blades (every other blade on medium, skip on low)
  if (quality !== 'low') {
    ctx.fillStyle = isPhase3 ? '#2E5E3E' : '#43A047';
    const bladeSpacing = quality === 'medium' ? 28 : 14;
    const gOff = offset % bladeSpacing;
    for (let x = -gOff; x < W + bladeSpacing; x += bladeSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, gy - 2);
      ctx.lineTo(x + 3, gy - 7);
      ctx.lineTo(x + 6, gy - 2);
      ctx.fill();
      if (quality === 'high') {
        ctx.beginPath();
        ctx.moveTo(x + 7, gy - 2);
        ctx.lineTo(x + 10, gy - 5);
        ctx.lineTo(x + 13, gy - 2);
        ctx.fill();
      }
    }
  }

  // Ground texture (skip on low)
  if (quality === 'high') {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    const tOff = offset % 22;
    for (let x = -tOff; x < W + 22; x += 22) {
      ctx.fillRect(x, gy + 14, 14, 2);
      ctx.fillRect(x + 10, gy + 28, 14, 2);
    }
  }
}
