import React from "react";
import { wrapStyle, innerStyle, SANS, ACCENT, STEEL, TEXT } from "../styles/tokens.js";

export default function WeaveScreen({ state }) {
  const { run, weaveIdx, loading } = state;
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
      </div>
    </div>
  );
}
