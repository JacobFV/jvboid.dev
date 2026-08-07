// Hexagon → page "expand" navigation.
//
// Clicking a project hexagon does not cut to the destination page. The
// hexagon grows from the tile until it covers the viewport, and what
// shows through it is the real destination page — starting zoomed in
// and settling back to 1× as the mask opens, so the page is
// progressively unmasked rather than scaled up. The tile artwork rides
// on top of the growing hexagon and cross-fades out into the page
// content underneath.
//
// Mechanics: a same-document View Transition. The old page is pinned in
// place (its snapshot gets no animation at all), so the only thing
// moving is the hexagon. The clip and the zoom both live on
// `::view-transition-new(root)`:
//
//   transform-origin = the tile's center, so a scale about that point
//   leaves the tile center fixed on screen. clip-path is therefore in a
//   space that is itself being scaled by k(t) — the on-screen hexagon
//   radius is `clipRadius(t) * k(t)`. The keyframes are picked so that
//   product runs r0 → r1.
//
// The tile artwork is captured as its own named snapshot
// (`hexnav-thumb`) and is given the *same pair* of scales as a two-part
// transform list (`scale(a) scale(b)`), which CSS interpolates
// component-wise. That makes the thumbnail track the hexagon rim
// exactly instead of drifting inside it.
//
// Browsers without View Transitions, and anyone who asked for reduced
// motion, get a plain push.

const DURATION = 600;
// Deliberately not a plain ease-out. The hexagon has to travel ~10× its
// own radius to clear the viewport, so a front-loaded curve throws it
// off-screen in the first 150ms and there is nothing left to watch. A
// gentle S-curve keeps the hexagon on screen for most of the 600ms.
const EASE = "cubic-bezier(0.5, 0.05, 0.25, 1)";
// How far the destination page is zoomed in when the hexagon is at its
// smallest. It unwinds to 1× over the same 600ms.
const ZOOM = 1.35;
const THUMB_NAME = "hexnav-thumb";
// Pointy-top hexagon: half-width / circumradius.
const HEX_APOTHEM = 0.8660254;

type ViewTransition = { finished: Promise<void> };
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => ViewTransition;
};

// A pointy-top hexagon centered on (cx, cy), in px, vertices listed from
// the top point clockwise. Every clip-path in the keyframes uses this
// same point order so the browser can interpolate them.
function hexClip(cx: number, cy: number, r: number): string {
  const x = HEX_APOTHEM * r;
  const y = r / 2;
  const pt = (px: number, py: number) => `${px.toFixed(2)}px ${py.toFixed(2)}px`;
  return `polygon(${pt(cx, cy - r)}, ${pt(cx + x, cy - y)}, ${pt(cx + x, cy + y)}, ${pt(
    cx,
    cy + r,
  )}, ${pt(cx - x, cy + y)}, ${pt(cx - x, cy - y)})`;
}

// Resolves once the router has committed the new route — the App Router
// only writes the new URL after React has committed the new tree, so a
// matching pathname means the DOM the transition is about to capture is
// the destination page.
//
// Timers, not rAF: the browser suspends rendering (and therefore
// animation frames) while a view transition's update callback is
// pending, so an rAF loop in here would never tick and the transition
// would sit frozen until Chrome's 4s abort. Bails out after `timeout`
// so a slow RSC fetch can't hold the page hostage either.
function navigationSettled(targetPath: string, timeout = 2500): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (window.location.pathname === targetPath) {
        // One more task, so any commit-time work queued behind the
        // history update lands before the "new" snapshot is taken.
        setTimeout(resolve, 0);
        return;
      }
      if (Date.now() - started > timeout) {
        resolve();
        return;
      }
      setTimeout(tick, 16);
    };
    tick();
  });
}

