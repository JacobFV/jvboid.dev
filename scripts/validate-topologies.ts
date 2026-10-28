// Every phase may only light edges that exist, and every edge must join two
// nodes that exist. Run: pnpm exec tsx scripts/validate-topologies.ts
import { TOPOLOGIES } from "../src/lib/topologies";
import { edgeKey } from "../src/lib/topology-types";

let bad = 0;
for (const t of Object.values(TOPOLOGIES)) {
  const ids = new Set(t.nodes.map((n) => n.id));
  const keys = new Set(t.edges.map(edgeKey));
  if (ids.size !== t.nodes.length) { console.error(`${t.id}: duplicate node id`); bad++; }
  for (const e of t.edges) for (const end of [e.from, e.to]) if (!ids.has(end)) { console.error(`${t.id}: edge ${edgeKey(e)} → unknown node ${end}`); bad++; }
  t.phases.forEach((p, i) => p.edges.forEach((k) => { if (!keys.has(k)) { console.error(`${t.id}: phase ${i + 1} lights unknown edge ${k}`); bad++; } }));
  const lit = new Set(t.phases.flatMap((p) => p.edges));
  for (const k of keys) if (!lit.has(k)) console.warn(`${t.id}: edge ${k} is never lit`);
  console.log(`${t.id}: ${t.nodes.length} nodes, ${t.edges.length} edges, ${t.phases.length} phases`);
}
if (bad) process.exit(1);
