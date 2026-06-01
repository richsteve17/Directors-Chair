// ============================================================================
// Vercel serverless function — Gemini proxy.
// The GEMINI_API_KEY lives ONLY here (server-side env var), never in the
// browser bundle. The client POSTs { system, messages } in the app's
// Anthropic-style shape; we translate to Gemini's generateContent format and
// translate the response back to { text }.
//
// Configure in Vercel → Project → Settings → Environment Variables:
//   GEMINI_API_KEY   (required)
//   GEMINI_MODEL     (optional, default gemini-2.5-flash)
//   GEMINI_FALLBACK  (optional, comma list of fallback model ids)
//   MAX_TOKENS       (optional, default 4096)
//   TEMPERATURE      (optional, default 1.0 — higher = more distinct/varied voices)
// ============================================================================

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACKS = (process.env.GEMINI_FALLBACK || "gemini-2.0-flash,gemini-1.5-flash")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
// 4096 fits a full ~700-1000 word chapter weave (the longest call) as JSON with headroom.
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || "4096", 10);
const TEMPERATURE = parseFloat(process.env.TEMPERATURE || "1.0");

// Map our { role:"user"|"assistant", content } -> Gemini contents (role "model").
function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content ?? "") }],
  }));
}

function extractText(data) {
  const cand = data?.candidates?.[0];
  const parts = cand?.content?.parts;
  if (Array.isArray(parts)) return parts.map((p) => p?.text || "").join("").trim();
  return "";
}

async function callGemini(model, system, messages, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;
  const generationConfig = { maxOutputTokens: MAX_TOKENS, temperature: TEMPERATURE };
  // Gemini 2.5+ models do hidden "thinking" that is billed against maxOutputTokens.
  // On long generations (a full chapter weave) that reasoning can consume the entire
  // budget and return an EMPTY candidate (finishReason MAX_TOKENS) with no prose —
  // which is why every chapter was falling back to the "could not be rendered"
  // placeholder. Disable thinking on those models so the whole budget goes to output.
  if (/gemini-(2\.5|3\.|3-)/.test(model)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: toGeminiContents(messages),
    generationConfig,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
    signal,
  });
  return res;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  // Vercel parses JSON bodies automatically, but be defensive.
  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return res.status(400).json({ error: "invalid JSON body" });
    }
  }
  const { system, messages } = payload || {};
  if (!system || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Request must include `system` and a non-empty `messages` array." });
  }

  const models = [DEFAULT_MODEL, ...FALLBACKS];
  let lastDetail = "";

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const upstream = await callGemini(model, system, messages);

      if (upstream.status === 429) {
        const ra = upstream.headers.get("retry-after");
        if (ra) res.setHeader("retry-after", ra);
        const detail = await upstream.text();
        return res.status(429).json({ error: "rate_limited", detail: detail.slice(0, 300) });
      }

      if ((upstream.status === 404 || upstream.status === 400) && i < models.length - 1) {
        // Unknown/retired model id (Gemini may return 404 or 400) — try the next fallback.
        lastDetail = await upstream.text();
        continue;
      }

      if (!upstream.ok) {
        const detail = await upstream.text();
        return res.status(upstream.status).json({ error: "upstream_error", detail: detail.slice(0, 500) });
      }

      const data = await upstream.json();
      const text = extractText(data);
      if (!text) {
        // Safety block or empty candidate (e.g. thinking ate the whole budget).
        const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || "empty";
        // Give the next model a shot before giving up — a different model may not
        // hit the same empty/thinking edge on this prompt.
        if (i < models.length - 1) {
          lastDetail = `empty_response:${String(reason).slice(0, 120)}`;
          continue;
        }
        return res.status(502).json({ error: "empty_response", detail: String(reason).slice(0, 200) });
      }
      return res.status(200).json({ text, model });
    } catch (e) {
      lastDetail = String(e?.message || e);
      if (i < models.length - 1) continue;
      return res.status(502).json({ error: "proxy_failure", detail: lastDetail.slice(0, 300) });
    }
  }

  return res.status(502).json({ error: "all_models_failed", detail: lastDetail.slice(0, 300) });
}
