# Using Freeflo from your own Claude (MCP)

Freeflo ships its own [Model Context Protocol](https://modelcontextprotocol.io)
server, `mcp/server.mjs`. Register it once and Claude Code, T3 Code or Claude
Desktop can read and change your tasks, people, tags, countdowns and more,
**without being told anything about Freeflo first**: the server explains
itself to the model. Every change appears in the open Freeflo page at once,
with Undo.

- [Register it](#register-it)
- [Permissions](#permissions)
- [Try it](#try-it)
- [Tools](#tools)
- [Prompts and resources](#prompts-and-resources)
- [Safety rails](#safety-rails)
- [Safety tiers](#safety-tiers)
- [Modes and transport](#modes-and-transport)
- [Scripts and the HTTP API](#scripts-and-the-http-api)
- [Troubleshooting](#troubleshooting)

## Register it

The easiest way: **Connections > Freeflo MCP > Set up** shows the exact
commands for your computer, with copy buttons, and *Test MCP* checks that the
server answers. You can also print them in a terminal from the app folder:

```sh
node mcp/server.mjs --print-install
```

They look like this (your paths will differ; the quotes keep paths with spaces
working).

### Claude Code and T3 Code

One install covers both (they share Claude Code's user scope). Run it once in a
terminal:

| Shell | Command |
|---|---|
| PowerShell | `claude mcp add --scope user opendash '--' node "C:\path\to\OpenDash\mcp\server.mjs" --data-dir "C:\path\to\OpenDash\data"` |
| cmd.exe | `claude mcp add --scope user opendash -- node "C:\path\to\OpenDash\mcp\server.mjs" --data-dir "C:\path\to\OpenDash\data"` |
| macOS / Linux | `claude mcp add --scope user opendash -- node '/path/to/opendash/mcp/server.mjs' --data-dir '/path/to/opendash/data'` |

In PowerShell the `--` must be quoted, because PowerShell drops a bare `--`
before it reaches `claude`. Check with `claude mcp list`; remove with
`claude mcp remove --scope user opendash`. Restart open Claude sessions
afterwards.

> **Already installed under the name `dashboard`?** Keep it. Installs made
> before the Freeflo name use `dashboard`, and their tools are called
> `mcp__dashboard__...`. Everything works the same; only the prefix in your
> permission rules differs. Freeflo recognises its own server by path, not by
> name.

The **Set up** panel and `node mcp/server.mjs --print-install` print the name
`dashboard`, the name existing installs use. Either name works: the name is
only a label in your Claude configuration. If you keep `dashboard`, use
`mcp__dashboard__` instead of `mcp__opendash__` in the permission rules below.

### Claude Desktop

Add the server to `claude_desktop_config.json`, keeping any other servers, then
restart Claude Desktop:

| System | File |
|---|---|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "opendash": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["C:\\path\\to\\OpenDash\\mcp\\server.mjs", "--data-dir", "C:\\path\\to\\OpenDash\\data"]
    }
  }
}
```

Use the full path to `node` (Claude Desktop does not always see your shell's
`PATH`); the Set up panel fills it in for you.

### Other MCP clients

Any client that can start a stdio MCP server works: the command is `node`, the
arguments are the path to `mcp/server.mjs`, then `--data-dir` and the path to
your data folder.

## Permissions

Claude Code asks before it uses a tool unless your settings allow it. The Set
up panel offers two blocks for the `"permissions"` section of
`~/.claude/settings.json`; pick one:

- **Read freely, ask before every change** (recommended):

  ```json
  {
    "allow": [
      "mcp__opendash__get_context", "mcp__opendash__describe_operations",
      "mcp__opendash__list_tasks", "mcp__opendash__get_task", "mcp__opendash__search_tasks",
      "mcp__opendash__list_history", "mcp__opendash__get_proposal",
      "mcp__opendash__list_people", "mcp__opendash__get_person", "mcp__opendash__list_link_suggestions",
      "mcp__opendash__list_tags", "mcp__opendash__list_countdowns",
      "mcp__opendash__get_home_focus", "mcp__opendash__get_home_layout",
      "mcp__opendash__list_calendar", "mcp__opendash__list_inbox", "mcp__opendash__get_finance_summary",
      "mcp__opendash__list_resources", "mcp__opendash__get_suggested_links", "mcp__opendash__get_related",
      "mcp__opendash__get_brief", "mcp__opendash__list_reviews", "mcp__opendash__get_daynotes"
    ],
    "ask": ["mcp__opendash__*"]
  }
  ```

- **Never ask**: `{"allow": ["mcp__opendash__*"]}`. Every change can still be
  undone.

The panel's version is generated from the server's own tool list, so prefer it
when the two differ.

## Try it

Ask Claude, for example:

- "What is due this week in Freeflo?"
- "Add a task to email Sam on Thursday, high priority."
- "Push every Acme task due next week back two days; preview first."
- "Plan my day."

## Tools

120 tools in the default (full) mode: 34 that only read and 86 that change
something. *Test MCP* in Connections starts the server in
[propose mode](#modes-and-transport) so the test cannot change tasks or send
anything. The server you register runs in full mode. `describe_operations`
returns every operation with its exact JSON Schema and its
[tier](#safety-tiers).

### Read

| Area | Tools |
|---|---|
| Start here | `get_context` (today's date in your time zone, the next 14 days, streams, people, tags, counts), `describe_operations` |
| Tasks | `list_tasks`, `get_task`, `search_tasks`, `list_history`, `get_proposal` |
| People and tags | `list_people`, `get_person`, `list_link_suggestions`, `list_tags` |
| Home and top bar | `list_countdowns`, `get_home_focus`, `get_home_layout` |
| Calendar, email, money | `list_calendar`, `list_inbox`, `get_finance_summary` (totals only, never single transactions) |
| Files & links | `list_resources`, `get_suggested_links`, `get_related` |
| Brief and reviews | `get_brief`, `list_reviews` |
| Daily note | `get_daynotes` (one day, a range or a search; not offered to the in-app assistant) |
| Garden | `get_garden` (overview with ids, bag, shop, quests) |
| You | `get_profile` (card and status, avatar options, outfits, pet), `get_game` (level, streaks, quests, achievements), `get_memories` (milestones, week, year, facts, goals, countries; the journal and capsules are not offered to the in-app assistant) |
| Settings | `get_settings` (each setting `set_setting` can change, its value and what it can be) |
| Money and travel | `get_money` (budgets, the money plan, the tax year line by line with `part: tax`, a year of expenses), `list_owed` (who owes you what, what you owe, money you expect back; not on the remote connection), `get_travel` (trip decisions, countries; never exact locations) |
| Stories | `get_stories` (the day's script) |
| Friends | `list_friends` (who, by id; what each can see; shared spaces; postcards; gardens). Never anything a friend wrote |
| App | `get_app_status` (sync, connections, updates). Never a key, code or link |

### Change

| Area | Tools |
|---|---|
| Tasks | `create_task`, `update_task`, `complete_task`, `reopen_task`, `wont_do_task`, `bin_task`, `restore_task`, `reschedule_task`, `plan_task` (when to work on it: a day, or a time slot; the deadline stays), `schedule_task` (moves the deadline: due day and time), `set_task_priority`, `set_task_estimate`, `move_task_stream`, `add_task_note`, `add_subtask`, `update_subtask`, `remove_subtask`, `reorder_subtasks`, `promote_subtask` |
| People | `create_person`, `update_person`, `merge_people`, `delete_person`, `add_person_note`, `link_person`, `unlink_person`, `link_suggested_people` |
| Tags | `add_tag`, `remove_tag`, `create_tag`, `update_tag`, `rename_tag`, `merge_tags`, `delete_tag` |
| Streams | `create_stream`, `update_stream`, `reorder_streams` |
| Top bar and Home | `create_countdown`, `update_countdown`, `delete_countdown`, `reorder_countdowns`, `add_topbar_widget`, `set_home_focus`, `set_home_layout`, `reset_home_layout`, `set_home_widget` (a widget's own settings; another copy of Deadline runway or Smart list) |
| Calendar and email | `annotate_event` (your notes on an event, important, linked tasks, wrapped up; the event itself is never changed), `update_calendar` (display name and colour in Freeflo only), `triage_email` |
| Files & links | `create_resource`, `update_resource`, `delete_resource` (never touches the file itself), `link_resource`, `unlink_resource` |
| Auto-linking | `suggest_links`, `rate_suggested_links`, `apply_suggested_links`, `reject_suggested_links`, `relate_task`, `unrelate_task` |
| Reviews | `save_review` |
| Daily note | `save_daynote` (replace a day's note, or add lines at its end; 10,000 characters a day) |
| Batches | `apply_changes` (several operations, all or nothing), `undo_changes` |
| Garden | `garden`: plant, water, feed, prune, harvest, dig up, move, decorate, buy, sell, make a bouquet, collect |
| You | `set_profile` (status, avatar, card text), `set_wardrobe` (save, wear, rename, remove, surprise), `pet` (feed, pat, teach, dress, name, adopt) |
| Settings | `set_setting` (one ordinary setting), `undo_change` (undoes a garden, profile, pet, layout, note, tax or setting change) |
| Tax and the money plan | `tax_change` (income sources, client payments, claims, flat rates, plan items and debts, ticks on dates, a filed return, things to remember, each with Undo), `open_what_if` (shows a scenario on screen, saves nothing) |
| Friends (sensitive) | `friends_act` (waves, cheers, postcards, garden visits, add, approve, decline, remove, block), `friends_share` (what a friend can see), `together_act` (shared spaces) |
| Devices, relay, connections (sensitive) | `devices_act` (add, remove), `relay_act` (connect, update, disconnect), `connection_act` (start a sign-in, disconnect) |
| Owed to me | `create_split` (who owes what, when you tell it), `mark_owed_paid` (when you say someone paid; from an email or a message it only asks you on the page), `undo_owed_change`. They move no money and tell nobody. Not on the remote connection |
| Money and updates (sensitive) | `money_change` (category rules, budgets), `expense_change` (bulk paid, unsubmit, delete), `tax_document_change` (a tax change taken from a file, email or pasted text), `install_update` |

There are no tools that write to Google, your email or your bank, and nothing
files with HMRC. Finance writes are `money_change` and `tax_document_change`,
which are sensitive, `tax_change`, which only touches your own Tax tab and
money plan and has Undo, and the notes in Owed to me, which move no money. A UTR, a National Insurance number or a password is
never returned by any tool and is refused by these.

## Prompts and resources

- **Prompts**: `plan_my_day`, `weekly_review`, `triage_overdue`.
- **Resources**: `dashboard://context`, `dashboard://today`,
  `dashboard://schema`. (The `dashboard://` scheme is kept from earlier
  versions so existing setups keep working.)

## Safety rails

Enforced by Freeflo, not left to the model:

- **Dates are ISO only** (`2026-10-08`). "Next Tuesday" is refused, with
  today's date in the error so the model can work it out.
- **No duplicates**: creating a task almost identical to an open one is refused
  and the existing one is named.
- **Wrong ids** come back with the closest matches, so the model corrects
  itself instead of guessing.
- **Unknown tags** are refused unless the model says it really wants a new one.
- **Bulk changes and deletions need a preview**: more than 25 changes, or any
  bin, delete or merge, must be dry-run first, and the real call must carry the
  token from that preview.
- **Everything is undoable**: each change returns an undo token, and the page
  shows an Undo button.
- **Retries are safe**: an idempotency key makes a repeated call a no-op.
- **Nothing is lost when two things edit at once**: the page, the MCP server,
  scripts and other tabs take turns on one lock, and an open tab merges the
  other change in field by field.

## Safety tiers

The assistant reads emails, invitations and things friends send, and any of
those can carry text written to trick it (prompt injection). So every tool sits
in one of three tiers, enforced in code rather than left to the model:
`lib/agent-tiers.mjs` is the table, `mcp/server.mjs` refuses what a connection
may not call, `lib/assistant.mjs` and `MCP_PROPOSE_TOOL` in
`lib/claude-runner.mjs` are the in-app assistant's allow-lists, and the actions
layer itself (`server/actions/index.mjs`) refuses anything else from the
assistant without a proposal.

| Tier | What | In-app assistant | Full mode |
|---|---|---|---|
| **Read** | everything under [Read](#read) | free | free |
| **Low-risk, with Undo** | `garden`, `pet`, `set_wardrobe`, `set_profile`, `set_setting`, `undo_change`, `set_home_layout`, `reset_home_layout`, `set_home_widget`, `set_home_focus`, `save_daynote`, `create_split`, `mark_owed_paid`, `undo_owed_change`, `tax_change`, `open_what_if` | runs directly | runs directly |
| **Sensitive** | `friends_act`, `friends_share`, `together_act`, `devices_act`, `relay_act`, `connection_act`, `money_change`, `expense_change`, `tax_document_change`, `install_update` | never directly: a proposal you approve on screen | only with a dry run and its confirm token |

Other changes (tasks, people, tags and so on) stay as they were: proposals in
the in-app assistant, direct in full mode, with a dry run for deletes and merges.

Things worth knowing:

- **Friends see your status, your card text and your pet's name**, so an email
  could use them to pass your data on. The in-app assistant can set a preset
  status by itself; free text there goes through a proposal.
- **The garden runs the app's own rules.** `lib/agent-engine.mjs` runs the page's
  own files in Node, so coins still come only from focus time, finished tasks and
  selling, and every cap applies. The tools have no way to give coins, water,
  seeds or treats.
- **`set_setting` is an allow-list.** Your name, the AI's settings and style, the
  currency, sign-ins and folders are not on it: some of those would let an email
  plant lasting instructions.
- **Connections.** The agent can show status and start a sign-in. The person signs
  in, in the browser. No tool takes a password, token or code, and no answer
  carries one, a sign-in link, a join code or an invite. Bank and other email
  accounts are started by you under Connections.
- **The full-mode dry run is a check on the model, not on you.** A model can make
  the dry run and then use its token by itself. In a local client that reads
  outside content, also leave the sensitive tools off your allow-list, so the
  client asks you first.
- **Nothing a friend wrote reaches the model**: not their status, bio, captions,
  guestbook lines or what is inside a shared space. Their chosen name and the name
  of a space do, so the agent can say who is who; both are marked as data.
- **The in-app assistant cannot read** your daily notes, journal or capsules.
  It can add to a daily note, and replacing one is a proposal.

Never exposed to any connection: secrets, keys, tokens, the signing key or
recovery material, reading or writing files by path (`attach_expense_file` takes
a receipt only, and refuses network and device paths), running programs, and
changing the update feed.

The remote gateway (`mcp/remote-server.mjs`) stays read and `propose_changes`
only. It lists none of the new tools and cannot propose the new operations.
To connect claude.ai, press **Connect Claude** in Freeflo and type the 4-letter
code shown in your own sign-in tab; the code works once, for ten minutes, and
three wrong codes close the Connect window.

## Modes and transport

- **Full mode** (the default): read tools plus every change tool. Sensitive
  ones need a dry run and its confirm token.
- **Propose mode** (`--mode propose`): read tools (all but `get_daynotes`), the
  low-risk tier and `propose_changes`.
  The model can suggest anything else but never apply it; you review the preview
  in Freeflo and apply it with one click. The in-app assistant uses this mode,
  so text inside an email, an invitation or a bank transaction can never change
  your tasks, reach another person, share data or start a sign-in on its own.

While Freeflo is running, the MCP server sends every call through it (it finds
the server through `data/runtime.json` and authenticates with
`data/local-token`), so open tabs update at once with "Updated by Claude Code".
When Freeflo is not running, the MCP server works directly on the data folder
with the same rules and the same lock; the page picks the change up next time
it opens. Its own log is `data/logs/mcp.log`. Friends, sync status, stories and
every sensitive action need Freeflo running, and say so if it is not.

## Scripts and the HTTP API

- `node tools/actions-cli.mjs changes.json` previews a file of operations;
  add `--apply` to apply it (and `--yes` for deletions or more than 25
  changes). `--query tasks.list '{"view":"today"}'`, `--history`,
  `--undo <token>` and `--describe` are there too.
- Over HTTP, the same API is `POST /api/actions`, `GET /api/query?op=...` and
  `POST /api/actions/undo` on `http://localhost:<port>`, with the header
  `X-Dashboard-Token: <contents of data/local-token>`. Keep that token private.

## Troubleshooting

| Problem | What to do |
|---|---|
| Claude says the Freeflo tools are missing | `claude mcp list`: if `opendash` (or `dashboard`) is not listed, run the install command; if it shows an error, the path is wrong (moved folder): remove it and add it again |
| Connections says your Claude points at another copy | you moved or updated the app: remove the server and add it again with the commands from the Set up panel |
| Changes do not appear in the open page | check that the page is open on the same data folder; the page also picks changes up when it is next opened |
| "the data folder has no data yet" | point `--data-dir` at the data folder Freeflo uses (Settings > Data shows it) |
