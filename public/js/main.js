import { phase1Questions, phase2Questions, phase3Scenarios } from './data/questions.js';

// ============================================================
// CONFIG
// ============================================================
const GRAVITY = 0.45;
const JUMP_FORCE = -7.5;
const PIPE_SPEED = 2.5;
const PIPE_GAP = 160;
const PIPE_WIDTH = 70;
const PIPE_SPACING = 280;
const BIRD_SIZE = 30;
const GROUND_HEIGHT = 80;
const MAX_LIVES = 3;

// Colors (Flappy Bird palette)
const SKY_TOP = '#4EC0CA';
const SKY_BOTTOM = '#E8F5E9';
const PIPE_GREEN = '#73BF2E';
const PIPE_GREEN_DARK = '#558B2F';
const PIPE_BORDER = '#2E7D32';
const GROUND_COLOR = '#DED895';
const GROUND_DARK = '#C8B95A';
const BIRD_YELLOW = '#F7DC6F';
const BIRD_ORANGE = '#F39C12';
const BIRD_RED = '#E74C3C';
const BIRD_EYE = '#FFFFFF';
const TEXT_WHITE = '#FFFFFF';
const TEXT_SHADOW = 'rgba(0,0,0,0.4)';

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
  scene: 'menu', // menu, phase1, phase2, phase3, gameover, leadform
  bird: { x: 80, y: 0, vel: 0, rotation: 0, flapFrame: 0 },
  pipes: [],
  lives: MAX_LIVES,
  score: 0,
  questionIndex: 0,
  currentQuestion: null,
  showingAnswer: false,
  answerTimer: 0,
  answerCorrect: false,
  groundOffset: 0,
  // Phase 2
  p2Index: 0,
  p2Selected: -1,
  p2ShowResult: false,
  p2Timer: 0,
  // Phase 3
  balance: 1000,
  chartPoints: [],
  chartScroll: 0,
  p3Scenario: 0,
  p3Choice: null,
  p3ShowResult: false,
  p3Timer: 0,
  p3TradeCount: 0,
  // Qualify data
  qualifyAnswers: {},
  // Animation
  frameCount: 0,
  lastTime: 0,
};

function resetBird() {
  state.bird = { x: 80, y: H * 0.4, vel: 0, rotation: 0, flapFrame: 0 };
}

