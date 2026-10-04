// tools/travel-data-facts.mjs - the hand-written half of the travel tables
// (owner: PLACES). tools/build-travel-data.mjs joins these with the downloaded
// sources (tzdata, GeoNames, OurAirports) into src/app/69-travel-data.js.
//
// Everything here is a published fact or a design choice, never user data:
//   PLUGS      IEC World Plugs letters per country
//   LEFT       countries that drive on the left
//   EMERGENCY  the main emergency number(s) a visitor should know
//   WEEKEND    weekend days when not Saturday + Sunday (0 = Sunday ... 6 = Saturday)
//   KIND       the skyline kind per country (t towers, o oldtown, c coastal,
//              m mountain, d desert, p tropical, n nordic, l lowlands);
//              CITY_KIND overrides per city
//   LANGS      language order overrides (the first one with a greeting wins)
//   CCY        currency overrides (GeoNames lags behind a change)
//   FLAGS      one-line flag specs, drawn by trFlagSvg (69-travel-places.js)
//   TOURIST    cities kept whatever their population
//   ALIASES    other names people type for a city (matched ASCII-folded)
//   CITY_LANG  a city's own language where the country has several
//   AIRPORT_CITY  airports whose municipality is not the city they serve
//   CITY_STATES   countries where the zone IS the city (Singapore, Monaco ...)
//
// Flag spec language (30 x 20 box, parts joined by '|', drawn in order):
//   h:c1,c2..  v:c1,c2..      equal horizontal / vertical stripes
//   hw:c w,c w  vw:c w,c w    weighted stripes
//   alt:n,c1,c2               n alternating horizontal stripes
//   bg:c                      fill;  rect:x,y,w,h,c
//   band:c w                  a hoist band w% of the width
//   tri:c,x                   hoist triangle with its tip at x
//   dot:x,y,r,c   oval:x,y,rx,ry,c   ring:x,y,r,c,width   half:x,y,r,top,bottom
//   star:x,y,r,c  pent:x,y,r,c,width (outline)   plus:x,y,size,c
//   cres:x,y,r,c,bg[,u]       crescent opening right (u: upwards)
//   disc:bg,fg  nordic:bg,cross[,inner]  swiss:bg,fg  cross:c,w  sal:c,w
//   diag:c,w (lower hoist to upper fly)  diag2:c,w (upper hoist to lower fly)
//   loz:c (lozenge)  chk:x,y,cols,rows,size,c1,c2   poly:c,x y x y ...
//   uk  ukc (UK flag in the canton)  us  gr  cn  ca  kr  il  za
// Coats of arms are left out by design; a small dot stands in where a flag
// would otherwise look like another country's.

/* ---------- small helpers for the few flags that need repeats ---------- */
const serr = (n, x0, x1, c) => {
  // a serrated hoist (Bahrain 5 points, Qatar 9): white part 0..x0, teeth to x1
  const step = 20 / n; const pts = ['0 0', `${x0} 0`];
  for (let i = 0; i < n; i++) pts.push(`${x1} ${+(step * i + step / 2).toFixed(2)}`, `${x0} ${+(step * (i + 1)).toFixed(2)}`);
  pts.push('0 20');
  return `poly:${c},${pts.join(' ')}`;
};
const arcStars = (cx, cy, r, n, from, to, size, c) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (from + (to - from) * i / (n - 1)) * Math.PI / 180;
    out.push(`star:${+(cx + Math.cos(a) * r).toFixed(1)},${+(cy - Math.sin(a) * r).toFixed(1)},${size},${c}`);
  }
  return out.join('|');
};
const FR = 'v:#0055a4,#fff,#ef4135';
const NO = 'nordic:#ba0c2f,#fff,#00205b';
const US = 'us';
const BLUE_ENSIGN = (badge) => `bg:#012169|ukc|dot:22,10,3,${badge}`;

