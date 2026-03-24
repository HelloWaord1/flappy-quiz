import { phase1Questions, phase2Questions, phase3Scenarios } from './data/questions.js';

// ============================================================
// CONFIG
// ============================================================
const GRAVITY = 0.35;
const JUMP_FORCE = -6.5;
const SCROLL_SPEED = 2;
const BIRD_SIZE = 28;
const GROUND_HEIGHT = 70;
const MAX_LIVES = 3;
const GATE_WIDTH = 100;       // width of the gate obstacle
const GATE_SPACING = 360;     // distance between gates (more room)
const PASSAGE_HEIGHT = 130;   // height of each answer passage (WIDER!)
const WALL_THICKNESS = 25;    // wall between two passages
const HEART_SIZE = 22;        // collectible heart size

// Colors (Flappy Bird palette)
const SKY_TOP = '#4EC0CA';
const PIPE_GREEN = '#73BF2E';
const PIPE_GREEN_DARK = '#558B2F';
const PIPE_BORDER = '#2E7D32';
const GROUND_COLOR = '#DED895';
const GROUND_DARK = '#C8B95A';
const BIRD_YELLOW = '#F7DC6F';
const BIRD_ORANGE = '#F39C12';
const BIRD_RED = '#E74C3C';
const TEXT_WHITE = '#FFFFFF';
const TEXT_SHADOW = 'rgba(0,0,0,0.4)';
const CORRECT_COLOR = '#4CAF50';
const WRONG_COLOR = '#F44336';

// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let W, H, scale;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  scale = window.devicePixelRatio || 1;
  canvas.width = W * scale;
  canvas.height = H * scale;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}
resize();
window.addEventListener('resize', resize);

// ============================================================
// GAME STATE
// ============================================================
let state = {
  scene: 'menu',
  bird: { x: 70, y: 0, vel: 0, rotation: 0, flapFrame: 0 },
  gates: [],
  lives: MAX_LIVES,
  score: 0,
  questionIndex: 0,
  showingFeedback: false,
  feedbackTimer: 0,
  feedbackCorrect: false,
  feedbackText: '',
  groundOffset: 0,
  correctStreak: 0,
  // Damage effects
  hurtTimer: 0,          // bird blink frames remaining
  shakeTimer: 0,         // screen shake frames remaining
  shakeIntensity: 0,
  invincible: false,
  invincibleTimer: 0,
  // Heart pickups
  hearts: [],            // floating collectible hearts
  // Phase 2
  p2Index: 0,
  p2Selected: -1,
  p2ShowResult: false,
  p2Timer: 0,
  // Phase 3
  balance: 1000,
  p3TradeCount: 0,
  // Qualify
  qualifyAnswers: {},
  frameCount: 0,
  lastTime: 0,
  flashAlpha: 0,
  flashColor: '',
};

function resetBird() {
  state.bird = { x: 70, y: H * 0.4, vel: 0, rotation: 0, flapFrame: 0 };
}

function resetPhase1() {
  state.scene = 'phase1';
  state.gates = [];
  state.lives = MAX_LIVES;
  state.score = 0;
  state.questionIndex = 0;
  state.showingFeedback = false;
  state.correctStreak = 0;
  state.qualifyAnswers = {};
  state.hurtTimer = 0;
  state.shakeTimer = 0;
  state.invincible = false;
  state.invincibleTimer = 0;
  state.hearts = [];
  resetBird();
  spawnGate();
}

