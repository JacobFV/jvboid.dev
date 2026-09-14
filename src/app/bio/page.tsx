import Link from "next/link";
import { getChapters } from "@/lib/bio";

export const metadata = {
  title: "Bio · Jacob Valdez",
  description: "My life so far, in chapters.",
};

// The table of contents, built from whatever numbered files sit in
// content/bio. Set like the kind indexes: a numeral, the title, a hairline
// between entries. A chapter that isn't written yet is still listed, just
// quieter.
export default function BioPage() {
  const chapters = getChapters();

  return (
    <main className="mx-auto max-w-3xl px-6 pt-10 pb-16">
      <header className="mt-14 mb-16">
        <h1 data-page-title className="display-title">
          Bio
        </h1>
      </header>

      <ol className="flex flex-col">
        {chapters.map((chapter, i) => (
          <li key={chapter.id} className="border-t border-[var(--color-rule)] last:border-b">
            <Link
              href={`/bio/${chapter.id}`}
              className="group grid grid-cols-[3.5rem_1fr] items-baseline gap-x-4 py-7 no-underline sm:grid-cols-[5rem_1fr]"
            >
              <span className="numeral">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <h2
                  className={`font-block text-2xl font-extrabold leading-tight tracking-tight transition-colors duration-500 group-hover:text-[var(--color-ink-dim)] sm:text-3xl ${
                    chapter.written ? "text-[var(--color-ink)]" : "text-[var(--color-ink-mute)]"
                  }`}
                >
                  {chapter.title}
                </h2>
                {chapter.summary && (
                  <p className="standfirst mt-3 !text-[1.02rem] !leading-[1.5]">{chapter.summary}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
