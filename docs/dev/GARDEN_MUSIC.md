# The garden's music

The garden plays the owner's own songs, made with Suno, from `assets/music/`. They are not under the
code's MIT licence (`assets/music/README.md`). The player is the music part of
`src/app/94-garden-0sound.js`. The server lists and streams the folder in `server/routes/garden-music.mjs`.

## Adding a song

1. Name the file `<slot>-<n>.mp3`, or `<slot>-<season>-<n>.mp3` for a song that belongs to one season.
   - slot: `dawn` (05-08), `morning` (08-12), `afternoon` (12-17), `evening` (17-20), `night` (20-24), `late` (00-05)
   - season: `spring`, `summer`, `autumn`, `winter`
   - n: any number not used yet for that slot (and season)

   Examples: `morning-3.mp3`, `night-winter-1.mp3`, `late-1.mp3`. `.ogg` and `.m4a` work too.
2. Strip the file's tags. A Suno download carries the account name, the song's link and a comment in its
   ID3 tag, and `tools/privacy-scan.mjs` fails on any MP3 that still has one. One line of Node does it:
   `node -e "const f=process.argv[1],b=require('fs').readFileSync(f);if(b.toString('latin1',0,3)==='ID3'){const n=((b[6]&127)<<21)|((b[7]&127)<<14)|((b[8]&127)<<7)|(b[9]&127);require('fs').writeFileSync(f,b.subarray(10+n+((b[5]&16)?10:0)))}" assets/music/morning-3.mp3`
3. Drop it into `assets/music/`. The garden picks it up the next time music starts. You don't need to
   rebuild, and the release packs the whole folder.
4. Level it (optional, but best). In the app, open the garden and run
   `await gardenMusicLoudness('morning-3.mp3')` in the browser console. It returns the file's loudness
   (LUFS) and a `db` trim. Add that trim to `assets/music/levels.json` as `"morning-3.mp3": <db>`.
   A file that isn't listed there plays at `GSM.dbDefault`, about the level of the others.
5. Add a line to the table in `assets/music/README.md`.

## How it picks

- The slot comes from the garden's own clock: your clock (the app's `Clock`, so travel zones count),
  or a friend's when you visit their garden.
- Files for the current season win. If the slot has none, its plain files play. If the slot has no
  files at all, it borrows from another slot: `late` borrows `night`.
- Everyone hears the same thing: the slot's songs play on one shared timeline worked out from the clock (rounds of a seeded
  shuffle, 4 s of quiet after each song, lengths from the server), so two players in a garden hear the same song at the same
  second with nothing sent between them, and someone arriving mid-song joins where the others are. A song more than 1.5 s
  off the timeline (a slow load, a resumed tab) is moved back onto it. Never the same song twice in a row. (A file whose length
  the server cannot read, such as .ogg or .m4a, makes that slot fall back to a shuffle of its own.)
- When a song ends, its last 4 s fade out, then 2.5 to 5 s of quiet, then the next song fades in over 4 s.
  When the slot changes, the old song fades out over 4 s and the new one comes in under it.
- It pauses (after a 1.2 s fade) in a music room, while the band plays, when the tab is hidden, when you
  leave the garden, or when *Music and nature sounds* is off. It picks up where it stopped if the slot
  is still the same.
- It never plays until the Sounds switch is on and someone has clicked or pressed a key. Nothing is fetched
  until music would play.
- The songs stream through a media element into the garden's Web Audio graph:
  song gain (fade x trim) -> tracks bus -> low-pass -> music bus -> master -> limiter.
  So rain muffles them (low-pass 1.4 kHz, x0.8), a room softens them (1.1 kHz, x0.6), snow a little
  (3.2 kHz), and the Volume slider applies.

## Checking

`gardenMusicState()` shows what is playing now: slot, file, position, gain, held. To check the clock,
use `Clock._setNow(ms)` and wait a second or two. The garden's sound log (`gardenSoundLog()`)
records each `music:<file>` start.
