// ============================================================
// PARALLAX BACKGROUND — Flappy Bird style
// ============================================================
// 3 layers: sky+clouds → soft hills → trees+bushes → ground

export function drawParallaxBackground(ctx, W, H, groundHeight, groundOffset) {
  const groundY = H - groundHeight;

  // === Sky gradient ===
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, '#4EC0CA');
  skyGrad.addColorStop(0.6, '#87CEEB');
  skyGrad.addColorStop(1, '#B0E0E6');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, groundY);

  // === Clouds (very slow) ===
  drawClouds(ctx, W, groundOffset * 0.15);

  // === Far hills (0.2x speed) — soft rounded ===
  drawHills(ctx, W, groundY, groundOffset * 0.2, {
    color1: 'rgba(120,160,130,0.4)',
    color2: 'rgba(100,145,115,0.25)',
    baseHeight: 60,
    amplitude: 35,
    frequency: 0.004,
    yOffset: 0,
  });

  // === Near hills (0.4x speed) — slightly darker ===
  drawHills(ctx, W, groundY, groundOffset * 0.4, {
    color1: 'rgba(80,130,80,0.45)',
    color2: 'rgba(60,110,60,0.3)',
    baseHeight: 40,
    amplitude: 25,
    frequency: 0.006,
    yOffset: 10,
  });

  // === Trees (0.55x speed) ===
  drawTreeRow(ctx, W, groundY, groundOffset * 0.55);

  // === Bushes (0.7x speed) ===
  drawBushRow(ctx, W, groundY, groundOffset * 0.7);

  // === Ground ===
  drawGround(ctx, W, H, groundHeight, groundOffset);
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
function drawTreeRow(ctx, W, groundY, offset) {
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
    ctx.fillStyle = '#6D4C41';
    ctx.fillRect(tx - 2.5, groundY - h * 0.35, 5, h * 0.35);

    // Canopy
    const cGrad = ctx.createRadialGradient(tx, groundY - h * 0.55, 2, tx, groundY - h * 0.5, canopyW);
    cGrad.addColorStop(0, '#66BB6A');
    cGrad.addColorStop(1, '#2E7D32');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.ellipse(tx, groundY - h * 0.55, canopyW, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
// BUSHES — small green ellipses near ground
// ============================================================
function drawBushRow(ctx, W, groundY, offset) {
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
    bGrad.addColorStop(0, '#7CB342');
    bGrad.addColorStop(1, '#33691E');
    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.ellipse(bx, groundY - r * 0.25, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
// GROUND — textured with grass blades
// ============================================================
function drawGround(ctx, W, H, groundHeight, offset) {
  const gy = H - groundHeight;

  // Main fill
  const gGrad = ctx.createLinearGradient(0, gy, 0, H);
  gGrad.addColorStop(0, '#C8A951');
  gGrad.addColorStop(0.3, '#DED895');
  gGrad.addColorStop(1, '#B89A3D');
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, gy, W, groundHeight);

  // Grass strip
  const grassGrad = ctx.createLinearGradient(0, gy - 3, 0, gy + 8);
  grassGrad.addColorStop(0, '#4CAF50');
  grassGrad.addColorStop(0.5, '#388E3C');
  grassGrad.addColorStop(1, '#C8A951');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, gy - 2, W, 10);

  // Grass blades
  ctx.fillStyle = '#43A047';
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
