import { notFound } from "next/navigation";
import { getGraph, KIND_PREFIX } from "@/lib/graph";
import { MDXContent } from "@/lib/mdx";
import { Hero } from "@/components/reader/Hero";
import { LocalGraph } from "@/components/reader/LocalGraph";
import { VisionRoomGate } from "@/components/three/VisionRoomGate";
import { panelsFor } from "@/data/scenes";

type Params = Promise<{ kind: string; slug: string }>;

export function generateStaticParams() {
  const { nodes } = getGraph();
  return nodes.map((n) => ({ kind: KIND_PREFIX[n.kind], slug: n.id }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { kind, slug } = await params;
  const node = getGraph().byId.get(slug);
  if (!node || KIND_PREFIX[node.kind] !== kind) return {};
  return { title: node.title, description: node.summary };
}

export default async function NodePage({ params }: { params: Params }) {
  const { kind, slug } = await params;
  const graph = getGraph();
  const node = graph.byId.get(slug);
  // 404 on either missing slug OR a prefix that doesn't match the node's
  // real kind — keeps each node canonically reachable at exactly one URL.
  if (!node || KIND_PREFIX[node.kind] !== kind) notFound();

  // Vision nodes with a registered sceneId open into the 3D room. The
  // article body stays in the DOM as the skip-to-text fallback.
  const panels = node.kind === "vision" && node.sceneId ? panelsFor(node.sceneId) : null;

  const article = (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <article>
        <Hero node={node} />

        <div className="prose-mdx">
          <MDXContent code={node.body} />
        </div>

        <LocalGraph focusId={node.id} />
      </article>
    </main>
  );

  if (panels) {
    return <VisionRoomGate panels={panels}>{article}</VisionRoomGate>;
  }
  return article;
}
