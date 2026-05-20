// Manual overrides for what an orbiter looks like in the home hero.
// Match keys to node ids. `asset` is an image URL (any path served from
// /public is fine); `embed` is a URL to iframe into the orbiter as a
// live preview of a deployed app.
//
// Resolution order in OrbitDecor: embed → asset → public/img/orbiters/
// filesystem lookup → monogram fallback.
//
// Most projects below point at images already living under
// /public/img/migrated/ from the Jekyll migration. To swap an entry,
// either edit here or drop a file at /public/img/orbiters/{id}.{png|jpg}
// (no manifest change needed — getGraph() picks it up automatically).

export type OrbitOverride = {
  asset?: string;
  embed?: string;
};

export const ORBIT_OVERRIDES: Record<string, OrbitOverride> = {
  // Live iframe embeds — scaled hard inside the 36px orbiter so the
  // whole deployed app reads as a tiny moving thumbnail. Click sends
  // the user to the project page.
  "windows-web": { embed: "https://windows-web-next.vercel.app" },
  "macos-web-next": { embed: "https://macos-web-next.vercel.app" },
  "browser-os": { embed: "https://desktop-shell.vercel.app" },
  "ascii-art": { embed: "https://ascii-art-sable.vercel.app" },
  "standup-ai": { embed: "https://standup-ai-khaki.vercel.app" },

  // ---- Projects ----
  "limboid": { asset: "/img/migrated/limboid-takes-over-room.jpeg" },
  "jacobfv-site": { asset: "/img/migrated/jacobfv.github.io.png" },
  "jacobfv-github-io": { asset: "/img/migrated/jacobfv.github.io.png" },
  "20q": { asset: "/img/migrated/20q_app.png" },
  "ai-proverbs": { asset: "/img/migrated/ai-writing-book.png" },
  "brain-model": { asset: "/img/migrated/brain-model-resonance.svg" },
  "bsbr": { asset: "/img/migrated/bsbr.jpeg" },
  "broadening-and-building-beyond-classical-reinforcement-learning": {
    asset: "/img/migrated/broaden_and_build_presentation.jpeg",
  },
  "cookie-baker-3d-printer": { asset: "/img/migrated/cookie_baker.jpg" },
  "cookie-cutter-cnc": { asset: "/img/migrated/cnc.jpeg" },
  "copyright-calculator": { asset: "/img/migrated/copyright_calculator.png" },
  "dash": { asset: "/img/migrated/dash.png" },
  "desparados-a-eye": { asset: "/img/migrated/desparados_1.png" },
  "jacobs-hits-2023": { asset: "/img/migrated/jacobs_hits_album_art.jpeg" },
  "jnumpy": { asset: "/img/migrated/jnumpy_logo.png" },
  "labatron": { asset: "/img/migrated/labatron.png" },
  "mln-dashboard": { asset: "/img/migrated/mln-dashboard.png" },
  "predictive-general-intelligence": {
    asset: "/img/migrated/predictive-general-intelligence.png",
  },

  // ---- Posts ----
  "can-an-echo-become-a-voice-again": {
    asset: "/img/migrated/can-an-echo-become-a-voice-again-cover.png",
  },
  "living-inside-the-exocortex": {
    asset: "/img/migrated/living-inside-the-exocortex-cover.png",
  },

  // ---- Visions / essays ----
  "focus-statement": { asset: "/img/migrated/focus-statement.png" },

  // ---- Events ----
  "broaden-and-build-conference-2021": {
    asset: "/img/migrated/broaden_and_build_presentation.jpeg",
  },
};
