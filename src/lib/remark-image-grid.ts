// remark plugin — groups runs of 2+ consecutive image-only paragraphs
// into an <ImageGrid> JSX element so the reader lays them out as a
// 2/3-column gallery instead of a tall vertical stack. Single images,
// and images mixed with text, are left untouched. Video embeds live in
// frontmatter (Hero), never in the body, so they are never grouped.

interface MdNode {
  type: string;
  name?: string;
  value?: string;
  children?: MdNode[];
}

// Returns the image nodes in a paragraph iff the paragraph contains
// *only* images (whitespace text is allowed — `![a](x)\n![b](y)`
// arrives as one paragraph with a stray newline text node).
function imageOnlyParagraph(node: MdNode): MdNode[] | null {
  if (node.type !== "paragraph" || !node.children) return null;
  const images: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === "image") images.push(child);
    else if (child.type === "text" && (child.value ?? "").trim() === "")
      continue;
    else return null;
  }
  return images.length > 0 ? images : null;
}

export function remarkImageGrid() {
  return (tree: MdNode) => {
    const children = tree.children;
    if (!children) return;

    const out: MdNode[] = [];
    let i = 0;
    while (i < children.length) {
      const head = imageOnlyParagraph(children[i]);
      if (head) {
        const images = [...head];
        let j = i + 1;
        for (; j < children.length; j++) {
          const more = imageOnlyParagraph(children[j]);
          if (!more) break;
          images.push(...more);
        }
        if (images.length >= 2) {
          out.push({
            type: "mdxJsxFlowElement",
            name: "ImageGrid",
            attributes: [
              {
                type: "mdxJsxAttribute",
                name: "count",
                value: String(images.length),
              },
            ],
            children: images,
          } as unknown as MdNode);
          i = j;
          continue;
        }
      }
      out.push(children[i]);
      i++;
    }
    tree.children = out;
  };
}