function transitionStyles(cx: number, cy: number, r0: number, r1: number): string {
  // The thumbnail is blown up far past its pixel size by the end, so it
  // hands over to the page content early rather than lingering as a
  // blurry ghost.
  const fadeMs = Math.round(DURATION * 0.55);
  return `
/* Other shared-element names in play (the \`node-*\` card → hero morphs
   in NodeCard/Hero) would each capture into a group of their own —
   outside the hexagon mask, painting over the reveal. The hexagon owns
   this transition, so suppress them for its duration. */
html.hexnav [style*="view-transition-name"]:not([data-hex-face]) {
  view-transition-name: none !important;
}
html.hexnav::view-transition-group(root),
html.hexnav::view-transition-image-pair(root) {
  animation: none;
  overflow: visible;
}
/* The page we came from does not move, fade, or blend — the hexagon
   opens over it. */
html.hexnav::view-transition-old(root) {
  animation: none;
  opacity: 1;
  mix-blend-mode: normal;
}
html.hexnav::view-transition-new(root) {
  opacity: 1;
  mix-blend-mode: normal;
  transform-origin: ${cx.toFixed(2)}px ${cy.toFixed(2)}px;
  animation:
    hexnav-mask ${DURATION}ms ${EASE} both,
    hexnav-zoom ${DURATION}ms ${EASE} both;
}
@keyframes hexnav-mask {
  from { clip-path: ${hexClip(cx, cy, r0 / ZOOM)}; }
  to { clip-path: ${hexClip(cx, cy, r1)}; }
}
@keyframes hexnav-zoom {
  from { transform: scale(${ZOOM}); }
  to { transform: scale(1); }
}
html.hexnav::view-transition-group(${THUMB_NAME}),
html.hexnav::view-transition-image-pair(${THUMB_NAME}) {
  animation: none;
  overflow: visible;
  z-index: 20;
}
html.hexnav::view-transition-old(${THUMB_NAME}) {
  mix-blend-mode: normal;
  transform-origin: center center;
  animation:
    hexnav-thumb ${DURATION}ms ${EASE} both,
    hexnav-thumb-fade ${fadeMs}ms linear both;
}
@keyframes hexnav-thumb {
  from { transform: scale(${(1 / ZOOM).toFixed(4)}) scale(${ZOOM}); }
  to { transform: scale(${(r1 / r0).toFixed(4)}) scale(1); }
}
@keyframes hexnav-thumb-fade {
  from { opacity: 1; }
  to { opacity: 0; }
}
`;
}

let running = false;

export function hexExpandNavigate({
  face,
  href,
  push,
}: {
  // The hexagon-clipped element to grow from.
  face: HTMLElement | null;
  href: string;
  push: () => void;
}): void {
  const doc = document as ViewTransitionDocument;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (running || reduced || !face || typeof doc.startViewTransition !== "function") {
    push();
    return;
  }

  const rect = face.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    push();
    return;
  }

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  // Pointy-top hexagon: the circumradius is half the height.
  const r0 = rect.height / 2;
  // Grow until the hexagon's *flat* sides clear the farthest viewport
  // corner, with a little slack for the easing overshoot.
  const far = Math.hypot(
    Math.max(cx, window.innerWidth - cx),
    Math.max(cy, window.innerHeight - cy),
  );
  const r1 = (far / HEX_APOTHEM) * 1.04;

  running = true;
  // Cancel the hover pop so the captured snapshot lines up with `rect`.
  face.style.transform = "none";
  face.style.viewTransitionName = THUMB_NAME;

  const style = document.createElement("style");
  style.textContent = transitionStyles(cx, cy, r0, r1);
  document.head.append(style);
  document.documentElement.classList.add("hexnav");

  const cleanup = () => {
    running = false;
    document.documentElement.classList.remove("hexnav");
    style.remove();
    face.style.viewTransitionName = "";
    face.style.transform = "";
  };

  const targetPath = new URL(href, window.location.href).pathname;
  try {
    const transition = doc.startViewTransition(async () => {
      // `push` swaps the route and the URL. The history entry lands when
      // the navigation commits — under the frozen snapshot, so nothing
      // of it is visible until the hexagon has opened — and Back/Forward
      // then walk the entries normally.
      push();
      await navigationSettled(targetPath);
    });
    transition.finished.then(cleanup, cleanup);
  } catch {
    cleanup();
    push();
  }
}

// True for plain left-clicks — anything with a modifier should keep the
// browser's own open-in-tab / download behavior.
export function isPlainClick(e: React.MouseEvent): boolean {
  return !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0);
}
