// remark plugin — fixes migrated LaTeX that HTML-escaped characters
// inside `$...$` / `$$...$$`. KaTeX needs literal TeX syntax, not
// entities like `&#123;` for `{`.

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: {
    hChildren?: MdNode[];
  };
}

const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  div: "\\div",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeMathEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return namedEntities[entity] ?? match;
  });
}

function decodeMathEntitiesFully(value: string): string {
  let current = value;
  for (let i = 0; i < 3; i++) {
    const next = decodeMathEntities(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

function visit(node: MdNode) {
  if ((node.type === "math" || node.type === "inlineMath") && node.value) {
    node.value = decodeMathEntitiesFully(node.value);
    for (const child of node.data?.hChildren ?? []) {
      visitMathHtml(child);
    }
  }
  for (const child of node.children ?? []) visit(child);
}

function visitMathHtml(node: MdNode) {
  if (node.type === "text" && node.value) {
    node.value = decodeMathEntitiesFully(node.value);
  }
  for (const child of node.children ?? []) visitMathHtml(child);
}

export function remarkDecodeMathEntities() {
  return (tree: MdNode) => {
    visit(tree);
  };
}
