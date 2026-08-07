import Image from "next/image";

import { AskInput } from "@/components/chrome/AskInput";
import { HexFit, HexShaped } from "@/components/chrome/HexFit";
import {
  SocialLinks,
  type HeroSocial,
  type HeroSocialGroup,
} from "@/components/chrome/SocialLinks";
import { HEX_CLIP, HEX_RATIO, hexUnitWidth, type HexSize } from "@/lib/hex-layout";

// The landing hero: one hexagon on the projects comb rather than a block
// above it. `HeroHex` fills a cell the packer hands it (see
// ProjectsBrowser), so the project tiles nest against its edges the same
// way they nest against each other — same rigid-body space, one packing.
//
// Inside, the arrangement is the one this hero has always had: portrait,
// name, ask-me-anything bar, contact links, bio, centered in a column.
// The hexagon is the frame around it, not a layout system of its own —
// an earlier pass hung each piece off the hexagon's own edges and the
// copy fell out the bottom.
//
// ---- Geometry ---------------------------------------------------------
// Everything is a fraction of the hero's width, so the composition is
// resolution-free: the packer sizes the cell and the contents are
// percentages of it. Type scales with it too (`cqw` against the hero as
// a container).
//
// The contents are not inscribed in a rectangle. An earlier pass gave
// every row the width of the largest centered rectangle that fits (56%),
// which sizes the ask bar, the links, and the bio for the narrow ends of
// the hexagon even though only the portrait sits up there. `HexFit`
// instead gives each row the width the hexagon actually has at the
// height that row occupies — full width across the middle, tapering into
// the points. The column spans the whole frame and is centered in it;
// the walls, not a box, decide how wide each row gets.
//
// The old rectangle survives as the pre-hydration default — the
// `[&>*]:max-w-[56%]` on the column below — so the server HTML is laid
// out at a width that is safe anywhere in the hexagon. HexFit's inline
// max-widths override it row by row once it has measured.

// The hero's tile size, and the portrait's. The hero fixes the unit its
// portrait is cut from, so the portrait really is a 1× tile of the comb
// the projects sit on — the same 200-odd pixels across it has always
// been. (A 2× portrait spends half the hexagon's height and leaves the
// bio nowhere to go.)
export const HERO_SIZE: HexSize = 4;
const GAP = 0.014;
const PFP_W = hexUnitWidth(HERO_SIZE, 1, GAP);

const HEX_ASPECT = `1 / ${HEX_RATIO}`;
const PFP_SIZES = "(min-width: 1024px) 220px, 160px";

// Type tracks the hexagon, with floors for the narrowest comb it renders
// in. The name is the one thing that shrank from the old hero — inside
// the frame it has the hexagon's own shoulders to answer to.
// The gaps between rows, as fractions of the hero's width. `--hex-squeeze`
// is HexFit's first lever when the column outgrows the frame — see
// `fitHeight`. It is 1 whenever everything fits.
const gap = (pctOfWidth: number) => `calc(var(--hex-squeeze, 1) * ${pctOfWidth}%)`;
const GAP_NAME = gap(2.8);
const GAP_ASK = gap(2.2);
const GAP_LINKS = gap(1.7);
const GAP_BIO = gap(2.8);

const NAME_TYPE = "clamp(1.6rem, 5.4cqw, 3rem)";
const BIO_TYPE = "clamp(0.9rem, 2.3cqw, 1.15rem)";
const LINK_TYPE = "clamp(0.65rem, 1.7cqw, 0.8rem)";

export type { HeroSocial, HeroSocialGroup };

export type HeroContent = {
  name: string;
  bio: React.ReactNode;
  // The short contact row. Everything else hangs off `moreSocials`,
  // behind the row's `> more` toggle.
  socials: HeroSocial[];
  moreSocials: HeroSocialGroup[];
  pfp: { src: string; alt: string };
};

