# Roadmap

Freeflo is local-first, and that stays the default: your data lives in one
folder on your own computer and nothing leaves it unless you switch something
on. Everything below that involves the cloud, accounts or other devices is
**optional, opt-in and end-to-end encrypted**, and can be self-hosted.

This is a plan, not a promise. Dates are not fixed, and the order may change
based on feedback. Ideas and votes are welcome in
[Discussions](https://github.com/mahdi1190/opendash/discussions) (Ideas
category). What has already shipped is in the [changelog](CHANGELOG.md).

## Already done

Much of the earlier plan has shipped. In short: the Google-Calendar-style
calendar, one-click suggestions and the extra Home widgets (2.2); the
animation library, the UK pack and moments across the app (2.2 onwards);
boards, timelines, the game, Locations, Memories and *Wrapped* (2.16);
encrypted sync between your own computers through a cloud folder, directly,
or through a relay you host yourself (2.15 to 2.17.1); Friends and shared
spaces (2.17); Life, the garden and pets (2.18); Expenses (2.18.1 and
2.19.6); and the one-click Windows installer (2.19.7).

## Next: the 500 achievements

- **500 new achievements**, meant to be earned, with the rewards that come
  with them (announced in 2.18 and still to come).

## Animation ideas still open

- **Later in the animation work:** "make your own" animations drawn by the
  assistant, and optional soundscapes.
- **Also:** imports from other task apps (Todoist, Google Tasks, Microsoft To
  Do, Notion), more languages, and battery-saver motion.

## v3.0: "Freeflo Everywhere" (planned)

Use Freeflo on your phone, without giving up privacy.

- **Phone app.** First as an installable web app (PWA) with offline support,
  then native iOS and Android apps built from the same code. Quick capture,
  Today, the brief and notifications on your phone, syncing with your
  computers in the same end-to-end encrypted way they already do.
- **Locking.**
  - App lock with passkeys or a password.
  - Encryption at rest for the data folder.
- **Optional self-hosting.** Run Freeflo on your own server or a home NAS and
  reach it securely from anywhere: HTTPS, login, and rate limiting.
- **Push notifications** for reminders, meetings and the morning brief.
- **A code-signed Windows installer**, so SmartScreen no longer warns.

## Later / exploring

- A widget and plugin SDK, with a gallery of community widgets and themes.
- Any-MCP feeds: turn any MCP server into a Home widget or data source.
- More assistant skills (still propose-then-apply, never silent changes).
- A tray icon and a global quick-capture hotkey.
- Wearables: a glanceable "next up" and quick capture.
- Growing up: load animation packs on demand, local secrets and real-sky coincidences in scenes, and gentle gamification: a
  scene passport, a field guide of spotted animals and a year in scenes. See
  [docs/dev/GROWTH_PLAN.md](dev/GROWTH_PLAN.md).

## Principles that will not change

1. **Local-first by default.** No account is needed to use Freeflo.
2. **You own the data.** Plain files, easy export, no lock-in.
3. **Privacy.** No telemetry, no ads and no Freeflo company server. Cloud
   features are opt-in, end-to-end encrypted, and run on infrastructure you
   (or a friend) control.
4. **Calm.** Features that reduce noise, not add to it.
