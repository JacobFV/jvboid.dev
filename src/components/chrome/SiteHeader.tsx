"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CmdK } from "./CmdK";
import { KIND_FROM_PREFIX, type Lane, type NodeKind } from "@/lib/graph-types";

type SearchableNode = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  lane: Lane;
  kind: NodeKind;
  date: string;
};

type Theme = "light" | "dark";

// Site-wide chrome. Sits sticky at the top of every page so artifact
// pages (projects, posts, …) always have a way back. At scroll 0 it's
// transparent and weightless; once the page scrolls it "docks" — picks
// up a blurred background, hairline border, and soft ring.
//
// On an artifact page the left side becomes a breadcrumb —
// Jacob Valdez › Section › Title — replacing the per-page back-link.
// The Title segment only fades in once the page's own <h1> has scrolled
// out of view, so it never duplicates a heading the reader can already
// see. Search and theme controls live on the right.
//
// Renders CmdK once, globally. The search trigger dispatches a
// `cmdk:open` window event that CmdK listens for.

const NAV = [
  { label: "Projects", href: "/projects" },
  { label: "Posts", href: "/posts" },
];

const MORE_NAV = [
  { label: "Readings", href: "/readings" },
  { label: "Papers", href: "/papers" },
  { label: "Resume", href: "/resume" },
];

// kind → the dedicated collection page the breadcrumb points back at.
const SECTION: Partial<Record<NodeKind, { label: string; href: string }>> = {
  project: { label: "Projects", href: "/projects" },
  post: { label: "Posts", href: "/posts" },
  paper: { label: "Papers", href: "/papers" },
  reading: { label: "Readings", href: "/readings" },
  update: { label: "Updates", href: "/updates" },
  skill: { label: "Skills", href: "/skills" },
  friend: { label: "Friends", href: "/friends" },
  event: { label: "Events", href: "/events" },
  vision: { label: "Visions", href: "/visions" },
};

function sectionFor(kind: NodeKind): { label: string; href: string } {
  return SECTION[kind] ?? { label: "Projects", href: "/projects" };
}

