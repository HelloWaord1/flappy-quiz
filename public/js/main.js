import { phase1Questions, phase2Questions, phase3Scenarios } from './data/questions.js';
import { drawParallaxBackground } from './parallax.js';
import { emitCorrectParticles, emitWrongParticles, emitHeartParticles, emitComboTrail, emitCoinParticles, emitConfetti, updateParticles, drawParticles } from './particles.js';
import { addFloatingText, updateFloatingTexts, drawFloatingTexts } from './floatingText.js';
import { drawText, drawRoundRect, drawBird, drawGate, drawCanvasHeart, updateTrail, clearTrail, drawBirdTrail } from './drawing.js';
import { playFlap, playCorrect, playWrong, playHeartPickup, playGameOver, playPhaseUnlock, playCoin, playCombo } from './sounds.js';
import { createCountdownState, startCountdown, updateCountdown, drawCountdown } from './countdown.js';
import { createTutorialState, showTutorial, dismissTutorial, updateTutorial, drawTutorial } from './tutorial.js';
import { drawProgressBar } from './progressBar.js';
import { getHighScore, saveHighScore } from './leaderboard.js';
import { shareWithImage } from './shareCard.js';
import { createBalanceAnimState, updateBalanceAnim, drawAnimatedBalance } from './balanceAnim.js';

// ============================================================
// CONFIG
// ============================================================
const GRAVITY = 0.35;
const JUMP_FORCE = -6.5;
const SCROLL_SPEED = 2;
const BIRD_SIZE = 28;
const GROUND_HEIGHT = 70;
const MAX_LIVES = 3;
const GATE_WIDTH = 100;
const GATE_SPACING = 360;
const PASSAGE_HEIGHT = 200;
const WALL_THICKNESS = 16;
const HEART_SIZE = 22;
const TEXT_WHITE = '#FFFFFF';
const CORRECT_COLOR = '#4CAF50';
const WRONG_COLOR = '#F44336';
const COIN_RADIUS = 10;
const COIN_POINTS = 5;
const COIN_COLLECT_RADIUS = 28;
const COMBO_THRESHOLDS = [
  { streak: 7, multiplier: 5, label: 'x5' },
  { streak: 5, multiplier: 3, label: 'x3' },
  { streak: 3, multiplier: 2, label: 'x2' },
];
const GOLDEN_GATE_INTERVAL = 5;
const GOLDEN_SCORE_MULTIPLIER = 3;

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
  bird: { x: 70, y: 0, vel: 0, rotation: 0, flapFrame: 0, wingIndex: 0, wingTimer: 0 },
  gates: [],
  lives: MAX_LIVES,
  score: 0,
  questionIndex: 0,
  showingFeedback: false,
  feedbackTimer: 0,
  feedbackCorrect: false,
  groundOffset: 0,
  correctStreak: 0,
  hurtTimer: 0,
  shakeTimer: 0,
  shakeIntensity: 0,
  invincible: false,
  invincibleTimer: 0,
  hearts: [],
  coins: [],
  fadeAlpha: 0,
  fadeDirection: 0,
  fadeCallback: null,
  heartPulse: [0, 0, 0],
  p2Index: 0,
  p2Selected: -1,
  p2ShowResult: false,
  p2Timer: 0,
  balance: 1000,
  p3TradeCount: 0,
  qualifyAnswers: {},
  frameCount: 0,
  lastTime: 0,
  flashAlpha: 0,
  flashColor: '',
  dyingTimer: 0,
  transitionText: '',
  transitionTimer: 0,
  // Feature 1: Countdown
  countdown: createCountdownState(),
  // Feature 2: Tutorial
  tutorial: createTutorialState(),
  // Feature 5: Continue
  continuesUsed: 0,
  // Feature 7: Balance animation
  balanceAnim: createBalanceAnimState(),
};

function getCurrentPhase() {
  if (state.scene === 'phase3') return 3;
  if (state.scene === 'phase2') return 2;
  return 1;
}

function resetBird() {
  state.bird = { x: 70, y: H * 0.4, vel: 0, rotation: 0, flapFrame: 0, wingIndex: 0, wingTimer: 0 };
}

function resetPhase1() {
  state.scene = 'countdown';
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
  state.coins = [];
  state.heartPulse = [0, 0, 0];
  state.continuesUsed = 0;
  state.nextSpawnIndex = 0;
  clearTrail();
  resetBird();
  spawnGate();
  // Start countdown (no fade — countdown IS the intro)
  state.fadeAlpha = 0;
  state.fadeDirection = 0;
  state.countdown = startCountdown(state.countdown);
}

// Feature 5: Continue from checkpoint
function continueFromCheckpoint() {
  state.scene = 'countdown';
  state.gates = [];
  state.lives = 2; // Penalty: 2 lives instead of 3
  state.showingFeedback = false;
  state.correctStreak = 0;
  state.hurtTimer = 0;
  state.shakeTimer = 0;
  state.invincible = false;
  state.invincibleTimer = 0;
  state.hearts = [];
  state.coins = [];
  state.heartPulse = [0, 0, 0];
  state.continuesUsed++;
  state.nextSpawnIndex = state.questionIndex;
  clearTrail();
  resetBird();
  // questionIndex is NOT reset -- continue from where died
  spawnGate();
  state.fadeAlpha = 0;
  state.fadeDirection = 0;
  state.countdown = startCountdown(state.countdown);
}

