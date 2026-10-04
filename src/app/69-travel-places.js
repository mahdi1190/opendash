/* ============================================================
   TRAVEL PLACES (pure). Owner: PLACES (travel spec 3.4, 4.6, 4.8, 4.9).
   Helpers over the offline tables of 69-travel-data.js (TR_DATA,
   trPlaceTables()): a zone's country and city, country facts, city and
   airport lookups, the nearest city to a position, greetings in the local
   language, and flags drawn as SVG (Windows shows emoji flags as letters,
   so they are never used). Country, currency and language names come from
   Intl at run time: there is no name table.
   No DOM and no page globals (tests/travel-data.test.mjs checks it), except
   the Clock plug-in at the very end. lib/travel-data.mjs evaluates this file
   for Node, so the page and the server give the same answers.

     trZoneInfo(zone)              {zone, cc, lat, lon, cityId, label, single, etc} | null (unknown)
     trZoneCountry(zone)           'JP' | ''  (UTC and Etc/* are not places)
     trZoneLabel(zone)             'Tokyo', 'Kolkata', 'UTC', 'UTC+9'
     trCountry(cc)                 {cc, name, ccy, langs, lang, plugs, left, emergency, weekend, kind, capital, flag} | null
     trCity(id)                    {id, name, cc, zone, lat, lon, pop, kind, lang, aliases} | null (read only; ids 'tokyo-jp')
     trPlaceKind({cityId, cc})     'towers' | 'oldtown' | 'coastal' | 'mountain' | 'desert' | 'tropical' | 'nordic' | 'lowlands'
     trCityFind(name, o)           the city a name means; o.cc / o.near {lat, lon} break ties, else the biggest
     trNearestCity(lat, lon, o)    {city, km} within o.maxKm (50) | null. Geo fixes: reduce, never store.
     trNearestCountry(lat, lon)    the country of the nearest known point within 400 km | ''
     trAirportCity(iata)           the city an IATA code (or a metro code: LON, NYC) serves | null
     trKm(a, b)                    great-circle kilometres between two {lat, lon}
     trCurrencyInfo(ccOrCcy)       {code, name, symbol} | null
     trPlugAdvice(homeCc, cc)      null when the home plug fits, else {types: ['C', 'F'], text}
     trGreetLang(cc, cityId)       the greeting's language ('ja', 'pt', 'zh-Hant' ...), 'en' at worst
     trGreetSlot(hour)             'm' 05-12, 'a' 12-17, 'e' 17-22, 'h' 22-05 ("good night" is a farewell)
     trGreeting(o)                 {lang, slot, text, roman, meaning, local} for o = {cc, cityId?, lang?, hour}
     trThanks(o)                   {lang, text, roman}   ("Useful: Arigatō, thank you")
     trFlagSpec(cc)                the country's one-line flag spec ('' when none)
     trFlagSvg(cc | {spec})        '<svg ...>' drawn from the spec ('' when none)
     trFlagHtml(cc, o)             the chip: SVG flag, else a two-letter chip; aria-label = the country's name
                                   (o.sheen: one 900 ms sweep when it first appears; o.cls; o.label)
   ============================================================ */

