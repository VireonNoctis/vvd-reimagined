import assert from "node:assert/strict";
import test from "node:test";
import { demoWorld } from "../../src/data/demo-world.ts";
import {
  buildWorldGraph,
  defaultWorldGraphFilters,
  filterWorldGraph
} from "../../src/domain/world-graph.ts";

test("world graph projects canonical records without copying them", () => {
  const graph = buildWorldGraph(demoWorld);
  assert.deepEqual(graph.nodes.map((node) => node.id), demoWorld.documents.map((document) => document.id));
  assert.equal(graph.nodes[0].name, demoWorld.documents[0].name);
});

test("world graph keeps explicit typed references distinct from text mentions", () => {
  const graph = buildWorldGraph(demoWorld);
  const references = graph.edges.filter((edge) => edge.kind === "reference");
  assert.deepEqual(references.map(({ source, target, label }) => [source, target, label]), [
    ["card-elowen-sable", "card-fallowreach", "Origin"],
    ["card-elowen-sable", "card-glass-court", "Allegiance"]
  ]);
  assert.ok(references.every((edge) => edge.occurrences === 1));
});

test("world graph derives case-insensitive name and alias mentions from body blocks", () => {
  const world = structuredClone(demoWorld);
  world.documents[2].blocks.push({
    id: "treaty-note",
    type: "text",
    text: "The Tidebound returned to FALLOWREACH. Elowen Sable spoke for the Reed Coast."
  });

  const mentions = buildWorldGraph(world).edges.filter((edge) => edge.kind === "mention");
  assert.deepEqual(
    mentions.map(({ source, target, occurrences }) => [source, target, occurrences]),
    [
      ["card-glass-court", "card-elowen-sable", 2],
      ["card-glass-court", "card-fallowreach", 2]
    ]
  );
});

test("world graph uses whole phrase boundaries and ignores self mentions", () => {
  const world = structuredClone(demoWorld);
  world.documents[0].blocks.push({
    id: "own-name",
    type: "text",
    text: "Elowen Sable wrote about Fallowreaches and Fallowreach."
  });

  const mentions = buildWorldGraph(world).edges.filter(
    (edge) => edge.kind === "mention" && edge.source === "card-elowen-sable"
  );
  assert.deepEqual(mentions.map((edge) => [edge.target, edge.occurrences]), [
    ["card-fallowreach", 1]
  ]);
});

test("ambiguous aliases do not create mention edges", () => {
  const world = structuredClone(demoWorld);
  world.documents[1].aliases.push("The Court");
  world.documents[2].blocks.push({
    id: "ambiguous-note",
    type: "text",
    text: "The Court has closed the eastern route."
  });

  const mentions = buildWorldGraph(world).edges.filter(
    (edge) => edge.kind === "mention" && edge.source === "card-glass-court"
  );
  assert.equal(mentions.length, 0);
});

test("world graph ignores typed references whose target is not in this world", () => {
  const world = structuredClone(demoWorld);
  world.documents[0].properties.push({
    id: "missing",
    label: "Missing",
    kind: "reference",
    documentId: "not-in-this-world"
  });

  const references = buildWorldGraph(world).edges.filter((edge) => edge.kind === "reference");
  assert.equal(references.length, 2);
});

test("world graph filters edge types and record types independently", () => {
  const graph = buildWorldGraph(demoWorld);
  const referenceOnly = filterWorldGraph(graph, {
    ...defaultWorldGraphFilters,
    showMentions: false
  });
  const mentionsOnly = filterWorldGraph(graph, {
    ...defaultWorldGraphFilters,
    showReferences: false
  });
  const withoutFactions = filterWorldGraph(graph, {
    ...defaultWorldGraphFilters,
    entityTypes: { ...defaultWorldGraphFilters.entityTypes, faction: false }
  });

  assert.ok(referenceOnly.edges.every((edge) => edge.kind === "reference"));
  assert.ok(mentionsOnly.edges.every((edge) => edge.kind === "mention"));
  assert.ok(withoutFactions.nodes.every((node) => node.entityType !== "faction"));
  assert.ok(withoutFactions.edges.every((edge) =>
    edge.source !== "card-glass-court" && edge.target !== "card-glass-court"
  ));
});