// ============================================================
// PHASE TRANSITION FADES
// ============================================================
function startFadeIn() {
  state.fadeAlpha = 1;
  state.fadeDirection = -1;
  state.fadeCallback = null;
}

function startFadeOut(callback) {
  state.fadeAlpha = 0;
  state.fadeDirection = 1;
  state.fadeCallback = callback;
}

function updateFade() {
  if (state.fadeDirection === 0) return;
  if (state.fadeDirection === 1) {
    state.fadeAlpha = Math.min(1, state.fadeAlpha + 0.03);
    if (state.fadeAlpha >= 1 && state.fadeCallback) {
      state.fadeCallback();
      state.fadeCallback = null;
      state.fadeDirection = -1;
    }
  } else if (state.fadeDirection === -1) {
    state.fadeAlpha = Math.max(0, state.fadeAlpha - 0.03);
    if (state.fadeAlpha <= 0) state.fadeDirection = 0;
  }
}

function drawFade() {
  if (state.fadeAlpha <= 0) return;
  ctx.fillStyle = `rgba(0,0,0,${state.fadeAlpha})`;
  ctx.fillRect(0, 0, W, H);
}

// ============================================================
// QUESTION DISPLAY (center + banner transition)
// ============================================================
function drawQuestionBanner() {
  const nextGate = state.gates.find(g => !g.scored);
  const q = nextGate ? getGateQuestion(nextGate) : null;
  if (!q) return;

  const qi = nextGate.qIndex != null ? nextGate.qIndex : state.questionIndex;

  // Center of screen — big, clear, impossible to miss
  const centerY = H * 0.28;
  const lines = q.q.split('\n');
  const boxW = Math.min(W - 30, 360);
  const boxH = lines.length > 1 ? 85 : 60;

  // Dark pill background
  ctx.save();
  drawRoundRect(ctx, W / 2 - boxW / 2, centerY - boxH / 2, boxW, boxH, 16, 'rgba(0,0,0,0.8)');

  // Question counter — small, top-left of pill
  drawText(ctx, `${qi + 1}/${phase1Questions.length}`, W / 2 - boxW / 2 + 28, centerY - boxH / 2 + 12, 10, '#888', 'center', false);

  // Question text — big yellow
  const fontSize = Math.min(20, boxW / (q.q.length * 0.42));
  if (lines.length === 1) {
    drawText(ctx, q.q, W / 2, centerY, Math.max(fontSize, 15), '#F7DC6F');
  } else {
    drawText(ctx, lines[0], W / 2, centerY - 12, Math.max(fontSize, 14), '#F7DC6F');
    drawText(ctx, lines[1], W / 2, centerY + 12, Math.max(fontSize, 14), '#F7DC6F');
  }
  ctx.restore();
}

// ============================================================
// HUD
// ============================================================
function drawHUD() {
  const isPhase3 = state.scene === 'phase3';

  // Hearts (show in all phases)
  for (let i = 0; i < MAX_LIVES; i++) {
    const hx = 22 + i * 36;
    const hy = 90;
    const pulse = state.heartPulse[i] || 0;
    const s = 1 + pulse * 0.3;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(s, s);
    drawCanvasHeart(ctx, 0, 0, 12, i < state.lives ? '#E74C3C' : '#555', i < state.lives ? '#C0392B' : '#333');
    ctx.restore();
  }

  // Score — only in phase 1 (phase 3 has balance instead)
  if (!isPhase3) {
    drawText(ctx, String(state.score), W - 50, 88, 34, TEXT_WHITE);
  }

  // Phase counter
  const phaseNum = isPhase3 ? 3 : state.scene === 'phase2' ? 2 : 1;
  drawText(ctx, `Fase ${phaseNum}/3`, W - 55, 42, 14, 'rgba(255,255,255,0.7)', 'center', false);
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
  drawText(ctx, state.feedbackCorrect ? '✅' : '❌', W / 2, H / 2, 72, TEXT_WHITE);
}

// ============================================================
// GATE LOGIC
// ============================================================
function spawnGate() {
  // Each gate gets a sequential index, never skips
  const qIndex = state.nextSpawnIndex;
  state.nextSpawnIndex++;
  const totalH = PASSAGE_HEIGHT * 2 + WALL_THICKNESS;
  const minTop = 80;
  const maxTop = H - GROUND_HEIGHT - totalH - 40;
  const topPassageY = minTop + Math.random() * Math.max(maxTop - minTop, 0);
  const lastGate = state.gates[state.gates.length - 1];
  const startX = lastGate ? Math.max(W + 80, lastGate.x + GATE_SPACING) : W + 120;
  // Every 5th question (index 4, 9, etc.) is a golden gate
  const golden = (qIndex + 1) % GOLDEN_GATE_INTERVAL === 0;
  state.gates.push({ x: startX, topPassageY, qIndex, passed: false, scored: false, result: null, golden });

  // Spawn coins between previous gate and this one
  if (lastGate) {
    spawnCoinsBetweenGates(lastGate.x + GATE_WIDTH, startX);
  }
}

