import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Not here.
      </h1>
      <p className="mt-3 text-[var(--color-ink-dim)]">
        That node doesn&rsquo;t exist — yet, or anymore.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block font-[family-name:var(--font-mono)] text-xs"
      >
        ← back to the index
      </Link>
    </main>
  );
}
