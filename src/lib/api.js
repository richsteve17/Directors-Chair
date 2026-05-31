// ============================================================================
// API client. Talks to OUR serverless proxy (/api/message), which holds the
// GEMINI_API_KEY server-side. The key is NEVER in the browser bundle. Supports
// AbortSignal so in-flight requests cancel on navigation (Fix #6), with backoff
// retries and rate-limit surfacing.
// ============================================================================

const ENDPOINT = (import.meta?.env?.VITE_API_BASE || "") + "/api/message";

class RateLimitError extends Error {
  constructor(message, retryAfterMs) {
    super(message);
    this.rateLimited = true;
    this.retryAfterMs = retryAfterMs;
  }
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    if (signal) {
      if (signal.aborted) {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true }
      );
    }
  });

// One delay per gap between attempts; no double-sleep on the rate-limit path.
const BACKOFF = [1000, 2000, 4000, 8000, 16000, 30000];
const MAX_ATTEMPTS = BACKOFF.length + 1;

export async function callAPI(system, messages, { signal } = {}) {
  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, messages }),
        signal,
      });

      if (res.status === 429) {
        let wait = 20000;
        const ra = res.headers.get("retry-after");
        if (ra) {
          const secs = parseInt(ra, 10);
          if (!Number.isNaN(secs)) wait = Math.min(secs * 1000, 60000);
        }
        lastError = new RateLimitError("RATE_LIMIT", wait);
        if (attempt < MAX_ATTEMPTS - 1) {
          await sleep(wait, signal);
          continue;
        }
        throw lastError;
      }

      if (!res.ok) {
        let body = "";
        try {
          body = await res.text();
        } catch {
          /* ignore */
        }
        throw new Error(`HTTP ${res.status} — ${body.slice(0, 300)}`);
      }

      const data = await res.json();
      const text = (data.text || "").trim();
      if (!text) throw new Error("empty response from proxy");
      return text;
    } catch (e) {
      if (e && e.name === "AbortError") throw e; // navigation cancelled — bail
      lastError = e;
      if (attempt < MAX_ATTEMPTS - 1) {
        if (!(e && e.rateLimited)) await sleep(BACKOFF[attempt], signal);
      }
    }
  }
  throw lastError;
}

export { RateLimitError };
