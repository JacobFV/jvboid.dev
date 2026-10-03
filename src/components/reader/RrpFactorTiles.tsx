import katex from "katex";
import tiles from "@/data/rrp-factor-tiles.json";
import { ReaderImage } from "./ReaderImage";

// The RRP project page's factor gallery: one tile per relation factor, the
// way the paper's tile figure shows them. Each family heading lives in the
// MDX body; this draws the tiles of one family under it.
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

export function RrpFactorTiles({ family }: { family: string }) {
  const list = all.filter((t) => t.family === family);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
        gap: "1.25rem 1rem",
        margin: "1.25rem 0 2.25rem",
      }}
    >
      {list.map((t) => (
        <div key={t.id} style={{ minWidth: 0 }}>
          <ReaderImage
            src={t.src}
            alt={`${t.id}: ${t.desc}`}
            width={600}
            height={450}
            style={{
              margin: 0,
              width: "100%",
              height: "auto",
              aspectRatio: "4 / 3",
              background: "var(--color-bg-1)",
              borderTop: `3px solid ${t.colour}`,
            }}
          />
          <div
            style={{
              marginTop: "0.5rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              color: t.colour,
              overflowWrap: "anywhere",
            }}
          >
            {t.id}
          </div>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.45, color: "var(--color-ink)" }}>
            {t.desc}
          </div>
          <div
            style={{
              marginTop: "0.3rem",
              fontSize: "0.85rem",
              color: "var(--color-ink-dim)",
              overflowX: "auto",
              overflowY: "hidden",
            }}
          >
            {renderEq(t.eq)}
          </div>
          <div
            style={{
              marginTop: "0.3rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.68rem",
              color: "var(--color-ink-mute)",
            }}
          >
            source: {t.source}
            {t.illustrative && (
              <span style={{ display: "block", color: "var(--color-accent)" }}>
                illustrative: {t.illustrative}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