function spawnCoinsBetweenGates(fromX, toX) {
  const coinCount = 3 + Math.floor(Math.random() * 3); // 3-5 coins
  const midX = (fromX + toX) / 2;
  const spread = (toX - fromX) * 0.5;
  const groundY = H - GROUND_HEIGHT;
  const centerY = 100 + Math.random() * (groundY - 220);

  for (let i = 0; i < coinCount; i++) {
    const t = (i / (coinCount - 1)) - 0.5; // -0.5 to 0.5
    const coinX = midX + t * spread;
    // Arc shape: highest in middle
    const arcY = centerY - (1 - t * t * 4) * 30;
    state.coins.push({
      x: coinX,
      y: Math.max(50, Math.min(groundY - 50, arcY)),
      collected: false,
      seed: Math.random() * 100,
    });
  }
}

// Resolve question for a gate dynamically (always uses current mapping)
function getGateQuestion(gate) {
  if (gate.qIndex != null && gate.qIndex < phase1Questions.length) {
    return phase1Questions[gate.qIndex];
  }
  return gate.question || null;
}

function checkGateCollision(gate) {
  const { x: bx, y: by } = state.bird;
  const r = BIRD_SIZE / 2 - 3;
  if (bx + r < gate.x || bx - r > gate.x + GATE_WIDTH) return false;

  if (gate.golden) {
    // Golden gate: single passage
    const gapCenter = gate.topPassageY + PASSAGE_HEIGHT;
    const gapHalf = PASSAGE_HEIGHT;
    const gapTop = gapCenter - gapHalf / 2;
    const gapBottom = gapCenter + gapHalf / 2;
    if (by - r < gapTop) return true;
    if (by + r > gapBottom) return true;
    return false;
  }

  const midWallTop = gate.topPassageY + PASSAGE_HEIGHT;
  const midWallBottom = midWallTop + WALL_THICKNESS;
  const botPassageBottom = midWallBottom + PASSAGE_HEIGHT;
  if (by - r < gate.topPassageY) return true;
  if (by + r > midWallTop && by - r < midWallBottom) return true;
  if (by + r > botPassageBottom) return true;
  return false;
}

function getComboMultiplier(streak) {
  for (const t of COMBO_THRESHOLDS) {
    if (streak >= t.streak) return t;
  }
  return null;
}

function triggerDamage() {
  state.hurtTimer = 40;
  state.shakeTimer = 15;
  state.shakeIntensity = 10;
  state.invincible = true;
  state.invincibleTimer = 50;
  emitWrongParticles(state.bird.x, state.bird.y);
  addFloatingText(state.bird.x + 30, state.bird.y - 20, '-❤️', '#F44336', 22);
  playWrong();
  if (state.lives >= 0 && state.lives < MAX_LIVES) {
    state.heartPulse[state.lives] = 1;
  }
}

function handleGatePass(gate) {
  const question = getGateQuestion(gate);
  if (gate.scored || !question) return;
  if (state.bird.x <= gate.x + GATE_WIDTH) return;

  gate.scored = true;
  gate.passed = true;

  // Determine which passage the bird chose
  let chose;
  if (gate.golden) {
    // Golden gate: single passage split into top half (A) and bottom half (B)
    const gapCenter = gate.topPassageY + PASSAGE_HEIGHT;
    chose = state.bird.y < gapCenter ? 'a' : 'b';
  } else {
    const midWallCenter = gate.topPassageY + PASSAGE_HEIGHT + WALL_THICKNESS / 2;
    chose = state.bird.y < midWallCenter ? 'a' : 'b';
  }
  const correct = chose === question.correct;
  gate.result = { chose, correct };

  if (question.qualifying) {
    state.qualifyAnswers[question.q] = chose === 'a' ? question.a : question.b;
  }

  // Qualifying questions: any answer is "correct" (we just collect data)
  const isCorrect = question.qualifying ? true : correct;

  if (isCorrect) {
    state.correctStreak++;
    let basePoints = 10;

    // Golden gate bonus: x3 points
    if (gate.golden) {
      basePoints = basePoints * GOLDEN_SCORE_MULTIPLIER;
    }

    // Combo multiplier
    const combo = getComboMultiplier(state.correctStreak);
    const multiplier = combo ? combo.multiplier : 1;
    const points = basePoints * multiplier;

    state.score += points;
    state.feedbackCorrect = true;
    state.flashColor = 'rgb(76,175,80)';
    emitCorrectParticles(state.bird.x, state.bird.y);

    // Build floating text
    let floatText = `+${points}`;
    if (gate.golden) floatText = `\u2B50 ${floatText}`;
    addFloatingText(state.bird.x + 30, state.bird.y - 20, floatText, '#4CAF50', 24);

    // Show combo text if active
    if (combo) {
      addFloatingText(
        state.bird.x, state.bird.y - 50,
        `\uD83D\uDD25 COMBO ${combo.label}!`,
        '#FF6600', 28
      );
      playCombo();
    }

    playCorrect();
  } else {
    state.lives--;
    state.feedbackCorrect = false;
    state.correctStreak = 0;
    state.flashColor = 'rgb(244,67,54)';
    state.hurtTimer = 35;
    state.shakeTimer = 12;
    state.shakeIntensity = 8;
    state.invincible = true;
    state.invincibleTimer = 40;
    emitWrongParticles(state.bird.x, state.bird.y);
    addFloatingText(state.bird.x + 30, state.bird.y - 20, '-❤️', '#F44336', 22);
    playWrong();
    if (state.lives >= 0 && state.lives < MAX_LIVES) {
      state.heartPulse[state.lives] = 1;
    }
    if (state.lives <= 0) { startDying(); return; }
  }

  state.showingFeedback = true;
  state.feedbackTimer = 30;
  state.flashAlpha = 0.4;
  state.questionIndex++;

  if (state.questionIndex % 2 === 0 && state.questionIndex < phase1Questions.length) {
    const lg = state.gates[state.gates.length - 1];
    if (lg) {
      const groundY = H - GROUND_HEIGHT;
      state.hearts.push({ x: lg.x + GATE_SPACING / 2, y: 100 + Math.random() * (groundY - 200), collected: false, seed: Math.random() * 100 });
    }
  }
}

