# Roadmap

OpenDash is local-first, and that stays the default: your data lives in one
folder on your own computer and nothing leaves it unless you switch something
on. Everything below that involves the cloud, accounts or other devices is
**optional, opt-in and end-to-end encrypted**, and can be self-hosted.

This is a plan, not a promise. Dates are not fixed, and the order may change
based on feedback. Ideas and votes are welcome in
[Discussions](https://github.com/mahdi1190/opendash/discussions) (Ideas
category).

## v2.1: "Do more from Home" (in progress)

- **Calendar that works like Google Calendar.** Drag to move, drag edges to
  resize, click-and-drag to create, edit events in place, RSVP, with Undo and a
  confirmation before anything emails other guests.
- **One-click recommendations.** Cards like "Free 14:45–18:00: block time for
  your top task" open the normal editor already filled in. Adjust it and save,
  or apply it as-is.
- **16 new Home widgets.** Quick capture, Fill the gap, Plan my day, Meeting
  prep, After meetings, Invites & clashes, Needs reply, I owe, Catch up,
  Deadline runway, Smart lists, Habits, Launchpad, Payday & safe to spend,
  Daily note, What changed.
- **The morning brief as a Home panel**, with the story playing inside it.
- **Money story.** A month-in-money recap you can play and listen to.
- **Travel & time zones.** One correct clock everywhere, opt-in travel
  detection, arrival and "welcome home" moments, a second clock, meetings in
  both zones, trips with spending by currency, and public holidays.
- **People, rebuilt.** A full person card, profile and cover pictures, and
  clear tools to find people in email and link them to tasks.
- **Animations everywhere.** A short opening animation, an intensity setting
  (Off / Subtle / Standard / Playful), list and page transitions, celebrations
  that vary by what you finished, and weather on Home.

## v2.2: "Alive", the animation update

- **An animation library** behind everything animated: openings,
  celebrations, story transitions, event scenes, symbols, weather and page
  transitions.
  - A gallery to preview, favourite and block animations.
  - A new look every day.
  - Visual themes (Calm, Playful, Cinematic, Retro pixel, Hand-drawn, Paper
    cut-out, Neon night).
- **Something new every day:** seasonal and festival animations, real
  sunrise and sunset skies, moon phases, and your birthday.
- **The UK pack:** animations for every UK county, drawn from its landmarks,
  landscape, traditions, food and heritage. It recognises the county you are
  in (opt-in, offline) and welcomes you when you cross into a new one.
- **Moments across the app:** themed story skins, completion styles per
  stream, streak flames, event scenes on the calendar, payday and budget
  moments in Finances, a living Home background, and focus sessions that grow
  a scene.
- **Achievements and "Year in OpenDash":** milestones that unlock themes, and
  an animated year (and month) in review, exported only if you choose.
- **Later in 2.2:** a world pack tied to travel, "make your own" animations
  drawn by the assistant, and optional soundscapes.
- **Also:** more widgets, imports (Todoist, Google Tasks, Microsoft To Do,
  Notion), more languages, and battery-saver motion.

## v3.0: "OpenDash Everywhere" (planned)

The big one: use OpenDash on your phone and across devices, without giving
up privacy.

- **Phone app.** First as an installable web app (PWA) with offline support,
  then native iOS and Android apps built from the same code. Quick capture,
  Today, the brief and notifications on your phone.
- **Sync between your devices.** Desktop ↔ phone ↔ laptop, offline-first,
  with conflict-free merging (CRDT-based). End-to-end encrypted, so the sync
  server only ever sees ciphertext.
- **Choose where sync lives.**
  - Self-host a small sync server: a single Docker image or a Node script.
  - Use your own storage: OneDrive, Google Drive, Dropbox or S3, encrypted
    before upload.
  - Or an optional hosted OpenDash Cloud (if there is demand), using the same
    encryption.
- **Accounts and locking.**
  - App lock with passkeys or a password.
  - Encryption at rest for the data folder.
  - Per-device keys you can revoke, and recovery codes.
- **Optional cloud hosting.** Run OpenDash on your own server or a home NAS and
  reach it securely from anywhere: HTTPS, login, and rate limiting.
- **Push notifications** for reminders, meetings and the morning brief.

## Later / exploring

- Shared spaces: a household or small team sharing selected streams or
  calendars, with per-item permissions.
- A widget and plugin SDK, with a gallery of community widgets and themes.
- Any-MCP feeds: turn any MCP server into a Home widget or data source.
- More assistant skills (still propose-then-apply, never silent changes).
- Desktop app wrapper (tray icon, start at login, global quick-capture hotkey).
- Wearables: a glanceable "next up" and quick capture.
- A scene engine for animations, like 2D games: a shared library of detailed
  objects (trees, plants, animals, people, landmarks), scenes stored as small
  placement lists, and instanced rendering. Much smaller scenes, and easy
  variations (seasons, angles, weather). See
  [docs/dev/SCENE_ENGINE.md](dev/SCENE_ENGINE.md).

## Principles that will not change

1. **Local-first by default.** No account is needed to use OpenDash.
2. **You own the data.** Plain files, easy export, no lock-in.
3. **Privacy.** No telemetry and no ads. Cloud features are opt-in and
   end-to-end encrypted.
4. **Calm.** Features that reduce noise, not add to it.
