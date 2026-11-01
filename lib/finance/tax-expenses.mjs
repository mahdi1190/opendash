// lib/finance/tax-expenses.mjs - the expense finder: what in the bank may be claimable against a self-employed period. Pure.
// It suggests; the person ticks. Rules in one table, each with a plain reason, a business-use share and a confidence.
// Sources, read on 30 Oct 2026:
//   https://www.gov.uk/expenses-if-youre-self-employed (and /travel, /clothing, /office-property)   what can and cannot be claimed
//   SA103F notes 2026 https://assets.publishing.service.gov.uk/media/69c26565cfa346b9d4704b35/SA103F_Notes_2026.pdf   which box each cost goes in
//   Cash basis: equipment is an expense; only cars take capital allowances. Traditional accounting: equipment takes capital allowances.
//
//   findExpenses(input, periods, rec, o)  -> {suggestions: [...], cannot: [...], ask: [...]}
//   rule fields: re (merchant or memo), cat (tax-tab.mjs CLAIM_CATS), pct (default business share), confidence: high|medium|low, why, what

const r2 = (x) => Math.round(x * 100) / 100;
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };

export const EXPENSE_RULES = Object.freeze([
  { id: 'software', what: 'Software and online tools', cat: 'office', pct: 100, confidence: 'high', why: 'Software and subscriptions used for your work can be claimed. If you also use it privately, claim only the work share.',
    re: /\b(adobe|figma|github|gitlab|notion|atlassian|jira|linear\.app|slack|zoom\.us|zoom video|dropbox|canva|microsoft ?365|office ?365|google ?workspace|gsuite|1password|lastpass|jetbrains|grammarly|openai|anthropic|claude\.ai|chatgpt|vercel|netlify|digitalocean|heroku|aws|amazon web services|cloudflare|godaddy|namecheap|squarespace|wix\.com|mailchimp|xero|quickbooks|freeagent)\b/i },
  { id: 'phone', what: 'Phone or broadband, the work share', cat: 'office', pct: 30, confidence: 'medium', why: 'You can claim the part you use for work. We start at 30%; change it to fit how much you really use it.',
    re: /\b(vodafone|o2|ee limited|\bee\b|three mobile|giffgaff|tesco mobile|voxi|smarty|bt group|bt broadband|virgin media|sky broadband|talktalk|plusnet|hyperoptic)\b/i },
  { id: 'equipment', what: 'Equipment for your work', cat: 'capital', pct: 100, confidence: 'medium', why: 'A laptop, monitor or tools for your work can be claimed. Only claim it if you bought it mainly for work.',
    re: /\b(currys|apple store|apple\.com\/uk|dell|lenovo|scan computers|overclockers|ebuyer|novatech|ikea office|wex photo|screwfix|toolstation)\b/i, min: 40 },
  { id: 'fees', what: 'Accountant, legal or professional fees', cat: 'fees', pct: 100, confidence: 'high', why: 'Fees for an accountant or solicitor for your business, and indemnity insurance, can be claimed.',
    re: /\b(accountan|bookkeep|solicitor|indemnity|hiscox|simply business|companies house)\b/i },
  { id: 'membership', what: 'Professional body or trade journal', cat: 'other', pct: 100, confidence: 'high', why: 'Fees to a professional body and trade or professional journals for your work can be claimed.',
    re: /\b(institute of|chartered|royal society|bcs\b|ieee|cipd|acca|icaew|rics|engineering council|institution of|professional membership)\b/i },
  { id: 'training', what: 'Training for your work', cat: 'other', pct: 100, confidence: 'medium', why: 'Courses that refresh or update skills you already use in your work can be claimed. Training for something new usually cannot.',
    re: /\b(udemy|coursera|pluralsight|linkedin learning|skillshare|training|o'reilly|masterclass)\b/i },
  { id: 'travel', what: 'A work trip', cat: 'travel', pct: 100, confidence: 'low', why: 'Trains, buses, taxis, flights and hotels for work trips can be claimed. Your ordinary journey between home and a regular workplace cannot.',
    re: /\b(trainline|lner|avanti|gwr|crosscountry|northern rail|southeastern|tfl|national express|uber|bolt\.eu|premier inn|travelodge|booking\.com|ryanair|easyjet|jet2|british airways)\b/i, cats: ['Transport', 'Travel'] },
  { id: 'ads', what: 'Advertising or your website', cat: 'ads', pct: 100, confidence: 'medium', why: 'Advertising and website costs can be claimed. Entertaining clients cannot.',
    re: /\b(google ads|facebook ads|meta platforms|linkedin ads|vistaprint|moo\.com|fiverr|upwork)\b/i },
  { id: 'office', what: 'Office supplies and postage', cat: 'office', pct: 100, confidence: 'low', why: 'Stationery, printing and postage for your work can be claimed.',
    re: /\b(viking direct|ryman|staples|royal mail|parcelforce|evri|hermes|ink ?jet|cartridge)\b/i },
  { id: 'bank', what: 'Business bank fees', cat: 'finance', pct: 100, confidence: 'medium', why: 'Charges on an account you use for your business can be claimed.',
    re: /\b(tide business|starling business|monzo business|stripe fee|paypal fee|sumup|gocardless)\b/i },
]);
/** Things that look claimable and are not: shown with the reason, so nobody has to ask. */
export const CANNOT_RULES = Object.freeze([
  { id: 'clothes', title: 'Everyday clothes', why: 'Clothes you could wear anyway cannot be claimed, even if you only wear them to work. Protective clothing, uniforms and costumes can.', re: /\b(next retail|\bnext\b|m&s|marks & spencer|zara|h&m|uniqlo|asos|primark|john lewis clothing|tk ?maxx)\b/i, cats: ['Clothing', 'Clothes'] },
  { id: 'commute', title: 'Your ordinary commute', why: 'Travel between home and a regular place of work cannot be claimed. A trip to a client or a temporary site can.', re: /\b(season ticket|oyster|contactless tfl|commut)\b/i },
  { id: 'fines', title: 'Fines and penalties', why: 'Parking tickets, speeding fines and tax penalties cannot be claimed.', re: /\b(pcn|penalty|parking fine|dvla fine|fixed penalty)\b/i },
  { id: 'entertain', title: 'Entertaining clients', why: 'Taking clients out is not claimable. Staff events can be, within limits.', re: /\b(client dinner|hospitality)\b/i },
]);
export const NEVER_NOTES = Object.freeze([
  { title: 'A bill someone else paid', why: 'If your employer or client paid for it, or paid you back, you did not bear the cost, so you cannot claim it.' },
  { title: 'Your ordinary commute', why: 'Travel between home and a regular place of work cannot be claimed.' },
  { title: 'Everyday clothes', why: 'Suits, shirts and ordinary shoes cannot be claimed, even if you only wear them to work.' },
  { title: 'Paying yourself', why: 'Money you take out for yourself is not a cost.' },
]);

const inRange = (n, p) => (!p.fromN || n >= p.fromN) && (!p.toN || n <= p.toN);
const dayN = (iso) => Math.round(Date.parse(iso + 'T00:00:00Z') / 864e5);

/**
 * input: MBM.fromAnalysis's {tx}. periods: [{id, name, from, to}] the self-employed periods, inside the tax year (from/to already cut to it).
 * rec: the tax year's record (claims, dismissed). o: {savingFor(amount) -> pounds saved, reimbursed: Set of transaction keys someone paid back, traditional}.
 */
export function findExpenses(input, periods, rec, o = {}) {
  const taken = new Set((rec.claims || []).map(c => c.tx).filter(Boolean));
  const dismissed = rec.dismissed || {};
  const reimbursed = o.reimbursed || new Set();
  const ps = periods.map(p => ({ ...p, fromN: p.from ? dayN(p.from) : null, toN: p.to ? dayN(p.to) : null }));
  const out = [], cannot = new Map(), ask = [];
  for (const t of (input && input.tx) || []) {
    if (t.kind !== 'spend' || !(t.s > 0)) continue;
    const period = ps.find(p => inRange(t.n, p));
    if (!period) continue;
    if (taken.has(t.k) || dismissed[t.k] || (o.keyOf && reimbursed.has(o.keyOf(t)))) continue;
    const text = `${t.m} ${t.memo || ''}`;
    const no = CANNOT_RULES.find(r => r.re.test(text) || (r.cats && r.cats.includes(t.c)));
    if (no) { const c = cannot.get(no.id) || { id: no.id, title: no.title, why: no.why, total: 0, count: 0 }; c.total = r2(c.total + t.s); c.count++; cannot.set(no.id, c); continue; }
    const rule = EXPENSE_RULES.find(r => r.re.test(text) && (!r.min || t.s >= r.min));
    if (!rule) continue;
    const cat = rule.cat === 'capital' && !o.traditional ? 'repairs' : rule.cat;
    out.push({ tx: t.k, date: t.d, merchant: t.m, category: t.c, amount: r2(t.s), rule: rule.id, what: rule.what, cat, pct: rule.pct, confidence: rule.confidence, why: rule.why, period: period.id, periodName: period.name, saves: o.savingFor ? o.savingFor(r2(t.s * rule.pct / 100)) : null, savesIfCosts: o.savingIfCosts ? o.savingIfCosts(r2(t.s * rule.pct / 100)) : null });
  }
  out.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.confidence] - { high: 0, medium: 1, low: 2 }[b.confidence]) || b.amount - a.amount);
  // The running question: a purchase in the last 14 days, or a new payment, is asked about at the time.
  const todayN = input && input.anchor ? input.anchor : 0;
  for (const s of out) if (dayN(s.date) >= todayN - 14 && !(rec.seen || {})[s.tx]) ask.push(s);
  return { suggestions: out, cannot: [...cannot.values()], never: NEVER_NOTES, ask: ask.slice(0, 5), total: r2(out.reduce((a, s) => a + s.amount * s.pct / 100, 0)) };
}

