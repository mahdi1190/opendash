# Garden UX diagnosis (2.18.0 -> 2.18.1)

Owner, after trying 2.18: "really confusing, hard to use, screen is small, needs the entire screen, more intuitive,
explained better, more fun, the economy is weird, things a bit more expensive, money from time on tasks."
Walk-through as a first-time player (Life > Garden), and what 2.18.1 does about each point.

| # | What confused | Where | Fix in 2.18.1 |
|---|---|---|---|
| 1 | The garden is a 2:1 picture inside a normal page: page title, subtitle, tabs, "Today" card, toolbar, side column and tray all compete, so the stage is about a third of the window | `.gd-page`, layout `page` | Layout `bare`: the stage fills the window; HUD on top, tools on the left, tray at the bottom, one right-hand panel that can be hidden |
| 2 | Three levels of control: a View / Tend / Decorate switch, then six tools that only exist in Tend, then a seed tray that only exists once Plant is picked | `_gdpToolbar`, `_gdpTray` | One toolbar of big labelled tools (Plant, Water, Harvest, Fertilise, Trim, Dig, Decorate), the active one is obvious, the cursor changes, 1-7 keys; the seed tray is always under the stage |
| 3 | No goal: nothing says what to do first or next | whole page | A "What to do next" card with one suggested step and a pulsing ring on the thing to click |
| 4 | Hidden currencies: coins, water, fertiliser and XP appear as chips with long tips; "water of 14" is unexplained | `_gdpHead` | HUD chips each with a plain one-sentence tip; "Coins: earned by focusing on tasks" |
| 5 | Nobody can tell what earns coins (finishing tasks, focus, streak, quests, selling) or why a number changed | `gardenWallet` | "Today: 42 coins from 1h40 focused (cap 120)" panel plus an income log with a reason per line |
| 6 | Economy invites clicking: 4 coins per task of any size, so ticking tiny tasks pays | `_gdEarnDay` | Coins come from focus minutes and task time, with minimums, caps, once per task (see GARDEN.md section 6) |
| 7 | Jargon: "sweep", "cuttings", "overgrown", "ledger", "fertiliser", "Tend" | labels | Plain words on the toolbar and in hover text ("Water: pour on a thirsty plant") |
| 8 | Tiny hit areas: one cell is 48x30 units on a small picture, so clicks miss | stage scale | The stage scales to the window (cells are far bigger on a normal screen) and the hovered cell highlights with a preview of the action |
| 9 | No feedback: a click changes a plant with a quiet toast | actions | Floating "+2 XP", splash, darker soil, sparkle, harvest arcs into the basket, growth pop |
| 10 | Modal / card clutter: the welcome card, daily tasks, quests, visitors and inspector all stack | `_gdpGardenTab` | Right panel with tabs-free sections: Next step, Goals, Today's coins, the thing you selected; visitors become notifications |
| 11 | No explanation anywhere after the one welcome card | `_gdpWelcome` | A skippable 6-step tour (replay from the ? button) and a Garden guide panel |
| 12 | Shop prices felt cheap and flat | catalogue | Prices about 2-3x with a smooth early curve |
| 13 | A friend's garden is a different layout | `94-garden-social-2visit.js` | Visit page uses the same stage and HUD style, read-only tools |
