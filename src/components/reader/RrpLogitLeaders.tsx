"use client";

import { useLayoutEffect, useRef, useState } from "react";

// The leader lines of the RRP logit figure (RrpLogitFigure.tsx): one line
// from each term of the equation to its panel. Where a term lands depends
// on KaTeX's glyph widths and on the column width, so the lines can only be
// drawn after layout; this measures `[data-term=n]` and `[data-panel=n]`
// inside its parent and redraws whenever the parent resizes. Panels above
// the equation get a line from the term's top edge to the panel's bottom
// edge, and panels below the reverse. The CSS hides the SVG in narrow
// columns, where each panel carries its own term instead.

type Line = { n: number; x1: number; y1: number; x2: number; y2: number; cls: string };

export function RrpLogitLeaders({ count }: { count: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [lines, setLines] = useState<Line[]>([]);

  useLayoutEffect(() => {
    const root = ref.current?.parentElement;
    if (!root) return;
    const draw = () => {
      const box = root.getBoundingClientRect();
      const next: Line[] = [];
      for (let n = 1; n <= count; n++) {
        const term = root.querySelector(`[data-term="${n}"]`);
        const panel = root.querySelector(`[data-panel="${n}"]`);
        if (!term || !panel) continue;
        const t = term.getBoundingClientRect();
        const p = panel.getBoundingClientRect();
        const above = p.bottom <= t.top;
        next.push({
          n,
          x1: t.left + t.width / 2 - box.left,
          y1: (above ? t.top - 2 : t.bottom + 2) - box.top,
          x2: p.left + p.width / 2 - box.left,
          y2: (above ? p.bottom + 6 : p.top - 6) - box.top,
          cls: panel.className.split(" ").find((c) => /^rrp-(geo|kin|ix|task)$/.test(c)) ?? "",
        });
      }
      setLines(next);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(root);
    document.fonts?.ready.then(draw);
    return () => ro.disconnect();
  }, [count]);

  return (
    <svg ref={ref} className="rrp-logit-leaders" aria-hidden="true">
      {lines.map((l) => (
        <line key={l.n} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className={l.cls} />
      ))}
    </svg>
  );
}
