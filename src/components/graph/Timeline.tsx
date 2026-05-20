"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ReactFlow,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { NodeCard, type NodeCardData } from "./NodeCard";
import { CustomEdge, type EdgeStyleData } from "./CustomEdge";
import { nodeHref, type Edge, type Lane, type Node, type ProjectStatus } from "@/lib/graph-types";

const LANES: Lane[] = ["research", "building", "writing", "personal"];
const LANE_HEIGHT = 160;
const NODE_W = 64;
const NODE_H = 40;
const X_PADDING = 80;
const PX_PER_DAY = 0.5; // ~6 months per 90px

const laneColor: Record<Lane, string> = {
  research: "var(--color-lane-research)",
  building: "var(--color-lane-building)",
  writing: "var(--color-lane-writing)",
  personal: "var(--color-lane-personal)",
};

const nodeTypes = { card: NodeCard };
const edgeTypes = { thread: CustomEdge };

type Filters = {
  lanes: Set<Lane>;
  status: Set<ProjectStatus | "any">;
};

function dateToX(iso: string, minDate: Date) {
  const d = new Date(iso).getTime();
  const days = (d - minDate.getTime()) / 86400000;
  return X_PADDING + days * PX_PER_DAY;
}

function laneToY(lane: Lane) {
  return LANES.indexOf(lane) * LANE_HEIGHT + (LANE_HEIGHT - NODE_H) / 2;
}

function* yearTicks(min: Date, max: Date) {
  const startY = min.getUTCFullYear();
  const endY = max.getUTCFullYear();
  for (let y = startY; y <= endY; y++) {
    yield {
      year: y,
      x: dateToX(`${y}-01-01`, min),
    };
  }
}

export function Timeline({
  nodes,
  edges,
}: {
  nodes: Node[];
  edges: Edge[];
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(() => ({
    lanes: new Set<Lane>(LANES),
    status: new Set<ProjectStatus | "any">([
      "any",
      "idea",
      "active",
      "shipped",
      "shelved",
    ]),
  }));

  const focusId = pinnedId ?? hoverId;
  const neighbors = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    for (const e of edges) {
      if (e.source === focusId) set.add(e.target);
      if (e.target === focusId) set.add(e.source);
    }
    return set;
  }, [edges, focusId]);

  const filtered = useMemo(() => {
    return nodes.filter((n) => {
      if (!filters.lanes.has(n.lane)) return false;
      if (n.status && !filters.status.has(n.status)) return false;
      return true;
    });
  }, [nodes, filters]);

  const dateRange = useMemo(() => {
    const dates = filtered.length > 0 ? filtered : nodes;
    const ds = dates.map((n) => new Date(n.date).getTime());
    const min = new Date(Math.min(...ds));
    const max = new Date(Math.max(...ds, Date.now()));
    // Round to year boundaries.
    return {
      min: new Date(Date.UTC(min.getUTCFullYear(), 0, 1)),
      max: new Date(Date.UTC(max.getUTCFullYear() + 1, 0, 1)),
    };
  }, [filtered, nodes]);

  const visibleIds = useMemo(
    () => new Set(filtered.map((n) => n.id)),
    [filtered],
  );

  const rfNodes: RFNode<NodeCardData>[] = useMemo(() => {
    return filtered.map((n) => {
      const dim = neighbors ? !neighbors.has(n.id) : false;
      return {
        id: n.id,
        type: "card",
        position: { x: dateToX(n.date, dateRange.min), y: laneToY(n.lane) },
        data: {
          id: n.id,
          title: n.title,
          lane: n.lane,
          kind: n.kind,
          status: n.status,
          dim,
        },
      };
    });
  }, [filtered, dateRange.min, neighbors]);

  const rfEdges: RFEdge<EdgeStyleData>[] = useMemo(() => {
    return edges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e, i) => ({
        id: `${e.source}->${e.target}:${e.kind}:${i}`,
        source: e.source,
        target: e.target,
        type: "thread",
        data: {
          kind: e.kind,
          weight: e.weight ?? 0.6,
          dim: neighbors
            ? !(neighbors.has(e.source) && neighbors.has(e.target))
            : false,
        },
      }));
  }, [edges, visibleIds, neighbors]);

  const onEnter: NodeMouseHandler = useCallback(
    (_, n) => n && setHoverId(n.id),
    [],
  );
  const onLeave: NodeMouseHandler = useCallback(() => setHoverId(null), []);
  const onClick: NodeMouseHandler = useCallback(
    (_, n) =>
      n && setPinnedId((cur) => (cur === n.id ? null : n.id)),
    [],
  );

  const ticks = useMemo(
    () => Array.from(yearTicks(dateRange.min, dateRange.max)),
    [dateRange],
  );

  const pinned = pinnedId ? nodes.find((n) => n.id === pinnedId) ?? null : null;

  const totalWidth =
    dateToX(dateRange.max.toISOString(), dateRange.min) + X_PADDING;
  const totalHeight = LANES.length * LANE_HEIGHT;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--color-bg-0)",
        display: "grid",
        gridTemplateRows: "auto 1fr",
      }}
    >
      <FilterBar filters={filters} setFilters={setFilters} />

      <div style={{ position: "relative", overflow: "hidden" }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeMouseEnter={onEnter}
          onNodeMouseLeave={onLeave}
          onNodeClick={onClick}
          onPaneClick={() => setPinnedId(null)}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag
          zoomOnScroll={false}
          panOnScroll
          minZoom={0.4}
          maxZoom={1.6}
          fitView
          fitViewOptions={{
            padding: 0.1,
            minZoom: 0.4,
            maxZoom: 1,
          }}
        >
          <LaneBands height={totalHeight} width={totalWidth} />
          <YearLabels ticks={ticks} height={totalHeight} />
        </ReactFlow>
      </div>

      {pinned && (
        <PinnedSummary node={pinned} onClose={() => setPinnedId(null)} />
      )}
    </div>
  );
}

