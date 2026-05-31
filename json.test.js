import { test } from "node:test";
import assert from "node:assert/strict";
import { stripFences, firstBalancedObject, safeParse } from "../src/lib/json.js";

test("stripFences removes json fences and BOM", () => {
  assert.equal(stripFences('```json\n{"a":1}\n```'), '{"a":1}');
  assert.equal(stripFences('```\n{"a":1}\n```'), '{"a":1}');
  assert.equal(stripFences('\uFEFF{"a":1}'), '{"a":1}');
});

test("firstBalancedObject finds the first complete object", () => {
  assert.equal(firstBalancedObject('prefix {"a":1} suffix'), '{"a":1}');
  assert.equal(firstBalancedObject('{"a":{"b":2}} trailing {"c":3}'), '{"a":{"b":2}}');
  assert.equal(firstBalancedObject("no object here"), null);
});

test("firstBalancedObject respects braces inside strings", () => {
  const s = '{"speech":"he said }{ weird","done":false}';
  assert.equal(firstBalancedObject(s), s);
});

test("firstBalancedObject respects escaped quotes", () => {
  const s = '{"speech":"a \\"quote\\" here","done":true}';
  assert.equal(firstBalancedObject(s), s);
});

test("safeParse handles clean json", () => {
  assert.deepEqual(safeParse('{"x":1}'), { x: 1 });
});

test("safeParse handles fenced json with surrounding prose", () => {
  const raw = 'Sure!\n```json\n{"speech":"hi","done":false}\n```\nhope that helps';
  assert.deepEqual(safeParse(raw), { speech: "hi", done: false });
});

test("safeParse strips trailing commas", () => {
  assert.deepEqual(safeParse('{"a":1,"b":2,}'), { a: 1, b: 2 });
});

test("safeParse returns fallback on garbage", () => {
  assert.deepEqual(safeParse("totally not json", { ok: false }), { ok: false });
});
