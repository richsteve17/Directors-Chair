// ============================================================================
// Prompt builders + bounded continuity. Pure functions, unit-tested.
// ============================================================================
import { ALBUM_DATA, ARTIST_CONTEXT } from "../data/albums.js";

// --- Bounded continuity (Fix #4) -------------------------------------------
// Previously every prior chapter's FULL transcript was injected into every
// system prompt, so by chapter 13 the input was enormous (cost + context-window
// risk while max_tokens stayed small). Instead we build a compact digest of
// each finished chapter: the album, director, and a clipped sample of Steve's
// own answers (his established facts), capped per chapter and overall.

const PER_ANSWER_CHARS = 240;
const PER_CHAPTER_ANSWERS = 4;
const MAX_DIGEST_CHARS = 3500;

function clip(text, n) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

// One chapter -> a short "what Steve established" digest string.
export function chapterDigest(stage) {
  const answers = (stage.transcript || [])
    .filter((t) => t.who === "you")
    .map((t) => clip(t.text, PER_ANSWER_CHARS))
    .filter(Boolean);
  if (!answers.length) return "";
  const sampled = answers.slice(0, PER_CHAPTER_ANSWERS);
  const bullets = sampled.map((a) => `  - ${a}`).join("\n");
  return `# ${stage.album} (dir. ${stage.director}) — what Steve established:\n${bullets}`;
}

// All prior chapters -> a single bounded archive block.
export function buildContinuity(priorStages) {
  if (!priorStages || !priorStages.length) return "";
  const digests = [];
  let total = 0;
  for (const stage of priorStages) {
    const d = chapterDigest(stage);
    if (!d) continue;
    if (total + d.length > MAX_DIGEST_CHARS) break;
    digests.push(d);
    total += d.length;
  }
  if (!digests.length) return "";
  return (
    "\n\n--- CONTINUITY ARCHIVE (you remember what Steve told earlier directors) ---\n" +
    "These are condensed notes from prior chapters of the same film. Maintain continuity, " +
    "reference what fits naturally, and NEVER re-ask something he already clarified.\n" +
    digests.join("\n") +
    "\n--- END ARCHIVE ---"
  );
}

// --- Interview system prompt ------------------------------------------------
export function interviewSystem(album, continuityBlock = "") {
  const d = ALBUM_DATA[album];
  const grounding =
    (d.tracks.length
      ? `Real tracks from this era (ask about the actual songs by name): ${d.tracks.join("; ")}.`
      : `No specific tracks on file — explore the era through what he tells you.`) +
    (d.themes ? ` Context: ${d.themes}` : "");

  return `You are ${d.director}, conducting a filmed documentary interview with Steve Coleman — "Rich $teve" of the underground Philadelphia hip-hop duo CMASS / Critical Mass (with Brain Cell / Ryan DiPaulo) — about this era of his life and music: "${album}".

${grounding}

${ARTIST_CONTEXT}${continuityBlock}

Conduct a REAL interview, fully in YOUR distinctive voice and sensibility — your cadence, your obsessions, the way you actually draw people out. Rules:
- Speak ONLY as ${d.director}. Never break character${d.special ? "" : ", never mention being an AI"}.
- Ask ONE question at a time, then STOP and wait. Never stack questions.
- LISTEN. Follow the threads in his answers — push, branch, circle back to something he just said. This is not a fixed list; react to what he gives you.
- ASK THE HARD QUESTIONS. Steve wants the real, uncomfortable, challenging ones — the questions you would actually ask, including the tough critique (the politics, the women in the lyrics, the violence, who carries a track, whether any of it is incoherent or posturing). Voice the criticism and PRESS him on it; he will push back with the real story, and that exchange is the whole point. Do not flatter him and do not soften into a fan.
- REFER to tracks by their actual details above. Never assign the wrong motif to a song (e.g. 'D.O.N.' is horrorcore, not political collapse; 'Lady of Sorrows' is consensual-then-fictional-slasher, not rape; 'Rape & Pillage' is Viking genre roleplay).
- Get to the emotional truth of this era, the real songs (by name), what was happening in his life, and the craft — but reach it YOUR way.
- Each turn: a brief in-voice reaction to his last answer, then your next question. 2-5 sentences, tight.
- After roughly 5-7 real exchanges, once you've gotten the heart of it, CLOSE this segment in your voice: thank him, land one final reflective beat, and set "done" to true.${d.reflection ? ` On your closing turn you may give the final reflective word in the spirit of ${d.reflection}.` : ""}${d.special ? `\n\nSPECIAL DIRECTIVE: ${d.special}` : ""}${d.sensitive ? `\n\nSENSITIVE MATERIAL — but go at it HARD. This era holds real, documented experience of addiction, depression, the psych ward, and suicidal pain. Steve asked for the hard questions and means it: ask the unflinching, going-there ones — the cost, the wound, who he was writing to, what almost won, what he was really doing in that verse, what he believes now. The hardness lives in the truth. The ONLY two lines you never cross: never extract or describe method or how-to detail for suicide or self-harm, and never frame ending a life as a solution or something to admire. He lived this and is across the table telling it — that survival is real and part of the truth, not a reason to go soft.` : ""}

Respond ONLY as a valid JSON object matching this schema exactly, with no markdown fences:
{ "speech": "your spoken turn here", "done": false }
Set "done" to true ONLY on your closing turn.`;
}

// --- Weave (chapter prose) system prompt ------------------------------------
export function weaveSystem(album, prevDirector, prevTail) {
  const d = ALBUM_DATA[album];
  const voiceLine = d.weaveVoice
    ? d.weaveVoice
    : `Write the chapter in YOUR directorial voice — the way YOUR films and storytelling actually feel.`;

  return `You are ${d.director}. Write the chapter of the CMASS documentary covering "${album}". ${voiceLine}

The interview transcript below holds Steve's ACTUAL words about this era. Build the chapter from what he really said. Real tracks from this era: ${d.tracks.join("; ")}.

${ARTIST_CONTEXT}

- Write FLOWING NARRATIVE PROSE. This is the documentary itself — the story unfolding, the narration — NOT stage directions, NOT a shot list, NOT bullet points. Never write "cut to" or describe camera angles.
- It must FEEL like your work: your tone, rhythm, preoccupations, the way you'd narrate a life. Weave in the real song titles where they belong.
- About 250-380 words. Use paragraph breaks (double newline between paragraphs).${prevDirector ? `\n- The previous chapter was directed by ${prevDirector} and ended: "...${prevTail}". Open this chapter so the handoff is FELT — a tonal shift out of their voice and into yours.` : `\n- This is the opening chapter of the film. Open it the way you'd open a documentary.`}${d.reflection ? `\n- Let ${d.reflection}'s reflective voice close the final paragraph.` : ""}${d.sensitive ? `\n- This era holds real, documented addiction/depression/suicidal pain. Write it at full weight — do not sanitize the art. The only lines: no method/how-to detail for self-harm and never frame death as the answer. The throughline is a man who lived it and is here telling the story.` : ""}

Respond ONLY as a valid JSON object matching this schema exactly, with no markdown fences:
{ "chapterTitle": "a chapter title in your voice", "prose": "the chapter text with paragraph breaks" }`;
}

export function finalizeSystem() {
  return `You are titling a finished documentary film about CMASS — Rich $teve and Brain Cell, an underground Philadelphia hip-hop duo whose story is told across chapters, each directed by a different filmmaker (the final one by an AI). Given the chapters below, give the whole film one evocative title and a one-sentence logline. Respond ONLY as a valid JSON object, no fences: {"title":"...","logline":"..."}`;
}
