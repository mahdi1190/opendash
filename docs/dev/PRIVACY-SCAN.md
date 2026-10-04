# The privacy scan

`tools/privacy-scan.mjs` looks for personal data and secrets before anything
is published: in a folder (a release export, a checkout), in the git index
(what the next commit would contain) and in commits. CI runs it on every push
with the generic rules; maintainers also run it with a **private term list**
before a release or the first publication.

```sh
node tools/privacy-scan.mjs                      # this checkout (what git ignores is skipped)
node tools/privacy-scan.mjs <dir>                # any folder, e.g. a release export
node tools/privacy-scan.mjs --staged             # the git index + the identity of the next commit
node tools/privacy-scan.mjs --commits HEAD       # authors, committers and messages of commits
```

| Option | Meaning |
|---|---|
| `--repo <dir>` | the git work tree for `--staged` and `--commits` |
| `--commits <range>` | also check commits, e.g. `HEAD` or `origin/main..HEAD` |
| `--terms <file>` | the private term list (default `data/privacy-terms.txt`, then `$DASHBOARD_DATA_DIR/privacy-terms.txt`, when one exists) |
| `--terms -` | read the term list from standard input, so it never touches the disk |
| `--terms-from <data dir>` | also take private terms from a data folder (read only, never printed); see [below](#from-your-data-folder) |
| `--no-terms` | generic rules only (what CI runs) |
| `--allow <file>` / `--no-allow` | the reviewed exceptions (default `tools/privacy-allow.json`) |
| `--exclude <glob>` | skip paths, e.g. `--exclude "docs/**"` (repeatable) |
| `--no-gitignore` | in a git work tree, also scan what git ignores |
| `--summary` | counts per rule only |
| `--json` | a machine-readable report |
| `--show` | print matched text in full (on your own machine only, never in CI logs) |
| `--strict` | warnings fail too |

Each finding is one line, `file:line:col  severity [rule]  message  excerpt`.
Excerpts are masked (`ghp_…[40 chars]`) unless you pass `--show`, and a
private term is only ever shown as its line number in your term file. Exit
codes: 0 clean (warnings allowed), 1 findings, 2 usage or file error.

## What it looks for

| Rule | Finds |
|---|---|
| `email` | e-mail addresses, except GitHub noreply addresses, `example.com` / `.org` / `.net` and other reserved domains, `noreply@` and obvious placeholders |
| `phone` | UK and international phone numbers (Ofcom's drama ranges such as 07700 900xxx pass) |
| `uk-postcode` | UK postcodes (Royal Mail's format examples pass; without a space only next to the word "postcode") |
| `user-path` | absolute paths inside a user folder: `C:\Users\<name>`, `/Users/<name>`, `/home/<name>` (placeholders such as `<you>`, `%USERNAME%` and `runner` pass) |
| `cloud-folder` | a work or school cloud-folder name, `OneDrive - <Organisation>`, `OneDrive-<Organisation>` (macOS) or `Dropbox (<Organisation>)`: it names an employer or university (`OneDrive-Personal` and placeholders such as Contoso pass) |
| `local-path` | a folder inside a scratch folder of a developer's machine, such as `C:/tmp/<project>/...`: a warning (a file directly in `C:\Temp` and `<you>` placeholders pass) |
| `other-repo` | a link to another repository of the project's owner (`github.com/<owner>/<other>`): a warning, since an old or private repository's name can say more than it should. Needs `"repository"` in `tools/privacy-allow.json` |
| `github-token`, `anthropic-key`, `api-token`, `aws-key`, `google-secret`, `jwt`, `private-key` | tokens and keys in their published formats |
| `dashboard-token` | the dashboard's 64-hex-character local token |
| `iban`, `sort-code`, `account-number`, `card-number` | bank details (IBANs by checksum, cards by Luhn; documented test values pass) |
| `money` | money-like amounts outside tests: a warning, since most are labels or examples |
| `image-metadata` | author, comment, GPS and other metadata in PNG text chunks (also inside `.ico` files), JPEG EXIF / XMP / comments, and editor metadata in SVGs |
| `forbidden-path` | a path that must never be published (`data/`, `state/`, `secrets/`, backups, logs, `.env`, a `privacy-terms*` file...); its contents are never read |
| `git-author` | a commit (or the next commit) whose author or committer e-mail is not a noreply address; with `--staged`, also a commit name that is an e-mail address (an error) or the user name of your computer (a warning: a global `user.name` often is) |
| `private-term` | a word from your private term list |
| `unscanned-binary` | a binary file the scan cannot look inside: check it by hand (a warning) |

Text rules also run over the text inside images (PNG text chunks, EXIF and
XMP fields, SVG source) and over file names.

## The private term list

Generic rules cannot know your name, the people you work with or your
employer. The private term list does. It is a plain text file, **never
committed**, that only you have.

### Making it

1. Create `data/privacy-terms.txt` in your checkout. The `data/` folder is
   gitignored, and the scan reads that file by default. (Or keep it anywhere
   outside the repository and pass `--terms <file>`.)
2. Put one term per line. Matching is case-insensitive and on whole words,
   so `Sam` does not match `Samples`. Several words on one line match with any
   spacing between them. `#` starts a comment.
3. Include anything that would identify you or someone else:
   - your name, its short forms and your usernames on other sites;
   - the names of the people in your dashboard, colleagues and clients;
   - employers, clients, universities, projects and grant names;
   - your town, street, and the names of your bank accounts or cards;
   - the user name of your computer (the `<name>` in `C:\Users\<name>`);
   - the local part of your private e-mail addresses.
4. Avoid terms shorter than 3 characters or ordinary words: they match too
   much (the scan warns about very short ones).

An example (made-up names):

```text
# privacy-terms.txt - private, never committed
Alex Example
Sam
Acme Widgets
Northtown
alexe
```

### Using it

```sh
node tools/privacy-scan.mjs <export>                         # uses data/privacy-terms.txt when it exists
node tools/privacy-scan.mjs <export> --terms ~/private/terms.txt
some-password-manager get terms | node tools/privacy-scan.mjs <export> --terms -
```

A finding says `private term #3`: the term on line 3 of your file. The term
itself is never printed, so the output is safe to paste into an issue.

### From your data folder

Most of the names that matter are already in your own data folder. Instead
of (or as well as) typing them into a file, point the scan at it:

```sh
node tools/privacy-scan.mjs <export> --terms-from "<your data folder>"
node tools/privacy-scan.mjs <export> --terms <your term file> --terms-from "<your data folder>"
```

It reads, and never changes or prints:

- `config.json`: your name and your e-mail addresses;
- `state/dashboard-state.json`: each person's name parts (capitalised words of
  3 letters or more), e-mail addresses and aliases, and the stream labels and
  ids that are one word.

Ordinary words that are often stream names or name parts (`Work`, `Home`,
`Thesis`, `Research`...) and the made-up names the code uses as examples
(`Alex`, `Sam`, `Acme`...) are skipped, so a real person who shares one of
those names is not caught this way: put such names in the term file if they
matter. A finding says `private term d4 (from the data folder: person name)`.
Places, employers and projects that are not stream names still belong in the
term file.

The list must never be published. A file named `privacy-terms*` anywhere in
a scanned folder or in the git index is itself a finding, and
`tools/release-export.mjs` never copies one. CI runs the generic rules only
(`--no-terms`).

### The deep pass (before a release)

```sh
node tools/privacy-scan.mjs <export> --terms-from "<your data folder>" --deep
```

`--deep` (`tools/privacy-deep.mjs`) takes far more from the data folder:
every JSON file in it (not `secrets/` or `logs/`; the 15 newest of each
backups folder), so task, event and e-mail titles, organisations, places,
merchants, record ids, links and web hosts, e-mail domains (not public mail
providers), MD5/SHA-1/SHA-256 hashes of your addresses and names, saved
coordinates, the folder names in your paths; and this computer's user name,
computer name and the folders in your home folder. Then it also finds:

- a term inside an identifier (`danaQuembly2`, `x_dana`), glued to other
  letters (names of 6+ letters), with accents dropped or invisible
  characters inserted;
- text hidden by base64 (and `data:` URIs, whose images get the metadata
  checks), %-encoding, `\u`/`\x` escapes and HTML character references: it
  is decoded and every rule runs again;
- Windows SIDs and default computer names, MAC addresses and public IPv4
  addresses (`machine-id`), and coordinates within 25 km of a saved location
  (`near-location`).

It takes minutes. Findings name the number and kind only
(`private term e412 (from the data folder: title)`) and use the same
allowlist and `line_sha256` pins. Add `--deep-words` for single capitalised
words and codes from titles, merchants and senders: mostly ordinary words, so
each is a warning and only its first 3 places are listed. Text in
screenshots is not read: OCR them (Windows: `Windows.Media.Ocr`) into text
files and scan those.

## Exceptions

Most findings should be fixed: use `example.com` addresses, `<you>` in
paths, made-up names ("Alex", "Sam", "Acme"), the drama phone ranges, and
build test secrets at run time instead of writing them out (see
`tests/release-privacy.test.mjs`).

When a match really is fine, record it in `tools/privacy-allow.json` with
the reason:

```json
{ "rule": "email", "path": "tests/**", "match": "^uid-\\d+@google\\.com$", "why": "made-up iCal event UIDs in calendar tests" }
```

`path` is a glob over repository paths, `match` an optional regular
expression the matched text must satisfy. `forbidden-path` can never be
allowed. A `private-term` match can only be allowed on one reviewed line
(for example the copyright line, or a word list in third-party code): give
the exact `path` and that line's `line_sha256`, never a glob or a `match`,
so the term itself is never written down. Take the hash from the finding's
`lineHash` in a `--json` report; any edit to the line brings the finding
back for review:

```json
{ "rule": "private-term", "path": "LICENSE", "line_sha256": "<lineHash from --json>", "why": "the copyright holder's name is public on purpose" }
```

The scan prints entries that no longer match anything, so the list stays
short. The file's `"repository"`
(`owner/name`, the public repository) turns on the `other-repo` rule.

For a one-off, a line containing `privacy-scan:allow` is skipped by the
generic rules (never by the private terms).

## Limits

- The rules are patterns. They find the usual formats, not every possible
  one, and a few heuristics (phone numbers, postcodes, money, scratch paths)
  can be wrong in both directions. The private term list (and
  `--terms-from`) is what catches names: without it, a name in a comment
  ("ask Sam") is invisible to the scan.
- Inside binary files only PNG, JPEG, ICO and SVG metadata is read. Other
  binaries (fonts are skipped) get an `unscanned-binary` warning.
- The scan of a git work tree skips what git ignores, because it cannot be
  committed. Use `--no-gitignore` to include it.
- It does not look at git history beyond `--commits`. The public repository
  starts from one clean commit, so there is no older history to leak.
