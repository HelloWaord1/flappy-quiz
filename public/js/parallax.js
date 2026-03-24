// ============================================================
// PARALLAX BACKGROUND — Flappy Bird style
// ============================================================
// 3 layers: sky+clouds -> soft hills -> trees+bushes -> ground
// Phase support: 1=day, 2=night (handled elsewhere), 3=sunset

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
  bgFrameCount++;

  // === Sky gradient ===
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  if (isPhase3) {
    skyGrad.addColorStop(0, '#1a1a2e');
    skyGrad.addColorStop(0.4, '#2d1b4e');
    skyGrad.addColorStop(0.7, '#4a2060');
    skyGrad.addColorStop(1, '#6b3a7a');
  } else {
    skyGrad.addColorStop(0, '#4EC0CA');
    skyGrad.addColorStop(0.6, '#87CEEB');
    skyGrad.addColorStop(1, '#B0E0E6');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, groundY);

  // === Stars (phase 3 only) ===
  if (isPhase3) {
    drawStars(ctx, W, groundY, groundOffset);
  }

  // === Animated background objects (very slow, far away) ===
  drawBackgroundObjects(ctx, W, groundY, groundOffset, isPhase3);

  // === Clouds (very slow) ===
  if (!isPhase3) {
    drawClouds(ctx, W, groundOffset * 0.15);
  }

  // === Far hills (0.2x speed) — soft rounded ===
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

  // === Near hills (0.4x speed) — slightly darker ===
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

  // === Trees (0.55x speed) ===
  drawTreeRow(ctx, W, groundY, groundOffset * 0.55, isPhase3);

  // === Bushes (0.7x speed) ===
  drawBushRow(ctx, W, groundY, groundOffset * 0.7, isPhase3);

  // === Ground ===
  drawGround(ctx, W, H, groundHeight, groundOffset, isPhase3);
}

// ============================================================
// STARS — twinkling background for phase 3
// ============================================================
function drawStars(ctx, W, groundY, offset) {
  const starCount = 30;
  const loopW = 1400;
  for (let i = 0; i < starCount; i++) {
    // Deterministic position from seed
    const seed1 = ((i * 7919 + 31) % 1000) / 1000;
    const seed2 = ((i * 6271 + 97) % 1000) / 1000;
    const seed3 = ((i * 3571 + 53) % 1000) / 1000;
    const baseX = seed1 * loopW;
    const sy = seed2 * (groundY * 0.5);
    const sx = ((baseX - offset * 0.05) % loopW + loopW) % loopW;
    if (sx > W + 10) continue;

    // Twinkle
    const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(bgFrameCount * 0.02 + seed3 * 10));
    const size = 1 + seed3 * 2;

    ctx.save();
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================
// ANIMATED BACKGROUND OBJECTS — far, slow-moving
// ============================================================
function drawBackgroundObjects(ctx, W, groundY, groundOffset, isPhase3) {
  const objects = isPhase3 ? BG_OBJECTS_P3 : BG_OBJECTS;
  const loopW = 1200;

  for (const obj of objects) {
    const ox = ((obj.baseX - groundOffset * obj.speed) % loopW + loopW) % loopW;
    if (ox > W + 60) continue;

    ctx.save();
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

    ctx.restore();
  }
}

// V-shape bird flock
function drawFlyingBird(ctx, x, y, offset) {
  const wingFlap = Math.sin(offset * 0.01) * 3;
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + wingFlap);
  ctx.lineTo(x, y);
  ctx.lineTo(x + 8, y + wingFlap);
  ctx.stroke();
  // Second bird slightly behind
  ctx.beginPath();
  ctx.moveTo(x - 14, y + 6 + wingFlap * 0.8);
  ctx.lineTo(x - 6, y + 6);
  ctx.lineTo(x + 2, y + 6 + wingFlap * 0.8);
  ctx.stroke();
}

// Hot air balloon
function drawBalloon(ctx, x, y) {
  // Balloon body (circle)
  ctx.fillStyle = '#E74C3C';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  // Stripe
  ctx.fillStyle = '#F39C12';
  ctx.beginPath();
  ctx.arc(x, y, 10, -0.3, 0.3);
  ctx.lineTo(x, y + 10);
  ctx.fill();
  // Basket (trapezoid)
  ctx.fillStyle = '#8D6E63';
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 12);
  ctx.lineTo(x + 4, y + 12);
  ctx.lineTo(x + 3, y + 16);
  ctx.lineTo(x - 3, y + 16);
  ctx.closePath();
  ctx.fill();
  // Ropes
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 10);
  ctx.lineTo(x - 4, y + 12);
  ctx.moveTo(x + 3, y + 10);
  ctx.lineTo(x + 4, y + 12);
  ctx.stroke();
}

