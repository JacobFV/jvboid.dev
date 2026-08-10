import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Bioluminescence } from "@/components/chrome/Bioluminescence";
import { SiteHeader } from "@/components/chrome/SiteHeader";
import { Lightbox } from "@/components/reader/Lightbox";
import { getGraph, isListedNode } from "@/lib/graph";
import { WORLDS } from "@/lib/worlds";
import "./globals.css";

// Pre-paint script: reads the stored theme (or system pref) and sets
// data-theme on <html> before React hydrates, preventing a flash.
//
// It also handles "world" pages — the handful of routes that take the whole
// window over with a palette of their own, some of which force a theme with it
// (see `data-page-theme` in globals.css, and lib/worlds.ts for the table).
// Those have to be decided here for the same reason the stored theme does:
// anywhere later is a frame too late, and the reader watches the page change
// its mind. The stored preference is read but not written, so leaving the world
// restores whatever they actually chose.
//
// On a client-side navigation this script does not run again — the component
// that owns the world sets and clears the same two attributes on mount and
// unmount, which is what covers that path.
//
// The table is interpolated as JSON rather than written out by hand. This whole
// thing is a template literal, and a stray backtick inside one silently
// truncates the string; JSON.stringify cannot produce one.
const themeBootScript = `
(function(){
  var WORLDS = ${JSON.stringify(WORLDS)};
  try {
    var t = localStorage.getItem('jacobfv:theme') || localStorage.getItem('theme');
    if (t && t.charAt(0) === '"') t = JSON.parse(t);
    if (t !== 'light' && t !== 'dark') t = 'light';
    var p = location.pathname;
    if (p.length > 1 && p.charAt(p.length - 1) === '/') p = p.slice(0, -1);
    // hasOwnProperty, not a bare lookup: '/constructor' and friends would
    // otherwise resolve off Object.prototype and hand us a truthy non-world.
    var w = Object.prototype.hasOwnProperty.call(WORLDS, p) ? WORLDS[p] : null;
    if (w) {
      document.documentElement.setAttribute('data-page-theme', w.id);
      if (w.theme) t = w.theme;
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jacob Valdez",
  description:
    "A navigable map of projects, writing, and visions — not a list of pages.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchable = getGraph().nodes.filter(isListedNode).map((n) => ({
    id: n.id,
    title: n.title,
    summary: n.summary,
    tags: n.tags,
    lane: n.lane,
    kind: n.kind,
    date: n.date,
  }));

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        {/* Backdrop: a bioluminescent mesh generated in document space
            and confined to the page gutters, so it never lands behind
            body copy. Replaces the old parallax depth stack, which put
            tinted moving texture across the full viewport — including
            the reading column. See components/chrome/Bioluminescence.tsx. */}
        <Bioluminescence />
        <SiteHeader nodes={searchable} />
        {children}
        {/* Page-wide fullscreen image viewer; renders null until a
            reader image is clicked. */}
        <Lightbox />
      </body>
    </html>
  );
}