export const FLAGS = {
  AD: 'vw:#10069f 8,#fedf00 9,#d50032 8|dot:15,10,2.6,#b07c2a',
  AE: 'h:#00732f,#fff,#000|band:#ff0000 25',
  AF: 'v:#000,#d32011,#007a36',
  AG: 'bg:#ce1126|poly:#000,0 0 30 0 15 20|poly:#0072c6,6.5 8 23.5 8 15 20|poly:#fff,10.3 13 19.7 13 15 20|dot:15,6,2.4,#fcd116',
  AI: BLUE_ENSIGN('#fff'),
  AL: 'bg:#e41e20|dot:15,10,4.5,#000',
  AM: 'h:#d90012,#0033a0,#f2a800',
  AO: 'h:#cc092f,#000|dot:15,10,3,#ffcb00',
  AR: 'h:#74acdf,#fff,#74acdf|dot:15,10,1.9,#f6b40e',
  AT: 'h:#c8102e,#fff,#c8102e',
  AU: 'bg:#012169|ukc|star:7.5,15,2.3,#fff|star:22.5,4.3,1,#fff|star:19.6,9.4,1,#fff|star:25.6,8.4,1,#fff|star:22.5,16.4,1.1,#fff',
  AW: 'bg:#418fde|rect:0,13,30,1,#fbe122|rect:0,15,30,1,#fbe122|star:5,5,2.4,#ef3340',
  AX: 'nordic:#0064ad,#ffd300,#da0e15',
  AZ: 'h:#00b5e2,#ef3340,#509e2f|cres:14,10,2.8,#fff,#ef3340|star:17.2,10,1.1,#fff',
  BA: 'bg:#002395|poly:#fecb00,8.5 0 21.5 0 21.5 20',
  BB: 'v:#00267f,#ffc726,#00267f|dot:15,10,2,#000',
  BD: 'bg:#006a4e|dot:13.5,10,6,#f42a41',
  BE: 'v:#000,#fdda24,#ef3340',
  BF: 'h:#ef2b2d,#009e49|star:15,10,2.6,#fcd116',
  BG: 'h:#fff,#00966e,#d62612',
  BH: `bg:#ce1126|${serr(5, 7.5, 10.5, '#fff')}`,
  BI: 'bg:#ce1126|poly:#1eb53a,0 0 15 10 0 20|poly:#1eb53a,30 0 15 10 30 20|sal:#fff,2.4|dot:15,10,4.6,#fff|dot:15,10,1.3,#ce1126',
  BJ: 'h:#fcd116,#e8112d|band:#008751 40',
  BM: 'bg:#c8102e|ukc|dot:22,10,3,#fff',
  BN: 'bg:#f7e017|poly:#fff,0 4 30 13 30 16 0 7|poly:#000,0 7 30 16 30 19 0 10|dot:15,11,3,#cf1126',
  BO: 'h:#d52b1e,#f9e300,#007934',
  BR: 'bg:#009c3b|loz:#ffdf00|dot:15,10,3.6,#002776',
  BS: 'h:#00abc9,#fae042,#00abc9|tri:#000,11',
  BT: 'poly:#ffcc33,0 0 30 0 0 20|poly:#ff6600,30 0 30 20 0 20|dot:15,10,3,#fff',
  BW: 'hw:#6da9d2 9,#fff 1,#000 4,#fff 1,#6da9d2 9',
  BY: 'hw:#c8313e 2,#4aa657 1|band:#fff 8|rect:1,0,2.6,20,#c8313e',
  BZ: 'hw:#ce1126 1,#003f87 8,#ce1126 1|dot:15,10,5,#fff',
  CA: 'ca',
  CD: 'bg:#007fff|diag:#f7d618,6|diag:#ce1021,3.6|star:5,5,3,#f7d618',
  CF: 'h:#003082,#fff,#289728,#ffce00|rect:13,0,4,20,#d21034|star:4.5,2.5,1.6,#ffce00',
  CG: 'poly:#009543,0 0 20 0 0 20|poly:#dc241f,30 0 30 20 10 20|poly:#fbde4a,20 0 30 0 10 20 0 20',
  CH: 'swiss:#da291c,#fff',
  CI: 'v:#f77f00,#fff,#009e60',
  CK: 'bg:#012169|ukc|ring:22.5,10,4,#fff,1',
  CL: 'h:#fff,#d52b1e|rect:0,0,10,10,#0039a6|star:5,5,2.6,#fff',
  CM: 'v:#007a5e,#ce1126,#fcd116|star:15,10,2.6,#fcd116',
  CN: 'cn',
  CO: 'hw:#fcd116 2,#003893 1,#ce1126 1',
  CR: 'hw:#002b7f 1,#fff 1,#ce1126 2,#fff 1,#002b7f 1',
  CU: 'alt:5,#002a8f,#fff|tri:#cf142b,13|star:4.5,10,2.6,#fff',
  CV: 'hw:#003893 6,#fff 1,#cf2027 1,#fff 1,#003893 3|ring:11,12.5,4,#f7d116,.8',
  CW: 'hw:#002b7f 5,#f9e814 1,#002b7f 2|star:4,4,1.6,#fff|star:7,7,1.1,#fff',
  CY: 'bg:#fff|poly:#d57800,7 10 12 7.5 18 6.5 23 7 20 9.5 14 11 9 12|oval:15,14.5,5,1,#4e5b31',
  CZ: 'h:#fff,#d7141a|tri:#11457e,15',
  DE: 'h:#000,#dd0000,#ffce00',
  DJ: 'h:#6ab2e7,#12ad2b|tri:#fff,15|star:5,10,2,#d7141a',
  DK: 'nordic:#c8102e,#fff',
  DM: 'bg:#006b3f|rect:12.5,0,1.5,20,#fcd116|rect:14,0,1.5,20,#000|rect:15.5,0,1.5,20,#fff|rect:0,7.5,30,1.5,#fcd116|rect:0,9,30,1.5,#000|rect:0,10.5,30,1.5,#fff|dot:15,10,3.8,#d41c30',
  DO: 'bg:#fff|rect:0,0,13,8,#002d62|rect:17,0,13,8,#ce1126|rect:0,12,13,8,#ce1126|rect:17,12,13,8,#002d62|dot:15,10,1.4,#4f7d2c',
  DZ: 'v:#006233,#fff|cres:15,10,4.6,#d21034,#fff|star:17.6,10,1.8,#d21034',
  EC: 'hw:#ffd100 2,#0072ce 1,#ef3340 1|dot:15,10,2.4,#7a5d2c',
  EE: 'h:#0072ce,#000,#fff',
  EG: 'h:#ce1126,#fff,#000|dot:15,10,2,#c09300',
  ER: 'h:#12ad2b,#4189dd|poly:#ea0437,0 0 30 10 0 20|ring:7,10,3.4,#ffc726,.8',
  ES: 'hw:#aa151b 1,#f1bf00 2,#aa151b 1',
  ET: 'h:#078930,#fcdd09,#da121a|dot:15,10,4,#0f47af|star:15,10,2.6,#fcdd09',
  FI: 'nordic:#fff,#002f6c',
  FJ: 'bg:#68bfe5|ukc|oval:22.5,10.5,2.8,3.4,#fff',
  FK: BLUE_ENSIGN('#fff'),
  FM: 'bg:#75b2dd|star:15,4.5,1.6,#fff|star:15,15.5,1.6,#fff|star:9.5,10,1.6,#fff|star:20.5,10,1.6,#fff',
  FO: 'nordic:#fff,#0065bd,#ef303e',
  FR,
  GA: 'h:#009e60,#fcd116,#3a75c4',
  GB: 'uk',
  GD: 'bg:#ce1126|rect:2.5,2.5,25,15,#fcd116|poly:#007a5e,2.5 2.5 15 10 2.5 17.5|poly:#007a5e,27.5 2.5 15 10 27.5 17.5|dot:15,10,2.4,#ce1126',
  GE: 'bg:#fff|cross:#f00,4|plus:6.8,4.5,3,#f00|plus:23.2,4.5,3,#f00|plus:6.8,15.5,3,#f00|plus:23.2,15.5,3,#f00',
  GF: FR,
  GG: 'bg:#fff|cross:#e8112d,5|cross:#f9dd16,1.6',
  GH: 'h:#ce1126,#fcd116,#006b3f|star:15,10,2.8,#000',
  GI: 'hw:#fff 2,#da000c 1|rect:12,4,6,6,#da000c',
  GL: 'h:#fff,#d00c33|half:11,10,5.5,#d00c33,#fff',
  GM: 'hw:#ce1126 6,#fff 1,#0c1c8c 4,#fff 1,#3a7728 6',
  GN: 'v:#ce1126,#fcd116,#009460',
  GP: FR,
  GQ: 'h:#3e9a00,#fff,#e32118|tri:#0073ce,7',
  GR: 'gr',
  GT: 'v:#4997d0,#fff,#4997d0|dot:15,10,2.4,#6c9a3b',
  GU: 'bg:#c62139|rect:1,1,28,18,#00297b|oval:15,10,3,4,#6fb8e8',
  GW: 'h:#fcd116,#009e49|band:#ce1126 33|star:5,10,2.4,#000',
  GY: 'bg:#009e49|poly:#fff,0 0 30 10 0 20|poly:#fcd116,0 1.2 28 10 0 18.8|poly:#000,0 0 15 10 0 20|poly:#ce1126,0 1.6 12.6 10 0 18.4',
  HK: 'bg:#de2910|dot:15,10,4.6,#fff|dot:15,10,1.2,#de2910',
  HN: 'h:#0073cf,#fff,#0073cf|star:15,10,1,#0073cf|star:11,8.5,1,#0073cf|star:19,8.5,1,#0073cf|star:11,11.5,1,#0073cf|star:19,11.5,1,#0073cf',
  HR: 'h:#ff0000,#fff,#171796|chk:12.5,4.5,4,5,1.25,#ff0000,#fff',
  HT: 'h:#00209f,#d21034|rect:11,7,8,6,#fff',
  HU: 'h:#ce2939,#fff,#477050',
  ID: 'h:#ff0000,#fff',
  IE: 'v:#169b62,#fff,#ff883e',
  IL: 'il',
  IM: 'bg:#cf142b|ring:15,10,2.6,#fff,1.4',
  IN: 'h:#ff9933,#fff,#138808|ring:15,10,2.5,#000080,.6|dot:15,10,.6,#000080',
  IQ: 'h:#ce1126,#fff,#000|rect:10,9,10,2,#007a3d',
  IR: 'h:#239f40,#fff,#da0000|dot:15,10,2.2,#da0000',
  IS: 'nordic:#02529c,#fff,#dc1e35',
  IT: 'v:#009246,#fff,#ce2b37',
  JE: 'bg:#fff|sal:#df112d,3|dot:15,4.5,2,#df112d',
  JM: 'poly:#009b3a,0 0 30 0 15 10|poly:#009b3a,0 20 30 20 15 10|poly:#000,0 0 15 10 0 20|poly:#000,30 0 15 10 30 20|sal:#fed100,3',
  JO: 'h:#000,#fff,#007a3d|tri:#ce1126,15|star:5.5,10,1.5,#fff',
  JP: 'disc:#fff,#bc002d',
  KE: 'hw:#000 6,#fff 1,#bb0000 6,#fff 1,#006600 6|oval:15,10,3,7,#bb0000|oval:15,10,1.2,5.5,#000',
  KG: 'bg:#e8112d|dot:15,10,4.6,#ffef00|dot:15,10,2.8,#e8112d',
  KH: 'hw:#032ea1 1,#e00025 2,#032ea1 1|rect:11,7,8,6,#fff',
  KI: 'hw:#ce1126 1,#003f87 1|rect:0,13,30,1.5,#fff|rect:0,16.5,30,1.5,#fff|dot:15,10,3.6,#fcd116',
  KM: 'h:#ffc61e,#fff,#ce1126,#3a75c4|tri:#3d8e33,13|cres:5,10,3.4,#fff,#3d8e33',
  KN: 'poly:#009e49,0 0 30 0 0 20|poly:#ce1126,30 0 30 20 0 20|diag:#fcd116,7|diag:#000,5|star:10,13.5,1.5,#fff|star:20,6.5,1.5,#fff',
  KP: 'hw:#024fa2 3,#fff 1,#ed1c27 12,#fff 1,#024fa2 3|dot:10,10,3.5,#fff|star:10,10,3.3,#ed1c27',
  KR: 'kr',
  KW: 'h:#007a3d,#fff,#ce1126|poly:#000,0 0 7.5 6.67 7.5 13.33 0 20',
  KY: BLUE_ENSIGN('#fff'),
  KZ: 'bg:#00afca|dot:15,9,3.6,#fec50c|rect:1.5,0,1.4,20,#fec50c',
  LA: 'hw:#ce1126 1,#002868 2,#ce1126 1|dot:15,10,4,#fff',
  LB: 'hw:#ed1c24 1,#fff 2,#ed1c24 1|poly:#00a651,15 5.5 19.5 14 10.5 14',
  LC: 'bg:#66ccff|poly:#fff,15 3 21 17 9 17|poly:#000,15 5 20 17 10 17|poly:#fcd116,15 10 21 17 9 17',
  LI: 'h:#002b7f,#ce1126|dot:7,5,2,#ffd83d',
  LK: 'bg:#ffb700|rect:1,1,4,18,#00534e|rect:5,1,4,18,#eb7400|rect:10,1,19,18,#8d153a|dot:19.5,10,3.6,#ffb700',
  LR: 'alt:11,#bf0a30,#fff|rect:0,0,10,9.1,#002868|star:5,4.5,2.6,#fff',
  LS: 'hw:#00209f 3,#fff 4,#009543 3|dot:15,10,1.8,#000',
  LT: 'h:#fdb913,#006a44,#c1272d',
  LU: 'h:#ed2939,#fff,#00a1de',
  LV: 'hw:#9e3039 2,#fff 1,#9e3039 2',
  LY: 'hw:#e70013 1,#000 2,#239e46 1|cres:14,10,2.8,#fff,#000|star:17.2,10,1.2,#fff',
  MA: 'bg:#c1272d|pent:15,10,4,#006233,.9',
  MC: 'h:#ce1126,#fff',
  MD: 'v:#0046ae,#ffd200,#cc092f|dot:15,10,2.4,#b07e2b',
  ME: 'bg:#d4af3a|rect:1,1,28,18,#c40308|dot:15,10,3,#d4af3a',
  MF: FR,
  MG: 'h:#fc3d32,#007e3a|band:#fff 33',
  MH: 'bg:#003893|poly:#dd7500,0 20 30 2 30 5|poly:#fff,0 20 30 5 30 8|star:7,6,3,#fff',
  MK: 'bg:#d20000|poly:#ffe600,0 0 4.5 0 15 10 0 3|poly:#ffe600,30 0 25.5 0 15 10 30 3|poly:#ffe600,0 20 4.5 20 15 10 0 17|poly:#ffe600,30 20 25.5 20 15 10 30 17|poly:#ffe600,13 0 17 0 15 10|poly:#ffe600,13 20 17 20 15 10|poly:#ffe600,0 8.5 0 11.5 15 10|poly:#ffe600,30 8.5 30 11.5 15 10|dot:15,10,3.2,#d20000|dot:15,10,2.6,#ffe600',
  ML: 'v:#14b53a,#fcd116,#ce1126',
  MM: 'h:#fecb00,#34b233,#ea2839|star:15,10.6,6,#fff',
  MN: 'v:#c4272f,#015197,#c4272f|dot:5,5.5,1.4,#f9cf02|rect:3.5,8,3,7.5,#f9cf02',
  MO: 'bg:#00785e|dot:15,11.5,4,#fff|star:15,5,1.6,#fbd116',
  MQ: FR,
  MR: 'hw:#d01c1f 1,#00a95c 4,#d01c1f 1|cres:15,9.5,4.4,#ffd700,#00a95c,u|star:15,7,1.6,#ffd700',
  MS: BLUE_ENSIGN('#fff'),
  MT: 'v:#fff,#cf142b|rect:2,2,3,3,#9a9a9a',
  MU: 'h:#ea2839,#1a206d,#ffd500,#00a551',
  MV: 'bg:#d21034|rect:5,5,20,10,#007e3a|cres:16,10,3.2,#fff,#007e3a',
  MW: 'h:#000,#ce1126,#339e35|dot:15,6.6,2.4,#ce1126',
  MX: 'v:#006847,#fff,#ce1126|dot:15,10,2.3,#8c6b2b',
  MY: 'alt:14,#cc0001,#fff|rect:0,0,15,11.43,#010066|cres:6,5.7,4,#fc0,#010066|star:11,5.7,2.6,#fc0',
  MZ: 'hw:#009739 6,#fff 1,#000 6,#fff 1,#fce100 6|tri:#d21034,13|star:5,10,2.8,#fce100',
  NA: 'poly:#003580,0 0 24 0 0 16|poly:#009543,30 4 30 20 6 20|diag:#fff,7|diag:#d21034,5|dot:6,5,2.4,#ffce00',
  NC: FR,
  NE: 'h:#e05206,#fff,#0db02b|dot:15,10,2.2,#e05206',
  NG: 'v:#008751,#fff,#008751',
  NI: 'h:#0067c6,#fff,#0067c6|ring:15,10,1.8,#c8a800,.5',
  NL: 'h:#ae1c28,#fff,#21468b',
  NO,
  NP: 'poly:#003893,0 0 22.6 10.2 7.2 10.2 22.6 20 0 20|poly:#dc143c,1.4 2.6 18.8 9.2 4.4 9.2 18.8 18.8 1.4 18.8|dot:6.8,7.4,1.6,#fff|dot:6.8,14.6,2,#fff',
  NR: 'hw:#002b7f 9,#ffc61e 1,#002b7f 9|star:7,14.5,2.4,#fff',
  NU: 'bg:#fed000|ukc',
  NZ: 'bg:#012169|ukc|star:22.5,4.4,1.3,#cc142b|star:19.8,9.4,1.3,#cc142b|star:25.4,8.5,1.1,#cc142b|star:22.5,16,1.4,#cc142b',
  OM: 'h:#fff,#db161b,#008000|band:#db161b 25|dot:3.6,3.6,1.8,#fff',
  PA: 'rect:0,0,15,10,#fff|rect:15,0,15,10,#d21034|rect:0,10,15,10,#005293|rect:15,10,15,10,#fff|star:7.5,5,2.4,#005293|star:22.5,15,2.4,#d21034',
  PE: 'v:#d91023,#fff,#d91023',
  PF: 'hw:#ce1126 1,#fff 2,#ce1126 1|dot:15,10,3,#f4a10a',
  PG: 'poly:#000,0 0 0 20 30 20|poly:#ce1126,0 0 30 0 30 20|dot:21,6,2.6,#fcd116|star:7,9,1,#fff|star:9.5,13,1,#fff|star:5,13.5,1,#fff|star:7,17,1,#fff',
  PH: 'h:#0038a8,#ce1126|tri:#fff,17.3|dot:6,10,2.2,#fcd116',
  PK: 'bg:#01411c|band:#fff 25|cres:19,10,5,#fff,#01411c|star:22.4,8.2,1.6,#fff',
  PL: 'h:#fff,#dc143c',
  PM: FR,
  PR: 'alt:5,#ed0000,#fff|tri:#0050f0,13|star:4.5,10,2.4,#fff',
  PS: 'h:#000,#fff,#007a3d|tri:#ce1126,10',
  PT: 'vw:#046a38 2,#da291c 3|dot:12,10,4.2,#ffcc29',
  PW: 'bg:#4aadd6|dot:13,10,6,#ffde00',
  PY: 'h:#d52b1e,#fff,#0038a8|ring:15,10,1.8,#77a54b,.6',
  QA: `bg:#8a1538|${serr(9, 8, 11, '#fff')}`,
  RE: FR,
  RO: 'v:#002b7f,#fcd116,#ce1126',
  RS: 'h:#c6363c,#0c4076,#fff|oval:10,9.5,2.6,3.4,#c6363c',
  RU: 'h:#fff,#0039a6,#d52b1e',
  RW: 'hw:#00a1de 2,#fad201 1,#20603d 1|dot:24.5,5,2.6,#e5be01',
  SA: 'bg:#006c35|rect:8,6.5,14,2.5,#fff|rect:8,12,13,1,#fff',
  SB: 'poly:#0051ba,0 0 30 0 0 20|poly:#215b33,30 0 30 20 0 20|diag:#fcd116,1.6|star:3,3,1,#fff|star:8,3,1,#fff|star:5.5,5,1,#fff|star:3,7,1,#fff|star:8,7,1,#fff',
  SC: 'poly:#003f87,0 20 0 0 10 0|poly:#fcd856,0 20 10 0 20 0|poly:#d62828,0 20 20 0 30 0 30 6.67|poly:#fff,0 20 30 6.67 30 13.33|poly:#007a3d,0 20 30 13.33 30 20',
  SD: 'h:#d21034,#fff,#000|tri:#007229,10',
  SE: 'nordic:#006aa7,#fecc00',
  SG: 'h:#ef3340,#fff|cres:6,5,3.2,#fff,#ef3340|star:10,3,.8,#fff|star:12,4.6,.8,#fff|star:11.2,7,.8,#fff|star:8.8,7,.8,#fff|star:8,4.6,.8,#fff',
  SI: 'h:#fff,#005da4,#ed1c24|rect:6,3,5,6,#005da4',
  SJ: NO,
  SK: 'h:#fff,#0b4ea2,#ee1c25|rect:6,4.5,7,8,#ee1c25|plus:9.5,8,3,#fff',
  SL: 'h:#1eb53a,#fff,#0072c6',
  SM: 'h:#fff,#5eb6e4|dot:15,10,2.4,#e9c46a',
  SN: 'v:#00853f,#fdef42,#e31b23|star:15,10,2.6,#00853f',
  SO: 'bg:#4189dd|star:15,10,4,#fff',
  SR: 'hw:#377e3f 2,#fff 1,#b40a2d 4,#fff 1,#377e3f 2|star:15,10,3,#ecc81d',
  SS: 'hw:#000 6,#fff 1,#da121a 6,#fff 1,#078930 6|tri:#0f47af,13|star:4.5,10,2.4,#fcdd09',
  ST: 'h:#12ad2b,#ffce00,#12ad2b|tri:#d21034,9|star:14,10,1.7,#000|star:20,10,1.7,#000',
  SV: 'h:#0047ab,#fff,#0047ab|dot:15,10,1.9,#c8a800',
  SX: 'h:#dc171d,#012a87|tri:#fff,15|dot:5,10,2,#f9d90f',
  SY: 'h:#007a3d,#fff,#000|star:10,10,1.5,#ce1126|star:15,10,1.5,#ce1126|star:20,10,1.5,#ce1126',
  SZ: 'hw:#3e5eb9 3,#ffd900 1,#b10c0c 8,#ffd900 1,#3e5eb9 3|oval:15,10,6,2.6,#fff|oval:17,10,4,2.6,#000',
  TC: BLUE_ENSIGN('#fcd116'),
  TD: 'v:#002664,#fecb00,#c60c30',
  TG: 'alt:5,#006a4e,#ffce00|rect:0,0,12,12,#d21034|star:6,6,3,#fff',
  TH: 'hw:#a51931 1,#f4f5f8 1,#2d2a4a 2,#f4f5f8 1,#a51931 1',
  TJ: 'hw:#cc0000 2,#fff 3,#006600 2|dot:15,10,1.8,#f8c300',
  TL: 'bg:#dc241f|tri:#ffc726,15|tri:#000,10|star:3.5,10,2,#fff',
  TM: 'bg:#00843d|rect:4,0,5,20,#d22630|cres:14,6,2.4,#fff,#00843d',
  TN: 'bg:#e70013|dot:15,10,5,#fff|cres:14.6,10,3.6,#e70013,#fff|star:16.4,10,1.6,#e70013',
  TO: 'bg:#c10000|rect:0,0,13,10,#fff|plus:6.5,5,6,#c10000',
  TR: 'bg:#e30a17|cres:11.5,10,5,#fff,#e30a17|star:17,10,2,#fff',
  TT: 'bg:#ce1126|diag2:#fff,8|diag2:#000,6',
  TV: 'bg:#5b97b1|ukc|star:22,4,1,#fcd116|star:26,8,1,#fcd116|star:19,12,1,#fcd116|star:24,15,1,#fcd116|star:20,17,1,#fcd116',
  TW: 'bg:#fe0000|rect:0,0,15,10,#000095|dot:7.5,5,2.6,#fff',
  TZ: 'poly:#1eb53a,0 0 30 0 0 20|poly:#00a3dd,30 0 30 20 0 20|diag:#fcd116,7|diag:#000,5',
  UA: 'h:#0057b7,#ffd700',
  UG: 'h:#000,#fcdc04,#d90000,#000,#fcdc04,#d90000|dot:15,10,3.2,#fff',
  UM: US,
  US,
  UY: 'alt:9,#fff,#0038a8|rect:0,0,11,11.1,#fff|dot:5.5,5.5,2.6,#fcd116',
  UZ: 'hw:#0099b5 10,#ce1126 .6,#fff 8,#ce1126 .6,#1eb53a 10|cres:4.5,3.5,2.2,#fff,#0099b5',
  VA: 'vw:#ffe000 1,#fff 1|dot:22.5,10,2.6,#b8a37a',
  VC: 'vw:#002674 1,#fcd116 2,#009e60 1|poly:#009e60,12.5 6 14.5 9 12.5 12 10.5 9|poly:#009e60,17.5 6 19.5 9 17.5 12 15.5 9|poly:#009e60,15 10 17 13 15 16 13 13',
  VE: `h:#fcd116,#003893,#cf142b|${arcStars(15, 12, 3.6, 8, 160, 20, 0.6, '#fff')}`,
  VG: BLUE_ENSIGN('#009c41'),
  VI: 'bg:#fff|dot:15,10,3.6,#ffd100',
  VN: 'bg:#da251d|star:15,10,5,#ff0',
  VU: 'h:#d21034,#009543|poly:#000,0 0 13 10 0 20|poly:#fdce12,0 1.5 1.5 0 15 10 1.5 20 0 18.5 12 10',
  WF: FR,
  WS: 'bg:#ce1126|rect:0,0,15,10,#002b7f|star:7.5,2.6,1,#fff|star:5,5.4,1,#fff|star:10,5,1,#fff|star:7.5,8,1,#fff',
  XK: 'bg:#244aa5|poly:#d0a650,10 10 13 7 18 7.5 20 11 17 14 12 13|star:10,4.5,.8,#fff|star:13,3.7,.8,#fff|star:16,3.5,.8,#fff|star:19,3.7,.8,#fff|star:21.5,4.5,.8,#fff',
  YE: 'h:#ce1126,#fff,#000',
  YT: FR,
  ZA: 'za',
  ZM: 'bg:#198a00|rect:21,8,3,12,#de2010|rect:24,8,3,12,#000|rect:27,8,3,12,#ef7d00|dot:25.5,4,2,#ef7d00',
  ZW: 'h:#319208,#ffd200,#de2010,#000,#de2010,#ffd200,#319208|poly:#fff,0 0 11 10 0 20|star:4,10,2.4,#de2010',
};

