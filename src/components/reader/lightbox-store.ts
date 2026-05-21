// Tiny external store driving the single, page-wide <Lightbox>. Any
// reader image opens it; the lightbox subscribes via useSyncExternalStore.
// Kept framework-light so a content <img> can trigger it from an onClick
// without threading React context through the MDX render tree.

export type LightboxItem = { src: string; alt: string };
export type LightboxState = { items: LightboxItem[]; index: number } | null;

let state: LightboxState = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): LightboxState {
  return state;
}

// SSR has no lightbox open; a stable null keeps hydration quiet.
export function getServerSnapshot(): LightboxState {
  return null;
}

// Opens the viewer at `target`, with every reader image on the page as
// the navigable set (DOM order = reading order).
export function openLightbox(target: HTMLImageElement) {
  const all = Array.from(
    document.querySelectorAll<HTMLImageElement>("[data-reader-image]"),
  );
  const items: LightboxItem[] = (all.length ? all : [target]).map((img) => ({
    src: img.dataset.fullSrc || img.currentSrc || img.src,
    alt: img.alt || "",
  }));
  const index = Math.max(0, all.indexOf(target));
  state = { items, index };
  emit();
}

export function closeLightbox() {
  if (!state) return;
  state = null;
  emit();
}

// Wraps around both ends so prev/next never dead-ends.
export function setLightboxIndex(index: number) {
  if (!state) return;
  const n = state.items.length;
  state = { ...state, index: ((index % n) + n) % n };
  emit();
}
