import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Atmosphere } from "@/components/chrome/Atmosphere";
import { SiteHeader } from "@/components/chrome/SiteHeader";
import { Lightbox } from "@/components/reader/Lightbox";
import { getGraph, isListedNode } from "@/lib/graph";
import "./globals.css";

// Pre-paint script: reads the stored theme (or system pref) and sets
// data-theme on <html> before React hydrates, preventing a flash.
const themeBootScript = `
(function(){
  try {
    var t = localStorage.getItem('jacobfv:theme') || localStorage.getItem('theme');
    if (t && t.charAt(0) === '"') t = JSON.parse(t);
    if (t !== 'light' && t !== 'dark') t = 'light';
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
        {/* Ambient backdrop — a generated stack of depth planes
            (starfield / horizon / clouds / streaks) that parallax-scroll
            with the page. See components/chrome/Atmosphere.tsx. */}
        <Atmosphere />
        <SiteHeader nodes={searchable} />
        {children}
        {/* Page-wide fullscreen image viewer; renders null until a
            reader image is clicked. */}
        <Lightbox />
      </body>
    </html>
  );
}