// ============================================================
// PHASE 2: FINANCIAL QUIZ
// ============================================================
function drawPhase2() {
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0a0a2e');
  bgGrad.addColorStop(1, '#1a1a4a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(247,220,111,0.05)';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.arc((state.frameCount * 0.5 + i * 137) % W, (state.frameCount * 0.3 + i * 89) % H, 2 + i % 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const q = phase2Questions[state.p2Index];
  if (!q) { startPhase3(); return; }

  drawText(ctx, `Pergunta ${state.p2Index + 1}/${phase2Questions.length}`, W / 2, 40, 16, '#888', 'center', false);
  drawText(ctx, '💰 QUIZ FINANCEIRO', W / 2, 80, 22, '#F7DC6F');
  q.q.split('\n').forEach((line, i) => drawText(ctx, line, W / 2, 130 + i * 28, 18, TEXT_WHITE));

  const optY = 200;
  q.options.forEach((opt, i) => {
    const y = optY + i * 62;
    let bg = '#1a1a4a';
    if (state.p2ShowResult) {
      if (i === q.correct) bg = CORRECT_COLOR;
      else if (i === state.p2Selected) bg = WRONG_COLOR;
    }
    drawRoundRect(ctx, 24, y, W - 48, 50, 12, bg, '#555');
    drawText(ctx, opt, W / 2, y + 25, 15, TEXT_WHITE);
  });
  drawText(ctx, `Pontuação: ${state.score}`, W / 2, H - 35, 14, '#888', 'center', false);
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
      if (i === q.correct) {
        state.score += 20;
        addFloatingText(W / 2, y + 25, '+20', '#4CAF50', 26);
      }
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
  state.coins = [];
  state.showingFeedback = false;
  // Feature 7: Reset balance animation
  state.balanceAnim = { ...createBalanceAnimState() };
  clearTrail();
  resetBird();
  startFadeIn();

  for (let i = 0; i < phase3Scenarios.length; i++) {
    const totalH = PASSAGE_HEIGHT * 2 + WALL_THICKNESS;
    const minTop = 80;
    const maxTop = H - GROUND_HEIGHT - totalH - 40;
    state.gates.push({
      x: W + 120 + i * GATE_SPACING,
      topPassageY: minTop + Math.random() * Math.max(maxTop - minTop, 0),
      scenario: phase3Scenarios[i],
      question: { a: '📈 BUY', b: '📉 SELL', correct: phase3Scenarios[i].direction === 'up' ? 'a' : 'b' },
      passed: false, scored: false, result: null,
    });
  }
}

function drawPhase3HUD() {
  // Feature 7: Animated balance display
  drawAnimatedBalance(ctx, state.balanceAnim, W);
  const next = state.gates.find(g => !g.passed);
  if (next?.scenario) {
    drawRoundRect(ctx, 12, 12, W - 24, 50, 12, 'rgba(0,0,0,0.7)');
    drawText(ctx, next.scenario.hint, W / 2, 30, 12, TEXT_WHITE);
    drawText(ctx, '⬆️ BUY (cima)  ⬇️ SELL (baixo)', W / 2, 48, 11, '#aaa');
  }
}

function handleTradePass(gate) {
  if (gate.scored || !gate.scenario) return;
  if (state.bird.x <= gate.x + GATE_WIDTH) return;

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
    emitCorrectParticles(state.bird.x, state.bird.y);
    addFloatingText(state.bird.x + 30, state.bird.y - 20, `+$${gain}`, '#4CAF50', 22);
    playCorrect();
  } else {
    const loss = 50 + Math.floor(Math.random() * 100);
    state.balance = Math.max(0, state.balance - loss);
    state.feedbackCorrect = false;
    state.flashColor = 'rgb(244,67,54)';
    emitWrongParticles(state.bird.x, state.bird.y);
    addFloatingText(state.bird.x + 30, state.bird.y - 20, `-$${loss}`, '#F44336', 22);
    playWrong();
  }

  state.showingFeedback = true;
  state.feedbackTimer = 25;
  state.flashAlpha = 0.3;
  state.p3TradeCount++;

  if (state.p3TradeCount >= phase3Scenarios.length) {
    setTimeout(() => startFadeOut(() => { state.scene = 'leadform'; showLeadForm(); }), 1200);
  }
}

// ============================================================
// LEAD FORM / GAME OVER / SHARE
// ============================================================
function showLeadForm() {
  document.getElementById('form-balance').textContent = `Seu saldo: $${state.balance.toLocaleString()} 🤑`;
  document.getElementById('lead-form').classList.remove('hidden');
}

document.getElementById('capture-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = { name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'), score: state.score, balance: state.balance, phase: 3, answers: state.qualifyAnswers };
  try { await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
  catch (err) { console.error('Lead submission failed:', err); }
  e.target.innerHTML = '<p style="font-size:24px;padding:20px;">✅ Enviado!<br><br>Entraremos em contato em breve!</p>';
});