/* ---------- IEC World Plugs (letters) ---------- */
export const PLUGS = {
  AD: 'CF', AE: 'G', AF: 'CF', AG: 'AB', AI: 'AB', AL: 'CF', AM: 'CF', AO: 'CF', AR: 'CI', AS: 'ABFI', AT: 'CF', AU: 'I', AW: 'ABF', AX: 'CF', AZ: 'CF',
  BA: 'CF', BB: 'AB', BD: 'CDGK', BE: 'CE', BF: 'CE', BG: 'CF', BH: 'G', BI: 'CE', BJ: 'CE', BL: 'CE', BM: 'AB', BN: 'G', BO: 'AC', BQ: 'AC', BR: 'CN', BS: 'AB', BT: 'CDFGM', BW: 'DGM', BY: 'CF', BZ: 'ABG',
  CA: 'AB', CC: 'I', CD: 'CDE', CF: 'CE', CG: 'CE', CH: 'CJ', CI: 'CE', CK: 'I', CL: 'CL', CM: 'CE', CN: 'ACI', CO: 'AB', CR: 'AB', CU: 'ABCL', CV: 'CF', CW: 'AB', CX: 'I', CY: 'G', CZ: 'CE',
  DE: 'CF', DJ: 'CE', DK: 'CEFK', DM: 'DG', DO: 'ABC', DZ: 'CF', EC: 'AB', EE: 'CF', EG: 'CF', EH: 'CE', ER: 'CL', ES: 'CF', ET: 'CEFL',
  FI: 'CF', FJ: 'I', FK: 'G', FM: 'AB', FO: 'CEFK', FR: 'CE', GA: 'C', GB: 'G', GD: 'G', GE: 'CF', GF: 'CDE', GG: 'G', GH: 'DG', GI: 'G', GL: 'CEFK', GM: 'G', GN: 'CFK', GP: 'CDE',
  GQ: 'CE', GR: 'CF', GT: 'AB', GU: 'AB', GW: 'C', GY: 'ABDG', HK: 'G', HN: 'AB', HR: 'CF', HT: 'AB', HU: 'CF', ID: 'CF', IE: 'G', IL: 'CH', IM: 'G', IN: 'CDM', IO: 'G', IQ: 'CDG', IR: 'CF', IS: 'CF', IT: 'CFL',
  JE: 'G', JM: 'AB', JO: 'BCDFGJ', JP: 'AB', KE: 'G', KG: 'CF', KH: 'ACG', KI: 'I', KM: 'CE', KN: 'DG', KP: 'AC', KR: 'CF', KW: 'CG', KY: 'AB', KZ: 'CF',
  LA: 'ABCEF', LB: 'ABCDG', LC: 'G', LI: 'CJ', LK: 'DG', LR: 'AB', LS: 'M', LT: 'CF', LU: 'CF', LV: 'CF', LY: 'CL',
  MA: 'CE', MC: 'CDEF', MD: 'CF', ME: 'CF', MF: 'CE', MG: 'CDEJK', MH: 'AB', MK: 'CF', ML: 'CE', MM: 'CDFG', MN: 'CE', MO: 'G', MP: 'AB', MQ: 'CDE', MR: 'C', MS: 'AB', MT: 'G', MU: 'CG', MV: 'CDGJKL', MW: 'G', MX: 'AB', MY: 'G', MZ: 'CFM',
  NA: 'DM', NC: 'CF', NE: 'ABCDEF', NF: 'I', NG: 'DG', NI: 'AB', NL: 'CF', NO: 'CF', NP: 'CDM', NR: 'I', NU: 'I', NZ: 'I', OM: 'CG',
  PA: 'AB', PE: 'ABC', PF: 'ABE', PG: 'I', PH: 'ABC', PK: 'CD', PL: 'CE', PM: 'CE', PN: 'I', PR: 'AB', PS: 'CH', PT: 'CF', PW: 'AB', PY: 'C', QA: 'DG',
  RE: 'CE', RO: 'CF', RS: 'CF', RU: 'CF', RW: 'CJ', SA: 'G', SB: 'GI', SC: 'G', SD: 'CD', SE: 'CF', SG: 'G', SH: 'G', SI: 'CF', SJ: 'CF', SK: 'CE', SL: 'DG', SM: 'CFL', SN: 'CDEK', SO: 'C', SR: 'CF', SS: 'CD', ST: 'CF', SV: 'AB', SX: 'AB', SY: 'CEL', SZ: 'M',
  TC: 'AB', TD: 'CDEF', TG: 'C', TH: 'ABCFO', TJ: 'CF', TK: 'I', TL: 'CEFI', TM: 'BCF', TN: 'CE', TO: 'I', TR: 'CF', TT: 'AB', TV: 'I', TW: 'AB', TZ: 'DG',
  UA: 'CF', UG: 'G', UM: 'AB', US: 'AB', UY: 'CFIL', UZ: 'CF', VA: 'CFL', VC: 'ACEGIK', VE: 'AB', VG: 'AB', VI: 'AB', VN: 'ACG', VU: 'I', WF: 'CE', WS: 'I', XK: 'CF', YE: 'ADG', YT: 'CE', ZA: 'CDMN', ZM: 'CDG', ZW: 'DG',
};

