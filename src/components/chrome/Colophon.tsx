import Link from "next/link";

// The colophon. Every magazine closes on a small page that says what it
// was set in and who made it, and a site that leans this hard on its type
// should credit it. Sits at the very bottom of every route, below the
// page's own content, under an ornamented rule.
export function Colophon() {
  return (
    <footer className="colophon mx-auto max-w-5xl px-6 pt-24 pb-14">
      <div className="rule-ornament" aria-hidden>
        <span className="text-[0.6rem] tracking-[0.5em]">✦</span>
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
        <p className="colophon-text">
          Set in <em>Fraunces</em> for display and reading, <em>Inter</em> for the chrome, and{" "}
          <em>JetBrains Mono</em> for code, captions and running heads. Written in MDX, built with
          Next.js, and published from{" "}
          <a href="https://github.com/JacobFV/jvboid.dev" target="_blank" rel="noreferrer">
            the source
          </a>{" "}
          on every push. Read about{" "}
          <Link href="/projects/jacobfv-site">how it is put together</Link>.
        </p>
        <p className="colophon-mark">
          Jacob Valdez · <span>{new Date().getFullYear()}</span>
        </p>
      </div>
    </footer>
  );
}
