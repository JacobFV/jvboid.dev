// Where the ask bar's messages go: the Cloudflare Worker in
// workers/contact, which emails them — attachments included — through
// Email Routing. A public URL rather than a secret: the Worker checks the
// origin and rate-limits each sender itself.
export const CONTACT_SEND_URL =
  process.env.NEXT_PUBLIC_CONTACT_SEND_URL ?? "https://jvboid-contact.jacobfv123.workers.dev/send";
