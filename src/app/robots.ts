import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // /login is unadvertised on purpose — see src/app/login/page.tsx. A
    // disallow does not hide it (robots.txt is public), it just keeps it
    // out of indexes, which is the whole ask.
    rules: [{ userAgent: "*", allow: "/", disallow: "/login" }],
    sitemap: "https://jacobfv.com/sitemap.xml",
  };
}