function startDying() {
  state.scene = 'dying';
  state.dyingTimer = 90; // ~1.5 seconds at 60fps
  playGameOver();
}

function showGameOver() {
  state.scene = 'gameover';

  // Feature 4: Leaderboard -- check and save high score
  const isNewRecord = saveHighScore(state.score);
  const highScore = getHighScore();

  document.getElementById('share-score').textContent = `Pontua\u00e7\u00e3o: ${state.score} | Fase: ${state.questionIndex}`;

  const highscoreEl = document.getElementById('share-highscore');
  if (highscoreEl) highscoreEl.textContent = `Seu recorde: ${highScore} pts`;

  const newRecordEl = document.getElementById('share-new-record');
  if (newRecordEl) {
    if (isNewRecord && state.score > 0) {
      newRecordEl.textContent = '\uD83C\uDFC6 NOVO RECORDE!';
      newRecordEl.classList.remove('hidden');
    } else {
      newRecordEl.classList.add('hidden');
    }
  }

  // Feature 5: Show continue button only if not used yet and still in phase1
  const continueBtn = document.getElementById('btn-continue');
  if (continueBtn) {
    if (state.continuesUsed === 0 && state.questionIndex > 0 && state.questionIndex < phase1Questions.length) {
      continueBtn.classList.remove('hidden');
    } else {
      continueBtn.classList.add('hidden');
    }
  }

  document.getElementById('share-overlay').classList.remove('hidden');
}

document.getElementById('btn-retry')?.addEventListener('click', () => {
  document.getElementById('share-overlay').classList.add('hidden');
  resetPhase1();
});

// Feature 5: Continue button
document.getElementById('btn-continue')?.addEventListener('click', () => {
  document.getElementById('share-overlay').classList.add('hidden');
  continueFromCheckpoint();
});

// Feature 6: Viral share card
document.getElementById('btn-share')?.addEventListener('click', () => {
  const phaseNum = state.scene === 'phase3' ? 3 : state.questionIndex >= phase1Questions.length ? 2 : 1;
  const highScore = getHighScore();
  shareWithImage(state.score, phaseNum, state.lives, MAX_LIVES, highScore);
});

