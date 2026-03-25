// ============================================================
// PERFORMANCE MONITOR & ADAPTIVE QUALITY (OPTIMIZED)
// ============================================================

const FRAME_HISTORY_SIZE = 60;
const LOW_FPS_THRESHOLD = 45;
const CRITICAL_FPS_THRESHOLD = 30;

// Ring buffer instead of array slice
const frameTimestamps = new Float64Array(FRAME_HISTORY_SIZE);
let frameHead = 0;
let frameCount = 0;
let currentFps = 60;
let qualityLevel = 'high'; // 'high', 'medium', 'low'
let devMode = false;

// Frame throttle: when true, skip render but still update physics
let shouldSkipRender = false;
let skipFrameCounter = 0;

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

export function getShouldSkipRender() {
  return shouldSkipRender;
}

export function updatePerfmon(timestamp) {
  frameTimestamps[frameHead] = timestamp;
  frameHead = (frameHead + 1) % FRAME_HISTORY_SIZE;
  if (frameCount < FRAME_HISTORY_SIZE) frameCount++;

  if (frameCount >= 2) {
    // Oldest and newest timestamps in ring buffer
    const oldestIdx = frameCount < FRAME_HISTORY_SIZE ? 0 : frameHead;
    const newestIdx = (frameHead - 1 + FRAME_HISTORY_SIZE) % FRAME_HISTORY_SIZE;
    const elapsed = frameTimestamps[newestIdx] - frameTimestamps[oldestIdx];
    if (elapsed > 0) {
      currentFps = Math.round(((frameCount - 1) / elapsed) * 1000);
    }
  }

  // Track slow frames for dev mode
  if (devMode && frameCount >= 2) {
    const prevIdx = (frameHead - 2 + FRAME_HISTORY_SIZE) % FRAME_HISTORY_SIZE;
    const currIdx = (frameHead - 1 + FRAME_HISTORY_SIZE) % FRAME_HISTORY_SIZE;
    const lastFrameTime = frameTimestamps[currIdx] - frameTimestamps[prevIdx];
    if (lastFrameTime > 32) {
      console.log(`[perf] slow frame: ${lastFrameTime.toFixed(1)}ms`);
    }
  }

  // Adaptive quality: downgrade if consistently slow
  if (frameCount >= 30) {
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

  // Frame throttle: if FPS < 30, skip every other render for consistent 30fps
  if (qualityLevel === 'low' && currentFps < 30) {
    skipFrameCounter++;
    shouldSkipRender = (skipFrameCounter % 2 === 1);
  } else {
    shouldSkipRender = false;
    skipFrameCounter = 0;
  }
}

// Pre-allocated string to avoid per-frame concatenation
let fpsDisplayStr = '';
let lastDisplayedFps = -1;
let lastDisplayedQuality = '';

export function drawFpsCounter(ctx, W) {
  if (!devMode) return;

  // Only rebuild string when values change
  if (currentFps !== lastDisplayedFps || qualityLevel !== lastDisplayedQuality) {
    fpsDisplayStr = currentFps + ' FPS [' + qualityLevel + ']';
    lastDisplayedFps = currentFps;
    lastDisplayedQuality = qualityLevel;
  }

  const color = currentFps >= 50 ? '#4CAF50' : currentFps >= 30 ? '#FF9800' : '#F44336';
  ctx.font = '12px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(fpsDisplayStr, W - 8, 4);
}
