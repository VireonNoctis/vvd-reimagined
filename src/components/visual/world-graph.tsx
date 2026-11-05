"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { World } from "@/domain/world";
import { buildWorldGraph } from "@/domain/world-graph";
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

const palette = {
  character: [0.58, 0.7, 0.49],
  place: [0.77, 0.61, 0.41],
  faction: [0.62, 0.59, 0.77]
} as const;

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

function arrange(nodes: ReturnType<typeof buildWorldGraph>["nodes"]): Map<string, Point> {
  const points = new Map<string, Point>();
  const radius = nodes.length === 1 ? 0 : nodes.length === 2 ? 0.42 : 0.66;

  nodes.forEach((node, index) => {
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
    points.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.76 });
  });

  return points;
}

function vertex(output: number[], point: Point, color: Color, size: number, view: View) {
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
  const [rendererIssue, setRendererIssue] = useState("");

  const graphRef = useRef(graph);
  const positionsRef = useRef(positions);
  const viewRef = useRef(view);
  const selectionRef = useRef({ selectedDocumentId, hoveredId });

  graphRef.current = graph;
  positionsRef.current = positions;
  viewRef.current = view;
  selectionRef.current = { selectedDocumentId, hoveredId };

  useEffect(() => {
    setPositions(arrange(graph.nodes));
    setView({ x: 0, y: 0, zoom: 1 });
  }, [graph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { alpha: false, antialias: true, depth: false });
    if (!gl) {
      setRendererIssue("WebGL 2 is not available here. Use the record list to explore connections.");
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
      setRendererIssue("");

      const draw = () => {
        const current = rendererRef.current;
        const target = canvasRef.current;
        if (!current || !target || !target.width || !target.height) return;

        const { gl: context } = current;
        const activeView = viewRef.current;
        const selected = selectionRef.current.selectedDocumentId;
        const hovered = selectionRef.current.hoveredId;
        const points = positionsRef.current;
        const edges: number[] = [];
        const nodes: number[] = [];

        for (const edge of graphRef.current.edges) {
          const source = points.get(edge.source);
          const targetPoint = points.get(edge.target);
          if (!source || !targetPoint) continue;
          const focused = edge.source === selected || edge.target === selected;
          const color: Color = focused ? [0.52, 0.65, 0.43, 0.95] : [0.54, 0.59, 0.51, 0.46];
          vertex(edges, source, color, 1, activeView);
          vertex(edges, targetPoint, color, 1, activeView);
        }

        for (const node of graphRef.current.nodes) {
          const point = points.get(node.id);
          if (!point) continue;
          const base = palette[node.entityType];
          const focused = node.id === selected || node.id === hovered;
          const color: Color = [
            Math.min(1, base[0] + (node.id === selected ? 0.2 : focused ? 0.1 : 0)),
            Math.min(1, base[1] + (node.id === selected ? 0.2 : focused ? 0.1 : 0)),
            Math.min(1, base[2] + (node.id === selected ? 0.2 : focused ? 0.1 : 0)),
            1
          ];
          vertex(nodes, point, color, node.id === selected ? 23 : focused ? 20 : 17, activeView);
        }

        const data = new Float32Array([...edges, ...nodes]);
        const stride = 7 * Float32Array.BYTES_PER_ELEMENT;
        context.viewport(0, 0, target.width, target.height);
        context.clearColor(0.956, 0.957, 0.934, 1);
        context.clear(context.COLOR_BUFFER_BIT);
        context.useProgram(current.program);
        context.bindBuffer(context.ARRAY_BUFFER, current.buffer);
        context.bufferData(context.ARRAY_BUFFER, data, context.DYNAMIC_DRAW);
        context.enableVertexAttribArray(current.position);
        context.vertexAttribPointer(current.position, 2, context.FLOAT, false, stride, 0);
        context.enableVertexAttribArray(current.color);
        context.vertexAttribPointer(current.color, 4, context.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
        context.enableVertexAttribArray(current.size);
        context.vertexAttribPointer(current.size, 1, context.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
        context.enable(context.BLEND);
        context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
        context.uniform1f(current.pixelRatio, Math.min(window.devicePixelRatio || 1, 2));
        context.uniform1f(current.pointMode, 0);
        context.drawArrays(context.LINES, 0, edges.length / 7);
        context.uniform1f(current.pointMode, 1);
        context.drawArrays(context.POINTS, edges.length / 7, nodes.length / 7);
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
      setRendererIssue("The WebGL renderer could not start. The record list remains available.");
    }
  }, []);

  useEffect(() => {
    drawRef.current();
  }, [positions, view, selectedDocumentId, hoveredId, graph]);

  function hitTest(clientX: number, clientY: number): string | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    const activeView = viewRef.current;
    const points = positionsRef.current;
    let nearest: string | null = null;
    let nearestDistance = 25;

    for (const node of graphRef.current.nodes) {
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
      viewX: viewRef.current.x,
      viewY: viewRef.current.y,
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
        const activeView = viewRef.current;
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

  function zoom(factor: number) {
    setView((current) => ({ ...current, zoom: Math.min(2.5, Math.max(0.55, current.zoom * factor)) }));
  }

  function reset() {
    setPositions(arrange(graph.nodes));
    setView({ x: 0, y: 0, zoom: 1 });
  }

  const selected = graph.nodes.find((node) => node.id === selectedDocumentId) ?? graph.nodes[0];
  const relatedEdges = selected
    ? graph.edges.filter((edge) => edge.source === selected.id || edge.target === selected.id)
    : [];

  return (
    <section className="world-graph" aria-label="World graph">
      <header className="graph-header">
        <div>
          <span className="eyebrow">VISUAL TOOLS / WORLD GRAPH</span>
          <h2>Connections</h2>
          <p>Typed references between this world&apos;s canonical records.</p>
        </div>
        <div className="graph-controls" aria-label="Graph controls">
          <button type="button" onClick={() => zoom(0.82)} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => zoom(1.22)} aria-label="Zoom in">+</button>
          <button type="button" onClick={reset}>Reset</button>
        </div>
      </header>

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
          {rendererIssue && <p className="graph-renderer-note" role="status">{rendererIssue}</p>}
          <div className="graph-viewport-footer">
            <span>DRAG TO REARRANGE</span>
            <span>{graph.nodes.length} RECORDS · {graph.edges.length} REFERENCES</span>
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
                <Link className="graph-open-record" href={"/worlds/" + world.slug + "?doc=" + encodeURIComponent(selected.id)}>
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
                  const node = graph.nodes.find((item) => item.id === id);
                  if (!node) return null;
                  return (
                    <button type="button" key={edge.id} onClick={() => onSelectDocument(node.id)}>
                      <span className={"graph-list-dot " + node.entityType} />
                      <span><strong>{node.name}</strong><small>{edge.label}</small></span>
                    </button>
                  );
                })}
              </div>
            ) : <p className="graph-empty-copy">No typed references connect this record yet.</p>}
          </section>

          <section className="graph-inspector-section graph-records-section">
            <span className="eyebrow">ALL WORLD RECORDS</span>
            <div className="graph-related-list">
              {graph.nodes.map((node) => (
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