// ============================================================
// INPUT
// ============================================================
function handleTap(tx, ty) {
  if (state.scene === 'menu') { resetPhase1(); return; }
  // Feature 1: During countdown, ignore taps
  if (state.scene === 'countdown') return;
  if (state.scene === 'dying' || state.scene === 'transition') return;
  if (state.scene === 'phase2') { handlePhase2Tap(tx, ty); return; }
  if (state.scene === 'phase1' || state.scene === 'phase3') {
    // Feature 2: Dismiss tutorial on first tap
    if (state.tutorial.visible) {
      state.tutorial = dismissTutorial(state.tutorial);
    }
    state.bird.vel = JUMP_FORCE;
    state.bird.wingIndex = 0;
    state.bird.wingTimer = 0;
    playFlap();
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
  drawParallaxBackground(ctx, W, H, GROUND_HEIGHT, state.frameCount * 0.5);
  drawText(ctx, 'FLAPPY', W / 2, H * 0.22, 52, '#F7DC6F');
  drawText(ctx, 'QUIZ', W / 2, H * 0.22 + 58, 52, TEXT_WHITE);

  // Bobbing bird
  const my = H * 0.46 + Math.sin(state.frameCount * 0.05) * 12;
  const savedBird = { ...state.bird };
  const savedHurt = state.hurtTimer;
  state.hurtTimer = 0;
  const menuBird = { x: W / 2, y: my, vel: 0, rotation: Math.sin(state.frameCount * 0.03) * 0.1, flapFrame: state.frameCount, wingIndex: Math.floor((state.frameCount * 0.15) % 3), wingTimer: 0 };
  drawBird(ctx, menuBird, 0);
  state.bird = savedBird;
  state.hurtTimer = savedHurt;

  // Pulsing button
  const btnPulse = 1 + Math.sin(state.frameCount * 0.06) * 0.04;
  ctx.save();
  const btnCY = H * 0.6 + 26;
  ctx.translate(W / 2, btnCY);
  ctx.scale(btnPulse, btnPulse);
  ctx.translate(-W / 2, -btnCY);
  const btnY = H * 0.6;
  const btnGrad = ctx.createLinearGradient(0, btnY, 0, btnY + 52);
  btnGrad.addColorStop(0, '#FF8A50');
  btnGrad.addColorStop(1, '#FF5722');
  drawRoundRect(ctx, W / 2 - 80, btnY, 160, 52, 16, btnGrad);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 80, btnY, 160, 52, 16);
  ctx.stroke();
  drawText(ctx, '▶ JOGAR', W / 2, btnY + 26, 24, TEXT_WHITE);
  ctx.restore();

  drawText(ctx, 'Toque para come\u00e7ar', W / 2, H * 0.75, 15, 'rgba(255,255,255,0.6)');

  // Feature 4: Show high score on menu
  const highScore = getHighScore();
  if (highScore > 0) {
    drawText(ctx, `Recorde: ${highScore}`, W / 2, H * 0.68, 16, 'rgba(255,255,255,0.5)', 'center', false);
  }
}

