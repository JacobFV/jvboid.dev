"use client";

import { Fragment, useId, useState } from "react";

import { HexShaped } from "@/components/chrome/HexFit";
import { SocialGlyph, type SocialGlyphName } from "@/components/chrome/SocialGlyphs";

// The hero's contact row.
//
// The row starts short — the handful of accounts worth interrupting
// someone for — and `▶ more` extends that same row in place with
// everything else (a decade of profiles across code hosts, Q&A sites,
// writing platforms, CAD, art, sound). Not a popover, not a panel: the
// extra links land in the same wrapping line as the first nine and flow
// around with them, with a small caption ahead of each category so the
// tail still reads as a directory. The toggle stays last either way.
//
// The row is inline flow, not flex, and that is load-bearing: inside the
// hexagon it is a `data-hex-shape` block, and floats — which is what
// HexFit's walls are — do not exist as far as a flex container is
// concerned. As line boxes, the links wrap to the hexagon's diagonals;
// as flex items they would have wrapped to a rectangle and hung out over
// the edges. Spacing is margins for the same reason: no `gap` without
// flex.

export type HeroSocial = {
  label: string;
  href: string;
  // Which mark sits in front of the label — see SocialGlyphs. A name, not
  // a component, because the hero crosses the server/client boundary.
  glyph: SocialGlyphName;
};

export type HeroSocialGroup = {
  title: string;
  items: HeroSocial[];
};

export function SocialLinks({
  socials,
  more,
  variant,
  className,
  style,
}: {
  socials: HeroSocial[];
  more: HeroSocialGroup[];
  variant: "hex" | "stack";
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const hex = variant === "hex";
  // The hexagon's row is tighter than the stacked hero's. `leading` is
  // the gap between wrapped lines now that this is inline flow.
  const item = hex ? "mx-[0.4em] my-[0.15em]" : "mx-[0.55em] my-[0.2em]";

  // Inside the hexagon the row is a shaped block so the links wrap to the
  // walls; in the stacked hero it is an ordinary centered measure.
  const Row = hex ? HexShaped : PlainRow;

  return (
    <Row
      className={["text-center", hex ? "" : "mx-auto max-w-2xl", className ?? ""].join(" ")}
      style={{
        // The air between wrapped link lines is padding like any other,
        // so it rides HexFit's first lever: 2.1 at rest, tightening to
        // ~1.55 when the column is out of room. Expanded, this row is
        // most of the height problem, which makes it most of the answer.
        lineHeight: hex ? "calc(1.45 + var(--hex-squeeze, 1) * 0.65)" : 2.1,
        ...style,
      }}
    >
      {socials.map((social) => (
        <SocialLink key={social.href} social={social} className={item} />
      ))}

      {open ? (
        <span id={listId} className="contents">
          {more.map((group) => (
            <Fragment key={group.title}>
              <span
                className={`inline-flex items-center gap-1 align-middle whitespace-nowrap text-[var(--color-ink-mute)] ${item}`}
              >
                <span aria-hidden className="opacity-40">
                  ·
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[0.85em] tracking-wider uppercase">
                  {group.title}
                </span>
              </span>
              {group.items.map((social) => (
                <SocialLink key={social.href} social={social} className={item} />
              ))}
            </Fragment>
          ))}
        </span>
      ) : (
        <span id={listId} hidden />
      )}

      {/* Always the last thing in the row — closed it ends the short set,
          open it ends the long one, so the control never moves out from
          under the links it just added. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
        className={`group inline-flex cursor-pointer items-center gap-1 align-middle font-[family-name:var(--font-mono)] whitespace-nowrap text-[var(--color-ink-dim)] hover:text-[var(--color-accent)] ${item}`}
      >
        <Caret open={open} />
        <span className="underline-offset-4 group-hover:underline">{open ? "hide" : "more"}</span>
      </button>
    </Row>
  );
}

function PlainRow({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

// ▶ closed, ▼ open — one triangle, rotated, so the two states are the
// same mark rather than two icons that have to be kept in sync.
function Caret({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-[0.8em] w-[0.8em] shrink-0 transition-transform duration-200 ease-out"
      style={{ transform: open ? "rotate(90deg)" : undefined }}
      aria-hidden
      focusable="false"
    >
      <path d="M8 4l10 8-10 8z" />
    </svg>
  );
}

function SocialLink({ social, className }: { social: HeroSocial; className?: string }) {
  const external = social.href.startsWith("http");
  return (
    <a
      href={social.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={`group inline-flex items-center gap-1 align-middle font-[family-name:var(--font-mono)] whitespace-nowrap text-[var(--color-ink-dim)] no-underline hover:text-[var(--color-accent)] ${className ?? ""}`}
    >
      <SocialGlyph name={social.glyph} />
      <span className="underline-offset-4 group-hover:underline">{social.label}</span>
    </a>
  );
}