/* ---------- driving on the left (everything else drives on the right) ---------- */
export const LEFT = new Set(('AG AI AU BB BD BM BN BS BT BW CC CK CX CY DM FJ FK GB GD GG GY HK ID IE IM IN JE JM JP KE KI KN KY LC LK LS MO MS MT MU MV MW MY MZ '
  + 'NA NF NP NR NU NZ PG PK PN SB SC SG SH SR SZ TC TH TK TL TO TT TV TZ UG VC VG VI WS ZA ZM ZW').split(' '));

/* ---------- emergency numbers a visitor should know (blank when not sure) ---------- */
const EU112 = 'AD AL AM AT AX AZ BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GE GI GL GR HR HU IS IT KG KZ LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM TR UA VA XK GF GP MQ RE YT PM BL MF NC PF WF'.split(' ');
export const EMERGENCY = {
  ...Object.fromEntries(EU112.map(c => [c, '112'])),
  GB: '999', IM: '999', JE: '999', GG: '999', IE: '112', US: '911', CA: '911', MX: '911', PR: '911', VI: '911', GU: '911', UM: '911',
  AU: '000', NZ: '111', JP: '110/119', CN: '110/120', HK: '999', MO: '999', TW: '110/119', KR: '112/119', SG: '999/995', MY: '999',
  TH: '191/1669', ID: '112', PH: '911', VN: '113/115', IN: '112', PK: '15/1122', BD: '999', LK: '119', NP: '100', MV: '119',
  AE: '999', SA: '911', QA: '999', BH: '999', KW: '112', OM: '9999', IL: '100/101', JO: '911', LB: '112', EG: '122/123', MA: '19/15', TN: '197/190',
  ZA: '10111/112', KE: '999', TZ: '112', NG: '112', GH: '112', BR: '190/192', AR: '911', CL: '133/131', CO: '123', PE: '105', EC: '911', UY: '911',
  PY: '911', BO: '110', VE: '911', CR: '911', PA: '911', DO: '911', CU: '106', JM: '119', BS: '911', BB: '211', TT: '999',
};

/* ---------- weekends that are not Saturday + Sunday (0 = Sunday ... 6 = Saturday) ---------- */
export const WEEKEND = {
  SA: '56', KW: '56', QA: '56', BH: '56', OM: '56', EG: '56', JO: '56', IQ: '56', YE: '56', LY: '56', DZ: '56', SD: '56', SY: '56',
  IL: '56', PS: '56', BD: '56', MV: '56', IR: '5', AF: '45', NP: '6', BN: '50',
};

/* ---------- skyline kind per country (cities override below) ---------- */
const KIND_LISTS = {
  o: 'GB FR IT ES DE CZ PL HU RO BG SK LT LV EE RS BA MK AL UA BY RU MD VA SM LU IE DK SE FI TR IL PS LB SY MX CU XK UZ IN PK BD SI PY',
  c: 'PT GR HR MT CY MC ME JE GG IM GI UY PE AU AZ FK NF PM SH',
  m: 'CH AT LI AD NP BT NO GE AM KG TJ BO EC NZ MN AF LS ET RW CO CL SZ BI',
  n: 'IS GL FO SJ AX AQ BV GS HM TF',
  l: 'NL BE',
  d: 'AE SA QA KW BH OM EG MA DZ LY TN JO IQ YE SD MR NE ML TD EH IR NA BW TM BF DJ ER SO',
  p: 'AG AI AW BB BQ BS CW DM DO GD GP HT JM KN KY LC MQ MS PR SX MF BL TC TT VC VG VI AS CK FJ FM GU KI MH MP NC NR NU PF PG PW SB TK TO TV VU WF WS PN '
    + 'BM UM CF MW SS UG ZM ZW MV MU SC RE YT KM MG IO CC CX TH ID PH KH LA MM VN BN TL LK BZ CR PA HN NI SV GT GH CI SN CM GA GQ ST TG BJ SL LR GN GW GM CG CD AO TZ MZ BR VE GY SR GF CV',
  t: 'US CA JP KR KP CN HK MO TW SG MY KZ AR NG ZA KE',
};
export const KIND = Object.fromEntries(Object.entries(KIND_LISTS).flatMap(([k, list]) => list.split(' ').map(cc => [cc, k])));

/* ---------- language order overrides (the first language with a greeting wins) ---------- */
export const LANGS = {
  SG: 'en', IN: 'hi,en', KE: 'sw,en', HK: 'zh-Hant,en', MO: 'zh-Hant,pt', TW: 'zh-Hant', CN: 'zh', BE: 'nl,fr,de', CH: 'de,fr,it',
  LU: 'fr,de', MT: 'en', CY: 'el', ZA: 'zu,af,en', NO: 'nb', PH: 'tl,en', MY: 'ms,en', NZ: 'en', IE: 'en', BA: 'hr,sr', ME: 'sr',
};

/* ---------- currency overrides (GeoNames can lag behind a change) ---------- */
export const CCY = {
  BG: 'EUR', // the euro replaced the lev on 1 January 2026
};

/* ---------- countries where the time zone is, in effect, the city ---------- */
export const CITY_STATES = 'SG HK MO MC VA SM GI BH QA KW LU AD LI MT'.split(' ');

