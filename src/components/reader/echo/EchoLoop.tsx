import { EchoFigure } from "./figure";

/**
 * The recurrent loop a reconstruction would have to recover: world →
 * observation → perception → internal state → thoughts and candidate plans →
 * action → world, with affect in the middle as a few control variables
 * that modulate the whole cycle, and recall re-entering the loop as
 * observation. The arrows carry a slow dash flow (CSS, stilled under
 * reduced motion) because the point is that this is a cycle, not a
 * pipeline.
 */

const W = 700;
const H = 440;
const CX = 350;
const CY = 214;
const RX = 246;
const RY = 136;
const BW = 196;
const BH = 48;

type Node = { a: number; title: string; sub: string };
const NODES: Node[] = [
  { a: 180, title: "world", sub: "consequences return" },
  { a: 240, title: "observation", sub: "real and recalled" },
  { a: 300, title: "perception", sub: "read through the current state" },
  { a: 0, title: "beliefs · goals · memories", sub: "machinery, not storage" },
  { a: 60, title: "thoughts & candidate plans", sub: "competing for attention" },
  { a: 120, title: "action", sub: "changes world and actor alike" },
];

const rad = (d: number) => (d * Math.PI) / 180;
const at = (deg: number) => [CX + RX * Math.cos(rad(deg)), CY + RY * Math.sin(rad(deg))] as const;
const inBox = (p: readonly [number, number], n: Node) => {
  const [bx, by] = at(n.a);
  return Math.abs(p[0] - bx) <= BW / 2 + 6 && Math.abs(p[1] - by) <= BH / 2 + 6;
};

/** The ellipse arc from node i to node i+1, trimmed to the box edges. */
function arc(i: number): string {
  const a = NODES[i];
  const b = NODES[(i + 1) % NODES.length];
  const a0 = a.a;
  const a1 = b.a >= a0 ? b.a : b.a + 360;
  const pts: string[] = [];
  const steps = 120;
  for (let k = 0; k <= steps; k += 1) {
    const p = at(a0 + ((a1 - a0) * k) / steps);
    if (inBox(p, a) || inBox(p, b)) continue;
    pts.push(`${p[0].toFixed(1)},${p[1].toFixed(1)}`);
  }
  return `M${pts.join(" L")}`;
}

export function EchoLoop() {
  return (
    <EchoFigure
      label="Six boxes arranged in a ring joined by flowing arrows: world, observation, perception, beliefs goals and memories, thoughts and candidate plans, action, and back to world. A box labelled affect sits in the middle with dotted spokes to four of the six. A dashed orange arrow returns from the memories box to observation, labelled recall re-enters as observation."
      caption={
        <>
          The loop, not the outputs. Observation is read through the current internal state;
          perceptions perturb beliefs, goals, feelings and memories; those nucleate candidate plans that
          compete and become actions; actions change the world and the actor, and the cycle begins
          again. Affect is not a box on the ring but a few control variables that retune the whole
          ring. Reproducing old answers constrains this process; generating characteristically personal
          new trajectories is the much stronger requirement.
        </>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="echo-svg" aria-hidden="true">
        <defs>
          <marker id="echo-loop-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0.8 L7,4 L0,7.2" fill="none" stroke="var(--color-ink)" strokeWidth="1.1" />
          </marker>
          <marker id="echo-loop-arrow-accent" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0.8 L7,4 L0,7.2" fill="none" stroke="var(--color-accent)" strokeWidth="1.1" />
          </marker>
        </defs>

        {/* the ring */}
        {NODES.map((_, i) => (
          <g key={i}>
            <path d={arc(i)} className="echo-line" markerEnd="url(#echo-loop-arrow)" />
            <path d={arc(i)} className="echo-flow" />
          </g>
        ))}

        {/* recall re-entry: memories → observation, the long way round the top */}
        <path
          d={`M${at(0)[0] - 40},${at(0)[1] - BH / 2 - 4} C ${CX + 190},${CY - 196} ${CX - 30},${CY - 206} ${at(240)[0] + 50},${at(240)[1] - BH / 2 - 4}`}
          className="echo-line echo-line-accent"
          strokeDasharray="4 4"
          markerEnd="url(#echo-loop-arrow-accent)"
        />
        <text x={CX - 130} y={CY - 178} className="echo-text-small echo-accent" textAnchor="end">
          recall re-enters as observation
        </text>

        {/* affect: a few control variables, distributed */}
        <g strokeDasharray="2 3" className="echo-line echo-line-dim">
          <line x1={CX + 100} y1={CY - 10} x2={at(300)[0] - 30} y2={at(300)[1] + BH / 2 + 4} />
          <line x1={CX + 106} y1={CY + 2} x2={at(0)[0] - BW / 2 - 4} y2={at(0)[1] - 4} />
          <line x1={CX + 80} y1={CY + 26} x2={at(60)[0] - 40} y2={at(60)[1] - BH / 2 - 4} />
          <line x1={CX - 80} y1={CY + 26} x2={at(120)[0] + 40} y2={at(120)[1] - BH / 2 - 4} />
          <line x1={CX - 100} y1={CY - 10} x2={at(240)[0] + 30} y2={at(240)[1] + BH / 2 + 4} />
        </g>
        <rect x={CX - 106} y={CY - 26} width={212} height={52} rx={3} className="echo-box" />
        <text x={CX} y={CY - 5} className="echo-text-title" textAnchor="middle">
          affect
        </text>
        <text x={CX} y={CY + 12} className="echo-text-small" textAnchor="middle">
          a few control variables, distributed
        </text>

        {/* the six nodes */}
        {NODES.map((n) => {
          const [x, y] = at(n.a);
          return (
            <g key={n.title}>
              <rect x={x - BW / 2} y={y - BH / 2} width={BW} height={BH} rx={3} className="echo-box" />
              <text x={x} y={y - 4} className="echo-text-title" textAnchor="middle">
                {n.title}
              </text>
              <text x={x} y={y + 13} className="echo-text-small" textAnchor="middle">
                {n.sub}
              </text>
            </g>
          );
        })}

        <text x={16} y={H - 44} className="echo-text-small">
          fear narrows which futures get attention
        </text>
        <text x={16} y={H - 30} className="echo-text-small">
          curiosity changes the exploration policy
        </text>
        <text x={16} y={H - 16} className="echo-text-small">
          attachment reprices another person&rsquo;s states
        </text>
        <text x={W - 16} y={H - 16} className="echo-text-small" textAnchor="end">
          from the inside: internal first, action second, observation third
        </text>
      </svg>
    </EchoFigure>
  );
}
