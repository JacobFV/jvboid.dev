import Link from "next/link";
import { redirect } from "next/navigation";
import { getGraph, isListedNode, nodeHref } from "@/lib/graph";
import {
  contact,
  experience,
  projectFocus,
  variantHref,
  variantMeta,
  variantPdfHref,
  type ResumeVariant,
} from "@/lib/resume-data";

export const metadata = {
  title: "Resume · Jacob Valdez",
  description: "AI systems engineer and robotics builder — software and robotics resume variants.",
};

const fmt = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 7) : null);
const yr = (iso?: string) => (iso ? new Date(iso).getUTCFullYear().toString() : "");

function isVariant(v: string): v is ResumeVariant {
  return v === "software" || v === "robotics";
}

export default async function ResumePage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const sp = await searchParams;
  const raw = sp?.v ?? "software";
  if (raw !== "software" && raw !== "robotics") {
    redirect("/resume?v=software");
  }
  const variant: ResumeVariant = isVariant(raw) ? raw : "software";
  const meta = variantMeta[variant];

  const { nodes } = getGraph();
  const listed = nodes.filter(isListedNode);
  const projects = listed
    .filter((n) => n.kind === "project" && n.status !== "shelved")
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const focused = projects.filter((p) => projectFocus(p)[variant]);
  const adjacent = projects.filter((p) => !projectFocus(p)[variant]);
  const focusLabel = variant === "software" ? "Software & AI" : "Robotics & embodied AI";

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {/* Variant switcher + actions ----------------------------------- */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Resume variant"
          className="flex gap-1 rounded-full bg-[var(--color-bg-1)] p-1 font-[family-name:var(--font-mono)] text-xs"
        >
          {(["software", "robotics"] as const).map((v) => (
            <Link
              key={v}
              href={`/resume?v=${v}`}
              role="tab"
              aria-selected={variant === v}
              className={`rounded-full px-3 py-1 no-underline transition-colors ${
                variant === v
                  ? "bg-[var(--color-bg-0)] text-[var(--color-ink)] shadow-[var(--ring-soft)]"
                  : "text-[var(--color-ink-mute)] hover:text-[var(--color-ink-dim)]"
              }`}
            >
              {v}
            </Link>
          ))}
        </div>
        <div className="flex gap-2 font-[family-name:var(--font-mono)] text-xs">
          <a
            href={variantPdfHref(variant)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[var(--color-bg-1)] px-3 py-1.5 text-[var(--color-ink-dim)] no-underline hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
          >
            view pdf ↗
          </a>
          <a
            href={variantPdfHref(variant)}
            download={`jacob-valdez-${variant}-resume.pdf`}
            className="rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-white no-underline hover:opacity-90"
          >
            download pdf ↓
          </a>
        </div>
      </div>

      {/* Header ---------------------------------------------------------- */}
      <header className="mb-10">
        <h1
          className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--color-ink)]"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          {contact.name}
        </h1>
        <p className="mt-1 text-sm uppercase tracking-widest text-[var(--color-accent)] font-[family-name:var(--font-mono)]">
          {meta.headline}
        </p>
        <p className="mt-3 text-lg leading-relaxed text-[var(--color-ink-dim)]">{meta.summary}</p>
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

      {/* Embedded PDF preview ------------------------------------------- */}
      <section className="mb-12">
        <h2 className="mb-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-ink-mute)]">
          PDF preview
        </h2>
        <div className="overflow-hidden rounded-xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] shadow-[var(--ring-soft)]">
          <object
            data={`${variantPdfHref(variant)}#view=FitH`}
            type="application/pdf"
            className="block h-[80vh] w-full"
            aria-label={`${variant} resume PDF preview`}
          >
            <div className="p-6 text-sm text-[var(--color-ink-dim)]">
              Your browser can&rsquo;t embed PDFs.{" "}
              <a
                href={variantPdfHref(variant)}
                className="text-[var(--color-accent)] underline"
              >
                Open the PDF in a new tab.
              </a>
            </div>
          </object>
        </div>
      </section>

      {/* Highlights ------------------------------------------------------ */}
      <section className="mb-12">
        <h2 className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-ink-mute)]">
          Highlights
        </h2>
        <ul className="grid gap-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          {meta.highlights.map((h) => (
            <li key={h} className="border-l border-[var(--color-bg-2)] pl-4">
              {h}
            </li>
          ))}
        </ul>
      </section>

      {/* Skills ---------------------------------------------------------- */}
      <section className="mb-12">
        <h2 className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-ink-mute)]">
          Skills
        </h2>
        <p className="text-sm leading-relaxed text-[var(--color-ink-dim)]">
          {meta.strengths.join(", ")}
        </p>
      </section>

      {/* Experience ------------------------------------------------------ */}
      <section className="mb-12">
        <h2 className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-ink-mute)]">
          Experience
        </h2>
        <ul className="grid gap-6">
          {experience.map((n) => {
            const Wrap = n.href ? Link : "div";
            return (
              <li key={`${n.org}-${n.title}`} className="grid grid-cols-[160px_1fr] gap-4">
                <div className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                  {n.range}
                </div>
                <div>
                  <Wrap
                    href={n.href ?? "#"}
                    className="block text-lg text-[var(--color-ink)] no-underline hover:text-[var(--color-accent)]"
                  >
                    {n.title}
                    <span className="text-[var(--color-ink-dim)]"> · {n.org}</span>
                  </Wrap>
                  <p className="mt-1 text-sm text-[var(--color-ink-dim)]">{n.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-2 font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-ink-mute)]">
                    {n.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--color-bg-1)] px-2 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
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

        <h3 className="mb-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--color-ink-dim)]">
          {focusLabel} — focus ({focused.length})
        </h3>
        <ul className="mb-6 grid gap-1.5">
          {focused.map((n) => (
            <li key={n.id} className="grid grid-cols-[60px_1fr] gap-3">
              <div className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-mute)]">
                {yr(n.date) || fmt(n.date)}
              </div>
              <Link
                href={nodeHref(n)}
                className="text-sm text-[var(--color-ink)] no-underline hover:text-[var(--color-accent)]"
              >
                <span className="font-medium">{n.title}</span>
                <span className="text-[var(--color-ink-dim)]"> — {n.summary}</span>
              </Link>
            </li>
          ))}
        </ul>

        <h3 className="mb-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--color-ink-dim)]">
          Adjacent work ({adjacent.length})
        </h3>
        <ul className="grid gap-1.5">
          {adjacent.map((n) => (
            <li key={n.id} className="grid grid-cols-[60px_1fr] gap-3">
              <div className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-mute)]">
                {yr(n.date) || fmt(n.date)}
              </div>
              <Link
                href={nodeHref(n)}
                className="text-sm text-[var(--color-ink)] no-underline hover:text-[var(--color-accent)]"
              >
                <span className="font-medium">{n.title}</span>
                <span className="text-[var(--color-ink-dim)]"> — {n.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