/** Money coming in during a self-employed period that may be a client's payment, for "Is this for your work?". */
export function findPayments(input, periods, rec, o = {}) {
  const known = new Set((rec.payments || []).map(p => p.tx).filter(Boolean));
  const dismissed = rec.dismissed || {};
  const salaryNames = new Set((o.salaryMerchants || []).map(s => String(s).toLowerCase()));
  // A payer who pays about the same again and again looks like a wage, not a client.
  const byPayer = new Map();
  for (const t of (input && input.tx) || []) if (t.kind === 'income' && t.inc > 0) { const a = byPayer.get(t.m) || []; a.push(t.inc); byPayer.set(t.m, a); }
  const regular = (m) => { const a = byPayer.get(m) || []; if (a.length < 3) return false; const s = [...a].sort((x, y) => x - y), mid = s[s.length >> 1]; return s.filter(v => Math.abs(v - mid) <= Math.max(5, mid * 0.05)).length >= 3; };
  const ps = periods.map(p => ({ ...p, fromN: p.from ? dayN(p.from) : null, toN: p.to ? dayN(p.to) : null }));
  const rows = [];
  for (const t of (input && input.tx) || []) {
    if (t.kind !== 'income' || !(t.inc > 0)) continue;
    const period = ps.find(p => inRange(t.n, p));
    if (!period || known.has(t.k) || dismissed[t.k]) continue;
    if (salaryNames.has(String(t.m).toLowerCase()) || /\b(salary|payroll|wages|pay ?day|pension|refund|interest|cashback|hmrc|dwp|child benefit|transfer)\b/i.test(`${t.m} ${t.memo || ''}`) || regular(t.m)) continue;
    if ([...salaryNames].some(n => n && String(t.m).toLowerCase().includes(n))) continue;
    rows.push({ tx: t.k, date: t.d, from: t.m, amount: r2(t.inc), period: period.id, periodName: period.name });
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows.slice(0, 40);
}

/** Pay for the bill: an HMRC payment seen in the bank. */
export function findHmrcPayments(input, fromIso, toIso) {
  const out = [];
  const a = dayN(fromIso), b = dayN(toIso);
  for (const t of (input && input.tx) || []) {
    if (t.n < a || t.n > b || !(t.s > 0 || t.a < 0)) continue;
    if (/\b(hmrc|hm revenue|inland revenue|shipley|cumbernauld|self assessment)\b/i.test(`${t.m} ${t.memo || ''}`)) out.push({ tx: t.k, date: t.d, merchant: t.m, amount: r2(Math.abs(num(t.a))) });
  }
  return out.sort((x, y) => x.date.localeCompare(y.date));
}