/* ---------- cities kept whatever their population (name|cc) ---------- */
export const TOURIST = [
  // Europe
  'Florence|IT', 'Venice|IT', 'Pisa|IT', 'Siena|IT', 'Verona|IT', 'Bologna|IT', 'Sorrento|IT', 'Como|IT', 'Bergamo|IT', 'Cagliari|IT', 'Trieste|IT', 'Lucca|IT', 'Perugia|IT', 'Amalfi|IT',
  'Nice|FR', 'Cannes|FR', 'Avignon|FR', 'Strasbourg|FR', 'Bordeaux|FR', 'Annecy|FR', 'Montpellier|FR', 'Nantes|FR', 'Lille|FR', 'Toulouse|FR', 'Ajaccio|FR', 'Reims|FR', 'Biarritz|FR',
  'Seville|ES', 'Granada|ES', 'Malaga|ES', 'Palma|ES', 'Ibiza|ES', 'Marbella|ES', 'Benidorm|ES', 'Santa Cruz de Tenerife|ES', 'San Sebastián|ES', 'Bilbao|ES', 'Toledo|ES', 'Salamanca|ES',
  'Córdoba|ES', 'Alicante|ES', 'Santiago de Compostela|ES', 'Cádiz|ES', 'Girona|ES', 'Arrecife|ES', 'Puerto del Rosario|ES',
  'Faro|PT', 'Funchal|PT', 'Sintra|PT', 'Coimbra|PT', 'Albufeira|PT', 'Cascais|PT', 'Braga|PT', 'Ponta Delgada|PT', 'Portimão|PT',
  'Oxford|GB', 'Cambridge|GB', 'Bath|GB', 'York|GB', 'Inverness|GB', 'Brighton|GB', 'Canterbury|GB', 'Aberdeen|GB', 'Exeter|GB', 'Norwich|GB', 'Stirling|GB', 'Dundee|GB', 'Plymouth|GB',
  'Southampton|GB', 'Swansea|GB', 'Derry|GB', 'Chester|GB', 'Durham|GB', 'Lincoln|GB', 'Windsor|GB', 'Stratford-upon-Avon|GB', 'Penzance|GB', 'Newquay|GB', 'Keswick|GB', 'Saint Helier|JE',
  'Galway|IE', 'Cork|IE', 'Limerick|IE', 'Kilkenny|IE', 'Bergen|NO', 'Tromsø|NO', 'Stavanger|NO', 'Trondheim|NO', 'Ålesund|NO', 'Akureyri|IS',
  'Gothenburg|SE', 'Malmö|SE', 'Uppsala|SE', 'Kiruna|SE', 'Aarhus|DK', 'Odense|DK', 'Turku|FI', 'Rovaniemi|FI', 'Tampere|FI',
  'Bruges|BE', 'Ghent|BE', 'Liège|BE', 'Maastricht|NL', 'Utrecht|NL', 'Haarlem|NL', 'Delft|NL', 'Leiden|NL', 'Eindhoven|NL',
  'Heidelberg|DE', 'Freiburg|DE', 'Dresden|DE', 'Nuremberg|DE', 'Bremen|DE', 'Hanover|DE', 'Rostock|DE', 'Lübeck|DE', 'Regensburg|DE', 'Würzburg|DE', 'Garmisch-Partenkirchen|DE', 'Bonn|DE', 'Konstanz|DE',
  'Salzburg|AT', 'Innsbruck|AT', 'Graz|AT', 'Linz|AT', 'Lucerne|CH', 'Geneva|CH', 'Basel|CH', 'Lausanne|CH', 'Lugano|CH', 'Interlaken|CH', 'Zermatt|CH', 'St. Moritz|CH', 'Montreux|CH',
  'Kraków|PL', 'Gdańsk|PL', 'Wrocław|PL', 'Poznań|PL', 'Zakopane|PL', 'Brno|CZ', 'Český Krumlov|CZ', 'Karlovy Vary|CZ', 'Bratislava|SK', 'Debrecen|HU',
  'Dubrovnik|HR', 'Split|HR', 'Zadar|HR', 'Pula|HR', 'Rijeka|HR', 'Kotor|ME', 'Budva|ME', 'Bled|SI', 'Piran|SI', 'Mostar|BA', 'Ohrid|MK', 'Sarandë|AL', 'Berat|AL',
  'Heraklion|GR', 'Rhodes|GR', 'Kerkyra|GR', 'Chania|GR', 'Thessaloniki|GR', 'Mykonos|GR', 'Fira|GR', 'Nafplio|GR', 'Kos|GR', 'Zakynthos|GR',
  'Limassol|CY', 'Paphos|CY', 'Larnaca|CY', 'Ayia Napa|CY', 'Sliema|MT', 'Valletta|MT',
  'Antalya|TR', 'Izmir|TR', 'Bodrum|TR', 'Fethiye|TR', 'Nevşehir|TR', 'Marmaris|TR', 'Alanya|TR', 'Dalaman|TR',
  'Brasov|RO', 'Cluj-Napoca|RO', 'Sibiu|RO', 'Varna|BG', 'Burgas|BG', 'Plovdiv|BG', 'Tartu|EE', 'Jūrmala|LV', 'Kaunas|LT', 'Lviv|UA', 'Odesa|UA', 'Saint Petersburg|RU',
  // Africa and the Middle East
  'Marrakesh|MA', 'Fes|MA', 'Essaouira|MA', 'Agadir|MA', 'Tangier|MA', 'Chefchaouene|MA', 'Luxor|EG', 'Aswan|EG', 'Hurghada|EG', 'Sharm el-Sheikh|EG', 'Dahab|EG',
  'Zanzibar|TZ', 'Arusha|TZ', 'Mombasa|KE', 'Malindi|KE', 'Victoria Falls|ZW', 'Livingstone|ZM', 'Stellenbosch|ZA', 'Port Elizabeth|ZA', 'Knysna|ZA', 'Windhoek|NA', 'Swakopmund|NA',
  'Kigali|RW', 'Kampala|UG', 'Djerba|TN', 'Sousse|TN', 'Hammamet|TN',
  'Aqaba|JO', 'Wadi Musa|JO', 'Eilat|IL', 'Haifa|IL', 'Nazareth|IL', 'Bethlehem|PS', 'Salalah|OM', 'Ras al-Khaimah|AE', 'Al Ain|AE', 'Fujairah|AE',
  // Asia
  'Kyoto|JP', 'Nara|JP', 'Hakone|JP', 'Nikko|JP', 'Kanazawa|JP', 'Takayama|JP', 'Naha|JP', 'Hiroshima|JP', 'Kamakura|JP', 'Matsumoto|JP', 'Hakodate|JP', 'Beppu|JP',
  'Gyeongju|KR', 'Jeju City|KR', 'Sokcho|KR', 'Hualien City|TW', 'Tainan|TW',
  'Guilin|CN', 'Lijiang|CN', 'Suzhou|CN', 'Sanya|CN', 'Lhasa|CN', 'Zhangjiajie|CN', 'Dali|CN', 'Macau|MO',
  'Chiang Mai|TH', 'Phuket|TH', 'Krabi|TH', 'Ko Samui|TH', 'Pattaya|TH', 'Hua Hin|TH', 'Ayutthaya|TH', 'Chiang Rai|TH',
  'Hoi An|VN', 'Hue|VN', 'Nha Trang|VN', 'Ha Long|VN', 'Da Lat|VN', 'Sa Pa|VN', 'Phu Quoc|VN',
  'Siem Reap|KH', 'Luang Prabang|LA', 'Vang Vieng|LA', 'Bagan|MM', 'Mandalay|MM',
  'Denpasar|ID', 'Ubud|ID', 'Yogyakarta|ID', 'Kuta|ID', 'Labuan Bajo|ID',
  'George Town|MY', 'Malacca|MY', 'Kota Kinabalu|MY', 'Kuching|MY', 'Langkawi|MY', 'Ipoh|MY',
  'Cebu City|PH', 'Puerto Princesa|PH', 'El Nido|PH', 'Boracay|PH', 'Baguio|PH',
  'Panaji|IN', 'Udaipur|IN', 'Jaisalmer|IN', 'Jodhpur|IN', 'Varanasi|IN', 'Rishikesh|IN', 'Amritsar|IN', 'Kochi|IN', 'Mysore|IN', 'Shimla|IN', 'Darjeeling|IN', 'Pushkar|IN', 'Leh|IN', 'Munnar|IN',
  'Kandy|LK', 'Galle|LK', 'Ella|LK', 'Pokhara|NP', 'Paro|BT', 'Thimphu|BT', 'Male|MV', 'Samarkand|UZ', 'Bukhara|UZ', 'Khiva|UZ', 'Batumi|GE', 'Kutaisi|GE',
  'Ulaanbaatar|MN', 'Almaty|KZ', 'Bishkek|KG',
  // The Americas
  'Key West|US', 'Savannah|US', 'Charleston|US', 'Santa Fe|US', 'Napa|US', 'Palm Springs|US', 'Sedona|US', 'Flagstaff|US', 'Aspen|US', 'Anchorage|US',
  'Honolulu|US', 'Kahului|US', 'Hilo|US', 'Lahaina|US', 'Kailua-Kona|US', 'Orlando|US', 'Miami Beach|US', 'New Orleans|US', 'Nashville|US', 'Asheville|US', 'Salt Lake City|US', 'Park City|US',
  'Portland|US', 'Boulder|US', 'Santa Barbara|US', 'Monterey|US', 'Carmel-by-the-Sea|US', 'South Lake Tahoe|US', 'Bar Harbor|US', 'Provincetown|US',
  'Quebec|CA', 'Victoria|CA', 'Banff|CA', 'Whistler|CA', 'Halifax|CA', 'Niagara Falls|CA', 'Jasper|CA', 'Charlottetown|CA', 'St. John\'s|CA', 'Kelowna|CA',
  'Cancún|MX', 'Playa del Carmen|MX', 'Tulum|MX', 'Oaxaca|MX', 'Puerto Vallarta|MX', 'San Miguel de Allende|MX', 'Cabo San Lucas|MX', 'Mérida|MX', 'San José del Cabo|MX', 'Cozumel|MX', 'Guanajuato|MX',
  'Varadero|CU', 'Trinidad|CU', 'Montego Bay|JM', 'Ocho Rios|JM', 'Negril|JM', 'Punta Cana|DO', 'Puerto Plata|DO', 'Bridgetown|BB', 'Castries|LC', 'Nassau|BS', 'Philipsburg|SX',
  'Oranjestad|AW', 'Willemstad|CW', 'Kralendijk|BQ', 'Saint John\'s|AG', 'Basseterre|KN', 'Roseau|DM', 'Kingstown|VC', 'Saint George\'s|GD', 'George Town|KY', 'Hamilton|BM', 'Road Town|VG',
  'Charlotte Amalie|VI', 'San Juan|PR', 'Port of Spain|TT', 'Scarborough|TT',
  'Cartagena|CO', 'Santa Marta|CO', 'Cusco|PE', 'Arequipa|PE', 'Puno|PE', 'Mendoza|AR', 'San Carlos de Bariloche|AR', 'Ushuaia|AR', 'Salta|AR', 'Puerto Iguazú|AR', 'El Calafate|AR',
  'Valparaíso|CL', 'Puerto Natales|CL', 'San Pedro de Atacama|CL', 'Punta Arenas|CL', 'Florianópolis|BR', 'Foz do Iguaçu|BR', 'Paraty|BR', 'Búzios|BR', 'Ouro Preto|BR', 'Manaus|BR',
  'Punta del Este|UY', 'Colonia del Sacramento|UY', 'Sucre|BO', 'Uyuni|BO', 'Cuenca|EC', 'Puerto Ayora|EC', 'Antigua Guatemala|GT', 'Flores|GT', 'San Pedro|BZ', 'Granada|NI', 'Tamarindo|CR', 'Liberia|CR',
  'Bocas del Toro|PA', 'Roatán|HN',
  // Oceania
  'Cairns|AU', 'Darwin|AU', 'Alice Springs|AU', 'Hobart|AU', 'Byron Bay|AU', 'Broome|AU', 'Port Douglas|AU', 'Airlie Beach|AU', 'Newcastle|AU', 'Wollongong|AU', 'Geelong|AU', 'Launceston|AU', 'Townsville|AU',
  'Queenstown|NZ', 'Rotorua|NZ', 'Christchurch|NZ', 'Dunedin|NZ', 'Nelson|NZ', 'Napier|NZ', 'Taupo|NZ', 'Wanaka|NZ', 'Tauranga|NZ',
  'Nadi|FJ', 'Suva|FJ', 'Papeete|PF', 'Avarua|CK', 'Apia|WS', 'Nuku\'alofa|TO', 'Port Vila|VU', 'Nouméa|NC', 'Hagåtña|GU',
];