function resetPhase1() {
  state.scene = 'phase1';
  state.pipes = [];
  state.lives = MAX_LIVES;
  state.score = 0;
  state.questionIndex = 0;
  state.currentQuestion = null;
  state.showingAnswer = false;
  state.qualifyAnswers = {};
  resetBird();
  spawnPipe();
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
    ctx.lineWidth = size / 8;
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
// DRAW SKY + GROUND (Flappy Bird style)
// ============================================================
function drawBackground() {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_HEIGHT);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, '#87CEEB');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);

  // Clouds (simple)
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  const cloudOffset = (state.frameCount * 0.3) % (W + 200);
  for (let i = 0; i < 3; i++) {
    const cx = ((i * 300 + 100) - cloudOffset + W + 200) % (W + 200) - 100;
    const cy = 60 + i * 50;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.arc(cx + 25, cy - 10, 25, 0, Math.PI * 2);
    ctx.arc(cx + 50, cy, 28, 0, Math.PI * 2);
    ctx.arc(cx + 25, cy + 5, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground
  const groundY = H - GROUND_HEIGHT;
  ctx.fillStyle = GROUND_COLOR;
  ctx.fillRect(0, groundY, W, GROUND_HEIGHT);
  ctx.fillStyle = GROUND_DARK;
  ctx.fillRect(0, groundY, W, 4);

  // Ground stripes
  ctx.fillStyle = GROUND_DARK;
  const gOff = state.groundOffset % 24;
  for (let x = -gOff; x < W + 24; x += 24) {
    ctx.fillRect(x, groundY + 8, 16, 4);
  }
}

// ============================================================
// DRAW BIRD (Flappy Bird style)
// ============================================================
function drawBird() {
  const { x, y, rotation, flapFrame } = state.bird;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Body
  const wingY = Math.sin(flapFrame * 0.3) * 4;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath();
  ctx.ellipse(2, 2, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body shape
  ctx.fillStyle = BIRD_YELLOW;
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

  // Eye (white circle + black pupil)
  ctx.fillStyle = BIRD_EYE;
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
// DRAW PIPES WITH QUESTIONS
// ============================================================
function drawPipe(pipe) {
  const { x, gapY, question, passed } = pipe;
  const topH = gapY - PIPE_GAP / 2;
  const botY = gapY + PIPE_GAP / 2;
  const botH = H - GROUND_HEIGHT - botY;
  const capH = 26;
  const capW = PIPE_WIDTH + 12;
  const capX = x - 6;

  // Top pipe body
  ctx.fillStyle = PIPE_GREEN;
  ctx.fillRect(x, 0, PIPE_WIDTH, topH);
  ctx.strokeStyle = PIPE_BORDER;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, 0, PIPE_WIDTH, topH);

  // Top pipe highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 8, 0, 12, topH);

  // Top cap
  ctx.fillStyle = PIPE_GREEN;
  ctx.fillRect(capX, topH - capH, capW, capH);
  ctx.strokeStyle = PIPE_BORDER;
  ctx.strokeRect(capX, topH - capH, capW, capH);
  ctx.fillStyle = PIPE_GREEN_DARK;
  ctx.fillRect(capX, topH - capH, capW, 5);

  // Bottom pipe body
  ctx.fillStyle = PIPE_GREEN;
  ctx.fillRect(x, botY, PIPE_WIDTH, botH);
  ctx.strokeStyle = PIPE_BORDER;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, botY, PIPE_WIDTH, botH);

  // Bottom highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 8, botY, 12, botH);

  // Bottom cap
  ctx.fillStyle = PIPE_GREEN;
  ctx.fillRect(capX, botY, capW, capH);
  ctx.strokeStyle = PIPE_BORDER;
  ctx.strokeRect(capX, botY, capW, capH);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(capX, botY, capW, 5);

  // Question labels on pipes
  if (question && !passed) {
    const q = question;
    // Answer A on top pipe
    drawText(q.a, x + PIPE_WIDTH / 2, topH - capH - 20, 14, TEXT_WHITE);
    // Answer B on bottom pipe
    drawText(q.b, x + PIPE_WIDTH / 2, botY + capH + 20, 14, TEXT_WHITE);
  }
}

function drawQuestionBanner() {
  if (!state.currentQuestion || state.showingAnswer) return;
  const q = state.currentQuestion;
  // Banner at top
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  drawRoundRect(20, 20, W - 40, 60, 12, 'rgba(0,0,0,0.7)');
  drawText(q.q, W / 2, 50, 16, TEXT_WHITE);
}

// ============================================================
// DRAW HUD (lives + score)
// ============================================================
function drawHUD() {
  // Hearts
  for (let i = 0; i < MAX_LIVES; i++) {
    const hx = 20 + i * 36;
    const hy = 95;
    ctx.font = '28px Arial';
    ctx.fillText(i < state.lives ? '❤️' : '🤍', hx, hy);
  }
  // Score
  drawText(String(state.score), W / 2, 130, 40, TEXT_WHITE);
}

// ============================================================
// ANSWER FEEDBACK
// ============================================================
function drawAnswerFeedback() {
  if (!state.showingAnswer) return;
  const text = state.answerCorrect ? '✅ CERTO!' : '❌ ERRADO!';
  const color = state.answerCorrect ? '#4CAF50' : '#F44336';
  drawRoundRect(W / 2 - 80, H / 2 - 40, 160, 80, 16, color);
  drawText(text, W / 2, H / 2, 24, TEXT_WHITE);
}

// ============================================================
// PIPE LOGIC
// ============================================================
function spawnPipe() {
  const minY = 120 + PIPE_GAP / 2;
  const maxY = H - GROUND_HEIGHT - 120 - PIPE_GAP / 2;
  const gapY = minY + Math.random() * (maxY - minY);

  let question = null;
  if (state.questionIndex < phase1Questions.length) {
    question = phase1Questions[state.questionIndex];
    state.currentQuestion = question;
  }

  const lastPipe = state.pipes[state.pipes.length - 1];
  const startX = lastPipe ? Math.max(W + 50, lastPipe.x + PIPE_SPACING) : W + 100;

  state.pipes.push({ x: startX, gapY, question, passed: false, scored: false });
}

function checkPipeCollision(pipe) {
  const { x: bx, y: by } = state.bird;
  const r = BIRD_SIZE / 2 - 4;
  const topH = pipe.gapY - PIPE_GAP / 2;
  const botY = pipe.gapY + PIPE_GAP / 2;

  // Check if bird is within pipe x range
  if (bx + r > pipe.x && bx - r < pipe.x + PIPE_WIDTH) {
    // Hit top pipe
    if (by - r < topH) return true;
    // Hit bottom pipe
    if (by + r > botY) return true;
  }
  return false;
}

function handlePipePass(pipe) {
  if (pipe.passed || pipe.scored) return;
  const bx = state.bird.x;
  if (bx > pipe.x + PIPE_WIDTH / 2 && !pipe.scored) {
    pipe.scored = true;
    if (!pipe.question) {
      state.score++;
      return;
    }

    // Determine which answer bird chose (top = a, bottom = b)
    const birdInTop = state.bird.y < pipe.gapY;
    const chose = birdInTop ? 'a' : 'b';
    const correct = chose === pipe.question.correct;

    // Store qualifying answers
    if (pipe.question.qualifying) {
      state.qualifyAnswers[pipe.question.q] = chose === 'a' ? pipe.question.a : pipe.question.b;
    }

    if (correct) {
      state.score += 10;
      state.answerCorrect = true;
      // Restore life on 3 correct in a row
      if (state.score % 30 === 0 && state.lives < MAX_LIVES) {
        state.lives++;
      }
    } else {
      state.lives--;
      state.answerCorrect = false;
    }

    state.showingAnswer = true;
    state.answerTimer = 40;
    pipe.passed = true;
    state.questionIndex++;

    if (state.questionIndex < phase1Questions.length) {
      state.currentQuestion = phase1Questions[state.questionIndex];
    }
  }
}

// ============================================================
// PHASE 2: FINANCIAL QUIZ (fullscreen)
// ============================================================
function drawPhase2() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  const q = phase2Questions[state.p2Index];
  if (!q) {
    startPhase3();
    return;
  }

  // Progress
  drawText(`Pergunta ${state.p2Index + 1}/${phase2Questions.length}`, W / 2, 50, 18, '#aaa');
  drawText('💰 QUIZ FINANCEIRO', W / 2, 90, 24, '#F7DC6F');

  // Question
  const lines = q.q.split('\n');
  lines.forEach((line, i) => {
    drawText(line, W / 2, 150 + i * 30, 20, TEXT_WHITE);
  });

  // Options
  const optY = 230;
  q.options.forEach((opt, i) => {
    const y = optY + i * 65;
    let bg = '#2a2a4e';
    if (state.p2ShowResult) {
      if (i === q.correct) bg = '#4CAF50';
      else if (i === state.p2Selected) bg = '#F44336';
    } else if (i === state.p2Selected) {
      bg = '#3a3a6e';
    }
    drawRoundRect(30, y, W - 60, 50, 12, bg, '#555');
    drawText(opt, W / 2, y + 25, 16, TEXT_WHITE);
  });

  // Score
  drawText(`Pontuação: ${state.score}`, W / 2, H - 40, 16, '#aaa');
}

