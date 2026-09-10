// jvboid-contact: the site's "Ask me anything" message, delivered by email.
//
// The browser POSTs the message, an optional reply address and any
// attachments to /send. The Worker checks the origin and the sizes, then
// hands the message to a Durable Object — one per sender IP — which keeps
// that sender's recent sends in its own storage, enforces the rate limit
// against them, and sends the email through Cloudflare Email Routing's
// `send_email` binding: from contact@jvboid.dev to TO_ADDRESS, a verified
// destination. No third-party mail service, no API key.
//
// The rate limit is the only abuse guard now that the site's captcha is
// gone, which is why it lives in a Durable Object: per-IP state that is
// consistent across every edge location, rather than a best-effort count.
//
// Not type-checked by the site's tsc (see tsconfig `exclude`); wrangler
// bundles it with esbuild on deploy.

import { DurableObject } from "cloudflare:workers";
import { EmailMessage } from "cloudflare:email";

type Env = {
  SEND_EMAIL: { send(message: EmailMessage): Promise<void> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  OUTBOX: any;
  FROM_ADDRESS: string;
  TO_ADDRESS: string;
  ALLOWED_ORIGINS: string;
};

type Attachment = { name: string; type: string; data: ArrayBuffer };
type Outgoing = { message: string; reply: string; files: Attachment[]; origin: string };
type Result = { ok: true } | { ok: false; status: number; error: string };

const MAX_MESSAGE = 10_000;
const MAX_REPLY = 200;
const MAX_FILES = 8;
// Base64 grows attachments by a third, and Email Routing takes messages up
// to 25 MiB — 15 MB of files stays safely under it.
const MAX_BYTES = 15 * 1024 * 1024;
const HOUR = 60 * 60 * 1000;
const LIMITS = [
  { windowMs: HOUR, max: 6 },
  { windowMs: 24 * HOUR, max: 20 },
];

export class ContactOutbox extends DurableObject<Env> {
  async send(out: Outgoing): Promise<Result> {
    const now = Date.now();
    const recent = ((await this.ctx.storage.get<number[]>("sent")) ?? []).filter(
      (t) => now - t < 24 * HOUR,
    );
    for (const { windowMs, max } of LIMITS) {
      if (recent.filter((t) => now - t < windowMs).length >= max) {
        return { ok: false, status: 429, error: "Too many messages from here — try again later." };
      }
    }
    const raw = buildMime(this.env, out);
    await this.env.SEND_EMAIL.send(new EmailMessage(this.env.FROM_ADDRESS, this.env.TO_ADDRESS, raw));
    recent.push(now);
    await this.ctx.storage.put("sent", recent);
    return { ok: true };
  }
}

// ---- MIME ------------------------------------------------------------------
// Hand-built rather than pulled from a library: one text part and some
// base64 attachments is all this ever sends. Every header value that came
// from the visitor has its line breaks stripped, so nothing they type can
// start a header of its own.

const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const wrap76 = (s: string) => s.replace(/.{1,76}/g, "$&\r\n");
const base64 = (bytes: ArrayBuffer | Uint8Array) => wrap76(Buffer.from(bytes as ArrayBuffer).toString("base64"));
const encodedWord = (s: string) => `=?UTF-8?B?${Buffer.from(s).toString("base64")}?=`;
const headerSafe = (s: string) => (/[^\x20-\x7e]/.test(s) ? encodedWord(s) : s);
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

function buildMime(env: Env, out: Outgoing): string {
  const boundary = `jvboid-${crypto.randomUUID()}`;
  const reply = oneLine(out.reply);
  const replyTo = EMAIL.test(reply) ? reply : "";
  const gist = oneLine(out.message).slice(0, 70) || `${out.files.length} attachment(s)`;
  const body = [
    out.message || "(no message — attachments only)",
    "",
    "—",
    reply ? `Reply to: ${reply}` : "No reply address given.",
    `Sent from ${out.origin}`,
  ].join("\n");

  const head = [
    `From: jvboid.dev <${env.FROM_ADDRESS}>`,
    `To: <${env.TO_ADDRESS}>`,
    ...(replyTo ? [`Reply-To: <${replyTo}>`] : []),
    `Subject: ${encodedWord(`From your site: ${gist}`)}`,
    `Message-ID: <${crypto.randomUUID()}@jvboid.dev>`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];
  const parts = [
    [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      base64(new TextEncoder().encode(body)),
    ].join("\r\n"),
    ...out.files.map((f) => {
      const name = headerSafe(oneLine(f.name).replace(/["\\]/g, "_") || "attachment");
      const type = /^[\w.+-]+\/[\w.+-]+$/.test(f.type) ? f.type : "application/octet-stream";
      return [
        `--${boundary}`,
        `Content-Type: ${type}; name="${name}"`,
        `Content-Disposition: attachment; filename="${name}"`,
        "Content-Transfer-Encoding: base64",
        "",
        base64(f.data),
      ].join("\r\n");
    }),
  ];
  return `${head.join("\r\n")}\r\n\r\n${parts.join("\r\n")}\r\n--${boundary}--\r\n`;
}

// ---- HTTP ------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST" || new URL(request.url).pathname !== "/send") {
      return json(404, { ok: false, error: "Not found." });
    }
    if (!allowed.includes(origin)) return json(403, { ok: false, error: "Not allowed from this origin." });

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json(400, { ok: false, error: "Couldn't read the message." });
    }
    const message = String(form.get("message") ?? "").slice(0, MAX_MESSAGE);
    const reply = String(form.get("reply") ?? "").slice(0, MAX_REPLY);
    const uploads = form.getAll("files").filter((f): f is File => typeof f !== "string");
    if (!message.trim() && uploads.length === 0) return json(400, { ok: false, error: "Nothing to send." });
    if (uploads.length > MAX_FILES) return json(413, { ok: false, error: `At most ${MAX_FILES} attachments.` });
    if (uploads.reduce((n, f) => n + f.size, 0) > MAX_BYTES) {
      return json(413, { ok: false, error: "Attachments are over 15 MB altogether." });
    }

    const files = await Promise.all(
      uploads.map(async (f) => ({ name: f.name, type: f.type, data: await f.arrayBuffer() })),
    );
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const outbox = env.OUTBOX.get(env.OUTBOX.idFromName(ip));
    try {
      const result: Result = await outbox.send({ message, reply, files, origin });
      return result.ok ? json(200, result) : json(result.status, result);
    } catch (err) {
      console.error("send failed", err);
      return json(502, { ok: false, error: "The message couldn't be sent." });
    }
  },
};
