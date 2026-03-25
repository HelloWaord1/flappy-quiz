// ============================================================
// OBJECT POOL — Reduces GC pressure by reusing objects
// ============================================================

const POOL_MAX = 200;

// Each pool: { inactive: [], active: [] }
const pools = {};

function getPool(name) {
  if (!pools[name]) {
    pools[name] = { inactive: [], active: [] };
  }
  return pools[name];
}

export function acquire(name, initFn) {
  const pool = getPool(name);
  let obj;
  if (pool.inactive.length > 0) {
    obj = pool.inactive.pop();
  } else {
    obj = {};
  }
  initFn(obj);
  obj._poolActive = true;
  pool.active.push(obj);
  return obj;
}

export function release(name, obj) {
  const pool = getPool(name);
  obj._poolActive = false;
  const idx = pool.active.indexOf(obj);
  if (idx !== -1) {
    pool.active.splice(idx, 1);
  }
  if (pool.inactive.length < POOL_MAX) {
    pool.inactive.push(obj);
  }
}

export function getActive(name) {
  const pool = getPool(name);
  return pool.active;
}

export function releaseAll(name) {
  const pool = getPool(name);
  while (pool.active.length > 0) {
    const obj = pool.active.pop();
    obj._poolActive = false;
    if (pool.inactive.length < POOL_MAX) {
      pool.inactive.push(obj);
    }
  }
}

// Sweep: release all items matching a predicate
export function sweep(name, predicate) {
  const pool = getPool(name);
  for (let i = pool.active.length - 1; i >= 0; i--) {
    if (predicate(pool.active[i])) {
      const obj = pool.active[i];
      obj._poolActive = false;
      pool.active.splice(i, 1);
      if (pool.inactive.length < POOL_MAX) {
        pool.inactive.push(obj);
      }
    }
  }
}
