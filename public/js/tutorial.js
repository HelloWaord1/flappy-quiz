// ============================================================
// TUTORIAL OVERLAY — shown before first gates (first game only)
// ============================================================

import { drawText, drawRoundRect } from './drawing.js';

const TUTORIAL_TIMEOUT_FRAMES = 180; // 3 seconds at 60fps
const LOCALSTORAGE_KEY = 'flappy-quiz-played';

export function createTutorialState() {
  const hasPlayedBefore = localStorage.getItem(LOCALSTORAGE_KEY) === 'true';
  return {
    visible: false,
    timer: 0,
    hasPlayedBefore,
  };
}

export function showTutorial(tutorialState) {
  if (tutorialState.hasPlayedBefore) return tutorialState;
  return {
    ...tutorialState,
    visible: true,
    timer: TUTORIAL_TIMEOUT_FRAMES,
  };
}

export function dismissTutorial(tutorialState) {
  if (!tutorialState.visible) return tutorialState;
  try { localStorage.setItem(LOCALSTORAGE_KEY, 'true'); } catch (_e) { /* noop */ }
  return {
    ...tutorialState,
    visible: false,
    timer: 0,
    hasPlayedBefore: true,
  };
}

export function updateTutorial(tutorialState) {
  if (!tutorialState.visible) return tutorialState;
  const newTimer = tutorialState.timer - 1;
  if (newTimer <= 0) {
    return dismissTutorial(tutorialState);
  }
  return { ...tutorialState, timer: newTimer };
}

export function drawTutorial(ctx, tutorialState, W, H) {
  if (!tutorialState.visible) return;

  const alpha = Math.min(1, tutorialState.timer / 20);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Semi-transparent backdrop
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);

  // Card
  const cardW = Math.min(W - 40, 320);
  const cardH = 180;
  const cardX = W / 2 - cardW / 2;
  const cardY = H / 2 - cardH / 2;

  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 20, 'rgba(0,0,0,0.85)');
  ctx.strokeStyle = 'rgba(247,220,111,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 20);
  ctx.stroke();

  const cy = cardY + 30;
  drawText(ctx, 'Como jogar:', W / 2, cy, 20, '#F7DC6F');

  drawText(ctx, '\u2B06\uFE0F Voe para CIMA = Resposta A', W / 2, cy + 42, 16, '#FFFFFF');
  drawText(ctx, '\u2B07\uFE0F Voe para BAIXO = Resposta B', W / 2, cy + 72, 16, '#FFFFFF');

  drawText(ctx, 'Toque para pular!', W / 2, cy + 115, 15, 'rgba(255,255,255,0.6)');

  ctx.restore();
}
