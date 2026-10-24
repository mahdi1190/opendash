// lib/finance/place.mjs - where a payment was made, as the providers say it
// (Spending by country, 2.16). Pure, Node stdlib only; shared by the
// direct providers (lib/fin-connect/normalise.mjs), the bank-sync CSV
// (lib/finance.mjs writes it, lib/finance/store.mjs reads it) and the
// pipeline (lib/finance/pipeline.mjs keeps them in _system/tx_places.json).
//
//   cleanPlace(p, accountCcy) -> {cc?, city?, lc?, la?, ol?} | null
//     cc   the merchant's country, ISO 3166 alpha-2 ('FR'; alpha-3 'FRA' is converted)
//     city the merchant's town (plain text, 40 characters)
//     lc   the currency the payment was made in, when it is not the account's ('EUR')
//     la   the amount in that currency (positive, at most 3 decimals)
//     ol   1 = an online merchant (Monzo says so): it is not where the user was
//   alpha2(code) -> 'FR' | ''
//   placeKey(p) / placeFromCols(get) / PLACE_COLS   the CSV columns ("Country", "City",
//     "Local amount", "Local currency", "Online")
//
// Nothing here guesses: a field the provider did not give stays out. The page
// (src/finance/25-place-model.js) adds what memos, currencies and trips say.

const A2 = /^[A-Z]{2}$/;
const CCY = /^[A-Z]{3}$/;
const INVISIBLE = (() => {
  const ranges = [[0x00, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff]];
  const hex = n => n.toString(16).padStart(4, '0');
  return new RegExp('[' + ranges.map(([a, b]) => `\\u${hex(a)}-\\u${hex(b)}`).join('') + ']', 'g');
})();
// ISO 3166 alpha-3 -> alpha-2 (the same public table as src/app/69-travel-logic.js TRL_A3).
const A3 = 'AFGAF ALAAX ALBAL DZADZ ASMAS ANDAD AGOAO AIAAI ATAAQ ATGAG ARGAR ARMAM ABWAW AUSAU AUTAT AZEAZ BHSBS BHRBH BGDBD BRBBB BLRBY BELBE BLZBZ BENBJ BMUBM BTNBT BOLBO BESBQ BIHBA BWABW BVTBV BRABR IOTIO BRNBN BGRBG BFABF BDIBI CPVCV KHMKH CMRCM CANCA CYMKY CAFCF TCDTD CHLCL CHNCN CXRCX CCKCC COLCO COMKM COGCG CODCD COKCK CRICR CIVCI HRVHR CUBCU CUWCW CYPCY CZECZ DNKDK DJIDJ DMADM DOMDO ECUEC EGYEG SLVSV GNQGQ ERIER ESTEE SWZSZ ETHET FLKFK FROFO FJIFJ FINFI FRAFR GUFGF PYFPF ATFTF GABGA GMBGM GEOGE DEUDE GHAGH GIBGI GRCGR GRLGL GRDGD GLPGP GUMGU GTMGT GGYGG GINGN GNBGW GUYGY HTIHT HMDHM VATVA HNDHN HKGHK HUNHU ISLIS INDIN IDNID IRNIR IRQIQ IRLIE IMNIM ISRIL ITAIT JAMJM JPNJP JEYJE JORJO KAZKZ KENKE KIRKI PRKKP KORKR KWTKW KGZKG LAOLA LVALV LBNLB LSOLS LBRLR LBYLY LIELI LTULT LUXLU MACMO MDGMG MWIMW MYSMY MDVMV MLIML MLTMT MHLMH MTQMQ MRTMR MUSMU MYTYT MEXMX FSMFM MDAMD MCOMC MNGMN MNEME MSRMS MARMA MOZMZ MMRMM NAMNA NRUNR NPLNP NLDNL NCLNC NZLNZ NICNI NERNE NGANG NIUNU NFKNF MKDMK MNPMP NORNO OMNOM PAKPK PLWPW PSEPS PANPA PNGPG PRYPY PERPE PHLPH PCNPN POLPL PRTPT PRIPR QATQA REURE ROURO RUSRU RWARW BLMBL SHNSH KNAKN LCALC MAFMF SPMPM VCTVC WSMWS SMRSM STPST SAUSA SENSN SRBRS SYCSC SLESL SGPSG SXMSX SVKSK SVNSI SLBSB SOMSO ZAFZA SGSGS SSDSS ESPES LKALK SDNSD SURSR SJMSJ SWESE CHECH SYRSY TWNTW TJKTJ TZATZ THATH TLSTL TGOTG TKLTK TONTO TTOTT TUNTN TURTR TKMTM TCATC TUVTV UGAUG UKRUA AREAE GBRGB USAUS UMIUM URYUY UZBUZ VUTVU VENVE VNMVN VGBVG VIRVI WLFWF ESHEH YEMYE ZMBZM ZWEZW XKXXK';
let a3map = null, a2set = null;
function tables() {
  if (!a3map) {
    a3map = new Map(); a2set = new Set();
    for (const p of A3.split(' ')) { a3map.set(p.slice(0, 3), p.slice(3)); a2set.add(p.slice(3)); }
  }
  return { a3map, a2set };
}

