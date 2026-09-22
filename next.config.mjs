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
  // 308 redirects from the old Jekyll (al-folio) jacobfv.github.io URLs to
  // the current canonical routes at /{kind-plural}/{slug}. The old GitHub
  // Pages domain now forwards every path verbatim to jvboid.dev, so these
  // legacy shapes still arrive here and must resolve.
  //
  // Old formats                                    New canonical
  //   /blog/:year/:title/  and  /blog/:title/  →   /posts/:id
  //   /blog/, /blog/page/:n/, /blog/:year/,        /posts
  //     /blog/category/:c/, /blog/tag/:t/      →   /posts
  //   /projects/:slug/   (underscore / MixedCase) → /projects/:id
  //   /bio/:essay/  (named one by one)         →   /thoughts/:id
  //   /jobs/:slug/, /experience/               →   /resume
  //   /news/:slug/                             →   /updates
  //   /feed/                                   →   /feed.xml
  //   /repositories/, /repos/                  →   /projects
  //
  // NB: current canonical is /{kind}/{slug}; the old flat /{slug} routes are
  // gone (they 404 by design — see CLAUDE.md), so destinations are prefixed.
  async redirects() {
    // Emit both the trailing-slash and non-slash variants of a rule. The old
    // al-folio permalinks always ended in "/"; Next serves canonical paths
    // without one. Listing both avoids relying on trailing-slash normalization
    // ordering relative to redirect matching.
    const dual = (source, destination) => [
      { source, destination, permanent: true },
      { source: `${source}/`, destination, permanent: true },
    ];

    // A blog post reachable at BOTH its dated and yearless legacy permalink.
    // (al-folio exposed both shapes; see the Wayback archive.)
    const post = (oldSlug, destination) => [
      ...dual(`/blog/:year(\\d{4})/${oldSlug}`, destination),
      ...dual(`/blog/${oldSlug}`, destination),
    ];

    // Posts renamed during migration — mapped explicitly so the generic
    // /blog rule below doesn't send them to a non-existent /posts/<oldslug>.
    // Three collide with same-named project slugs and carry a `-post` suffix.
    const renamedPosts = [
      post("computatrum", "/posts/computatrum-post"),
      post("full-stack-artificial-intelligence", "/posts/full-stack-artificial-intelligence-post"),
      post("the-multi-agent-network", "/posts/the-multi-agent-network-post"),
      post("embodied-and-situated-ai-with-feelings", "/posts/0embodied-and-situated-ai-with-feelings"),
      post("teaching-learning-machines", "/posts/1teaching-learning-machines"),
      post(
        "self-learning-meta-learners-teach-themselves-to-teach",
        "/posts/2self-learning-meta-learners-teach-themselves-to-teach",
      ),
      post("P-versus-NP", "/posts/p-versus-np"),
      // Was a blog post in the old site; now lives as a project.
      post("cookie-cutter-cnc", "/projects/cookie-cutter-cnc"),
    ].flat();

    // Legacy project slugs (underscores / MixedCase) → hyphen-case node ids.
    // Projects whose slug is unchanged only need trailing-slash normalization,
    // which Next handles automatically, so they're omitted here.
    const projectRenames = {
      "20Q": "20q",
      DesparadosAEye: "desparados-a-eye",
      "Jacobs-hits-2023": "jacobs-hits-2023",
      "Summer-Break-2021-album": "summer-break-2021-album",
      Workplace_Surveillance_System: "workplace-surveillance-system",
      cookie_baker_3d_printer: "cookie-baker-3d-printer",
      cookie_cutter_cnc: "cookie-cutter-cnc",
      copyright_calculator: "copyright-calculator",
      full_stack_artificial_intelligence: "full-stack-artificial-intelligence",
      "jacobfv.github.io": "jacobfv-github-io",
      "multi-graph-former": "multi-graph-former-project",
    };
    const projectRedirects = Object.entries(projectRenames).flatMap(([oldSlug, id]) =>
      dual(`/projects/${oldSlug}`, `/projects/${id}`),
    );

    return [
      // --- Renamed posts & projects (must precede the generic rules) ---
      ...renamedPosts,
      ...projectRedirects,
      // Bio essays whose slug changed; the rest are listed below.
      ...dual("/bio/life-story", "/thoughts/background"),
      ...dual(
        "/bio/describe-your-greatest-engineering-accomplishment",
        "/thoughts/describe-some-technical-accomplishments-youre-proud-of",
      ),

      // --- Visions → thoughts ---
      // The short interview-style entries moved to /thoughts and the
      // introduction became a chapter of /bio. Temporary on purpose: /visions
      // is being kept for ideas, and a cached 308 would stop that path ever
      // being handed back.
      { source: "/visions/introduction", destination: "/bio", permanent: false },
      { source: "/visions/introduction/", destination: "/bio", permanent: false },
      { source: "/visions", destination: "/thoughts", permanent: false },
      { source: "/visions/", destination: "/thoughts", permanent: false },
      { source: "/visions/:slug", destination: "/thoughts/:slug", permanent: false },
      { source: "/visions/:slug/", destination: "/thoughts/:slug", permanent: false },

      // --- Blog index & taxonomy (before the generic /blog/:slug rule) ---
      ...dual("/blog", "/posts"),
      ...dual("/blog/page/:n", "/posts"),
      ...dual("/blog/category/:cat", "/posts"),
      ...dual("/blog/tag/:tag", "/posts"),
      ...dual("/blog/:year(\\d{4})", "/posts"),

      // --- Generic blog post → /posts/:slug (dated form first) ---
      ...dual("/blog/:year(\\d{4})/:slug", "/posts/:slug"),
      ...dual("/blog/:slug", "/posts/:slug"),

      // --- Bio essays → thoughts ---
      // /bio is the chapters of the story now, so the old essays are named
      // one by one: a /bio/:slug catch-all would shadow every chapter.
      ...[
        "background",
        "describe-some-technical-accomplishments-youre-proud-of",
        "focus-statement",
        "relate-a-setback-youve-overcome",
        "vision-navigable-mind",
        "what-makes-ai-so-interesting",
        "where-do-you-see-yourself-in-5-years",
        "where-i-see-myself-in-5-years",
      ].flatMap((id) => dual(`/bio/${id}`, `/thoughts/${id}`)),
      ...dual("/bio/introduction", "/bio"),
      ...dual("/thoughts/introduction", "/bio"),

      // --- Jobs / experience → resume ---
      ...dual("/jobs/:slug", "/resume"),
      ...dual("/jobs", "/resume"),
      ...dual("/experience", "/resume"),

      // --- News → updates ---
      ...dual("/news/:slug", "/updates"),
      ...dual("/news", "/updates"),

      // --- Other standardized legacy pages ---
      ...dual("/feed", "/feed.xml"),
      ...dual("/repositories", "/projects"),
      ...dual("/repos", "/projects"),
      ...dual("/about", "/bio"),
      // The homepage briefly linked the flat /introduction path; keep it alive.
      ...dual("/introduction", "/bio"),
      ...dual("/story", "/bio"),

      // Static EEG acquisition-chain research tool, published from its own
      // repository through GitHub Pages. Keep the portfolio-owned URL stable.
      {
        source: "/eeg-acquisition-chain",
        destination: "https://jacobfv.github.io/eeg-acquisition-chain/",
        permanent: false,
      },
      {
        source: "/eeg-acquisition-chain/:path*",
        destination: "https://jacobfv.github.io/eeg-acquisition-chain/:path*",
        permanent: false,
      },
      // canvas-engineering moved to the commandAGI org; forward the docs
      // (deep links included). Temporary on purpose: the destination will
      // become commandagi.com/research/canvas-engineering once that exists.
      {
        source: "/canvas-engineering",
        destination: "https://commandagi.github.io/canvas-engineering/",
        permanent: false,
      },
      {
        source: "/canvas-engineering/:path*",
        destination: "https://commandagi.github.io/canvas-engineering/:path*",
        permanent: false,
      },
      // IBM-1 moved to the Super-Cognition-Labs org, which moved its GitHub
      // Pages site with it: jacobfv.github.io/IBM-1/ is a hard 404 now, and
      // GitHub does not forward Pages across a transfer the way it forwards
      // repository URLs. That dead URL is printed in the paper, the README and
      // a year of links, and it arrives here as /IBM-1/ because the old domain
      // forwards every path verbatim to jvboid.dev — so this is the rule that
      // actually answers it. Case-sensitive on purpose: the published URL is
      // "IBM-1", and lowercase /ibm-1 is a flat legacy route that 404s by
      // design. Temporary, because the destination will become
      // supercognition.dev once that exists.
      {
        source: "/IBM-1",
        destination: "https://super-cognition-labs.github.io/IBM-1/",
        permanent: false,
      },
      {
        source: "/IBM-1/:path*",
        destination: "https://super-cognition-labs.github.io/IBM-1/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