// ============================================================
// UPDATE
// ============================================================
function update() {
  state.frameCount++;
  updateFade();
  updateParticles();
  updateFloatingTexts();

  for (let i = 0; i < state.heartPulse.length; i++) {
    if (state.heartPulse[i] > 0) state.heartPulse[i] = Math.max(0, state.heartPulse[i] - 0.04);
  }

  // Feature 1: Countdown update
  if (state.scene === 'countdown') {
    state.countdown = updateCountdown(state.countdown);
    // Bird hovers in place -- no gravity
    state.bird.wingTimer++;
    if (state.bird.wingTimer > 5) { state.bird.wingTimer = 0; state.bird.wingIndex = (state.bird.wingIndex + 1) % 3; }
    state.bird.flapFrame++;
    // Gentle bob
    state.bird.y = H * 0.4 + Math.sin(state.frameCount * 0.05) * 6;
    state.bird.rotation = 0;
    state.groundOffset += SCROLL_SPEED * 0.3;
    if (!state.countdown.active) {
      // Countdown finished -- start actual gameplay
      state.scene = 'phase1';
    }
    return;
  }

  if (state.scene === 'phase1' || state.scene === 'phase3') {
    // Feature 2: Update tutorial
    state.tutorial = updateTutorial(state.tutorial);

    state.bird.vel += GRAVITY;
    state.bird.y += state.bird.vel;
    state.bird.rotation = Math.min(state.bird.vel * 0.06, Math.PI / 4);
    state.bird.flapFrame++;
    state.groundOffset += SCROLL_SPEED;

    state.bird.wingTimer++;
    if (state.bird.wingTimer > 5) { state.bird.wingTimer = 0; state.bird.wingIndex = (state.bird.wingIndex + 1) % 3; }

    if (state.bird.y > H - GROUND_HEIGHT - BIRD_SIZE / 2) { state.bird.y = H - GROUND_HEIGHT - BIRD_SIZE / 2; state.bird.vel = 0; }
    if (state.bird.y < BIRD_SIZE / 2) { state.bird.y = BIRD_SIZE / 2; state.bird.vel = 0; }

    if (state.showingFeedback) { state.feedbackTimer--; if (state.feedbackTimer <= 0) state.showingFeedback = false; }
    if (state.flashAlpha > 0) state.flashAlpha -= 0.02;
    if (state.hurtTimer > 0) state.hurtTimer--;
    if (state.shakeTimer > 0) { state.shakeTimer--; state.shakeIntensity *= 0.92; }
    if (state.invincibleTimer > 0) { state.invincibleTimer--; if (state.invincibleTimer <= 0) state.invincible = false; }

    // Feature 7: Update balance animation in phase3
    if (state.scene === 'phase3') {
      state.balanceAnim = updateBalanceAnim(state.balanceAnim, state.balance);
    }

    // Heart pickups
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
          emitHeartParticles(h.x, h.y);
          addFloatingText(h.x, h.y - 20, '+❤️', '#FF69B4', 24);
          state.heartPulse[state.lives - 1] = 1;
          playHeartPickup();
        }
      }
    }
    state.hearts = state.hearts.filter(h => !h.collected && h.x > -30);

    // Coin pickups
    for (const c of state.coins) {
      if (c.collected) continue;
      c.x -= SCROLL_SPEED;
      const dx = state.bird.x - c.x;
      const dy = state.bird.y - c.y;
      if (Math.sqrt(dx * dx + dy * dy) < COIN_COLLECT_RADIUS) {
        c.collected = true;
        state.score += COIN_POINTS;
        emitCoinParticles(c.x, c.y);
        addFloatingText(c.x, c.y - 15, `+${COIN_POINTS}`, '#FFD700', 18);
        playCoin();
      }
    }
    state.coins = state.coins.filter(c => !c.collected && c.x > -30);

    // Combo trail: emit fire particles behind bird when combo >= 3
    updateTrail(state.bird.x, state.bird.y);
    if (state.correctStreak >= 3 && state.frameCount % 2 === 0) {
      emitComboTrail(state.bird.x, state.bird.y);
    }

    for (const g of state.gates) g.x -= SCROLL_SPEED;
    state.gates = state.gates.filter(g => g.x > -GATE_WIDTH - 30);

    for (const g of state.gates) {
      if (!g.scored && !state.invincible && checkGateCollision(g)) {
        state.lives--;
        state.flashAlpha = 0.5;
        state.flashColor = 'rgb(244,67,54)';
        state.bird.vel = JUMP_FORCE * 0.6;
        triggerDamage();
        g.scored = true;
        g.passed = true;
        state.questionIndex++;
        state.correctStreak = 0;
        if (state.lives <= 0) { startDying(); return; }
        break;
      }
      if (!g.scored) {
        if (state.scene === 'phase1') handleGatePass(g);
        else handleTradePass(g);
      }
    }

    if (state.scene === 'phase1') {
      const last = state.gates[state.gates.length - 1];
      const allSpawned = state.nextSpawnIndex >= phase1Questions.length;
      const allDone = state.gates.length === 0 || state.gates.every(g => g.scored);

      if (!last || last.x < W - GATE_SPACING) {
        if (!allSpawned) spawnGate();
        else if (allDone && state.fadeDirection === 0 && state.scene === 'phase1') {
          playPhaseUnlock();
          state.scene = 'phase1_ending'; // prevent re-triggering
          startFadeOut(() => {
            state.transitionText = '\uD83D\uDD13 QUIZ FINANCEIRO DESBLOQUEADO!';
            state.transitionTimer = 120; // 2 seconds at 60fps
            state.scene = 'transition';
            state.fadeAlpha = 0;
            state.fadeDirection = 0;
            emitConfetti(W);
            state._transitionNext = () => {
              state.scene = 'phase2';
              state.p2Index = 0;
              state.p2Selected = -1;
              state.p2ShowResult = false;
              startFadeIn();
            };
          });
        }
      }
    }
  }

  // Dying animation
  if (state.scene === 'dying') {
    state.bird.vel += GRAVITY * 1.8;
    state.bird.y += state.bird.vel;
    state.bird.rotation += 0.15;
    state.dyingTimer--;
    const groundY = H - GROUND_HEIGHT - BIRD_SIZE / 2;
    if (state.bird.y >= groundY) {
      state.bird.y = groundY;
      state.bird.vel = 0;
    }
    if (state.dyingTimer <= 0 || state.bird.y >= groundY) {
      showGameOver();
    }
  }

  // Transition screen
  if (state.scene === 'transition') {
    state.transitionTimer--;
    if (state.transitionTimer <= 0 && state._transitionNext) {
      const next = state._transitionNext;
      state._transitionNext = null;
      state.transitionText = '';
      next();
    }
  }

  if (state.scene === 'phase2' && state.p2ShowResult) {
    state.p2Timer--;
    if (state.p2Timer <= 0) {
      state.p2ShowResult = false;
      state.p2Selected = -1;
      state.p2Index++;
      if (state.p2Index >= phase2Questions.length) {
        playPhaseUnlock();
        startFadeOut(() => {
          state.transitionText = '\uD83D\uDCC8 MODO TRADING DESBLOQUEADO!';
          state.transitionTimer = 120;
          state.scene = 'transition';
          state.fadeAlpha = 0;
          state.fadeDirection = 0;
          emitConfetti(W);
          state._transitionNext = () => startPhase3();
        });
      }
    }
  }
}

