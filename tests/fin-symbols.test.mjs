// The finance symbol library (src/app/67-fin-symbols.js, src/styles/67-fin-symbols.css):
// merchant names and monograms, colours that read in both themes, the
// category -> scene map, the transaction-type classifier, escaping, and the
// CSS contract (every motion class has keyframes; transform/opacity only;
// static under reduced motion). The pure parts run in Node without a DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'src', 'app', '67-fin-symbols.js'), 'utf8');
const CSS = readFileSync(join(ROOT, 'src', 'styles', '67-fin-symbols.css'), 'utf8');
const RULES = JSON.parse(readFileSync(join(ROOT, 'lib', 'finance', 'default-rules.json'), 'utf8'));

const box = {};
vm.createContext(box);
vm.runInContext(SRC, box, { filename: '67-fin-symbols.js' });
const FS = box.FinSymbols;
const SURFACE_LIGHT = '#ffffff', SURFACE_DARK = '#18181c';

test('loads without a DOM and exposes the API', () => {
  for (const f of ['merchantSymbol', 'merchantCanonical', 'merchantKey', 'merchantInfo', 'merchantColor', 'merchantMonogram', 'categoryIcon', 'categoryScene', 'categoryGlyph', 'txTypeBadge', 'txKind', 'txKindInfo', 'activate']) {
    assert.equal(typeof FS[f], 'function', f);
  }
  assert.ok(FS.merchants().length >= 150, `curated merchants: ${FS.merchants().length}`);
  assert.equal(FS.kinds().length, 14);
});

test('every curated merchant is found by its own name, and cleaning is idempotent', () => {
  const lost = [...FS.merchants()].filter(m => FS.merchantCanonical(m.name) !== m.name || !FS.merchantInfo(m.name).known).map(m => `${m.name} -> ${FS.merchantCanonical(m.name)}`);
  assert.deepEqual(lost, []);
  const names = FS.merchants().map(m => m.name);
  assert.equal(new Set(names.map(n => n.toLowerCase())).size, names.length, 'no duplicate canonical names');
  for (const n of ['SQ *BLUE DOOR BAKERY', 'TESCO STORES 3345 ON 02 JUL CPM', 'Oak Lane Lettings', 'NORTHWIND LABS LTD', 'www.example-shop.co.uk', '7-ELEVEN 1234']) {
    const once = FS.merchantCanonical(n);
    assert.equal(FS.merchantCanonical(once), once, n);
  }
});

test('processor prefixes, card trailers, store numbers and domains are stripped', () => {
  const cases = {
    'SQ *BLUE DOOR BAKERY': 'Blue Door Bakery', 'SumUp *Riverside Deli': 'Riverside Deli', 'SUMUP *RIVERSIDE DELI': 'Riverside Deli',
    'ZETTLE_*HARBOUR CAFE': 'Harbour Cafe', 'IZ *HARBOUR CAFE': 'Harbour Cafe', 'PAYPAL *EBAY': 'eBay', 'CRV*TESCO STORES 3345': 'Tesco',
    'Amznmktplace': 'Amazon', 'AMZNMKTPLACE': 'Amazon', 'AMZN Mktp UK*AB12CD3': 'Amazon', 'Amazon Marketplace': 'Amazon',
    'TESCO STORES 3345 ON 02 JUL CPM': 'Tesco', 'Tesco Stores 1234': 'Tesco', 'TESCO EXPRESS': 'Tesco', 'Tesco Mobile': 'Tesco Mobile',
    "Sainsbury's": "Sainsbury's", 'SAINSBURYS S/MKTS': "Sainsbury's", 'Transport for London': 'TfL', 'TFL TRAVEL CH': 'TfL',
    'UBER *EATS': 'Uber Eats', 'UBER *TRIP HELP.UBER.COM': 'Uber', 'M&S SIMPLY FOOD': 'M&S', 'MARKS & SPENCER': 'M&S',
    'JET2.COM': 'Jet2', 'JET PETROL STATION': 'Jet', 'BOOKING.COM': 'Booking.com', 'apple.com/bill': 'Apple', 'Www.voxi.co.uk': 'VOXI',
    'J D WETHERSPOON': 'Wetherspoon', 'McDonalds': "McDonald's", 'NORTHWIND LABS LTD': 'Northwind Labs', 'www.example-shop.co.uk': 'Example-Shop',
    'STREAMFLIX.COM ON 30 SEP BCC': 'Streamflix', 'Bean There Coffee On 02 Oct Cpm': 'Bean There Coffee', 'oak lane lettings': 'Oak Lane Lettings',
    'Northern Trains': 'Northern', 'E.ON NEXT': 'E.ON', 'Studio 54 Yoga': 'Studio 54 Yoga', '': 'Unknown',
  };
  for (const [raw, want] of Object.entries(cases)) assert.equal(FS.merchantCanonical(raw), want, raw);
  // Words that only look like brands stay themselves.
  assert.equal(FS.merchantCanonical('Three Horseshoes'), 'Three Horseshoes');
  assert.equal(FS.merchantCanonical('Next Level Gym'), 'Next Level Gym');
  // A payment to a person is never matched to a brand.
  assert.equal(FS.merchantInfo('Leon Chase', 'Payments to people').known, false);
  assert.equal(FS.merchantInfo('Chase', 'Shopping').known, true);
});