function handlePhase2Tap(tx, ty) {
  if (state.p2ShowResult) return;
  const optY = 230;
  for (let i = 0; i < phase2Questions[state.p2Index].options.length; i++) {
    const y = optY + i * 65;
    if (tx > 30 && tx < W - 30 && ty > y && ty < y + 50) {
      state.p2Selected = i;
      state.p2ShowResult = true;
      if (i === phase2Questions[state.p2Index].correct) {
        state.score += 20;
      }
      state.p2Timer = 50;
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
  state.p3Scenario = 0;
  state.p3Choice = null;
  state.p3ShowResult = false;
  resetBird();
  state.pipes = [];

  // Generate chart-like pipes (green = up zone, red = down zone)
  generateTradePipes();
}

function generateTradePipes() {
  for (let i = 0; i < phase3Scenarios.length; i++) {
    const minY = 120 + PIPE_GAP / 2;
    const maxY = H - GROUND_HEIGHT - 120 - PIPE_GAP / 2;
    const gapY = minY + Math.random() * (maxY - minY);
    state.pipes.push({
      x: W + 100 + i * PIPE_SPACING,
      gapY,
      scenario: phase3Scenarios[i],
      passed: false,
      scored: false,
    });
  }
}

function drawPhase3HUD() {
  // Balance
  drawRoundRect(W / 2 - 80, 85, 160, 40, 10, 'rgba(0,0,0,0.6)');
  drawText(`$${state.balance.toLocaleString()}`, W / 2, 105, 20, '#4CAF50');

  // Scenario hint
  if (state.pipes.length > 0) {
    const nextPipe = state.pipes.find(p => !p.passed);
    if (nextPipe?.scenario) {
      drawRoundRect(15, 20, W - 30, 55, 12, 'rgba(0,0,0,0.7)');
      drawText(nextPipe.scenario.hint, W / 2, 36, 13, TEXT_WHITE);
      drawText('⬆️ BUY (em cima)  ⬇️ SELL (em baixo)', W / 2, 58, 11, '#aaa');
    }
  }
}

function handleTradePass(pipe) {
  if (pipe.passed || pipe.scored || !pipe.scenario) return;
  const bx = state.bird.x;
  if (bx > pipe.x + PIPE_WIDTH / 2) {
    pipe.scored = true;
    pipe.passed = true;

    const birdInTop = state.bird.y < pipe.gapY;
    const chose = birdInTop ? 'up' : 'down';
    const correct = chose === pipe.scenario.direction;

    if (correct) {
      const gain = 100 + Math.floor(Math.random() * 200);
      state.balance += gain;
      state.score += 15;
      state.answerCorrect = true;
    } else {
      const loss = 50 + Math.floor(Math.random() * 100);
      state.balance = Math.max(0, state.balance - loss);
      state.answerCorrect = false;
    }

    state.showingAnswer = true;
    state.answerTimer = 35;
    state.p3TradeCount++;

    // Check if all trades done
    if (state.p3TradeCount >= phase3Scenarios.length) {
      setTimeout(() => {
        state.scene = 'leadform';
        showLeadForm();
      }, 1500);
    }
  }
}

// ============================================================
// LEAD FORM
// ============================================================
function showLeadForm() {
  const form = document.getElementById('lead-form');
  const balanceEl = document.getElementById('form-balance');
  balanceEl.textContent = `Seu saldo: $${state.balance.toLocaleString()} 🤑`;
  form.classList.remove('hidden');
}

document.getElementById('capture-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = {
    name: fd.get('name'),
    phone: fd.get('phone'),
    email: fd.get('email'),
    score: state.score,
    balance: state.balance,
    phase: 3,
    answers: state.qualifyAnswers,
  };

  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error('Lead submit error:', err);
  }

  e.target.innerHTML = '<p style="font-size:24px;padding:20px;">✅ Enviado!<br><br>Entraremos em contato em breve!</p>';
});