/* ---------- names from Intl (no name table) ---------- */
const _TRP_REGION_FIX = { HK: 'Hong Kong', MO: 'Macau', CD: 'DR Congo', CG: 'Congo', PS: 'Palestine', MM: 'Myanmar', VA: 'Vatican City', XK: 'Kosovo' };
let _trpDn = null, _trpCcyDn = null;
const _trpCache = { country: new Map(), ccy: new Map(), names: null };
function _trpRegionName(cc) {
  if (_TRP_REGION_FIX[cc]) return _TRP_REGION_FIX[cc];
  if (_trpDn === null) { try { _trpDn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { _trpDn = false; } }
  let n = '';
  try { n = _trpDn ? _trpDn.of(cc) : ''; } catch (e) { n = ''; }
  return n && n !== cc ? n : cc;
}
function _trpEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------- zones ---------- */
const _TRP_ETC = /^(UTC|UCT|GMT|GMT[+-]0|Universal|Zulu|Greenwich|Etc\/.+)$/;
function _trpEtcLabel(z) {
  const m = /^Etc\/GMT([+-])(\d{1,2})$/.exec(z);
  if (m && Number(m[2])) return 'UTC' + (m[1] === '+' ? '−' : '+') + Number(m[2]);   // Etc/GMT-9 is UTC+9
  return 'UTC';
}
function trZoneInfo(zone) {
  const z0 = String(zone == null ? '' : zone).trim();
  if (!z0) return null;
  if (_TRP_ETC.test(z0)) return { zone: z0, cc: '', lat: null, lon: null, cityId: '', label: _trpEtcLabel(z0), single: false, etc: true };
  const T = trPlaceTables();
  let z = T.zones[z0] ? z0 : (T.links[z0] || '');
  if (!z && typeof canonZone === 'function') { const c = canonZone(z0); z = T.zones[c] ? c : (T.links[c] || ''); }
  if (!z) return null;
  const e = T.zones[z];
  const city = e.city ? T.byId.get(e.city) : null;
  return { zone: z, cc: e.cc, lat: e.lat, lon: e.lon, cityId: city ? city.id : '', label: city ? city.name : z.split('/').pop().replace(/_/g, ' '),
    single: T.states.indexOf(e.cc) >= 0, etc: false };
}
function trZoneCountry(zone) { const i = trZoneInfo(zone); return i && !i.etc ? i.cc : ''; }
function trZoneLabel(zone) {
  const i = trZoneInfo(zone);
  if (i) return i.label;
  const z = String(zone || '');
  return z ? z.split('/').pop().replace(/_/g, ' ') : '';
}

/* ---------- countries ---------- */
function trCountry(cc) {
  const C = String(cc || '').toUpperCase();
  if (_trpCache.country.has(C)) return _trpCache.country.get(C);
  const c = /^[A-Z]{2}$/.test(C) ? trPlaceTables().countries[C] : null;
  const out = c ? Object.freeze({
    cc: C, name: _trpRegionName(C), ccy: c.ccy, langs: c.langs.slice(), lang: trGreetLang(C), plugs: c.plugs, left: c.left, emergency: c.emergency,
    weekend: c.weekend.slice(), kind: c.kind, capital: c.capital, flag: c.flag,
  }) : null;
  _trpCache.country.set(C, out);
  return out;
}
function trCurrencyInfo(x) {
  let code = String(x || '').toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) { const c = trPlaceTables().countries[code]; code = c ? c.ccy : ''; }
  if (!/^[A-Z]{3}$/.test(code)) return null;
  if (_trpCache.ccy.has(code)) return _trpCache.ccy.get(code);
  let name = code, symbol = code;
  try { if (_trpCcyDn === null) _trpCcyDn = new Intl.DisplayNames(['en'], { type: 'currency' }); name = _trpCcyDn.of(code) || code; } catch (e) { _trpCcyDn = false; }
  try {
    const p = new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(1).find(q => q.type === 'currency');
    if (p && p.value) symbol = p.value;
  } catch (e) { /* an unknown code keeps its letters */ }
  const out = Object.freeze({ code, name, symbol });
  _trpCache.ccy.set(code, out);
  return out;
}
/** Plug types are IEC letters. An adapter is needed when none of home's types is used there. */
function trPlugAdvice(homeCc, cc) {
  const T = trPlaceTables();
  const h = T.countries[String(homeCc || '').toUpperCase()], d = T.countries[String(cc || '').toUpperCase()];
  if (!h || !d || !h.plugs || !d.plugs) return null;
  if ([...h.plugs].some(t => d.plugs.indexOf(t) >= 0)) return null;
  const types = [...d.plugs];
  return { types, text: `Type ${types.join('/')} plugs` };
}

/* ---------- cities ---------- */
function trCity(id) { return id ? trPlaceTables().byId.get(String(id)) || null : null; }
function _trpNames() {
  if (_trpCache.names) return _trpCache.names;
  const m = new Map();
  const add = (n, c) => { const f = trdFold(n); if (!f) return; const l = m.get(f); if (!l) m.set(f, [c]); else if (l.indexOf(c) < 0) l.push(c); };
  for (const c of trPlaceTables().cities) { add(c.name, c); for (const a of c.aliases) add(a, c); }
  _trpCache.names = m;
  return m;
}
function trKm(a, b) {
  if (!a || !b) return Infinity;
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}
function trCityFind(name, o) {
  o = o || {};
  const list = _trpNames().get(trdFold(name));
  if (!list || !list.length) return null;
  const cc = String(o.cc || '').toUpperCase();
  let cand = cc ? list.filter(c => c.cc === cc) : list;
  if (!cand.length) { if (o.strict) return null; cand = list; }
  if (o.near && Number.isFinite(Number(o.near.lat))) return cand.slice().sort((a, b) => trKm(a, o.near) - trKm(b, o.near))[0];
  return cand[0];   // the table is biggest first
}
function trNearestCity(lat, lon, o) {
  o = o || {};
  const p = { lat: Number(lat), lon: Number(lon) };
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return null;
  const max = Number.isFinite(Number(o.maxKm)) ? Number(o.maxKm) : 50;
  let best = null, bestKm = Infinity;
  for (const c of trPlaceTables().cities) {
    if (Math.abs(c.lat - p.lat) > 3) continue;   // cheap reject (about 330 km of latitude)
    const k = trKm(p, c);
    if (k < bestKm) { best = c; bestKm = k; }
  }
  return best && bestKm <= max ? { city: best, km: Math.round(bestKm * 10) / 10 } : null;
}
function trNearestCountry(lat, lon) {
  const p = { lat: Number(lat), lon: Number(lon) };
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return '';
  const T = trPlaceTables();
  let cc = '', bestKm = Infinity;
  for (const c of T.cities) { const k = trKm(p, c); if (k < bestKm) { bestKm = k; cc = c.cc; } }
  for (const z in T.zones) { const e = T.zones[z]; const k = trKm(p, e); if (k < bestKm) { bestKm = k; cc = e.cc; } }
  return bestKm <= 400 ? cc : '';
}
function trAirportCity(iata) {
  const id = trPlaceTables().airports[String(iata || '').toUpperCase()];
  return id ? trCity(id) : null;
}
/** The place kind (4.6) that picks the scene and the motif: the city's, else the country's, else 'oldtown'. */
function trPlaceKind(o) {
  o = o || {};
  const c = o.cityId ? trCity(o.cityId) : null;
  if (c && c.kind) return c.kind;
  const k = trCountry(o.cc || (c && c.cc));
  return (k && k.kind) || 'oldtown';
}

