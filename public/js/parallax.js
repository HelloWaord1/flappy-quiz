// ============================================================
// PARALLAX BACKGROUND — Flappy Bird style (OPTIMIZED)
// ============================================================
// Cached gradients via offscreen canvas, quality-aware rendering

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

export function drawParallaxBackground(ctx, W, H, groundHeight, groundOffset, phase) {
  const groundY = H - groundHeight;
  const isPhase3 = phase === 3;
  const quality = getQualityLevel();
  bgFrameCount++;

  // Ensure gradient caches are ready
  ensureCaches(W, H, groundHeight);

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

  // === Hills ===
  if (quality !== 'low') {
    // Far hills (0.2x speed)
    const farHillColor1 = isPhase3 ? 'rgba(60,40,80,0.5)' : 'rgba(120,160,130,0.4)';
    const farHillColor2 = isPhase3 ? 'rgba(40,25,60,0.35)' : 'rgba(100,145,115,0.25)';
    drawHills(ctx, W, groundY, groundOffset * 0.2, {
      color1: farHillColor1,
      color2: farHillColor2,
      baseHeight: 60,
      amplitude: 35,
      frequency: 0.004,
      yOffset: 0,
    });

    // Near hills (0.4x speed)
    const nearHillColor1 = isPhase3 ? 'rgba(40,30,60,0.55)' : 'rgba(80,130,80,0.45)';
    const nearHillColor2 = isPhase3 ? 'rgba(25,18,40,0.4)' : 'rgba(60,110,60,0.3)';
    drawHills(ctx, W, groundY, groundOffset * 0.4, {
      color1: nearHillColor1,
      color2: nearHillColor2,
      baseHeight: 40,
      amplitude: 25,
      frequency: 0.006,
      yOffset: 10,
    });
  } else {
    // Low quality: single simplified hill layer
    drawHillsSimple(ctx, W, groundY, groundOffset * 0.3, isPhase3);
  }

  // === Trees (skip on low quality) ===
  if (quality !== 'low') {
    drawTreeRow(ctx, W, groundY, groundOffset * 0.55, isPhase3, quality);
  }

  // === Bushes (skip on low quality) ===
  if (quality === 'high') {
    drawBushRow(ctx, W, groundY, groundOffset * 0.7, isPhase3);
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

  for (const obj of objects) {
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
  const clouds = [
    { baseX: 100, y: 45, s: 0.9 },
    { baseX: 350, y: 70, s: 0.7 },
    { baseX: 550, y: 35, s: 1.0 },
    { baseX: 800, y: 80, s: 0.6 },
    { baseX: 1050, y: 50, s: 0.85 },
  ];
  const loopW = 1200;
  const useSimple = quality === 'medium';

  for (const c of clouds) {
    const cx = ((c.baseX - offset % loopW) + loopW) % loopW - 80;
    if (cx < -100 || cx > W + 100) continue;

    const tx = cx;
    const ty = c.y;
    const s = c.s;

    ctx.beginPath();
    if (useSimple) {
      // 3 arcs instead of 5
      ctx.arc(tx, ty, 24 * s, 0, Math.PI * 2);
      ctx.arc(tx + 20 * s, ty - 8 * s, 20 * s, 0, Math.PI * 2);
      ctx.arc(tx + 42 * s, ty - 2 * s, 22 * s, 0, Math.PI * 2);
    } else {
      ctx.arc(tx, ty, 24 * s, 0, Math.PI * 2);
      ctx.arc(tx + 20 * s, ty - 8 * s, 20 * s, 0, Math.PI * 2);
      ctx.arc(tx + 42 * s, ty - 2 * s, 22 * s, 0, Math.PI * 2);
      ctx.arc(tx + 16 * s, ty + 7 * s, 17 * s, 0, Math.PI * 2);
      ctx.arc(tx + 34 * s, ty + 5 * s, 15 * s, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

// ============================================================
// HILLS — smooth sine-based (uses gradient per draw)
// ============================================================
function drawHills(ctx, W, groundY, offset, opts) {
  const { color1, color2, baseHeight, amplitude, frequency, yOffset } = opts;
  const step = 6; // coarser step than original 3

  ctx.beginPath();
  ctx.moveTo(0, groundY + yOffset);

  for (let x = 0; x <= W; x += step) {
    const worldX = x + offset;
    const h = baseHeight
      + Math.sin(worldX * frequency) * amplitude
      + Math.sin(worldX * frequency * 2.3 + 1.5) * amplitude * 0.4
      + Math.sin(worldX * frequency * 0.7 + 3.0) * amplitude * 0.6;
    ctx.lineTo(x, groundY - h + yOffset);
  }

  ctx.lineTo(W, groundY + yOffset + 10);
  ctx.lineTo(0, groundY + yOffset + 10);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, groundY - baseHeight - amplitude, 0, groundY + yOffset);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.fill();
}

// Simplified single-color hills for low quality
function drawHillsSimple(ctx, W, groundY, offset, isPhase3) {
  ctx.beginPath();
  ctx.moveTo(0, groundY);

  for (let x = 0; x <= W; x += 12) {
    const worldX = x + offset;
    const h = 40 + Math.sin(worldX * 0.005) * 30;
    ctx.lineTo(x, groundY - h);
  }

  ctx.lineTo(W, groundY + 10);
  ctx.lineTo(0, groundY + 10);
  ctx.closePath();
  ctx.fillStyle = isPhase3 ? 'rgba(40,30,60,0.5)' : 'rgba(80,130,80,0.4)';
  ctx.fill();
}

// ============================================================
// TREES — skip gradient on medium, use flat color
// ============================================================
function drawTreeRow(ctx, W, groundY, offset, isPhase3, quality) {
  const spacing = 55;
  const loopW = spacing * 25;
  const off = offset % loopW;

  const trunkColor = isPhase3 ? '#4E342E' : '#6D4C41';
  const canopyColor = isPhase3 ? '#2E4A3E' : '#4CAF50';
  const useGradient = quality === 'high';

  for (let i = 0; i < Math.ceil(W / spacing) + 3; i++) {
    const baseX = i * spacing;
    const tx = baseX - (off % spacing);
    if (tx < -30 || tx > W + 30) continue;

    const seed = ((Math.floor((baseX + off) / spacing) * 7919) % 1000) / 1000;
    const h = 28 + seed * 20;
    const canopyW = 12 + seed * 8;

    // Trunk
    ctx.fillStyle = trunkColor;
    ctx.fillRect(tx - 2.5, groundY - h * 0.35, 5, h * 0.35);

    // Canopy
    if (useGradient) {
      const cGrad = ctx.createRadialGradient(tx, groundY - h * 0.55, 2, tx, groundY - h * 0.5, canopyW);
      if (isPhase3) {
        cGrad.addColorStop(0, '#2E4A3E');
        cGrad.addColorStop(1, '#1B3A2A');
      } else {
        cGrad.addColorStop(0, '#66BB6A');
        cGrad.addColorStop(1, '#2E7D32');
      }
      ctx.fillStyle = cGrad;
    } else {
      ctx.fillStyle = canopyColor;
    }
    ctx.beginPath();
    ctx.ellipse(tx, groundY - h * 0.55, canopyW, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
// BUSHES — small green ellipses near ground
// ============================================================
function drawBushRow(ctx, W, groundY, offset, isPhase3) {
  const spacing = 40;
  const loopW = spacing * 30;
  const off = offset % loopW;
  const bushColor = isPhase3 ? '#3E5E4A' : '#5B8C2A';

  for (let i = 0; i < Math.ceil(W / spacing) + 3; i++) {
    const baseX = i * spacing + 15;
    const bx = baseX - (off % spacing);
    if (bx < -20 || bx > W + 20) continue;

    const seed = ((Math.floor((baseX + off) / spacing) * 6271) % 1000) / 1000;
    const r = 8 + seed * 7;

    // Use flat color instead of radial gradient
    ctx.fillStyle = bushColor;
    ctx.beginPath();
    ctx.ellipse(bx, groundY - r * 0.25, r, r * 0.55, 0, 0, Math.PI * 2);
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
