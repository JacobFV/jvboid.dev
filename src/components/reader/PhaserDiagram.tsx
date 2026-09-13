import { EchoFigure } from "./echo/figure";

/**
 * The PHASER signal path, top to bottom, in the hairline style of the
 * echo essay's figures (the `.echo-svg` classes): a laser encodes xₜ
 * through M_in, drops through a partially reflective coupler into the
 * chamber, bounces up and down between the two couplers through the
 * programmable M_step planes, and a sample leaves through the readout coupler, M_out
 * and a lens onto the CCD as yₜ. Vertical, so it fits the prose column
 * at any width instead of scrolling sideways.
 */

const W = 440;
const H = 708;
const IN_X = 165; // input column
const OUT_X = 275; // output column
const PLANES = [246, 312, 378];
// Where the in-chamber arrows start and stop: just clear of each coupler.
const BOUNCE_TOP = 194;
const BOUNCE_BOTTOM = 466;

function Plate({ x, y, w }: { x: number; y: number; w: number }) {
  const ticks = [];
  for (let t = x + 8; t < x + w - 4; t += 12) ticks.push(t);
  return (
    <g>
      <rect x={x} y={y} width={w} height={9} rx={1.5} className="echo-box" />
      {ticks.map((t) => (
        <line key={t} x1={t} x2={t} y1={y + 2} y2={y + 7} className="echo-line echo-line-dim" style={{ strokeWidth: 0.7 }} />
      ))}
    </g>
  );
}

function Beam({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <line
      x1={x}
      x2={x}
      y1={y1}
      y2={y2}
      className="echo-line echo-line-accent"
      style={{ strokeWidth: 1.6 }}
      markerEnd="url(#phaser-arrow)"
    />
  );
}

export function PhaserDiagram() {
  return (
    <EchoFigure
      label="The PHASER signal path, top to bottom. A laser's input passes through the input modulator M_in and a partially reflective coupler into the recurrent photon chamber. Inside, the beam bounces up and down between the two couplers, crossing three programmable M_step planes on every pass. A sample leaves through the readout coupler, the output modulator M_out and a lens onto a CCD as the output."
      caption={
        <>
          Signal flow shown schematically: xₜ is encoded by M_in; the optical state h recirculates
          through the programmable M_step planes, bouncing up and down between the couplers; M_out couples a
          sample through the focusing lens onto the CCD as yₜ.
        </>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="echo-svg" style={{ maxWidth: W, margin: "0 auto" }} aria-hidden="true">
        <defs>
          <marker id="phaser-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0.8 L7,4 L0,7.2" fill="none" stroke="var(--color-accent)" strokeWidth="1.1" />
          </marker>
          {/* The same head, mirrored at a line's start, for the arrows
              that point both ways inside the chamber. */}
          <marker id="phaser-arrow-both" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0.8 L7,4 L0,7.2" fill="none" stroke="var(--color-accent)" strokeWidth="1.1" />
          </marker>
        </defs>

        {/* laser and input modulator */}
        <rect x={IN_X - 60} y={14} width={120} height={46} rx={3} className="echo-box" />
        <text x={IN_X} y={34} className="echo-text-title" textAnchor="middle">
          laser
        </text>
        <text x={IN_X} y={50} className="echo-text-small" textAnchor="middle">
          input xₜ
        </text>
        <Beam x={IN_X} y1={60} y2={80} />
        <Plate x={IN_X - 50} y={82} w={100} />
        <text x={IN_X + 58} y={90} className="echo-text-small echo-mono">
          M_in
        </text>
        <Beam x={IN_X} y1={92} y2={180} />

        {/* the chamber */}
        <text x={370} y={132} className="echo-text-title" textAnchor="end">
          recurrent photon chamber
        </text>
        <rect x={70} y={140} width={300} height={380} rx={4} className="echo-line echo-line-dim" />

        <line x1={96} x2={344} y1={184} y2={184} className="echo-line" style={{ strokeWidth: 2.6 }} />
        <text x={IN_X + 13} y={177} className="echo-text-small echo-dim">
          partially reflective coupler
        </text>
        <line x1={96} x2={344} y1={476} y2={476} className="echo-line" style={{ strokeWidth: 2.6 }} />
        <text x={OUT_X - 13} y={494} className="echo-text-small echo-dim" textAnchor="end">
          readout coupler
        </text>

        {PLANES.map((y) => (
          <Plate key={y} x={130} y={y} w={180} />
        ))}
        <text x={318} y={PLANES[0] + 8} className="echo-text-small echo-mono">
          M_step
        </text>

        {[IN_X, OUT_X].map((x) => (
          <line
            key={x}
            x1={x}
            x2={x}
            y1={BOUNCE_TOP}
            y2={BOUNCE_BOTTOM}
            className="echo-line echo-line-accent"
            style={{ strokeWidth: 1.4 }}
            markerStart="url(#phaser-arrow-both)"
            markerEnd="url(#phaser-arrow-both)"
          />
        ))}
        {PLANES.flatMap((y) => [
          <circle key={`i${y}`} cx={IN_X} cy={y + 4.5} r={2.6} className="echo-accent" />,
          <circle key={`o${y}`} cx={OUT_X} cy={y + 4.5} r={2.6} className="echo-accent" />,
        ])}
        <text x={IN_X - 10} y={284} className="echo-text-small" textAnchor="end">
          bounces · hₜ
        </text>

        {/* readout */}
        <Beam x={OUT_X} y1={476} y2={546} />
        <Plate x={OUT_X - 50} y={548} w={100} />
        <text x={OUT_X + 58} y={556} className="echo-text-small echo-mono">
          M_out
        </text>
        <Beam x={OUT_X} y1={558} y2={586} />
        <ellipse cx={OUT_X} cy={598} rx={44} ry={9} className="echo-box" />
        <text x={OUT_X + 52} y={602} className="echo-text-small">
          lens
        </text>
        <Beam x={OUT_X} y1={607} y2={634} />
        <rect x={OUT_X - 60} y={636} width={120} height={58} rx={3} className="echo-box" />
        {[0, 1, 2, 3, 4, 5].flatMap((i) =>
          [0, 1].map((j) => (
            <rect
              key={`${i}-${j}`}
              x={OUT_X - 46 + i * 16}
              y={644 + j * 14}
              width={12}
              height={10}
              rx={1}
              className="echo-line echo-line-dim"
              style={{ strokeWidth: 0.7 }}
            />
          )),
        )}
        <text x={OUT_X} y={686} className="echo-text-title" textAnchor="middle">
          CCD · yₜ
        </text>
      </svg>
    </EchoFigure>
  );
}