// ============================================================
// GAME OVER / SHARE
// ============================================================
function showGameOver() {
  state.scene = 'gameover';
  const overlay = document.getElementById('share-overlay');
  const scoreEl = document.getElementById('share-score');
  scoreEl.textContent = `Pontuação: ${state.score} | Fase: ${state.questionIndex + 1}`;
  overlay.classList.remove('hidden');
}

document.getElementById('btn-retry')?.addEventListener('click', () => {
  document.getElementById('share-overlay').classList.add('hidden');
  resetPhase1();
});

document.getElementById('btn-share')?.addEventListener('click', () => {
  const text = `🐦 Eu cheguei na fase ${state.questionIndex + 1} no Flappy Quiz! Pontuação: ${state.score}. Aposto que você não consegue! 😏`;
  if (navigator.share) {
    navigator.share({ title: 'Flappy Quiz', text, url: window.location.href }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text + ' ' + window.location.href);
    alert('Link copiado!');
  }
});

// ============================================================
// INPUT
// ============================================================
function handleTap(tx, ty) {
  if (state.scene === 'menu') {
    resetPhase1();
    return;
  }
  if (state.scene === 'phase2') {
    handlePhase2Tap(tx, ty);
    return;
  }
  if (state.scene === 'phase1' || state.scene === 'phase3') {
    if (!state.showingAnswer) {
      state.bird.vel = JUMP_FORCE;
    }
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleTap(e.clientX, e.clientY);
});
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    handleTap(W / 2, H / 2);
  }
});