export function SiteHeader({ nodes }: { nodes: SearchableNode[] }) {
  const pathname = usePathname();
  const [docked, setDocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [theme, setTheme] = useState<Theme | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  // Whether the current page's own <h1> is still on screen. While it is,
  // the breadcrumb's Title segment stays hidden.
  const [titleInPage, setTitleInPage] = useState(true);

  // Derive the breadcrumb from the URL. Artifact pages /{prefix}/{slug}
  // get a full Section › Title trail; collection pages /{prefix} get a
  // single Section crumb that fades in once the page's <h1> leaves view.
  const crumb = useMemo(() => {
    const seg = (pathname ?? "").split("/").filter(Boolean);
    if (seg.length === 1) {
      const kind = KIND_FROM_PREFIX[seg[0]];
      if (!kind) return null;
      return { title: null, section: sectionFor(kind) };
    }
    if (seg.length !== 2) return null;
    const kind = KIND_FROM_PREFIX[seg[0]];
    if (!kind) return null;
    const node = nodes.find((n) => n.id === seg[1]);
    if (!node) return null;
    return { title: node.title, section: sectionFor(kind) };
  }, [pathname, nodes]);

  useEffect(() => {
    const current = document.documentElement.getAttribute(
      "data-theme",
    ) as Theme | null;
    setTheme(current ?? "light");

    const onScroll = () => setDocked(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  // Track the page <h1> (marked data-page-title in Hero). The Title
  // breadcrumb segment fades in once that heading leaves the viewport,
  // accounting for the ~56px sticky header.
  useEffect(() => {
    setTitleInPage(true);
    if (!crumb) return;
    const el = document.querySelector("[data-page-title]");
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setTitleInPage(entry.isIntersecting),
      { rootMargin: "-60px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [crumb, pathname]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode / disabled storage — ignore */
    }
    setTheme(next);
  };

  const openSearch = () => {
    setMenuOpen(false);
    setMoreOpen(false);
    window.dispatchEvent(new Event("cmdk:open"));
  };

  const themeGlyph = theme === "dark" ? "☀" : "☾";

  return (
    <>
      <header
        className="sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300"
        style={{
          background: docked
            ? "color-mix(in srgb, var(--color-bg-0) 82%, transparent)"
            : "transparent",
          backdropFilter: docked ? "blur(10px)" : "none",
          WebkitBackdropFilter: docked ? "blur(10px)" : "none",
          borderBottom: docked
            ? "1px solid var(--color-bg-2)"
            : "1px solid transparent",
          boxShadow: docked ? "var(--ring-soft)" : "none",
        }}
      >
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
          {/* Left: brand + (on artifact pages) the breadcrumb trail.
              items-baseline so the small mono crumbs sit on the same
              baseline as the larger display-font brand. */}
          <div className="flex min-w-0 items-baseline gap-2">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="shrink-0 font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--color-ink)] no-underline"
              style={{ fontVariationSettings: '"opsz" 72' }}
            >
              Jacob Valdez
            </Link>
            {crumb && crumb.title === null && (
              <span
                className="flex min-w-0 items-baseline gap-2 font-[family-name:var(--font-mono)] text-xs transition-opacity duration-300"
                style={{ opacity: titleInPage ? 0 : 1 }}
                aria-hidden={titleInPage}
              >
                <Chevron />
                <span className="truncate text-[var(--color-ink)]">
                  {crumb.section.label}
                </span>
              </span>
            )}
            {crumb && crumb.title !== null && (
              <span className="flex min-w-0 items-baseline gap-2 font-[family-name:var(--font-mono)] text-xs">
                <Chevron />
                <Link
                  href={crumb.section.href}
                  className="shrink-0 text-[var(--color-ink-dim)] no-underline hover:text-[var(--color-accent)]"
                >
                  {crumb.section.label}
                </Link>
                <span
                  className="flex min-w-0 items-baseline gap-2 transition-opacity duration-300"
                  style={{ opacity: titleInPage ? 0 : 1 }}
                  aria-hidden={titleInPage}
                >
                  <Chevron />
                  <span className="truncate text-[var(--color-ink)]">
                    {crumb.title}
                  </span>
                </span>
              </span>
            )}
          </div>

          {/* Desktop nav */}
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="px-3 py-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-dim)] no-underline underline-offset-4 hover:text-[var(--color-accent)] hover:underline"
              >
                {item.label}
              </Link>
            ))}
            <div ref={moreRef} className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                className="flex items-center gap-1 px-3 py-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-dim)] underline-offset-4 hover:text-[var(--color-accent)] hover:underline"
              >
                More
                <TriangleIcon open={moreOpen} />
              </button>
              {moreOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 grid w-44 gap-1 rounded-lg border border-[var(--color-bg-2)] bg-[var(--color-bg-0)] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
                >
                  {MORE_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className="rounded-md px-3 py-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink)] no-underline hover:bg-[var(--color-bg-1)] hover:text-[var(--color-accent)]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <IconButton label="Search (⌘K)" onClick={openSearch}>
              <SearchIcon />
            </IconButton>
            {/* `data-theme-toggle` lets a page that forces its own theme hide
                this rather than leave a control that visibly does nothing —
                see `data-page-theme` in globals.css. */}
            <IconButton
              label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              onClick={toggleTheme}
              data-theme-toggle
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>{themeGlyph}</span>
            </IconButton>
          </div>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-dim)] hover:bg-[var(--color-bg-1)] sm:hidden"
          >
            <BarsIcon open={menuOpen} />
          </button>
        </nav>

        {/* Mobile dropdown — always mounted so it can slide/fade both
            ways; `.mobile-menu` in globals.css drives the transition. */}
        <div
          className="mobile-menu absolute inset-x-0 top-full sm:hidden"
          data-open={menuOpen}
          style={{
            background: "var(--color-bg-1)",
            borderBottom: "1px solid var(--color-bg-2)",
          }}
        >
          <div className="mx-auto flex max-w-5xl flex-col px-4 py-2">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                tabIndex={menuOpen ? undefined : -1}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2.5 font-[family-name:var(--font-mono)] text-sm text-[var(--color-ink)] no-underline hover:bg-[var(--color-bg-2)]"
              >
                {item.label}
              </Link>
            ))}
            {MORE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                tabIndex={menuOpen ? undefined : -1}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2.5 font-[family-name:var(--font-mono)] text-sm text-[var(--color-ink)] no-underline hover:bg-[var(--color-bg-2)]"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={openSearch}
              tabIndex={menuOpen ? undefined : -1}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left font-[family-name:var(--font-mono)] text-sm text-[var(--color-ink)] hover:bg-[var(--color-bg-2)]"
            >
              <SearchIcon /> Search
            </button>
            <button
              type="button"
              data-theme-toggle
              onClick={toggleTheme}
              tabIndex={menuOpen ? undefined : -1}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left font-[family-name:var(--font-mono)] text-sm text-[var(--color-ink)] hover:bg-[var(--color-bg-2)]"
            >
              <span style={{ width: 16, textAlign: "center" }}>
                {themeGlyph}
              </span>{" "}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>
      </header>

      <CmdK nodes={nodes} />
    </>
  );
}

function Chevron() {
  return (
    <span className="shrink-0 select-none text-[var(--color-ink-mute)]" aria-hidden>
      ›
    </span>
  );
}

function IconButton({
  label,
  onClick,
  children,
  ...rest
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-dim)] hover:bg-[var(--color-bg-1)] hover:text-[var(--color-accent)]"
      {...rest}
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.65" y2="16.65" />
    </svg>
  );
}

function TriangleIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="currentColor"
      aria-hidden
      className="transition-transform duration-150"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <path d="M1.2 3.2h7.6L5 7.1 1.2 3.2z" />
    </svg>
  );
}

function BarsIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}