// Lane bands and year labels render inside the ReactFlow viewport so they
// pan with the timeline. They sit at z-index 0 (behind nodes).
function LaneBands({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {LANES.map((lane, i) => (
        <div
          key={lane}
          style={{
            position: "absolute",
            left: 0,
            top: i * LANE_HEIGHT,
            width: "100%",
            height: LANE_HEIGHT,
            borderTop: i === 0 ? "none" : "1px solid var(--color-bg-2)",
          }}
        >
          <span
            style={{
              position: "sticky",
              left: 16,
              top: 16,
              display: "inline-block",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: laneColor[lane],
              padding: "4px 8px",
              background: "var(--color-bg-1)",
              borderRadius: 3,
              opacity: 0.9,
            }}
          >
            {lane}
          </span>
        </div>
      ))}
    </div>
  );
}

function YearLabels({
  ticks,
  height,
}: {
  ticks: { year: number; x: number }[];
  height: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        height,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {ticks.map(({ year, x }) => (
        <div
          key={year}
          style={{
            position: "absolute",
            left: x,
            top: 0,
            height,
            borderLeft: "1px dashed var(--color-bg-2)",
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: "translateX(-50%)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-ink-mute)",
              marginTop: -6,
              padding: "0 4px",
              background: "var(--color-bg-0)",
            }}
          >
            {year}
          </span>
        </div>
      ))}
    </div>
  );
}

function FilterBar({
  filters,
  setFilters,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}) {
  const toggleLane = (lane: Lane) =>
    setFilters((cur) => {
      const next = new Set(cur.lanes);
      next.has(lane) ? next.delete(lane) : next.add(lane);
      return { ...cur, lanes: next };
    });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 24px",
        borderBottom: "1px solid var(--color-bg-2)",
        background: "rgba(8, 9, 11, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 4,
      }}
    >
      <Link
        href="/graph"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--color-ink-mute)",
          textDecoration: "none",
        }}
      >
        ← constellation
      </Link>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-ink-mute)" }}>
        timeline
      </span>
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: "flex",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
        }}
      >
        {LANES.map((lane) => {
          const on = filters.lanes.has(lane);
          return (
            <button
              key={lane}
              onClick={() => toggleLane(lane)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${
                  on ? laneColor[lane] : "var(--color-bg-2)"
                }`,
                color: on ? laneColor[lane] : "var(--color-ink-mute)",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {lane}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PinnedSummary({ node, onClose }: { node: Node; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        width: 320,
        background: "rgba(14, 16, 20, 0.92)",
        backdropFilter: "blur(8px)",
        border: "1px solid var(--color-bg-2)",
        borderRadius: 6,
        padding: 16,
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--color-ink-mute)",
          marginBottom: 6,
        }}
      >
        <span>
          {new Date(node.date).toISOString().slice(0, 10)} · {node.lane}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--color-ink-mute)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 11,
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 18,
          letterSpacing: "-0.01em",
          color: "var(--color-ink)",
          marginBottom: 6,
        }}
      >
        {node.title}
      </div>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--color-ink-dim)",
          marginBottom: 12,
        }}
      >
        {node.summary}
      </p>
      <Link
        href={nodeHref(node)}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--color-accent)",
          textDecoration: "none",
        }}
      >
        open →
      </Link>
    </div>
  );
}
