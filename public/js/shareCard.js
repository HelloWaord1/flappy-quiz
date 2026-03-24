// ============================================================
// VIRAL SHARE CARD — generates an image via canvas
// ============================================================

export function generateShareCard(score, phase, lives, maxLives) {
  const w = 600;
  const h = 400;
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d');

  // Gradient background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0a0a2e');
  bg.addColorStop(0.5, '#1a1a6a');
  bg.addColorStop(1, '#0a0a2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Decorative circles
  ctx.fillStyle = 'rgba(247,220,111,0.06)';
  ctx.beginPath();
  ctx.arc(100, 80, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(500, 320, 100, 0, Math.PI * 2);
  ctx.fill();

  // Title
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText('FLAPPY QUIZ', w / 2, 70);
  ctx.fillStyle = '#F7DC6F';
  ctx.fillText('FLAPPY QUIZ', w / 2, 70);

  // Score
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`Pontuacao: ${score}`, w / 2, 150);

  // Phase
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillStyle = '#87CEEB';
  ctx.fillText(`Fase: ${phase}/3`, w / 2, 200);

  // Hearts
  const heartsStr = '\u2764\uFE0F'.repeat(lives) + '\uD83D\uDDA4'.repeat(maxLives - lives);
  ctx.font = '28px Arial, sans-serif';
  ctx.fillText(heartsStr, w / 2, 245);

  // Challenge text
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillStyle = '#FF8A50';
  ctx.fillText('Aposto que voce nao consegue! \uD83D\uDE0F', w / 2, 310);

  // URL
  ctx.font = '16px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(location.host, w / 2, 370);

  return offscreen;
}

export async function shareWithImage(score, phase, lives, maxLives, highScore) {
  const shareText = `\uD83D\uDC26 Cheguei na fase ${phase} no Flappy Quiz! Pontuacao: ${score}. Recorde: ${highScore}. Aposto que voce nao consegue! \uD83D\uDE0F`;

  try {
    const card = generateShareCard(score, phase, lives, maxLives);
    const blob = await new Promise(resolve => card.toBlob(resolve, 'image/png'));

    if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'flappy-quiz.png', { type: 'image/png' })] })) {
      const file = new File([blob], 'flappy-quiz.png', { type: 'image/png' });
      await navigator.share({
        title: 'Flappy Quiz',
        text: shareText,
        url: location.href,
        files: [file],
      });
      return;
    }
  } catch (_e) {
    // fall through to text share
  }

  // Fallback: text-only share
  if (navigator.share) {
    navigator.share({ title: 'Flappy Quiz', text: shareText, url: location.href }).catch(() => {});
  } else {
    const fullText = shareText + ' ' + location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText).catch(() => {});
    }
    alert('Link copiado!');
  }
}
