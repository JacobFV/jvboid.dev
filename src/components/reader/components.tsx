import Link from "next/link";
import type { ImgHTMLAttributes } from "react";
import type { MDXComponents } from "@/lib/mdx";

// Reader typography components. Mapped into MDXContent so migrated bodies
// inherit Fraunces / Inter / JetBrains Mono and the dark-first palette
// without each post needing to opt in.

const cls = (...x: (string | false | undefined)[]) =>
  x.filter(Boolean).join(" ");

const H1 = (p: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h1
    {...p}
    style={{ fontVariationSettings: '"opsz" 144', ...p.style }}
    className={cls(
      "mt-12 mb-4 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-ink)]",
      p.className,
    )}
  />
);
const H2 = (p: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    {...p}
    style={{ fontVariationSettings: '"opsz" 96', ...p.style }}
    className={cls(
      "mt-12 mb-3 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--color-ink)]",
      p.className,
    )}
  />
);
const H3 = (p: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    {...p}
    className={cls(
      "mt-10 mb-2 font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--color-ink)]",
      p.className,
    )}
  />
);
const H4 = (p: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h4
    {...p}
    className={cls(
      "mt-8 mb-2 font-[family-name:var(--font-sans)] text-lg font-medium text-[var(--color-ink)]",
      p.className,
    )}
  />
);

const P = (p: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    {...p}
    className={cls(
      "my-4 max-w-[70ch] text-[17px] leading-[1.65] text-[var(--color-ink)]",
      p.className,
    )}
  />
);

const A = ({
  href,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const isExternal = href && /^https?:/.test(href);
  if (isExternal || !href) {
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer" : undefined}
        className="text-[var(--color-ink)] underline decoration-[var(--color-ink-mute)] underline-offset-2 hover:decoration-[var(--color-accent)]"
        {...rest}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="text-[var(--color-ink)] underline decoration-[var(--color-ink-mute)] underline-offset-2 hover:decoration-[var(--color-accent)]"
    >
      {children}
    </Link>
  );
};

const UL = (p: React.HTMLAttributes<HTMLUListElement>) => (
  <ul
    {...p}
    className={cls(
      "my-4 ml-6 list-disc space-y-1 text-[17px] text-[var(--color-ink)]",
      p.className,
    )}
  />
);
const OL = (p: React.HTMLAttributes<HTMLOListElement>) => (
  <ol
    {...p}
    className={cls(
      "my-4 ml-6 list-decimal space-y-1 text-[17px] text-[var(--color-ink)]",
      p.className,
    )}
  />
);

const Blockquote = (p: React.HTMLAttributes<HTMLQuoteElement>) => (
  <blockquote
    {...p}
    className={cls(
      "my-6 border-l-2 border-[var(--color-bg-2)] pl-4 italic text-[var(--color-ink-dim)]",
      p.className,
    )}
  />
);

const InlineCode = (p: React.HTMLAttributes<HTMLElement>) => (
  <code
    {...p}
    className={cls(
      "rounded bg-[var(--color-bg-1)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[0.9em] text-[var(--color-ink)]",
      p.className,
    )}
  />
);

const Pre = (p: React.HTMLAttributes<HTMLPreElement>) => (
  <pre
    {...p}
    className={cls(
      "my-6 overflow-x-auto rounded bg-[var(--color-bg-1)] p-4 font-[family-name:var(--font-mono)] text-sm text-[var(--color-ink)]",
      p.className,
    )}
  />
);

const HR = (p: React.HTMLAttributes<HTMLHRElement>) => (
  <hr {...p} className="my-12 border-t border-[var(--color-bg-2)]" />
);

const Img = (p: ImgHTMLAttributes<HTMLImageElement>) => {
  // next/image needs known dimensions for migrated content we don't have;
  // a plain <img> with sensible defaults is the right Phase 4 trade.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...p}
      alt={p.alt ?? ""}
      loading="lazy"
      className={cls("my-6 max-w-full rounded", p.className)}
    />
  );
};

const Table = (p: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="my-6 overflow-x-auto">
    <table
      {...p}
      className={cls(
        "w-full border-collapse text-sm text-[var(--color-ink)]",
        p.className,
      )}
    />
  </div>
);
const TH = (p: React.HTMLAttributes<HTMLTableCellElement>) => (
  <th
    {...p}
    className={cls(
      "border-b border-[var(--color-bg-2)] px-3 py-2 text-left font-[family-name:var(--font-mono)] text-xs uppercase tracking-wide text-[var(--color-ink-mute)]",
      p.className,
    )}
  />
);
const TD = (p: React.HTMLAttributes<HTMLTableCellElement>) => (
  <td
    {...p}
    className={cls(
      "border-b border-[var(--color-bg-2)] px-3 py-2 align-top",
      p.className,
    )}
  />
);

export const readerComponents: MDXComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  p: P,
  a: A,
  ul: UL,
  ol: OL,
  blockquote: Blockquote,
  code: InlineCode,
  pre: Pre,
  hr: HR,
  img: Img,
  table: Table,
  th: TH,
  td: TD,
};
