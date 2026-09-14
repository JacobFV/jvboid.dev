import { isSignedIn } from "@/lib/auth-actions";
import { LoginForm } from "./LoginForm";

// Jacob's way in, and nothing else's. Nothing links here: no nav entry, no
// command-menu action, not in the sitemap, disallowed in robots.txt. It is a
// public URL — they all are — just an unadvertised one, and the thing that
// actually protects it is the Worker behind it, which counts wrong guesses
// and shuts the door at five. See workers/auth/README.md.
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

// The password check reads cookies, so this page can't be prerendered.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const signedIn = await isSignedIn();

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="font-[family-name:var(--font-mono)] text-[0.68rem] tracking-[0.14em] text-[var(--color-ink-mute)] uppercase">
        Sign in
      </h1>
      <hr className="rule mt-4 mb-8" />
      <LoginForm signedIn={signedIn} />
    </main>
  );
}
