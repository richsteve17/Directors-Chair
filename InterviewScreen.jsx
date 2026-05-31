import React, { useRef, useEffect } from "react";
import {
  wrapStyle, innerStyle, SANS, ACCENT, STEEL, PANEL, PANEL_2, BORDER, TEXT, btnPrimary,
} from "../styles/tokens.js";
import Banner from "./Banner.jsx";

function SpeakerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export default function InterviewScreen({
  state, dispatch, speechOK, onAnswer, onSpeak, onStopAudio, onSave, onBackToStart, onEndStage, onNextStage, onRetryOpen, hasAnyTranscript,
}) {
  const { run, ci, loading, stageClosed, banner, input, ttsOn } = state;
  const scrollRef = useRef(null);
  const c = run[ci];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [run, ci, loading, stageClosed]);

  if (!c) return null;
  const next = ci + 1 < run.length ? run[ci + 1] : null;

  return (
    <div style={wrapStyle}>
      <div style={innerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 11, letterSpacing: 2, color: STEEL, textTransform: "uppercase", fontFamily: SANS }}>
            Stage {ci + 1} / {run.length}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onSave}
              disabled={!hasAnyTranscript}
              title="Download a save file you can load back to resume here"
              style={{ fontSize: 11, background: "transparent", color: hasAnyTranscript ? ACCENT : STEEL, border: `1px solid ${hasAnyTranscript ? ACCENT : BORDER}`, borderRadius: 4, padding: "4px 8px", cursor: hasAnyTranscript ? "pointer" : "default", fontFamily: SANS, opacity: hasAnyTranscript ? 1 : 0.5 }}
            >
              Save
            </button>
            <button
              onClick={onBackToStart}
              disabled={loading}
              style={{ fontSize: 11, background: "transparent", color: STEEL, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontFamily: SANS, opacity: loading ? 0.5 : 1 }}
            >
              Back to Start
            </button>
            {speechOK && (
              <button onClick={onStopAudio} style={{ fontSize: 11, background: "transparent", color: STEEL, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontFamily: SANS }}>
                Stop Audio
              </button>
            )}
          </div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, margin: 0 }}>
          {c.director}
          {c.reflection ? <span style={{ color: STEEL, fontWeight: 600 }}> × {c.reflection}</span> : null}
        </h2>
        <div style={{ fontSize: 14, color: ACCENT, fontFamily: SANS, marginBottom: 18 }}>on “{c.album}”</div>

        <div
          ref={scrollRef}
          aria-live="polite"
          aria-label={`Interview with ${c.director}`}
          style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "52vh", overflowY: "auto", paddingRight: 4, marginBottom: 16 }}
        >
          {c.transcript.map((t, i) =>
            t.who === "director" ? (
              <div key={i} style={{ borderLeft: `3px solid ${ACCENT}`, paddingLeft: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 10.5, letterSpacing: 1, color: ACCENT, textTransform: "uppercase", fontFamily: SANS }}>
                    {c.director}
                  </div>
                  {speechOK && ttsOn && (
                    <button
                      onClick={() => onSpeak(t.text, c.director)}
                      title="Replay voice"
                      aria-label={`Replay ${c.director}'s line aloud`}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: ACCENT, padding: 0, display: "flex" }}
                    >
                      <SpeakerIcon />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 16.5, lineHeight: 1.5, fontStyle: "italic", color: "#e7e2d8", whiteSpace: "pre-wrap" }}>
                  {t.text}
                </div>
              </div>
            ) : (
              <div key={i} style={{ alignSelf: "flex-end", maxWidth: "85%", background: PANEL_2, borderRadius: 12, padding: "10px 14px" }}>
                <div style={{ fontSize: 10.5, letterSpacing: 1, color: STEEL, textTransform: "uppercase", fontFamily: SANS, marginBottom: 3 }}>You</div>
                <div style={{ fontSize: 15.5, lineHeight: 1.45, fontFamily: SANS, whiteSpace: "pre-wrap", color: TEXT }}>{t.text}</div>
              </div>
            )
          )}
          {loading && (
            <div style={{ fontSize: 14, color: STEEL, fontStyle: "italic", paddingLeft: 13, fontFamily: SANS }}>
              {c.director} is thinking…
            </div>
          )}
        </div>

        {banner && (
          <Banner style={{ marginBottom: 12 }}>
            <div>{banner}</div>
            {c.transcript.length === 0 && (
              <button
                onClick={onRetryOpen}
                disabled={loading}
                style={{ ...btnPrimary, marginTop: 10, padding: "9px 16px", fontSize: 13.5, opacity: loading ? 0.5 : 1 }}
              >
                Try this question again
              </button>
            )}
          </Banner>
        )}

        {!stageClosed ? (
          <>
            <label htmlFor="answer-box" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              Your answer
            </label>
            <textarea
              id="answer-box"
              value={input}
              onChange={(e) => dispatch({ type: "SET_INPUT", value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onAnswer();
                }
              }}
              placeholder="Answer in your own words…"
              rows={3}
              style={{ width: "100%", background: PANEL, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, fontSize: 15.5, fontFamily: SANS, outline: "none", resize: "vertical", lineHeight: 1.45, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={onAnswer} disabled={loading || !input.trim()} style={{ ...btnPrimary, flex: 1, opacity: loading || !input.trim() ? 0.5 : 1 }}>
                Answer
              </button>
              <button onClick={onEndStage} disabled={loading} style={{ background: "transparent", color: STEEL, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "13px 16px", fontSize: 13.5, fontFamily: SANS, cursor: "pointer" }}>
                End this interview
              </button>
            </div>
          </>
        ) : (
          <div style={{ background: "#101418", border: "1px solid #232a31", borderRadius: 10, padding: 18, textAlign: "center", fontFamily: SANS }}>
            <div style={{ fontSize: 13, color: STEEL, marginBottom: 4 }}>Stage {ci + 1} complete.</div>
            <div style={{ fontSize: 16, marginBottom: 16, color: TEXT }}>
              {next ? (
                <>Next: <b>{next.director}</b> on “{next.album}”</>
              ) : (
                <>Every director has spoken. Time to cut the film.</>
              )}
            </div>
            <button onClick={onNextStage} disabled={loading} style={{ ...btnPrimary, padding: "13px 26px" }}>
              {next ? "Sit with the next director" : "Weave the Documentary"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
