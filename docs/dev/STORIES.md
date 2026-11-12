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
| `who` | `tam`, `bramble`, `pip`, `thistle`, `wick`, `quince` (callers); `angler` (the pier); a resident's id (`hollin`); `place` (said as you walk by `near` anchor ids within `r` cells, default 3); `traveller` (someone passing through, drawn at `near`, the quay by default, while their beat is ready); `catch` (comes up with a fish or bug); `post` (a letter: `from`, `sign`) |
| `when` | `after: 'story.beat'` (or a list), `days` (since those), `open: [zone numbers]`, `heart: n` (friendship with `who`, 0 to 4) or `{who: n}`, `season`, `tod`, `dry`, `rain`, `flag: {k: v}` (`true` means any value), `noflag: [k]`, `item`, `level`, `deep: 1` (full telling only), `home: 1` (only near their home), `fish: [ids]` (for `catch`), `test(m)` |
| `lines` | strings, or `{t, soft, flag, noflag}`. A `soft` of `''` leaves the line out of the gentle telling. `flag`/`noflag` show a line only with or without those flags: this is how one story colours another |
| `choice` | `[{k, label, t, set, mood: {who: n}}]`. What you can say. No choice is right, and none pays: `mood` may cool or warm a friendship, nothing more |
| `set` | flags set when heard |
| `give` | `{item: n}`, given once |
| `heavy` | `1` for disclosures. The care note shows once before the first one ever; a quiet "If this brings anything up" button sits beside each; at most one heavy beat a day. Use `home: 1` with it |
| `sit` | what happens if you choose "Sit for a while" |
| `free` | `1`: the beat doesn't wait for the one before it (clues, places) |
| `care` | `1`: show the care note here, once, if it hasn't been shown (a beat that leads up to a heavy one) |
| `give` | `{item: n}`, once: `honey`, `fertiliser`, `seed` (one of the season), `seed:<plant>`, `decor:<id>` (a catalogue id; one it doesn't have yet becomes a keepsake), `keep:<id>` (a keepsake, `wdTaleKeep({id, name, text})`), `recipe:<id>` (a craft recipe if there is one, else a story recipe, `wdTaleRecipe({id, name, from, text})`). Keepsakes and story recipes are listed on Keepsakes > Stories |
| `name` | for a `place` beat with `choice` or `sit`: who is there (it opens as a conversation; without them it is noticed in passing). For a `traveller`: who they are, with `look: {kind, fur, coat, hat, hatc}` |
| `when.weekday` | `[0-6]`, 0 is Sunday. `when.fog: 1`: the live weather's fog or mist, or a damp or cold dawn until the vale draws fog (`wdTaleFog`) |

**Rules.** A story's beats come in order, one a day (free beats aside). Speakers rank main line, then arcs, then small stories. The main line's next teller comes as that day's caller and waits at home.

**Residents** (`wdTaleResident({id, name, art, home: {region, near}, day: [...], here(m)})`) are found at home and never call. Hollin is the first.

**Saved** in `garden.wd`, per player, and never put in the friends snapshot:
- `sx.<story>.<beat>`: the day it was heard
- `sf.<flag>`: flags
- `sc.<story>.<beat>`: the choice made
- `cn`: the care note has been shown
- `hv`: the day of the last heavy beat
- `sg.<story>.<beat>`: its gift was given; `kp.<id>`: keepsakes; `rp.<id>`: story recipes

**Anchors** are named, never placed: `WD_TALE_ANCHORS` in the engine keys each one the stories use to its landmark's name and a list of fallbacks. The layout may add the id or a landmark with that name; until it does, the fallback stands in, so no story waits on the layout.

**Pacing** (engine, not data): at most one heavy beat a day; never on a day the main line moved; and once a heavy beat has been heard, nothing else from the stories comes that day (ordinary life after: the day's lines, chores and fishing go on).

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
| `94-garden-wonder-1tales2-*.js` | files that load after the main line and may add beats to it: `-thistle` ("The old house"), `-quince` ("Telling the bees"), `-woods` (Hollin's "What the woods keep", Quince's "The woods back", the woodcutter's surface story, and the mill supper and toast), `-v` (forty small `v-` stories) and `-w` (fifteen more, for the orchard and Cloudbreak). Drafts: `C:/tmp/stories/*.md` |

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

## Decisions (stories-2, 12 Nov 2026)

- **Place beats** may have `choice` and `sit` after all: they open as a conversation (Thistle at the old house's gate, Quince at the arch, the folly, the beacon log). A place with only lines is still noticed in passing.
- **The cider fair** is the last Saturday of the first month of autumn (`_wqFairDate`: September in the north, March in the south). The poster is up from the first of the month before until the fair, so Quince's opening-up waits for that window and the bell for the fair itself, a year later if need be ("Next year. I say that every year").
- **The mill seat** takes `yes`, `no` or `apart` (`pass` is gone). Thistle's supper lines follow `mill.seat`; `hollin.seat` is not used.
- **Gentle telling**: Quince's ending is `quince.tree-g`, a free beat in her own arc (the `quince-echo` story it lived in was dropped). Day lines with `soft: ''` are left out of the pool, not shown empty.
- **Hollin**: he always goes, ten days after the harvest supper (no staying ending: it would read as the reward for a kind playthrough). `stall2`, `notvote` and `rope` are free beats, so a player who never asks Quince, or never has the rope, isn't stuck. `wrong` sets `hollin.wrong` and shows the care note first if it hasn't been. Quince plants the quince by the brook only after her own walk through the arch (`quince.far`).
- **Duplicates removed**: Quince's apple race and arch walk are told once, in her own arc (`quince-woods.apples` and `.walk` are filtered out).
- **Thursdays**: the angler's "nets" beat comes on a Thursday (`weekday: 4`).
- **Rewards**: the carved wren, the first carving, the netting needle, the jam, the teacup, the toffee apple, Fen's bottles, Pip's hat, the weather letters, the corn dolly, the pear tags and the coast map are keepsakes; Quince's mother's cider, Thistle's nothing soup and Marigold's leek soup are story recipes.
- **Lore from the vignettes** (23, the knitter's jumpers; 39, "T. to tea") is kept: both sit with the bible's facts and add no new event.
- **Fifteen more small stories** (`94-garden-wonder-1tales2-w.js`), eight in the high orchard and seven on Cloudbreak, all light and `keep`.

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
2. **Rewards:** done as keepsakes and story recipes. Still to come: real decor art for the teacup and the carved wren, and the quince tree as a world prop once `quince.tree` or `quince-woods.brook` is set.
3. **The Journal** (`C:/tmp/journal/JOURNAL.md`): the Stories tab under Keepsakes is a first version and should become the Field Journal's story pages.
4. **Small stories for the orchard and Cloudbreak:** fifteen added (`-w`). More are welcome, especially in winter on Cloudbreak.
5. **Hollin's figure** (painted figures). He uses the folk's default art for now.
6. **Beats waiting on systems that don't exist yet:**
   - the harvest supper as a world event
   - the market stall
   - the walk with Thistle to the old house (a follow-me path)
   - the bell at the fair
