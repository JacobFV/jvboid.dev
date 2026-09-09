import type { ReactNode } from "react";

/**
 * A line lifted from the body and set at display size out in the page margin.
 *
 * It floats, so the body column keeps running beside it — that is the whole
 * magazine effect, and it means the quote belongs *before* the paragraph it
 * should sit next to, not after. Below 64rem there is no margin to bleed
 * into, so it stacks full-width instead.
 *
 * `aria-hidden` by default: a pull quote repeats prose the reader meets again
 * a paragraph later, and a screen reader that says it twice turns the
 * flourish into a stutter. Pass `spoken` for a quote whose text appears
 * nowhere else in the body.
 */
export function PullQuote({
  children,
  side = "right",
  cite,
  spoken = false,
}: {
  children: ReactNode;
  side?: "left" | "right";
  cite?: string;
  spoken?: boolean;
}) {
  return (
    <aside
      className="pull-quote"
      data-side={side}
      aria-hidden={spoken ? undefined : true}
    >
      <div className="pull-quote-line">{children}</div>
      {cite ? <cite>{cite}</cite> : null}
    </aside>
  );
}
