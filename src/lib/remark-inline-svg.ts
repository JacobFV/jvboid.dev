// remark plugin — a local SVG placed as an image (`![caption](/assets/….svg)`)
// is read from `public/` at build time and inlined as a <Diagram>, so it is
// real markup on the page: its text is selectable and searchable, it scales
// as a vector, and it is drawn at its own width rather than squeezed into
// the reading column as a picture would be. Raster images are untouched.
//
// Several diagrams share one page, so each is scoped before inlining:
// element ids (markers, gradients, the <title>/<desc> pair) are prefixed
// with a hash of the path and every reference to them is rewritten, and the
// selectors inside any <style> block are prefixed with the figure's own
// attribute, so two SVGs that both define `.h` or `#a` stop fighting.
//
// Runs before remarkImageGrid, so a diagram is never grouped into a gallery
// with the screenshots around it.

import fs from "node:fs";
import path from "node:path";

interface MdNode {
  type: string;
  url?: string;
  alt?: string | null;
  value?: string;
  children?: MdNode[];
}

const PUBLIC = path.join(process.cwd(), "public");

function hashOf(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

function size(svg: string): { width: number; height: number } | null {
  const open = svg.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const vb = open.match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/i);
  if (vb) return { width: parseFloat(vb[1]), height: parseFloat(vb[2]) };
  const w = open.match(/\swidth="([\d.]+)(?:px)?"/i);
  const h = open.match(/\sheight="([\d.]+)(?:px)?"/i);
  return w && h ? { width: parseFloat(w[1]), height: parseFloat(h[1]) } : null;
}

export function scopeSvg(svg: string, scope: string): string {
  // Drop the XML prolog and any doctype; they are not HTML.
  let out = svg.replace(/^\s*<\?xml[^>]*>\s*/i, "").replace(/^\s*<!DOCTYPE[^>]*>\s*/i, "");

  const ids = new Set<string>();
  for (const m of out.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);
  if (ids.size) {
    const rename = (id: string) => (ids.has(id) ? `${scope}-${id}` : id);
    out = out
      .replace(/\sid="([^"]+)"/g, (_, id) => ` id="${rename(id)}"`)
      .replace(/url\(\s*#([^)\s"']+)\s*\)/g, (_, id) => `url(#${rename(id)})`)
      .replace(/(xlink:href|href)="#([^"]+)"/g, (_, attr, id) => `${attr}="#${rename(id)}"`)
      .replace(/(aria-labelledby|aria-describedby)="([^"]+)"/g, (_, attr, list: string) =>
        `${attr}="${list.split(/\s+/).filter(Boolean).map(rename).join(" ")}"`,
      );
  }

  // Scope stylesheet selectors to this figure. Rules are simple in these
  // files (`.h{…}`, `.k,.m{…}`); @-rules are left alone.
  out = out.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (_, attrs, css: string) => {
    const scoped = css.replace(/([^{}@]+)\{/g, (m, sel: string) => {
      if (/^\s*$/.test(sel)) return m;
      const parts = sel.split(",").map((s) => s.trim()).filter(Boolean);
      return parts.map((s) => `[data-diagram="${scope}"] ${s}`).join(", ") + "{";
    });
    return `<style${attrs}>${scoped}</style>`;
  });

  // Let the page size it: the viewBox carries the geometry.
  out = out.replace(/<svg\b([^>]*)>/i, (_, attrs: string) => {
    const kept = attrs.replace(/\s(width|height)="[^"]*"/gi, "");
    return `<svg${kept}>`;
  });
  return out.trim();
}

function imageOnlyParagraph(node: MdNode): MdNode | null {
  if (node.type !== "paragraph" || !node.children) return null;
  let image: MdNode | null = null;
  for (const child of node.children) {
    if (child.type === "image" && !image) image = child;
    else if (child.type === "text" && (child.value ?? "").trim() === "") continue;
    else return null;
  }
  return image;
}

export function remarkInlineSvg() {
  return (tree: MdNode) => {
    const children = tree.children;
    if (!children) return;
    for (let i = 0; i < children.length; i++) {
      const image = imageOnlyParagraph(children[i]);
      const url = image?.url ?? "";
      if (!image || !/^\/assets\/.+\.svg$/i.test(url)) continue;
      const file = path.join(PUBLIC, url);
      if (!file.startsWith(PUBLIC) || !fs.existsSync(file)) continue;
      const raw = fs.readFileSync(file, "utf8");
      const dims = size(raw);
      if (!dims) continue;
      const scope = "d" + hashOf(url);
      children[i] = {
        type: "mdxJsxFlowElement",
        name: "Diagram",
        attributes: [
          { type: "mdxJsxAttribute", name: "id", value: scope },
          { type: "mdxJsxAttribute", name: "src", value: url },
          { type: "mdxJsxAttribute", name: "alt", value: image.alt ?? "" },
          { type: "mdxJsxAttribute", name: "width", value: String(dims.width) },
          { type: "mdxJsxAttribute", name: "height", value: String(dims.height) },
          { type: "mdxJsxAttribute", name: "svg", value: scopeSvg(raw, scope) },
        ],
        children: [],
      } as unknown as MdNode;
    }
  };
}
