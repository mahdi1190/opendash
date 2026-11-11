# Garden stories: how to add one

The vale's stories are plain data. The engine lives in `src/app/94-garden-wonder-1tale.js`, the stories in `src/app/94-garden-wonder-1tales.js`, and the folk (homes, daily lines, friendship, favours, gate hints) in `94-garden-wonder-1kin.js`. To add a story, add one `wdTaleAdd({...})` call. A later file works too: name it `94-garden-wonder-1tales-<topic>.js` so it sorts after the engine. Nothing else needs changing.

## The three kinds

| Kind | What it is | Opens by |
|---|---|---|
| `main` | The mill and the vale: the spine every player follows, through the gates and regions | regions opening (`open`), finds (`test`) |
| `arc` | One per major character, optional | friendship (`heart`) and curiosity (`after`, `home`) |
| `small` | A scene, or two or three, found anywhere: letters, places, catches, callers | anything; add them freely |

## A story

```js
wdTaleAdd({ id: 'jam', kind: 'small', title: 'The jam', journal: 'Who took Mother Thistle’s jam.', gentle: 'keep', steps: [
  { id: 'a', who: 'thistle', when: { heart: 1 }, lines: ['Somebody took my bramble jam off the sill…'] },
  { id: 'b', who: 'tam', when: { heart: 1, days: 1 }, lines: ['It was me…'],
    choice: [{ k: 'tell', label: 'I’ll tell her', set: { 'jam.told': 1 }, t: 'Right. Fine. Good.' }] },
] });
```

- `title` and `journal` appear on Keepsakes > Stories, where everything heard can be read again.
- `gentle`:
  - `skip` hides the whole story when "Darker turns in the story" is off (Settings > Garden world). Use it for every story about abuse, assault or a child's death.
  - `soft` and `keep` show the story, using each line's `soft` words where there are some.

## A beat (one step)

| Field | Meaning |
|---|---|
| `who` | `tam`, `bramble`, `pip`, `thistle`, `wick`, `quince` (callers); `angler` (the pier); a resident's id (`hollin`); `place` (said as you walk by `near` anchor ids within `r` cells, default 3); `catch` (comes up with a fish or bug); `post` (a letter: `from`, `sign`) |
| `when` | `after: 'story.beat'` (or a list), `days` (since those), `open: [zone numbers]`, `heart: n` (friendship with `who`, 0 to 4) or `{who: n}`, `season`, `tod`, `dry`, `rain`, `flag: {k: v}` (`true` means any value), `noflag: [k]`, `item`, `level`, `deep: 1` (full telling only), `home: 1` (only near their home), `fish: [ids]` (for `catch`), `test(m)` |
| `lines` | strings, or `{t, soft, flag, noflag}`. A `soft` of `''` leaves the line out of the gentle telling. `flag`/`noflag` show a line only with or without those flags: this is how one story colours another |
| `choice` | `[{k, label, t, set, mood: {who: n}}]`. What you can say. No choice is right, and none pays: `mood` may cool or warm a friendship, nothing more |
| `set` | flags set when heard |
| `give` | `{item: n}`, given once |
| `heavy` | `1` for disclosures. The care note shows once before the first one ever; a quiet "If this brings anything up" button sits beside each; at most one heavy beat a day. Use `home: 1` with it |
| `sit` | what happens if you choose "Sit for a while" |
| `free` | `1`: the beat doesn't wait for the one before it (clues, places) |

**Rules.** A story's beats come in order, one a day (free beats aside). Speakers rank main line, then arcs, then small stories. The main line's next teller comes as that day's caller and waits at home.

**Residents** (`wdTaleResident({id, name, art, home: {region, near}, day: [...], here(m)})`) are found at home and never call. Hollin is the first.

**Saved** in `garden.wd`, per player, and never put in the friends snapshot:
- `sx.<story>.<beat>`: the day it was heard
- `sf.<flag>`: flags
- `sc.<story>.<beat>`: the choice made
- `cn`: the care note has been shown
- `hv`: the day of the last heavy beat

## Writing rules

- Short, warm, plain lines, in each character's own voice (habits in the header of `94-garden-wonder-1kin.js`).
- No real people, places or cases. Nothing about the player's work or absence.
- Heavy pasts stay in the past and off screen. They are never a reward, a puzzle or a shock. Survivors are whole people, the blame belongs to whoever did the harm, and nobody is owed forgiveness.
- Gore belongs only to the mill mystery, and only implied.
- The story bible (themes, cast, acts, clue table, endings) is kept with the design notes outside the repo; ask for it before writing a main-line or arc beat.
