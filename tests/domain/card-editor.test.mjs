import assert from "node:assert/strict";
import test from "node:test";
import { moveDraftItem, parseAliases, validateCardDraft } from "../../src/domain/card-editor.ts";

test("aliases are trimmed and deduplicated without changing their first spelling", () => {
  assert.deepEqual(parseAliases(" The Tidebound, Warden, the tidebound, , Warden "), [
    "The Tidebound",
    "Warden"
  ]);
});

test("moving a draft item returns a reordered copy", () => {
  const source = ["first", "second", "third"];
  const moved = moveDraftItem(source, 1, 1);
  assert.deepEqual(moved, ["first", "third", "second"]);
  assert.deepEqual(source, ["first", "second", "third"]);
});

test("draft movement safely ignores out-of-range moves", () => {
  assert.deepEqual(moveDraftItem(["only"], 0, -1), ["only"]);
  assert.deepEqual(moveDraftItem(["first"], 4, 1), ["first"]);
});

test("valid card drafts may contain multiple ordered text blocks and both property types", () => {
  assert.equal(validateCardDraft("Elowen Sable", [
    { id: "age", label: "Age", kind: "text", value: "34" },
    { id: "home", label: "Home", kind: "reference", documentId: "place-1" }
  ], [
    { id: "intro", text: "Intro" },
    { id: "history", text: "History" }
  ]), null);
});

test("draft validation catches missing labels, unresolved references and duplicate block ids", () => {
  assert.equal(validateCardDraft("Ari", [
    { id: "home", label: " ", kind: "reference", documentId: "" }
  ], []), "Give every property a label.");
  assert.equal(validateCardDraft("Ari", [
    { id: "home", label: "Home", kind: "reference", documentId: "" }
  ], []), "Choose a linked record for each reference property.");
  assert.equal(validateCardDraft("Ari", [], [
    { id: "body", text: "one" },
    { id: "body", text: "two" }
  ]), "Two text blocks share the same id.");
});
