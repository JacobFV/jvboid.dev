import { cookies } from "next/headers";

// The editor session. One user, one password, so the cookie carries no
// identity at all — only an expiry and a signature over it. If the signature
// checks out and the clock hasn't passed, you're Jacob.
//
// Two cookies, doing different jobs:
//
//   jv_session  HttpOnly, signed. The real thing. Re-verified on the server
//               before any source is read or any commit is made.
//   jv_editor   readable, value "1", same lifetime. UI only — it is how the
//               header knows to draw the pencil without making a request, which
//               is what keeps every page in the site statically rendered.
//
// Forging jv_editor buys you a pencil that fails the moment you press save.
// That is fine; it was never the fence.

const SESSION_COOKIE = "jv_session";
const EDITOR_COOKIE = "jv_editor";
const TTL_SECONDS = 30 * 24 * 60 * 60;
const VERSION = "v1";

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not configured.");
  return value;
}

const b64url = (bytes: ArrayBuffer) =>
  Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sign(expiry: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${VERSION}:${expiry}`),
  );
  return b64url(mac);
}

/** Constant-time string compare. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Sign in: mint both cookies. */
export async function createSession(): Promise<void> {
  const expiry = Date.now() + TTL_SECONDS * 1000;
  const jar = await cookies();
  const shared = {
    path: "/",
    maxAge: TTL_SECONDS,
    sameSite: "lax" as const,
    // Plain http on localhost would drop a Secure cookie and the whole thing
    // would look mysteriously broken in dev.
    secure: process.env.NODE_ENV === "production",
  };
  jar.set(SESSION_COOKIE, `${expiry}.${await sign(expiry)}`, { ...shared, httpOnly: true });
  jar.set(EDITOR_COOKIE, "1", { ...shared, httpOnly: false });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(EDITOR_COOKIE);
}

/** True when the request carries a valid, unexpired session. */
export async function hasSession(): Promise<boolean> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return false;
  const dot = raw.indexOf(".");
  if (dot < 1) return false;
  const expiry = Number(raw.slice(0, dot));
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  try {
    return same(raw.slice(dot + 1), await sign(expiry));
  } catch {
    // No SESSION_SECRET configured — nobody is signed in.
    return false;
  }
}

/** Throws unless the caller is signed in. The guard on every editor action. */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) throw new Error("Not signed in.");
}
