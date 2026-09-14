# Turning the login on

The code for `/login` and the in-browser editor is written and committed, but
**nothing works until the steps below are done.** None of them can be done from
the repo — they are all dashboard and secret work on your accounts.

Written 2026-09-14, after the three commits that added the feature.

---

## 0. Push the commits

They were committed locally but **not pushed** — the stored GitHub token had
expired (`gh auth status` reported "The token in default is invalid"), and there
is no credential helper configured on this machine.

```bash
gh auth login -h github.com     # needs a browser, so not over plain ssh
git push origin main
```

Three commits to go out:

```
14a27f6  add the auth worker behind the login gate
04a78af  add the hidden /login page and its session
0c3cb7d  edit an entry from its own page and commit it
```

Nothing else is live until these land, since Vercel builds from `main`.

---

## 1. Cloudflare — the auth Worker

Full detail in [workers/auth/README.md](../workers/auth/README.md). The short
version:

```bash
cd workers/auth
npx wrangler kv namespace create SWITCH
```

Paste the id it prints into `kv_namespaces[0].id` in `workers/auth/wrangler.jsonc`,
replacing the literal `REPLACE_WITH_KV_NAMESPACE_ID` — **it will not deploy until
you do**, and the id is not a secret, so commit it.

Then three secrets:

```bash
npx wrangler secret put TO_ADDRESS        # a verified Email Routing destination
npx wrangler secret put PASSWORD_SHA256   # printf %s 'the password' | shasum -a 256 | cut -d' ' -f1
npx wrangler secret put SHARED_KEY        # openssl rand -hex 32 — keep this, step 2 needs it
npx wrangler deploy
```

`TO_ADDRESS` can be the same address `workers/contact` already sends to.

---

## 2. Vercel — six environment variables

| Name | What it is |
| --- | --- |
| `SESSION_SECRET` | Signs the session cookie. `openssl rand -hex 32`. |
| `AUTH_WORKER_URL` | The deployed Worker's origin, **no path** — the site appends `/attempt`. |
| `AUTH_SHARED_KEY` | The exact value you put in the Worker's `SHARED_KEY`. |
| `GITHUB_TOKEN` | Fine-grained PAT on this repo, **Contents: read and write**. This is what commits your edits. |
| `GITHUB_REPO` | Optional; defaults to `JacobFV/jvboid.dev`. |
| `GITHUB_BRANCH` | Optional; defaults to `main`. |

Redeploy after adding them.

If `AUTH_SHARED_KEY` and the Worker's `SHARED_KEY` ever drift, login fails with
"Login is misconfigured." The Worker answers a bad key with a **404 on purpose**,
so in its logs a key mismatch and a stranger probing the URL look identical.
Worth remembering when debugging.

---

## 3. Check it

1. `/login` with the wrong password → an email arrives, the count climbs. Five in
   a UTC day and login disables itself; the sixth attempt is refused outright.
2. Right password → an email arrives, you land on `/`, and a ✎ appears beside the
   ☾/☀ in the header.
3. Open a project, a post and a bio chapter. The ✎ should show the **body only,
   no frontmatter**. Edit, save, and check the commit on `main`: frontmatter
   intact, body changed. The page itself won't update until Vercel finishes
   rebuilding — the header says so.
4. Sign out → the pencil goes.

Two things only a browser can tell you, since `tsc` can't: how the pencil sits
next to the moon at both desktop and phone widths, and whether the textarea's
`min-h-[60vh]` feels right on a long project body.

---

## If you get locked out

Five wrong passwords in a UTC day and the Worker sets `login:enabled` to `off`,
which closes the door on you too. That is deliberate — nothing on the site can
undo it. Reopen it by hand:

> Cloudflare dashboard → **Storage & Databases** → **KV** → the `SWITCH`
> namespace → set **`login:enabled`** to **`on`** (or delete the key; a missing
> key counts as on).

The next successful sign-in clears the day's failure count by itself.
