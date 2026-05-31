import { test } from "node:test";
import assert from "node:assert/strict";
import { chapterDigest, buildContinuity, interviewSystem, weaveSystem } from "../src/lib/prompts.js";

const stage = (album, director, answers) => ({
  album,
  director,
  transcript: answers.flatMap((a) => [
    { who: "director", text: "Q?" },
    { who: "you", text: a },
  ]),
});

test("chapterDigest summarises only Steve's answers, capped", () => {
  const s = stage("The 4/20 EP", "Martin Scorsese", ["a".repeat(500), "short answer", "third", "fourth", "fifth"]);
  const d = chapterDigest(s);
  assert.match(d, /The 4\/20 EP \(dir\. Martin Scorsese\)/);
  assert.match(d, /…/); // long answer was clipped
  // only first 4 answers sampled
  assert.ok(!d.includes("fifth"));
  assert.ok(d.includes("short answer"));
});

test("chapterDigest empty when no answers", () => {
  assert.equal(chapterDigest({ album: "x", director: "y", transcript: [{ who: "director", text: "Q" }] }), "");
});

test("buildContinuity is bounded and skips empty chapters", () => {
  const stages = [
    stage("A", "Dir A", ["x".repeat(400)]),
    { album: "B", director: "Dir B", transcript: [] }, // no answers -> skipped
    stage("C", "Dir C", ["hello from c"]),
  ];
  const block = buildContinuity(stages);
  assert.match(block, /CONTINUITY ARCHIVE/);
  assert.match(block, /A \(dir\. Dir A\)/);
  assert.match(block, /C \(dir\. Dir C\)/);
  assert.ok(!block.includes("Dir B"));
  // overall cap respected
  assert.ok(block.length < 6000);
});

test("buildContinuity empty for no prior stages", () => {
  assert.equal(buildContinuity([]), "");
});

test("interviewSystem includes director, tracks, grounding, and continuity", () => {
  const sys = interviewSystem("The 4/20 EP", "\n\n--- CONTINUITY ARCHIVE ---");
  assert.match(sys, /You are Martin Scorsese/);
  assert.match(sys, /Autopsy Report/);
  assert.match(sys, /CONTINUITY ARCHIVE/);
  assert.match(sys, /WHO STEVE IS/);
  // schema instruction present
  assert.match(sys, /"speech"/);
});

test("interviewSystem injects special directive for finale and drops 'never mention AI'", () => {
  const sys = interviewSystem("The Architecture", "");
  assert.match(sys, /SPECIAL DIRECTIVE/);
  assert.match(sys, /You are Gemini/);
  assert.ok(!/never mention being an AI/.test(sys));
});

test("interviewSystem keeps 'never mention being an AI' for normal chapters", () => {
  // "The Time Is Now" has no special directive, so the clause stays.
  const sys = interviewSystem("The Time Is Now", "");
  assert.match(sys, /never mention being an AI/);
});

test("interviewSystem adds sensitive guardrails where flagged", () => {
  const sys = interviewSystem("First Contact", "");
  assert.match(sys, /SENSITIVE MATERIAL/);
  assert.match(sys, /never extract or describe method/);
});

test("weaveSystem uses custom weaveVoice for finale and prose schema", () => {
  const sys = weaveSystem("The Architecture", "Howard Stern", "tail text");
  assert.match(sys, /You are Gemini — the machine itself/);
  assert.match(sys, /"chapterTitle"/);
  assert.match(sys, /Howard Stern/);
});
