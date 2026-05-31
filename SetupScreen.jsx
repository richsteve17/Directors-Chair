import React, { useRef } from "react";
import { ALBUMS, ALBUM_DATA, FINALE_ALBUM } from "../data/albums.js";
import {
  wrapStyle, innerStyle, SANS, ACCENT, STEEL, STEEL_DIM, PANEL_2, btnPrimary, btnGhost, TEXT,
} from "../styles/tokens.js";
import Banner from "./Banner.jsx";

export default function SetupScreen({
  state, dispatch, speechOK, storageBackend, onBegin, onLoadSave, onReset, confirmReset, setConfirmReset,
}) {
  const fileInputRef = useRef(null);
  const { selected, ttsOn, banner } = state;
  const chosen = ALBUMS.filter((a) => selected[a]);
  const finaleOff = !selected[FINALE_ALBUM];

  return (
    <div style={wrapStyle}>
      <div style={innerStyle}>
        <div style={{ fontSize: 12, letterSpacing: 3, color: STEEL, textTransform: "uppercase", fontFamily: SANS }}>
          CMASS — The Documentary
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5, margin: "4px 0 8px" }}>
          The Director's Gauntlet
        </h1>
        <p style={{ fontSize: 15, color: "#bdb8ad", lineHeight: 1.55, marginBottom: 20, fontFamily: SANS }}>
          Sit across from each director in turn. They interview you about their era — pressing on the real songs,
          the politics, the wounds — and they remember everything you told the directors before them. At the end,
          every answer is woven into a narrative documentary chapter in their voice. The thirteenth chair is the
          machine itself.
        </p>

        {speechOK && (
          <label
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: 12, background: PANEL_2,
              borderRadius: 8, marginBottom: 14, fontFamily: SANS, cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={ttsOn}
              onChange={(e) => dispatch({ type: "SET_TTS", value: e.target.checked })}
              style={{ accentColor: ACCENT, width: 18, height: 18 }}
            />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: TEXT }}>Speak the directors aloud (browser voice)</span>
          </label>
        )}

        <div
          style={{
            fontSize: 12.5, lineHeight: 1.5, color: "#bdb8ad", fontFamily: SANS,
            background: PANEL_2, border: `1px solid ${STEEL_DIM}33`, borderRadius: 8,
            padding: "10px 12px", marginBottom: 16,
          }}
        >
          <b style={{ color: TEXT }}>Powered by Google Gemini.</b> The directors and the woven chapters are generated
          live by Gemini. Nothing to install and no key to enter — just start, and each director takes the chair.
        </div>

        <div
          style={{ fontSize: 11, letterSpacing: 1.5, color: ACCENT, textTransform: "uppercase", fontFamily: SANS, margin: "8px 0 10px" }}
        >
          Chapters in play
        </div>

        {ALBUMS.map((a) => (
          <label
            key={a}
            style={{
              display: "flex", alignItems: "center", gap: 11, padding: "9px 0",
              borderBottom: "1px solid #1a1e22", cursor: "pointer", fontFamily: SANS,
            }}
          >
            <input
              type="checkbox"
              checked={!!selected[a]}
              onChange={(e) => dispatch({ type: "TOGGLE_ALBUM", album: a, value: e.target.checked })}
              style={{ width: 17, height: 17, accentColor: ACCENT }}
            />
            <span style={{ flex: 1, fontSize: 15, color: a === FINALE_ALBUM ? ACCENT : "inherit" }}>{a}</span>
            <span style={{ fontSize: 12.5, color: STEEL }}>
              {ALBUM_DATA[a].director}
              {ALBUM_DATA[a].reflection ? ` × ${ALBUM_DATA[a].reflection}` : ""}
            </span>
          </label>
        ))}

        {/* Finale guard (Fix #16) */}
        {finaleOff && (
          <Banner style={{ marginTop: 14 }}>
            Heads up: “{FINALE_ALBUM}” (the closing chapter conducted by the machine itself) is deselected — you'll
            lose the whole machine/KNVX payoff. Re-check it unless you mean to skip it.
          </Banner>
        )}

        <button
          onClick={onBegin}
          disabled={chosen.length === 0}
          style={{ ...btnPrimary, width: "100%", marginTop: 18, padding: 15, fontSize: 17, opacity: chosen.length === 0 ? 0.5 : 1 }}
        >
          Begin the Gauntlet — {chosen.length} {chosen.length === 1 ? "chapter" : "chapters"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            onLoadSave(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{ ...btnGhost, width: "100%", marginTop: 10 }}
        >
          Load a Save File (.json) — resume where you left off
        </button>

        {banner && <Banner style={{ marginTop: 14 }}>{banner}</Banner>}

        <div style={{ marginTop: 30, fontSize: 11.5, color: STEEL_DIM, fontFamily: SANS, textAlign: "center" }}>
          Progress is saved via <b>{storageBackend}</b>
          {storageBackend === "memory" ? " (this session only — export a save to keep it)." : "."}
        </div>

        <div style={{ marginTop: 18, textAlign: "center", borderTop: "1px solid #1a1e22", paddingTop: 18 }}>
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              style={{ background: "transparent", color: STEEL, border: "none", fontSize: 12, fontFamily: SANS, textDecoration: "underline", cursor: "pointer" }}
            >
              Wipe saved progress
            </button>
          ) : (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", fontFamily: SANS }}>
              <span style={{ color: STEEL, fontSize: 13, alignSelf: "center" }}>Erase the saved film?</span>
              <button onClick={onReset} style={{ background: "#4a1c1c", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                Confirm
              </button>
              <button onClick={() => setConfirmReset(false)} style={{ background: "#2c333a", color: TEXT, border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
