import { test } from "node:test";
import assert from "node:assert/strict";
import { transcriptToMessages, countAnswers, buildExportText } from "../src/lib/transcript.js";

test("transcriptToMessages always starts with the begin primer", () => {
  const msgs = transcriptToMessages([]);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].role, "user");
  assert.match(msgs[0].content, /interview begins/i);
});

test("transcriptToMessages maps roles correctly", () => {
  const tx = [
    { who: "director", text: "Welcome." },
    { who: "you", text: "Thanks." },
    { who: "director", text: "Tell me about 4-20." },
    { who: "you", text: "It was the start." },
  ];
  const msgs = transcriptToMessages(tx);
  assert.deepEqual(
    msgs.map((m) => m.role),
    ["user", "assistant", "user", "assistant", "user"]
  );
  assert.equal(msgs[1].content, "Welcome.");
  assert.equal(msgs[2].content, "Thanks.");
});

test("transcriptToMessages appends closing hint to last user turn", () => {
  const tx = [
    { who: "director", text: "Q1" },
    { who: "you", text: "A1" },
  ];
  const msgs = transcriptToMessages(tx, { closingHint: true });
  const last = msgs[msgs.length - 1];
  assert.equal(last.role, "user");
  assert.match(last.content, /A1 \(He has answered many questions/);
});

test("countAnswers counts only Steve's turns", () => {
  const tx = [
    { who: "director", text: "Q" },
    { who: "you", text: "A" },
    { who: "you", text: "B" },
    { who: "director", text: "Q2" },
  ];
  assert.equal(countAnswers(tx), 2);
  assert.equal(countAnswers([]), 0);
});

test("buildExportText includes title, chapters, transcript and woven prose", () => {
  const run = [
    {
      album: "The 4/20 EP",
      director: "Martin Scorsese",
      reflection: null,
      transcript: [
        { who: "director", text: "Tell me." },
        { who: "you", text: "We were 20." },
      ],
      woven: { chapterTitle: "Paper and Hunger", prose: "It began on Facebook." },
    },
  ];
  const txt = buildExportText(run, { title: "Critical Mass", logline: "A life." }, new Date("2026-05-31T12:00:00Z"));
  assert.match(txt, /Film title: Critical Mass/);
  assert.match(txt, /CHAPTER 1 — The 4\/20 EP/);
  assert.match(txt, /MARTIN SCORSESE: Tell me\./);
  assert.match(txt, /STEVE: We were 20\./);
  assert.match(txt, /WOVEN CHAPTER — "Paper and Hunger"/);
  assert.match(txt, /It began on Facebook\./);
});

test("buildExportText handles empty transcript and closing-by credit", () => {
  const run = [
    { album: "First Contact", director: "Art Bell", reflection: "Duncan Trussell", transcript: [], woven: null },
  ];
  const txt = buildExportText(run, null);
  assert.match(txt, /\(closing by Duncan Trussell\)/);
  assert.match(txt, /\(no interview recorded for this chapter\)/);
});
