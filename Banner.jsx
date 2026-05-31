import React from "react";
import { SANS, ACCENT } from "../styles/tokens.js";

// Status / error banner with an assertive live region so screen readers announce
// failures and rate-limit notices (Fix #9).
export default function Banner({ children, style }) {
  if (!children) return null;
  return (
    <div
      role="status"
      aria-live="assertive"
      style={{
        background: "#2a1d12",
        border: `1px solid ${ACCENT}`,
        borderRadius: 8,
        padding: "10px 12px",
        fontFamily: SANS,
        fontSize: 13.5,
        lineHeight: 1.5,
        color: "#f0d9c4",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