// Small airplane silhouette
function drawPlane(ctx, x, y) {
  ctx.fillStyle = '#aaa';
  // Fuselage
  ctx.beginPath();
  ctx.ellipse(x, y, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wings
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
  // Tail
  ctx.beginPath();
  ctx.moveTo(x - 12, y);
  ctx.lineTo(x - 14, y - 4);
  ctx.lineTo(x - 10, y);
  ctx.fill();
}

// Big decorative star (phase 3)
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
// CLOUDS — soft, fluffy
// ============================================================
function drawClouds(ctx, W, offset) {
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  const clouds = [
    { baseX: 100, y: 45, s: 0.9 },
    { baseX: 350, y: 70, s: 0.7 },
    { baseX: 550, y: 35, s: 1.0 },
    { baseX: 800, y: 80, s: 0.6 },
    { baseX: 1050, y: 50, s: 0.85 },
  ];
  const loopW = 1200;
  for (const c of clouds) {
    const cx = ((c.baseX - offset % loopW) + loopW) % loopW - 80;
    if (cx < -100 || cx > W + 100) continue;
    ctx.save();
    ctx.translate(cx, c.y);
    ctx.scale(c.s, c.s);
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.arc(20, -8, 20, 0, Math.PI * 2);
    ctx.arc(42, -2, 22, 0, Math.PI * 2);
    ctx.arc(16, 7, 17, 0, Math.PI * 2);
    ctx.arc(34, 5, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================
// HILLS — smooth sine-based rolling hills
// ============================================================
function drawHills(ctx, W, groundY, offset, opts) {
  const { color1, color2, baseHeight, amplitude, frequency, yOffset } = opts;

  ctx.beginPath();
  ctx.moveTo(0, groundY + yOffset);

  // Draw smooth curve using sine waves
  for (let x = 0; x <= W; x += 3) {
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

// ============================================================
// TREES — simple ellipse canopy on trunk
// ============================================================
function drawTreeRow(ctx, W, groundY, offset, isPhase3) {
  const spacing = 55;
  const loopW = spacing * 25;
  const off = offset % loopW;

  for (let i = 0; i < Math.ceil(W / spacing) + 3; i++) {
    const baseX = i * spacing;
    const tx = baseX - (off % spacing);
    if (tx < -30 || tx > W + 30) continue;

    // Deterministic "random" per tree slot
    const seed = ((Math.floor((baseX + off) / spacing) * 7919) % 1000) / 1000;
    const h = 28 + seed * 20;
    const canopyW = 12 + seed * 8;

    // Trunk
    ctx.fillStyle = isPhase3 ? '#4E342E' : '#6D4C41';
    ctx.fillRect(tx - 2.5, groundY - h * 0.35, 5, h * 0.35);

    // Canopy
    const cGrad = ctx.createRadialGradient(tx, groundY - h * 0.55, 2, tx, groundY - h * 0.5, canopyW);
    if (isPhase3) {
      cGrad.addColorStop(0, '#2E4A3E');
      cGrad.addColorStop(1, '#1B3A2A');
    } else {
      cGrad.addColorStop(0, '#66BB6A');
      cGrad.addColorStop(1, '#2E7D32');
    }
    ctx.fillStyle = cGrad;
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

  for (let i = 0; i < Math.ceil(W / spacing) + 3; i++) {
    const baseX = i * spacing + 15;
    const bx = baseX - (off % spacing);
    if (bx < -20 || bx > W + 20) continue;

    const seed = ((Math.floor((baseX + off) / spacing) * 6271) % 1000) / 1000;
    const r = 8 + seed * 7;

    const bGrad = ctx.createRadialGradient(bx, groundY - r * 0.25, 1, bx, groundY - r * 0.2, r);
    if (isPhase3) {
      bGrad.addColorStop(0, '#3E5E4A');
      bGrad.addColorStop(1, '#1A3320');
    } else {
      bGrad.addColorStop(0, '#7CB342');
      bGrad.addColorStop(1, '#33691E');
    }
    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.ellipse(bx, groundY - r * 0.25, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
// GROUND — textured with grass blades
// ============================================================
function drawGround(ctx, W, H, groundHeight, offset, isPhase3) {
  const gy = H - groundHeight;

  // Main fill
  const gGrad = ctx.createLinearGradient(0, gy, 0, H);
  if (isPhase3) {
    gGrad.addColorStop(0, '#3E2723');
    gGrad.addColorStop(0.3, '#4E342E');
    gGrad.addColorStop(1, '#2E1B11');
  } else {
    gGrad.addColorStop(0, '#C8A951');
    gGrad.addColorStop(0.3, '#DED895');
    gGrad.addColorStop(1, '#B89A3D');
  }
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, gy, W, groundHeight);

  // Grass strip
  const grassGrad = ctx.createLinearGradient(0, gy - 3, 0, gy + 8);
  if (isPhase3) {
    grassGrad.addColorStop(0, '#2E4A3E');
    grassGrad.addColorStop(0.5, '#1B3A2A');
    grassGrad.addColorStop(1, '#3E2723');
  } else {
    grassGrad.addColorStop(0, '#4CAF50');
    grassGrad.addColorStop(0.5, '#388E3C');
    grassGrad.addColorStop(1, '#C8A951');
  }
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, gy - 2, W, 10);

  // Grass blades
  ctx.fillStyle = isPhase3 ? '#2E5E3E' : '#43A047';
  const gOff = offset % 14;
  for (let x = -gOff; x < W + 14; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, gy - 2);
    ctx.lineTo(x + 3, gy - 7);
    ctx.lineTo(x + 6, gy - 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 7, gy - 2);
    ctx.lineTo(x + 10, gy - 5);
    ctx.lineTo(x + 13, gy - 2);
    ctx.fill();
  }

  // Ground texture
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  const tOff = offset % 22;
  for (let x = -tOff; x < W + 22; x += 22) {
    ctx.fillRect(x, gy + 14, 14, 2);
    ctx.fillRect(x + 10, gy + 28, 14, 2);
  }
}