// ============================================================
// MENU SCENE
// ============================================================
function drawMenu() {
  drawBackground();

  // Title
  drawText('FLAPPY', W / 2, H * 0.25, 48, BIRD_YELLOW);
  drawText('QUIZ', W / 2, H * 0.25 + 55, 48, TEXT_WHITE);

  // Animated bird
  const menuBirdY = H * 0.48 + Math.sin(state.frameCount * 0.05) * 15;
  const saveBird = { ...state.bird };
  state.bird.x = W / 2;
  state.bird.y = menuBirdY;
  state.bird.rotation = 0;
  state.bird.flapFrame = state.frameCount;
  drawBird();
  state.bird = saveBird;

  // Play button
  drawRoundRect(W / 2 - 70, H * 0.63, 140, 50, 14, '#FF6B35');
  drawText('▶ JOGAR', W / 2, H * 0.63 + 25, 22, TEXT_WHITE);

  // Subtitle
  drawText('Toque para começar', W / 2, H * 0.78, 16, 'rgba(255,255,255,0.7)');
}

// ============================================================
// UPDATE & RENDER LOOP
// ============================================================
function update() {
  state.frameCount++;

  if (state.scene === 'phase1' || state.scene === 'phase3') {
    // Bird physics
    state.bird.vel += GRAVITY;
    state.bird.y += state.bird.vel;
    state.bird.rotation = Math.min(state.bird.vel * 0.06, Math.PI / 4);
    state.bird.flapFrame++;

    // Ground scroll
    state.groundOffset += PIPE_SPEED;

    // Ground collision
    if (state.bird.y > H - GROUND_HEIGHT - BIRD_SIZE / 2) {
      state.bird.y = H - GROUND_HEIGHT - BIRD_SIZE / 2;
      state.bird.vel = 0;
      state.lives--;
      if (state.lives <= 0) { showGameOver(); return; }
    }
    // Ceiling
    if (state.bird.y < BIRD_SIZE / 2) {
      state.bird.y = BIRD_SIZE / 2;
      state.bird.vel = 0;
    }

    // Answer feedback timer
    if (state.showingAnswer) {
      state.answerTimer--;
      if (state.answerTimer <= 0) {
        state.showingAnswer = false;
      }
    }

    // Move pipes
    for (const pipe of state.pipes) {
      pipe.x -= PIPE_SPEED;
    }
    // Remove offscreen pipes
    state.pipes = state.pipes.filter(p => p.x > -PIPE_WIDTH - 20);

    // Collision & scoring
    for (const pipe of state.pipes) {
      if (checkPipeCollision(pipe)) {
        state.lives--;
        if (state.lives <= 0) { showGameOver(); return; }
        // Push bird away
        state.bird.vel = JUMP_FORCE * 0.5;
        pipe.passed = true;
        break;
      }
      if (state.scene === 'phase1') {
        handlePipePass(pipe);
      } else {
        handleTradePass(pipe);
      }
    }

    // Spawn new pipes (phase 1)
    if (state.scene === 'phase1') {
      const lastPipe = state.pipes[state.pipes.length - 1];
      if (!lastPipe || lastPipe.x < W - PIPE_SPACING) {
        if (state.questionIndex < phase1Questions.length) {
          spawnPipe();
        } else if (state.pipes.every(p => p.passed || p.x < state.bird.x - 50)) {
          // All phase 1 questions done → phase 2
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
      if (state.p2Index >= phase2Questions.length) {
        startPhase3();
      }
    }
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);

  if (state.scene === 'menu') {
    drawMenu();
    return;
  }

  if (state.scene === 'phase2') {
    drawPhase2();
    return;
  }

  if (state.scene === 'phase1' || state.scene === 'phase3') {
    drawBackground();

    // Pipes
    for (const pipe of state.pipes) {
      drawPipe(pipe);
    }

    // Bird
    drawBird();

    // HUD
    drawHUD();

    // Question banner (phase 1)
    if (state.scene === 'phase1') {
      drawQuestionBanner();
    }

    // Phase 3 HUD
    if (state.scene === 'phase3') {
      drawPhase3HUD();
    }

    // Answer feedback
    drawAnswerFeedback();
  }
}

function gameLoop(timestamp) {
  const delta = timestamp - state.lastTime;
  state.lastTime = timestamp;

  if (state.scene !== 'gameover' && state.scene !== 'leadform') {
    update();
    render();
  } else if (state.scene === 'leadform') {
    render();
  }

  requestAnimationFrame(gameLoop);
}

// ============================================================
// START
// ============================================================
requestAnimationFrame(gameLoop);
