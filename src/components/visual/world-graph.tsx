"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { World } from "@/domain/world";
import {
  buildWorldGraph,
  defaultWorldGraphFilters,
  filterWorldGraph,
  type WorldGraphFilters
} from "@/domain/world-graph";
import "./world-graph.css";

type Props = {
  world: World;
  selectedDocumentId: string;
  onSelectDocument: (id: string) => void;
};
type Point = { x: number; y: number };
type View = { x: number; y: number; zoom: number };
type Gesture = { nodeId: string | null; x: number; y: number; viewX: number; viewY: number; moved: boolean };
type Color = [number, number, number, number];
type Graph = ReturnType<typeof buildWorldGraph>;
type DrawingState = {
  graph: Graph;
  positions: Map<string, Point>;
  view: View;
  selectedDocumentId: string;
  hoveredId: string | null;
};
type Renderer = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  position: number;
  color: number;
  size: number;
  pointMode: WebGLUniformLocation | null;
  pixelRatio: WebGLUniformLocation | null;
};

const palette: Record<"character" | "place" | "faction", Color> = {
  character: [0.58, 0.7, 0.49, 1],
  place: [0.77, 0.61, 0.41, 1],
  faction: [0.62, 0.59, 0.77, 1]
};

const vertexSource = `#version 300 es
precision highp float;
in vec2 a_position;
in vec4 a_color;
in float a_size;
uniform float u_pixel_ratio;
out vec4 v_color;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  gl_PointSize = a_size * u_pixel_ratio;
  v_color = a_color;
}`;

const fragmentSource = `#version 300 es
precision highp float;
in vec4 v_color;
uniform float u_point_mode;
out vec4 output_color;
void main() {
  if (u_point_mode > 0.5) {
    float d = length(gl_PointCoord * 2.0 - 1.0);
    float body = 1.0 - smoothstep(0.52, 0.65, d);
    float ring = smoothstep(0.64, 0.73, d) * (1.0 - smoothstep(0.82, 0.9, d));
    float alpha = max(body, ring * 0.9) * v_color.a;
    if (alpha < 0.01) discard;
    output_color = vec4(v_color.rgb, alpha);
  } else {
    output_color = v_color;
  }
}`;

function makeProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Shader allocation failed");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "Shader compilation failed";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  };

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    throw new Error("Program allocation failed");
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Program linking failed";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

function arrange(nodes: Graph["nodes"]): Map<string, Point> {
  const points = new Map<string, Point>();
  const radius = nodes.length === 1 ? 0 : nodes.length === 2 ? 0.42 : 0.66;

  nodes.forEach((node, index) => {
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
    points.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.76
    });
  });

  return points;
}

function addVertex(output: number[], point: Point, color: Color, size: number, view: View) {
  output.push(
    point.x * view.zoom + view.x,
    point.y * view.zoom + view.y,
    color[0], color[1], color[2], color[3],
    size
  );
}

