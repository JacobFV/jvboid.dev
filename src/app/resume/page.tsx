import Link from "next/link";
import { SocialGlyph } from "@/components/chrome/SocialGlyphs";
import { getGraph, isListedNode, nodeHref } from "@/lib/graph";
import {
  contact,
  experience,
  formatResumeDate,
  githubRepo,
  resumeAwards,
  onResume,
  resumeBlurb,
  resumeMeta as meta,
  resumePdfHref,
} from "@/lib/resume-data";

export const metadata = {
  title: "Resume · Jacob Valdez",
  description: "Data/ML Engineering, Robotics, Full-Stack.",
};

export default function ResumePage() {
  const { nodes } = getGraph();
  const projects = nodes
    .filter(isListedNode)
    .filter((n) => n.kind === "project" && onResume(n))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {/* Actions --------------------------------------------------------- */}
      <div className="mb-10 flex flex-wrap items-center justify-end gap-3">
        <div className="flex gap-2 font-[family-name:var(--font-mono)] text-xs">
          <a
            href={resumePdfHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[var(--color-bg-1)] px-3 py-1.5 text-[var(--color-ink-dim)] no-underline hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
          >
            view pdf ↗
          </a>
          <a
            href={resumePdfHref}
            download="jacob-valdez-resume.pdf"
            className="rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-white no-underline hover:opacity-90"
          >
            download pdf ↓
          </a>
        </div>
      </div>

      {/* Embedded PDF preview ------------------------------------------- */}
      {/* The paper comes first: it already carries the name, headline and
          contact line, so the page opens on the resume itself. */}
      <section className="mb-12">
        <div className="overflow-hidden rounded-xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] shadow-[var(--ring-soft)]">
          <object
            data={`${resumePdfHref}#view=FitH`}
            type="application/pdf"
            className="block h-[80vh] w-full"
            aria-label="Resume PDF preview"
          >
            <div className="p-6 text-sm text-[var(--color-ink-dim)]">
              Your browser can&rsquo;t embed PDFs.{" "}
              <a
                href={resumePdfHref}
                className="text-[var(--color-accent)] underline"
              >
                Open the PDF in a new tab.
              </a>
            </div>
          </object>
        </div>
      </section>

      {/* Header ---------------------------------------------------------- */}
      <header className="mb-12">
        <h1 className="font-block text-4xl font-extrabold tracking-tight text-[var(--color-ink)]">
          {contact.name}
        </h1>
        <p className="mt-1 text-sm uppercase tracking-widest text-[var(--color-accent)] font-[family-name:var(--font-mono)]">
          {meta.headline}
        </p>
        {meta.summary && (
          <p className="mt-3 text-lg leading-relaxed text-[var(--color-ink-dim)]">{meta.summary}</p>
        )}
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
          <a className="hover:text-[var(--color-accent)]" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
          <a className="hover:text-[var(--color-accent)]" href={`tel:${contact.phone.replace(/\s|\(|\)|-/g, "")}`}>
            {contact.phone}
          </a>
          <a className="hover:text-[var(--color-accent)]" href={`https://${contact.github}`}>
            {contact.github}
          </a>
          <a className="hover:text-[var(--color-accent)]" href="https://twitter.com/jvboid">
            {contact.twitter}
          </a>
          <span>{contact.location}</span>
        </div>
      </header>

      {/* Highlights — no heading; the bullets follow the header directly. */}
      <section className="mb-12">
        <ul className="grid gap-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          {meta.highlights.map((parts, i) => (
            <li key={i} className="border-l border-[var(--color-bg-2)] pl-4">
              {parts.map((part, j) =>
                typeof part === "string" ? (
                  part
                ) : (
                  <a
                    key={j}
                    href={part.href}
                    className="text-[var(--color-ink)] underline decoration-1 underline-offset-2 hover:text-[var(--color-accent)]"
                  >
                    {part.text}
                  </a>
                ),
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Experience — no heading; the section gap sets it apart. */}
      <section className="mb-12">
        <ul className="grid gap-6">
          {experience.map((n) => {
            return (
              <li key={`${n.org}-${n.title}-${n.range}`} className="grid grid-cols-[160px_1fr] gap-4">
                <div className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                  {n.range}
                </div>
                <div>
                  {n.title && (
                    <div className="text-lg text-[var(--color-ink)]">
                      {n.title}
                      <span className="text-[var(--color-ink-dim)]">
                        {" · "}
                        {n.href ? (
                          <a
                            href={n.href}
                            target="_blank"
                            rel="noreferrer"
                            className="underline decoration-1 underline-offset-2 hover:text-[var(--color-accent)]"
                          >
                            {n.org}
                          </a>
                        ) : (
                          n.org
                        )}
                      </span>
                    </div>
                  )}
                  {/* Paragraphs, not bullets: each entry reads as prose. */}
                  <div className="mt-1 grid gap-1.5 text-sm text-[var(--color-ink-dim)]">
                    {n.bullets.map((b) => (
                      <p key={b}>{b}</p>
                    ))}
                  </div>
                  {n.media && n.media.length > 0 && (
                    // A LinkedIn-style media strip, deliberately small: fixed
                    // 56px height, natural width, caption on hover/focus via
                    // the title attribute so the row stays one line tall.
                    <ul className="mt-2 flex flex-wrap items-end gap-2">
                      {n.media.map((m) => (
                        <li key={m.src}>
                          <a
                            href={m.src}
                            target="_blank"
                            rel="noreferrer"
                            title={m.description ? `${m.caption} — ${m.description}` : m.caption}
                            className="block overflow-hidden rounded border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] transition-opacity hover:opacity-80"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.thumb}
                              alt={m.caption}
                              width={Math.round((m.w / m.h) * 56)}
                              height={56}
                              loading="lazy"
                              className="block h-14 w-auto object-cover"
                            />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Projects -------------------------------------------------------- */}
      <section className="mb-12">
        <h2 className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-ink-mute)]">
          Projects ({projects.length})
        </h2>
        <ul className="grid gap-1.5">
          {projects.map((n) => {
            const repo = githubRepo(n);
            return (
              <li key={n.id} className="grid grid-cols-[88px_1fr] gap-3">
                <div className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-mute)]">
                  {formatResumeDate(n)}
                </div>
                <p className="text-sm text-[var(--color-ink-dim)]">
                  <Link
                    href={nodeHref(n)}
                    className="font-medium text-[var(--color-ink)] underline decoration-1 underline-offset-2 hover:text-[var(--color-accent)]"
                  >
                    {n.title}
                  </Link>
                  : {resumeBlurb(n)}
                  {resumeAwards(n).map((a) => (
                    <span key={a.href}>
                      {" "}
                      <a
                        href={a.href}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[var(--color-ink)] underline decoration-1 underline-offset-2 hover:text-[var(--color-accent)]"
                      >
                        {a.text}
                      </a>
                      .
                    </span>
                  ))}
                  {repo && (
                    <>
                      {" "}
                      <a
                        href={repo.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-baseline gap-1 whitespace-nowrap font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)] no-underline hover:text-[var(--color-accent)]"
                      >
                        <span className="self-center">
                          <SocialGlyph name="github" />
                        </span>
                        {repo.slug}
                      </a>
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
      {/* Skills ---------------------------------------------------------- */}
      <section className="mb-12">
        <h2 className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-ink-mute)]">
          Skills (ATS)
        </h2>
        <div className="grid gap-1.5 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          {meta.skills.map((g) => (
            <p key={g.label}>
              <span className="font-medium text-[var(--color-ink)]">{g.label}:</span>{" "}
              {g.items.join(", ")}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
