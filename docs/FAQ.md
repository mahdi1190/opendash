# Frequently asked questions

## General

**What is OpenDash?**
A calm, local-first productivity dashboard: tasks, calendar, finances, people,
files and links, a morning brief and an optional Claude assistant, in one page
that runs on your own computer.

**Is it free?**
Yes. OpenDash is open source under the MIT licence. The optional AI features
use your own Claude plan through Claude Code; OpenDash adds no cost.

**Do I need an account?**
No. There is no OpenDash account or cloud service. You only sign in to the
services you choose to connect (Claude, and through it Gmail, Google Calendar
or your bank).

**Does it work offline?**
Yes. Everything except the connected features works without a network.

**Which systems does it run on?**
Windows, macOS and Linux, with Node.js 20 or newer and a modern browser.

**Can I use it on my phone?**
Not yet. The page adapts to narrow windows and touch screens, but the server
runs on your computer and only answers on that computer (`127.0.0.1`), and it
refuses requests addressed to any other host name. OpenDash is not designed to
be reached from other devices, and opening it to your network is not
supported. A supported way to do this is on the
[roadmap](../README.md#roadmap) as an idea; share your use case in
[Discussions](https://github.com/mahdi1190/opendash/discussions).

## Data and privacy

**Where is my data?**
In one folder, `data/` next to the app unless you chose another with
`--data-dir`. See [INSTALL.md](INSTALL.md#where-your-data-lives).

**Is anything sent anywhere?**
Only for features you switch on, and only to the service the feature names
(Claude through your own Claude Code, the connectors you added, an iCal host,
Open-Meteo for weather). No analytics or telemetry. One exception: if Claude
Code is already installed and signed in on your computer, OpenDash uses it
without being asked (a tiny test prompt at start-up, and the Morning brief's
daily summary and story scripts; Settings > Morning brief > *AI summary* turns
those off). Details in [PRIVACY.md](PRIVACY.md).

**Is my data encrypted?**
OpenDash does not encrypt the data folder itself. Use your operating system's
disk encryption.

**How do I back up?**
Backups are automatic (Settings > Data lists them, with restore). For a copy
you keep elsewhere, use *Export all data (.zip)*.

**Can I keep the data folder in OneDrive, Dropbox or iCloud?**
Yes, with `--data-dir`, but run OpenDash on one computer at a time: sync tools
copy files, they do not merge edits made in two places at once.

**How do I move to a new computer?**
*Export all data (.zip)* on the old one, install OpenDash on the new one,
*Import data*. Connections are set up again on the new computer.

## Claude and connections

**Do I need Claude?**
No. Tasks, calendar views, Finances with CSV import, people, files and links,
the brief and the stories all work without it. Claude adds the assistant,
smart suggestions, AI summaries and the connectors.

**Why Claude Code and not an API key?**
OpenDash runs Claude through the Claude Code CLI signed in to your own account,
so it never handles an API key or password, and calls use the plan you already
have.

**Can the assistant change my data without asking?**
No. It proposes changes; nothing happens until you press Apply, and every
change can be undone. Text inside emails or calendar invitations cannot change
your data on its own.

**Can OpenDash send email, change my calendar or move money?**
No. Gmail, Calendar and bank connectors are only ever used with read tools,
and tools that could send, change or delete anything are locked.

**What is the "OpenDash MCP"?**
A way for your own Claude (Claude Code, T3 Code or Claude Desktop) to read and
change your tasks from a chat. See [MCP.md](MCP.md).

## Using it

**How do I add a task quickly?**
Press Q and type, for example `Send Alex the slides fri 3pm #work !p1`. See
[USAGE.md](USAGE.md#quick-add).

**Can I undo?**
Yes: Ctrl+Z (Cmd+Z on a Mac), the Undo button on notifications, or restore a
backup. Deleted tasks go to the Bin first.

**How do I start over?**
Settings > Data > *Reset app data*. Your data folder is backed up first.

**How do I try it without my own data?**
Choose *Load demo data* in the welcome. Everything in it is invented.

**Which time zone does it use?**
Your computer's: a new data folder starts on it, and the page always shows your
computer's clock. "Today" for the stories, the assistant and calendar and bank
updates comes from Settings > Profile & region > *Time zone*. If your computer
is somewhere else (a trip, a data folder copied from another machine), that
row says so and offers *Use* with your computer's zone in one click. Calendar
events keep their own time zones and show at your local time, including on the
days the clocks change.

## Running it

**The page says the server isn't running.**
Start OpenDash with its launcher. Settings > Server > *Open log* (or
`data/logs/server.log`) says why it stopped.

**"Port 4173 is in use by something that is not OpenDash".**
If OpenDash is already running, the launcher simply opens it. Otherwise start
it on another port from a terminal in the app folder: `.\start-opendash.bat
--port 4174` on Windows, `sh start-opendash.sh --port 4174` on macOS and Linux
(see [launcher options](INSTALL.md#launcher-options)).

**Can it start when I log in?**
On Windows, turn on *Start automatically when I log in* in Settings > Server.
On macOS and Linux, Settings > Server shows how to add a login item.

**How do I update?**
Unzip the new release into a new folder, move your `data` folder across, and
start it. See [INSTALL.md](INSTALL.md#updating).

## Contributing

**How can I help?**
Report bugs, suggest ideas in Discussions, improve the docs, or send a pull
request. Start with the [contributing guide](../.github/CONTRIBUTING.md).

**I found a security problem.**
Please report it privately: see [SECURITY.md](../.github/SECURITY.md).
