import { build } from "velite";

class VeliteWebpackPlugin {
  static started = false;
  apply(/** @type {import('webpack').Compiler} */ compiler) {
    compiler.hooks.beforeCompile.tapPromise("VeliteWebpackPlugin", async () => {
      if (VeliteWebpackPlugin.started) return;
      VeliteWebpackPlugin.started = true;
      const dev = compiler.options.mode === "development";
      await build({ watch: dev, clean: !dev });
    });
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    viewTransition: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  webpack: (config) => {
    config.plugins.push(new VeliteWebpackPlugin());
    return config;
  },
  // 301 redirects from the old Jekyll URLs to the new flat-slug routes.
  // Old conventions (see ../jacobfv.github.io/_config.yml):
  //   posts:    /blog/:year/:title/
  //   projects: /projects/:slug/
  //   bio:      /bio/:slug/
  //   pages:    /resume/, /experience/, /projects/, /bio/, /papers/, ...
  //
  // Three migrated post slugs collide with project slugs and got a
  // `-post` suffix during migration; their old URLs need explicit
  // overrides because the regex rule below would land them on the
  // project page instead. See scripts/migrate-jekyll.ts.
  async redirects() {
    const collisionOverrides = [
      ["computatrum", "computatrum-post"],
      ["full-stack-artificial-intelligence", "full-stack-artificial-intelligence-post"],
      ["the-multi-agent-network", "the-multi-agent-network-post"],
    ];

    const collisionRedirects = collisionOverrides.flatMap(([oldSlug, newSlug]) => [
      {
        source: `/blog/:year/${oldSlug}/`,
        destination: `/${newSlug}`,
        permanent: true,
      },
      {
        source: `/blog/:year/${oldSlug}`,
        destination: `/${newSlug}`,
        permanent: true,
      },
    ]);

    return [
      ...collisionRedirects,
      // Generic post redirect: /blog/2021/foo/ → /foo
      { source: "/blog/:year/:slug/", destination: "/:slug", permanent: true },
      { source: "/blog/:year/:slug", destination: "/:slug", permanent: true },
      // Projects: /projects/foo/ → /foo
      { source: "/projects/:slug/", destination: "/:slug", permanent: true },
      // Bio essays: /bio/foo/ → /foo (vision slug = bio basename)
      { source: "/bio/:slug/", destination: "/:slug", permanent: true },
      // Old index pages → their new equivalents.
      { source: "/projects/", destination: "/list", permanent: true },
      { source: "/projects", destination: "/list", permanent: true },
      { source: "/papers/", destination: "/list", permanent: true },
      { source: "/papers", destination: "/list", permanent: true },
      { source: "/experience/", destination: "/resume", permanent: true },
      { source: "/experience", destination: "/resume", permanent: true },
      { source: "/bio/", destination: "/focus-statement", permanent: true },
      { source: "/bio", destination: "/focus-statement", permanent: true },
      { source: "/resume/", destination: "/resume", permanent: true },
      // Legacy slug for the introduction bio page that the home used to embed.
      { source: "/about/", destination: "/introduction", permanent: true },
    ];
  },
};

export default nextConfig;
