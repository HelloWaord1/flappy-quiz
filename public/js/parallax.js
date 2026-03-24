// ============================================================
// PARALLAX BACKGROUND SYSTEM
// ============================================================

// Pre-generate mountain/city/tree shapes once
let mountainPoints = null;
let treePositions = null;
let bushPositions = null;

function ensureShapes(W) {
  if (!mountainPoints || mountainPoints.width !== W) {
    // Mountains - jagged silhouette
    const pts = [];
    let x = 0;
    while (x < W + 100) {
      pts.push({ x, h: 40 + Math.random() * 80 });
      x += 30 + Math.random() * 50;
    }
    mountainPoints = { points: pts, width: W };
  }
  if (!treePositions || treePositions.width !== W) {
    const trees = [];
    for (let i = 0; i < Math.ceil(W / 60) + 4; i++) {
      trees.push({
        x: i * 60 + Math.random() * 20,
        h: 30 + Math.random() * 25,
        w: 18 + Math.random() * 10,
      });
    }
    treePositions = { trees, width: W };
  }
  if (!bushPositions || bushPositions.width !== W) {
    const bushes = [];
    for (let i = 0; i < Math.ceil(W / 45) + 4; i++) {
      bushes.push({
        x: i * 45 + Math.random() * 15,
        r: 10 + Math.random() * 8,
      });
    }
    bushPositions = { bushes, width: W };
  }
}

export function drawParallaxBackground(ctx, W, H, groundHeight, groundOffset) {
  const groundY = H - groundHeight;
  ensureShapes(W);

  // === Layer 0: Sky gradient ===
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, '#3AADBE');
  skyGrad.addColorStop(0.5, '#6CC8D6');
  skyGrad.addColorStop(1, '#B0E0E6');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, groundY);

  // === Clouds (0.3x speed) ===
  const cloudOffset = groundOffset * 0.3;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 220 + 80) - (cloudOffset % (W + 400)) + W + 400) % (W + 400) - 120;
    const cy = 30 + i * 38 + Math.sin(i * 2.3) * 15;
    drawCloud(ctx, cx, cy, 0.7 + (i % 3) * 0.2);
  }

  // === Layer 1: Far mountains (0.3x speed) ===
  const mtOffset = groundOffset * 0.3;
  drawMountains(ctx, W, groundY, mtOffset, 'rgba(100,140,160,0.5)', 'rgba(80,120,140,0.4)');

  // === Layer 2: Mid trees/bushes (0.6x speed) ===
  const treeOffset = groundOffset * 0.6;
  drawTrees(ctx, W, groundY, treeOffset);
  drawBushes(ctx, W, groundY, treeOffset);

  // === Layer 3: Ground (1x speed) ===
  drawGround(ctx, W, H, groundHeight, groundOffset);
}

function drawCloud(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.arc(22, -8, 20, 0, Math.PI * 2);
  ctx.arc(44, 0, 23, 0, Math.PI * 2);
  ctx.arc(18, 8, 18, 0, Math.PI * 2);
  ctx.arc(32, 6, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMountains(ctx, W, groundY, offset, fillColor, fillColor2) {
  const pts = mountainPoints.points;
  const totalW = pts[pts.length - 1].x;

  // Far range
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (const p of pts) {
    const px = ((p.x - offset % totalW) + totalW) % totalW;
    ctx.lineTo(px, groundY - p.h - 30);
  }
  ctx.lineTo(W, groundY);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, groundY - 120, 0, groundY);
  grad.addColorStop(0, fillColor);
  grad.addColorStop(1, fillColor2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Near range (slightly different offset)
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (const p of pts) {
    const px = ((p.x - (offset * 1.3) % totalW) + totalW) % totalW;
    ctx.lineTo(px, groundY - p.h * 0.7);
  }
  ctx.lineTo(W, groundY);
  ctx.closePath();
  const grad2 = ctx.createLinearGradient(0, groundY - 80, 0, groundY);
  grad2.addColorStop(0, 'rgba(70,110,70,0.45)');
  grad2.addColorStop(1, 'rgba(60,100,60,0.3)');
  ctx.fillStyle = grad2;
  ctx.fill();
}

function drawTrees(ctx, W, groundY, offset) {
  const trees = treePositions.trees;
  const totalW = (trees.length) * 60 + 20;

  for (const t of trees) {
    const tx = ((t.x - offset % totalW) + totalW) % totalW;
    if (tx < -30 || tx > W + 30) continue;

    // Trunk
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(tx - 3, groundY - t.h * 0.4, 6, t.h * 0.4);

    // Canopy gradient
    const canopyGrad = ctx.createRadialGradient(tx, groundY - t.h * 0.6, 2, tx, groundY - t.h * 0.5, t.w);
    canopyGrad.addColorStop(0, '#66BB6A');
    canopyGrad.addColorStop(1, '#388E3C');
    ctx.fillStyle = canopyGrad;

    ctx.beginPath();
    ctx.ellipse(tx, groundY - t.h * 0.6, t.w * 0.6, t.h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBushes(ctx, W, groundY, offset) {
  const bushes = bushPositions.bushes;
  const totalW = (bushes.length) * 45 + 15;

  for (const b of bushes) {
    const bx = ((b.x - offset % totalW) + totalW) % totalW;
    if (bx < -20 || bx > W + 20) continue;

    const bushGrad = ctx.createRadialGradient(bx, groundY - b.r * 0.3, 1, bx, groundY - b.r * 0.2, b.r);
    bushGrad.addColorStop(0, '#7CB342');
    bushGrad.addColorStop(1, '#558B2F');
    ctx.fillStyle = bushGrad;
    ctx.beginPath();
    ctx.ellipse(bx, groundY - b.r * 0.3, b.r, b.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround(ctx, W, H, groundHeight, offset) {
  const gy = H - groundHeight;

  // Main ground gradient
  const groundGrad = ctx.createLinearGradient(0, gy, 0, H);
  groundGrad.addColorStop(0, '#C8A951');
  groundGrad.addColorStop(0.3, '#DED895');
  groundGrad.addColorStop(1, '#B89A3D');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, gy, W, groundHeight);

  // Grass on top — green strip
  const grassGrad = ctx.createLinearGradient(0, gy - 4, 0, gy + 10);
  grassGrad.addColorStop(0, '#4CAF50');
  grassGrad.addColorStop(0.5, '#388E3C');
  grassGrad.addColorStop(1, '#C8A951');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, gy - 2, W, 12);

  // Grass blades
  ctx.fillStyle = '#43A047';
  const gOff = offset % 16;
  for (let x = -gOff; x < W + 16; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, gy - 2);
    ctx.lineTo(x + 3, gy - 8);
    ctx.lineTo(x + 6, gy - 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 8, gy - 2);
    ctx.lineTo(x + 11, gy - 6);
    ctx.lineTo(x + 14, gy - 2);
    ctx.fill();
  }

  // Ground texture lines
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  const tOff = offset % 24;
  for (let x = -tOff; x < W + 24; x += 24) {
    ctx.fillRect(x, gy + 16, 16, 2);
    ctx.fillRect(x + 12, gy + 30, 16, 2);
  }
}
