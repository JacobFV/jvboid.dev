import Link from "next/link";
import type { ReactNode } from "react";
import { Globe, Package } from "lucide-react";
import { SocialGlyph } from "@/components/chrome/SocialGlyphs";
import { getGraph, isListedNode, nodeHref } from "@/lib/graph";
import {
  contact,
  experience,
  formatResumeDate,
  projectRepos,
  projectShowcases,
  resumeProjects,
  resumeAwards,
  resumePosts,
  packageLinks,
  type BlurbPart,
  type PostNetwork,
  resumeBlurbParts,
  resumeBriefLines,
  resumeStack,
  resumeMeta as meta,
  resumePdfHref,
} from "@/lib/resume-data";

export const metadata = {
  title: "Resume · Jacob Valdez",
  description: "Data/ML Engineering, Robotics, Full-Stack.",
};

// The resume's links carry its ink blue with `!`: globals.css sets
// `a { color: inherit }` unlayered, which beats any Tailwind utility.

// One run of a project's resume line; see BlurbPart for the markup.
function BlurbRun({ part }: { part: BlurbPart }) {
  if (part.href) {
    return (
      <a
        href={part.href}
        target="_blank"
        rel="noreferrer"
        className="text-[var(--color-resume)]! decoration-[var(--color-resume)]! underline decoration-1 underline-offset-2 hover:text-[var(--color-accent)]!"
      >
        {part.text}
      </a>
    );
  }
  if (part.strong) return <strong className="font-semibold text-[var(--color-ink)]">{part.text}</strong>;
  if (part.tech) return <span className="text-[var(--color-ink-mute)]">{part.text}</span>;
  return <>{part.text}</>;
}

// CommandAGI's mark, the looped square (⌘), as commandagi.com/icon.svg
// draws it: one stroked path, in the text colour.
function CommandAgiMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95em] w-[0.95em] shrink-0" aria-hidden focusable="false">
      <g transform="translate(1.4712 1.4712) scale(0.8774)">
        <path
          d="M4.635 8.265A3.63 3.63 0 1 1 8.265 4.635L8.265 19.365A3.63 3.63 0 1 1 4.635 15.735L19.365 15.735A3.63 3.63 0 1 1 15.735 19.365L15.735 4.635A3.63 3.63 0 1 1 19.365 8.265L4.635 8.265Z"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.05}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function PostMark({ network }: { network: PostNetwork }) {
  return network === "commandagi" ? <CommandAgiMark /> : <SocialGlyph name={network} />;
}

// An icon + label link at the end of a project line (repo, site, package).
function IconLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <>
      {" "}
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-baseline gap-1 whitespace-nowrap font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)] no-underline hover:text-[var(--color-accent)]"
      >
        <span className="self-center">{icon}</span>
        {label}
      </a>
    </>
  );
}

export default function ResumePage() {
  const { nodes } = getGraph();
  const projects = resumeProjects(nodes.filter(isListedNode));

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
        <p className="mt-1 text-sm uppercase tracking-widest text-[var(--color-ink)] font-[family-name:var(--font-mono)]">
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
        </div>
      </header>

      {/* Highlights — no heading; the bullets follow the header directly. */}
      <section className="mb-12">
        <ul className="grid gap-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          {meta.highlights.map((parts, i) => (
            <li key={i} className="border-l-2 border-[var(--color-resume)] pl-4">
              {parts.map((part, j) =>
                typeof part === "string" ? (
                  part
                ) : (
                  <a
                    key={j}
                    href={part.href}
                    className="text-[var(--color-resume)]! decoration-[var(--color-resume)]! underline decoration-1 underline-offset-2 hover:text-[var(--color-accent)]!"
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
                      {n.org && (
                        <span className="text-[var(--color-ink-dim)]">
                          {" · "}
                          {n.href ? (
                            <a
                              href={n.href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--color-resume)]! decoration-[var(--color-resume)]! underline decoration-1 underline-offset-2 hover:text-[var(--color-accent)]!"
                            >
                              {n.org}
                            </a>
                          ) : (
                            n.org
                          )}
                        </span>
                      )}
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
        <h2 className="mb-4 border-b border-[var(--color-resume)] pb-1 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-resume)]">
          Projects ({projects.length})
        </h2>
        <ul className="grid gap-3">
          {projects.map((n) => {
            const repos = projectRepos(n);
            const showcases = projectShowcases(n);
            const brief = resumeBriefLines(n);
            const stack = resumeStack(n);
            return (
              <li key={n.id} className="grid grid-cols-[88px_1fr] gap-3">
                <div className="whitespace-pre-line font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-mute)]">
                  {formatResumeDate(n)}
                </div>
                <p className="text-sm text-[var(--color-ink-dim)]">
                  <Link
                    href={nodeHref(n)}
                    className="font-medium text-[var(--color-ink)] underline decoration-1 underline-offset-2 hover:text-[var(--color-accent)]"
                  >
                    {n.title}
                  </Link>
                  {brief
                    ? brief.map((line, li) => (
                        <span key={line.label}>
                          {li === 0 ? ": " : " "}
                          <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--color-resume)]">
                            {line.label}
                          </span>{" "}
                          {line.parts.map((part, i) => (
                            <BlurbRun key={i} part={part} />
                          ))}
                        </span>
                      ))
                    : (
                        <>
                          {": "}
                          {resumeBlurbParts(n).map((part, i) => (
                            <BlurbRun key={i} part={part} />
                          ))}
                        </>
                      )}
                  {resumeAwards(n).map((a) => (
                    <span key={a.href}>
                      {" "}
                      <a
                        href={a.href}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[var(--color-resume)]! decoration-[var(--color-resume)]! underline decoration-1 underline-offset-2 hover:text-[var(--color-accent)]!"
                      >
                        {a.text}
                      </a>
                      .
                    </span>
                  ))}
                  {repos.map((repo) => (
                    <IconLink key={repo.href} href={repo.href} icon={<SocialGlyph name="github" />} label={repo.slug} />
                  ))}
                  {resumePosts(n).map((post) => (
                    <IconLink
                      key={post.href}
                      href={post.href}
                      icon={<PostMark network={post.network} />}
                      label={post.label}
                    />
                  ))}
                  {showcases.map((showcase) => (
                    <IconLink
                      key={showcase.href}
                      href={showcase.href}
                      icon={<Globe className="h-[0.95em] w-[0.95em]" strokeWidth={2} aria-hidden />}
                      label={showcase.label}
                    />
                  ))}
                  {packageLinks(n).map((pkg) => (
                    <IconLink
                      key={pkg.href}
                      href={pkg.href}
                      icon={<Package className="h-[0.95em] w-[0.95em]" strokeWidth={2} aria-hidden />}
                      label={pkg.label}
                    />
                  ))}
                  {stack && <span className="text-[var(--color-ink-mute)]"> · {stack}</span>}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
      {/* Skills ---------------------------------------------------------- */}
      <section className="mb-12">
        <h2 className="mb-4 border-b border-[var(--color-resume)] pb-1 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-resume)]">
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
