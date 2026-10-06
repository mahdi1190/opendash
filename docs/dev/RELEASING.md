# Releasing OpenDash

Notes for maintainers. Users never need any of this: they download a release
zip, or clone the repository, and run the launcher.

A release is made from a **clean export**: an allowlisted copy of the source
that never contains a data folder, secrets, logs, backups, local tool config
or the built `index.html`. Three tools do the work, and the release workflow
runs the same tools on GitHub. All of them use Node.js 20+ built-ins only:
there is nothing to install.

| Tool | What it does |
|---|---|
| `tools/release-export.mjs` | copies the allowlisted files into a clean folder, lists everything it left out and why, then proves the copy builds |
| `tools/privacy-scan.mjs` | looks for personal data and secrets in a folder, in the git index and in commits (see [PRIVACY-SCAN.md](PRIVACY-SCAN.md)) |
| `tools/privacy-deep.mjs` | the scan's `--deep` pass: many more terms from your data folder, hidden and encoded terms, machine ids, coordinates |
| `tools/release-package.mjs` | zips an export, writes `SHA256SUMS.txt` and the release notes, then unzips the result into a fresh folder and builds and tests it |
| `tools/release-rules.mjs` | the allowlist and the never-publish rules that the three tools share |
| `tools/release-trace.mjs` | records which files a build reads, so the export can prove nothing the build needs was left out |
| `tools/release-offline.mjs` | switches the network off for one Node process, to check that tests skip cleanly offline |

## Cutting a release

1. **Update the version.** Set `"version"` in `package.json` to `X.Y.Z`.
2. **Update the changelog.** In `docs/CHANGELOG.md` (or a root `CHANGELOG.md`
   if it has moved), rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD` and
   start a new empty `## [Unreleased]` above it. That section becomes the
   release notes word for word, so write it for users.
3. **Rehearse locally** (optional, but quick):

   ```sh
   node tools/release-export.mjs --out ../opendash-release/opendash
   node tools/privacy-scan.mjs ../opendash-release/opendash
   node tools/release-package.mjs --from ../opendash-release/opendash --version X.Y.Z --check-package-version
   ```

4. **Commit, tag and push the tag:**

   ```sh
   git commit -am "Release X.Y.Z"
   git tag -a vX.Y.Z -m "OpenDash X.Y.Z"
   git push origin main vX.Y.Z
   ```

5. The **Release** workflow (`.github/workflows/release.yml`) picks up the
   tag. It scans the repository, exports, scans the export, packages it,
   unzips and tests the zip, records build provenance and publishes the GitHub
   release with three files: `opendash-vX.Y.Z.zip`, `SHA256SUMS.txt` and the
   notes. A tag with a suffix (`v1.3.0-rc.1`) becomes a pre-release, and may
   go without a changelog section.

If the workflow fails, nothing is published. Fix the problem, delete the tag
(`git tag -d vX.Y.Z` and `git push origin :refs/tags/vX.Y.Z`), and tag again.