/* ---------- other names people type (ASCII-folded when matched) ---------- */
export const ALIASES = {
  'Lisbon|PT': 'Lisboa', 'Munich|DE': 'München,Muenchen', 'Cologne|DE': 'Köln,Koeln', 'Prague|CZ': 'Praha', 'Vienna|AT': 'Wien', 'Florence|IT': 'Firenze',
  'Rome|IT': 'Roma', 'Venice|IT': 'Venezia', 'Naples|IT': 'Napoli', 'Milan|IT': 'Milano', 'Turin|IT': 'Torino', 'Genoa|IT': 'Genova', 'The Hague|NL': 'Den Haag,s-Gravenhage',
  'Brussels|BE': 'Bruxelles,Brussel', 'Antwerpen|BE': 'Antwerp,Anvers', 'Ghent|BE': 'Gent', 'Bruges|BE': 'Brugge', 'Liège|BE': 'Luik', 'Geneva|CH': 'Genève,Geneve,Genf', 'Zürich|CH': 'Zurich',
  'Lucerne|CH': 'Luzern', 'Bern|CH': 'Berne', 'Basel|CH': 'Bâle,Basle', 'Kraków|PL': 'Cracow,Krakow', 'Warsaw|PL': 'Warszawa', 'Gdańsk|PL': 'Danzig', 'Wrocław|PL': 'Breslau',
  'Moscow|RU': 'Moskva', 'Saint Petersburg|RU': 'St Petersburg,St. Petersburg,Sankt-Peterburg', 'Kyiv|UA': 'Kiev', 'Odesa|UA': 'Odessa', 'Lviv|UA': 'Lvov,Lwow',
  'Mumbai|IN': 'Bombay', 'Kolkata|IN': 'Calcutta', 'Chennai|IN': 'Madras', 'Bengaluru|IN': 'Bangalore', 'New Delhi|IN': 'Delhi', 'Mysore|IN': 'Mysuru', 'Kochi|IN': 'Cochin',
  'Varanasi|IN': 'Benares,Banaras', 'Pune|IN': 'Poona', 'Beijing|CN': 'Peking', 'Guangzhou|CN': 'Canton', 'Xi\'an|CN': 'Xian', 'Ho Chi Minh City|VN': 'Saigon', 'Hue|VN': 'Huế',
  'Yangon|MM': 'Rangoon', 'New York City|US': 'New York,NYC,Manhattan,Brooklyn', 'Los Angeles|US': 'L.A.', 'San Francisco|US': 'SF', 'Washington|US': 'Washington DC,Washington D.C.',
  'Las Vegas|US': 'Vegas', 'Rio de Janeiro|BR': 'Rio', 'São Paulo|BR': 'Sao Paulo', 'Mexico City|MX': 'Ciudad de México,Ciudad de Mexico,CDMX', 'Thessaloniki|GR': 'Salonica,Thessaloníki',
  'Athens|GR': 'Athina,Athína', 'Kerkyra|GR': 'Corfu', 'Fira|GR': 'Santorini,Thira', 'Heraklion|GR': 'Iraklio,Crete', 'Porto|PT': 'Oporto', 'Seville|ES': 'Sevilla', 'Malaga|ES': 'Málaga',
  'Palma|ES': 'Palma de Mallorca,Mallorca,Majorca', 'Ibiza|ES': 'Eivissa', 'San Sebastián|ES': 'Donostia', 'Santa Cruz de Tenerife|ES': 'Tenerife', 'Las Palmas de Gran Canaria|ES': 'Las Palmas,Gran Canaria',
  'Arrecife|ES': 'Lanzarote', 'Puerto del Rosario|ES': 'Fuerteventura', 'Copenhagen|DK': 'København,Kobenhavn', 'Gothenburg|SE': 'Göteborg,Goteborg', 'Reykjavík|IS': 'Reykjavik',
  'Marrakesh|MA': 'Marrakech', 'Fes|MA': 'Fez', 'Chefchaouene|MA': 'Chefchaouen', 'Cairo|EG': 'Al Qahirah', 'Tel Aviv|IL': 'Tel Aviv-Yafo,Tel-Aviv', 'Jerusalem|IL': 'Yerushalayim',
  'Denpasar|ID': 'Bali', 'Panaji|IN': 'Panjim,Goa', 'Kuta|ID': 'Seminyak', 'George Town|MY': 'Penang', 'Malacca|MY': 'Melaka', 'Male|MV': 'Malé,Maldives', 'Hong Kong|HK': 'HK,Kowloon',
  'Macau|MO': 'Macao', 'Taipei|TW': 'Taipei City', 'Seoul|KR': 'Soul', 'Jeju City|KR': 'Jeju', 'Ko Samui|TH': 'Koh Samui,Samui', 'Phuket|TH': 'Phuket Town', 'Siem Reap|KH': 'Angkor',
  'Cusco|PE': 'Cuzco', 'Quebec|CA': 'Québec,Quebec City', 'Montreal|CA': 'Montréal', 'Nouméa|NC': 'Noumea', 'Hagåtña|GU': 'Hagatna,Guam', 'Cancún|MX': 'Cancun',
  'San Carlos de Bariloche|AR': 'Bariloche', 'Puerto Ayora|EC': 'Galapagos,Galápagos', 'Victoria Falls|ZW': 'Vic Falls', 'Port Elizabeth|ZA': 'Gqeberha', 'Zanzibar|TZ': 'Stone Town',
  'Ha Long|VN': 'Halong,Halong Bay', 'Sa Pa|VN': 'Sapa', 'Kailua-Kona|US': 'Kona', 'Kahului|US': 'Maui', 'Lahaina|US': 'Maui', 'South Lake Tahoe|US': 'Tahoe',
  'Derry|GB': 'Londonderry', 'Saint Helier|JE': 'St Helier,Jersey', 'Kingston upon Hull|GB': 'Hull', 'Newcastle upon Tyne|GB': 'Newcastle',
  'Nevşehir|TR': 'Cappadocia,Goreme,Göreme', 'Wadi Musa|JO': 'Petra', 'Mykonos|GR': 'Mikonos', 'Dubrovnik|HR': 'Ragusa', 'Ulaanbaatar|MN': 'Ulan Bator', 'Almaty|KZ': 'Alma-Ata',
  'Astana|KZ': 'Nur-Sultan', 'Chișinău|MD': 'Chisinau,Kishinev', 'Bucharest|RO': 'Bucuresti,București', 'Belgrade|RS': 'Beograd', 'Sofia|BG': 'Sofiya', 'Tbilisi|GE': 'Tiflis',
  'Kathmandu|NP': 'Katmandu', 'Dhaka|BD': 'Dacca', 'Beirut|LB': 'Beyrouth', 'Kuwait City|KW': 'Kuwait', 'Doha|QA': 'Qatar', 'Singapore|SG': 'Singapura', 'Luxembourg|LU': 'Luxemburg',
};

/* ---------- a city's own language where the country has several ---------- */
export const CITY_LANG = {
  'Montreal|CA': 'fr', 'Quebec|CA': 'fr', 'Geneva|CH': 'fr', 'Lausanne|CH': 'fr', 'Montreux|CH': 'fr', 'Lugano|CH': 'it', 'Brussels|BE': 'fr', 'Liège|BE': 'fr',
  'Charleroi|BE': 'fr', 'Namur|BE': 'fr', 'Barcelona|ES': 'ca', 'Girona|ES': 'ca', 'Palma|ES': 'ca', 'Chennai|IN': 'ta', 'Cape Town|ZA': 'en', 'Stellenbosch|ZA': 'af',
  'Port Elizabeth|ZA': 'en', 'Knysna|ZA': 'en', 'Pretoria|ZA': 'af', 'Colombo|LK': 'si', 'Jaffna|LK': 'ta', 'Bolzano|IT': 'de', 'Helsinki|FI': 'fi', 'Nicosia|CY': 'el',
};

