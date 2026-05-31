// ============================================================================
// Design tokens — the single source of styling truth. The app styles inline
// (no CSS file): components import these color/typography constants and the
// shared style objects below, then spread/extend them as needed.
// ============================================================================

// localStorage key for the persisted gauntlet state.
export const STORE_KEY = "cmass-gauntlet-state-v3";

// --- Typography -------------------------------------------------------------
// UI chrome (labels, buttons) uses SANS; headings and woven prose inherit the
// serif set on `wrapStyle` for an editorial, documentary feel.
export const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';

// --- Palette (dark, cinematic) ---------------------------------------------
export const BG = "#0a0c0e"; // page background (matches index.html)
export const PANEL = "#101418"; // input / quiet surface
export const PANEL_2 = "#161b20"; // chips, secondary surface
export const BORDER = "#232a31"; // hairline borders
export const TEXT = "#e7e2d8"; // primary readable text
export const STEEL = "#8b94a0"; // muted secondary text
export const STEEL_DIM = "#5b636d"; // faintest text / dividers
export const ACCENT = "#e2b48c"; // warm amber highlight

// --- Shared style objects ---------------------------------------------------
export const wrapStyle = {
  minHeight: "100vh",
  width: "100%",
  background: BG,
  color: TEXT,
  fontFamily: SERIF,
  padding: "32px 20px 88px",
  boxSizing: "border-box",
};

export const innerStyle = {
  maxWidth: 640,
  margin: "0 auto",
};

export const btnPrimary = {
  background: ACCENT,
  color: "#15110b",
  border: "none",
  borderRadius: 8,
  padding: "13px 18px",
  fontSize: 15,
  fontWeight: 700,
  fontFamily: SANS,
  cursor: "pointer",
  lineHeight: 1.2,
};

export const btnGhost = {
  background: "transparent",
  color: TEXT,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "13px 18px",
  fontSize: 15,
  fontWeight: 600,
  fontFamily: SANS,
  cursor: "pointer",
  lineHeight: 1.2,
};
