import { useEffect, useRef, useState, useCallback } from "react";
import { VOICE_STYLE } from "../data/albums.js";
import { hashStr, chunkForSpeech } from "../lib/util.js";

// Web Speech API hook with the practical fixes:
// - voices load async; we wait for them (Fix #11)
// - Chrome truncates long utterances ~15s; we chunk by sentence and queue
// - returns whether a screen reader-friendly default should be off
export function useSpeech(enabled) {
  const speechOK = typeof window !== "undefined" && "speechSynthesis" in window;
  const [voices, setVoices] = useState([]);
  const queueRef = useRef([]);

  useEffect(() => {
    if (!speechOK) return;
    const load = () => setVoices(window.speechSynthesis.getVoices() || []);
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      try {
        window.speechSynthesis.onvoiceschanged = null;
      } catch {
        /* ignore */
      }
    };
  }, [speechOK]);

  const stop = useCallback(() => {
    if (!speechOK) return;
    queueRef.current = [];
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }, [speechOK]);

  const speak = useCallback(
    (text, director) => {
      if (!enabled || !speechOK || !text) return;
      stop();
      const style = VOICE_STYLE[director] || { rate: 1, pitch: 1 };
      const en = voices.filter((v) => /en/i.test(v.lang));
      const chosenVoice = en.length ? en[hashStr(director || "x") % en.length] : null;

      const chunks = chunkForSpeech(text);
      queueRef.current = chunks.slice();

      const speakNext = () => {
        const next = queueRef.current.shift();
        if (next === undefined) return;
        try {
          const u = new SpeechSynthesisUtterance(next);
          u.rate = style.rate;
          u.pitch = style.pitch;
          if (chosenVoice) u.voice = chosenVoice;
          u.onend = speakNext;
          u.onerror = speakNext;
          window.speechSynthesis.speak(u);
        } catch {
          /* ignore */
        }
      };
      speakNext();
    },
    [enabled, speechOK, voices, stop]
  );

  return { speechOK, speak, stop, voices };
}
