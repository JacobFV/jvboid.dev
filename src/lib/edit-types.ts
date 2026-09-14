// Pure types for the in-browser editor, shared by the client components and
// the server actions.
//
// Same reason `graph-types.ts` exists next to `graph.ts`: `content-actions.ts`
// reaches the content registry and so, transitively, `node:fs`. Server actions
// never reach a client bundle, but keeping the types somewhere a client
// component can import without touching that module at all costs nothing and
// removes the question.

/** Which registry an editable entry comes from. */
export type EditScope = "node" | "bio";

/** An entry a page has offered up for editing. */
export type EditTarget = { scope: EditScope; id: string; title: string };
