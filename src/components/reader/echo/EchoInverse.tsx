import { EchoFigure } from "./figure";

/**
 * The digital stage is one loop between two models. A generative model
 * proposes candidate brain–body organizations; an evidence model scores
 * how well each explains the surviving traces and predicts the ones held
 * back; candidates are retained, varied and tested again. Gradient fitting,
 * posterior sampling and population search are implementations of that
 * relationship, not alternatives to it. The evidence arrives with three
 * different error structures.
 */

const W = 640;
const H = 356;

const TRACES = [
  { x: 118, title: "a diary entry", note: ["self-selected, retrospective,", "written for an audience"] },
  { x: 320, title: "a remembered disagreement", note: ["reconstructed on every retelling,", "shaped by the person remembering"] },
  { x: 522, title: "an electrophysiological trace", note: ["precise about signal, mute about", "the context that produced it"] },
];

export function EchoInverse() {
  return (
    <EchoFigure
      label="Two boxes, generative model on the left and evidence model on the right, joined by an arrow labelled simulate running right and an arrow labelled retain and vary running back left. Below, three kinds of evidence feed the evidence model, each with a note on its error structure."
      caption={
        <>
          One generative model, one evidence model, iterated. The prior is shared human anatomy and
          physiology; the likelihood concerns this particular person. A diary entry, a remembered
          disagreement and an electrophysiological recording carry different error structures, and ten
          retellings of one event do not become ten independent constraints. Missing context is
          integrated over, never fixed to whichever imagined circumstance flatters a candidate.
        </>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="echo-svg" aria-hidden="true">
        <defs>
          <marker id="echo-inv-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0.8 L7,4 L0,7.2" fill="none" stroke="var(--color-ink)" strokeWidth="1.1" />
          </marker>
        </defs>

        {/* the two models */}
        <rect x={40} y={36} width={224} height={110} rx={3} className="echo-box" />
        <text x={152} y={60} className="echo-text-title" textAnchor="middle">
          generative model
        </text>
        <text x={152} y={80} className="echo-text-small" textAnchor="middle">
          proposes candidate organizations θ:
        </text>
        <text x={152} y={94} className="echo-text-small" textAnchor="middle">
          connectivity, process parameters,
        </text>
        <text x={152} y={108} className="echo-text-small" textAnchor="middle">
          learned associations, body properties
        </text>
        <text x={152} y={132} className="echo-text-small echo-dim" textAnchor="middle">
          prior: shared anatomy and physiology
        </text>

        <rect x={376} y={36} width={224} height={110} rx={3} className="echo-box" />
        <text x={488} y={60} className="echo-text-title" textAnchor="middle">
          evidence model
        </text>
        <text x={488} y={80} className="echo-text-small" textAnchor="middle">
          scores how well a candidate explains
        </text>
        <text x={488} y={94} className="echo-text-small" textAnchor="middle">
          the surviving traces, and predicts
        </text>
        <text x={488} y={108} className="echo-text-small" textAnchor="middle">
          traces held back from the fitting
        </text>
        <text x={488} y={132} className="echo-text-small echo-dim" textAnchor="middle">
          likelihood: this particular person
        </text>

        {/* the loop between them */}
        <path d="M268,70 L370,70" className="echo-line" markerEnd="url(#echo-inv-arrow)" />
        <path d="M268,70 L370,70" className="echo-flow" />
        <text x={320} y={60} className="echo-text-small" textAnchor="middle">
          simulate
        </text>
        <path d="M372,116 L270,116" className="echo-line" markerEnd="url(#echo-inv-arrow)" />
        <path d="M372,116 L270,116" className="echo-flow" />
        <text x={320} y={132} className="echo-text-small" textAnchor="middle">
          retain · vary
        </text>

        {/* the evidence, with its error structures */}
        {TRACES.map((tr) => (
          <g key={tr.title}>
            <path d={`M${tr.x},${226} Q ${tr.x},${176} ${488},${152}`} className="echo-line echo-line-dim" />
            <text x={tr.x} y={248} className="echo-text-title" textAnchor="middle" style={{ fontSize: 12 }}>
              {tr.title}
            </text>
            {tr.note.map((line, k) => (
              <text key={line} x={tr.x} y={266 + k * 14} className="echo-text-small" textAnchor="middle">
                {line}
              </text>
            ))}
          </g>
        ))}
        <text x={W / 2} y={H - 28} className="echo-text-small echo-accent" textAnchor="middle">
          the ceiling: once different organizations explain every available trace,
        </text>
        <text x={W / 2} y={H - 14} className="echo-text-small echo-accent" textAnchor="middle">
          a sharper posterior bought with stronger regularization is preference, not knowledge
        </text>
      </svg>
    </EchoFigure>
  );
}