Version numbers follow [Semantic Versioning](https://semver.org). For
OpenDash, a **major** version is one whose data folder an older version cannot
read (the launcher backs the folder up before upgrading it).

## The tools

### release-export

```sh
node tools/release-export.mjs                  # export to ../opendash-release/opendash (next to the repo)
node tools/release-export.mjs --out <dir>      # export somewhere else
node tools/release-export.mjs --dry-run        # print what would be copied and left out; write nothing
node tools/release-export.mjs --list           # also print every file that is copied
node tools/release-export.mjs --src <repo>     # export another checkout
node tools/release-export.mjs --no-build       # skip the build check
node tools/release-export.mjs --no-gitignore   # also copy allowlisted files that git ignores
node tools/release-export.mjs --force          # replace a non-empty --out that is not an earlier export
```

The file set is an **allowlist** (`tools/release-rules.mjs`):

- folders: `src/`, `server/`, `lib/`, `mcp/`, `cloudflare/`, `tools/`, `vendor/`, `tests/`,
  `docs/`, `.github/`, and `assets/brand/` only;
- files: `README*.md`, `LICENSE`, `CHANGELOG`, `CONTRIBUTING`,
  `CODE_OF_CONDUCT`, `SECURITY`, `SUPPORT`, `THIRD_PARTY_NOTICES`,
  `MODULES.md`, `CLAUDE.md`, `package.json`, `build.mjs`, `serve.mjs`,
  `check.bat`, the `start-*` launchers, `.gitignore`, `.gitattributes`,
  `.editorconfig`.

Inside those, these are **never** copied, wherever they are: `data/`,
`state/`, `secrets/`, `backups/`, `logs/` and `*.log`, `migration-plans/`,
`.env` files, the local token and runtime files, any `*backup*.json`, a
`privacy-terms*` file, OAuth client and token files, key files, data dumps,
`.claude/`, `node_modules/`, editor and OS files, archives and release output,
the built `index.html`, the personal scripts `tools/apply_sync.py` and
`tools/write_snapshot_local*.py`, and maintainers' working notes
(`docs/dev/BRANDING_PLAN.md`, `docs/dev/GITHUB_SETUP.md`, `docs/internal/`). When the source is a git
work tree, anything its `.gitignore` ignores is left out as well: it could
never be committed, so it is never released. A new top-level file or folder
is never published by accident: add it to the allowlist on purpose.

Every left-out path is printed with its reason. An earlier export in `--out`
is replaced, but its `.git` folder is kept, so a re-export shows up as an
ordinary diff there. The build check runs `node build.mjs --syntax` and a
full build into a temporary file, so the export itself never contains
`index.html`. It also traces the source's own build
(`tools/release-trace.mjs`): `build.mjs` skips missing optional parts (the
font, the icon sprite, vendored libraries) without a word, so every file it
reads in the source must be in the release, or the export fails and names the
file. An export never replaces a folder that holds `data/`, `state/` or
`secrets/`, even with `--force`. Exit codes: 0 ok, 1 the export does not build
or leaves out a build input, 2 usage or file error.

### release-package

```sh
node tools/release-package.mjs --from <export> --version X.Y.Z [options]
node tools/release-package.mjs <export> X.Y.Z                  # the same
  --out <dir>                 where the files go (default: <export>/../dist)
  --name <name>               file and folder name (default: opendash)
  --no-verify                 skip the unzip + build + test check
  --no-tests                  check the build, but skip the test suite
  --offline                   run the tests with no network and no Claude CLI
  --keep                      keep the unzipped copy (its path is printed)
  --check-package-version     fail unless package.json has the same version
```

It writes:

- `opendash-vX.Y.Z.zip`: the export under one top folder,
  `opendash-vX.Y.Z/`. Batch files get CRLF line endings and shell scripts LF
  (as a git checkout would give them), and shell scripts are marked
  executable. Set `SOURCE_DATE_EPOCH` (seconds) for a byte-for-byte
  reproducible zip.
- `SHA256SUMS.txt` in `sha256sum -c` format.
- `release-notes.md`: the version's changelog section, with download
  instructions (naming the `start-*` launchers the zip really contains) and
  the checksum.

Before it reports success it checks that the zip holds nothing the rules
leave out and that every entry is inside the top folder, then unzips into a
fresh temporary folder and runs `node build.mjs --syntax`, `node build.mjs`,
the generic privacy scan and `node --test` on every `tests/*.test.mjs`.
Failing tests are listed with their file and line. Exit codes: 0 ok, 1 a
check failed, 2 usage or file error.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:

| | Node 20 | Node 22 | Node 24 |
|---|---|---|---|
| ubuntu-latest | yes | yes | yes |
| windows-latest | yes | yes | yes |
| macos-latest | yes | yes | yes |

Each job runs `node build.mjs --syntax`, `node build.mjs`,
`node --test tests/*.test.mjs` (the glob is expanded by bash on every OS,
because Node 20's `--test` does not expand globs itself) and
`node tools/privacy-scan.mjs --no-terms` (the generic rules; CI never has the
private term list). `CLAUDE_CLI_PATH` points at a file that does not exist,
so no test can find a Claude CLI by accident. There is no `npm install`
step: the app has no dependencies.

A separate **offline** job runs the suite with the network switched off by
`tools/release-offline.mjs`. It is advisory (`continue-on-error`) until
every test that needs the network or a Claude CLI skips cleanly. To run the
same check locally:

```sh
node tools/release-package.mjs --from <export> --version 0.0.0-test --offline
```

or, in a checkout (bash):

```sh
CLAUDE_CLI_PATH=/nonexistent/claude NODE_OPTIONS="--import=file://$PWD/tools/release-offline.mjs" node --test tests/*.test.mjs
```

Dependabot (`.github/dependabot.yml`) keeps the workflow actions up to date.
Actions are pinned to full commit SHAs with the version as a comment
(`actions/checkout@<40-hex sha> # v5.1.0`), because a tag can be moved and the
release job can write releases; `tests/release-package.test.mjs` checks it.

## The first publication

The public repository starts from **one clean commit** made in an export,
never from the development history.

1. Export: `node tools/release-export.mjs --out <dir>`.
2. Scan it with your private term list and the names in your own data folder
   (see [PRIVACY-SCAN.md](PRIVACY-SCAN.md)), review every warning, and fix
   every finding at the source, then export again:

   ```sh
   node tools/privacy-scan.mjs <dir> --terms <your term file> --terms-from "<your data folder>"
   node tools/privacy-scan.mjs <dir> --terms-from "<your data folder>" --deep
   ```

3. Make the commit in the export with a noreply identity:

   ```sh
   cd <dir>
   git init -b main
   git config user.name "Your Name"
   git config user.email "<id>+<user>@users.noreply.github.com"
   git add -A
   node tools/privacy-scan.mjs --staged --repo . --terms <your term file>
   git commit -m "OpenDash 2.0.0"
   node tools/privacy-scan.mjs --repo . --commits HEAD --terms <your term file>
   ```

4. Only then create the GitHub repository and push. In the repository
   settings, turn on secret scanning, push protection and private
   vulnerability reporting (`SECURITY.md` and `CODE_OF_CONDUCT.md` send
   reports there), Discussions with a **Q&A** and an **Ideas** category (the
   issue chooser links to them), and *Moderation options > Reported content*
   for repository admins (the code of conduct tells people to use it). The
   description, topics and social preview are in
   [`assets/brand/BRAND.md`](../../assets/brand/BRAND.md).

After that, the public repository is where releases are tagged. If work
continues in a private checkout, carry it over the same way: export into a
clone of the public repository that you never run the app in (the export
keeps its `.git`, so the change is an ordinary diff, and it refuses a folder
that holds `data/`, `state/` or `secrets/`, even with `--force`), scan it with
your terms, then commit there with the noreply identity.

## Checking a download

```sh
sha256sum -c SHA256SUMS.txt                               # Linux
shasum -a 256 -c SHA256SUMS.txt                           # macOS
Get-FileHash opendash-vX.Y.Z.zip -Algorithm SHA256        # Windows PowerShell
```

The release workflow also records [build provenance](https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations):
`gh attestation verify opendash-vX.Y.Z.zip --repo <owner>/opendash`.
