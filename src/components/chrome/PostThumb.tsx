import Image from "next/image";
import type { Lane, Node } from "@/lib/graph-types";
import { imageRefsForNode } from "@/lib/project-face";

// The picture beside a post in the /posts index. A post with an image of
// its own shows it — its hero, else the first picture its body places.
// Most posts have none, so the rest get a small line drawing seeded from
// the post's id, in the hairline idiom of the essay figures: every row has
// a face, no two faces match, and a post keeps its face across builds.

const unoptimizable = (src: string) => !src.startsWith("/") || /\.(?:svg|gif)(?:[?#]|$)/i.test(src);

export function PostThumb({ node, className }: { node: Node; className?: string }) {
  const image = imageRefsForNode(node)[0];
  return (
    <div
      className={`relative aspect-[4/3] overflow-hidden rounded-[3px] border border-[var(--color-rule)] bg-[var(--color-bg-1)] ${className ?? ""}`}
    >
      {image ? (
        <Image
          src={image.src}
          alt=""
          fill
          sizes="(min-width: 640px) 8rem, 6rem"
          unoptimized={unoptimizable(image.src)}
          className="object-cover"
        />
      ) : (
        <PostGlyph id={node.id} lane={node.lane} />
      )}
    </div>
  );
}

function seeded(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n: number) => n.toFixed(1);

// Four motifs — waves, orbits, a dot field, rays — each drawn in muted
// ink with one element picked out in the post's lane colour.
function PostGlyph({ id, lane }: { id: string; lane: Lane }) {
  const rand = seeded(id);
  const motif = Math.floor(rand() * 4);
  const ink = "var(--color-ink-mute)";
  const hue = `var(--color-lane-${lane})`;
  const W = 120;
  const H = 90;
  let art: React.ReactNode;

  if (motif === 0) {
    const lines = 5 + Math.floor(rand() * 3);
    const pick = Math.floor(rand() * lines);
    const freq = 1 + rand() * 1.6;
    art = Array.from({ length: lines }, (_, i) => {
      const y0 = 14 + (i * (H - 28)) / (lines - 1);
      const amp = 2 + rand() * 7;
      const ph = rand() * Math.PI * 2;
      const pts = Array.from({ length: 31 }, (_, j) => {
        const x = (j / 30) * W;
        return `${f1(x)},${f1(y0 + amp * Math.sin((x / W) * Math.PI * 2 * freq + ph))}`;
      }).join(" ");
      return (
        <polyline
          key={i}
          points={pts}
          fill="none"
          stroke={i === pick ? hue : ink}
          strokeWidth={i === pick ? 1.6 : 0.8}
          opacity={i === pick ? 1 : 0.7}
        />
      );
    });
  } else if (motif === 1) {
    const cx = 60 + (rand() - 0.5) * 30;
    const cy = 45 + (rand() - 0.5) * 16;
    const tilt = (rand() - 0.5) * 50;
    const rings = 3 + Math.floor(rand() * 2);
    const pick = Math.floor(rand() * rings);
    const t = rand() * Math.PI * 2;
    art = (
      <g transform={`rotate(${f1(tilt)} ${f1(cx)} ${f1(cy)})`}>
        {Array.from({ length: rings }, (_, i) => {
          const rx = 14 + i * (12 + rand() * 6);
          const ry = rx * (0.34 + rand() * 0.2);
          return (
            <g key={i}>
              <ellipse cx={cx} cy={cy} rx={f1(rx)} ry={f1(ry)} fill="none" stroke={ink} strokeWidth={0.8} opacity={0.75} />
              {i === pick && (
                <circle cx={f1(cx + rx * Math.cos(t))} cy={f1(cy + ry * Math.sin(t))} r={2.6} fill={hue} />
              )}
            </g>
          );
        })}
        <circle cx={f1(cx)} cy={f1(cy)} r={1.6} fill={ink} />
      </g>
    );
  } else if (motif === 2) {
    const ox = 18 + rand() * 84;
    const oy = 16 + rand() * 58;
    const reach = 14 + rand() * 12;
    const dots: React.ReactNode[] = [];
    for (let x = 8; x < W; x += 10) {
      for (let y = 8; y < H; y += 10) {
        const near = Math.hypot(x - ox, y - oy) < reach;
        dots.push(
          <circle key={`${x}-${y}`} cx={x} cy={y} r={near ? 1.7 : 0.9} fill={near ? hue : ink} opacity={near ? 1 : 0.55} />,
        );
      }
    }
    art = dots;
  } else {
    const ox = rand() < 0.5 ? 10 + rand() * 20 : 90 + rand() * 20;
    const oy = rand() < 0.5 ? 10 + rand() * 16 : 64 + rand() * 16;
    const rays = 9 + Math.floor(rand() * 6);
    const pick = Math.floor(rand() * rays);
    const toward = Math.atan2(45 - oy, 60 - ox);
    art = Array.from({ length: rays }, (_, i) => {
      const a = toward + ((i / (rays - 1)) - 0.5) * 1.5;
      const len = 60 + rand() * 70;
      return (
        <line
          key={i}
          x1={f1(ox)}
          y1={f1(oy)}
          x2={f1(ox + Math.cos(a) * len)}
          y2={f1(oy + Math.sin(a) * len)}
          stroke={i === pick ? hue : ink}
          strokeWidth={i === pick ? 1.5 : 0.75}
          opacity={i === pick ? 1 : 0.7}
        />
      );
    });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden>
      {art}
    </svg>
  );
}
