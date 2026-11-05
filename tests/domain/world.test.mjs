import assert from "node:assert/strict";
import test from "node:test";
import { findCard, getWorldIntegrityIssues, resolveCardReference } from "../../src/domain/world.ts";

function makeWorld() {
  return {
    id: "world-1",
    slug: "test-world",
    name: "Test World",
    description: "",
    genre: "Fantasy",
    updatedAt: "2026-11-05",
    documents: [
      {
        id: "character-1",
        kind: "card",
        entityType: "character",
        name: "Ari",
        aliases: [],
        updatedAt: "2026-11-05",
        properties: [{ id: "home", label: "Home", kind: "reference", documentId: "place-1" }],
        blocks: []
      },
      {
        id: "place-1",
        kind: "card",
        entityType: "place",
        name: "North Quay",
        aliases: [],
        updatedAt: "2026-11-05",
        properties: [],
        blocks: []
      }
    ]
  };
}

test("findCard returns the canonical record by id", () => {
  const world = makeWorld();
  assert.equal(findCard(world, "place-1"), world.documents[1]);
  assert.equal(findCard(world, "missing"), undefined);
});

test("reference properties resolve to the canonical target record", () => {
  const world = makeWorld();
  const property = world.documents[0].properties[0];
  assert.equal(resolveCardReference(world, property), world.documents[1]);
});

test("text properties do not resolve as document references", () => {
  const world = makeWorld();
  const property = { id: "age", label: "Age", kind: "text", value: "Thirty" };
  assert.equal(resolveCardReference(world, property), undefined);
});

test("world integrity accepts unique records and valid references", () => {
  assert.deepEqual(getWorldIntegrityIssues(makeWorld()), []);
});

test("world integrity reports broken references and duplicate ids", () => {
  const world = makeWorld();
  world.documents[0].properties.push({
    id: "mentor",
    label: "Mentor",
    kind: "reference",
    documentId: "missing-card"
  });
  world.documents.push({ ...world.documents[1], name: "Duplicate" });

  assert.deepEqual(getWorldIntegrityIssues(world), [
    "Duplicate document id: place-1",
    "character-1.mentor points to missing document missing-card."
  ]);
});