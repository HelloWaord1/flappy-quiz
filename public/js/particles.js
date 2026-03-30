// ============================================================
// PARTICLE SYSTEM (OPTIMIZED — object pool, quality-aware)
// ============================================================

import { getQualityLevel } from './perfmon.js';

const MAX_PARTICLES = 150;
const particles = [];
const particlePool = [];

function acquireParticle() {
  if (particlePool.length > 0) return particlePool.pop();
  return {};
}

function releaseParticle(p) {
  if (particlePool.length < MAX_PARTICLES) {
    particlePool.push(p);
  }
}

function initParticle(p, x, y, vx, vy, life, color, shape, size, rotation, rotSpeed) {
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.life = life;
  p.maxLife = life;
  p.color = color;
  p.shape = shape;
  p.size = size;
  p.rotation = rotation;
  p.rotSpeed = rotSpeed;
  return p;
}

function createParticle({ x, y, color, shape = 'circle', count = 8, speed = 3, life = 40, size = 4 }) {
  const quality = getQualityLevel();
  // Reduce particle count on lower quality
  const effectiveCount = quality === 'low' ? Math.ceil(count / 3) :
                         quality === 'medium' ? Math.ceil(count / 2) : count;

  for (let i = 0; i < effectiveCount; i++) {
    if (particles.length >= MAX_PARTICLES) break;

    const angle = (Math.PI * 2 * i) / effectiveCount + (Math.random() - 0.5) * 0.5;
    const spd = speed * (0.5 + Math.random() * 0.5);
    const p = acquireParticle();
    initParticle(
      p, x, y,
      Math.cos(angle) * spd,
      Math.sin(angle) * spd - 1,
      life, color, shape,
      size * (0.7 + Math.random() * 0.6),
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.2
    );
    particles.push(p);
  }
}

export function emitCorrectParticles(x, y) {
  if (getQualityLevel() === 'low') {
    createParticle({ x, y, color: '#4CAF50', shape: 'star', count: 4, speed: 4, life: 30, size: 5 });
    return;
  }
  createParticle({ x, y, color: '#4CAF50', shape: 'star', count: 12, speed: 4, life: 45, size: 5 });
  createParticle({ x, y, color: '#81C784', shape: 'star', count: 6, speed: 2.5, life: 35, size: 3 });
}

export function emitWrongParticles(x, y) {
  if (getQualityLevel() === 'low') {
    createParticle({ x, y, color: '#F44336', shape: 'spark', count: 4, speed: 5, life: 20, size: 4 });
    return;
  }
  createParticle({ x, y, color: '#F44336', shape: 'spark', count: 10, speed: 5, life: 30, size: 4 });
  createParticle({ x, y, color: '#FF8A65', shape: 'spark', count: 5, speed: 3, life: 25, size: 3 });
}

export function emitHeartParticles(x, y) {
  if (getQualityLevel() === 'low') {
    createParticle({ x, y, color: '#FF69B4', shape: 'heart', count: 3, speed: 3, life: 30, size: 6 });
    return;
  }
  createParticle({ x, y, color: '#FF69B4', shape: 'heart', count: 8, speed: 3, life: 40, size: 6 });
  createParticle({ x, y, color: '#FFB6C1', shape: 'heart', count: 4, speed: 2, life: 35, size: 4 });
}

export function emitComboTrail(x, y) {
  if (getQualityLevel() === 'low') return; // skip on low-end

  const colors = ['#FF6600', '#FF9900', '#FFCC00', '#FF3300'];
  const count = getQualityLevel() === 'medium' ? 2 : 3;
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) break;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const p = acquireParticle();
    initParticle(
      p,
      x - 10 + (Math.random() - 0.5) * 8,
      y + (Math.random() - 0.5) * 14,
      -1.5 - Math.random() * 1.5,
      (Math.random() - 0.5) * 1.5,
      18 + Math.floor(Math.random() * 10),
      color, 'spark',
      2 + Math.random() * 3,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.3
    );
    p.maxLife = 28;
    particles.push(p);
  }
}

export function emitCoinParticles(x, y) {
  createParticle({ x, y, color: '#FFD700', shape: 'star', count: 6, speed: 2.5, life: 25, size: 3 });
}

export function emitConfetti(W) {
  const colors = ['#FF4081', '#FF6D00', '#FFD600', '#00E676', '#2979FF', '#D500F9', '#00BCD4', '#FF1744'];
  const quality = getQualityLevel();
  const count = quality === 'low' ? 15 : quality === 'medium' ? 25 : 40;
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) break;
    const color = colors[i % colors.length];
    const p = acquireParticle();
    initParticle(
      p,
      Math.random() * W,
      -10 - Math.random() * 40,
      (Math.random() - 0.5) * 3,
      1.5 + Math.random() * 2.5,
      90 + Math.floor(Math.random() * 40),
      color, 'confetti',
      4 + Math.random() * 4,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.3
    );
    p.maxLife = 130;
    particles.push(p);
  }
}

export function updateParticles(dt) {
  const dtFactor = dt || 1;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dtFactor;
    p.y += p.vy * dtFactor;
    p.vy += ((p.shape === 'confetti') ? 0.02 : 0.08) * dtFactor;
    p.life -= dtFactor;
    p.rotation += p.rotSpeed * dtFactor;
    if (p.life <= 0) {
      // Swap with last and pop for O(1) removal
      const last = particles[particles.length - 1];
      particles[i] = last;
      particles.pop();
      releaseParticle(p);
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
  if (particles.length === 0) return;

  // Batch: circles first (no save/restore needed)
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.shape !== 'circle') continue;
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }

  // Batch: stars (uses save/restore but grouped)
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.shape !== 'star') continue;
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    drawStar(ctx, p.x, p.y, p.size, p.rotation);
  }

  // Batch: hearts
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.shape !== 'heart') continue;
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    drawHeart(ctx, p.x, p.y, p.size, p.rotation);
  }

  // Batch: confetti + sparks (rotated rects)
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.shape !== 'confetti' && p.shape !== 'spark') continue;
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    if (p.shape === 'confetti') {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.fillRect(-p.size / 2, -1, p.size, 2);
      ctx.fillRect(-1, -p.size / 2, 2, p.size);
    }
    ctx.restore();
  }

  ctx.globalAlpha = 1;
}