/* ---------- greetings (4.8) ----------
   Per language: m morning, a afternoon, e evening, h hello (22-05), thanks.
   Each entry is [text, romanisation (non-Latin scripts), meaning when it is
   not the slot's own]. A language with one greeting for the whole day has
   'h' only. Fewer languages beats wrong ones: an entry nobody can
   vouch for is cut, and the country's next language (or English) is used. */
const TR_GREET = Object.freeze({
  en: { m: ['Good morning'], a: ['Good afternoon'], e: ['Good evening'], h: ['Hello'], thanks: ['Thank you'] },
  fr: { m: ['Bonjour', '', 'good day'], a: ['Bonjour', '', 'good day'], e: ['Bonsoir'], h: ['Bonsoir', '', 'good evening'], thanks: ['Merci'] },
  de: { m: ['Guten Morgen'], a: ['Guten Tag', '', 'good day'], e: ['Guten Abend'], h: ['Hallo'], thanks: ['Danke'] },
  es: { m: ['Buenos días'], a: ['Buenas tardes'], e: ['Buenas noches', '', 'good evening'], h: ['Hola'], thanks: ['Gracias'] },
  pt: { m: ['Bom dia'], a: ['Boa tarde'], e: ['Boa noite', '', 'good evening'], h: ['Olá'], thanks: ['Obrigado / Obrigada'] },
  it: { m: ['Buongiorno'], a: ['Buon pomeriggio'], e: ['Buonasera'], h: ['Ciao'], thanks: ['Grazie'] },
  nl: { m: ['Goedemorgen'], a: ['Goedemiddag'], e: ['Goedenavond'], h: ['Hallo'], thanks: ['Dank je wel'] },
  ca: { m: ['Bon dia'], a: ['Bona tarda'], e: ['Bon vespre'], h: ['Hola'], thanks: ['Gràcies'] },
  sv: { m: ['God morgon'], a: ['God eftermiddag'], e: ['God kväll'], h: ['Hej'], thanks: ['Tack'] },
  nb: { m: ['God morgen'], a: ['God ettermiddag'], e: ['God kveld'], h: ['Hei'], thanks: ['Takk'] },
  da: { m: ['Godmorgen'], a: ['God eftermiddag'], e: ['Godaften'], h: ['Hej'], thanks: ['Tak'] },
  fi: { m: ['Hyvää huomenta'], a: ['Hyvää iltapäivää'], e: ['Hyvää iltaa'], h: ['Hei'], thanks: ['Kiitos'] },
  is: { m: ['Góðan daginn', '', 'good day'], a: ['Góðan daginn', '', 'good day'], e: ['Gott kvöld'], h: ['Halló'], thanks: ['Takk'] },
  pl: { m: ['Dzień dobry', '', 'good day'], a: ['Dzień dobry', '', 'good day'], e: ['Dobry wieczór'], h: ['Cześć'], thanks: ['Dziękuję'] },
  cs: { m: ['Dobré ráno'], a: ['Dobré odpoledne'], e: ['Dobrý večer'], h: ['Ahoj'], thanks: ['Děkuji'] },
  sk: { m: ['Dobré ráno'], a: ['Dobré popoludnie'], e: ['Dobrý večer'], h: ['Ahoj'], thanks: ['Ďakujem'] },
  hu: { m: ['Jó reggelt'], a: ['Jó napot', '', 'good day'], e: ['Jó estét'], h: ['Szia'], thanks: ['Köszönöm'] },
  ro: { m: ['Bună dimineața'], a: ['Bună ziua', '', 'good day'], e: ['Bună seara'], h: ['Salut'], thanks: ['Mulțumesc'] },
  hr: { m: ['Dobro jutro'], a: ['Dobar dan', '', 'good day'], e: ['Dobra večer'], h: ['Bok'], thanks: ['Hvala'] },
  sl: { m: ['Dobro jutro'], a: ['Dober dan', '', 'good day'], e: ['Dober večer'], h: ['Živjo'], thanks: ['Hvala'] },
  sq: { m: ['Mirëmëngjes'], a: ['Mirëdita', '', 'good day'], e: ['Mirëmbrëma'], h: ['Përshëndetje'], thanks: ['Faleminderit'] },
  lt: { m: ['Labas rytas'], a: ['Laba diena', '', 'good day'], e: ['Labas vakaras'], h: ['Labas'], thanks: ['Ačiū'] },
  lv: { m: ['Labrīt'], a: ['Labdien', '', 'good day'], e: ['Labvakar'], h: ['Sveiki'], thanks: ['Paldies'] },
  et: { m: ['Tere hommikust'], a: ['Tere päevast', '', 'good day'], e: ['Tere õhtust'], h: ['Tere'], thanks: ['Aitäh'] },
  tr: { m: ['Günaydın'], a: ['İyi günler', '', 'good day'], e: ['İyi akşamlar'], h: ['Merhaba'], thanks: ['Teşekkürler'] },
  az: { m: ['Sabahınız xeyir'], a: ['Günortanız xeyir'], e: ['Axşamınız xeyir'], h: ['Salam'], thanks: ['Təşəkkür edirəm'] },
  id: { m: ['Selamat pagi'], a: ['Selamat siang'], e: ['Selamat malam'], h: ['Halo'], thanks: ['Terima kasih'] },
  ms: { m: ['Selamat pagi'], a: ['Selamat petang'], e: ['Selamat malam'], h: ['Helo'], thanks: ['Terima kasih'] },
  tl: { m: ['Magandang umaga'], a: ['Magandang hapon'], e: ['Magandang gabi'], h: ['Kumusta'], thanks: ['Salamat'] },
  vi: { h: ['Xin chào'], thanks: ['Cảm ơn'] },
  sw: { m: ['Habari za asubuhi'], a: ['Habari za mchana'], e: ['Habari za jioni'], h: ['Jambo'], thanks: ['Asante'] },
  af: { m: ['Goeie môre'], a: ['Goeie middag'], e: ['Goeie naand'], h: ['Hallo'], thanks: ['Dankie'] },
  zu: { h: ['Sawubona'], thanks: ['Ngiyabonga'] },
  el: { m: ['Καλημέρα', 'Kaliméra'], a: ['Γεια σας', 'Yia sas', 'hello'], e: ['Καλησπέρα', 'Kalispéra'], h: ['Γεια σας', 'Yia sas'], thanks: ['Ευχαριστώ', 'Efcharistó'] },
  ru: { m: ['Доброе утро', 'Dobroye utro'], a: ['Добрый день', 'Dobryy den', 'good day'], e: ['Добрый вечер', 'Dobryy vecher'], h: ['Здравствуйте', 'Zdravstvuyte'], thanks: ['Спасибо', 'Spasibo'] },
  uk: { m: ['Доброго ранку', 'Dobroho ranku'], a: ['Добрий день', 'Dobryi den', 'good day'], e: ['Добрий вечір', 'Dobryi vechir'], h: ['Привіт', 'Pryvit'], thanks: ['Дякую', 'Diakuiu'] },
  bg: { m: ['Добро утро', 'Dobro utro'], a: ['Добър ден', 'Dobar den', 'good day'], e: ['Добър вечер', 'Dobar vecher'], h: ['Здравейте', 'Zdraveyte'], thanks: ['Благодаря', 'Blagodarya'] },
  sr: { m: ['Добро јутро', 'Dobro jutro'], a: ['Добар дан', 'Dobar dan', 'good day'], e: ['Добро вече', 'Dobro veče'], h: ['Здраво', 'Zdravo'], thanks: ['Хвала', 'Hvala'] },
  mk: { m: ['Добро утро', 'Dobro utro'], a: ['Добар ден', 'Dobar den', 'good day'], e: ['Добра вечер', 'Dobra večer'], h: ['Здраво', 'Zdravo'], thanks: ['Благодарам', 'Blagodaram'] },
  ka: { m: ['დილა მშვიდობისა', 'Dila mshvidobisa'], a: ['გამარჯობა', 'Gamarjoba', 'hello'], e: ['საღამო მშვიდობისა', 'Saghamo mshvidobisa'], h: ['გამარჯობა', 'Gamarjoba'], thanks: ['მადლობა', 'Madloba'] },
  hy: { m: ['Բարի լույս', 'Bari luys'], a: ['Բարի օր', 'Bari or', 'good day'], e: ['Բարի երեկո', 'Bari yereko'], h: ['Բարև', 'Barev'], thanks: ['Շնորհակալություն', 'Shnorhakalutyun'] },
  he: { m: ['בוקר טוב', 'Boker tov'], a: ['צהריים טובים', 'Tsohorayim tovim'], e: ['ערב טוב', 'Erev tov'], h: ['שלום', 'Shalom'], thanks: ['תודה', 'Toda'] },
  ar: { m: ['صباح الخير', 'Sabah al-khair'], a: ['مساء الخير', 'Masa al-khair', 'good afternoon'], e: ['مساء الخير', 'Masa al-khair'], h: ['مرحبا', 'Marhaba'], thanks: ['شكرا', 'Shukran'] },
  fa: { h: ['سلام', 'Salām'], thanks: ['ممنون', 'Mamnun'] },
  ur: { h: ['السلام علیکم', 'Assalam-o-alaikum', 'peace be with you'], thanks: ['شکریہ', 'Shukriya'] },
  hi: { h: ['नमस्ते', 'Namaste'], thanks: ['धन्यवाद', 'Dhanyavaad'] },
  ne: { h: ['नमस्ते', 'Namaste'], thanks: ['धन्यवाद', 'Dhanyabad'] },
  ta: { h: ['வணக்கம்', 'Vanakkam'], thanks: ['நன்றி', 'Nandri'] },
  si: { h: ['ආයුබෝවන්', 'Āyubōwan', 'may you live long'], thanks: ['ස්තූතියි', 'Stūtiyi'] },
  th: { h: ['สวัสดี', 'Sawasdee'], thanks: ['ขอบคุณ', 'Khop khun'] },
  lo: { h: ['ສະບາຍດີ', 'Sabaidee'], thanks: ['ຂອບໃຈ', 'Khop jai'] },
  km: { h: ['ជំរាបសួរ', 'Chum reap suor'], thanks: ['អរគុណ', 'Arkun'] },
  my: { h: ['မင်္ဂလာပါ', 'Mingalaba'], thanks: ['ကျေးဇူးတင်ပါတယ်', 'Kyay zu tin ba deh'] },
  am: { h: ['ሰላም', 'Selam'], thanks: ['አመሰግናለሁ', 'Ameseginalehu'] },
  mn: { h: ['Сайн байна уу', 'Sain baina uu'], thanks: ['Баярлалаа', 'Bayarlalaa'] },
  ja: { m: ['おはようございます', 'Ohayō gozaimasu'], a: ['こんにちは', 'Konnichiwa'], e: ['こんばんは', 'Konbanwa'], h: ['こんばんは', 'Konbanwa', 'good evening'], thanks: ['ありがとう', 'Arigatō'] },
  ko: { h: ['안녕하세요', 'Annyeonghaseyo'], thanks: ['감사합니다', 'Gamsahamnida'] },
  zh: { m: ['早上好', 'Zǎoshang hǎo'], a: ['下午好', 'Xiàwǔ hǎo'], e: ['晚上好', 'Wǎnshang hǎo'], h: ['你好', 'Nǐ hǎo'], thanks: ['谢谢', 'Xièxie'] },
  'zh-Hant': { m: ['早安', 'Zǎo ān'], a: ['午安', 'Wǔ ān'], e: ['晚上好', 'Wǎnshang hǎo'], h: ['你好', 'Nǐ hǎo'], thanks: ['謝謝', 'Xièxie'] },
  yue: { m: ['早晨', 'Jóusàhn'], a: ['你好', 'Néih hóu', 'hello'], e: ['你好', 'Néih hóu', 'hello'], h: ['你好', 'Néih hóu'], thanks: ['多謝', 'Dōjeh'] },
});
/** Well-known local greetings that replace the language's own (any hour). */
const _TRP_GREET_LOCAL = Object.freeze({
  'AU:en': { lang: 'en-AU', text: "G'day", meaning: 'hello' },
  'NZ:en': { lang: 'mi', text: 'Kia ora', meaning: 'hello, in Māori' },
  'CH:de': { lang: 'gsw', text: 'Grüezi', meaning: 'hello, in Swiss German' },
});
const _TRP_SLOT_MEANING = Object.freeze({ m: 'good morning', a: 'good afternoon', e: 'good evening', h: 'hello' });
/** A language code from the tables -> a TR_GREET key ('' when none). */
function _trpLangKey(code, cc) {
  const l = String(code || '').trim();
  if (!l) return '';
  const low = l.toLowerCase();
  if (low === 'zh-hant' || /^zh-(tw|hk|mo)$/.test(low)) return cc === 'HK' || cc === 'MO' ? 'yue' : 'zh-Hant';   // Hong Kong and Macau speak Cantonese
  if (TR_GREET[l]) return l;
  if (low === 'cmn' || low.startsWith('zh')) return 'zh';
  if (low === 'no' || low === 'nn' || low.startsWith('nb')) return 'nb';
  if (low === 'fil') return 'tl';
  const base = low.split('-')[0];
  return TR_GREET[base] ? base : '';
}
function trGreetLang(cc, cityId) {
  const C = String(cc || '').toUpperCase();
  const city = cityId ? trCity(cityId) : null;
  if (city && city.lang) { const k = _trpLangKey(city.lang, C); if (k) return k; }
  const c = trPlaceTables().countries[C];
  for (const l of c ? c.langs : []) { const k = _trpLangKey(l, C); if (k) return k; }
  return 'en';
}
function trGreetSlot(hour) {
  const h = ((Math.floor(Number(hour) || 0) % 24) + 24) % 24;
  return h >= 5 && h < 12 ? 'm' : h >= 12 && h < 17 ? 'a' : h >= 17 && h < 22 ? 'e' : 'h';
}
function trGreeting(o) {
  o = o || {};
  const cc = String(o.cc || '').toUpperCase();
  const lang = o.lang && TR_GREET[o.lang] ? o.lang : trGreetLang(cc, o.cityId);
  const slot = trGreetSlot(o.hour);
  const local = _TRP_GREET_LOCAL[cc + ':' + lang];
  if (local) return { lang: local.lang, slot, text: local.text, roman: '', meaning: local.meaning, local: true };
  const g = TR_GREET[lang] || TR_GREET.en;
  const e = g[slot] || g.h;   // one all-day word (namaste, sawasdee): 'h' only, meaning "hello"
  return { lang, slot, text: e[0], roman: e[1] || '', meaning: e[2] || _TRP_SLOT_MEANING[g[slot] ? slot : 'h'], local: false };
}
function trThanks(o) {
  o = o || {};
  const lang = o.lang && TR_GREET[o.lang] ? o.lang : trGreetLang(o.cc, o.cityId);
  const t = (TR_GREET[lang] || TR_GREET.en).thanks;
  return { lang, text: t[0], roman: t[1] || '', meaning: 'thank you' };
}

