// Robust extraction of a JSON object from an LLM response. (Fix #8)
// LLMs wrap JSON in ```fences```, add prose, or emit trailing commas. We strip
// fences, then scan for the first *balanced* {...} block (brace-aware, string &
// escape aware) rather than trusting a naive regex.

export function stripFences(raw) {
  if (!raw) return "";
  return String(raw)
    .replace(/^\uFEFF/, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// Returns the first balanced {...} substring, or null.
export function firstBalancedObject(s) {
  if (!s) return null;
  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

// Best-effort parse: try clean parse, then balanced-object extraction, then a
// trailing-comma cleanup. Returns `fallback` if everything fails.
export function safeParse(raw, fallback = null) {
  const cleaned = stripFences(raw);
  // 1) straight parse
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through */
  }
  // 2) balanced object
  const block = firstBalancedObject(cleaned);
  if (block) {
    try {
      return JSON.parse(block);
    } catch {
      // 3) strip trailing commas, retry
      try {
        return JSON.parse(block.replace(/,\s*([}\]])/g, "$1"));
      } catch {
        /* fall through */
      }
    }
  }
  return fallback;
}
