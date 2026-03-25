// ============================================================
// DRAWING HELPERS & BIRD/GATE RENDERING (OPTIMIZED)
// ============================================================

import { getQualityLevel } from './perfmon.js';

const TEXT_SHADOW = 'rgba(0,0,0,0.5)';
const TEXT_WHITE = '#FFFFFF';
const PIPE_GREEN = '#73BF2E';
const PIPE_GREEN_DARK = '#558B2F';
const PIPE_GREEN_LIGHT = '#8BC34A';
const PIPE_BORDER = '#2E7D32';

const PIPE_GOLD = '#FFD700';
const PIPE_GOLD_DARK = '#DAA520';
const PIPE_GOLD_LIGHT = '#FFE44D';
const PIPE_GOLD_BORDER = '#B8860B';
const BIRD_YELLOW = '#F7DC6F';
const BIRD_ORANGE = '#F39C12';
const BIRD_BLUE = '#4FC3F7';
const BIRD_BLUE_LIGHT = '#B3E5FC';
const BIRD_BLUE_DARK = '#0288D1';
const BIRD_SIZE = 28;

// ============================================================
// TRAIL SYSTEM — stores last N positions
// ============================================================
const TRAIL_MAX = 10;
const trailPositions = [];

export function updateTrail(x, y) {
  trailPositions.unshift({ x, y });
  if (trailPositions.length > TRAIL_MAX) {
    trailPositions.length = TRAIL_MAX;
  }
}

export function clearTrail() {
  trailPositions.length = 0;
}