export function WorldGraph({ world, selectedDocumentId, onSelectDocument }: Props) {
  const graph = useMemo(() => buildWorldGraph(world), [world]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const drawRef = useRef<() => void>(() => undefined);
  const gestureRef = useRef<Gesture | null>(null);

  const [positions, setPositions] = useState(() => arrange(graph.nodes));
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filters, setFilters] = useState<WorldGraphFilters>(defaultWorldGraphFilters);
  const visibleGraph = useMemo(() => filterWorldGraph(graph, filters), [graph, filters]);

  const dataRef = useRef<DrawingState>({
    graph: visibleGraph,
    positions,
    view,
    selectedDocumentId,
    hoveredId
  });

  useEffect(() => {
    dataRef.current = { graph: visibleGraph, positions, view, selectedDocumentId, hoveredId };
    drawRef.current();
  }, [visibleGraph, positions, view, selectedDocumentId, hoveredId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fallback = canvas.parentElement?.querySelector<HTMLElement>("[data-graph-fallback]");
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: true, depth: false });
    if (!gl) {
      fallback?.removeAttribute("hidden");
      return;
    }

    try {
      const program = makeProgram(gl);
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error("Buffer allocation failed");

      const renderer: Renderer = {
        gl,
        program,
        buffer,
        position: gl.getAttribLocation(program, "a_position"),
        color: gl.getAttribLocation(program, "a_color"),
        size: gl.getAttribLocation(program, "a_size"),
        pointMode: gl.getUniformLocation(program, "u_point_mode"),
        pixelRatio: gl.getUniformLocation(program, "u_pixel_ratio")
      };
      rendererRef.current = renderer;

      const draw = () => {
        const current = rendererRef.current;
        const target = canvasRef.current;
        if (!current || !target || !target.width || !target.height) return;

        const { graph: currentGraph, positions: currentPositions, view: currentView, selectedDocumentId: selected, hoveredId: hovered } = dataRef.current;
        const lines: number[] = [];
        const nodes: number[] = [];

        for (const edge of currentGraph.edges) {
          const source = currentPositions.get(edge.source);
          const targetPoint = currentPositions.get(edge.target);
          if (!source || !targetPoint) continue;
          const activeEdge = edge.source === selected || edge.target === selected;
          const color: Color = edge.kind === "reference"
            ? activeEdge ? [0.48, 0.62, 0.4, 0.98] : [0.54, 0.59, 0.51, 0.48]
            : activeEdge ? [0.7, 0.56, 0.37, 0.94] : [0.67, 0.61, 0.5, 0.5];
          addVertex(lines, source, color, 1, currentView);
          addVertex(lines, targetPoint, color, 1, currentView);
        }

        for (const node of currentGraph.nodes) {
          const point = currentPositions.get(node.id);
          if (!point) continue;
          const base = palette[node.entityType];
          const active = node.id === selected || node.id === hovered;
          const color: Color = [
            Math.min(1, base[0] + (node.id === selected ? 0.2 : active ? 0.1 : 0)),
            Math.min(1, base[1] + (node.id === selected ? 0.2 : active ? 0.1 : 0)),
            Math.min(1, base[2] + (node.id === selected ? 0.2 : active ? 0.1 : 0)),
            1
          ];
          addVertex(nodes, point, color, node.id === selected ? 23 : active ? 20 : 17, currentView);
        }

        const stride = 7 * Float32Array.BYTES_PER_ELEMENT;
        gl.viewport(0, 0, target.width, target.height);
        gl.clearColor(0.956, 0.957, 0.934, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...lines, ...nodes]), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(renderer.position);
        gl.vertexAttribPointer(renderer.position, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(renderer.color);
        gl.vertexAttribPointer(renderer.color, 4, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(renderer.size);
        gl.vertexAttribPointer(renderer.size, 1, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1f(renderer.pixelRatio, Math.min(window.devicePixelRatio || 1, 2));
        gl.uniform1f(renderer.pointMode, 0);
        gl.drawArrays(gl.LINES, 0, lines.length / 7);
        gl.uniform1f(renderer.pointMode, 1);
        gl.drawArrays(gl.POINTS, lines.length / 7, nodes.length / 7);
      };

      drawRef.current = draw;
      const resize = () => {
        const bounds = canvas.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(bounds.width * ratio));
        canvas.height = Math.max(1, Math.round(bounds.height * ratio));
        draw();
      };

      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      return () => {
        observer.disconnect();
        drawRef.current = () => undefined;
        rendererRef.current = null;
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      };
    } catch {
      fallback?.removeAttribute("hidden");
    }
  }, []);

  function hitTest(clientX: number, clientY: number): string | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    const { positions: points, view: activeView, graph: activeGraph } = dataRef.current;
    let nearest: string | null = null;
    let nearestDistance = 25;

    for (const node of activeGraph.nodes) {
      const point = points.get(node.id);
      if (!point) continue;
      const x = bounds.left + ((point.x * activeView.zoom + activeView.x + 1) / 2) * bounds.width;
      const y = bounds.top + ((1 - (point.y * activeView.zoom + activeView.y)) / 2) * bounds.height;
      const distance = Math.hypot(clientX - x, clientY - y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = node.id;
      }
    }
    return nearest;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const nodeId = hitTest(event.clientX, event.clientY);
    gestureRef.current = {
      nodeId,
      x: event.clientX,
      y: event.clientY,
      viewX: dataRef.current.view.x,
      viewY: dataRef.current.view.y,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (nodeId) onSelectDocument(nodeId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const gesture = gestureRef.current;
    if (gesture) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) gesture.moved = true;
      if (!gesture.moved) return;

      if (gesture.nodeId) {
        const clipX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        const clipY = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;
        const activeView = dataRef.current.view;
        setPositions((current) => {
          const next = new Map(current);
          next.set(gesture.nodeId as string, {
            x: (clipX - activeView.x) / activeView.zoom,
            y: (clipY - activeView.y) / activeView.zoom
          });
          return next;
        });
      } else {
        setView((current) => ({
          ...current,
          x: gesture.viewX + (dx / bounds.width) * 2,
          y: gesture.viewY - (dy / bounds.height) * 2
        }));
      }
      return;
    }

    const next = hitTest(event.clientX, event.clientY);
    event.currentTarget.style.cursor = next ? "pointer" : "grab";
    setHoveredId((current) => current === next ? current : next);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const selected = visibleGraph.nodes.find((node) => node.id === selectedDocumentId) ?? visibleGraph.nodes[0];
  const relatedEdges = selected
    ? visibleGraph.edges.filter((edge) => edge.source === selected.id || edge.target === selected.id)
    : [];
  const referenceCount = visibleGraph.edges.filter((edge) => edge.kind === "reference").length;
  const mentionCount = visibleGraph.edges.filter((edge) => edge.kind === "mention").length;

  return (
    <section className="world-graph" aria-label={"World graph for " + world.eras.find((era) => era.id === world.activeEraId)?.name + " era"}>
      <header className="graph-header">
        <div>
          <span className="eyebrow">VISUAL TOOLS / WORLD GRAPH</span>
          <h2>Connections</h2>
          <p>Explicit references and unambiguous mentions, projected from this era&apos;s canonical records.</p>
        </div>
        <div className="graph-controls" aria-label="Graph controls">
          <button type="button" onClick={() => setView((current) => ({ ...current, zoom: Math.max(0.55, current.zoom * 0.82) }))} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => setView((current) => ({ ...current, zoom: Math.min(2.5, current.zoom * 1.22) }))} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => { setPositions(arrange(graph.nodes)); setView({ x: 0, y: 0, zoom: 1 }); }}>Reset</button>
        </div>
      </header>

      <div className="graph-filter-bar" aria-label="Graph filters">
        <div className="graph-filter-group">
          <span>EDGES</span>
          <button
            type="button"
            className={filters.showReferences ? "is-active" : ""}
            aria-pressed={filters.showReferences}
            onClick={() => setFilters((current) => ({ ...current, showReferences: !current.showReferences }))}
          >References</button>
          <button
            type="button"
            className={filters.showMentions ? "is-active" : ""}
            aria-pressed={filters.showMentions}
            onClick={() => setFilters((current) => ({ ...current, showMentions: !current.showMentions }))}
          >Mentions</button>
        </div>
        <div className="graph-filter-group">
          <span>RECORDS</span>
          {(["character", "place", "faction"] as const).map((type) => (
            <button
              type="button"
              key={type}
              className={filters.entityTypes[type] ? "is-active" : ""}
              aria-pressed={filters.entityTypes[type]}
              onClick={() => setFilters((current) => ({
                ...current,
                entityTypes: { ...current.entityTypes, [type]: !current.entityTypes[type] }
              }))}
            >{type}</button>
          ))}
        </div>
      </div>

      <div className="graph-layout">
        <div className="graph-viewport">
          <canvas
            ref={canvasRef}
            className="graph-canvas"
            aria-label="WebGL world graph. Drag a node to reposition it or drag empty space to pan."
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={() => setHoveredId(null)}
          />
          <p className="graph-renderer-note" data-graph-fallback hidden>
            WebGL 2 is unavailable. Use the record list to explore this world&apos;s connections.
          </p>
          <div className="graph-viewport-footer">
            <span>DRAG TO REARRANGE</span>
            <span>{visibleGraph.nodes.length} RECORDS · {referenceCount} REFERENCES · {mentionCount} MENTIONS</span>
          </div>
        </div>

        <aside className="graph-inspector">
          <section className="graph-inspector-section">
            <span className="eyebrow">SELECTED RECORD</span>
            {selected ? (
              <>
                <span className={"graph-entity-mark " + selected.entityType}>{selected.entityType.slice(0, 1).toUpperCase()}</span>
                <h3>{selected.name}</h3>
                <span className="graph-entity-type">{selected.entityType}</span>
                <Link className="graph-open-record" href={"/worlds/" + world.slug + "?doc=" + encodeURIComponent(selected.id) + "&era=" + encodeURIComponent(world.activeEraId)}>
                  Open record <span aria-hidden="true">↗</span>
                </Link>
              </>
            ) : <p className="graph-empty-copy">There are no records in this world yet.</p>}
          </section>

          <section className="graph-inspector-section">
            <span className="eyebrow">CONNECTED RECORDS</span>
            {relatedEdges.length ? (
              <div className="graph-related-list">
                {relatedEdges.map((edge) => {
                  const id = edge.source === selected?.id ? edge.target : edge.source;
                  const node = visibleGraph.nodes.find((item) => item.id === id);
                  if (!node) return null;
                  return (
                    <button type="button" key={edge.id} onClick={() => onSelectDocument(node.id)}>
                      <span className={"graph-list-dot " + node.entityType} />
                      <span><strong>{node.name}</strong><small>{edge.kind === "mention" ? "Mention in text" + (edge.occurrences > 1 ? " · " + edge.occurrences + " times" : "") : edge.label}</small></span>
                    </button>
                  );
                })}
              </div>
            ) : <p className="graph-empty-copy">No visible links connect this record yet. Try enabling both edge types.</p>}
          </section>

          <section className="graph-inspector-section graph-records-section">
            <span className="eyebrow">ALL WORLD RECORDS</span>
            <div className="graph-related-list">
              {visibleGraph.nodes.map((node) => (
                <button
                  type="button"
                  key={node.id}
                  className={node.id === selected?.id ? "is-selected" : ""}
                  onClick={() => onSelectDocument(node.id)}
                >
                  <span className={"graph-list-dot " + node.entityType} />
                  <span><strong>{node.name}</strong><small>{node.entityType}</small></span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
