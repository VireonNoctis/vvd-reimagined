import assert from "node:assert/strict";
import test from "node:test";
import { demoWorld } from "../../src/data/demo-world.ts";
import { buildWorldGraph } from "../../src/domain/world-graph.ts";

test("world graph projects canonical records without copying them", () => {
  const graph = buildWorldGraph(demoWorld);
  assert.deepEqual(graph.nodes.map((node) => node.id), demoWorld.documents.map((document) => document.id));
  assert.equal(graph.nodes[0].name, demoWorld.documents[0].name);
});

test("world graph creates edges only for valid typed references", () => {
  const graph = buildWorldGraph(demoWorld);
  assert.deepEqual(graph.edges.map(({ source, target, label }) => [source, target, label]), [
    ["card-elowen-sable", "card-fallowreach", "Origin"],
    ["card-elowen-sable", "card-glass-court", "Allegiance"]
  ]);
  assert.ok(graph.edges.every((edge) => graph.nodes.some((node) => node.id === edge.source)));
  assert.ok(graph.edges.every((edge) => graph.nodes.some((node) => node.id === edge.target)));
});

test("world graph ignores references whose target is not in the world", () => {
  const world = structuredClone(demoWorld);
  world.documents[0].properties.push({
    id: "missing",
    label: "Missing",
    kind: "reference",
    documentId: "not-in-this-world"
  });
  assert.equal(buildWorldGraph(world).edges.length, 2);
});
