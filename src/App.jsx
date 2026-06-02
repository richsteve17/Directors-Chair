import React, { useReducer, useEffect, useRef, useState, useCallback } from "react";
import { ALBUMS } from "./data/albums.js";
import { reducer, initialState, defaultSelected } from "./hooks/gauntletReducer.js";
import { callAPI } from "./lib/api.js";
import { safeParse } from "./lib/json.js";
import { interviewSystem, weaveSystem, finalizeSystem, buildContinuity } from "./lib/prompts.js";
import { transcriptToMessages, countAnswers, buildExportText } from "./lib/transcript.js";
import { loadState, saveState, deleteState, storageBackend } from "./lib/storage.js";
import { useSpeech } from "./hooks/useSpeech.js";
import { downloadText, stamp } from "./lib/util.js";
import { STORE_KEY, wrapStyle, SANS, STEEL } from "./styles/tokens.js";

import SetupScreen from "./components/SetupScreen.jsx";
import InterviewScreen from "./components/InterviewScreen.jsx";
import WeaveScreen from "./components/WeaveScreen.jsx";
import DoneScreen from "./components/DoneScreen.jsx";
import CrisisFooter from "./components/CrisisFooter.jsx";

// Parse a woven chapter from the model's reply. The weave is plain text
// ("TITLE: ...\n\n<prose>") because long prose inside JSON breaks on the literal
// newlines/quotes it contains. We still accept clean JSON if the model returns it.
function parseWeave(raw, fallbackTitle) {
  const text = String(raw || "").trim();
  if (!text) return null;
  // If the model happened to return valid JSON with prose, honor it.
  const j = safeParse(text, null);
  if (j && j.prose) return { chapterTitle: j.chapterTitle || fallbackTitle, prose: String(j.prose).trim() };
  // Plain text: an optional "TITLE: ..." first line, the rest is prose.
  const m = text.match(/^\s*TITLE:\s*(.+?)(?:\n|$)/i);
  if (m) {
    const prose = text.slice(m.index + m[0].length).trim();
    if (prose) return { chapterTitle: m[1].trim(), prose };
  }
  // No recognizable title line — treat the whole reply as the chapter prose.
  return { chapterTitle: fallbackTitle, prose: text };
}

