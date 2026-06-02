// ============================================================================
// Single reducer for the whole gauntlet (Fix #7). Replaces ~15 useState hooks
// and the stale-closure-prone async setState calls. Every transition is atomic
// and serialisable, which also makes save/restore trivial and correct.
// ============================================================================
import { ALBUMS, ALBUM_DATA } from "../data/albums.js";

export function defaultSelected() {
  return Object.fromEntries(ALBUMS.map((a) => [a, true]));
}

export function initialState() {
  return {
    phase: "setup", // setup | interview | weaving | done
    selected: defaultSelected(),
    run: [], // [{ album, director, reflection, transcript:[{who,text}], woven:{chapterTitle,prose}|null }]
    ci: 0, // current chapter index
    stageClosed: false,
    weaveIdx: 0,
    docMeta: null, // { title, logline }
    loading: false,
    banner: "",
    input: "",
    ttsOn: true,
  };
}

// Build the run array from the selected albums (preserving canon order).
export function buildRun(selected) {
  return ALBUMS.filter((a) => selected[a]).map((a) => ({
    album: a,
    director: ALBUM_DATA[a].director,
    reflection: ALBUM_DATA[a].reflection || null,
    transcript: [],
    woven: null,
  }));
}

export function reducer(state, action) {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload, loading: false };

    case "SET_SELECTED":
      return { ...state, selected: action.selected };

    case "TOGGLE_ALBUM":
      return { ...state, selected: { ...state.selected, [action.album]: action.value } };

    case "SET_TTS":
      return { ...state, ttsOn: action.value };

    case "SET_INPUT":
      return { ...state, input: action.value };

    case "SET_BANNER":
      return { ...state, banner: action.banner };

    case "SET_LOADING":
      return { ...state, loading: action.loading };

    case "BEGIN": {
      const run = buildRun(state.selected);
      return { ...state, run, ci: 0, docMeta: null, phase: "interview", stageClosed: false, banner: "", input: "" };
    }

    case "OPEN_CHAPTER_START":
      return { ...state, loading: true, stageClosed: false, banner: "", input: "" };

    // Set the first director turn for chapter `ci`.
    case "OPEN_CHAPTER_OK": {
      const run = state.run.map((c, i) =>
        i === action.ci ? { ...c, transcript: [{ who: "director", text: action.speech }] } : c
      );
      return { ...state, run, loading: false };
    }

    // Optimistically append Steve's answer.
    case "APPEND_ANSWER": {
      const run = state.run.map((c, i) =>
        i === state.ci ? { ...c, transcript: [...c.transcript, { who: "you", text: action.text }] } : c
      );
      return { ...state, run, input: "", banner: "", loading: true };
    }

    // Append the director's reply.
    case "APPEND_DIRECTOR": {
      const run = state.run.map((c, i) =>
        i === state.ci ? { ...c, transcript: [...c.transcript, { who: "director", text: action.speech }] } : c
      );
      return { ...state, run, loading: false, stageClosed: action.done ? true : state.stageClosed };
    }

    // Roll back the optimistic answer append and restore the user's text. (Fix #6/#7)
    case "ROLLBACK_ANSWER": {
      const run = state.run.map((c, i) => {
        if (i !== state.ci) return c;
        const tx = c.transcript.slice();
        if (tx.length && tx[tx.length - 1].who === "you") tx.pop();
        return { ...c, transcript: tx };
      });
      return { ...state, run, loading: false, input: action.text, banner: action.banner };
    }

    case "OPEN_CHAPTER_FAIL":
      return { ...state, loading: false, banner: action.banner };

    case "CLOSE_STAGE":
      return { ...state, stageClosed: true };

    case "GOTO_CHAPTER":
      return { ...state, ci: action.ci };

    case "TO_SETUP":
      return { ...state, phase: "setup" };

    case "TO_WEAVING":
      // Clear any prior woven chapters so the driver regenerates the whole film, and
      // start idle (loading false) so the weave-driver effect immediately picks it up.
      return {
        ...state,
        phase: "weaving",
        weaveIdx: 0,
        loading: false,
        docMeta: null,
        run: state.run.map((c) => ({ ...c, woven: null })),
      };

    case "WEAVE_PROGRESS":
      return { ...state, weaveIdx: action.idx, loading: true };

    case "WEAVE_OK": {
      const run = state.run.map((c, i) => (i === action.idx ? { ...c, woven: action.woven } : c));
      return { ...state, run, loading: false };
    }

    case "FINALIZE_START":
      return { ...state, loading: true };

    case "FINALIZE_OK":
      return { ...state, docMeta: action.docMeta, loading: false, phase: "done" };

    case "RESET":
      return initialState();

    case "LOAD_SAVE":
      return { ...initialState(), ...action.state, loading: false, banner: "", input: "" };

    default:
      return state;
  }
}
