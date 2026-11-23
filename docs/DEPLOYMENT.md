# Deploying and distributing CHEMATRIX

The app is the `app/` folder: static files only. There is no server code and no database. Any web host that serves files over **HTTPS** works. HTTPS is required by browsers for installation and offline mode (except on `localhost`).

Always run this after changing any file, so users receive the update:

```bash
npm run build     # regenerates app/sw.js with a new cache version
```

## Option A: GitHub Pages (free)

1. Create a GitHub repository and push this project.
2. In the repository: Settings → Pages → "Deploy from a branch" is the simplest, but it serves the whole repository. Easier: use the `gh-pages` approach below, or move the contents of `app/` into a `docs/` folder of a separate repository and choose branch `main`, folder `/docs`.
3. Quick way with one command (needs Node):
   ```bash
   npx gh-pages -d app
   ```
   then in Settings → Pages select branch `gh-pages`.
4. Share the address, e.g. `https://<your-name>.github.io/<repo>/`. The app uses relative paths, so it works in a sub-folder.

## Option B: Netlify or Cloudflare Pages (free, drag-and-drop)

1. Run `npm run build`.
2. Netlify: go to app.netlify.com → "Add new site" → "Deploy manually", drag the `app` folder onto the page. Cloudflare Pages: "Upload assets" and select the `app` folder.
3. You get an `https://…` address to share.

Recommended header for hosts that allow it (Netlify `_headers` file inside `app/`):

```
/sw.js
  Cache-Control: no-cache
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
```

## Option C: local hosting (classroom, no internet)

On the teacher's computer with Node installed:

```bash
npm run serve                     # http://localhost:8080 on this computer only
node tools/serve.mjs 8080 --lan   # also reachable from phones on the same Wi-Fi
```

Limitation: phones reach the computer through a plain `http://192.168.x.x` address. Browsers allow installation and offline mode only over HTTPS, so over the LAN the app works only while the computer is reachable. For true offline use on phones, use Option A or B once; afterwards the phones need no internet.

Any other static server also works, e.g. `python3 -m http.server 8080` from inside `app/`.

## Option D: downloadable package

The project ZIP (source, docs, tests, ready-to-host `app/` folder) can be shared with instructors. To run it they need either a static host (A–C) or simply Node: unzip, open a terminal in the folder, run `npm run serve` (the dev tools in `npm install` are only needed for tests).

## Native app (optional, not needed)

If a store-installable Android APK is ever required, the `app/` folder can be wrapped with Capacitor (`npx cap init`, `npx cap add android`) without code changes. This is not needed for the current requirements, because PWA installation covers Android, iOS and desktop.

## Updating a deployed version

1. Change the version in `app/js/ui/version.js` (e.g. 1.0.1).
2. `npm test && npm run build`.
3. Upload `app/` again. Installed apps download the update in the background next time they are online and show "An update is ready → Reload". Nothing changes until the user taps Reload, so a calculation in progress is never interrupted. If the download is interrupted, the old version keeps working.