// Serialisable slice of state we persist.
function persistable(s) {
  const { phase, selected, run, ci, stageClosed, weaveIdx, docMeta, ttsOn } = s;
  return { version: 2, phase, selected, run, ci, stageClosed, weaveIdx, docMeta, ttsOn };
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [hydrated, setHydrated] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const { speechOK, speak, stop: stopAudio } = useSpeech(state.ttsOn);

  // Abort controller for in-flight requests (Fix #6).
  const abortRef = useRef(null);
  const newAbort = () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  };
  const cancelInFlight = () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
  };

  // --- Hydrate on mount ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadState(STORE_KEY);
      if (!cancelled && saved) dispatch({ type: "HYDRATE", payload: saved });
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Persist on change ---
  useEffect(() => {
    if (!hydrated) return;
    saveState(STORE_KEY, persistable(state));
  }, [hydrated, state.phase, state.selected, state.run, state.ci, state.stageClosed, state.weaveIdx, state.docMeta, state.ttsOn]);

  // Cancel any request on unmount.
  useEffect(() => () => cancelInFlight(), []);

  // ---- Continuity for chapter idx (bounded digests, Fix #4) ----
  const continuityFor = useCallback((idx, run) => buildContinuity(run.slice(0, idx)), []);

  // ---- Open a chapter (first director turn) ----
  const openChapter = useCallback(
    async (idx, run) => {
      dispatch({ type: "OPEN_CHAPTER_START" });
      stopAudio();
      const signal = newAbort();
      try {
        const sys = interviewSystem(run[idx].album, continuityFor(idx, run));
        const msgs = transcriptToMessages([]); // empty transcript -> just the [begin] primer
        const out = await callAPI(sys, msgs, { signal });
        const parsed = safeParse(out, { speech: out, done: false });
        dispatch({ type: "OPEN_CHAPTER_OK", ci: idx, speech: parsed.speech });
        speak(parsed.speech, run[idx].director);
      } catch (err) {
        if (err && err.name === "AbortError") return;
        const banner = err && err.rateLimited
          ? "Rate limit hit — the API needs a short cooldown. Wait a minute, then tap “Try this question again.” Your progress is safe."
          : "Couldn't reach the director (" + String(err?.message || err).slice(0, 120) + "). Tap “Try this question again.”";
        dispatch({ type: "OPEN_CHAPTER_FAIL", banner });
      }
    },
    [continuityFor, speak, stopAudio]
  );

  const onBegin = useCallback(async () => {
    dispatch({ type: "BEGIN" });
  }, []);

  // After BEGIN sets the run, kick off chapter 0.
  const begunRef = useRef(false);
  useEffect(() => {
    if (state.phase === "interview" && state.run.length && state.run[0].transcript.length === 0 && !state.loading && !begunRef.current && !state.banner) {
      begunRef.current = true;
      openChapter(0, state.run);
    }
    if (state.phase !== "interview") begunRef.current = false;
  }, [state.phase, state.run, state.loading, state.banner, openChapter]);

  // ---- Answer ----
  const onAnswer = useCallback(async () => {
    const text = state.input.trim();
    if (!text || state.loading) return;
    stopAudio();

    // Optimistic append.
    dispatch({ type: "APPEND_ANSWER", text });

    // Build the messages from the (about-to-be) transcript.
    const ci = state.ci;
    const baseTranscript = [...state.run[ci].transcript, { who: "you", text }];
    const answersSoFar = countAnswers(baseTranscript);
    const msgs = transcriptToMessages(baseTranscript, { closingHint: answersSoFar >= 8 });
    const sys = interviewSystem(state.run[ci].album, continuityFor(ci, state.run));

    const signal = newAbort();
    try {
      const out = await callAPI(sys, msgs, { signal });
      const parsed = safeParse(out, { speech: out, done: false });
      dispatch({ type: "APPEND_DIRECTOR", speech: parsed.speech, done: !!parsed.done });
      speak(parsed.speech, state.run[ci].director);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      const banner = err && err.rateLimited
        ? "Rate limit hit — wait a minute and tap Answer again. Your words are back in the box and your progress is safe."
        : "That didn't go through (" + String(err?.message || err).slice(0, 120) + "). Your answer is back in the box — tap Answer to retry.";
      dispatch({ type: "ROLLBACK_ANSWER", text, banner });
    }
  }, [state.input, state.loading, state.ci, state.run, continuityFor, speak, stopAudio]);

  // ---- Navigation ----
  const onBackToStart = useCallback(() => {
    cancelInFlight();
    stopAudio();
    dispatch({ type: "TO_SETUP" });
  }, [stopAudio]);

  const onEndStage = useCallback(() => {
    cancelInFlight();
    stopAudio();
    dispatch({ type: "CLOSE_STAGE" });
  }, [stopAudio]);

  const onRetryOpen = useCallback(() => {
    dispatch({ type: "SET_BANNER", banner: "" });
    openChapter(state.ci, state.run);
  }, [openChapter, state.ci, state.run]);

  // ---- Weaving ----
  // Weave ONE chapter and record the result. Sequencing/finalize is handled by the
  // declarative weave driver effect below — no setTimeout chain (mobile Safari throttles
  // and kills long timer chains, which is why the run kept stalling and needing refreshes).
  const weaveOne = useCallback(async (idx, run) => {
    dispatch({ type: "WEAVE_PROGRESS", idx });
    const prev = idx > 0 ? run[idx - 1] : null;
    const prevTail = prev && prev.woven && !prev.woven.failed ? prev.woven.prose.slice(-160) : "";
    // Cap each turn so a giant pasted-lyrics block can't bloat the request past the
    // function timeout — the dialogue is what the weave needs, not 2000 lines of lyrics.
    const transcriptText = run[idx].transcript
      .map((t) => {
        const who = t.who === "you" ? "STEVE" : run[idx].director.toUpperCase();
        const txt = t.text.length > 1500 ? t.text.slice(0, 1500) + " […]" : t.text;
        return `${who}: ${txt}`;
      })
      .join("\n\n");

    let woven = null;
    const signal = newAbort();
    // Bound each chapter so it can't hang, but give a full chapter real room (~20-30s)
    // to generate. Sits just under the 60s function maxDuration.
    const timeout = (ms) => new Promise((r) => setTimeout(() => r({ __timedOut: true }), ms));
    try {
      const apiCall = callAPI(
        weaveSystem(run[idx].album, prev ? prev.director : null, prevTail),
        [{ role: "user", content: `Interview transcript:\n\n${transcriptText}\n\nWrite the chapter.` }],
        { signal }
      );
      apiCall.catch(() => {}); // swallow a late rejection if the timeout already won
      const out = await Promise.race([apiCall, timeout(55000)]);
      if (out && out.__timedOut) cancelInFlight();
      else woven = parseWeave(out, run[idx].album);
    } catch (err) {
      if (err && err.name === "AbortError") return; // navigated away — don't record
      // otherwise fall through to the placeholder below
    }
    if (!woven || !woven.prose) {
      woven = {
        chapterTitle: run[idx].album,
        failed: true,
        prose: `This chapter — ${run[idx].album}, in the voice of ${run[idx].director} — didn't render this pass. Steve's interview is saved; tap Re-weave to try it again.`,
      };
    }
    dispatch({ type: "WEAVE_OK", idx, woven });
  }, []);

  // ---- Finalize: name the film. Hard timeout so it can NEVER hang. ----
  // Previously a request that never resolved (no response, no error) left the await
  // waiting forever and the app stuck on "Cutting the film." This races the call
  // against an 18s timer; whichever wins, we always advance to the Done screen.
  const finalizeDoc = useCallback(async (run) => {
    dispatch({ type: "FINALIZE_START" });

    const FALLBACK = { title: "CMASS", logline: "A life told in many voices." };
    const signal = newAbort();
    const timeout = (ms) => new Promise((resolve) => setTimeout(() => resolve({ __timedOut: true }), ms));

    try {
      const titles = run
        .map((c) => `${c.album} (dir. ${c.director}): ${c.woven ? c.woven.chapterTitle : ""}`)
        .join("\n");
      const apiCall = callAPI(finalizeSystem(), [{ role: "user", content: titles }], { signal });
      const result = await Promise.race([apiCall, timeout(18000)]);

      if (result && result.__timedOut) {
        cancelInFlight();
        dispatch({ type: "FINALIZE_OK", docMeta: FALLBACK });
        return;
      }
      const parsed = safeParse(result, FALLBACK);
      dispatch({ type: "FINALIZE_OK", docMeta: parsed });
    } catch (err) {
      // Even on abort or error, never strand the user on the weave screen.
      dispatch({ type: "FINALIZE_OK", docMeta: FALLBACK });
    }
  }, []);

  // ---- Weave driver ----
  // Declarative engine that drives the whole weave. Whenever we're in the weaving phase
  // and idle, it weaves the next chapter that still needs one; when every chapter is done
  // it finalizes. Because it's a React effect keyed on state, it AUTO-RESUMES after any
  // interruption (a reload, a backgrounded tab that killed an in-flight call) with no
  // manual refresh, and it never cuts to the film until all chapters are truly done.
  const weavingRef = useRef(false); // a weave call is in flight this tick
  const attemptedRef = useRef(new Set()); // chapters tried THIS session (so a failing one doesn't loop)
  useEffect(() => {
    if (!hydrated || state.phase !== "weaving") {
      weavingRef.current = false;
      return;
    }
    if (state.loading || weavingRef.current || state.run.length === 0) return;
    // First chapter with no real prose yet that we haven't already tried this session.
    const next = state.run.findIndex(
      (c, i) => (!c.woven || c.woven.failed) && !attemptedRef.current.has(i)
    );
    weavingRef.current = true;
    (async () => {
      try {
        if (next === -1) await finalizeDoc(state.run);
        else {
          attemptedRef.current.add(next);
          await weaveOne(next, state.run);
        }
      } finally {
        weavingRef.current = false;
      }
    })();
  }, [hydrated, state.phase, state.loading, state.run, finalizeDoc, weaveOne]);

  // Force-finish from the weave screen: name the film with whatever is woven so far.
  const onForceFinish = useCallback(() => {
    cancelInFlight();
    attemptedRef.current = new Set();
    finalizeDoc(state.run);
  }, [state.run, finalizeDoc]);

  const onNextStage = useCallback(async () => {
    if (state.ci + 1 < state.run.length) {
      const n = state.ci + 1;
      dispatch({ type: "GOTO_CHAPTER", ci: n });
      await openChapter(n, state.run);
    } else {
      cancelInFlight();
      stopAudio();
      attemptedRef.current = new Set(); // fresh weave session
      dispatch({ type: "TO_WEAVING" }); // the weave driver effect takes it from here
    }
  }, [state.ci, state.run, openChapter, stopAudio]);

  // ---- Re-weave: re-run ONLY the weave step over the already-saved interviews. ----
  // Callable from the Done or weave screen. Your transcripts are untouched; TO_WEAVING
  // clears the woven chapters so the driver regenerates all of them from scratch.
  const onReweave = useCallback(() => {
    cancelInFlight();
    stopAudio();
    attemptedRef.current = new Set(); // fresh weave session — retry everything
    dispatch({ type: "TO_WEAVING" });
  }, [stopAudio]);

  // ---- Reset ----
  const onReset = useCallback(async () => {
    cancelInFlight();
    stopAudio();
    await deleteState(STORE_KEY);
    dispatch({ type: "RESET" });
    setConfirmReset(false);
  }, [stopAudio]);

  // ---- Save / Load files ----
  const onExportTxt = useCallback(() => {
    try {
      downloadText(`cmass-gauntlet-${stamp()}.txt`, buildExportText(state.run, state.docMeta));
      dispatch({ type: "SET_BANNER", banner: "Saved a .txt of everything so far to your device." });
    } catch {
      dispatch({ type: "SET_BANNER", banner: "Couldn't auto-download. Select the text above to copy it manually." });
    }
  }, [state.run, state.docMeta]);

  const onExportSave = useCallback(() => {
    try {
      downloadText(`cmass-gauntlet-SAVE-${stamp()}.json`, JSON.stringify(persistable(state)), "application/json");
      dispatch({ type: "SET_BANNER", banner: "Save file downloaded. Load it back any time to resume exactly here." });
    } catch {
      dispatch({ type: "SET_BANNER", banner: "Couldn't write the save file." });
    }
  }, [state]);

  const onLoadSave = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const s = safeParse(e.target.result, null);
          if (!s || !Array.isArray(s.run)) throw new Error("not a gauntlet save");
          cancelInFlight();
          stopAudio();
          const phase = s.phase && s.phase !== "setup" ? s.phase : s.run.length ? "interview" : "setup";
          dispatch({
            type: "LOAD_SAVE",
            state: {
              run: s.run,
              selected: s.selected || defaultSelected(),
              ci: typeof s.ci === "number" ? s.ci : 0,
              stageClosed: !!s.stageClosed,
              weaveIdx: typeof s.weaveIdx === "number" ? s.weaveIdx : 0,
              docMeta: s.docMeta || null,
              ttsOn: typeof s.ttsOn === "boolean" ? s.ttsOn : true,
              phase,
            },
          });
        } catch {
          dispatch({ type: "SET_BANNER", banner: "That file isn't a valid gauntlet save." });
        }
      };
      reader.onerror = () => dispatch({ type: "SET_BANNER", banner: "Couldn't read that file." });
      reader.readAsText(file);
    },
    [stopAudio]
  );

  const onSave = onExportSave;
  const hasAnyTranscript = state.run.some((c) => c.transcript && c.transcript.length);
  const showCrisisFooter = state.phase !== "setup" || ALBUMS.some((a) => state.selected[a]);

  if (!hydrated) {
    return (
      <div style={{ ...wrapStyle, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontFamily: SANS, color: STEEL, letterSpacing: 2, fontSize: 12 }}>LOADING ARCHIVE…</div>
      </div>
    );
  }

  return (
    <>
      {state.phase === "setup" && (
        <SetupScreen
          state={state}
          dispatch={dispatch}
          speechOK={speechOK}
          storageBackend={storageBackend}
          onBegin={onBegin}
          onLoadSave={onLoadSave}
          onReset={onReset}
          confirmReset={confirmReset}
          setConfirmReset={setConfirmReset}
        />
      )}
      {state.phase === "interview" && (
        <InterviewScreen
          state={state}
          dispatch={dispatch}
          speechOK={speechOK}
          onAnswer={onAnswer}
          onSpeak={speak}
          onStopAudio={stopAudio}
          onSave={onSave}
          onBackToStart={onBackToStart}
          onEndStage={onEndStage}
          onNextStage={onNextStage}
          onRetryOpen={onRetryOpen}
          hasAnyTranscript={hasAnyTranscript}
        />
      )}
      {state.phase === "weaving" && <WeaveScreen state={state} onForceFinish={onForceFinish} onReweave={onReweave} />}
      {state.phase === "done" && (
        <>
          <DoneScreen state={state} onExportTxt={onExportTxt} onExportSave={onExportSave} onReset={onReset} onReweave={onReweave} />
          <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 44px", textAlign: "center" }}>
            <button
              onClick={onReweave}
              disabled={state.loading}
              style={{
                fontFamily: SANS,
                fontSize: 15,
                fontWeight: 600,
                color: "#1a1714",
                background: "#d9b88f",
                border: "none",
                borderRadius: 10,
                padding: "13px 24px",
                cursor: state.loading ? "default" : "pointer",
                opacity: state.loading ? 0.5 : 1,
              }}
            >
              Re-weave the Film
            </button>
            <div style={{ fontFamily: SANS, fontSize: 12, color: STEEL, marginTop: 10, lineHeight: 1.5 }}>
              Re-runs the weave over your saved interviews. Your answers don't change.
            </div>
          </div>
        </>
      )}
      {showCrisisFooter && <CrisisFooter />}
    </>
  );
}
