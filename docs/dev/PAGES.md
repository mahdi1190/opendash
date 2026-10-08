# The project website (GitHub Pages)

The website lives in `site/`: one `index.html`, one `style.css`, the
screenshots it uses in `site/img/` and the Enable Banking return page
`site/eb-callback.html`. It is plain HTML and CSS, with no scripts, external
fonts or trackers.

`.github/workflows/pages.yml` publishes `site/` on every push to `main` that
changes something under `site/` (or by hand from the Actions tab).

## One-time setup

In the repository on GitHub: **Settings > Pages > Build and deployment >
Source: GitHub Actions**. Then run the *Pages* workflow once (Actions > Pages >
Run workflow), or push a change under `site/`. The site appears at
`https://mahdi1190.github.io/opendash/`.

## Updating

- Edit `site/index.html` or `site/style.css` and open the file in a browser to
  check it, in light and dark mode and at phone width.
- Screenshots: copy the light and dark versions from `docs/screenshots/` into
  `site/img/` (demo data only).
- `site/eb-callback.html` is a copy of `docs/eb-callback.html`; keep them the
  same.
