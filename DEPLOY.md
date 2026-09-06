# Hosting Poker Night

It is a static site — `npm run build` produces a `dist/` folder of plain files.
There is no server, no database, and no environment variables to set.

`base` is `'./'`, so the same build works at a domain root or on a project
subpath. You do not need to rebuild for a different host.

**HTTPS is not optional.** Add to Home Screen, the share sheet, clipboard copy,
and haptics are all gated on a secure origin. Every option below gives you HTTPS
for free. Plain `http://` will silently drop half the app's behaviour.

## Option 1 — Netlify Drop (fastest, no account to start)

```
npm run build
```

Then drag the `dist` folder onto <https://app.netlify.com/drop>. You get a URL in
about ten seconds. Claim it with a free account to keep it and rename it.

Re-deploying means dragging the new `dist` again.

## Option 2 — Vercel (best for repeat deploys)

```
npm run build
npx vercel --prod
```

First run asks you to log in and answer a couple of prompts. After that every
`npx vercel --prod` ships the current build. It auto-detects Vite.

## Option 3 — GitHub Pages (free, deploys on every push)

`.github/workflows/deploy.yml` is already set up: it installs, runs the tests,
builds, and publishes on every push to `main`.

```
gh repo create poker-night --private --source=. --push
```

Then in the repo, **Settings → Pages → Source → GitHub Actions**. The site lands
at `https://<you>.github.io/poker-night/`.

Note the repo is created private above. GitHub Pages on a private repo requires a
paid plan — use `--public` instead if you are on the free tier and are happy for
the source to be visible. The app holds no secrets; all data lives in the
browser.

## After deploying

Open the app on your phone and **Add to Home Screen** — it runs fullscreen with
its own icon.

The spectator link is built from wherever the app is loaded, so once it is on a
real domain the `localhost` warning in the share sheet disappears and the links
work for everyone.
