// ============================================================================
// Portable persistence (Fix #2). The original relied on `window.storage`, a
// sandbox-only async API. This wrapper prefers that if present, then falls back
// to localStorage, then to an in-memory map (so the app never throws even in
// private-mode / disabled-storage environments — it just won't persist).
// ============================================================================

const memory = new Map();

function hasWindowStorage() {
  return typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";
}

function hasLocalStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const k = "__cmass_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export const storageBackend = hasWindowStorage()
  ? "window.storage"
  : hasLocalStorage()
  ? "localStorage"
  : "memory";

export async function loadState(key) {
  try {
    if (storageBackend === "window.storage") {
      const res = await window.storage.get(key);
      return res && res.value ? JSON.parse(res.value) : null;
    }
    if (storageBackend === "localStorage") {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }
    const raw = memory.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveState(key, value) {
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  try {
    if (storageBackend === "window.storage") {
      await window.storage.set(key, payload);
      return true;
    }
    if (storageBackend === "localStorage") {
      window.localStorage.setItem(key, payload);
      return true;
    }
    memory.set(key, payload);
    return true;
  } catch {
    return false;
  }
}

export async function deleteState(key) {
  try {
    if (storageBackend === "window.storage") {
      await window.storage.delete(key);
    } else if (storageBackend === "localStorage") {
      window.localStorage.removeItem(key);
    } else {
      memory.delete(key);
    }
  } catch {
    /* ignore */
  }
}
