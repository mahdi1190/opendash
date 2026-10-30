# Frequently asked questions

## General

**What is Freeflo?**
A calm, local-first productivity dashboard: tasks, calendar, finances, people,
files and links, a morning brief and an optional Claude assistant, in one page
that runs on your own computer.

**Is it free?**
Yes. Freeflo is open source under the MIT licence. The optional AI features
use your own Claude plan through Claude Code; Freeflo adds no cost.

**Do I need an account?**
No. There is no Freeflo account or cloud service. You only sign in to the
services you choose to connect (Claude, and through it Gmail, Google Calendar
or your bank).

**Does it work offline?**
Yes. Everything except the connected features works without a network.

**Which systems does it run on?**
Windows, macOS and Linux, in a modern browser. On Windows the installer
includes everything; the zip version (any system) needs Node.js 20 or newer.
See [INSTALL.md](INSTALL.md).

**Windows says "Windows protected your PC" when I run the installer.**
That is SmartScreen. The installer is not code-signed yet, so Windows does
not recognise it. Click **More info**, then **Run anyway**. To check your
copy, compare it with `SHA256SUMS-installer.txt` on the release page.

**Can I use it on my phone?**
Not yet. The page adapts to narrow windows and touch screens, but the server
runs on your computer and only answers on that computer (`127.0.0.1`), and it
refuses requests addressed to any other host name. Freeflo is not designed to
be reached from other devices, and opening it to your network is not
supported. A supported way to do this is on the
[roadmap](../README.md#roadmap) as an idea; share your use case in
[Discussions](https://github.com/mahdi1190/opendash/discussions).

## Data and privacy

**Is the cloud required?**
No. Freeflo works fully on one computer, and that is how it starts. Syncing
your own devices and Friends are optional extras, and both run through a
relay you host on your own (free) Cloudflare account, or a friend's, never
a Freeflo server. See
[Cloud and sync](PRIVACY.md#cloud-and-sync-optional-in-three-levels).

**Does anyone else see my data?**
Not unless you choose. There is no Freeflo company server, account or
telemetry, so the project never sees anything. Sync between your own devices
is end-to-end encrypted: your relay and your cloud folder only hold scrambled
records. A friend sees your profile, game progress and garden, and only what
else you turn on for that one friend. Claude sees what a Claude feature needs, through
your own Claude Code (below). Details in [PRIVACY.md](PRIVACY.md).

**Where is my data?**
In one folder: `%LOCALAPPDATA%\OpenDash\data` with the Windows installer,
`data/` next to the app for a zip install, or the folder you chose with
`--data-dir`. See [INSTALL.md](INSTALL.md#where-your-data-lives).

**Is anything sent anywhere?**
Only for features you switch on, and only to the service the feature names
(Claude through your own Claude Code, the connectors you added, an iCal host,
Open-Meteo for weather, GitHub when you check for updates). No analytics or
telemetry. One exception: if Claude
Code is already installed and signed in on your computer, Freeflo uses it
without being asked (a tiny test prompt at start-up, and the Morning brief's
daily summary and story scripts; Settings > Brief and stories > *AI summary* turns
those off). Details in [PRIVACY.md](PRIVACY.md).

**Is my data encrypted?**
Freeflo does not encrypt the data folder itself. Use your operating system's
disk encryption. The optional *daily encrypted copy* (below) is encrypted
before it leaves your computer.

**How do I back up?**
Backups are automatic (Settings > Data lists them, with restore). For a copy
somewhere else, switch on **Settings > Data > Daily encrypted copy**: once a
day a locked copy goes to `OneDrive\OpenDash Backups` (or a folder you choose),
and the newest 14 are kept. Or use *Export all data (.zip)* now and then.

**What if I forget the passphrase of the encrypted copies?**
Then they cannot be opened, by you or anyone else; that is the point of the
lock. The computer that made them can still restore them without typing it,
and you can switch the copy off and on again with a new passphrase (new copies
use the new one).

**Can I keep the data folder in OneDrive, Dropbox or iCloud?**
It works, but it is not a good idea: sync tools copy files, they do not merge
edits made on two computers, so edits can be lost. Freeflo says so (*Your data
is in OneDrive*) and offers **Move my data out of OneDrive** in Settings > Data:
it copies everything to a folder on this computer, checks every file, updates
the start-up and assistant settings that use the old place, keeps the old
folder (renamed, never deleted) and can be undone. Your computers then stay in
step through Settings > Sync. Until you move it, use Freeflo on one computer
at a time: it pauses changes when another computer has the folder open (choose
*Use here anyway* to go on).

**How do I add another computer?**
Install Freeflo there, open Settings > Sync and choose *No, join my other
computer*. Your first computer shows a 4-letter code and a picture; type the
letters on the new one, check both screens show the same picture, and press
*Yes*. The code works once and for ten minutes. You can also print an optional
10-word emergency backup sheet (Settings > Sync); you only need it if you ever
lose every computer. Removing a computer in Settings > Sync stops it reading
new data and locks it out of Friends.

**I moved my data. Where did it go, and can I go back?**
Settings > Data shows the new place and the name of the kept old folder (there
is a `README` in it). **Undo move** puts everything back, including changes you
made since: they are copied back into the old folder first. Delete the old
folder yourself once you are happy; Freeflo never deletes it.

**Why does a job say "Runs on HOME-PC"?**
That computer is your *main computer* (Settings > Sync > Main computer). Only
it runs the automatic background jobs: bank updates, AI summaries and reviews,
story scripts, calendar and email updates. That way your bank is not asked
twice and Claude does not do the same work on two computers. A click still
runs the job where you are.

**I used the zip version. How do I move my data to the installer version?**
Stop the zip version (and turn off its start-up switches in Settings >
Server), install, stop the new copy, copy everything inside the old `data`
folder into `%LOCALAPPDATA%\OpenDash\data`, then start Freeflo from the
Start menu. Step by step:
[INSTALL.md](INSTALL.md#moving-to-the-installer-version).

**How do I move to a new computer?**
*Export all data (.zip)* on the old one, install Freeflo on the new one,
*Import data*. Connections are set up again on the new computer.

**What can friends see?**
Your profile (name, character, bio, pet), game progress and garden, and
nothing more until you turn it on for one friend you mark *Trusted*. Each of
those three can be hidden per friend too. Messages between friends are
end-to-end encrypted, and nothing a friend sends reaches Claude or changes
your tasks. See [FRIENDS_GUIDE.md](FRIENDS_GUIDE.md#what-friends-can-see).

**Do Friends need a server or an account?**
A small private relay: your own on your Cloudflare account (free; Settings >
Your relay > *Set up my relay*, about 2 minutes), or a friend's that you
join with their invite. It only holds sealed messages it cannot read. See
[FRIENDS_GUIDE.md](FRIENDS_GUIDE.md#your-relay).

**Can I take back what I shared with a friend?**
*Stop sharing with Sam*, *Remove friend* or *Block* stops it at once and asks
their app to delete its copy. That deletion cannot be forced on their device,
so only share what you are happy for them to have seen.

## Claude and connections

**Do I need Claude?**
No. Tasks, calendar views, Finances with CSV import, people, files and links,
the brief and the stories all work without it. Claude adds the assistant,
smart suggestions, AI summaries and the connectors.

**Why Claude Code and not an API key?**
Freeflo runs Claude through the Claude Code CLI signed in to your own account,
so it never handles an API key or password, and calls use the plan you already
have.

**Can the assistant change my data without asking?**
It can do nearly everything you can do in the dashboard, and every change can
be undone. Ordinary changes (tasks, people, tags) are proposed first and happen
when you press Apply. Anything sensitive (friends, your computers, your relay,
sign-ins, money rules, changes to existing expenses, updates) is only ever a
proposal you approve on screen. Text inside emails or calendar invitations
cannot change your data on its own.

**Can Freeflo send email, change my calendar or move money?**
No. Gmail, Calendar and bank connectors are only ever used with read tools,
and tools that could send, change or delete anything are locked.

**What is the "Freeflo MCP"?**
A way for your own Claude (Claude Code, T3 Code or Claude Desktop) to read and
change nearly everything in the dashboard from a chat, with Undo. Sensitive
things need a dry run or your approval. See [MCP.md](MCP.md).

## Using it

**How do I add a task quickly?**
Press Q and type, for example `Send Alex the slides fri 3pm #work !p1`. See
[USAGE.md](USAGE.md#quick-add).

**Setting up my relay stopped with an error. What now?**
Each stop says what happened and what to do, with *Try again*. The common
ones (Node.js missing, the sign-in not allowed, no workers.dev subdomain,
several accounts) are explained in
[FRIENDS_GUIDE.md](FRIENDS_GUIDE.md#if-something-goes-wrong).

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
updates comes from Settings > Region & language > *Time zone*. If your computer
is somewhere else (a trip, a data folder copied from another machine), that
row says so and offers *Use* with your computer's zone in one click. Calendar
events keep their own time zones and show at your local time, including on the
days the clocks change.

## Running it

**The page says the server isn't running.**
Start Freeflo with its launcher. Settings > Server > *Open log* (or
`data/logs/server.log`) says why it stopped.

**"Port 4173 is in use by something that is not Freeflo".**
If Freeflo is already running, the launcher simply opens it. Otherwise start
it on another port from a terminal in the app folder: `.\start-opendash.bat
--port 4174` on Windows, `sh start-opendash.sh --port 4174` on macOS and Linux
(see [launcher options](INSTALL.md#launcher-options)).

**Can it start when I log in?**
With the Windows installer, tick *Start Freeflo when I sign in* while
installing. With a zip install on Windows, turn on *Start automatically when I
log in* in Settings > Server. On macOS and Linux, Settings > Server shows how
to add a login item.

**How do updates work?**
Settings > Updates > *Check for updates* asks GitHub's releases page whether
there is a newer version; *Update and restart* downloads it, checks its
checksum, keeps a copy of the files it replaces, and restarts. Your data is
never touched. Checking only downloads; nothing about you is sent. It checks
only when you ask, unless you turn on *Check for updates once a day*. With the
installer you can also run the newer `OpenDash-Setup` over the old one. See
[INSTALL.md](INSTALL.md#updating).

## Contributing

**How can I help?**
Report bugs, suggest ideas in Discussions, improve the docs, or send a pull
request. Start with the [contributing guide](../.github/CONTRIBUTING.md).

**I found a security problem.**
Please report it privately: see [SECURITY.md](../.github/SECURITY.md).
