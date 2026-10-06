# Link Claude locally

The default **Link Claude** action is shared by first-run setup and Connections.
It uses Claude Code on this computer, with no hosted relay or tunnel.
Opening the ordinary Claude website does not give a chat access to this local
MCP connection. **Open connected Claude** optionally launches the official
Claude Code Remote Control command in a local terminal and opens `claude.ai/code`.
Finish its terminal confirmations, then select the named OpenDash session in
the browser. Launching the terminal is not proof of a connected browser session;
OpenDash shows instructions rather than claiming that browser connection is ready.
This optional action needs Remote Control account access and keeps the local
computer and terminal running. Link Claude itself enables dashboard AI without
requiring Remote Control, a desktop application, or Cloudflare.

1. Re-scan native executable locations first. An existing authenticated Claude
   installation is reused, without an installer or another login.
2. If missing, download only the official native bootstrap from `claude.ai` or
   its fixed `downloads.claude.ai` redirect, then run the stable installer using
   separate arguments and a private temporary script. No npm installation or
   arbitrary command supplied by the browser is accepted.
3. Check `claude auth status` JSON. If signed out, a local sign-in terminal runs
   the fixed `claude auth login` command, which handles browser authentication.
   OpenDash waits up to five minutes and reads only sign-in metadata.
4. Add the user-scope OpenDash MCP automatically using `claude mcp add`, or reuse
   its matching entry. A conflicting entry is preserved and reported for review.
5. Verify the entry, check auth again, and perform the local MCP handshake. Only
   then show Connected and clear an earlier cached AI failure.

These checks make **no model calls**. Actual assistant requests still use the
user's Claude plan or provider account. Claude Code requires supported account
access; a free claude.ai account alone does not include it. Metadata checks do
not establish remaining plan quota or test an API key against a model endpoint.

All Claude process helpers live in `lib/claude-runner.mjs`. The orchestration is
`lib/local-claude-connect.mjs`, exposed by `server/routes/local-claude.mjs` under
the normal localhost host/origin guards. Neither status responses nor logs contain
auth JSON, email addresses, credentials or installer output. No install or login
starts on a page load; the user must press Link Claude.

The official native installer supports Windows, macOS and Linux. Linux browser
sign-in needs an installed terminal emulator; unsupported systems or an older
CLI without `auth status` receive an actionable error. Custom Claude configuration
locations may require review through Options if the user-scope MCP entry cannot
be verified by OpenDash's existing config reader.

Tests use temporary data and synthetic installer/auth/config dependencies:
`node --test tests/local-claude-connect.test.mjs tests/assistant-connections.test.mjs tests/claude-runner.test.mjs`.

Official references: [native setup and account requirements](https://code.claude.com/docs/en/setup),
[auth command reference](https://code.claude.com/docs/en/cli-reference).
