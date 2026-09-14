import Link from "next/link";
import { notFound } from "next/navigation";
import { EditableBody } from "@/components/chrome/EditableBody";
import { MDXContent } from "@/lib/mdx";
import { getAllChapters, getChapter, getChapters } from "@/lib/bio";

type Params = Promise<{ chapter: string }>;

const MONO =
  "font-[family-name:var(--font-mono)] text-[0.68rem] tracking-[0.14em] text-[var(--color-ink-mute)] uppercase";

export function generateStaticParams() {
  return getAllChapters().map((c) => ({ chapter: c.id }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { chapter } = await params;
  const c = getChapter(chapter);
  if (!c) return {};
  return {
    title: `${c.title} · Bio`,
    description: c.summary,
    // An unwritten chapter is a title and nothing else; don't index it.
    ...(c.written ? {} : { robots: { index: false } }),
  };
}

export default async function ChapterPage({ params }: { params: Params }) {
  const { chapter } = await params;
  const c = getChapter(chapter);
  if (!c) notFound();

  // Dotfiles aren't in the numbered run, so they get no number and no
  // neighbours — only the way back to the contents.
  const chapters = getChapters();
  const i = chapters.findIndex((x) => x.id === c.id);
  const prev = i > 0 ? chapters[i - 1] : undefined;
  const next = i >= 0 ? chapters[i + 1] : undefined;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <article>
        <header className="mt-12 mb-14 sm:mt-16">
          {i >= 0 && <p className={MONO}>Chapter {i + 1}</p>}
          <h1 data-page-title className="display-title mt-4">
            {c.title}
          </h1>
          <hr className="rule mt-10" />
        </header>

        {/* Unwritten chapters are editable too — an empty chapter is the
            one most worth being able to start from a phone. */}
        <EditableBody scope="bio" id={c.id} title={c.title}>
          {c.written ? (
            <div className="prose-mdx chapter-opener">
              <MDXContent code={c.body} />
            </div>
          ) : (
            <p className="text-[var(--color-ink-dim)]">Not written yet.</p>
          )}
        </EditableBody>

        <nav
          aria-label="Chapters"
          className={`mt-20 grid grid-cols-3 items-baseline gap-4 border-t border-[var(--color-rule)] pt-8 ${MONO}`}
        >
          <span>
            {prev && (
              <Link href={`/bio/${prev.id}`} className="no-underline hover:text-[var(--color-ink)]">
                ← {prev.title}
              </Link>
            )}
          </span>
          <Link href="/bio" className="text-center no-underline hover:text-[var(--color-ink)]">
            Contents
          </Link>
          <span className="text-right">
            {next && (
              <Link href={`/bio/${next.id}`} className="no-underline hover:text-[var(--color-ink)]">
                {next.title} →
              </Link>
            )}
          </span>
        </nav>
      </article>
    </main>
  );
}