test('merchantKey groups the spellings of one merchant', () => {
  const k = FS.merchantKey;
  assert.equal(k('SQ *BLUE DOOR BAKERY'), k('Blue Door Bakery'));
  assert.equal(k('BLUE DOOR BAKERY 0042'), k('blue door bakery'));
  assert.equal(k('CRV*TESCO STORES 3345'), k('Tesco Express'));
  assert.notEqual(k('Tesco'), k('Tesco Mobile'));
});

test('monograms: brand first letter, curated acronyms, initials for people', () => {
  const m = FS.merchantMonogram;
  assert.equal(m('Tesco'), 'T');
  assert.equal(m("Sainsbury's"), 'S');
  assert.equal(m('Transport for London'), 'TfL');
  assert.equal(m('Amazon Marketplace'), 'A');
  assert.equal(m('H&M'), 'H&M');
  assert.equal(m('The Corner Bistro'), 'C');
  assert.equal(m('Jordan Lee', 'Payments to people'), 'JL');
  assert.equal(m('JD'), 'JD');
  assert.equal(m('7-Eleven'), '7');
  assert.equal(m('Studio 54 Yoga'), 'S');
  for (const x of FS.merchants()) assert.ok([...x.mono].length >= 1 && [...x.mono].length <= 3, x.name);
});

