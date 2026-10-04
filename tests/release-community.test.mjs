// The community files and documentation a public release ships: present where
// GitHub looks for them (once), linked correctly, free of personal data, and in
// step with the code they describe - the security safeguards, the MCP tool
// list, the changelog the release notes come from, and the branding keep-list
// (identifiers that must stay "dashboard" for existing installs).
//
// Zero dependencies. The MCP check starts mcp/server.mjs on an empty temporary
// data folder; nothing reads a real data folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { changelogSection, CHANGELOGS } from '../tools/release-package.mjs';
import { scanFile, scanPathName, loadAllow, DEFAULT_ALLOW } from '../tools/privacy-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');
const read = (r) => readFileSync(join(ROOT, r), 'utf8');
const has = (r) => existsSync(join(ROOT, r));
const PKG = JSON.parse(read('package.json'));

// Where GitHub finds community health files: the root, .github/ or docs/.
const PLACES = ['', '.github/', 'docs/'];
const COMMUNITY = ['CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', 'SUPPORT.md'];
const where = (name) => PLACES.map(p => p + name).filter(has);

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}
/** Every Markdown file this suite looks after: .github/, docs/ and root community files. */
function markdownFiles() {
  const out = [...walk(join(ROOT, '.github')), ...walk(join(ROOT, 'docs'))].filter(f => f.endsWith('.md'));
  for (const n of [...COMMUNITY, 'CHANGELOG.md']) if (has(n)) out.push(join(ROOT, n));
  return out;
}
const changelogPath = () => CHANGELOGS.find(has);

// ─── Markdown: headings (GitHub anchors) and links ─────────────────────────

/** GitHub's heading anchor: lower case, punctuation dropped, spaces -> hyphens. */
function slug(heading) {
  return heading.trim().toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replace(/ /g, '-');
}

/** Lines outside fenced code blocks: [{n, text}] (1-based line numbers). */
function proseLines(text) {
  const out = [];
  let fence = null;
  text.split(/\r?\n/).forEach((line, i) => {
    const m = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (m) {
      if (!fence) fence = m[1][0];
      else if (m[1][0] === fence) fence = null;
      return;
    }
    if (!fence) out.push({ n: i + 1, text: line });
  });
  return out;
}

/** The anchors a Markdown file offers (headings, with -1, -2 for repeats, and <a id/name>). */
function anchors(text) {
  const seen = new Map();
  const out = new Set();
  for (const { text: line } of proseLines(text)) {
    const h = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      const base = slug(h[1]);
      const n = seen.get(base) || 0;
      seen.set(base, n + 1);
      out.add(n ? `${base}-${n}` : base);
    }
    for (const a of line.matchAll(/<a\s[^>]*(?:id|name)="([^"]+)"/gi)) out.add(a[1].toLowerCase());
  }
  return out;
}

/** Relative link targets in a Markdown file: [{n, target}] (no web, mail or inline-code links). */
function links(text) {
  const out = [];
  for (const { n, text: raw } of proseLines(text)) {
    const line = raw.replace(/`[^`]*`/g, '');
    const targets = [...line.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map(m => m[1]);
    const def = /^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/.exec(line);
    if (def) targets.push(def[1]);
    for (const t of targets) if (!/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(t)) out.push({ n, target: t });
  }
  return out;
}

test('slug() makes GitHub heading anchors', () => {
  assert.equal(slug('Files & links and auto-linking'), 'files--links-and-auto-linking');
  assert.equal(slug('Gmail, Google Calendar and your bank (claude.ai connectors)'), 'gmail-google-calendar-and-your-bank-claudeai-connectors');
  assert.equal(slug('Change: user-facing wording (U and S)'), 'change-user-facing-wording-u-and-s');
  assert.equal(slug('The `dashboard://` scheme'), 'the-dashboard-scheme');
  assert.equal(slug('Using [OpenDash](https://example.com) offline'), 'using-opendash-offline');
});

// ─── Presence ──────────────────────────────────────────────────────────────

test('community files exist exactly once, where GitHub looks for them', () => {
  for (const name of COMMUNITY) {
    const found = where(name);
    assert.equal(found.length, 1, `${name}: expected in exactly one of the root, .github/ or docs/, found ${JSON.stringify(found)}`);
  }
  assert.equal(where('PULL_REQUEST_TEMPLATE.md').length, 1, 'one pull request template');
  for (const f of ['bug_report.yml', 'feature_request.yml', 'config.yml']) assert.ok(has(`.github/ISSUE_TEMPLATE/${f}`), `.github/ISSUE_TEMPLATE/${f}`);
  assert.ok(has('LICENSE'), 'LICENSE at the root');
  assert.match(read('LICENSE'), /^MIT License/, 'the MIT licence');
  const logs = CHANGELOGS.filter(has);
  assert.equal(logs.length, 1, `one changelog, in ${CHANGELOGS.join(' or ')}; found ${JSON.stringify(logs)}`);
  for (const f of ['.editorconfig', '.gitattributes']) assert.ok(has(f), f);
});