// ============================================================
// DRAWING HELPERS
// ============================================================
function drawText(text, x, y, size, color, align = 'center', stroke = true) {
  ctx.font = `bold ${size}px Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (stroke) {
    ctx.strokeStyle = TEXT_SHADOW;
    ctx.lineWidth = Math.max(size / 7, 2);
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawRoundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
}

// ============================================================
// DRAW BACKGROUND
// ============================================================
function drawBackground() {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_HEIGHT);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, '#87CEEB');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  const co = (state.frameCount * 0.3) % (W + 300);
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 250 + 80) - co + W + 300) % (W + 300) - 100;
    const cy = 50 + i * 45;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.arc(cx + 22, cy - 10, 22, 0, Math.PI * 2);
    ctx.arc(cx + 44, cy, 26, 0, Math.PI * 2);
    ctx.arc(cx + 22, cy + 6, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground
  const gy = H - GROUND_HEIGHT;
  ctx.fillStyle = GROUND_COLOR;
  ctx.fillRect(0, gy, W, GROUND_HEIGHT);
  ctx.fillStyle = GROUND_DARK;
  ctx.fillRect(0, gy, W, 3);
  const gOff = state.groundOffset % 24;
  for (let x = -gOff; x < W + 24; x += 24) {
    ctx.fillRect(x, gy + 10, 16, 3);
  }
}

// ============================================================
// DRAW BIRD
// ============================================================
function drawBird() {
  const { x, y, rotation, flapFrame } = state.bird;

  // Blink effect when hurt — skip drawing every other frame
  if (state.hurtTimer > 0 && Math.floor(state.hurtTimer / 3) % 2 === 0) {
    return; // invisible frame = blink
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const wingY = Math.sin(flapFrame * 0.3) * 4;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath();
  ctx.ellipse(2, 2, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body — flash red when hurt
  ctx.fillStyle = state.hurtTimer > 0 ? '#FF6B6B' : BIRD_YELLOW;
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = BIRD_ORANGE;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Wing
  ctx.fillStyle = BIRD_ORANGE;
  ctx.beginPath();
  ctx.ellipse(-4, wingY + 2, 10, 6, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(8, -5, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(10, -5, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = BIRD_RED;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(24, 3);
  ctx.lineTo(14, 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ============================================================
// GATE DRAWING — Two passages with wall between
// ============================================================
// Gate structure:
//   [solid top wall from 0 to topPassageY]
//   [TOP PASSAGE: answer A label] height = PASSAGE_HEIGHT
//   [MIDDLE WALL] height = WALL_THICKNESS
//   [BOTTOM PASSAGE: answer B label] height = PASSAGE_HEIGHT
//   [solid bottom wall to ground]

function drawGate(gate) {
  const { x, topPassageY, question, passed, result } = gate;
  const capH = 8;
  const capExtra = 10;

  const topWallBottom = topPassageY;
  const midWallTop = topPassageY + PASSAGE_HEIGHT;
  const midWallBottom = midWallTop + WALL_THICKNESS;
  const botPassageBottom = midWallBottom + PASSAGE_HEIGHT;
  const groundY = H - GROUND_HEIGHT;

  // === Top solid wall (from ceiling to top passage) ===
  if (topWallBottom > 0) {
    ctx.fillStyle = PIPE_GREEN;
    ctx.fillRect(x, 0, GATE_WIDTH, topWallBottom);
    ctx.strokeStyle = PIPE_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 0, GATE_WIDTH, topWallBottom);
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 8, 0, 10, topWallBottom);
    // Cap
    ctx.fillStyle = PIPE_GREEN_DARK;
    ctx.fillRect(x - capExtra / 2, topWallBottom - capH, GATE_WIDTH + capExtra, capH);
    ctx.strokeStyle = PIPE_BORDER;
    ctx.strokeRect(x - capExtra / 2, topWallBottom - capH, GATE_WIDTH + capExtra, capH);
  }

  // === Middle wall (between two passages) ===
  ctx.fillStyle = PIPE_GREEN;
  ctx.fillRect(x, midWallTop, GATE_WIDTH, WALL_THICKNESS);
  ctx.strokeStyle = PIPE_BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, midWallTop, GATE_WIDTH, WALL_THICKNESS);
  // Caps on middle wall
  ctx.fillStyle = PIPE_GREEN_DARK;
  ctx.fillRect(x - capExtra / 2, midWallTop, GATE_WIDTH + capExtra, capH);
  ctx.fillRect(x - capExtra / 2, midWallBottom - capH, GATE_WIDTH + capExtra, capH);
  ctx.strokeRect(x - capExtra / 2, midWallTop, GATE_WIDTH + capExtra, capH);
  ctx.strokeRect(x - capExtra / 2, midWallBottom - capH, GATE_WIDTH + capExtra, capH);

  // === Bottom solid wall (from bottom passage to ground) ===
  if (botPassageBottom < groundY) {
    ctx.fillStyle = PIPE_GREEN;
    ctx.fillRect(x, botPassageBottom, GATE_WIDTH, groundY - botPassageBottom);
    ctx.strokeStyle = PIPE_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, botPassageBottom, GATE_WIDTH, groundY - botPassageBottom);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 8, botPassageBottom, 10, groundY - botPassageBottom);
    // Cap
    ctx.fillStyle = PIPE_GREEN_DARK;
    ctx.fillRect(x - capExtra / 2, botPassageBottom, GATE_WIDTH + capExtra, capH);
    ctx.strokeRect(x - capExtra / 2, botPassageBottom, GATE_WIDTH + capExtra, capH);
  }

  // === Answer labels in passages ===
  if (question && !passed) {
    // Passage backgrounds (subtle tint)
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, topPassageY, GATE_WIDTH, PASSAGE_HEIGHT);
    ctx.fillRect(x, midWallBottom, GATE_WIDTH, PASSAGE_HEIGHT);

    // Answer A (top passage)
    const topCenter = topPassageY + PASSAGE_HEIGHT / 2;
    drawText(question.a, x + GATE_WIDTH / 2, topCenter, 14, TEXT_WHITE);

    // Answer B (bottom passage)
    const botCenter = midWallBottom + PASSAGE_HEIGHT / 2;
    drawText(question.b, x + GATE_WIDTH / 2, botCenter, 14, TEXT_WHITE);
  }

  // === Show result highlight after passing ===
  if (result) {
    const passageY = result.chose === 'a'
      ? topPassageY
      : midWallBottom;
    const color = result.correct ? 'rgba(76,175,80,0.35)' : 'rgba(244,67,54,0.35)';
    ctx.fillStyle = color;
    ctx.fillRect(x, passageY, GATE_WIDTH, PASSAGE_HEIGHT);
  }
}

// ============================================================
// QUESTION BANNER
// ============================================================
function drawQuestionBanner() {
  const qi = state.questionIndex;
  const q = qi < phase1Questions.length ? phase1Questions[qi] : null;
  if (!q) return;

  // Big visible banner at top
  const bannerH = 65;
  drawRoundRect(10, 8, W - 20, bannerH, 14, 'rgba(0,0,0,0.85)');

  // Question number
  drawText(`${qi + 1}/${phase1Questions.length}`, 40, 20, 11, '#aaa', 'center', false);

  // Question text — big and bold
  const lines = q.q.split('\n');
  if (lines.length === 1) {
    drawText(q.q, W / 2, 45, 18, '#F7DC6F');
  } else {
    drawText(lines[0], W / 2, 35, 16, '#F7DC6F');
    drawText(lines[1], W / 2, 55, 16, '#F7DC6F');
  }
}

// ============================================================
// HUD
// ============================================================
function drawHUD() {
  // Hearts
  for (let i = 0; i < MAX_LIVES; i++) {
    const hx = 20 + i * 34;
    ctx.font = '26px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(i < state.lives ? '❤️' : '🤍', hx, 90);
  }
  // Score
  drawText(String(state.score), W - 50, 88, 32, TEXT_WHITE);
}

// ============================================================
// FEEDBACK FLASH
// ============================================================
function drawFeedback() {
  if (state.flashAlpha <= 0) return;
  ctx.fillStyle = state.flashColor.replace(')', `,${state.flashAlpha})`).replace('rgb', 'rgba');
  ctx.fillRect(0, 0, W, H);
}

function drawFeedbackText() {
  if (!state.showingFeedback) return;
  const text = state.feedbackCorrect ? '✅' : '❌';
  drawText(text, W / 2, H / 2, 72, TEXT_WHITE);
}

// ============================================================
// GATE LOGIC
// ============================================================
function spawnGate() {
  const q = state.questionIndex < phase1Questions.length
    ? phase1Questions[state.questionIndex]
    : null;

  // Position the two passages vertically centered-ish, with some randomness
  const totalHeight = PASSAGE_HEIGHT * 2 + WALL_THICKNESS;
  const minTop = 80;
  const maxTop = H - GROUND_HEIGHT - totalHeight - 40;
  const topPassageY = minTop + Math.random() * Math.max(maxTop - minTop, 0);

  const lastGate = state.gates[state.gates.length - 1];
  const startX = lastGate ? Math.max(W + 80, lastGate.x + GATE_SPACING) : W + 120;

  state.gates.push({
    x: startX,
    topPassageY,
    question: q,
    passed: false,
    scored: false,
    result: null,
  });
}

function checkGateCollision(gate) {
  const { x: bx, y: by } = state.bird;
  const r = BIRD_SIZE / 2 - 3;

  // Not in gate x range
  if (bx + r < gate.x || bx - r > gate.x + GATE_WIDTH) return false;

  const topWallBottom = gate.topPassageY;
  const midWallTop = gate.topPassageY + PASSAGE_HEIGHT;
  const midWallBottom = midWallTop + WALL_THICKNESS;
  const botPassageBottom = midWallBottom + PASSAGE_HEIGHT;

  // Hit top wall
  if (by - r < topWallBottom) return true;
  // Hit middle wall
  if (by + r > midWallTop && by - r < midWallBottom) return true;
  // Hit bottom wall
  if (by + r > botPassageBottom) return true;

  return false;
}

function handleGatePass(gate) {
  if (gate.scored || !gate.question) return;
  const bx = state.bird.x;

  if (bx > gate.x + GATE_WIDTH && !gate.scored) {
    gate.scored = true;
    gate.passed = true;

    // Determine which passage bird flew through
    const midWallCenter = gate.topPassageY + PASSAGE_HEIGHT + WALL_THICKNESS / 2;
    const chose = state.bird.y < midWallCenter ? 'a' : 'b';
    const correct = chose === gate.question.correct;

    gate.result = { chose, correct };

    // Store qualifying answers
    if (gate.question.qualifying) {
      const val = chose === 'a' ? gate.question.a : gate.question.b;
      state.qualifyAnswers[gate.question.q] = val;
    }

    if (correct) {
      state.score += 10;
      state.feedbackCorrect = true;
      state.correctStreak++;
      state.flashColor = 'rgb(76,175,80)';
    } else {
      state.lives--;
      state.feedbackCorrect = false;
      state.correctStreak = 0;
      state.flashColor = 'rgb(244,67,54)';
      // Blink + shake on wrong answer
      state.hurtTimer = 35;
      state.shakeTimer = 12;
      state.shakeIntensity = 8;
      state.invincible = true;
      state.invincibleTimer = 40;
      if (state.lives <= 0) {
        showGameOver();
        return;
      }
    }

    state.showingFeedback = true;
    state.feedbackTimer = 30;
    state.flashAlpha = 0.4;
    state.questionIndex++;

    // Spawn heart pickup after every 2nd question
    if (state.questionIndex % 2 === 0 && state.questionIndex < phase1Questions.length) {
      const lastGate = state.gates[state.gates.length - 1];
      if (lastGate) {
        const hx = lastGate.x + GATE_SPACING / 2; // midway between gates
        const groundY = H - GROUND_HEIGHT;
        const hy = 100 + Math.random() * (groundY - 200);
        state.hearts.push({ x: hx, y: hy, collected: false });
      }
    }
  }
}

// ============================================================
// PHASE 2: FINANCIAL QUIZ (fullscreen)
// ============================================================
function drawPhase2() {
  ctx.fillStyle = '#0f0f2e';
  ctx.fillRect(0, 0, W, H);

  const q = phase2Questions[state.p2Index];
  if (!q) { startPhase3(); return; }

  drawText(`Pergunta ${state.p2Index + 1}/${phase2Questions.length}`, W / 2, 40, 16, '#888', 'center', false);
  drawText('💰 QUIZ FINANCEIRO', W / 2, 80, 22, '#F7DC6F');

  const lines = q.q.split('\n');
  lines.forEach((line, i) => drawText(line, W / 2, 130 + i * 28, 18, TEXT_WHITE));

  const optY = 200;
  q.options.forEach((opt, i) => {
    const y = optY + i * 62;
    let bg = '#1a1a4a';
    if (state.p2ShowResult) {
      if (i === q.correct) bg = CORRECT_COLOR;
      else if (i === state.p2Selected) bg = WRONG_COLOR;
    }
    drawRoundRect(24, y, W - 48, 50, 12, bg, '#444');
    drawText(opt, W / 2, y + 25, 15, TEXT_WHITE);
  });

  drawText(`Pontuação: ${state.score}`, W / 2, H - 35, 14, '#888', 'center', false);
}

function handlePhase2Tap(tx, ty) {
  if (state.p2ShowResult) return;
  const optY = 200;
  const q = phase2Questions[state.p2Index];
  for (let i = 0; i < q.options.length; i++) {
    const y = optY + i * 62;
    if (tx > 24 && tx < W - 24 && ty > y && ty < y + 50) {
      state.p2Selected = i;
      state.p2ShowResult = true;
      if (i === q.correct) state.score += 20;
      state.p2Timer = 45;
      return;
    }
  }
}

// ============================================================
// PHASE 3: FLAPPY TRADING
// ============================================================
function startPhase3() {
  state.scene = 'phase3';
  state.balance = 1000;
  state.p3TradeCount = 0;
  state.gates = [];
  state.showingFeedback = false;
  resetBird();

  // Generate trade gates
  for (let i = 0; i < phase3Scenarios.length; i++) {
    const totalH = PASSAGE_HEIGHT * 2 + WALL_THICKNESS;
    const minTop = 80;
    const maxTop = H - GROUND_HEIGHT - totalH - 40;
    const topPassageY = minTop + Math.random() * Math.max(maxTop - minTop, 0);
    state.gates.push({
      x: W + 120 + i * GATE_SPACING,
      topPassageY,
      scenario: phase3Scenarios[i],
      question: { a: '📈 BUY', b: '📉 SELL', correct: phase3Scenarios[i].direction === 'up' ? 'a' : 'b' },
      passed: false,
      scored: false,
      result: null,
    });
  }
}

function drawPhase3HUD() {
  drawRoundRect(W / 2 - 75, 75, 150, 36, 10, 'rgba(0,0,0,0.6)');
  const balColor = state.balance >= 1000 ? '#4CAF50' : '#F44336';
  drawText(`$${state.balance.toLocaleString()}`, W / 2, 93, 18, balColor);

  const next = state.gates.find(g => !g.passed);
  if (next?.scenario) {
    drawRoundRect(12, 12, W - 24, 50, 12, 'rgba(0,0,0,0.7)');
    drawText(next.scenario.hint, W / 2, 30, 12, TEXT_WHITE);
    drawText('⬆️ BUY (cima)  ⬇️ SELL (baixo)', W / 2, 48, 11, '#aaa');
  }
}

function handleTradePass(gate) {
  if (gate.scored || !gate.scenario) return;
  if (state.bird.x > gate.x + GATE_WIDTH) {
    gate.scored = true;
    gate.passed = true;

    const midWallCenter = gate.topPassageY + PASSAGE_HEIGHT + WALL_THICKNESS / 2;
    const chose = state.bird.y < midWallCenter ? 'a' : 'b';
    const correct = (chose === 'a' && gate.scenario.direction === 'up') ||
                    (chose === 'b' && gate.scenario.direction === 'down');

    gate.result = { chose, correct };

    if (correct) {
      const gain = 100 + Math.floor(Math.random() * 200);
      state.balance += gain;
      state.score += 15;
      state.feedbackCorrect = true;
      state.flashColor = 'rgb(76,175,80)';
    } else {
      const loss = 50 + Math.floor(Math.random() * 100);
      state.balance = Math.max(0, state.balance - loss);
      state.feedbackCorrect = false;
      state.flashColor = 'rgb(244,67,54)';
    }

    state.showingFeedback = true;
    state.feedbackTimer = 25;
    state.flashAlpha = 0.3;
    state.p3TradeCount++;

    if (state.p3TradeCount >= phase3Scenarios.length) {
      setTimeout(() => { state.scene = 'leadform'; showLeadForm(); }, 1200);
    }
  }
}

// ============================================================
// LEAD FORM
// ============================================================
function showLeadForm() {
  const el = document.getElementById('lead-form');
  document.getElementById('form-balance').textContent = `Seu saldo: $${state.balance.toLocaleString()} 🤑`;
  el.classList.remove('hidden');
}

document.getElementById('capture-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = {
    name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'),
    score: state.score, balance: state.balance, phase: 3, answers: state.qualifyAnswers,
  };
  try {
    await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  } catch (err) { console.error(err); }
  e.target.innerHTML = '<p style="font-size:24px;padding:20px;">✅ Enviado!<br><br>Entraremos em contato em breve!</p>';
});

// ============================================================
// GAME OVER / SHARE
// ============================================================
function showGameOver() {
  state.scene = 'gameover';
  document.getElementById('share-score').textContent = `Pontuação: ${state.score} | Fase: ${state.questionIndex}`;
  document.getElementById('share-overlay').classList.remove('hidden');
}

document.getElementById('btn-retry')?.addEventListener('click', () => {
  document.getElementById('share-overlay').classList.add('hidden');
  resetPhase1();
});

document.getElementById('btn-share')?.addEventListener('click', () => {
  const text = `🐦 Cheguei na fase ${state.questionIndex} no Flappy Quiz! Pontuação: ${state.score}. Aposto que você não consegue! 😏`;
  if (navigator.share) {
    navigator.share({ title: 'Flappy Quiz', text, url: location.href }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text + ' ' + location.href);
    alert('Link copiado!');
  }
});

// ============================================================
// INPUT
// ============================================================
function handleTap(tx, ty) {
  if (state.scene === 'menu') { resetPhase1(); return; }
  if (state.scene === 'phase2') { handlePhase2Tap(tx, ty); return; }
  if (state.scene === 'phase1' || state.scene === 'phase3') {
    state.bird.vel = JUMP_FORCE;
  }
}

canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); handleTap(e.clientX, e.clientY); });
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); handleTap(W / 2, H / 2); }
});

// ============================================================
// MENU
// ============================================================
function drawMenu() {
  drawBackground();
  drawText('FLAPPY', W / 2, H * 0.22, 52, BIRD_YELLOW);
  drawText('QUIZ', W / 2, H * 0.22 + 58, 52, TEXT_WHITE);

  // Animated bird
  const my = H * 0.46 + Math.sin(state.frameCount * 0.05) * 12;
  const saved = { ...state.bird };
  state.bird = { x: W / 2, y: my, vel: 0, rotation: 0, flapFrame: state.frameCount };
  drawBird();
  state.bird = saved;

  drawRoundRect(W / 2 - 75, H * 0.6, 150, 52, 14, '#FF6B35');
  drawText('▶ JOGAR', W / 2, H * 0.6 + 26, 22, TEXT_WHITE);
  drawText('Toque para começar', W / 2, H * 0.75, 15, 'rgba(255,255,255,0.6)');
}

// ============================================================
// UPDATE
// ============================================================
function update() {
  state.frameCount++;

  if (state.scene === 'phase1' || state.scene === 'phase3') {
    // Bird physics
    state.bird.vel += GRAVITY;
    state.bird.y += state.bird.vel;
    state.bird.rotation = Math.min(state.bird.vel * 0.06, Math.PI / 4);
    state.bird.flapFrame++;
    state.groundOffset += SCROLL_SPEED;

    // Ground collision
    if (state.bird.y > H - GROUND_HEIGHT - BIRD_SIZE / 2) {
      state.bird.y = H - GROUND_HEIGHT - BIRD_SIZE / 2;
      state.bird.vel = 0;
    }
    // Ceiling
    if (state.bird.y < BIRD_SIZE / 2) {
      state.bird.y = BIRD_SIZE / 2;
      state.bird.vel = 0;
    }

    // Feedback timer
    if (state.showingFeedback) {
      state.feedbackTimer--;
      if (state.feedbackTimer <= 0) state.showingFeedback = false;
    }
    // Flash fade
    if (state.flashAlpha > 0) state.flashAlpha -= 0.02;

    // Hurt blink timer
    if (state.hurtTimer > 0) state.hurtTimer--;
    // Screen shake timer
    if (state.shakeTimer > 0) {
      state.shakeTimer--;
      state.shakeIntensity *= 0.92; // decay
    }
    // Invincibility timer
    if (state.invincibleTimer > 0) {
      state.invincibleTimer--;
      if (state.invincibleTimer <= 0) state.invincible = false;
    }

    // Heart pickup collision
    for (const h of state.hearts) {
      if (h.collected) continue;
      h.x -= SCROLL_SPEED;
      const dx = state.bird.x - h.x;
      const dy = state.bird.y - h.y;
      if (Math.sqrt(dx * dx + dy * dy) < BIRD_SIZE + HEART_SIZE / 2) {
        h.collected = true;
        if (state.lives < MAX_LIVES) {
          state.lives++;
          state.flashColor = 'rgb(255,105,180)';
          state.flashAlpha = 0.25;
        }
      }
    }
    state.hearts = state.hearts.filter(h => !h.collected && h.x > -30);

    // Move gates
    for (const g of state.gates) g.x -= SCROLL_SPEED;
    state.gates = state.gates.filter(g => g.x > -GATE_WIDTH - 30);

    // Collision + scoring
    for (const g of state.gates) {
      if (!g.scored && !state.invincible && checkGateCollision(g)) {
        // Hit a wall — lose life + effects
        state.lives--;
        state.flashAlpha = 0.5;
        state.flashColor = 'rgb(244,67,54)';
        state.bird.vel = JUMP_FORCE * 0.6;
        // Blink effect
        state.hurtTimer = 40;
        // Screen shake
        state.shakeTimer = 15;
        state.shakeIntensity = 10;
        // Brief invincibility so you don't die twice
        state.invincible = true;
        state.invincibleTimer = 50;

        g.scored = true;
        g.passed = true;
        state.questionIndex++;
        state.correctStreak = 0;
        if (state.lives <= 0) { showGameOver(); return; }
        break;
      }

      if (!g.scored) {
        if (state.scene === 'phase1') handleGatePass(g);
        else handleTradePass(g);
      }
    }

    // Spawn next gate (phase 1)
    if (state.scene === 'phase1') {
      const last = state.gates[state.gates.length - 1];
      if (!last || last.x < W - GATE_SPACING) {
        if (state.questionIndex < phase1Questions.length) {
          spawnGate();
        } else if (state.gates.every(g => g.passed || g.x < state.bird.x - 60)) {
          state.scene = 'phase2';
          state.p2Index = 0;
          state.p2Selected = -1;
          state.p2ShowResult = false;
        }
      }
    }
  }

  // Phase 2 timer
  if (state.scene === 'phase2' && state.p2ShowResult) {
    state.p2Timer--;
    if (state.p2Timer <= 0) {
      state.p2ShowResult = false;
      state.p2Selected = -1;
      state.p2Index++;
      if (state.p2Index >= phase2Questions.length) startPhase3();
    }
  }
}

// ============================================================
// RENDER
// ============================================================
function render() {
  ctx.clearRect(0, 0, W, H);

  if (state.scene === 'menu') { drawMenu(); return; }
  if (state.scene === 'phase2') { drawPhase2(); return; }

  if (state.scene === 'phase1' || state.scene === 'phase3' || state.scene === 'leadform') {
    // Screen shake
    if (state.shakeTimer > 0) {
      const sx = (Math.random() - 0.5) * state.shakeIntensity;
      const sy = (Math.random() - 0.5) * state.shakeIntensity;
      ctx.save();
      ctx.translate(sx, sy);
    }

    drawBackground();
    for (const g of state.gates) drawGate(g);

    // Draw collectible hearts
    for (const h of state.hearts) {
      if (!h.collected) {
        const bobY = Math.sin(state.frameCount * 0.08 + h.x) * 6;
        ctx.font = `${HEART_SIZE}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('❤️', h.x, h.y + bobY);
        // Glow
        ctx.fillStyle = 'rgba(255,80,80,0.15)';
        ctx.beginPath();
        ctx.arc(h.x, h.y + bobY, HEART_SIZE, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawBird();
    drawHUD();

    if (state.scene === 'phase1') drawQuestionBanner();
    if (state.scene === 'phase3') drawPhase3HUD();

    drawFeedbackText();
    drawFeedback();

    if (state.shakeTimer > 0) {
      ctx.restore();
    }
  }
}

function gameLoop(ts) {
  state.lastTime = ts;
  if (state.scene !== 'gameover' && state.scene !== 'leadform') {
    update();
  }
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
