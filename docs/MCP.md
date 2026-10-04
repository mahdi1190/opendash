# Using OpenDash from your own Claude (MCP)

OpenDash ships its own [Model Context Protocol](https://modelcontextprotocol.io)
server, `mcp/server.mjs`. Register it once and Claude Code, T3 Code or Claude
Desktop can read and change your tasks, people, tags, countdowns and more,
**without being told anything about OpenDash first**: the server explains
itself to the model. Every change appears in the open OpenDash page at once,
with Undo.

- [Register it](#register-it)
- [Permissions](#permissions)
- [Try it](#try-it)
- [Tools](#tools)
- [Prompts and resources](#prompts-and-resources)
- [Safety rails](#safety-rails)
- [Modes and transport](#modes-and-transport)
- [Scripts and the HTTP API](#scripts-and-the-http-api)
- [Troubleshooting](#troubleshooting)

## Register it

The easiest way: **Connections > OpenDash MCP > Set up** shows the exact
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
> before the OpenDash name use `dashboard`, and their tools are called
> `mcp__dashboard__...`. Everything works the same; only the prefix in your
> permission rules differs. OpenDash recognises its own server by path, not by
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
      "mcp__opendash__get_brief", "mcp__opendash__list_reviews"
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

- "What is due this week in OpenDash?"
- "Add a task to email Sam on Thursday, high priority."
- "Push every Acme task due next week back two days; preview first."
- "Plan my day."

## Tools

84 tools in the default (full) mode: 22 that only read and 62 that change
something. *Test MCP* in Connections starts the server in
[propose mode](#modes-and-transport) so the test can never change anything,
which is why it reports 23 tools (the read tools plus `propose_changes`); the
server you register runs in full mode. `describe_operations` returns every
operation with its exact JSON Schema.

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

### Change

| Area | Tools |
|---|---|
| Tasks | `create_task`, `update_task`, `complete_task`, `reopen_task`, `wont_do_task`, `bin_task`, `restore_task`, `reschedule_task`, `plan_task`, `schedule_task`, `set_task_priority`, `set_task_estimate`, `move_task_stream`, `add_task_note`, `add_subtask`, `update_subtask`, `remove_subtask`, `reorder_subtasks`, `promote_subtask` |
| People | `create_person`, `update_person`, `merge_people`, `delete_person`, `add_person_note`, `link_person`, `unlink_person`, `link_suggested_people` |
| Tags | `add_tag`, `remove_tag`, `create_tag`, `update_tag`, `rename_tag`, `merge_tags`, `delete_tag` |
| Streams | `create_stream`, `update_stream`, `reorder_streams` |
| Top bar and Home | `create_countdown`, `update_countdown`, `delete_countdown`, `reorder_countdowns`, `add_topbar_widget`, `set_home_focus`, `set_home_layout`, `reset_home_layout` |
| Calendar and email | `annotate_event` (your notes on an event; the event itself is never changed), `update_calendar` (display name and colour in OpenDash only), `triage_email` |
| Files & links | `create_resource`, `update_resource`, `delete_resource` (never touches the file itself), `link_resource`, `unlink_resource` |
| Auto-linking | `suggest_links`, `rate_suggested_links`, `apply_suggested_links`, `reject_suggested_links`, `relate_task`, `unrelate_task` |
| Reviews | `save_review` |
| Batches | `apply_changes` (several operations, all or nothing), `undo_changes` |

There are no tools that write to Google, your email or your bank, and no
finance write tools.

## Prompts and resources

- **Prompts**: `plan_my_day`, `weekly_review`, `triage_overdue`.
- **Resources**: `dashboard://context`, `dashboard://today`,
  `dashboard://schema`. (The `dashboard://` scheme is kept from earlier
  versions so existing setups keep working.)

## Safety rails

Enforced by OpenDash, not left to the model:

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

## Modes and transport

- **Full mode** (the default): read tools plus every change tool.
- **Propose mode** (`--mode propose`): read tools plus `propose_changes` only.
  The model can suggest changes but never apply them; you review the preview
  in OpenDash and apply it with one click. The in-app assistant uses this mode,
  so text inside an email, an invitation or a bank transaction can never change
  your data on its own.

While OpenDash is running, the MCP server sends every call through it (it finds
the server through `data/runtime.json` and authenticates with
`data/local-token`), so open tabs update at once with "Updated by Claude Code".
When OpenDash is not running, the MCP server works directly on the data folder
with the same rules and the same lock; the page picks the change up next time
it opens. Its own log is `data/logs/mcp.log`.

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
| Claude says the OpenDash tools are missing | `claude mcp list`: if `opendash` (or `dashboard`) is not listed, run the install command; if it shows an error, the path is wrong (moved folder): remove it and add it again |
| Connections says your Claude points at another copy | you moved or updated the app: remove the server and add it again with the commands from the Set up panel |
| Changes do not appear in the open page | check that the page is open on the same data folder; the page also picks changes up when it is next opened |
| "the data folder has no data yet" | point `--data-dir` at the data folder OpenDash uses (Settings > Data shows it) |