/* ---------- skyline kind per city (where it differs from the country's) ---------- */
export const CITY_KIND = {
  t: 'New York City|US,Chicago|US,Toronto|CA,Abu Dhabi|AE,Kuwait City|KW,Shanghai|CN,Shenzhen|CN,Mumbai|IN,Bangkok|TH,Kuala Lumpur|MY,Jakarta|ID,Manila|PH,'
    + 'Ho Chi Minh City|VN,Hanoi|VN,Panama City|PA,São Paulo|BR,Mexico City|MX,Frankfurt am Main|DE,Moscow|RU,Istanbul|TR,Tel Aviv|IL,Riyadh|SA,Melbourne|AU,Brisbane|AU,Gold Coast|AU,'
    + 'Santiago|CL,Bogotá|CO,Lima|PE,Caracas|VE,Nairobi|KE,Lagos|NG,Johannesburg|ZA,London|GB,Warsaw|PL,Rotterdam|NL,Benidorm|ES,Monaco|MC,Astana|KZ,Baku|AZ,Tbilisi|GE,Dhaka|BD,Karachi|PK,Cairo|EG,'
    + 'Bengaluru|IN,Hyderabad|IN,Gurgaon|IN,Colombo|LK,Phnom Penh|KH,Yangon|MM,Auckland|NZ,Calgary|CA,Edmonton|CA,Ottawa|CA',
  o: 'Kyoto|JP,Nara|JP,Kanazawa|JP,Takayama|JP,Kamakura|JP,Nikko|JP,Gyeongju|KR,Quebec|CA,Montreal|CA,Boston|US,Philadelphia|US,New Orleans|US,Savannah|US,Charleston|US,Santa Fe|US,'
    + 'Washington|US,Lijiang|CN,Suzhou|CN,Xi\'an|CN,Dali|CN,Lhasa|CN,Pingyao|CN,Hoi An|VN,Hue|VN,Luang Prabang|LA,Malacca|MY,George Town|MY,Ayutthaya|TH,Bagan|MM,Mandalay|MM,'
    + 'Siem Reap|KH,Yogyakarta|ID,Ubud|ID,Cusco|PE,Arequipa|PE,Sucre|BO,Cartagena|CO,Quito|EC,Cuenca|EC,Antigua Guatemala|GT,Granada|NI,Oaxaca|MX,San Miguel de Allende|MX,Guanajuato|MX,'
    + 'Mérida|MX,Puebla|MX,Havana|CU,Trinidad|CU,Ouro Preto|BR,Paraty|BR,Salvador|BR,Colonia del Sacramento|UY,Buenos Aires|AR,Valletta|MT,Mdina|MT,Dubrovnik|HR,Split|HR,Zadar|HR,Kotor|ME,'
    + 'Rhodes|GR,Nafplio|GR,Athens|GR,Porto|PT,Coimbra|PT,Sintra|PT,Évora|PT,Fes|MA,Chefchaouene|MA,Jerusalem|IL,Bethlehem|PS,Samarkand|UZ,Bukhara|UZ,Khiva|UZ,'
    + 'Tunis|TN,Muscat|OM,Jaipur|IN,Udaipur|IN,Jodhpur|IN,Varanasi|IN,Agra|IN,Amritsar|IN,Delhi|IN,New Delhi|IN,Lahore|PK,Tallinn|EE,Riga|LV,Vilnius|LT,Salzburg|AT,Vienna|AT,Graz|AT,'
    + 'Bern|CH,Basel|CH,Lucerne|CH,Stockholm|SE,Copenhagen|DK,Oslo|NO,Bergen|NO,Helsinki|FI,Edinburgh|GB,York|GB,Bath|GB',
  c: 'Sydney|AU,Perth|AU,Adelaide|AU,Hobart|AU,Darwin|AU,Wollongong|AU,Newcastle|AU,Geelong|AU,Byron Bay|AU,Barcelona|ES,Valencia|ES,Malaga|ES,Palma|ES,Alicante|ES,Cádiz|ES,San Sebastián|ES,'
    + 'Las Palmas de Gran Canaria|ES,Santa Cruz de Tenerife|ES,Arrecife|ES,Puerto del Rosario|ES,Ibiza|ES,Marbella|ES,Nice|FR,Cannes|FR,Marseille|FR,Biarritz|FR,Ajaccio|FR,Naples|IT,Venice|IT,'
    + 'Genoa|IT,Palermo|IT,Bari|IT,Cagliari|IT,Trieste|IT,Sorrento|IT,Amalfi|IT,Catania|IT,Brighton|GB,Plymouth|GB,Penzance|GB,Newquay|GB,Swansea|GB,Aberdeen|GB,Southampton|GB,Belfast|GB,'
    + 'Galway|IE,Cork|IE,Dublin|IE,Gothenburg|SE,Malmö|SE,Aarhus|DK,Stavanger|NO,Ålesund|NO,Turku|FI,Gdańsk|PL,Rostock|DE,Hamburg|DE,Kiel|DE,Lübeck|DE,'
    + 'Antalya|TR,Izmir|TR,Bodrum|TR,Fethiye|TR,Marmaris|TR,Alanya|TR,Varna|BG,Burgas|BG,Odesa|UA,Batumi|GE,Saint Petersburg|RU,Vladivostok|RU,Sochi|RU,Haifa|IL,Eilat|IL,Beirut|LB,'
    + 'Alexandria|EG,Hurghada|EG,Sharm el-Sheikh|EG,Dahab|EG,Aqaba|JO,Casablanca|MA,Tangier|MA,Essaouira|MA,Agadir|MA,Rabat|MA,Djerba|TN,Sousse|TN,Hammamet|TN,Cape Town|ZA,Durban|ZA,'
    + 'Port Elizabeth|ZA,Knysna|ZA,Swakopmund|NA,San Francisco|US,Seattle|US,San Diego|US,Miami|US,Miami Beach|US,Los Angeles|US,Santa Barbara|US,Monterey|US,Carmel-by-the-Sea|US,'
    + 'Bar Harbor|US,Provincetown|US,Key West|US,Vancouver|CA,Victoria|CA,Halifax|CA,Charlottetown|CA,St. John\'s|CA,Valparaíso|CL,Viña del Mar|CL,Montevideo|UY,Punta del Este|UY,'
    + 'Busan|KR,Sokcho|KR,Yokohama|JP,Kobe|JP,Hakodate|JP,Fukuoka|JP,Wellington|NZ,Napier|NZ,Tauranga|NZ,Dunedin|NZ,Nelson|NZ,Lima|PE',
  n: 'Tromsø|NO,Rovaniemi|FI,Kiruna|SE,Bodø|NO,Luleå|SE,Oulu|FI',
  m: 'Denver|US,Salt Lake City|US,Park City|US,Aspen|US,Boulder|US,Flagstaff|US,Sedona|US,Asheville|US,South Lake Tahoe|US,Anchorage|US,Banff|CA,Whistler|CA,Jasper|CA,'
    + 'Kelowna|CA,Innsbruck|AT,Zakopane|PL,Garmisch-Partenkirchen|DE,Grenoble|FR,Annecy|FR,Chamonix|FR,Granada|ES,Andorra la Vella|AD,Bled|SI,Brasov|RO,Mendoza|AR,San Carlos de Bariloche|AR,'
    + 'Ushuaia|AR,El Calafate|AR,Salta|AR,Puerto Natales|CL,San Pedro de Atacama|CL,Punta Arenas|CL,La Paz|BO,Uyuni|BO,Medellín|CO,Puno|PE,Cusco|PE,Shimla|IN,Darjeeling|IN,Leh|IN,'
    + 'Rishikesh|IN,Munnar|IN,Pokhara|NP,Kandy|LK,Ella|LK,Da Lat|VN,Sa Pa|VN,Chiang Mai|TH,Chiang Rai|TH,Baguio|PH,Hakone|JP,Matsumoto|JP,Sapporo|JP,Lhasa|CN,Zhangjiajie|CN,Guilin|CN,'
    + 'Kunming|CN,Almaty|KZ,Bishkek|KG,Tehran|IR,Kabul|AF,Sana\'a|YE,Addis Ababa|ET,Arusha|TZ,Queenstown|NZ,Wanaka|NZ,Rotorua|NZ,Taupo|NZ,Christchurch|NZ',
  d: 'Las Vegas|US,Phoenix|US,Tucson|US,Palm Springs|US,El Paso|US,Albuquerque|US,Alice Springs|AU,Broome|AU,Karachi|PK,Jaisalmer|IN,Pushkar|IN,Wadi Musa|JO,Nevşehir|TR,Luxor|EG,Aswan|EG,'
    + 'Ras al-Khaimah|AE,Fujairah|AE,Al Ain|AE,Salalah|OM,Ulaanbaatar|MN,Ürümqi|CN,Hermosillo|MX,Mexicali|MX,Chihuahua|MX',
  p: 'Honolulu|US,Kahului|US,Hilo|US,Lahaina|US,Kailua-Kona|US,Cairns|AU,Port Douglas|AU,Airlie Beach|AU,Townsville|AU,Cancún|MX,Playa del Carmen|MX,Tulum|MX,Cozumel|MX,Puerto Vallarta|MX,'
    + 'Cabo San Lucas|MX,San José del Cabo|MX,Varadero|CU,Mombasa|KE,Malindi|KE,Zanzibar|TZ,Panaji|IN,Kochi|IN,Sanya|CN,Naha|JP,Phuket|TH,Krabi|TH,Ko Samui|TH,Pattaya|TH,Hua Hin|TH,'
    + 'Nha Trang|VN,Phu Quoc|VN,Langkawi|MY,Kota Kinabalu|MY,Kuching|MY,Denpasar|ID,Kuta|ID,Labuan Bajo|ID,Cebu City|PH,Puerto Princesa|PH,El Nido|PH,Boracay|PH,Galle|LK,Male|MV,'
    + 'Rio de Janeiro|BR,Florianópolis|BR,Búzios|BR,Manaus|BR,Fortaleza|BR,Recife|BR,Natal|BR,Santa Marta|CO,Cartagena|CO,Puerto Ayora|EC,Tamarindo|CR,San Pedro|BZ,Bocas del Toro|PA,Roatán|HN,'
    + 'Funchal|PT,Ponta Delgada|PT,Miami Beach|US',
};

/* ---------- airports whose municipality is not the city they serve (IATA -> name|cc) ---------- */
export const AIRPORT_CITY = {
  EDI: 'Edinburgh|GB', LBA: 'Leeds|GB', ISB: 'Islamabad|PK', BZE: 'Belize City|BZ', GSO: 'Greensboro|US', PVD: 'Providence|US', SJC: 'San Jose|US',
  IXC: 'Chandigarh|IN', SOC: 'Surakarta|ID', VTZ: 'Visakhapatnam|IN', ZUH: 'Zhuhai|CN', TNN: 'Tainan|TW', CJJ: 'Cheongju-si|KR',
  ICN: 'Seoul|KR', GMP: 'Seoul|KR', EWR: 'New York City|US', JFK: 'New York City|US', LGA: 'New York City|US', NRT: 'Tokyo|JP', HND: 'Tokyo|JP', KIX: 'Osaka|JP', ITM: 'Osaka|JP',
  CTS: 'Sapporo|JP', LGW: 'London|GB', STN: 'London|GB', LTN: 'London|GB', LCY: 'London|GB', SEN: 'London|GB', LHR: 'London|GB', CDG: 'Paris|FR', ORY: 'Paris|FR', BVA: 'Paris|FR',
  FCO: 'Rome|IT', CIA: 'Rome|IT', MXP: 'Milan|IT', LIN: 'Milan|IT', BGY: 'Bergamo|IT', VCE: 'Venice|IT', TSF: 'Venice|IT', NAP: 'Naples|IT', IAD: 'Washington|US', DCA: 'Washington|US',
  BWI: 'Baltimore|US', SFO: 'San Francisco|US', OAK: 'Oakland|US', FLL: 'Fort Lauderdale|US', EZE: 'Buenos Aires|AR', AEP: 'Buenos Aires|AR', GRU: 'São Paulo|BR', CGH: 'São Paulo|BR',
  VCP: 'Campinas|BR', GIG: 'Rio de Janeiro|BR', SDU: 'Rio de Janeiro|BR', DWC: 'Dubai|AE', DXB: 'Dubai|AE', SHJ: 'Sharjah|AE', PKX: 'Beijing|CN', PEK: 'Beijing|CN', PVG: 'Shanghai|CN',
  SHA: 'Shanghai|CN', HKG: 'Hong Kong|HK', TPE: 'Taipei|TW', TSA: 'Taipei|TW', KUL: 'Kuala Lumpur|MY', SZB: 'Kuala Lumpur|MY', CGK: 'Jakarta|ID', DPS: 'Denpasar|ID', BKK: 'Bangkok|TH',
  DMK: 'Bangkok|TH', MNL: 'Manila|PH', MEL: 'Melbourne|AU', AVV: 'Melbourne|AU', YYZ: 'Toronto|CA', YTZ: 'Toronto|CA', YUL: 'Montreal|CA', YVR: 'Vancouver|CA', ORD: 'Chicago|US',
  MDW: 'Chicago|US', DFW: 'Dallas|US', DAL: 'Dallas|US', IAH: 'Houston|US', HOU: 'Houston|US', SEA: 'Seattle|US', DTW: 'Detroit|US', AMS: 'Amsterdam|NL', MUC: 'Munich|DE',
  BER: 'Berlin|DE', HHN: 'Frankfurt am Main|DE', FRA: 'Frankfurt am Main|DE', VIE: 'Vienna|AT', ZRH: 'Zürich|CH', BSL: 'Basel|CH', BRU: 'Brussels|BE', CRL: 'Brussels|BE',
  CPH: 'Copenhagen|DK', ARN: 'Stockholm|SE', BMA: 'Stockholm|SE', NYO: 'Stockholm|SE', OSL: 'Oslo|NO', TRF: 'Oslo|NO', HEL: 'Helsinki|FI', KEF: 'Reykjavík|IS', RKV: 'Reykjavík|IS',
  BCN: 'Barcelona|ES', ATH: 'Athens|GR', IST: 'Istanbul|TR', SAW: 'Istanbul|TR', JNB: 'Johannesburg|ZA', TLV: 'Tel Aviv|IL', LIM: 'Lima|PE', CMB: 'Colombo|LK', MLE: 'Male|MV',
  BFS: 'Belfast|GB', BHD: 'Belfast|GB', EMA: 'Nottingham|GB', PIK: 'Glasgow|GB', SJU: 'San Juan|PR', CUN: 'Cancún|MX', SJD: 'San José del Cabo|MX', NAN: 'Nadi|FJ', PPT: 'Papeete|PF',
  OGG: 'Kahului|US', KOA: 'Kailua-Kona|US', ZNZ: 'Zanzibar|TZ', RAK: 'Marrakesh|MA', HRG: 'Hurghada|EG', SSH: 'Sharm el-Sheikh|EG', AYT: 'Antalya|TR', DLM: 'Dalaman|TR', BJV: 'Bodrum|TR',
  PMI: 'Palma|ES', IBZ: 'Ibiza|ES', AGP: 'Malaga|ES', TFS: 'Santa Cruz de Tenerife|ES', TFN: 'Santa Cruz de Tenerife|ES', LPA: 'Las Palmas de Gran Canaria|ES', ACE: 'Arrecife|ES',
  FUE: 'Puerto del Rosario|ES', FAO: 'Faro|PT', FNC: 'Funchal|PT', HER: 'Heraklion|GR', CFU: 'Kerkyra|GR', JTR: 'Fira|GR', JMK: 'Mykonos|GR', RHO: 'Rhodes|GR', DBV: 'Dubrovnik|HR',
  SPU: 'Split|HR', NCE: 'Nice|FR', HKT: 'Phuket|TH', USM: 'Ko Samui|TH', REP: 'Siem Reap|KH', SAI: 'Siem Reap|KH', LPQ: 'Luang Prabang|LA', PQC: 'Phu Quoc|VN',
};

