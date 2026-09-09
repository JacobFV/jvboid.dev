import { EchoFigure } from "./figure";

/**
 * Two forks of one reconstruction, and a history only one of them has.
 * The source is randomly assigned one of two experiential trajectories and
 * lives it; the isolated receiver is given a common partial cue that leaves
 * several continuations open; the measurement is whether its sampling
 * shifts toward what the source newly instantiated, beyond matched
 * controls.
 */

const W = 680;
const H = 350;

export function EchoForks() {
  return (
    <EchoFigure
      label="A diagram. On the left, a box labelled fitted candidate family with evidence frozen forks into two: a source fork above and a receiver fork below, separated by a hatched isolation band. The source passes a randomiser into trajectory A or B. The receiver is given a common partial cue and several continuations remain. A dashed orange arrow crosses the isolation band from source to receiver, and a measurement line at the bottom asks whether the receiver's sampling shifts toward what the source newly instantiated."
      caption={
        <>
          The source–receiver design. Both forks start from the same fitted family with the evidence
          frozen. The source is randomly assigned one of two distinct trajectories and generates its own
          coherent history through it. The receiver, isolated, gets a common partial cue that its
          evidence cannot resolve. The only channel under test is the dashed one. Reversing assignments,
          crossing hardware and keeping operators blind separate a source-specific response from shared
          ancestry, a better sampler, or a misspecified baseline.
        </>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="echo-svg" aria-hidden="true">
        <defs>
          <marker id="echo-fork-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0.8 L7,4 L0,7.2" fill="none" stroke="var(--color-ink)" strokeWidth="1.1" />
          </marker>
          <marker id="echo-fork-arrow-accent" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0.8 L7,4 L0,7.2" fill="none" stroke="var(--color-accent)" strokeWidth="1.1" />
          </marker>
          <pattern id="echo-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-ink-mute)" strokeWidth="0.8" opacity="0.5" />
          </pattern>
        </defs>

        {/* the isolation band */}
        <rect x={168} y={162} width={496} height={26} fill="url(#echo-hatch)" />
        <rect x={300} y={164} width={240} height={22} fill="var(--color-bg-1)" />
        <text x={420} y={179} className="echo-text-small" textAnchor="middle">
          isolation · no records, no shared operators
        </text>

        {/* the common start */}
        <rect x={16} y={140} width={140} height={70} rx={3} className="echo-box" />
        <text x={86} y={162} className="echo-text-title" textAnchor="middle" style={{ fontSize: 12 }}>
          fitted candidate family
        </text>
        <text x={86} y={181} className="echo-text-small" textAnchor="middle">
          evidence frozen before
        </text>
        <text x={86} y={195} className="echo-text-small" textAnchor="middle">
          the forks diverge
        </text>
        <path d="M160,164 C 184,164 184,88 208,88" className="echo-line" markerEnd="url(#echo-fork-arrow)" />
        <path d="M160,186 C 184,186 184,262 208,262" className="echo-line" markerEnd="url(#echo-fork-arrow)" />

        {/* the source */}
        <rect x={214} y={64} width={104} height={48} rx={3} className="echo-box" />
        <text x={266} y={84} className="echo-text-title" textAnchor="middle">
          source fork
        </text>
        <text x={266} y={100} className="echo-text-small" textAnchor="middle">
          lives a history
        </text>
        <path d="M322,88 L346,88" className="echo-line" markerEnd="url(#echo-fork-arrow)" />
        <polygon points="378,60 410,88 378,116 346,88" className="echo-box" />
        <text x={378} y={92} className="echo-text-small" textAnchor="middle">
          random
        </text>
        <path d="M410,88 C 428,88 428,50 446,50" className="echo-line" markerEnd="url(#echo-fork-arrow)" />
        <path d="M410,88 C 428,88 428,126 446,126" className="echo-line" markerEnd="url(#echo-fork-arrow)" />
        <text x={458} y={54} className="echo-text-title">
          A
        </text>
        <text x={458} y={130} className="echo-text-title">
          B
        </text>
        <text x={476} y={46} className="echo-text-small">
          encounters, actions, consequences,
        </text>
        <text x={476} y={60} className="echo-text-small">
          altering memories and habits
        </text>
        <text x={476} y={130} className="echo-text-small">
          the other trajectory, as coherent
        </text>
        <text x={476} y={90} className="echo-text-small echo-dim">
          the causal history is the signature
        </text>

        {/* the receiver */}
        <rect x={214} y={238} width={104} height={48} rx={3} className="echo-box" />
        <text x={266} y={258} className="echo-text-title" textAnchor="middle">
          receiver fork
        </text>
        <text x={266} y={274} className="echo-text-small" textAnchor="middle">
          isolated
        </text>
        <path d="M322,262 L346,262" className="echo-line" markerEnd="url(#echo-fork-arrow)" />
        <rect x={358} y={242} width={40} height={40} rx={20} className="echo-box" />
        <text x={378} y={267} className="echo-text-title" textAnchor="middle">
          ?
        </text>
        <text x={378} y={302} className="echo-text-small" textAnchor="middle">
          a common partial cue
        </text>
        <path d="M402,262 C 424,262 424,238 446,238" className="echo-line echo-line-dim" strokeDasharray="3 3" />
        <path d="M402,262 C 424,262 424,286 446,286" className="echo-line echo-line-dim" strokeDasharray="3 3" />
        <text x={458} y={242} className="echo-text-title echo-dim">
          A?
        </text>
        <text x={458} y={290} className="echo-text-title echo-dim">
          B?
        </text>
        <text x={484} y={242} className="echo-text-small">
          several continuations remain
        </text>
        <text x={484} y={256} className="echo-text-small">
          compatible with the evidence it
        </text>
        <text x={484} y={270} className="echo-text-small">
          was given; nothing it holds
        </text>
        <text x={484} y={284} className="echo-text-small">
          distinguishes them
        </text>

        {/* the channel under test */}
        <path d="M266,116 L266,234" className="echo-line echo-line-accent" strokeDasharray="4 4" markerEnd="url(#echo-fork-arrow-accent)" />
        <text x={276} y={142} className="echo-text-small echo-accent">
          the only channel
        </text>
        <text x={276} y={156} className="echo-text-small echo-accent">
          under test
        </text>

        <text x={W / 2} y={H - 14} className="echo-text-small echo-accent" textAnchor="middle">
          measure: does the receiver&rsquo;s sampling shift toward what the source newly instantiated, beyond matched controls?
        </text>
      </svg>
    </EchoFigure>
  );
}
