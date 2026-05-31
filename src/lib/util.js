export const hashStr = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

// Split text into <~maxLen chunks on sentence boundaries (Fix #11 — Chrome cuts
// speechSynthesis utterances after ~15s, so we feed it in pieces).
export function chunkForSpeech(text, maxLen = 180) {
  const clean = String(text || "").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) || [clean];
  const chunks = [];
  let cur = "";
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if ((cur + " " + piece).trim().length > maxLen && cur) {
      chunks.push(cur.trim());
      cur = piece;
    } else {
      cur = (cur + " " + piece).trim();
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks;
}

// Trigger a client-side file download from text content.
export function downloadText(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function stamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
