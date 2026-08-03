// The one depth model shared by every backdrop plane.
//
// A plane's depth d ∈ (0, 1] is the only thing that varies between
// planes — 0 is infinitely far, 1 is right in front of the camera — and
// everything else is a function of it. Both the CSS gas planes
// (components/chrome/Atmosphere.tsx) and the fluid tracer planes
// (components/chrome/FluidField.tsx) derive their behaviour from here,
// so the two systems agree about what "far" means.
//
// Pure math, no DOM: safe to import from anywhere.

/** px moved per px of scroll. Far planes barely budge, near ones slide. */
export const parallaxOf = (d: number) => 0.02 + 0.55 * Math.pow(d, 1.4);

/** Volumetric blur for the gas planes: thicker gas reads softer up close. */
export const blurOf = (d: number) => 74 * d * d;

/** Near planes thin out so they never fight the text. */
export const opacityOf = (d: number) => 1 - 0.4 * d;

/** Ambient drift amplitude, px. Scales with nearness like parallax does. */
export const driftOf = (d: number) => 16 + 48 * d;

/** Stacking order inside .atmosphere — deeper planes paint first. */
export const zIndexOf = (d: number) => Math.round(d * 100);

/**
 * Backing-store resolution for a canvas plane, in device px per CSS px.
 * This is the sharpness knob: distant flow is rasterized coarse and
 * upscaled (soft, cheap), the front plane renders at full device
 * resolution so its filaments land as true hairlines.
 */
export const resolutionOf = (d: number, dpr: number) =>
  0.34 + (Math.min(dpr, 2) - 0.34) * Math.pow(d, 1.8);
