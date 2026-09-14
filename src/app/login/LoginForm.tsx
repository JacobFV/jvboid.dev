"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { attemptLogin, logout } from "@/lib/auth-actions";
import { sheetPrimary, sheetSecondary } from "@/components/chrome/Sheet";

const LABEL =
  "block font-[family-name:var(--font-mono)] text-[0.66rem] tracking-[0.12em] text-[var(--color-ink-mute)] uppercase";
const INPUT =
  "mt-1.5 block w-full border border-[var(--color-rule)] bg-transparent px-3 py-2.5 font-[family-name:var(--font-sans)] text-sm tracking-normal text-[var(--color-ink)] normal-case outline-none placeholder:text-[var(--color-ink-mute)] focus:border-[var(--color-ink)]";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "error"; error: string }
  | { kind: "locked"; error: string };

export function LoginForm({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  if (signedIn) {
    return (
      <div>
        <p className="mb-5 text-sm text-[var(--color-ink-dim)]">You're signed in.</p>
        <button
          type="button"
          className={sheetSecondary}
          onClick={async () => {
            await logout();
            router.refresh();
          }}
        >
          <span>Sign out</span>
          <span aria-hidden>→</span>
        </button>
      </div>
    );
  }

  const submit = async () => {
    setState({ kind: "sending" });
    const result = await attemptLogin(password);
    if (result.ok) {
      setPassword("");
      // refresh() first so the server re-reads the fresh cookie; the header
      // picks the pencil up from its own readable cookie on the next mount.
      router.refresh();
      router.replace("/");
      return;
    }
    setPassword("");
    setState({ kind: result.locked ? "locked" : "error", error: result.error });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className={LABEL}>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
          className={INPUT}
        />
      </label>
      <button
        type="submit"
        disabled={state.kind === "sending" || !password}
        className={`${sheetPrimary} mt-3`}
      >
        <span>{state.kind === "sending" ? "Checking…" : "Sign in"}</span>
        <span aria-hidden>→</span>
      </button>
      {(state.kind === "error" || state.kind === "locked") && (
        <p className="mt-3 text-xs text-[var(--color-accent)]">{state.error}</p>
      )}
      {state.kind === "locked" && (
        <p className="mt-2 text-xs text-[var(--color-ink-mute)]">
          Turn it back on in Cloudflare — KV, <code>login:enabled</code>.
        </p>
      )}
    </form>
  );
}
