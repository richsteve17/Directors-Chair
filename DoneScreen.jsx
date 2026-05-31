import React from "react";
import { wrapStyle, innerStyle, SANS, ACCENT, STEEL, BORDER, TEXT, btnPrimary, btnGhost } from "../styles/tokens.js";
import Banner from "./Banner.jsx";

export default function DoneScreen({ state, onExportTxt, onExportSave, onReset }) {
  const { run, docMeta, banner } = state;
  return (
    <div style={wrapStyle}>
      <div style={innerStyle}>
        <div style={{ textAlign: "center", borderBottom: `2px solid ${ACCENT}`, paddingBottom: 26, marginBottom: 30 }}>
          <div style={{ fontSize: 12, letterSpacing: 3, color: STEEL, textTransform: "uppercase", fontFamily: SANS }}>
            A Documentary in {run.length} Voices
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1, margin: "10px 0" }}>{docMeta?.title || "CMASS"}</h1>
          {docMeta?.logline && (
            <div style={{ fontSize: 16, color: "#bdb8ad", fontStyle: "italic", lineHeight: 1.5, maxWidth: 480, margin: "0 auto" }}>
              {docMeta.logline}
            </div>
          )}
        </div>

        {run.map(
          (c, i) =>
            c.woven && (
              <article key={i} style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: STEEL, textTransform: "uppercase", fontFamily: SANS }}>
                  Chapter {i + 1} · {c.album}
                </div>
                <h2 style={{ fontSize: 25, fontWeight: 800, lineHeight: 1.15, margin: "5px 0 3px" }}>{c.woven.chapterTitle}</h2>
                <div style={{ fontSize: 13, color: ACCENT, fontFamily: SANS, marginBottom: 16 }}>
                  Directed by {c.director}
                  {c.reflection ? ` · closing by ${c.reflection}` : ""}
                </div>
                {c.woven.prose.split(/\n\n+/).map((p, j) => (
                  <p key={j} style={{ fontSize: 17, lineHeight: 1.7, margin: "0 0 16px", color: "#e7e2d8" }}>
                    {p}
                  </p>
                ))}
                {i < run.length - 1 && (
                  <div style={{ textAlign: "center", color: STEEL, fontSize: 18, marginTop: 24 }}>· · ·</div>
                )}
              </article>
            )
        )}

        <div style={{ textAlign: "center", marginTop: 40, paddingTop: 30, borderTop: `1px solid ${BORDER}`, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onExportTxt} style={{ ...btnPrimary, padding: "12px 24px", fontSize: 14 }}>Save the Film (.txt)</button>
          <button onClick={onExportSave} style={{ ...btnGhost, padding: "12px 24px", fontSize: 14 }}>Save File (.json)</button>
          <button onClick={onReset} style={{ background: "transparent", color: STEEL, border: `1px solid ${STEEL}`, borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, fontFamily: SANS, cursor: "pointer" }}>
            Begin a New Gauntlet
          </button>
        </div>

        {banner && <Banner style={{ marginTop: 16, textAlign: "center" }}>{banner}</Banner>}
      </div>
    </div>
  );
}
