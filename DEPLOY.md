# Hosting Poker Night

**Live at <https://alecschmigelski.github.io/poker-night/>**

Hosted on GitHub Pages from this repo. `.github/workflows/deploy.yml` installs,
runs the tests, builds, and publishes on every push to `main` — so shipping is
just:

```
git push
```

If the tests fail, nothing deploys.

## How it is set up

- **Repo:** `AlecSchmigelski/poker-night`, public. Pages on the free tier requires
  a public repo. The app holds no secrets — every byte of data lives in the
  visitor's own browser.
- **Pages source:** GitHub Actions (`build_type: workflow`), HTTPS enforced.
- **No backend.** `npm run build` produces a `dist/` of static files. No server,
  no database, no environment variables.

## Why `base` is `'./'`

Pages serves this from the `/poker-night/` subpath, not a domain root. Every
asset reference in `index.html` and the web manifest is relative so the same
build works either way. **An absolute `/asset` path will 404 here** — if you add
one, it will look fine locally and break in production.

## HTTPS is not optional

Add to Home Screen, `navigator.share`, clipboard copy, and haptics are all gated
on a secure origin. Pages gives you HTTPS; a plain `http://` host would silently
drop half the app's behaviour.

## Checking a deploy

```
gh run list --limit 3
gh run watch <run-id> --exit-status
```

## Moving hosts later

Nothing here is GitHub-specific beyond the workflow. `netlify.toml` is committed
if you ever want Netlify instead — build `npm run build`, publish `dist`. Any
static host works, and the relative `base` means no rebuild is needed.

Deliberately **not** on Vercel: the only Vercel workspace available on this
account also holds `arkin-poc`, and this project is kept entirely separate from
that.

## After deploying

Open the app on your phone and **Add to Home Screen** — it runs fullscreen with
its own icon.

Spectator links are built from wherever the app is loaded, so they now carry the
public Pages URL and work for anyone you send them to.
