// Server-rendered mini-constellation. Static SVG using the same
// d3-force layout the constellation uses, scaled down. Sits in the
// right rail of /loop chapters so the reader can branch out without
// losing scroll position.

import { computeForceLayout } from "@/lib/layout";
import { getGraph, nodeHref, type Lane } from "@/lib/graph";

const W = 240;
const H = 320;
const PAD = 12;

const laneColor: Record<Lane, string> = {
  research: "#6FA8DC",
  building: "#93C47D",
  writing: "#C27BA0",
  personal: "#F1C232",
};

// Memoize once per process — the graph doesn't change between requests.
let cached: { positions: Map<string, { x: number; y: number }> } | null = null;

function projectedLayout() {
  if (cached) return cached;

  const { nodes, edges } = getGraph();
  const raw = computeForceLayout(nodes, edges, {
    width: 800,
    height: 1000,
    ticks: 240,
  });

  // Fit to (W, H) viewport with PAD margin.
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const scaleX = (W - 2 * PAD) / dx;
  const scaleY = (H - 2 * PAD) / dy;

  const positions = new Map(
    raw.map((p) => [
      p.id,
      {
        x: PAD + (p.x - minX) * scaleX,
        y: PAD + (p.y - minY) * scaleY,
      },
    ]),
  );
  cached = { positions };
  return cached;
}

export function MiniConstellation({ highlight }: { highlight?: string[] }) {
  const { nodes, edges } = getGraph();
  const { positions } = projectedLayout();
  const highlightSet = new Set(highlight ?? []);

  return (
    <aside
      style={{
        position: "sticky",
        top: 80,
        marginLeft: "auto",
        width: W,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--color-ink-mute)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        constellation
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        style={{
          background: "rgba(8, 9, 11, 0.04)",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          borderRadius: 4,
          display: "block",
        }}
        role="img"
        aria-label="Mini constellation of every node"
      >
        {edges.map((e, i) => {
          const a = positions.get(e.source);
          const b = positions.get(e.target);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#5A6070"
              strokeWidth={0.4}
              opacity={0.18}
            />
          );
        })}
        {nodes.map((n) => {
          const p = positions.get(n.id);
          if (!p) return null;
          const isHi = highlightSet.has(n.id);
          return (
            <a key={n.id} href={nodeHref(n)} target="_blank" rel="noreferrer">
              <circle
                cx={p.x}
                cy={p.y}
                r={isHi ? 3 : 1.6}
                fill={laneColor[n.lane]}
                opacity={isHi ? 1 : 0.7}
              >
                <title>{n.title}</title>
              </circle>
            </a>
          );
        })}
      </svg>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--color-ink-mute)",
          marginTop: 8,
          lineHeight: 1.5,
        }}
      >
        click a node to open in a new tab
      </div>
    </aside>
  );
}
