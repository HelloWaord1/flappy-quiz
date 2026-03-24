// ============================================================
// PARTICLE SYSTEM
// ============================================================

const particles = [];

function createParticle({ x, y, color, shape = 'circle', count = 8, speed = 3, life = 40, size = 4 }) {
  const newParticles = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const spd = speed * (0.5 + Math.random() * 0.5);
    newParticles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 1,
      life,
      maxLife: life,
      color,
      shape,
      size: size * (0.7 + Math.random() * 0.6),
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
    });
  }
  particles.push(...newParticles);
}

export function emitCorrectParticles(x, y) {
  createParticle({ x, y, color: '#4CAF50', shape: 'star', count: 12, speed: 4, life: 45, size: 5 });
  createParticle({ x, y, color: '#81C784', shape: 'star', count: 6, speed: 2.5, life: 35, size: 3 });
}

export function emitWrongParticles(x, y) {
  createParticle({ x, y, color: '#F44336', shape: 'spark', count: 10, speed: 5, life: 30, size: 4 });
  createParticle({ x, y, color: '#FF8A65', shape: 'spark', count: 5, speed: 3, life: 25, size: 3 });
}

export function emitHeartParticles(x, y) {
  createParticle({ x, y, color: '#FF69B4', shape: 'heart', count: 8, speed: 3, life: 40, size: 6 });
  createParticle({ x, y, color: '#FFB6C1', shape: 'heart', count: 4, speed: 2, life: 35, size: 4 });
}

export function emitComboTrail(x, y) {
  const colors = ['#FF6600', '#FF9900', '#FFCC00', '#FF3300'];
  for (let i = 0; i < 3; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: x - 10 + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 14,
      vx: -1.5 - Math.random() * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      life: 18 + Math.floor(Math.random() * 10),
      maxLife: 28,
      color,
      shape: 'spark',
      size: 2 + Math.random() * 3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    });
  }
}

export function emitCoinParticles(x, y) {
  createParticle({ x, y, color: '#FFD700', shape: 'star', count: 6, speed: 2.5, life: 25, size: 3 });
}

export function emitConfetti(W) {
  const colors = ['#FF4081', '#FF6D00', '#FFD600', '#00E676', '#2979FF', '#D500F9', '#00BCD4', '#FF1744'];
  const count = 40;
  for (let i = 0; i < count; i++) {
    const color = colors[i % colors.length];
    particles.push({
      x: Math.random() * W,
      y: -10 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 3,
      vy: 1.5 + Math.random() * 2.5,
      life: 90 + Math.floor(Math.random() * 40),
      maxLife: 130,
      color,
      shape: 'confetti',
      size: 4 + Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    });
  }
}

export function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += (p.shape === 'confetti') ? 0.02 : 0.08; // gravity (lighter for confetti)
    p.life--;
    p.rotation += p.rotSpeed;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawStar(ctx, cx, cy, r, rotation) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHeart(ctx, cx, cy, size, rotation) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.beginPath();
  const s = size * 0.5;
  ctx.moveTo(0, s * 0.4);
  ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.5, -s, 0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.3, 0, s * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawParticles(ctx) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    if (p.shape === 'star') {
      drawStar(ctx, p.x, p.y, p.size, p.rotation);
    } else if (p.shape === 'heart') {
      drawHeart(ctx, p.x, p.y, p.size, p.rotation);
    } else if (p.shape === 'confetti') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    } else if (p.shape === 'spark') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillRect(-p.size / 2, -1, p.size, 2);
      ctx.fillRect(-1, -p.size / 2, 2, p.size);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