test('the docs index links every user guide in docs/', () => {
  const index = read('docs/README.md');
  const guides = readdirSync(join(ROOT, 'docs')).filter(n => n.endsWith('.md') && n !== 'README.md');
  assert.ok(guides.length >= 7, 'install, usage, connections, MCP, architecture, FAQ, privacy');
  for (const g of guides) assert.ok(index.includes(`](${g})`), `docs/README.md links ${g}`);
  for (const g of ['INSTALL.md', 'USAGE.md', 'CONNECTIONS.md', 'MCP.md', 'ARCHITECTURE.md', 'FAQ.md', 'PRIVACY.md']) assert.ok(has(`docs/${g}`), `docs/${g}`);
});

// ─── Links ─────────────────────────────────────────────────────────────────

test('every relative link and anchor in the docs and community files resolves', () => {
  const files = markdownFiles();
  assert.ok(files.length >= 10, `found ${files.length} Markdown files`);
  const cache = new Map();
  const anchorsOf = (f) => { if (!cache.has(f)) cache.set(f, anchors(readFileSync(f, 'utf8'))); return cache.get(f); };
  const broken = [];
  let checked = 0, withAnchor = 0;
  for (const f of files) {
    for (const { n, target } of links(readFileSync(f, 'utf8'))) {
      checked++;
      if (target.includes('#')) withAnchor++;
      let decoded;
      try { decoded = decodeURIComponent(target); } catch { decoded = target; }
      const hash = decoded.indexOf('#');
      const path = hash >= 0 ? decoded.slice(0, hash) : decoded;
      const frag = hash >= 0 ? decoded.slice(hash + 1) : '';
      const to = path ? resolve(dirname(f), path) : f;
      if (!existsSync(to)) { broken.push(`${rel(f)}:${n}  ${target}  (no such file)`); continue; }
      if (frag && to.endsWith('.md') && statSync(to).isFile() && !anchorsOf(to).has(frag.toLowerCase())) {
        broken.push(`${rel(f)}:${n}  ${target}  (no heading #${frag} in ${rel(to)})`);
      }
    }
  }
  assert.deepEqual(broken, [], `broken links:\n  ${broken.join('\n  ')}`);
  assert.ok(checked >= 50 && withAnchor >= 20, `the checker saw the links (${checked}, ${withAnchor} with an anchor)`);
});

test('the link parser: anchors with repeats, links outside code, reference links', () => {
  const md = '# Top\n\n## Files & links\n\n## Files & links\n\n[a](#files--links) [b](#files--links-1) [c](other.md#x)\n'
    + '[web](https://example.com) `[code](nope.md)`\n\n```\n[fenced](nope.md)\n```\n[ref]: ./x.md\n';
  assert.deepEqual([...anchors(md)], ['top', 'files--links', 'files--links-1']);
  assert.deepEqual(links(md).map(l => l.target), ['#files--links', '#files--links-1', 'other.md#x', './x.md']);
});

// ─── Issue and pull request templates ──────────────────────────────────────

/** The `- type:` blocks of a GitHub issue form: [{type, id, required, text}]. */
function formFields(yml) {
  return yml.split(/\n(?=\s{2}- type:)/).slice(1).map(text => ({
    type: (/- type:\s*(\S+)/.exec(text) || [])[1],
    id: (/\n\s+id:\s*(\S+)/.exec(text) || [])[1] || null,
    required: /required:\s*true/.test(text),
    text,
  }));
}

