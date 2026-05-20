"use server";

import crypto from "node:crypto";

// Why a dedicated secret: bots scraping the homepage shouldn't be able to
// forge a "captcha passed" claim. Tokens are HMAC-signed so they can't be
// crafted client-side.
const SECRET = process.env.PHONE_REVEAL_SECRET || "dev-only-rotate-me";

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export type Challenge = { prompt: string; token: string };

/** Issue a fresh math challenge. Token encodes (answer, expiry) HMAC-signed. */
export async function newCallChallenge(): Promise<Challenge> {
  const a = 2 + Math.floor(Math.random() * 8); // 2..9
  const b = 2 + Math.floor(Math.random() * 8); // 2..9
  const answer = a + b;
  const expiresAt = Date.now() + 5 * 60_000; // 5 min
  const payload = `${answer}.${expiresAt}`;
  return { prompt: `Quick check — what is ${a} + ${b}?`, token: `${payload}.${sign(payload)}` };
}

export type RevealResult = { ok: true; phone: string } | { ok: false; error: string };

/**
 * Verify the captcha answer + token and return the phone from env. The
 * phone is never sent to the client until this passes.
 */
export async function revealCallNumber(token: string, answer: string): Promise<RevealResult> {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, error: "Bad token" };
  const [answerStr, expStr, sig] = parts;

  const expected = sign(`${answerStr}.${expStr}`);
  if (sig.length !== expected.length) return { ok: false, error: "Bad token" };
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return { ok: false, error: "Bad token" };
  }

  if (Number(expStr) < Date.now()) return { ok: false, error: "Expired — try again." };
  if (answer.trim() !== answerStr) return { ok: false, error: "Hmm, not quite." };

  const phone = process.env.CONTACT_PHONE;
  if (!phone) return { ok: false, error: "Phone number is not configured." };
  return { ok: true, phone };
}

export type ContactResult =
  | { ok: true; phone: string; email: string }
  | { ok: false; error: string };

/** Same captcha gate as revealCallNumber, but returns phone + email so
 * the TextSheet can offer SMS or mailto fallbacks. */
export async function revealContact(token: string, answer: string): Promise<ContactResult> {
  const verified = await revealCallNumber(token, answer);
  if (!verified.ok) return verified;
  const email = process.env.CONTACT_EMAIL;
  if (!email) return { ok: false, error: "Contact email is not configured." };
  return { ok: true, phone: verified.phone, email };
}
