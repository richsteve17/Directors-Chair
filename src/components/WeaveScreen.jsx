import React from "react";
import { wrapStyle, innerStyle, SANS, ACCENT, STEEL, TEXT } from "../styles/tokens.js";

export default function WeaveScreen({ state, onForceFinish, onReweave }) {
  const { run, weaveIdx, loading } = state;
  const allWoven = run.length > 0 && run.every((c) => c.woven);
  return (
    <div style={wrapStyle}>
      <div style={innerStyle}>
        <div style={{ fontSize: 12, letterSpacing: 3, color: STEEL, textTransform: "uppercase", fontFamily: SANS }}>
          Cutting the film
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: "4px 0 18px" }}>The Edit</h2>
        <div aria-live="polite">
          {run.map((c, i) => (
            <div key={i} style={{ marginBottom: 14, opacity: c.woven ? 1 : 0.45 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: SANS }}>
                <span style={{ fontSize: 14, color: c.woven ? ACCENT : STEEL }}>
                  {c.woven ? "●" : i === weaveIdx ? "◍" : "○"}
                </span>
                <span style={{ fontSize: 14.5, color: TEXT }}>
                  {c.director} — “{c.album}”
                </span>
              </div>
              {i === weaveIdx && loading && !c.woven && (
                <div style={{ fontSize: 13, color: STEEL, fontStyle: "italic", paddingLeft: 23, fontFamily: SANS }}>writing…</div>
              )}
              {c.woven && (
                <div style={{ fontSize: 13, color: STEEL, paddingLeft: 23, fontFamily: SANS }}>{c.woven.chapterTitle}</div>
              )}
            </div>
          ))}
        </div>
        {loading && weaveIdx >= run.length && (
          <div style={{ fontSize: 14, color: STEEL, fontStyle: "italic", fontFamily: SANS, marginTop: 10 }}>
            Titling the film…
          </div>
        )}

        {/* Escape hatch: if the weave ever parks here, never trap the user without controls. */}
        {allWoven && (
          <div style={{ marginTop: 26, paddingTop: 20, borderTop: `1px solid ${STEEL}33` }}>
            <button
              onClick={onForceFinish}
              disabled={loading}
              style={{
                fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "#1a1714",
                background: "#d9b88f", border: "none", borderRadius: 10, padding: "13px 24px",
                cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1,
              }}
            >
              Finish the film →
            </button>
            <button
              onClick={onReweave}
              disabled={loading}
              style={{
                fontFamily: SANS, fontSize: 14, fontWeight: 600, color: STEEL,
                background: "transparent", border: `1px solid ${STEEL}`, borderRadius: 10,
                padding: "12px 20px", marginLeft: 10,
                cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1,
              }}
            >
              Re-weave
            </button>
            <div style={{ fontSize: 12, color: STEEL, fontFamily: SANS, marginTop: 10, lineHeight: 1.5 }}>
              All chapters are woven. Tap to name the film and view it — or re-weave from your saved interviews.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
