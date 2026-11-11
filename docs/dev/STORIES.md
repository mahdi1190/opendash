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

## Files

| File | What |
|---|---|
| `94-garden-wonder-1tale.js` | the engine; also `wdTaleDrop(id)` and `wdTaleBeat(storyId, beat, afterId)` |
| `94-garden-wonder-1tales.js` | the main line (the mill: Acts I to VII), things noticed, Pip's arc, ten small stories, and Hollin as a resident |
| `94-garden-wonder-1tales2-*.js` | files that load after the main line and may add beats to it: `-thistle` ("The old house"), `-quince` ("Telling the bees"), `-woods` (Hollin's "What the woods keep", Quince's "The woods back", the woodcutter's surface story, and the mill supper and toast), and `-v` (forty small `v-` stories). Drafts: `C:/tmp/stories/*.md` |

New story files go in as `94-garden-wonder-1tales2-<topic>.js`.

## Decisions (story lead, 11 Nov 2026)

- **Gentle telling.**
  - Thistle's and Quince's own arcs are `soft`: their everyday lives stay, and the heavy lines carry soft words with no abuse in them.
  - Hollin's arc and "The woods back" are `skip`.
  - The woodcutter's surface story (`woods`) is `keep`, so every player meets him.
- **Heavy moments.** At most one a day, never on a day the main line moved, and only at the person's home (`home: 1`). Thistle's are never told in winter, when she is under the leaves.
- **Place beats** are narration only: no choices and no sitting. When a place should lead to a conversation, it sets a flag, and a person's beat picks that up.
- **The angler's Hollin line** moved from `mill.truth` to the mill supper and toast after Act VII (`mill.supper`, `mill.toast`), as the woodsman draft proposed.
- **`hollin.seat` and `mill.seat`** take `yes`, `no` or `apart`, where `apart` is a stool at the edge, by the trees.
- **The cider fair** falls on the Saturdays of the last full week of September (`season` autumn, `weekday: 6`, helper `_wqFairDay` in `-quince`).
- **Does he stay?** There is no fixed good ending. He leaves ten days after the harvest supper. A later beat may let him stay only if Quince never objected (no `quince.no`) and the village made room (`hollin.seat` is `yes`), and even then it is uneasy, and Thistle still won't lay his place.
- **Fog** stands in as a damp or cold dawn (`fog: 1`) until the weather has fog.
- **Travellers** speak like places at the quay (`who: 'traveller'`) until they walk the arrival road.

## To do (for whoever continues)

1. **Anchors the layout must provide.** The vale's `static` / `placementAnchors` ids, with a fallback already listed after each one in the stories:
   - `ld-woodhut`: Hollin's hut, in the old woodland, off the ruins circuit
   - `ld-oldhouse`: Thistle's old house at the top of the woods. `ld-house` is the marsh summer house
   - `ld-ruined-arch`
   - `ld-falls-cave`
   - `ld-lamp-room`
   - `ld-mill-office`
   - `ld-hothouse`
   - `ld-terrace-bench`
   - `ld-lighthouse`
   - `ld-hull`

   Home and plaza ids (`great-oak-clearing`, `mill-yard`, `ruin-court`, `cider-square`, `summit-cairn`) come from `presentation.plazas`.
2. **Rewards the drafts propose but the engine can't give yet:** keepsakes (Fen's two bottles, the teacup), and recipes (Quince's cider cake, Thistle's nothing soup). Search the drafts for `reward (proposed)`.
3. **The Journal** (`C:/tmp/journal/JOURNAL.md`): the Stories tab under Keepsakes is a first version and should become the Field Journal's story pages.
4. **More small stories for the orchard (zone 4) and Cloudbreak (zone 5).** The forty `v-` stories lean to the village and the woods. Region notes are in `C:/tmp/regions/*.md`.
5. **Hollin's figure** (painted figures). He uses the folk's default art for now.
6. **Beats waiting on systems that don't exist yet:**
   - the harvest supper as a world event
   - the market stall
   - the walk with Thistle to the old house (a follow-me path)
   - the bell at the fair
