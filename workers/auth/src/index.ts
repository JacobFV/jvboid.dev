// jvboid-auth: the gate behind /login.
//
// The site has exactly one user and one password, and this Worker is the only
// thing that knows it. The Next.js server action POSTs an attempt here with a
// shared key; the Worker checks the kill switch, checks the password, emails
// Jacob about the attempt either way, and counts the failures.
//
// Five failures in a UTC day and the Worker sets `login:enabled` to "off" in
// KV, which closes the door until Jacob opens it again by hand in the
// Cloudflare dashboard. That is deliberately not something the site can undo:
// the whole point of the switch is that it lives somewhere an attacker who is
// guessing at the password cannot reach.
//
// Why a Durable Object rather than KV for the count: KV is eventually
// consistent, and a budget of five needs to actually be five even when the
// attempts arrive at five different edge locations at once. One global
// instance, not one per IP — the budget belongs to the password, not to
// whoever is guessing at it.
//
// Not type-checked by the site's tsc (see tsconfig `exclude`); wrangler
// bundles it with esbuild on deploy.

import { DurableObject } from "cloudflare:workers";
import { EmailMessage } from "cloudflare:email";

type Env = {
  SEND_EMAIL: { send(message: EmailMessage): Promise<void> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  GATE: any;
  // Structurally, not via @cloudflare/workers-types: this directory carries
  // no tsconfig or deps of its own, and get/put is the whole of what we use.
  SWITCH: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
  FROM_ADDRESS: string;
  TO_ADDRESS: string;
  /** sha256 hex of the login password. See README.md for how to compute it. */
  PASSWORD_SHA256: string;
  /** Shared with the site's server action; the only thing guarding /attempt. */
  SHARED_KEY: string;
};

type Attempt = { password: string; ip: string; userAgent: string };
type Result = { ok: true } | { ok: false; error: string; locked?: boolean };

/** The KV key Jacob edits by hand to re-enable login. */
const SWITCH_KEY = "login:enabled";
const MAX_FAILURES = 5;
const HOUR = 60 * 60 * 1000;
/** While the door is locked, mail at most one "someone tried" an hour. */
const LOCKED_MAIL_INTERVAL = HOUR;

const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Constant-time compare of two hex digests of equal length. */
function sameDigest(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class LoginGate extends DurableObject<Env> {
  async attempt(a: Attempt): Promise<Result> {
    const now = Date.now();
    const today = utcDay(now);

    // 1. The switch. A missing key counts as on, so a freshly created
    //    namespace works without Jacob having to seed it first.
    const state = await this.env.SWITCH.get(SWITCH_KEY);
    if (state !== null && state.trim().toLowerCase() === "off") {
      await this.mailLocked(a, now);
      return {
        ok: false,
        locked: true,
        error: "Login is disabled. Turn it back on in Cloudflare.",
      };
    }

    // 2. Today's failures only; yesterday's are spent and gone.
    const stored = (await this.ctx.storage.get<{ day: string; times: number[] }>("failures")) ?? {
      day: today,
      times: [],
    };
    const failures = stored.day === today ? stored.times : [];

    // 3. The password itself. Compared as digests, in constant time, so
    //    neither the plaintext nor the shape of a near-miss is recoverable.
    const given = await sha256Hex(a.password);
    if (sameDigest(given, this.env.PASSWORD_SHA256.trim().toLowerCase())) {
      await this.ctx.storage.put("failures", { day: today, times: [] });
      await this.mail(
        "Signed in to jvboid.dev",
        ["Someone just signed in with the right password.", "", describe(a, now)].join("\n"),
      );
      return { ok: true };
    }

    // 4. A miss. Record it, and if it was the last one in the budget, shut
    //    the door and say so loudly.
    failures.push(now);
    await this.ctx.storage.put("failures", { day: today, times: failures });

    if (failures.length >= MAX_FAILURES) {
      await this.env.SWITCH.put(SWITCH_KEY, "off");
      await this.mail(
        `Login DISABLED on jvboid.dev — ${failures.length} failed attempts`,
        [
          `That was failure ${failures.length} of ${MAX_FAILURES} today, so login is now off.`,
          "",
          "To turn it back on:",
          "  Cloudflare dashboard → Storage & Databases → KV → the jvboid-auth",
          `  namespace → set "${SWITCH_KEY}" to "on" (or delete the key).`,
          "",
          "Nothing on the site can do this — that is the point.",
          "",
          describe(a, now),
        ].join("\n"),
      );
      return {
        ok: false,
        locked: true,
        error: "Too many failed attempts. Login is disabled.",
      };
    }

    await this.mail(
      `Failed login on jvboid.dev (${failures.length}/${MAX_FAILURES})`,
      [
        `Wrong password. ${MAX_FAILURES - failures.length} attempt(s) left today before`,
        "login disables itself.",
        "",
        describe(a, now),
      ].join("\n"),
    );
    return {
      ok: false,
      error: "That's not it.",
    };
  }

  /** Someone knocked while the door was already locked. Mail sparingly. */
  private async mailLocked(a: Attempt, now: number): Promise<void> {
    const last = (await this.ctx.storage.get<number>("lockedMailAt")) ?? 0;
    if (now - last < LOCKED_MAIL_INTERVAL) return;
    await this.ctx.storage.put("lockedMailAt", now);
    await this.mail(
      "Attempted login on jvboid.dev while disabled",
      [
        "Login is off, so this went nowhere. Reporting it once an hour at most",
        "so a bot can't fill your inbox.",
        "",
        describe(a, now),
      ].join("\n"),
    );
  }

  private async mail(subject: string, body: string): Promise<void> {
    try {
      const raw = buildMime(this.env, subject, body);
      await this.env.SEND_EMAIL.send(
        new EmailMessage(this.env.FROM_ADDRESS, this.env.TO_ADDRESS, raw),
      );
    } catch (err) {
      // A mail failure must never decide whether someone can log in — the
      // notification is a courtesy, the gate is the product.
      console.error("auth mail failed", err);
    }
  }
}

function describe(a: Attempt, now: number): string {
  return [
    `When: ${new Date(now).toUTCString()}`,
    `IP:   ${a.ip || "unknown"}`,
    `UA:   ${a.userAgent || "unknown"}`,
  ].join("\n");
}

// ---- MIME ------------------------------------------------------------------
// One text part, no attachments — the trimmed-down cousin of the contact
// Worker's builder. Nothing a visitor typed reaches a header, but the
// line-break strip stays anyway: it costs nothing and the rule is easier to
// keep than to remember the exception to.

const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const wrap76 = (s: string) => s.replace(/.{1,76}/g, "$&\r\n");
const encodedWord = (s: string) => `=?UTF-8?B?${Buffer.from(s).toString("base64")}?=`;

function buildMime(env: Env, subject: string, body: string): string {
  const head = [
    `From: jvboid.dev <${env.FROM_ADDRESS}>`,
    `To: <${env.TO_ADDRESS}>`,
    `Subject: ${encodedWord(oneLine(subject))}`,
    `Message-ID: <${crypto.randomUUID()}@jvboid.dev>`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];
  const encoded = wrap76(Buffer.from(new TextEncoder().encode(body)).toString("base64"));
  return `${head.join("\r\n")}\r\n\r\n${encoded}`;
}

// ---- HTTP ------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    const notFound = () => json(404, { ok: false, error: "Not found." });

    if (request.method !== "POST" || new URL(request.url).pathname !== "/attempt") {
      return notFound();
    }

    // A wrong key gets a 404, not a 403. There is no origin allowlist to hide
    // behind here, and an endpoint that admits it exists is an endpoint
    // someone will come back to.
    const key = request.headers.get("X-Auth-Key") ?? "";
    if (!env.SHARED_KEY || !sameDigest(await sha256Hex(key), await sha256Hex(env.SHARED_KEY))) {
      return notFound();
    }

    let payload: Partial<Attempt>;
    try {
      payload = (await request.json()) as Partial<Attempt>;
    } catch {
      return json(400, { ok: false, error: "Bad request." });
    }
    const password = String(payload.password ?? "").slice(0, 512);
    if (!password) return json(400, { ok: false, error: "No password given." });

    const attempt: Attempt = {
      password,
      ip: oneLine(String(payload.ip ?? "")).slice(0, 80),
      userAgent: oneLine(String(payload.userAgent ?? "")).slice(0, 300),
    };

    const gate = env.GATE.get(env.GATE.idFromName("global"));
    try {
      const result: Result = await gate.attempt(attempt);
      return json(result.ok ? 200 : 401, result);
    } catch (err) {
      console.error("attempt failed", err);
      return json(502, { ok: false, error: "The gate is unreachable." });
    }
  },
};
