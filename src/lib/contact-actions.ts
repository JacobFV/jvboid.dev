"use server";

// Contact details live in env and reach the browser only through these
// actions — when someone actually opens the call or message sheet — never
// in a page's HTML or its client bundle. There is no human check in front
// of them any more: the math captcha cost more real messages than it
// stopped bots.

export type CallResult = { ok: true; phone: string } | { ok: false; error: string };

export async function getCallNumber(): Promise<CallResult> {
  const phone = process.env.CONTACT_PHONE;
  if (!phone) return { ok: false, error: "Phone number is not configured." };
  return { ok: true, phone };
}

export type ContactResult =
  | { ok: true; phone: string; email: string }
  | { ok: false; error: string };

/** Phone and email, for the message sheet's SMS and mail options. */
export async function getContact(): Promise<ContactResult> {
  const phone = process.env.CONTACT_PHONE;
  const email = process.env.CONTACT_EMAIL;
  if (!phone || !email) return { ok: false, error: "Contact details are not configured." };
  return { ok: true, phone, email };
}
