import katex from "katex";
import { ReaderImage } from "./ReaderImage";
import { RrpLogitLeaders } from "./RrpLogitLeaders";

// Fig. 2 of the RRP report, rebuilt for the page instead of pasted in as one
// white PNG: the equation is KaTeX on the page's own ground, the eight
// panels are the paper's standalone panel renders (docs/paper/figures/
// fig2_panel_*.png, which carry their own factor id and formula), and the
// leader lines from each term to its panel are drawn by RrpLogitLeaders
// once the browser has laid both out. The TeX of each term is the paper's
// (make_figures.py, _composite). Odd panels sit above the equation, even
// ones below, as in the paper; narrow columns drop the leaders and list
// the panels in order, each under its own term.

const tex = (s: string) => katex.renderToString(s, { throwOnError: false, output: "html" });

type Family = "geo" | "kin" | "ix" | "task";

const PANELS: { term: string; family: Family; src: string; alt: string }[] = [
  {
    term: String.raw`b_{\rm dist}`,
    family: "geo",
    src: "1-geo-pos3d",
    alt: "geo.pos3d, distance part: −(r_j − r_i)ᵀM(r_j − r_i) from the cube over every pixel of a Panda pick-and-place state. Hand-set coefficients.",
  },
  {
    term: String.raw`b_{\rm dir}`,
    family: "geo",
    src: "2-geo-pos3d",
    alt: "geo.pos3d, direction part: b̃ᵀ(r_j − r_i) from the cube, same state. Hand-set coefficients.",
  },
  {
    term: String.raw`b_{\rm kin}`,
    family: "kin",
    src: "3-kin-ancestor",
    alt: "kin.ancestor: the ten ancestors of the G1 left wrist in its declared kinematic tree. Given structure.",
  },
  {
    term: String.raw`b_{\rm contact}`,
    family: "ix",
    src: "4-ix-contact",
    alt: "ix.contact: gripper–cube contact at grasp close, with the simulator contact points. Simulator label; trains the probe.",
  },
  {
    term: String.raw`b_{\rm supp/flow}`,
    family: "ix",
    src: "5-ix-force-flow",
    alt: "ix.force_flow: the bottom cube of a three-cube stack carries the two above it. Simulator label closed by the flow operator.",
  },
  {
    term: String.raw`b_{\rm held}`,
    family: "ix",
    src: "6-ix-held-by",
    alt: "ix.held_by: the lifted cube is held by the gripper. Simulator label; trains the probe.",
  },
  {
    term: String.raw`g_{\rm task}\,b_{\rm next}`,
    family: "task",
    src: "7-task-next-contact",
    alt: "task.next_contact: the posterior over the gripper's next contact after one distractor is excluded — 0.5, 0.5, 0. Synthetic evidence schedule.",
  },
  {
    term: String.raw`b_{\rm ui}`,
    family: "kin",
    src: "8-ui-label-for",
    alt: "ui.label_for: the Name label points at its text box in a rendered Computerworld form; grey frame is ui.above. Given structure.",
  },
];

const LEAD = tex(String.raw`\mathrm{logit}(i,j)\;=\;\dfrac{\langle q_i,k_j\rangle}{\sqrt{d}}`);
const PLUS = tex("+");

export function RrpLogitFigure() {
  return (
    <figure className="rrp-logit">
      <div className="rrp-logit-grid">
        <div className="rrp-logit-eq">
          <span className="rrp-logit-lead">
            <span dangerouslySetInnerHTML={{ __html: LEAD }} />
            <span className="rrp-logit-note">learned · no panel</span>
          </span>
          {PANELS.map((p, i) => (
            <span key={p.src} className="rrp-logit-pair">
              <span className="rrp-logit-plus" dangerouslySetInnerHTML={{ __html: PLUS }} />
              <span
                className={`rrp-logit-term rrp-${p.family}`}
                data-term={i + 1}
                dangerouslySetInnerHTML={{ __html: tex(p.term) }}
              />
            </span>
          ))}
        </div>
        {PANELS.map((p, i) => (
          <div
            key={p.src}
            className={`rrp-logit-panel rrp-${p.family}`}
            data-panel={i + 1}
            style={{ order: i + 1 }}
          >
            <span
              className="rrp-logit-panel-term"
              dangerouslySetInnerHTML={{ __html: tex(p.term) }}
            />
            <ReaderImage src={`/assets/media/rrp/logit/${p.src}.webp`} alt={p.alt} width={600} height={450} />
          </div>
        ))}
        <RrpLogitLeaders count={PANELS.length} />
      </div>
      <figcaption>
        One attention logit, one term per panel. Each panel draws one term for one query token
        (ring) over a real simulator state. The factor operators compute the values; they are not
        learned attention. Panels 1–2 use hand-set coefficients. Panels 3 and 8 are given
        structure. Panels 4–7 show the simulator label that trains the probe; the deployed term is
        the probe estimate.
      </figcaption>
    </figure>
  );
}
