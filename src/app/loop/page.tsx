import Link from "next/link";
import chapters from "../../../.velite/loop.json";

export const metadata = {
  title: "A beautiful loop · Reading notes",
  description:
    "Reading notes on Laukkonen, Friston, and Chandaria's active-inference theory of consciousness.",
};

function chapterSlug(slug: string) {
  return slug.replace(/^loop\//, "").replace(/\.mdx?$/, "");
}

export default function LoopIndex() {
  const ordered = [...chapters].sort((a, b) => a.order - b.order);

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "16vh 24px",
      }}
    >
      <header style={{ marginBottom: 80 }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--color-ink-mute)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Reading notes
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 56,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--color-ink)",
            margin: 0,
            fontVariationSettings: '"opsz" 144',
          }}
        >
          A beautiful loop
        </h1>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: "var(--color-ink-dim)",
            marginTop: 16,
            maxWidth: 560,
          }}
        >
          A scrollable read of Laukkonen, Friston, and Chandaria&rsquo;s
          active-inference theory of consciousness — and what it tells us
          about minds that contain themselves.
        </p>
      </header>

      <ol style={{ listStyle: "none", padding: 0, display: "grid", gap: 24 }}>
        {ordered.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/loop/${chapterSlug(c.slug)}`}
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr",
                gap: 16,
                alignItems: "baseline",
                padding: "16px 0",
                borderTop: "1px solid var(--color-bg-2)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--color-ink-mute)",
                }}
              >
                {String(c.order).padStart(2, "0")}
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    color: "var(--color-ink)",
                    marginBottom: 4,
                  }}
                >
                  {c.title}
                </div>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: "var(--color-ink-dim)",
                    margin: 0,
                  }}
                >
                  {c.summary}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <div
        style={{
          marginTop: 80,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--color-ink-mute)",
        }}
      >
        <Link
          href="/"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          ← back to home
        </Link>
      </div>
    </main>
  );
}