/** 'FR' | 'FRA' | 'fr' | 'UK' -> 'FR' / 'GB'; anything else ''. */
export function alpha2(code) {
  const c = String(code == null ? '' : code).trim().toUpperCase();
  if (c === 'UK') return 'GB';
  const t = tables();
  if (A2.test(c)) return t.a2set.has(c) ? c : '';
  if (/^[A-Z]{3}$/.test(c)) return t.a3map.get(c) || '';
  return '';
}

function cleanCity(s) {
  if (s == null || typeof s !== 'string') return '';
  const v = s.replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim().replace(/^[=+@\-\s]+/, '').slice(0, 40).trim();
  // Plain words only (it ends up in a CSV, a JSON value and the page): letters, spaces, . ' - ( ) and digits.
  return /^[\p{L}\p{M}0-9 .'’()\-/]{1,40}$/u.test(v) ? v : '';
}

/**
 * A provider's place -> the clean record, or null when nothing is left.
 * accountCcy: the account's currency (a local currency equal to it says nothing).
 */
export function cleanPlace(p, accountCcy) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const out = {};
  const cc = alpha2(p.cc);
  if (cc) out.cc = cc;
  const city = cleanCity(p.city);
  if (city) out.city = city;
  const lc = typeof p.lc === 'string' ? p.lc.trim().toUpperCase() : '';
  const acc = typeof accountCcy === 'string' ? accountCcy.toUpperCase() : '';
  if (CCY.test(lc) && lc !== acc) {
    const la = Math.abs(Number(p.la));
    if (Number.isFinite(la) && la > 0 && la < 1e10) { out.lc = lc; out.la = Math.round(la * 1000) / 1000; }
  }
  if (p.ol === true || p.ol === 1 || p.ol === '1') out.ol = 1;
  return Object.keys(out).length ? out : null;
}

/** The bank-sync CSV's place columns (lib/finance.mjs writes them; store.mjs reads them). */
export const PLACE_COLS = ['Country', 'City', 'Local amount', 'Local currency', 'Online'];
/** A clean place -> the five cells. */
export function placeCells(p) {
  const q = p && typeof p === 'object' ? p : {};
  return [q.cc || '', q.city || '', q.la != null && q.lc ? String(q.la) : '', q.la != null && q.lc ? q.lc : '', q.ol ? '1' : ''];
}
/**
 * The place a CSV row carries. get(name) -> the cell of a column (lower-case name) or
 * undefined when the file has no such column. -> {has: whether any column exists, place}
 * (a bank's own export with "Local amount" / "Local currency", Monzo's for one, counts too;
 * the account currency is its "Currency" column when there is one).
 */
export function placeFromCols(get) {
  const cells = { cc: get('country'), city: get('city'), la: get('local amount'), lc: get('local currency'), ol: get('online') };
  const has = Object.values(cells).some(v => v !== undefined);
  if (!has) return { has: false, place: null };
  const num = (v) => { const s = String(v == null ? '' : v).replace(/[£€$,\s]/g, ''); return s ? Number(s) : NaN; };
  const place = cleanPlace({ cc: cells.cc, city: cells.city, lc: cells.lc, la: num(cells.la), ol: cells.ol }, get('currency'));
  return { has: true, place };
}
/** The compact form kept in _system/tx_places.json (and compared there). */
export function placeKey(p) { return p ? JSON.stringify(p) : ''; }
