import React from "react";
import { SANS, STEEL, BG, BORDER } from "../styles/tokens.js";

// Persistent, quiet crisis-resources footer (Fix #12). The catalog deals with
// documented suicide/addiction material; a calm, always-present link is the
// responsible default and helps with platform review.
export default function CrisisFooter() {
  return (
    <footer
      role="contentinfo"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(10,12,14,0.94)",
        borderTop: `1px solid ${BORDER}`,
        padding: "8px 14px",
        textAlign: "center",
        fontFamily: SANS,
        fontSize: 12,
        color: STEEL,
        backdropFilter: "blur(4px)",
        zIndex: 50,
      }}
    >
      This film touches addiction & suicide. If you need support:{" "}
      <a href="tel:988" style={{ color: "#e2b48c", fontWeight: 700, textDecoration: "none" }}>
        Call or text 988
      </a>{" "}
      (US Suicide &amp; Crisis Lifeline) ·{" "}
      <a
        href="https://988lifeline.org/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#e2b48c", textDecoration: "none" }}
      >
        988lifeline.org
      </a>
    </footer>
  );
}
