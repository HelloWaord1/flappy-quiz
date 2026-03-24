// ============================================================
// DRAWING HELPERS & BIRD/GATE RENDERING
// ============================================================

const TEXT_SHADOW = 'rgba(0,0,0,0.5)';
const TEXT_WHITE = '#FFFFFF';
const PIPE_GREEN = '#73BF2E';
const PIPE_GREEN_DARK = '#558B2F';
const PIPE_GREEN_LIGHT = '#8BC34A';
const PIPE_BORDER = '#2E7D32';
const BIRD_YELLOW = '#F7DC6F';
const BIRD_ORANGE = '#F39C12';
const BIRD_SIZE = 28;

// Wing animation frames: 0=up, 1=mid, 2=down
const WING_FRAMES = [
  { angle: -0.35, yOff: -4 },
  { angle: -0.1, yOff: 0 },
  { angle: 0.2, yOff: 4 },
];

export function drawText(ctx, text, x, y, size, color, align = 'center', stroke = true) {
  ctx.font = `bold ${size}px Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (stroke) {
    ctx.strokeStyle = TEXT_SHADOW;
    ctx.lineWidth = Math.max(size / 5, 2.5);
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawRoundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
}

// ============================================================
// BIRD (3-frame wing animation, gradient body)
// ============================================================
export function drawBird(ctx, bird, hurtTimer, groundY) {
  const { x, y, rotation, wingIndex } = bird;

  if (hurtTimer > 0 && Math.floor(hurtTimer / 3) % 2 === 0) {
    return;
  }

  // Ground shadow
  if (groundY != null) {
    const maxDist = groundY - 50;
    const dist = groundY - y;
    const shadowScale = Math.max(0.2, Math.min(1, dist / maxDist));
    const shadowWidth = BIRD_SIZE * (1.2 - shadowScale * 0.6);
    const shadowHeight = shadowWidth * 0.3;
    const shadowAlpha = 0.25 * (1 - shadowScale * 0.7);
    ctx.save();
    ctx.globalAlpha = shadowAlpha;
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.ellipse(x, groundY - 2, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const wing = WING_FRAMES[wingIndex] || WING_FRAMES[1];

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(3, 3, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body gradient
  const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, BIRD_SIZE / 2);
  if (hurtTimer > 0) {
    bodyGrad.addColorStop(0, '#FF9999');
    bodyGrad.addColorStop(1, '#FF4444');
  } else {
    bodyGrad.addColorStop(0, '#FFF176');
    bodyGrad.addColorStop(0.7, BIRD_YELLOW);
    bodyGrad.addColorStop(1, '#E6C349');
  }
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = BIRD_ORANGE;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Belly highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(-2, -4, BIRD_SIZE / 3.5, BIRD_SIZE / 4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Wing with 3-frame animation
  ctx.save();
  ctx.translate(-4, 2);
  ctx.rotate(wing.angle);
  const wingGrad = ctx.createLinearGradient(0, wing.yOff - 6, 0, wing.yOff + 6);
  wingGrad.addColorStop(0, '#F0A830');
  wingGrad.addColorStop(1, BIRD_ORANGE);
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.ellipse(0, wing.yOff, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#D68910';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(8, -5, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pupil
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(10, -5, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(11.5, -6.5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Beak (two-tone)
  ctx.fillStyle = '#E74C3C';
  ctx.beginPath();
  ctx.moveTo(14, -1);
  ctx.lineTo(25, 3);
  ctx.lineTo(14, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#C0392B';
  ctx.beginPath();
  ctx.moveTo(14, 4);
  ctx.lineTo(25, 3);
  ctx.lineTo(14, 7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ============================================================
// PIPE SECTIONS
// ============================================================
function drawPipeSection(ctx, x, y, w, h) {
  if (h <= 0) return;
  const pipeGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  pipeGrad.addColorStop(0, PIPE_GREEN_DARK);
  pipeGrad.addColorStop(0.15, PIPE_GREEN_LIGHT);
  pipeGrad.addColorStop(0.4, PIPE_GREEN);
  pipeGrad.addColorStop(0.85, PIPE_GREEN_DARK);
  pipeGrad.addColorStop(1, '#3E7B1E');
  ctx.fillStyle = pipeGrad;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 6, y, 8, h);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x + w - 8, y, 8, h);

  ctx.strokeStyle = PIPE_BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawPipeCap(ctx, x, y, w, h) {
  const capGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  capGrad.addColorStop(0, '#3E7B1E');
  capGrad.addColorStop(0.15, PIPE_GREEN);
  capGrad.addColorStop(0.4, PIPE_GREEN_LIGHT);
  capGrad.addColorStop(0.85, PIPE_GREEN_DARK);
  capGrad.addColorStop(1, '#2D5E15');
  ctx.fillStyle = capGrad;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PIPE_BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

// ============================================================
// GATE
// ============================================================
export function drawGate(ctx, gate, H, GROUND_HEIGHT, GATE_WIDTH, PASSAGE_HEIGHT, WALL_THICKNESS) {
  const { x, topPassageY, question, passed, result } = gate;
  const capH = 10;
  const capExtra = 12;

  const topWallBottom = topPassageY;
  const midWallTop = topPassageY + PASSAGE_HEIGHT;
  const midWallBottom = midWallTop + WALL_THICKNESS;
  const botPassageBottom = midWallBottom + PASSAGE_HEIGHT;
  const groundY = H - GROUND_HEIGHT;

  if (topWallBottom > 0) {
    drawPipeSection(ctx, x, 0, GATE_WIDTH, topWallBottom - capH);
    drawPipeCap(ctx, x - capExtra / 2, topWallBottom - capH, GATE_WIDTH + capExtra, capH);
  }

  drawPipeCap(ctx, x - capExtra / 2, midWallTop, GATE_WIDTH + capExtra, capH);
  drawPipeSection(ctx, x, midWallTop + capH, GATE_WIDTH, WALL_THICKNESS - capH * 2);
  drawPipeCap(ctx, x - capExtra / 2, midWallBottom - capH, GATE_WIDTH + capExtra, capH);

  if (botPassageBottom < groundY) {
    drawPipeCap(ctx, x - capExtra / 2, botPassageBottom, GATE_WIDTH + capExtra, capH);
    drawPipeSection(ctx, x, botPassageBottom + capH, GATE_WIDTH, groundY - botPassageBottom - capH);
  }

  if (question && !passed) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x, topPassageY, GATE_WIDTH, PASSAGE_HEIGHT);
    ctx.fillRect(x, midWallBottom, GATE_WIDTH, PASSAGE_HEIGHT);

    drawAnswerBadge(ctx, x, topPassageY, GATE_WIDTH, PASSAGE_HEIGHT, 'A', question.a);
    drawAnswerBadge(ctx, x, midWallBottom, GATE_WIDTH, PASSAGE_HEIGHT, 'B', question.b);
  }

  if (result) {
    const passageY = result.chose === 'a' ? topPassageY : midWallBottom;
    const color = result.correct ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)';
    ctx.fillStyle = color;
    ctx.fillRect(x, passageY, GATE_WIDTH, PASSAGE_HEIGHT);
  }
}

function drawAnswerBadge(ctx, gx, passageY, gateW, passageH, letter, text) {
  const cx = gx + gateW / 2;
  const cy = passageY + passageH / 2;

  const pillW = gateW - 12;
  const pillH = 32;
  const pillX = cx - pillW / 2;
  const pillY = cy - pillH / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(pillX + 16, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, letter, pillX + 16, cy, 12, TEXT_WHITE, 'center', false);

  const maxTextW = pillW - 40;
  let fontSize = Math.min(18, Math.max(10, maxTextW / (text.length * 0.45)));
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  let measured = ctx.measureText(text).width;
  while (measured > maxTextW && fontSize > 8) {
    fontSize -= 1;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    measured = ctx.measureText(text).width;
  }
  drawText(ctx, text, cx + 8, cy, fontSize, TEXT_WHITE, 'center', true);
}

// ============================================================
// CANVAS HEART SHAPE
// ============================================================
export function drawCanvasHeart(ctx, cx, cy, size, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.3);
  ctx.bezierCurveTo(cx - size, cy - size * 0.35, cx - size * 0.5, cy - size, cx, cy - size * 0.5);
  ctx.bezierCurveTo(cx + size * 0.5, cy - size, cx + size, cy - size * 0.35, cx, cy + size * 0.3);
  ctx.closePath();
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(cx - size * 0.25, cy - size * 0.4, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
}
