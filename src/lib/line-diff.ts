export type DiffKind = "same" | "add" | "remove";

export type DiffLine = {
  kind: DiffKind;
  text: string;
  oldNumber?: number;
  newNumber?: number;
};

type Edit = Pick<DiffLine, "kind" | "text">;

const get = (map: Map<number, number>, key: number) =>
  map.get(key) ?? Number.NEGATIVE_INFINITY;

function backtrack(
  trace: Map<number, number>[],
  before: string[],
  after: string[],
  finalDepth: number,
): Edit[] {
  let x = before.length;
  let y = after.length;
  const edits: Edit[] = [];

  for (let depth = finalDepth; depth >= 0; depth -= 1) {
    const frontier = trace[depth];
    const diagonal = x - y;
    const previousDiagonal =
      diagonal === -depth ||
      (diagonal !== depth && get(frontier, diagonal - 1) < get(frontier, diagonal + 1))
        ? diagonal + 1
        : diagonal - 1;
    const previousX = frontier.get(previousDiagonal) ?? 0;
    const previousY = previousX - previousDiagonal;

    while (x > previousX && y > previousY) {
      edits.push({ kind: "same", text: before[x - 1] });
      x -= 1;
      y -= 1;
    }

    if (depth === 0) break;
    if (x === previousX) {
      edits.push({ kind: "add", text: after[y - 1] });
      y -= 1;
    } else {
      edits.push({ kind: "remove", text: before[x - 1] });
      x -= 1;
    }
  }

  return edits.reverse();
}

function myersDiff(before: string[], after: string[]): Edit[] {
  const maximumDepth = before.length + after.length;
  let frontier = new Map<number, number>([[1, 0]]);
  const trace: Map<number, number>[] = [];

  for (let depth = 0; depth <= maximumDepth; depth += 1) {
    trace.push(new Map(frontier));

    for (let diagonal = -depth; diagonal <= depth; diagonal += 2) {
      const down = get(frontier, diagonal + 1);
      const right = get(frontier, diagonal - 1) + 1;
      let x =
        diagonal === -depth || (diagonal !== depth && right < down) ? down : right;
      if (!Number.isFinite(x)) x = 0;
      let y = x - diagonal;

      while (x < before.length && y < after.length && before[x] === after[y]) {
        x += 1;
        y += 1;
      }
      frontier.set(diagonal, x);

      if (x >= before.length && y >= after.length) {
        return backtrack(trace, before, after, depth);
      }
    }
  }

  return [];
}

function attachLineNumbers(edits: Edit[]): DiffLine[] {
  let oldNumber = 1;
  let newNumber = 1;

  return edits.map((edit) => {
    if (edit.kind === "same") {
      const line = { ...edit, oldNumber, newNumber };
      oldNumber += 1;
      newNumber += 1;
      return line;
    }
    if (edit.kind === "remove") {
      const line = { ...edit, oldNumber };
      oldNumber += 1;
      return line;
    }
    const line = { ...edit, newNumber };
    newNumber += 1;
    return line;
  });
}

export function diffLines(beforeText: string, afterText: string): DiffLine[] {
  const before = beforeText ? beforeText.replace(/\r\n/g, "\n").split("\n") : [];
  const after = afterText ? afterText.replace(/\r\n/g, "\n").split("\n") : [];

  // Myers is excellent for ordinary prose edits. A total rewrite of an
  // extremely long post can force quadratic trace storage, so cap that rare
  // case and still return an exact, conservative delete-all/add-all diff.
  if (before.length + after.length > 6000) {
    return attachLineNumbers([
      ...before.map((text) => ({ kind: "remove" as const, text })),
      ...after.map((text) => ({ kind: "add" as const, text })),
    ]);
  }

  return attachLineNumbers(myersDiff(before, after));
}
