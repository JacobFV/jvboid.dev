import katex from "katex";
import tiles from "@/data/rrp-factor-tiles.json";
import { ReaderImage } from "./ReaderImage";
import { CardStack } from "./CardStack";

// The RRP project page's factor gallery: one card per relation factor, the
// way the paper's tile figure shows them, dealt as one swipeable deck per
// family (CardStack). Each family heading lives in the MDX body; this deals
// the cards of one family under it.
//
// The data is generated from the research repo's figure metadata
// (docs/paper/figures/factor_grid.json) — names, one-line descriptions,
// equations, the source of the values drawn and the illustrative flag — so
// nothing here is hand-written. The equations are the paper's LaTeX, with
// its \tileind macro spelled \mathbb{1}; an entry that mixes words and math
// marks the math with $…$, which is rendered with KaTeX on the server.

type Tile = {
  id: string;
  family: string;
  src: string;
  desc: string;
  eq: string;
  source: string;
  status: string;
  colour: string;
  illustrative?: string;
};

const all = tiles as Tile[];

function renderEq(eq: string) {
  const parts = eq.split("$");
  // No `$` at all: plain words (e.g. "index of the active task event").
  if (parts.length === 1) return [<span key={0}>{eq}</span>];
  return parts.map((part, i) =>
    i % 2 ? (
      <span
        key={i}
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(part, { throwOnError: false, output: "html" }),
        }}
      />
    ) : (
      part && <span key={i}>{part}</span>
    ),
  );
}

// The paper's family colours, as page tokens: the kinematics/UI grey and
// the amber need a different shade on each ground (globals.css, "RRP").
const familyClass: Record<string, string> = {
  "#2BB3C0": "rrp-geo",
  "#3A3F47": "rrp-kin",
  "#F2A33A": "rrp-ix",
  "#8C7CF0": "rrp-task",
  "#4E9A5B": "rrp-struct",
};

export function RrpFactorTiles({ family }: { family: string }) {
  const list = all.filter((t) => t.family === family);
  return (
    <CardStack label={`${family} factors, ${list.length} cards`}>
      {list.map((t) => (
        <article key={t.id} className={`rrp-tile ${familyClass[t.colour] ?? ""}`}>
          <ReaderImage src={t.src} alt={`${t.id}: ${t.desc}`} width={600} height={450} draggable={false} />
          <div className="rrp-tile-body">
            <div className="rrp-tile-id">{t.id}</div>
            <p className="rrp-tile-desc">{t.desc}</p>
            <div className="rrp-tile-eq">{renderEq(t.eq)}</div>
            <div className="rrp-tile-source">
              source: {t.source}
              {t.illustrative && <span>illustrative: {t.illustrative}</span>}
            </div>
          </div>
        </article>
      ))}
    </CardStack>
  );
}