test('colours: monograms read at 4.5:1 and hashed tiles show on light and dark surfaces', () => {
  const bad = [...FS.merchants()].filter(x => FS.contrast(x.color, x.ink) < 4.5).map(x => `${x.name} ${x.color}/${x.ink} ${FS.contrast(x.color, x.ink).toFixed(2)}`);
  assert.deepEqual(bad, []);
  const seen = new Set();
  for (let i = 0; i < 600; i++) {
    const name = `Shop ${i} ${(i * 7919).toString(36)}`;
    const c = FS.merchantColor(name);
    assert.match(c, /^#[0-9a-f]{6}$/);
    assert.equal(FS.merchantColor(name), c, 'deterministic');
    assert.ok(FS.contrast(c, '#ffffff') >= 4.5, `${name} ${c} white text`);
    assert.ok(FS.contrast(c, SURFACE_LIGHT) >= 3 && FS.contrast(c, SURFACE_DARK) >= 2.5, `${name} ${c} visible`);
    seen.add(c);
  }
  assert.ok(seen.size > 300, `hash colours vary (${seen.size})`);
  assert.equal(FS.merchantColor('SQ *BLUE DOOR BAKERY'), FS.merchantColor('Blue Door Bakery'));
});

test('categories: every category the rules can produce has its own scene', () => {
  const cats = new Set([...RULES.rules.map(r => r.category), ...Object.entries(RULES.bank_category_map).filter(([k]) => !k.startsWith('_')).map(([, v]) => v), ...RULES.exclude_from_spending, 'Uncategorised', 'Income', 'Internal transfers', 'Payments to people', 'Cash']);
  const generic = [...cats].filter(c => c !== 'Other' && ['other'].includes(FS.categoryScene(c)));
  assert.deepEqual(generic, []);
  const want = {
    Groceries: 'groceries', 'Eating out': 'eating-out', Transport: 'transport', Housing: 'housing', Home: 'home', 'Bills & utilities': 'utilities',
    Subscriptions: 'subscriptions', Shopping: 'shopping', Health: 'health', 'Personal care': 'personal-care', Fitness: 'fitness', Travel: 'travel',
    Entertainment: 'entertainment', 'Gifts & charity': 'gifts', Education: 'education', 'Savings & investments': 'savings', Income: 'income',
    'Internal transfers': 'transfers', 'Payments to people': 'people', 'Fees & interest': 'fees', Cash: 'cash', Insurance: 'insurance', Tax: 'tax',
    'Debt repayments': 'debt', Family: 'family', 'Work expenses': 'work', Other: 'other', Uncategorised: 'uncategorised', Rent: 'housing',
  };
  for (const [c, s] of Object.entries(want)) assert.equal(FS.categoryScene(c), s, c);
  // Custom names fall back on the words in them.
  assert.equal(FS.categoryScene('Car insurance'), 'insurance');
  assert.equal(FS.categoryScene('Taxis'), 'car');
  assert.equal(FS.categoryScene('Council tax'), 'tax');
  assert.equal(FS.categoryScene('Coffee shops'), 'coffee');
  assert.equal(FS.categoryScene('Kids & childcare'), 'family');
  assert.equal(FS.categoryScene('Mystery thing'), 'other');
  assert.equal(FS.categoryScene(''), 'uncategorised');
  // The bank category refines within the same family only.
  assert.equal(FS.categoryScene('Eating out', 'coffee_snacks'), 'coffee');
  assert.equal(FS.categoryScene('Eating out', 'pubs_bars'), 'drinks');
  assert.equal(FS.categoryScene('Transport', 'fuel'), 'fuel');
  assert.equal(FS.categoryScene('Bills & utilities', 'mobile_phone'), 'phone');
  assert.equal(FS.categoryScene('Groceries', 'fuel'), 'groceries', 'the user\'s category wins across families');
  assert.equal(FS.categoryScene('Uncategorised', 'groceries'), 'uncategorised');
});

test('txKind: the memo code, the bank category, our category and the sign', () => {
  const k = (a, memo, bc, c, how, m) => FS.txKind({ a, memo, bc, c, how, m });
  assert.equal(k(-3.1, 'BEAN THERE COFFEE ON 02 OCT CPM', 'coffee_snacks', 'Eating out', 'bank'), 'contactless');
  assert.equal(k(-3.1, 'Bean There Coffee On 02 Oct Cpm', 'coffee_snacks', 'Eating out', 'bank'), 'contactless');
  assert.equal(k(-18, 'GAME STORE ON 03 OCT BCC', 'gaming', 'Entertainment', 'rule'), 'card');
  assert.equal(k(-10.99, 'STREAMFLIX ON 30 SEP BCC', 'streaming_digital', 'Subscriptions', 'rule'), 'subscription');
  assert.equal(k(-12, 'PHONE CO ON 01 OCT BCC', 'mobile_phone', 'Bills & utilities', 'rule', 'Phone Co'), 'card');
  assert.equal(FS.txKind({ a: -12, memo: 'PHONE CO ON 01 OCT BCC', c: 'Bills & utilities', m: 'Phone Co' }, { recurring: [{ merchant: 'Phone Co' }] }), 'subscription');
  assert.equal(k(-86, 'CITY POWER & WATER DDR', 'energy', 'Bills & utilities', 'bank'), 'direct-debit');
  assert.equal(k(-1150, 'OAK LANE LETTINGS STO', 'rent', 'Housing', 'bank'), 'standing-order');
  assert.equal(k(-1150, 'STANDING ORDER OAK LANE LETTINGS', null, 'Housing', 'rule'), 'standing-order');
  assert.equal(k(-25, 'JORDAN LEE DINNER FT', 'personal_transfer', 'Payments to people', 'bank'), 'transfer-out');
  assert.equal(k(-120, 'A TUTOR FT', 'education', 'Education', 'bank'), 'transfer-out');
  assert.equal(k(25, '12 34 JORDAN LEE FT', null, 'Income', 'default'), 'transfer-in');
  assert.equal(k(3150, 'NORTHWIND LABS 0042 BGC', 'salary', 'Income', 'bank'), 'income');
  assert.equal(k(3150, 'SALARY NORTHWIND LABS', null, 'Income', 'rule'), 'income');
  assert.equal(k(150, 'SOMEONE', null, 'Income', 'default'), 'income');
  assert.equal(k(39.99, 'PIXEL ELECTRONICS ON 28 SEP CRE', 'electronics', 'Shopping', 'bank'), 'refund');
  assert.equal(k(12, 'REFUND PIXEL ELECTRONICS', null, 'Shopping', 'rule'), 'refund');
  assert.equal(k(-40, 'HIGH ST ON 01 OCT ATM', 'cash_withdrawal', 'Cash', 'rule'), 'atm');
  assert.equal(k(-20, 'SUPERMARKET CASHPOINT Atm', 'cash_withdrawal', 'Groceries', 'rule'), 'atm');
  assert.equal(k(-200, 'TO SAVINGS FT', null, 'Internal transfers', 'rule'), 'own-transfer');
  assert.equal(k(-60, 'CARD SERVICES DDR', 'credit_card_repayment', 'Internal transfers', 'bank'), 'own-transfer');
  assert.equal(k(-50, 'CRYPTO EXCHANGE ON 01 OCT BCC', 'investments', 'Internal transfers', 'rule'), 'own-transfer');
  assert.equal(k(200, 'FROM CURRENT', null, 'Uncategorised', 'own-transfer'), 'own-transfer');
  assert.equal(k(-2.99, 'NON-STERLING TRANSACTION FEE', 'bank_fees', 'Fees & interest', 'bank'), 'fee');
  assert.equal(k(-5, 'MONTHLY ACCOUNT FEE', null, 'Fees & interest', 'rule'), 'fee');
  assert.equal(k(4.12, 'GROSS INTEREST', 'interest_earned', 'Income', 'bank'), 'interest');
  assert.equal(k(-3.4, 'OVERDRAFT INTEREST', null, 'Fees & interest', 'rule'), 'interest');
  assert.equal(k(-14, 'DART CHARGE', null, 'Transport', 'rule'), 'payment', 'a charge for a road is not a bank fee');
  assert.equal(k(-9, 'CONTACTLESS CORNER SHOP', null, 'Groceries', 'rule'), 'contactless');
  assert.equal(k(-9, 'CARD PAYMENT TO CORNER SHOP', null, 'Groceries', 'rule'), 'card');
  assert.equal(k(-9, 'CORNER SHOP', null, 'Groceries', 'rule'), 'payment');
  assert.equal(FS.txKind({ a: -9, memo: 'CORNER SHOP', type: 'DEB' }), 'card', 'a CSV type column counts too');
  assert.equal(FS.txKind({ a: -9, memo: 'GYM CLUB', type: 'Direct Debit' }), 'direct-debit');
  assert.equal(FS.txKind(null), 'payment');
  const kinds = new Set(FS.kinds().map(x => x.kind));
  for (const x of ['card', 'contactless', 'direct-debit', 'standing-order', 'transfer-in', 'transfer-out', 'income', 'refund', 'atm', 'subscription', 'fee', 'interest', 'own-transfer']) assert.ok(kinds.has(x), x);
});

test('markup: text is escaped, colours are sanitised, decorative unless labelled', () => {
  const evil = '<img src=x onerror=alert(1)>"\'&';
  const m = FS.merchantSymbol(evil, evil, { label: true });
  assert.ok(!m.includes('<img') && !m.includes('"\'&'), m);
  assert.match(m, /&lt;img src=x onerror=alert\(1\)&gt;&quot;&#39;&amp;/);
  assert.match(m, /role="img" aria-label="[^"<>]*"/);
  assert.match(FS.merchantSymbol('Tesco', 'Groceries'), /aria-hidden="true"/);
  const c = FS.categoryIcon(evil, { label: evil, color: 'red;background:url(http://x)' });
  assert.ok(!c.includes('<img') && !c.includes('url('), c);
  assert.match(FS.categoryIcon('Groceries', { color: '#16a34a' }), /style="--c:#16a34a"/);
  assert.match(FS.categoryIcon('Groceries', { color: 'var(--sw-green)' }), /--c:var\(--sw-green\)/);
  const t = FS.txTypeBadge('contactless', { label: evil });
  assert.ok(!t.includes('<img'), t);
  assert.match(FS.txTypeBadge('contactless', { compact: true }), /role="img" aria-label="Contactless payment"/);
  assert.match(FS.txTypeBadge({ a: -3, memo: 'X ON 01 OCT CPM' }), /k-contactless/);
  assert.match(FS.txTypeBadge('nonsense'), /k-payment/);
  assert.match(FS.merchantSymbol('Tesco', 'Groceries', { size: 'xs' }), /sz-xs/);
  assert.doesNotMatch(FS.merchantSymbol('Tesco', 'Groceries', { size: 'xs' }), /fsym-badge/, 'no badge at xs');
  assert.match(FS.merchantSymbol('Costa', 'Eating out'), /c-amber/, 'the curated, more specific glyph (coffee)');
  assert.match(FS.merchantSymbol('Costa', 'Work expenses'), /c-indigo/, 'but the user\'s category when they filed it elsewhere');
  assert.match(FS.categoryIcon('Travel', { live: 'loop' }), /fsym-loop is-live/);
  assert.match(FS.categoryIcon('Travel', { live: 'once' }), /is-live is-once/);
  assert.match(FS.categoryIcon('Travel'), /fsym-hover/);
  assert.doesNotMatch(FS.categoryIcon('Travel', { live: false }), /fsym-hover|is-live/);
});

test('scenes: original inline SVG, no ids or external references, a glyph and a swatch each', () => {
  const swatches = new Set(['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet', 'slate']);
  for (const s of FS.scenes()) {
    const html = FS.categoryIcon(s.label, { scene: s.key });
    assert.match(html, /<svg class="fs-scene fs-[a-z-]+" viewBox="0 0 64 64" aria-hidden="true"/, s.key);
    assert.match(html, /class="fx [^"]*fx-[a-z0-9-]+/, `${s.key} moves`);
    assert.doesNotMatch(html, /\sid=|href|url\(|<image|<text|<script|NaN|undefined/, s.key);
    assert.ok(swatches.has(s.colour), s.key);
    assert.match(FS.categoryGlyph(s.label, { scene: s.key }), /<svg class="fsym-mini"/);
  }
  assert.ok(FS.scenes().length >= 30);
  for (const m of FS.merchants()) assert.ok(FS.scenes().some(s => s.key === m.scene), `${m.name}: ${m.scene}`);
  assert.doesNotMatch(SRC, /https?:\/\//, 'no URLs: nothing is fetched');
});

test('CSS: every motion class has keyframes that move transform/opacity only; reduced motion and hidden tabs are handled', () => {
  const used = new Set();
  for (const s of FS.scenes()) for (const m of FS.categoryIcon(s.label, { scene: s.key }).matchAll(/\bfx-([a-z0-9-]+)/g)) used.add(m[1]);
  const missing = [...used].filter(n => !new RegExp(`\\.fx-${n}\\s*\\{[^}]*--an:`).test(CSS));
  assert.deepEqual(missing, []);
  const frames = new Map([...CSS.matchAll(/@keyframes ([a-z0-9-]+) \{([\s\S]*?)\}\s*\}/g)].map(m => [m[1], m[2]]));
  const named = new Set([...CSS.matchAll(/--(?:an1?|tx-an):\s*([a-z0-9-]+)/g)].map(m => m[1]));
  for (const n of named) if (n !== 'none') assert.ok(frames.has(n), `@keyframes ${n}`);
  for (const [n, body] of frames) {
    const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]);
    assert.deepEqual(props.filter(p => p !== 'transform' && p !== 'opacity'), [], `${n} animates layout or paint`);
  }
  // Loops (--an) begin at rest, so hovering never makes a part blink away first.
  const loops = new Set([...CSS.matchAll(/--an:\s*([a-z0-9-]+)/g)].map(m => m[1]));
  for (const n of loops) {
    const first = /(?:^|\})\s*((?:0%|from)[^{]*)\{([^}]*)\}/.exec(frames.get(n) || '');
    if (!first) continue;   // "to" only: starts at rest
    const t = /transform:\s*([^;]+);/.exec(first[2]), o = /opacity:\s*([\d.]+)/.exec(first[2]);
    assert.ok(!t || t[1].trim() === 'none', `${n} starts moved: ${first[2]}`);
    assert.ok(!o || Number(o[1]) >= 0.85, `${n} starts faded: ${first[2]}`);
  }
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\) \{[^}]*\.fsym[^}]*animation: none !important/);
  assert.match(CSS, /html\[data-motion="reduced"\][^{]*\.fsym[^{]*\{ animation: none !important/);
  assert.match(CSS, /html\.fsym-paused[^{]*\{ animation-play-state: paused !important/);
  assert.match(SRC, /visibilitychange[\s\S]{0,120}fsym-paused/);
  // No private hex palette in the stylesheet (brand colours live in the JS map; chrome uses tokens).
  const hex = [...CSS.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0].toLowerCase()).filter(h => h !== '#fff');
  assert.deepEqual(hex, []);
});