/* ---------- metropolitan IATA codes (one code for all of a city's airports) ---------- */
export const METRO = {
  LON: 'London|GB', NYC: 'New York City|US', TYO: 'Tokyo|JP', PAR: 'Paris|FR', MIL: 'Milan|IT', ROM: 'Rome|IT', WAS: 'Washington|US', CHI: 'Chicago|US',
  STO: 'Stockholm|SE', OSA: 'Osaka|JP', SEL: 'Seoul|KR', MOW: 'Moscow|RU', BUH: 'Bucharest|RO', YTO: 'Toronto|CA', YMQ: 'Montreal|CA', RIO: 'Rio de Janeiro|BR',
  SAO: 'São Paulo|BR', BUE: 'Buenos Aires|AR', JKT: 'Jakarta|ID', BJS: 'Beijing|CN', REK: 'Reykjavík|IS', DTT: 'Detroit|US', SPK: 'Sapporo|JP',
};

/* ---------- display names where GeoNames uses a local or long form (the old name stays an alias) ---------- */
export const RENAME = {
  'Antwerpen|BE': 'Antwerp', 'Bruges|BE': 'Bruges', 'Ghent|BE': 'Ghent', 'Lucerne|CH': 'Lucerne', 'New York City|US': 'New York', 'Frankfurt am Main|DE': 'Frankfurt', 'Kingston upon Hull|GB': 'Hull', 'Newcastle upon Tyne|GB': 'Newcastle',
  'Cologne|DE': 'Cologne', 'Seville|ES': 'Seville', 'Aarhus|DK': 'Aarhus', 'Heraklion|GR': 'Heraklion', 'Chania|GR': 'Chania', 'Thessaloniki|GR': 'Thessaloniki',
  'San Sebastián|ES': 'San Sebastián', 'Quebec|CA': 'Quebec City', 'Al Ain|AE': 'Al Ain', 'Darjeeling|IN': 'Darjeeling', 'Rishikesh|IN': 'Rishikesh', 'Khiva|UZ': 'Khiva',
  'Ulaanbaatar|MN': 'Ulaanbaatar', 'Medina|SA': 'Medina', 'Djerba|TN': 'Djerba', 'Nikko|JP': 'Nikko', 'Ayutthaya|TH': 'Ayutthaya', 'Búzios|BR': 'Búzios',
  'Salalah|OM': 'Salalah', 'Aswan|EG': 'Aswan', 'Da Lat|VN': 'Da Lat', 'Ha Long|VN': 'Ha Long', 'Panaji|IN': 'Panaji', 'Visakhapatnam|IN': 'Visakhapatnam',
};

/* ---------- tourist places too small for cities15000: name|cc -> [lat, lon] (public coordinates, 2 decimals) ---------- */
export const EXTRA_CITIES = {
  'Sorrento|IT': [40.63, 14.38], 'Amalfi|IT': [40.63, 14.6], 'Keswick|GB': [54.6, -3.13], 'Interlaken|CH': [46.69, 7.86], 'Zermatt|CH': [46.02, 7.75],
  'St. Moritz|CH': [46.5, 9.84], 'Český Krumlov|CZ': [48.81, 14.32], 'Kotor|ME': [42.42, 18.77], 'Bled|SI': [46.37, 14.11], 'Piran|SI': [45.53, 13.57],
  'Mykonos|GR': [37.45, 25.33], 'Fira|GR': [36.42, 25.43], 'Nafplio|GR': [37.57, 22.8], 'Zakynthos|GR': [37.79, 20.9], 'Ayia Napa|CY': [34.99, 34],
  'Dahab|EG': [28.5, 34.51], 'Wadi Musa|JO': [30.32, 35.48], 'Hakone|JP': [35.23, 139.11], 'Sa Pa|VN': [22.34, 103.84], 'Bagan|MM': [21.17, 94.86],
  'Boracay|PH': [11.97, 121.92], 'Ella|LK': [6.87, 81.05], 'Paro|BT': [27.43, 89.42], 'Sedona|US': [34.87, -111.76], 'Aspen|US': [39.19, -106.82],
  'Lahaina|US': [20.88, -156.68], 'Kailua-Kona|US': [19.64, -155.99], 'Carmel-by-the-Sea|US': [36.56, -121.92], 'Bar Harbor|US': [44.39, -68.2],
  'Provincetown|US': [42.05, -70.19], 'Banff|CA': [51.18, -115.57], 'Whistler|CA': [50.12, -122.95], 'Jasper|CA': [52.87, -118.08], 'Negril|JM': [18.27, -78.35],
  'San Pedro de Atacama|CL': [-22.91, -68.2], 'Punta del Este|UY': [-34.96, -54.95], 'Uyuni|BO': [-20.46, -66.83], 'Puerto Ayora|EC': [-0.74, -90.31],
  'Tamarindo|CR': [10.3, -85.84], 'Bocas del Toro|PA': [9.34, -82.24], 'Roatán|HN': [16.32, -86.54], 'Byron Bay|AU': [-28.64, 153.61], 'Broome|AU': [-17.96, 122.24],
  'Port Douglas|AU': [-16.48, 145.46], 'Airlie Beach|AU': [-20.27, 148.72], 'Queenstown|NZ': [-45.03, 168.66], 'Wanaka|NZ': [-44.7, 169.13], 'Mdina|MT': [35.89, 14.4],
  'Chamonix|FR': [45.92, 6.87],
};

/* ---------- old zone names a browser or calendar may still report -> the zone.tab name of the SAME country
   (tzdata's own backward links now point some of them at a merged zone elsewhere: Asmera -> Nairobi) ---------- */
export const ZONE_FIX = {
  'Africa/Asmera': 'Africa/Asmara', 'Africa/Timbuktu': 'Africa/Bamako', 'America/Coral_Harbour': 'America/Atikokan', 'America/Virgin': 'America/St_Thomas',
  'America/Montreal': 'America/Toronto', 'America/Buenos_Aires': 'America/Argentina/Buenos_Aires', 'America/Catamarca': 'America/Argentina/Catamarca',
  'America/Cordoba': 'America/Argentina/Cordoba', 'America/Jujuy': 'America/Argentina/Jujuy', 'America/Mendoza': 'America/Argentina/Mendoza',
  'America/Godthab': 'America/Nuuk', 'America/Indianapolis': 'America/Indiana/Indianapolis', 'America/Louisville': 'America/Kentucky/Louisville',
  'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Katmandu': 'Asia/Kathmandu', 'Asia/Rangoon': 'Asia/Yangon', 'Asia/Saigon': 'Asia/Ho_Chi_Minh', 'Asia/Dacca': 'Asia/Dhaka',
  'Asia/Thimbu': 'Asia/Thimphu', 'Asia/Ulan_Bator': 'Asia/Ulaanbaatar', 'Asia/Macao': 'Asia/Macau', 'Asia/Ashkhabad': 'Asia/Ashgabat', 'Asia/Ujung_Pandang': 'Asia/Makassar',
  'Asia/Istanbul': 'Europe/Istanbul', 'Asia/Tel_Aviv': 'Asia/Jerusalem', 'Asia/Chongqing': 'Asia/Shanghai', 'Asia/Chungking': 'Asia/Shanghai', 'Asia/Harbin': 'Asia/Shanghai',
  'Asia/Kashgar': 'Asia/Urumqi', 'Atlantic/Faeroe': 'Atlantic/Faroe', 'Atlantic/Jan_Mayen': 'Arctic/Longyearbyen', 'Europe/Kiev': 'Europe/Kyiv', 'Europe/Uzhgorod': 'Europe/Kyiv',
  'Europe/Zaporozhye': 'Europe/Kyiv', 'Europe/Belfast': 'Europe/London', 'Europe/Nicosia': 'Asia/Nicosia', 'Europe/Tiraspol': 'Europe/Chisinau',
  'Pacific/Enderbury': 'Pacific/Kanton', 'Pacific/Ponape': 'Pacific/Pohnpei', 'Pacific/Truk': 'Pacific/Chuuk', 'Pacific/Yap': 'Pacific/Chuuk',
  'Pacific/Samoa': 'Pacific/Pago_Pago', 'Pacific/Johnston': 'Pacific/Honolulu', 'Australia/ACT': 'Australia/Sydney', 'Australia/Canberra': 'Australia/Sydney',
  'Australia/NSW': 'Australia/Sydney', 'Australia/North': 'Australia/Darwin', 'Australia/Queensland': 'Australia/Brisbane', 'Australia/South': 'Australia/Adelaide',
  'Australia/Tasmania': 'Australia/Hobart', 'Australia/Victoria': 'Australia/Melbourne', 'Australia/West': 'Australia/Perth', 'Australia/LHI': 'Australia/Lord_Howe',
};
