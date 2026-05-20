"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CmdK } from "./CmdK";
import type { Lane, NodeKind } from "@/lib/graph-types";

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
// up a blurred background, hairline border, and soft ring. Search and
// theme controls live here too, replacing the old floating buttons.
//
// Renders CmdK once, globally. The search trigger dispatches a
// `cmdk:open` window event that CmdK listens for.

const NAV = [
  { label: "Posts", href: "/#posts" },
  { label: "Projects", href: "/#projects" },
  { label: "Profile", href: "/" },
];

export function SiteHeader({ nodes }: { nodes: SearchableNode[] }) {
  const [docked, setDocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme | null>(null);

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
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--color-ink)] no-underline"
            style={{ fontVariationSettings: '"opsz" 72' }}
          >
            Jacob Valdez
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-dim)] no-underline hover:bg-[var(--color-bg-1)] hover:text-[var(--color-accent)]"
              >
                {item.label}
              </Link>
            ))}
            <IconButton label="Search (⌘K)" onClick={openSearch}>
              <SearchIcon />
            </IconButton>
            <IconButton
              label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              onClick={toggleTheme}
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
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-dim)] hover:bg-[var(--color-bg-1)] sm:hidden"
          >
            <BarsIcon open={menuOpen} />
          </button>
        </nav>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div
            className="sm:hidden"
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
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-2.5 font-[family-name:var(--font-mono)] text-sm text-[var(--color-ink)] no-underline hover:bg-[var(--color-bg-2)]"
                >
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={openSearch}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left font-[family-name:var(--font-mono)] text-sm text-[var(--color-ink)] hover:bg-[var(--color-bg-2)]"
              >
                <SearchIcon /> Search
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left font-[family-name:var(--font-mono)] text-sm text-[var(--color-ink)] hover:bg-[var(--color-bg-2)]"
              >
                <span style={{ width: 16, textAlign: "center" }}>
                  {themeGlyph}
                </span>{" "}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </div>
          </div>
        )}
      </header>

      <CmdK nodes={nodes} />
    </>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-dim)] hover:bg-[var(--color-bg-1)] hover:text-[var(--color-accent)]"
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