/* ---------- flags (4.9): a one-line spec per country, drawn as SVG (30 x 20) ----------
   The spec language is documented in tools/travel-data-facts.mjs. Every number
   and colour is checked, so a bad spec draws less, never broken markup. */
const _TRP_COL = /^(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?|none)$/;
const _trpNum = (v) => { const n = Number(v); return v !== '' && Number.isFinite(n) ? Math.round(n * 100) / 100 : null; };
const _trpCol = (v) => (_TRP_COL.test(String(v || '').trim()) ? String(v).trim() : null);
function _trpRect(x, y, w, h, c) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; }
function _trpStripes(dir, parts) {
  const ok = parts.filter(p => p.c && p.w > 0);
  const tot = ok.reduce((a, p) => a + p.w, 0);
  if (!tot) return '';
  let at = 0, out = '';
  for (const p of ok) {
    const s = p.w / tot;
    out += dir === 'h' ? _trpRect(0, +(at * 20).toFixed(2), 30, +(s * 20 + 0.05).toFixed(2), p.c) : _trpRect(+(at * 30).toFixed(2), 0, +(s * 30 + 0.05).toFixed(2), 20, p.c);
    at += s;
  }
  return out;
}
function _trpStar(x, y, r, c) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? r * 0.382 : r;
    d += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(2) + ' ' + (y + Math.sin(a) * rr).toFixed(2);
  }
  return `<path d="${d}Z" fill="${c}"/>`;
}
const _TRP_FLAG_UK = '<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.6"/>'
  + '<path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.4"/>';
