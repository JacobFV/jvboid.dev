import { notFound } from "next/navigation";
import { getGraph } from "@/lib/graph";
import { MDXContent } from "@/lib/mdx";
import { LocalGraph } from "@/components/reader/LocalGraph";

// The introduction node, read as the site's story. It keeps its content
// in content/hello/introduction.mdx, but unlike every other node it opens
// with no hero — no title, standfirst, date or rule — straight onto its
// first sentence, which `.story-opener` sets as a blockface drop cap.
const STORY_ID = "introduction";

export function generateMetadata() {
  const node = getGraph().byId.get(STORY_ID);
  return node ? { title: "Story · Jacob Valdez", description: node.summary } : {};
}

export default function StoryPage() {
  const node = getGraph().byId.get(STORY_ID);
  if (!node) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <article>
        <h1 className="sr-only">{node.title}</h1>
        <div className="prose-mdx story-opener mt-12 sm:mt-16">
          <MDXContent code={node.body} />
        </div>

        <LocalGraph focusId={node.id} />
      </article>
    </main>
  );
}