test('issue forms: well formed; bug reports ask for version, OS, Node and steps, and warn about personal data', () => {
  for (const f of readdirSync(join(ROOT, '.github', 'ISSUE_TEMPLATE'))) {
    const yml = read(`.github/ISSUE_TEMPLATE/${f}`);
    assert.ok(!/\t/.test(yml), `${f}: no tabs in YAML`);
    assert.ok(yml.endsWith('\n'), `${f}: ends with a newline`);
  }
  for (const f of ['bug_report.yml', 'feature_request.yml']) {
    const yml = read(`.github/ISSUE_TEMPLATE/${f}`);
    assert.match(yml, /^name: \S/m, `${f}: name`);
    assert.match(yml, /^description: \S/m, `${f}: description`);
    const fields = formFields(yml);
    assert.ok(fields.length >= 3, `${f}: has fields`);
    const ids = fields.filter(x => x.type !== 'markdown').map(x => x.id);
    for (const x of fields) assert.ok(['markdown', 'input', 'textarea', 'dropdown', 'checkboxes'].includes(x.type), `${f}: field type ${x.type}`);
    assert.ok(ids.every(Boolean), `${f}: every input has an id`);
    assert.equal(new Set(ids).size, ids.length, `${f}: ids are unique`);
    assert.match(yml, /personal data/i, `${f}: reminds people not to paste personal data`);
  }
  const bug = formFields(read('.github/ISSUE_TEMPLATE/bug_report.yml'));
  for (const id of ['version', 'os', 'node', 'steps']) {
    const field = bug.find(x => x.id === id);
    assert.ok(field, `bug report asks for ${id}`);
    assert.ok(field.required, `bug report: ${id} is required`);
  }
  assert.match(read('.github/ISSUE_TEMPLATE/bug_report.yml'), /Report a vulnerability/, 'security problems go to the private report');
  const cfg = read('.github/ISSUE_TEMPLATE/config.yml');
  assert.match(cfg, /^blank_issues_enabled: false$/m);
  assert.match(cfg, /\/discussions/, 'questions go to Discussions');
  assert.match(cfg, /\/security\/advisories\/new/, 'a contact link for private security reports');
});

test('the pull request template asks for tests, the privacy scan and no personal data', () => {
  const pr = read(where('PULL_REQUEST_TEMPLATE.md')[0]);
  assert.match(pr, /npm test/);
  assert.match(pr, /node tools\/privacy-scan\.mjs/);
  assert.match(pr, /personal data/i);
  assert.match(pr, /- \[ \]/, 'a checklist');
});

// ─── Code of conduct and security policy ──────────────────────────────────

test('code of conduct: Contributor Covenant 2.1, a private GitHub route for reports, no e-mail address', () => {
  const coc = read(where('CODE_OF_CONDUCT.md')[0]);
  assert.match(coc, /Contributor Covenant/);
  assert.match(coc, /version 2\.1/);
  assert.match(coc, /security\/advisories\/new|Report content/, 'reports go through GitHub, privately');
  assert.ok(!/[\w.+-]+@[\w-]+\.[\w.-]+/.test(coc), 'no e-mail address');
});

