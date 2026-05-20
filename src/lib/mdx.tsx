// Renders Velite-compiled MDX. `s.mdx()` ships a JS module string; we
// evaluate it against react/jsx-runtime to get the React component.

import * as runtime from "react/jsx-runtime";
import type { ComponentType } from "react";
import { readerComponents } from "@/components/reader/components";

// MDX components have arbitrary prop shapes (Sidetrack takes `to`,
// Figure takes `caption`, etc.). The MDX runtime dispatches by name, so
// we can't strongly type the prop set here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MDXComponents = Record<string, ComponentType<any>>;

type MDXModule = {
  default: ComponentType<{ components?: MDXComponents }>;
};

const sharedComponents: MDXComponents = {
  // Typography map; route-specific components (Scene, Figure, Sidetrack
  // for /loop) are merged in by the page that renders them.
  ...readerComponents,
};

function compile(code: string): ComponentType<{
  components?: MDXComponents;
}> | null {
  if (!code || !code.trim()) return null;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function(code);
  const mod = fn({ ...runtime }) as MDXModule | undefined;
  if (!mod || typeof mod.default !== "function") return null;
  return mod.default;
}

export function MDXContent({
  code,
  components,
}: {
  code: string;
  components?: MDXComponents;
}) {
  const Component = compile(code);
  if (!Component) return null;
  return (
    <Component components={{ ...sharedComponents, ...(components ?? {}) }} />
  );
}