export function drawBirdTrail(ctx, comboActive) {
  const quality = getQualityLevel();
  if (quality === 'low') return; // skip trail on low-end

  for (let i = 1; i < trailPositions.length; i++) {
    const pos = trailPositions[i];
    const t = i / trailPositions.length;
    const alpha = 0.4 * (1 - t);
    const radius = BIRD_SIZE * 0.35 * (1 - t * 0.7);
    ctx.globalAlpha = alpha;
    if (comboActive) {
      const r = Math.floor(255 - t * 50);
      const g = Math.floor(140 - t * 100);
      ctx.fillStyle = `rgb(${r},${g},0)`;
    } else {
      ctx.fillStyle = '#F7DC6F';
    }
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

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
// BIRD (optimized: fewer save/restore, flat colors on low-end)
// ============================================================
export function drawBird(ctx, bird, hurtTimer, groundY, phase) {
  const { x, y, rotation, wingIndex } = bird;
  const isPhase3 = phase === 3;
  const isPhase2 = phase === 2;
  const quality = getQualityLevel();

  if (hurtTimer > 0 && Math.floor(hurtTimer / 3) % 2 === 0) {
    return;
  }

  // Ground shadow (skip on low quality)
  if (groundY != null && quality !== 'low') {
    const maxDist = groundY - 50;
    const dist = groundY - y;
    const shadowScale = Math.max(0.2, Math.min(1, dist / maxDist));
    const shadowWidth = BIRD_SIZE * (1.2 - shadowScale * 0.6);
    const shadowHeight = shadowWidth * 0.3;
    const shadowAlpha = 0.25 * (1 - shadowScale * 0.7);
    ctx.globalAlpha = shadowAlpha;
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.ellipse(x, groundY - 2, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const wing = WING_FRAMES[wingIndex] || WING_FRAMES[1];

  // Drop shadow (skip on low)
  if (quality !== 'low') {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(3, 3, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Body — use flat color on low quality, gradient otherwise
  if (quality === 'low') {
    if (hurtTimer > 0) {
      ctx.fillStyle = '#FF4444';
    } else if (isPhase3) {
      ctx.fillStyle = BIRD_BLUE;
    } else {
      ctx.fillStyle = BIRD_YELLOW;
    }
  } else {
    const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, BIRD_SIZE / 2);
    if (hurtTimer > 0) {
      bodyGrad.addColorStop(0, '#FF9999');
      bodyGrad.addColorStop(1, '#FF4444');
    } else if (isPhase3) {
      bodyGrad.addColorStop(0, BIRD_BLUE_LIGHT);
      bodyGrad.addColorStop(0.7, BIRD_BLUE);
      bodyGrad.addColorStop(1, BIRD_BLUE_DARK);
    } else {
      bodyGrad.addColorStop(0, '#FFF176');
      bodyGrad.addColorStop(0.7, BIRD_YELLOW);
      bodyGrad.addColorStop(1, '#E6C349');
    }
    ctx.fillStyle = bodyGrad;
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isPhase3 ? BIRD_BLUE_DARK : BIRD_ORANGE;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Belly highlight (skip on low)
  if (quality !== 'low') {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(-2, -4, BIRD_SIZE / 3.5, BIRD_SIZE / 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wing with 3-frame animation — use setTransform trick to avoid nested save/restore
  const cosR = Math.cos(wing.angle);
  const sinR = Math.sin(wing.angle);
  ctx.save();
  ctx.translate(-4, 2);
  ctx.rotate(wing.angle);

  if (quality === 'low') {
    ctx.fillStyle = isPhase3 ? '#29B6F6' : '#F0A830';
  } else {
    const wingGrad = ctx.createLinearGradient(0, wing.yOff - 6, 0, wing.yOff + 6);
    if (isPhase3) {
      wingGrad.addColorStop(0, '#29B6F6');
      wingGrad.addColorStop(1, BIRD_BLUE_DARK);
    } else {
      wingGrad.addColorStop(0, '#F0A830');
      wingGrad.addColorStop(1, BIRD_ORANGE);
    }
    ctx.fillStyle = wingGrad;
  }
  ctx.beginPath();
  ctx.ellipse(0, wing.yOff, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isPhase3 ? '#0277BD' : '#D68910';
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

  // Phase 2: Glasses
  if (isPhase2 && quality !== 'low') {
    drawGlasses(ctx);
  }

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

  // Phase 3: Tie
  if (isPhase3) {
    drawTie(ctx);
  }

  ctx.restore();
}

// ============================================================
// BIRD ACCESSORIES
// ============================================================
function drawGlasses(ctx) {
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(8, -5, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-4, -4, 5.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1, -5);
  ctx.lineTo(-4 + 5.5, -4);
  ctx.stroke();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#4444FF';
  ctx.beginPath();
  ctx.arc(8, -5, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-4, -4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTie(ctx) {
  ctx.fillStyle = '#D32F2F';
  ctx.beginPath();
  ctx.moveTo(12, 8);
  ctx.lineTo(16, 8);
  ctx.lineTo(14, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#B71C1C';
  ctx.beginPath();
  ctx.moveTo(13, 12);
  ctx.lineTo(15, 12);
  ctx.lineTo(16, 20);
  ctx.lineTo(14, 18);
  ctx.lineTo(12, 20);
  ctx.closePath();
  ctx.fill();
}

// ============================================================
// PIPE SECTIONS (use cached pipe gradient when available)
// ============================================================
function drawPipeSection(ctx, x, y, w, h, golden = false) {
  if (h <= 0) return;
  const border = golden ? PIPE_GOLD_BORDER : PIPE_BORDER;

  const quality = getQualityLevel();
  if (quality === 'low') {
    // Flat color on low quality
    ctx.fillStyle = golden ? PIPE_GOLD : PIPE_GREEN;
    ctx.fillRect(x, y, w, h);
  } else {
    // Use per-frame gradient (still needed for varying x positions)
    const dark = golden ? PIPE_GOLD_DARK : PIPE_GREEN_DARK;
    const light = golden ? PIPE_GOLD_LIGHT : PIPE_GREEN_LIGHT;
    const mid = golden ? PIPE_GOLD : PIPE_GREEN;
    const edge = golden ? '#997A1A' : '#3E7B1E';

    const pipeGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    pipeGrad.addColorStop(0, dark);
    pipeGrad.addColorStop(0.15, light);
    pipeGrad.addColorStop(0.4, mid);
    pipeGrad.addColorStop(0.85, dark);
    pipeGrad.addColorStop(1, edge);
    ctx.fillStyle = pipeGrad;
    ctx.fillRect(x, y, w, h);

    // Highlights
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 6, y, 8, h);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x + w - 8, y, 8, h);
  }

  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawPipeCap(ctx, x, y, w, h, golden = false) {
  const border = golden ? PIPE_GOLD_BORDER : PIPE_BORDER;
  const quality = getQualityLevel();

  if (quality === 'low') {
    ctx.fillStyle = golden ? PIPE_GOLD_LIGHT : PIPE_GREEN_LIGHT;
    ctx.fillRect(x, y, w, h);
  } else {
    const mid = golden ? PIPE_GOLD : PIPE_GREEN;
    const light = golden ? PIPE_GOLD_LIGHT : PIPE_GREEN_LIGHT;
    const dark = golden ? PIPE_GOLD_DARK : PIPE_GREEN_DARK;
    const edgeStart = golden ? '#997A1A' : '#3E7B1E';
    const edgeEnd = golden ? '#806515' : '#2D5E15';

    const capGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    capGrad.addColorStop(0, edgeStart);
    capGrad.addColorStop(0.15, mid);
    capGrad.addColorStop(0.4, light);
    capGrad.addColorStop(0.85, dark);
    capGrad.addColorStop(1, edgeEnd);
    ctx.fillStyle = capGrad;
    ctx.fillRect(x, y, w, h);
  }

  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

// ============================================================
// GATE
// ============================================================
export function drawGate(ctx, gate, H, GROUND_HEIGHT, GATE_WIDTH, PASSAGE_HEIGHT, WALL_THICKNESS) {
  const { x, topPassageY, question, passed, result } = gate;
  const golden = gate.golden || false;
  const capH = 10;
  const capExtra = 12;

  if (golden) {
    const gapCenter = topPassageY + PASSAGE_HEIGHT;
    const gapHalf = PASSAGE_HEIGHT;
    const gapTop = gapCenter - gapHalf / 2;
    const gapBottom = gapCenter + gapHalf / 2;
    const groundY = H - GROUND_HEIGHT;

    if (gapTop > 0) {
      drawPipeSection(ctx, x, 0, GATE_WIDTH, gapTop - capH, true);
      drawPipeCap(ctx, x - capExtra / 2, gapTop - capH, GATE_WIDTH + capExtra, capH, true);
    }

    if (gapBottom < groundY) {
      drawPipeCap(ctx, x - capExtra / 2, gapBottom, GATE_WIDTH + capExtra, capH, true);
      drawPipeSection(ctx, x, gapBottom + capH, GATE_WIDTH, groundY - gapBottom - capH, true);
    }

    if (!passed) {
      ctx.fillStyle = 'rgba(255,215,0,0.08)';
      ctx.fillRect(x, gapTop, GATE_WIDTH, gapBottom - gapTop);

      ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.004) * 0.3;
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.fillText('\u2B50', x + GATE_WIDTH / 2, gapCenter);
      ctx.globalAlpha = 1;
    }

    if (question && !passed) {
      const halfGap = (gapBottom - gapTop) / 2;
      drawAnswerBadge(ctx, x, gapTop, GATE_WIDTH, halfGap, 'A', question.a);
      drawAnswerBadge(ctx, x, gapTop + halfGap, GATE_WIDTH, halfGap, 'B', question.b);
    }

    if (result) {
      const gapHalfH = (gapBottom - gapTop) / 2;
      const passageY = result.chose === 'a' ? gapTop : gapTop + gapHalfH;
      const color = result.correct ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)';
      ctx.fillStyle = color;
      ctx.fillRect(x, passageY, GATE_WIDTH, gapHalfH);
    }
    return;
  }

  // Normal gate
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

// ============================================================
// ANSWER BADGE — cached measureText width
// ============================================================
const textWidthCache = new Map();

function getCachedTextWidth(ctx, text, font) {
  const key = font + '|' + text;
  if (textWidthCache.has(key)) return textWidthCache.get(key);
  ctx.font = font;
  const w = ctx.measureText(text).width;
  textWidthCache.set(key, w);
  // Limit cache size
  if (textWidthCache.size > 200) {
    const firstKey = textWidthCache.keys().next().value;
    textWidthCache.delete(firstKey);
  }
  return w;
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
  let font = `bold ${fontSize}px Arial, sans-serif`;
  let measured = getCachedTextWidth(ctx, text, font);
  while (measured > maxTextW && fontSize > 8) {
    fontSize -= 1;
    font = `bold ${fontSize}px Arial, sans-serif`;
    measured = getCachedTextWidth(ctx, text, font);
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
  if (getQualityLevel() !== 'low') {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(cx - size * 0.25, cy - size * 0.4, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
