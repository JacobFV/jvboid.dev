"use server";

import { headers } from "next/headers";
import { clearSession, createSession, hasSession } from "./session";

// The site's half of the login handshake. It holds no password and makes no
// decision of its own: it forwards the attempt to the jvboid-auth Worker,
// which owns the password, the failure budget and the kill switch, and mints
// a session only if that Worker says yes. See workers/auth/README.md.

export type LoginResult = { ok: true } | { ok: false; error: string; locked?: boolean };

/** Best-effort client address, for the notification email. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  // Vercel appends; the client is the first entry.
  return (forwarded?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
}

export async function attemptLogin(password: string): Promise<LoginResult> {
  const base = process.env.AUTH_WORKER_URL;
  const key = process.env.AUTH_SHARED_KEY;
  if (!base || !key) return { ok: false, error: "Login is not configured." };

  const h = await headers();
  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/+$/, "")}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Key": key },
      body: JSON.stringify({
        password,
        ip: await clientIp(),
        userAgent: h.get("user-agent") ?? "",
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Couldn't reach the gate." };
  }

  const body = (await response.json().catch(() => null)) as LoginResult | null;
  if (response.ok && body?.ok) {
    await createSession();
    return { ok: true };
  }
  // A 404 here means the shared key didn't match, not that anything is
  // missing — the Worker answers a bad key with a 404 on purpose.
  if (response.status === 404) return { ok: false, error: "Login is misconfigured." };
  return body && !body.ok ? body : { ok: false, error: "That didn't work." };
}

export async function logout(): Promise<void> {
  await clearSession();
}

/** For the login page, so it can offer sign-out instead of a password box. */
export async function isSignedIn(): Promise<boolean> {
  return hasSession();
}
