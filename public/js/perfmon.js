// ============================================================
// PERFORMANCE MONITOR & ADAPTIVE QUALITY
// ============================================================

const FRAME_HISTORY_SIZE = 60;
const LOW_FPS_THRESHOLD = 45;
const CRITICAL_FPS_THRESHOLD = 30;

let frameTimestamps = [];
let currentFps = 60;
let qualityLevel = 'high'; // 'high', 'medium', 'low'
let devMode = false;
let slowFrameCount = 0;

// Detect dev mode from URL param: ?dev=1
try {
  devMode = new URLSearchParams(window.location.search).has('dev');
} catch (_e) { /* noop */ }

export function getQualityLevel() {
  return qualityLevel;
}

export function getFps() {
  return currentFps;
}

export function isLowEnd() {
  return qualityLevel !== 'high';
}

export function updatePerfmon(timestamp) {
  frameTimestamps.push(timestamp);

  // Keep only last N frames
  if (frameTimestamps.length > FRAME_HISTORY_SIZE) {
    frameTimestamps = frameTimestamps.slice(-FRAME_HISTORY_SIZE);
  }

  if (frameTimestamps.length >= 2) {
    const elapsed = frameTimestamps[frameTimestamps.length - 1] - frameTimestamps[0];
    if (elapsed > 0) {
      currentFps = Math.round(((frameTimestamps.length - 1) / elapsed) * 1000);
    }
  }

  // Track slow frames
  if (frameTimestamps.length >= 2) {
    const lastFrameTime = frameTimestamps[frameTimestamps.length - 1] - frameTimestamps[frameTimestamps.length - 2];
    if (lastFrameTime > 32) {
      slowFrameCount++;
      if (devMode) {
        console.log(`[perf] slow frame: ${lastFrameTime.toFixed(1)}ms`);
      }
    }
  }

  // Adaptive quality: downgrade if consistently slow
  if (frameTimestamps.length >= 30) {
    if (currentFps < CRITICAL_FPS_THRESHOLD) {
      qualityLevel = 'low';
    } else if (currentFps < LOW_FPS_THRESHOLD) {
      qualityLevel = 'medium';
    } else {
      // Slowly upgrade back (only after sustained good performance)
      if (qualityLevel === 'low' && currentFps > LOW_FPS_THRESHOLD + 10) {
        qualityLevel = 'medium';
      } else if (qualityLevel === 'medium' && currentFps > 55) {
        qualityLevel = 'high';
      }
    }
  }
}

export function drawFpsCounter(ctx, W) {
  if (!devMode) return;

  const color = currentFps >= 50 ? '#4CAF50' : currentFps >= 30 ? '#FF9800' : '#F44336';
  ctx.font = '12px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(`${currentFps} FPS [${qualityLevel}]`, W - 8, 4);
}
