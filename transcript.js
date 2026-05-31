// ============================================================================
// Transcript helpers. The `transcript` array is the SINGLE source of truth for
// each chapter (Fix #5 — the old parallel `convo` state is gone). We derive the
// Anthropic `messages` array from it on demand.
// ============================================================================

// Convert a chapter transcript into Anthropic-style messages.
// Director turns are `assistant`; Steve's turns are `user`.
// A leading "[begin]" user message is required so the first assistant turn has
// a prompt to answer.
export function transcriptToMessages(transcript, { closingHint = false } = {}) {
  const msgs = [{ role: "user", content: "[The interview begins. Greet him in your voice and ask your first question.]" }];
  for (const t of transcript) {
    if (t.who === "director") msgs.push({ role: "assistant", content: t.text });
    else msgs.push({ role: "user", content: t.text });
  }
  // If we're nudging the director to close, append the hint to the last user turn.
  if (closingHint) {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        msgs[i] = {
          ...msgs[i],
          content: msgs[i].content + " (He has answered many questions now — find your closing and set done true.)",
        };
        break;
      }
    }
  }
  return msgs;
}

export function countAnswers(transcript) {
  return (transcript || []).filter((t) => t.who === "you").length;
}

// --- Export builder (.txt) --------------------------------------------------
export function buildExportText(run, docMeta, now = new Date()) {
  const lines = [];
  lines.push("CMASS — THE DIRECTOR'S GAUNTLET");
  if (docMeta?.title) lines.push(`Film title: ${docMeta.title}`);
  if (docMeta?.logline) lines.push(`Logline: ${docMeta.logline}`);
  lines.push(`Exported: ${now.toString()}`);
  lines.push("=".repeat(60));
  lines.push("");

  run.forEach((c, i) => {
    lines.push(`CHAPTER ${i + 1} — ${c.album}`);
    lines.push(`Director: ${c.director}${c.reflection ? `  (closing by ${c.reflection})` : ""}`);
    lines.push("-".repeat(60));
    if (c.transcript && c.transcript.length) {
      c.transcript.forEach((t) => {
        lines.push(t.who === "you" ? `STEVE: ${t.text}` : `${c.director.toUpperCase()}: ${t.text}`);
        lines.push("");
      });
    } else {
      lines.push("(no interview recorded for this chapter)");
      lines.push("");
    }
    if (c.woven) {
      lines.push(`>>> WOVEN CHAPTER — "${c.woven.chapterTitle || c.album}"`);
      lines.push(c.woven.prose || "");
      lines.push("");
    }
    lines.push("=".repeat(60));
    lines.push("");
  });

  return lines.join("\n");
}