function _trpFlagNamed(k) {
  if (k === 'uk') return _TRP_FLAG_UK;
  if (k === 'ukc') return `<g transform="scale(.5)">${_TRP_FLAG_UK}</g>`;
  if (k === 'us') {
    let s = '';
    for (let i = 0; i < 13; i++) s += _trpRect(0, (i * 20 / 13).toFixed(2), 30, (20 / 13 + 0.05).toFixed(2), i % 2 ? '#fff' : '#b22234');
    s += _trpRect(0, 0, 13, 10.77, '#3c3b6e');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) s += `<circle cx="${(1.6 + c * 2.45).toFixed(2)}" cy="${(1.6 + r * 2.5).toFixed(2)}" r=".55" fill="#fff"/>`;
    return s;
  }
  if (k === 'gr') {
    let s = '';
    for (let i = 0; i < 9; i++) s += _trpRect(0, (i * 20 / 9).toFixed(2), 30, (20 / 9 + 0.05).toFixed(2), i % 2 ? '#fff' : '#0d5eaf');
    return s + _trpRect(0, 0, 11.1, 11.1, '#0d5eaf') + _trpRect(4.4, 0, 2.3, 11.1, '#fff') + _trpRect(0, 4.4, 11.1, 2.3, '#fff');
  }
  if (k === 'cn') return _trpRect(0, 0, 30, 20, '#de2910') + _trpStar(5, 5, 3, '#ffde00') + [[10, 2], [12, 4], [12, 7], [10, 9]].map(([x, y]) => _trpStar(x, y, 1, '#ffde00')).join('');
  if (k === 'ca') {
    return _trpRect(0, 0, 30, 20, '#fff') + _trpRect(0, 0, 7.5, 20, '#d52b1e') + _trpRect(22.5, 0, 7.5, 20, '#d52b1e')
      + '<path d="M15 3.2L16 5.2L17.2 4.6L16.8 7.6L18.6 6.2L19 7.2L20.6 6.8L20 8.8L21 9.4L18 11.8L18.4 13L15.4 12.6L15.4 15.6L14.6 15.6L14.6 12.6L11.6 13L12 11.8L9 9.4L10 8.8L9.4 6.8L11 7.2L11.4 6.2L13.2 7.6L12.8 4.6L14 5.2Z" fill="#d52b1e"/>';
  }
  if (k === 'kr') {
    const bars = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})" fill="#000">${[-1.1, 0, 1.1].map(dy => _trpRect(-2, (dy - 0.35).toFixed(2), 4, 0.7, '#000')).join('')}</g>`;
    return _trpRect(0, 0, 30, 20, '#fff') + '<circle cx="15" cy="10" r="5" fill="#0047a0"/>'
      + '<path d="M10 10a5 5 0 0 1 10 0a2.5 2.5 0 0 1 -5 0a2.5 2.5 0 0 0 -5 0z" fill="#cd2e3a"/>'
      + bars(6.2, 4.6, -58.6) + bars(23.8, 15.4, -58.6) + bars(23.8, 4.6, 58.6) + bars(6.2, 15.4, 58.6);
  }
  if (k === 'il') {
    return _trpRect(0, 0, 30, 20, '#fff') + _trpRect(0, 2, 30, 3, '#0038b8') + _trpRect(0, 15, 30, 3, '#0038b8')
      + '<path d="M15 6.8L17.77 11.6H12.23ZM15 13.2L12.23 8.4H17.77Z" fill="none" stroke="#0038b8" stroke-width=".8"/>';
  }
  if (k === 'za') {
    return _trpRect(0, 0, 30, 10, '#e03c31') + _trpRect(0, 10, 30, 10, '#001489')
      + '<path d="M0 0L13 10L0 20M13 10H30" fill="none" stroke="#fff" stroke-width="6"/><path d="M0 0L13 10L0 20M13 10H30" fill="none" stroke="#007749" stroke-width="3.8"/>'
      + '<path d="M0 3.2L8.8 10L0 16.8Z" fill="#ffb81c"/><path d="M0 4.6L7 10L0 15.4Z" fill="#000"/>';
  }
  return null;
}
function _trpFlagPart(part) {
  const i = part.indexOf(':');
  const k = i < 0 ? part.trim() : part.slice(0, i).trim();
  const rest = i < 0 ? '' : part.slice(i + 1);
  if (i < 0) return _trpFlagNamed(k) || '';
  const a = rest.split(',').map(s => s.trim());
  const N = (j) => _trpNum(a[j]), C = (j) => _trpCol(a[j]);
  if (k === 'h' || k === 'v') return _trpStripes(k, a.map(c => ({ c: _trpCol(c), w: 1 })));
  if (k === 'hw' || k === 'vw') return _trpStripes(k[0], a.map(x => { const [c, w] = x.split(/\s+/); return { c: _trpCol(c), w: _trpNum(w) }; }));
  if (k === 'alt') { const n = Math.min(20, Math.max(1, N(0) || 0)); return n && C(1) && C(2) ? _trpStripes('h', Array.from({ length: n }, (_, j) => ({ c: j % 2 ? C(2) : C(1), w: 1 }))) : ''; }
  if (k === 'bg') return C(0) ? _trpRect(0, 0, 30, 20, C(0)) : '';
  if (k === 'rect') return [0, 1, 2, 3].every(j => N(j) != null) && C(4) ? _trpRect(N(0), N(1), N(2), N(3), C(4)) : '';
  if (k === 'band') { const [c, w] = rest.trim().split(/\s+/); const cc = _trpCol(c), ww = _trpNum(w); return cc && ww != null ? _trpRect(0, 0, +(30 * ww / 100).toFixed(2), 20, cc) : ''; }
  if (k === 'tri') return C(0) && N(1) != null ? `<path d="M0 0L${N(1)} 10L0 20Z" fill="${C(0)}"/>` : '';
  if (k === 'disc') return C(0) && C(1) ? _trpRect(0, 0, 30, 20, C(0)) + `<circle cx="15" cy="10" r="6" fill="${C(1)}"/>` : '';
  if (k === 'dot') return [0, 1, 2].every(j => N(j) != null) && C(3) ? `<circle cx="${N(0)}" cy="${N(1)}" r="${N(2)}" fill="${C(3)}"/>` : '';
  if (k === 'oval') return [0, 1, 2, 3].every(j => N(j) != null) && C(4) ? `<ellipse cx="${N(0)}" cy="${N(1)}" rx="${N(2)}" ry="${N(3)}" fill="${C(4)}"/>` : '';
  if (k === 'ring') return [0, 1, 2, 4].every(j => N(j) != null) && C(3) ? `<circle cx="${N(0)}" cy="${N(1)}" r="${N(2)}" fill="none" stroke="${C(3)}" stroke-width="${N(4)}"/>` : '';
  if (k === 'half') {
    if (![0, 1, 2].every(j => N(j) != null) || !C(3) || !C(4)) return '';
    const x = N(0), y = N(1), r = N(2);
    return `<path d="M${x - r} ${y}a${r} ${r} 0 0 1 ${2 * r} 0Z" fill="${C(3)}"/><path d="M${x - r} ${y}a${r} ${r} 0 0 0 ${2 * r} 0Z" fill="${C(4)}"/>`;
  }
  if (k === 'star') return [0, 1, 2].every(j => N(j) != null) && C(3) ? _trpStar(N(0), N(1), N(2), C(3)) : '';
  if (k === 'pent') {
    if (![0, 1, 2, 4].every(j => N(j) != null) || !C(3)) return '';
    let d = '';
    for (let j = 0; j < 5; j++) { const ang = (-90 + j * 144) * Math.PI / 180; d += (j ? 'L' : 'M') + (N(0) + Math.cos(ang) * N(2)).toFixed(2) + ' ' + (N(1) + Math.sin(ang) * N(2)).toFixed(2); }
    return `<path d="${d}Z" fill="none" stroke="${C(3)}" stroke-width="${N(4)}" stroke-linejoin="round"/>`;
  }
  if (k === 'plus') {
    if (![0, 1, 2].every(j => N(j) != null) || !C(3)) return '';
    const x = N(0), y = N(1), s = N(2), t = +(s / 3).toFixed(2);
    return _trpRect(+(x - t / 2).toFixed(2), +(y - s / 2).toFixed(2), t, s, C(3)) + _trpRect(+(x - s / 2).toFixed(2), +(y - t / 2).toFixed(2), s, t, C(3));
  }
  if (k === 'cres') {
    if (![0, 1, 2].every(j => N(j) != null) || !C(3) || !C(4)) return '';
    const x = N(0), y = N(1), r = N(2), up = a[5] === 'u';
    const dx = up ? 0 : +(r * 0.28).toFixed(2), dy = up ? -(+(r * 0.28).toFixed(2)) : 0;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${C(3)}"/><circle cx="${+(x + dx).toFixed(2)}" cy="${+(y + dy).toFixed(2)}" r="${+(r * 0.8).toFixed(2)}" fill="${C(4)}"/>`;
  }
  if (k === 'nordic') {
    const bg = C(0), cr = C(1), inner = a[2] ? C(2) : null;
    if (!bg || !cr) return '';
    return _trpRect(0, 0, 30, 20, bg) + _trpRect(8, 0, inner ? 5 : 4, 20, cr) + _trpRect(0, inner ? 7.5 : 8, 30, inner ? 5 : 4, cr)
      + (inner ? _trpRect(9.25, 0, 2.5, 20, inner) + _trpRect(0, 8.75, 30, 2.5, inner) : '');
  }
  if (k === 'swiss') return C(0) && C(1) ? _trpRect(0, 0, 30, 20, C(0)) + _trpRect(13, 4, 4, 12, C(1)) + _trpRect(9, 8, 12, 4, C(1)) : '';
  if (k === 'cross') return C(0) && N(1) != null ? _trpRect(+(15 - N(1) / 2).toFixed(2), 0, N(1), 20, C(0)) + _trpRect(0, +(10 - N(1) / 2).toFixed(2), 30, N(1), C(0)) : '';
  if (k === 'sal') return C(0) && N(1) != null ? `<path d="M0 0L30 20M30 0L0 20" stroke="${C(0)}" stroke-width="${N(1)}"/>` : '';
  if (k === 'diag') return C(0) && N(1) != null ? `<path d="M0 20L30 0" stroke="${C(0)}" stroke-width="${N(1)}"/>` : '';
  if (k === 'diag2') return C(0) && N(1) != null ? `<path d="M0 0L30 20" stroke="${C(0)}" stroke-width="${N(1)}"/>` : '';
  if (k === 'loz') return C(0) ? `<path d="M2.6 10L15 1.8L27.4 10L15 18.2Z" fill="${C(0)}"/>` : '';
  if (k === 'chk') {
    const [x, y, cols, rows, size] = [0, 1, 2, 3, 4].map(N);
    if ([x, y, cols, rows, size].some(v => v == null) || !C(5) || !C(6) || cols * rows > 64) return '';
    let s = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += _trpRect(+(x + c * size).toFixed(2), +(y + r * size).toFixed(2), size, size, (r + c) % 2 ? C(6) : C(5));
    return s;
  }
  if (k === 'poly') {
    const j = rest.indexOf(',');
    const c = _trpCol(rest.slice(0, j)), pts = rest.slice(j + 1).trim();
    return c && j > 0 && /^-?[\d.]+(\s+-?[\d.]+)+$/.test(pts) && pts.split(/\s+/).length % 2 === 0 ? `<path d="M${pts.split(/\s+/).reduce((o, v, n) => o + (n && n % 2 === 0 ? 'L' : n ? ' ' : '') + v, '')}Z" fill="${c}"/>` : '';
  }
  return '';
}
function trFlagSpec(cc) {
  const c = trPlaceTables().countries[String(cc || '').toUpperCase()];
  return c ? c.flag : '';
}
/** The flag as an SVG string ('' when the country has no spec). trFlagSvg({spec}) draws any spec (tests, the gallery). */
function trFlagSvg(cc) {
  const spec = cc && typeof cc === 'object' ? String(cc.spec || '') : trFlagSpec(cc);
  if (!spec) return '';
  const body = spec.split('|').map(_trpFlagPart).join('');
  return body ? `<svg viewBox="0 0 30 20" preserveAspectRatio="none" aria-hidden="true" focusable="false">${body}</svg>` : '';
}
/** The flag chip. Without a spec: the two letters. aria-label gives the country's name. */
function trFlagHtml(cc, o) {
  o = o || {};
  const C = String(cc || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  const svg = C ? trFlagSvg(C) : '';
  const name = o.label || (C ? _trpRegionName(C) : '');
  const cls = 'tr-flag' + (svg ? '' : ' is-cc') + (C === 'NP' ? ' is-shape' : '') + (o.sheen ? ' is-sheen' : '') + (o.cls ? ' ' + String(o.cls).replace(/[^\w -]/g, '') : '');
  return `<span class="${cls}" role="img" aria-label="${_trpEsc(name ? 'Flag of ' + name : 'Flag')}"${C ? ` data-cc="${C}"` : ''}>${svg || _trpEsc(C)}</span>`;
}

/* ---------- the place table plugs into Clock (labels and away-from-home countries) ---------- */
if (typeof Clock !== 'undefined' && Clock && typeof Clock.usePlaces === 'function') Clock.usePlaces({ ccOf: trZoneCountry, label: trZoneLabel });   // travel-places: plug-in
