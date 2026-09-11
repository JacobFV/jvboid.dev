// Syntax highlighting for fenced code in MDX bodies, at build time.
//
// Every `pre > code` is run through Shiki with two themes at once and
// `defaultColor: false`, so each token carries both its light and its dark
// colour as CSS variables (`--shiki-light`, `--shiki-dark`) and globals.css
// picks one by the active theme — no client JavaScript, and the theme
// toggle recolours code instantly.
//
// Most fences in the migrated posts name no language, so an unlabelled
// block gets a conservative guess — Python, shell, JSON or JS/TS by what
// it plainly looks like — and anything the guess is not sure of, or that
// is labelled `text`, is left as plain monospace rather than coloured
// wrongly.

import { createHighlighter, type Highlighter } from "shiki";

// The slice of the hast tree this touches, typed locally: `hast` is only a
// transitive dependency, so its types are not ours to import.
type HastNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};
type Element = HastNode & { type: "element"; tagName: string; children: HastNode[] };
type Root = HastNode & { type: "root"; children: HastNode[] };
type ElementContent = HastNode;
type RootContent = HastNode;

const LANGS = [
  "python",
  "bash",
  "json",
  "yaml",
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "html",
  "css",
  "sql",
  "rust",
  "go",
  "c",
  "cpp",
  "java",
  "latex",
  "markdown",
] as const;

const ALIAS: Record<string, string> = {
  py: "python",
  python3: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  js: "javascript",
  ts: "typescript",
  yml: "yaml",
  md: "markdown",
  tex: "latex",
};

let highlighter: Promise<Highlighter> | null = null;
const getHighlighter = () =>
  (highlighter ??= createHighlighter({
    themes: ["github-light", "github-dark-dimmed"],
    langs: [...LANGS],
  }));

function guessLang(code: string): string | undefined {
  const s = code.trim();
  if (!s) return undefined;
  if (/^[[{]/.test(s)) {
    try {
      JSON.parse(s);
      return "json";
    } catch {
      /* not JSON */
    }
  }
  if (
    /^(\$ |pip3? install|npm |pnpm |yarn |git |cd |ls\b|curl |wget |sudo |apt(-get)? |brew |conda |export \w+=|mkdir |docker |python3? \S+\.py)/m.test(
      s,
    )
  ) {
    return "bash";
  }
  if (
    /^\s*(import \w|from [\w.]+ import|def \w+\(|class \w+[(:]|print\(|@\w+|for \w+ in |with \w)/m.test(s) ||
    /\bself\.|\bnp\.|\btf\.|\btorch\.|\bpd\./.test(s)
  ) {
    return "python";
  }
  if (/^\s*(const|let|var|function|export|import .* from ['"])/m.test(s) || /=>\s*[{(]/.test(s)) {
    return "typescript";
  }
  return undefined;
}

function textOf(node: ElementContent | RootContent): string {
  if (node.type === "text") return node.value ?? "";
  return node.children ? node.children.map(textOf).join("") : "";
}

function languageOf(code: Element): string | undefined {
  const classes = code.properties?.className;
  const list = Array.isArray(classes) ? classes.map(String) : typeof classes === "string" ? [classes] : [];
  const tagged = list.find((c) => c.startsWith("language-"))?.slice("language-".length).toLowerCase();
  return tagged ? (ALIAS[tagged] ?? tagged) : undefined;
}

export function rehypeShiki() {
  return async (tree: Root) => {
    const hl = await getHighlighter();
    const loaded = new Set(hl.getLoadedLanguages());
    const walk = (parent: Root | Element) => {
      parent.children.forEach((node: HastNode, i: number) => {
        if (node.type !== "element") return;
        const child = node as Element;
        const code = child.children[0];
        if (
          child.tagName === "pre" &&
          child.children.length === 1 &&
          code?.type === "element" &&
          code.tagName === "code"
        ) {
          const source = textOf(code).replace(/\n$/, "");
          const tagged = languageOf(code as Element);
          const lang = tagged === "text" || tagged === "plaintext" ? undefined : (tagged ?? guessLang(source));
          if (!lang || !loaded.has(lang)) return;
          const out = hl.codeToHast(source, {
            lang,
            themes: { light: "github-light", dark: "github-dark-dimmed" },
            defaultColor: false,
          });
          const pre = out.children[0] as unknown as HastNode | undefined;
          if (pre?.type === "element") parent.children[i] = pre;
          return;
        }
        walk(child);
      });
    };
    walk(tree);
  };
}
