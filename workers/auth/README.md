# jvboid-auth

The gate behind `/login`. It knows the password, emails you about every attempt,
and disables itself after five failures in a day.

Deployed by hand, never by Vercel — same arrangement as `workers/contact`.

## One-time setup

1. **Create the KV namespace** (this is the kill switch's home):

   ```bash
   cd workers/auth
   npx wrangler kv namespace create SWITCH
   ```

   Paste the id it prints into `kv_namespaces[0].id` in `wrangler.jsonc`,
   replacing `REPLACE_WITH_KV_NAMESPACE_ID`, and commit that — the id is not a
   secret.

2. **Set the three secrets.**

   ```bash
   npx wrangler secret put TO_ADDRESS        # where the alerts go
   npx wrangler secret put PASSWORD_SHA256   # see below
   npx wrangler secret put SHARED_KEY        # see below
   ```

   `TO_ADDRESS` must be a verified Cloudflare Email Routing destination — the
   same one `workers/contact` already sends to will do.

   `PASSWORD_SHA256` is the sha256 of the login password, lowercase hex. The
   plaintext never leaves your machine:

   ```bash
   printf %s 'the password' | shasum -a 256 | cut -d' ' -f1
   ```

   `SHARED_KEY` is a random string shared with the site, and the only thing
   guarding this Worker from the open internet:

   ```bash
   openssl rand -hex 32
   ```

3. **Deploy.**

   ```bash
   npx wrangler deploy
   ```

4. **Tell the site about it.** In the Vercel dashboard set `AUTH_WORKER_URL` to
   the deployed Worker's origin (no path — the site appends `/attempt`) and
   `AUTH_SHARED_KEY` to the same value you put in `SHARED_KEY` above. The rest
   of the site's variables are listed in the root `CLAUDE.md`.

## After a lockout

Five wrong passwords in a UTC day and the Worker writes `login:enabled = off`,
which closes `/login` for everyone including you. Nothing on the site can undo
that; that is the point. To reopen it:

> Cloudflare dashboard → **Storage & Databases** → **KV** → the `SWITCH`
> namespace → set **`login:enabled`** to **`on`** (or just delete the key — a
> missing key counts as on).

The next successful sign-in clears the day's failure count on its own.

## Notes

- One global Durable Object holds the failure count, not one per IP: the budget
  of five belongs to the password, not to whoever is guessing at it.
- While the door is locked, further attempts are reported at most once an hour,
  so a bot can't fill your inbox with a lockout it can't get past anyway.
- A wrong `X-Auth-Key` gets a 404, not a 403 — which means a key mismatch and a
  stranger probing the URL look identical in the logs. Worth remembering if
  login ever starts failing right after a redeploy.