export function HeroHex({ name, bio, socials, moreSocials, pfp }: HeroContent) {
  return (
    <div className="relative h-full w-full" style={{ containerType: "inline-size" }}>
      <HexFrame />
      <HexFit className="absolute inset-0 flex flex-col items-center justify-center text-center [&>*]:max-w-[56%]">
        <div
          data-hex-pfp=""
          className="relative shrink-0 overflow-hidden"
          style={{
            width: `calc(var(--hex-pfp, 1) * ${PFP_W * 100}%)`,
            aspectRatio: HEX_ASPECT,
            clipPath: HEX_CLIP,
          }}
        >
          <Image
            src={pfp.src}
            alt={pfp.alt}
            fill
            sizes={PFP_SIZES}
            priority
            className="object-cover grayscale-[15%]"
          />
        </div>

        {/* Percentage margins resolve against the column, which is now the
            whole frame rather than the old 56% rectangle — hence the same
            gaps at 0.56× their old numbers. They are scaled by
            `--hex-squeeze` because they are the first thing HexFit spends
            when the column runs out of height: the air around the name
            goes before the portrait does. */}
        <h1
          className="font-[family-name:var(--font-display)] tracking-tight text-[var(--color-ink)]"
          style={{
            marginTop: GAP_NAME,
            fontSize: NAME_TYPE,
            fontVariationSettings: '"opsz" 144',
          }}
        >
          {name}
        </h1>

        <AskInput style={{ marginTop: GAP_ASK }} />

        {/* Both of these are shaped blocks: HexFit lays them out at the
            hexagon's full width where they sit and floats the diagonals
            back in, so the links and the copy wrap to the real walls
            rather than to a box drawn inside them. */}
        <SocialLinks
          socials={socials}
          more={moreSocials}
          variant="hex"
          className="w-full"
          style={{ marginTop: GAP_LINKS, fontSize: LINK_TYPE }}
        />

        <HexShaped
          as="p"
          className="w-full text-pretty text-[var(--color-ink-dim)]"
          style={{ marginTop: GAP_BIO, fontSize: BIO_TYPE, lineHeight: 1.55 }}
        >
          {bio}
        </HexShaped>
      </HexFit>
    </div>
  );
}

// The same hero, stacked, for viewports where the comb cannot give the
// hexagon enough room to hold this at a readable size. ProjectsBrowser
// swaps between this and the packed hexagon on the `lg` breakpoint, and
// leaves the hero out of the packing when this one is showing.
export function HeroStack({ name, bio, socials, moreSocials, pfp }: HeroContent) {
  return (
    <div className="mb-16 flex flex-col items-center text-center">
      <div
        className="relative w-[200px] overflow-hidden"
        style={{ aspectRatio: HEX_ASPECT, clipPath: HEX_CLIP }}
      >
        <Image
          src={pfp.src}
          alt={pfp.alt}
          fill
          sizes={PFP_SIZES}
          priority
          className="object-cover grayscale-[15%]"
        />
      </div>

      <h1
        className="mt-6 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--color-ink)] sm:text-5xl"
        style={{ fontVariationSettings: '"opsz" 144' }}
      >
        {name}
      </h1>

      <AskInput className="mt-8" />

      <div className="mt-4 w-full text-xs">
        <SocialLinks socials={socials} more={moreSocials} variant="stack" />
      </div>

      <p className="mt-10 max-w-2xl text-left text-lg leading-[1.65] text-[var(--color-ink-dim)]">
        {bio}
      </p>
    </div>
  );
}

// The hexagon itself, drawn rather than clipped so it can carry a hairline
// edge: a clip-path has no border, and stacking a second clipped box
// behind it to fake one would only re-derive the shape a second time.
function HexFrame() {
  const h = 100 * HEX_RATIO;
  return (
    <svg
      viewBox={`0 0 100 ${h}`}
      // The frame's box is a rectangle; the tiles tucked into the hero's
      // corners are inside it, so it must not swallow their clicks.
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
      focusable="false"
    >
      <defs>
        <radialGradient id="hero-hex-fill" cx="50%" cy="28%" r="78%">
          <stop offset="0%" stopColor="var(--color-bg-1)" />
          <stop offset="100%" stopColor="var(--color-bg-0)" />
        </radialGradient>
      </defs>
      <polygon
        points={`25,0 75,0 100,${h / 2} 75,${h} 25,${h} 0,${h / 2}`}
        fill="url(#hero-hex-fill)"
        stroke="var(--color-bg-2)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