// ============================================================
// RENDER
// ============================================================
function render() {
  ctx.clearRect(0, 0, W, H);

  if (state.scene === 'menu') { drawMenu(); drawFade(); return; }
  if (state.scene === 'phase2') { drawPhase2(); drawFloatingTexts(ctx); drawFade(); return; }

  // Feature 1: Countdown scene rendering
  if (state.scene === 'countdown') {
    drawParallaxBackground(ctx, W, H, GROUND_HEIGHT, state.groundOffset, getCurrentPhase());
    for (const g of state.gates) {
      const resolvedGate = { ...g, question: getGateQuestion(g) };
      drawGate(ctx, resolvedGate, H, GROUND_HEIGHT, GATE_WIDTH, PASSAGE_HEIGHT, WALL_THICKNESS);
    }
    drawBird(ctx, state.bird, state.hurtTimer, H - GROUND_HEIGHT, getCurrentPhase());
    drawHUD();
    drawQuestionBanner();
    drawCountdown(ctx, state.countdown, W, H);
    drawFade();
    return;
  }

  // Transition screen
  if (state.scene === 'transition') {
    ctx.fillStyle = '#0a0a2e';
    ctx.fillRect(0, 0, W, H);
    drawParticles(ctx); // confetti particles
    const alpha = Math.min(1, (120 - state.transitionTimer) / 20);
    ctx.save();
    ctx.globalAlpha = alpha;
    drawText(ctx, state.transitionText, W / 2, H / 2, 28, '#F7DC6F');
    ctx.restore();
    drawFade();
    return;
  }

  if (state.scene === 'dying' || state.scene === 'phase1' || state.scene === 'phase1_ending' || state.scene === 'phase3' || state.scene === 'leadform') {
    if (state.shakeTimer > 0) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * state.shakeIntensity, (Math.random() - 0.5) * state.shakeIntensity);
    }

    drawParallaxBackground(ctx, W, H, GROUND_HEIGHT, state.groundOffset, getCurrentPhase());
    for (const g of state.gates) {
      // Resolve question dynamically so it always matches current state
      const resolvedGate = { ...g, question: getGateQuestion(g) };
      drawGate(ctx, resolvedGate, H, GROUND_HEIGHT, GATE_WIDTH, PASSAGE_HEIGHT, WALL_THICKNESS);
    }

    for (const h of state.hearts) {
      if (!h.collected) {
        const bobY = Math.sin(state.frameCount * 0.04 + h.seed) * 5;
        const ps = 1 + Math.sin(state.frameCount * 0.06 + h.seed) * 0.08;
        ctx.save();
        ctx.translate(h.x, h.y + bobY);
        ctx.scale(ps, ps);
        ctx.fillStyle = 'rgba(255,80,80,0.15)';
        ctx.beginPath();
        ctx.arc(0, 0, HEART_SIZE, 0, Math.PI * 2);
        ctx.fill();
        drawCanvasHeart(ctx, 0, 0, HEART_SIZE * 0.6, '#FF4081', '#C2185B');
        ctx.restore();
      }
    }

    // Draw coins
    for (const c of state.coins) {
      if (c.collected) continue;
      const bobY = Math.sin(state.frameCount * 0.06 + c.seed) * 3;
      const sparkle = 0.7 + Math.sin(state.frameCount * 0.08 + c.seed * 2) * 0.3;
      ctx.save();
      ctx.translate(c.x, c.y + bobY);

      // Glow
      ctx.globalAlpha = 0.2 * sparkle;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, 0, COIN_RADIUS * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Coin body
      ctx.globalAlpha = sparkle;
      const coinGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, COIN_RADIUS);
      coinGrad.addColorStop(0, '#FFF176');
      coinGrad.addColorStop(0.6, '#FFD700');
      coinGrad.addColorStop(1, '#DAA520');
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.arc(0, 0, COIN_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // "$" symbol
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#8B6914';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0.5);

      ctx.restore();
    }

    // Bird trail (combo glow effect)
    drawBirdTrail(ctx, state.correctStreak >= 3);

    drawBird(ctx, state.bird, state.hurtTimer, H - GROUND_HEIGHT, getCurrentPhase());
    drawParticles(ctx);
    drawFloatingTexts(ctx);
    drawHUD();

    // Combo indicator in HUD
    if (state.correctStreak >= 3 && (state.scene === 'phase1' || state.scene === 'phase3')) {
      const combo = getComboMultiplier(state.correctStreak);
      if (combo) {
        const comboText = `\uD83D\uDD25 ${combo.label}`;
        const pulseScale = 1 + Math.sin(state.frameCount * 0.1) * 0.08;
        ctx.save();
        ctx.translate(W / 2, 88);
        ctx.scale(pulseScale, pulseScale);
        drawText(ctx, comboText, 0, 0, 20, '#FF6600');
        ctx.restore();
      }
    }

    if (state.scene === 'phase1') {
      drawQuestionBanner();
      // Feature 3: Progress bar
      drawProgressBar(ctx, W, state.questionIndex, phase1Questions.length);
    }
    if (state.scene === 'phase3') {
      drawPhase3HUD();
      // Feature 3: Progress bar for phase 3
      drawProgressBar(ctx, W, state.p3TradeCount, phase3Scenarios.length);
    }

    drawFeedbackText();
    drawFeedback();

    // Feature 2: Tutorial overlay (drawn on top)
    if (state.scene === 'phase1') {
      drawTutorial(ctx, state.tutorial, W, H);
    }

    if (state.shakeTimer > 0) ctx.restore();
  }

  drawFade();
}

function gameLoop(ts) {
  state.lastTime = ts;
  if (state.scene !== 'gameover') update();
  render();
  requestAnimationFrame(gameLoop);
}


requestAnimationFrame(gameLoop);