test('SECURITY.md: private reporting, a supported version, and safeguards that exist in the code', () => {
  const sec = read(where('SECURITY.md')[0]);
  assert.match(sec, /security\/advisories\/new/, 'GitHub private vulnerability reporting');
  const [major] = String(PKG.version).split('.');
  assert.match(sec.split(/^## /m).find(s => s.startsWith('Supported versions')) || '', new RegExp(`\\b${major}\\.(\\d+|x)`), `a supported ${major}.x line`);

  const http = read('server/http.mjs');
  const serverCode = [...walk(join(ROOT, 'server'))].filter(f => f.endsWith('.mjs')).map(f => readFileSync(f, 'utf8')).join('\n');
  // Localhost only.
  assert.match(read('server/index.mjs'), /\.listen\(\s*port\s*,\s*'127\.0\.0\.1'/);
  // Every CSP directive the policy quotes is in the server's CSP.
  const csp = [...sec.matchAll(/`((?:default|script|style|img|font|connect|object|frame|media|worker|child|manifest)-src [^`]+|base-uri [^`]+|form-action [^`]+|frame-ancestors [^`]+)`/g)].map(m => m[1]);
  assert.ok(csp.length >= 3, 'SECURITY.md quotes the CSP');
  for (const d of csp) assert.ok(http.includes(d), `CSP directive in server/http.mjs: ${d}`);
  // Every response header it quotes is set with that value.
  const headers = [...sec.matchAll(/`([A-Z][A-Za-z-]+): ([^`]+)`/g)].filter(m => !/^Content-Type$/i.test(m[1]));
  assert.ok(headers.length >= 3, 'SECURITY.md quotes the response headers');
  for (const [, name, value] of headers) assert.ok(http.includes(`'${name}': '${value}'`), `server/http.mjs sets ${name}: ${value}`);
  // Status codes of the checks it describes.
  for (const code of new Set([...sec.matchAll(/`(4\d\d)`/g)].map(m => m[1]))) assert.match(serverCode, new RegExp(`\\b${code}\\b`), `the server answers ${code}`);
  // The local token: header name, 32 random bytes, constant-time comparison.
  const auth = read('server/actions/auth.mjs');
  const header = (/`(X-[A-Za-z-]+-Token)`/.exec(sec) || [])[1];
  assert.ok(header, 'SECURITY.md names the token header');
  assert.match(auth, new RegExp(`TOKEN_HEADER = '${header.toLowerCase()}'`));
  assert.match(auth, /randomBytes\(32\)/);
  assert.match(auth, /timingSafeEqual/);
});

// ─── Changelog ─────────────────────────────────────────────────────────────

test('changelog: Keep a Changelog, Unreleased, and a section for the package version', () => {
  const file = changelogPath();
  assert.ok(file, 'a changelog');
  const text = read(file);
  assert.match(text, /keepachangelog\.com/);
  assert.match(text, /semver\.org/);
  assert.match(text, /^## \[Unreleased\]/m);
  assert.match(text, /^\[Unreleased\]: \S+/m, 'an Unreleased compare link');
  const s = changelogSection(text, PKG.version);
  assert.ok(s, `${file} has a section for ${PKG.version} (the release notes come from it)`);
  assert.ok(s.body.length > 200, 'the section says what is in the release');
  assert.match(text, new RegExp(`^\\[${PKG.version.replace(/\./g, '\\.')}\\]: \\S+`, 'm'), `a link for ${PKG.version}`);
  const dated = /\]\s*-\s*\d{4}-\d{2}-\d{2}\s*$/.test(s.heading);
  assert.ok(dated || /DRAFT/.test(s.heading), `the ${PKG.version} heading is dated or marked DRAFT: "${s.heading}"`);
  if (dated) {
    // Released: no draft markers left in the notes or the docs.
    assert.ok(!/DRAFT/.test(s.body), 'a dated section is no longer a draft');
    const todos = markdownFiles().filter(f => /TODO\(opendash\)/.test(readFileSync(f, 'utf8'))).map(rel);
    assert.deepEqual(todos, [], 'no TODO(opendash) left in the docs of a released version');
  }
});

// ─── MCP documentation matches the server ─────────────────────────────────

/** Start mcp/server.mjs (plus `extra` arguments) on an empty temp data folder; -> {tools, prompts, resources}. */
function mcpLists(extra = []) {
  const dir = mkdtempSync(join(tmpdir(), 'opendash-community-'));
  const data = join(dir, 'data');
  mkdirSync(data);
  const child = spawn(process.execPath, [join(ROOT, 'mcp', 'server.mjs'), '--data-dir', data, ...extra], {
    stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true, env: { ...process.env, DASHBOARD_DATA_DIR: data },
  });
  const send = (o) => child.stdin.write(JSON.stringify(o) + '\n');
  return new Promise((done, fail) => {
    const got = {};
    let buf = '';
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.once('exit', () => { rmSync(dir, { recursive: true, force: true }); if (err) fail(err); else done(got); });
      try { child.stdin.end(); } catch { /* gone */ }
      child.kill();
    };
    const timer = setTimeout(() => finish(new Error('the MCP server did not answer within 20 s')), 20000);
    child.on('error', finish);
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        let m;
        try { m = JSON.parse(line); } catch { continue; }
        if (m.id === 2) got.tools = m.result && m.result.tools;
        if (m.id === 3) got.prompts = m.result && m.result.prompts;
        if (m.id === 4) got.resources = m.result && m.result.resources;
        if (got.tools && got.prompts && got.resources) finish();
      }
    });
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'release-community-test', version: '1' } } });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    send({ jsonrpc: '2.0', id: 3, method: 'prompts/list' });
    send({ jsonrpc: '2.0', id: 4, method: 'resources/list' });
  });
}

/** A level-2 or level-3 section of a Markdown file, up to the next heading of the same or a higher level. */
function section(text, heading) {
  const level = /^#+/.exec(heading)[0].length;
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(l => l.trim() === heading);
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) { const m = /^(#{1,6})\s/.exec(lines[i]); if (m && m[1].length <= level) { end = i; break; } }
  return lines.slice(start + 1, end).join('\n');
}
const toolNames = (md) => new Set([...md.split(/\r?\n/).filter(l => l.startsWith('|')).join('\n').matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map(m => m[1]));

test('docs/MCP.md lists exactly the tools, prompts and resources the MCP server offers', { timeout: 60000 }, async () => {
  const { tools, prompts, resources } = await mcpLists();
  assert.ok(Array.isArray(tools) && tools.length > 20, 'tools/list answered');
  const readOnly = new Set(tools.filter(t => t.annotations && t.annotations.readOnlyHint).map(t => t.name));
  const change = new Set(tools.map(t => t.name).filter(n => !readOnly.has(n)));
  const md = read('docs/MCP.md');
  const sorted = (s) => [...s].sort();

  assert.deepEqual(sorted(toolNames(section(md, '### Read'))), sorted(readOnly), 'docs/MCP.md "Read" table = the read-only tools');
  assert.deepEqual(sorted(toolNames(section(md, '### Change'))), sorted(change), 'docs/MCP.md "Change" table = every other tool');
  const count = /(\d+) tools in the default \(full\) mode: (\d+) that only read and (\d+) that change/.exec(md);
  assert.ok(count, 'docs/MCP.md states the tool counts');
  assert.deepEqual(count.slice(1).map(Number), [tools.length, readOnly.size, change.size], 'the stated counts');
  // Test MCP (Connections) runs propose mode: the count it reports is the one the docs explain.
  const proposeCount = /which is why it reports\s+(\d+)\s+tools/.exec(md);
  assert.ok(proposeCount, 'docs/MCP.md explains the count Test MCP shows');
  const propose = await mcpLists(['--mode', 'propose']);
  assert.equal(Number(proposeCount[1]), propose.tools.length, 'the propose-mode count in docs/MCP.md');

  // The "read freely" permission block = the read-only tools.
  const perms = section(md, '## Permissions');
  const allowed = new Set([...perms.matchAll(/"mcp__opendash__([a-z_]+)"/g)].map(m => m[1]));
  assert.deepEqual(sorted(allowed), sorted(readOnly), 'the read-freely permission list');

  const pr = section(md, '## Prompts and resources');
  for (const p of prompts) assert.ok(pr.includes(`\`${p.name}\``), `prompt ${p.name} is documented`);
  for (const r of resources) assert.ok(pr.includes(`\`${r.uri}\``), `resource ${r.uri} is documented`);
  const documented = [...pr.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map(m => m[1]);
  for (const name of documented) assert.ok(prompts.some(p => p.name === name), `documented prompt ${name} exists`);
});

// ─── Branding: identifiers that must keep their old name ──────────────────

test('branding keep-list: every compatibility identifier still exists where the plan says', (t) => {
  // The plan is a maintainers' working note: tools/release-rules.mjs leaves it out of a release.
  if (!has('docs/dev/BRANDING_PLAN.md')) { t.skip('docs/dev/BRANDING_PLAN.md is not in this copy (a release leaves it out)'); return; }
  const plan = read('docs/dev/BRANDING_PLAN.md');
  const block = /```text keep-list\r?\n([\s\S]*?)```/.exec(plan);
  assert.ok(block, 'docs/dev/BRANDING_PLAN.md has a keep-list block');
  const rows = block[1].split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  assert.ok(rows.length >= 40, `${rows.length} identifiers`);
  const missing = [];
  for (const row of rows) {
    const [id, file] = row.split(/\s{2,}/);
    assert.ok(id && file, `keep-list row "${row}": identifier and file`);
    if (!has(file)) { missing.push(`${file} (file gone; ${id})`); continue; }
    if (!read(file).includes(id)) missing.push(`${id} in ${file}`);
  }
  assert.deepEqual(missing, [], `renamed or removed (existing installs depend on these; see BRANDING_PLAN.md "Keep"):\n  ${missing.join('\n  ')}`);
});

// ─── Privacy ───────────────────────────────────────────────────────────────

test('community files and docs contain no personal data (generic privacy rules)', () => {
  const { allowed } = loadAllow(DEFAULT_ALLOW());
  const files = [...walk(join(ROOT, '.github')), ...walk(join(ROOT, 'docs'))];
  for (const n of [...COMMUNITY, 'CHANGELOG.md', '.editorconfig', '.gitattributes']) if (has(n)) files.push(join(ROOT, n));
  const errors = [];
  for (const f of files) {
    const r = rel(f);
    const found = [...scanPathName(r), ...scanFile(r, readFileSync(f), { allowed })].filter(x => !allowed(x, r));
    for (const x of found) if (x.severity === 'error') errors.push(`${r}:${x.line}  ${x.rule}  ${x.message}`);
  }
  assert.deepEqual(errors, [], `privacy findings:\n  ${errors.join('\n  ')}`);
});
