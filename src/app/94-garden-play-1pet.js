/* ============================================================
   PLAY: your pet. Little journeys and the postcard album, hide and seek, its knack, its diary. docs/dev/HUNDRED_PLAY.md 1-4, 19, 21.
   Your pet is really gone while it travels (html.gp-away hides the companion in your world; friends' views are not changed).
   Saved: pl.jr {at, back, place, n, lunch, sp}, pl.pc.<place>.<n> (a card you have, its day), pl.dy.<day> (a diary page).
   ============================================================ */
const GP_PLACES = Object.freeze([
  { id: 'sea', name: 'The seaside', for: 'fish', sky: ['#8fd0ee', '#eaf7f4'], art: '<path d="M0 118h320v82H0z" fill="#3f93bd"/><path d="M0 150c60-12 110 10 170 0s100-10 150 0v50H0z" fill="#ecd9a8"/><path d="M0 120c30 6 50-4 80 0s50 6 80 0 50-6 80 0 50 4 80 0" fill="none" stroke="#d6f0f6" stroke-width="3"/><path d="M60 150v-40" stroke="#7a5230" stroke-width="3"/><path d="M60 110l36 16-36 4z" fill="#d8453a"/><circle cx="262" cy="42" r="20" fill="#ffe08a"/>',
    notes: ['The sea is a very big bowl of water and nobody will let me drink it.', 'A crab looked at me sideways. I looked back. Neither of us has apologised.', 'I buried something here. I will not tell you what. It was yours.'] },
  { id: 'harbour', name: 'The harbour', for: 'fish', sky: ['#a9c8dc', '#f2ece0'], art: '<path d="M0 124h320v76H0z" fill="#2f6f8e"/><path d="M0 150h150l14 50H0z" fill="#8a7a66"/><path d="M196 124l16 28h70l14-28z" fill="#c8453a"/><path d="M246 124V62" stroke="#5a4028" stroke-width="4"/><path d="M250 66l34 46h-34z" fill="#f4f2e8"/><circle cx="30" cy="140" r="6" fill="#3a3f46"/><circle cx="90" cy="140" r="6" fill="#3a3f46"/>',
    notes: ['A man gave me a fish head. This is the best place in the world. I am never coming home. (I am coming home.)', 'Boats go out and boats come back, and nobody tells me why.', 'A seagull took my lunch. We have an understanding now. I do not like it.'] },
  { id: 'market', name: 'The market town', for: 'veg', sky: ['#a8d4ee', '#f8f0dc'], art: '<path d="M0 140h320v60H0z" fill="#c8b48c"/><path d="M30 140V84h70v56zM120 140V70h66v70zM210 140V90h80v50z" fill="#e4cfa8"/><path d="M24 86l41-28 41 28zM114 72l39-30 39 30zM204 92l46-26 46 26z" fill="#b5553a"/><path d="M60 172h90v-16H60z" fill="#7fbf5a"/><path d="M56 158h98l-8-14H64z" fill="#d8453a"/>',
    notes: ['I stood under a stall and looked sad. It works every time. Bring a bigger bag next time.', 'A very small child gave me half a biscuit, then took it back.', 'So many legs. I smelled all of them.'] },
  { id: 'farm', name: 'The farm', for: 'veg', sky: ['#9fd4f2', '#f4f6dc'], art: '<path d="M0 120c70-20 130 6 190-4s90-8 130 4v80H0z" fill="#8dbf58"/><path d="M0 160c90-14 190 8 320-6v46H0z" fill="#6fa048"/><path d="M216 130V88h56v42z" fill="#c8453a"/><path d="M208 90l36-26 36 26z" fill="#7a3a2a"/><circle cx="60" cy="150" r="14" fill="#e0c060"/><circle cx="90" cy="156" r="11" fill="#e0c060"/>',
    notes: ['There is a cow. It is very large and it does not care about me at all. I think I love it.', 'I chased the hens. Then the hens chased me. I am not ready to talk about it.', 'Rolled in something. You will know when I get back.'] },
  { id: 'hills', name: 'The high hills', for: 'fruit', sky: ['#8cc6ea', '#eef6f2'], art: '<path d="M0 130l70-54 60 40 70-68 120 86v66H0z" fill="#7aa86a"/><path d="M0 160c80-20 200 10 320-10v50H0z" fill="#5f8f54"/><path d="M200 48l22 22-16-2-10 10-12-8-14 4z" fill="#f4f6f8"/><circle cx="46" cy="40" r="17" fill="#ffe08a"/>',
    notes: ['I went up. Then I had to come down. I do not see why anybody does this.', 'From the top you can nearly see home. I looked for you. I did not find you. I looked for quite a long time.', 'Wind makes my ears go funny. Worth it.'] },
  { id: 'island', name: 'A small island', for: 'fruit', sky: ['#7fcbea', '#f2fbf2'], art: '<path d="M0 118h320v82H0z" fill="#3fa6bd"/><ellipse cx="150" cy="150" rx="110" ry="26" fill="#ecd9a8"/><path d="M150 148c-2-30 2-54 12-74" fill="none" stroke="#7a5230" stroke-width="6"/><path d="M162 74c-20-8-38-2-46 12 18-6 32-6 46-12zM162 74c18-10 36-6 46 8-16-6-32-4-46-8zM162 74c-8-16-22-22-36-18 14 4 26 10 36 18z" fill="#4f9a4a"/>',
    notes: ['I do not know how I got here. I do not know how I will get back. Lunch was good.', 'I found a coconut. It is a very stubborn stone.', 'There is nobody here but me, and I am excellent company.'] },
  { id: 'forest', name: 'The deep forest', for: 'herb', sky: ['#a8c8c0', '#dcecd8'], art: '<path d="M0 150h320v50H0z" fill="#5a7a48"/>' + [20, 70, 120, 180, 240, 290].map((x, i) => `<path d="M${x} ${150 - i % 2 * 8}l-26 2 20-26-14 1 18-26-12 1 14-30 14 30-12-1 18 26-14-1 20 26z" fill="${i % 2 ? '#2f5f3a' : '#3f7048'}"/>`).join(''),
    notes: ['Something in here knows my name. I do not know how. I do not know what it is. We are friends.', 'I found the biggest stick in the world. I could not bring it home. I think about it a lot.', 'It is so quiet that I could hear myself being good.'] },
  { id: 'mountain', name: 'The mountain', for: 'honey', sky: ['#7fb8e4', '#e8f2f6'], art: '<path d="M0 172l96-110 44 44 54-74 126 140v28H0z" fill="#8a94a0"/><path d="M194 32l28 32-16-4-12 12-14-10-14 6zM96 62l18 20-12-2-8 8-10-8-8 2z" fill="#f4f6f8"/><path d="M0 180c100-14 210 6 320-8v28H0z" fill="#6f9a58"/>',
    notes: ['Up here the bees are the size of bees, but they seem more sure of themselves.', 'I stood on the very top. I would like that written down somewhere. Please write it down.', 'My breath came out as a little cloud and I chased it.'] },
  { id: 'castle', name: 'The castle', for: 'flower', sky: ['#a4c8ea', '#f6efe0'], art: '<path d="M0 158c80-10 220 8 320-4v46H0z" fill="#7aa85a"/><path d="M92 158V88h20V74h12v14h14V74h12v14h14V74h12v14h20v70z" fill="#b9b2a4"/><path d="M60 158V66h40v92zM206 158V66h40v92z" fill="#a8a194"/><path d="M58 66l22-30 22 30zM204 66l22-30 22 30z" fill="#5a78c8"/><path d="M142 158v-30c0-14 24-14 24 0v30z" fill="#4a3a2a"/>',
    notes: ['Nobody lives here now. I went in anyway. I sat on the chair. It is my chair now.', 'A lady with a clipboard said no pets. I am not a pet. I am a visitor.', 'I barked in the big hall and the hall barked back. It started it.'] },
  { id: 'fair', name: 'The balloon fair', for: 'honey', sky: ['#7fc0ee', '#fdf0d8'], art: '<path d="M0 160h320v40H0z" fill="#8dbf58"/><ellipse cx="86" cy="64" rx="34" ry="40" fill="#d8405a"/><path d="M86 24c-14 10-14 70 0 80 14-10 14-70 0-80z" fill="#f2c21e"/><path d="M76 112h20v12H76z" fill="#8a5e36"/><ellipse cx="216" cy="84" rx="28" ry="33" fill="#5a8fe0"/><path d="M216 51c-11 8-11 58 0 66 11-8 11-58 0-66z" fill="#f4f2e8"/><path d="M208 124h16v10h-16z" fill="#8a5e36"/>',
    notes: ['I went up in one. I would rather not discuss it. I was very brave. Nobody saw.', 'Everybody looks up here. So I could eat what they dropped.', 'A big one went over and everything went dark for a moment and I thought: well, that is that. It was not.'] },
  { id: 'station', name: 'The little station', for: 'egg', sky: ['#b4cce0', '#f4e8d8'], art: '<path d="M0 150h320v50H0z" fill="#8a8078"/><path d="M0 164h320M0 176h320" stroke="#4a4038" stroke-width="3"/><path d="M40 150V92h110v58z" fill="#d8c8a8"/><path d="M30 94l65-26 65 26z" fill="#7a3a2a"/><path d="M212 150V104h84v46z" fill="#3a6a4a"/><circle cx="228" cy="152" r="8" fill="#2a2622"/><circle cx="280" cy="152" r="8" fill="#2a2622"/><path d="M220 104V88h14v16z" fill="#2a2622"/>',
    notes: ['I got on a train. It left. I got off another. I am almost certain this is the same place.', 'The man who blows the whistle lets me sit by the stove. He calls me by the wrong name. I answer.', 'I waited for you on the platform for a bit, in case.'] },
  { id: 'snow', name: 'The snowy village', for: 'egg', sky: ['#b8cce0', '#eef2f6'], art: '<path d="M0 148c90-14 210 10 320-6v58H0z" fill="#f4f8fa"/><path d="M50 150v-34h52v34zM190 148v-40h64v40z" fill="#a8704a"/><path d="M42 118l34-26 34 26zM182 110l40-30 40 30z" fill="#f4f8fa"/><path d="M68 150v-14h14v14z" fill="#ffe08a"/>' + [30, 90, 140, 170, 230, 280, 60, 200].map((x, i) => `<circle cx="${x}" cy="${20 + i * 11}" r="2.500" fill="#fff"/>`).join(''),
    notes: ['My feet went cold, so I lifted them up one at a time, and then there were none left to lift.', 'I ate some of the ground. It was nothing. I ate more, to be sure.', 'Somebody built a person out of snow and gave him a carrot. I took the carrot. I am not sorry.'] },
]);
const _GP_PLACE = new Map(GP_PLACES.map(p => [p.id, p]));
const GP_LUNCH_WORDS = Object.freeze({ fish: 'Fish makes it think of the water', veg: 'Vegetables send it to farms and markets', fruit: 'Fruit is for long, hungry walks', herb: 'Herbs smell of the deep woods', flower: 'Flowers make it feel grand', honey: 'Honey makes it want to go up', egg: 'An egg is a packed lunch for a real trip', dish: 'A cooked meal will take it anywhere' });
function _gpLunchKind(item) {
  if (item === 'egg') return 'egg';
  if (item === 'honey') return 'honey';
  if (/^dish:/.test(item)) return 'dish';
  if (/^fish:/.test(item)) { const m = /^fish:(.+)-[0-3]$/.exec(item), d = m && gardenFishDef(m[1]); return d && d.cat === 'fish' ? 'fish' : ''; }
  const c = /^crop:(.+)$/.exec(item), p = c && gardenPlant(c[1]); if (!p) return '';
  return p.cat === 'veg' ? 'veg' : p.cat === 'fruit' || p.cat === 'tree' ? 'fruit' : p.cat === 'herb' ? 'herb' : p.cat === 'flower' || p.cat === 'wild' ? 'flower' : '';
}
function _gpLunchName(item) {
  if (item === 'egg') return 'An egg'; if (item === 'honey') return 'A jar of honey';
  if (/^dish:/.test(item)) { const d = typeof gpDish === 'function' ? gpDish(item.slice(5)) : null; return d ? d.name : 'A meal'; }
  if (/^fish:/.test(item)) { const m = /^fish:(.+)-[0-3]$/.exec(item), d = m && gardenFishDef(m[1]); return d ? d.name : 'A fish'; }
  const c = /^crop:(.+)$/.exec(item), p = c && gardenPlant(c[1]); return p ? p.name : item;
}
function _gpLunchSvg(item, px) {
  try {
    if (/^crop:/.test(item)) return gardenIconSvg(item.slice(5), { kind: 'crop', px });
    if (/^fish:/.test(item)) { const m = /^fish:(.+)-[0-3]$/.exec(item); return gardenCatchSvg('fish', m[1], px, { uid: 'gpl' + m[1] }); }
  } catch (e) { /* below */ }
  return `<span style="font-size:${Math.round(px * 0.5)}px">${icon(item === 'egg' ? 'circle-dot' : item === 'honey' ? 'droplet' : 'utensils')}</span>`;
}
function _gpLunches() { const out = []; for (const [k, n] of Object.entries(gardenWallet().items)) { if (n >= 1 && _gpLunchKind(k)) out.push({ item: k, n: Math.floor(n), kind: _gpLunchKind(k) }); } return out.sort((a, b) => a.kind.localeCompare(b.kind)); }
function _gpCards() { const out = []; for (const p of GP_PLACES) for (let i = 0; i < 3; i++) if (gpGet(`pc.${p.id}.${i}`)) out.push([p.id, i]); return out; }
function gpJourney() { const j = gpGet('jr'); return j && j.at ? j : null; }
function gpPetAway() { return !!gpJourney(); }
function _gpSyncAway() { document.documentElement.classList.toggle('gp-away', gpPetAway()); }
function _gpHoursWord(ms) { const h = Math.max(0, ms) / 3600000; return h < 1 ? 'less than an hour' : h < 1.5 ? 'about an hour' : `about ${Math.round(h)} hours`; }
function gpCardSvg(placeId, n, look, w) {
  const p = _GP_PLACE.get(placeId); if (!p) return '';
  const uid = 'gpc' + placeId + n, peta = look ? petSvg(look, { size: 90, pose: n === 2 ? 'walk' : 'sit', mood: { eyes: n === 1 ? 'open' : 'happy', mouth: 'smile' } }).replace('<svg ', `<svg x="${n === 1 ? 26 : 200}" y="${n === 2 ? 108 : 104}" `) : '';
  return `<svg class="gp-card-art" viewBox="0 0 320 200" width="${w || 320}" role="img" aria-label="${escAttr(p.name)}"><defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs><rect width="320" height="200" fill="url(#${uid})"/>${p.art}${peta}</svg>`;
}
function _gpPickPlace(kind, seed) {
  const pool = kind === 'dish' ? GP_PLACES : GP_PLACES.filter(p => p.for === kind), seen = (p) => [0, 1, 2].filter(i => gpGet(`pc.${p.id}.${i}`)).length;
  const min = Math.min(...pool.map(seen)), low = pool.filter(p => seen(p) === min);
  return low[gardenHash(seed) % low.length];
}
function gpJourneyStart(item) {
  const pet = gpPet(), kind = _gpLunchKind(item);
  if (!pet || !kind || gardenHas(item) < 1 || gpJourney()) return false;
  const now = _gdNow(), seed = 'gpj|' + now, place = _gpPickPlace(kind, seed), seen = [0, 1, 2].filter(i => !gpGet(`pc.${place.id}.${i}`));
  const n = seen.length ? seen[gardenHash(seed + 'n') % seen.length] : gardenHash(seed + 'n') % 3;
  const hours = 2 + gardenHash(seed + 'h') % 5;
  _gdLed('pl', { i: { [item]: -1 }, n: 1 });
  gpSet('jr', { at: now, back: now + hours * 3600000, place: place.id, n, lunch: item, sp: pet.look.species });
  _gpSyncAway();
  return true;
}
/** Called home early: no card, and the lunch comes back. */
function gpJourneyCall() {
  const j = gpJourney(); if (!j) return;
  if (j.lunch) { _gdLed('pl', { i: { [j.lunch]: 1 }, n: 1 }); }
  gpSet('jr', null); _gpSyncAway();
}
function gpJourneyHome() {
  const j = gpJourney(); if (!j || _gdNow() < j.back) return false;
  const p = _GP_PLACE.get(j.place), first = !gpGet(`sv.${j.place}`), items = {};
  if (first && p) { items['decor:play-sv-' + j.place] = 1; gpSet(`sv.${j.place}`, _gdToday()); }
  else items.ptreat = 1;
  gpSet(`pc.${j.place}.${j.n}`, _gdToday());
  gpSet('new', { place: j.place, n: j.n, sv: first }); gpSet('jr', null);
  _gdLed('pl', { i: items, x: 3, n: 1 }); _gdSave();
  try { if (typeof petBondGive === 'function') petBondGive('play'); } catch (e) { /* fine */ }
  _gpSyncAway();
  const pet = gpPet();
  if (pet) gpNote(`${pet.name} is home, with a postcard. It is under Play.`);
  return true;
}
function _gpPostcard(el, placeId, n, o) {
  o = o || {};
  const p = _GP_PLACE.get(placeId), pet = gpPet(); if (!p) return;
  const c = gpEl('div', 'gp-postcard');
  c.innerHTML = gpCardSvg(placeId, n, pet ? pet.look : null, o.w || 340);
  const back = gpEl('div', 'gp-card-back');
  back.appendChild(gpEl('b', '', p.name));
  back.appendChild(gpEl('p', '', p.notes[n]));
  back.appendChild(gpEl('span', 'gp-sign', pet ? `Love, ${pet.name}` : 'Love, your pet'));
  c.appendChild(back); el.appendChild(c);
}
function _gpJourneyOpen() {
  gpStage('Little journeys', (el) => {
    const paint = () => {
      el.textContent = '';
      const pet = gpPet(); if (!pet) { gpNeedPet(el); return; }
      const j = gpJourney(), fresh = gpGet('new');
      if (j && _gdNow() >= j.back) { gpJourneyHome(); paint(); return; }
      if (fresh && fresh.place) {
        el.appendChild(gpEl('h3', 'gp-h', `${pet.name} came home, and sent this`));
        _gpPostcard(el, fresh.place, fresh.n);
        if (fresh.sv) { const d = gardenDecor('play-sv-' + fresh.place); if (d) { const r = gpEl('div', 'gp-sv'); r.innerHTML = `${gardenIconSvg(d.id, { kind: 'decor', px: 56 })}<span>And it brought back a souvenir: <b>${esc(d.name)}</b>. It is in your bag, to put in the garden.</span>`; el.appendChild(r); } }
        el.appendChild(uiButton({ label: 'Put it in the album', icon: 'check', kind: 'primary', run: () => { gpSet('new', null); paint(); } }));
        return;
      }
      if (j) {
        const r = gpEl('div', 'gp-away-note');
        r.innerHTML = `<div class="gp-away-pic">${icon('luggage')}</div><div><b>${esc(pet.name)} is away.</b><p class="muted">It should be back in ${esc(_gpHoursWord(j.back - _gdNow()))}. You will not know where until the postcard comes. There is nothing to do but carry on.</p></div>`;
        r.appendChild(uiButton({ label: 'Call it home now', icon: 'undo-2', size: 'sm', tip: 'No postcard, and the lunch comes back', run: () => { gpJourneyCall(); paint(); } }));
        el.appendChild(r);
      } else {
        el.appendChild(gpEl('p', 'gp-lead', `Pack ${pet.name} a lunch and it will go off on its own for a few hours. It is really gone from the garden. What you pack decides where it ends up.`));
        const list = _gpLunches();
        if (!list.length) el.appendChild(emptyLine('Nothing to pack yet. A crop, a fish, an egg, a jar of honey or a cooked meal all work.'));
        const grid = gpEl('div', 'gp-lunches');
        for (const L of list.slice(0, 24)) {
          const b = gpEl('button', 'gp-lunch'); b.type = 'button'; b.setAttribute('data-tip', GP_LUNCH_WORDS[L.kind] || '');
          b.innerHTML = `<span class="gp-lunch-art">${_gpLunchSvg(L.item, 44)}</span><b>${esc(_gpLunchName(L.item))}</b><span class="muted">${L.n} in your bag</span>`;
          b.onclick = () => { if (gpJourneyStart(L.item)) { gardenToast(`${pet.name} has gone off with it`, { icon: 'luggage', action: { label: 'Call it home', run: () => { gpJourneyCall(); } } }); paint(); } };
          grid.appendChild(b);
        }
        el.appendChild(grid);
      }
      const cards = _gpCards();
      el.appendChild(gpEl('h3', 'gp-h', `The album: ${cards.length} of ${GP_PLACES.length * 3} postcards`));
      const alb = gpEl('div', 'gp-album');
      for (const p of GP_PLACES) for (let i = 0; i < 3; i++) {
        const have = !!gpGet(`pc.${p.id}.${i}`), c = gpEl('button', 'gp-mini' + (have ? '' : ' is-blank')); c.type = 'button';
        if (have) { c.innerHTML = gpCardSvg(p.id, i, pet.look, 104); c.setAttribute('aria-label', p.name); c.onclick = () => { openDialog({ title: p.name, size: 'sm', className: 'gd-popup', body: (e) => _gpPostcard(e, p.id, i, { w: 380 }), actions: [{ label: 'Back to the album', run: () => { setTimeout(_gpJourneyOpen, 0); } }] }); }; }
        else { c.disabled = true; c.innerHTML = i === 0 ? `<span>${esc(GP_LUNCH_WORDS[p.for] || '')}</span>` : '<span>?</span>'; }
        alb.appendChild(c);
      }
      el.appendChild(alb);
    };
    paint();
  }, { size: 'lg' });
}
gardenPlayAdd({ id: 'journey', name: 'Little journeys', icon: 'luggage', group: 'pet', blurb: 'Pack a lunch. Your pet goes away for hours, and writes.',
  status: () => { const j = gpJourney(), p = gpPet(); if (j) return _gdNow() >= j.back ? 'Home, with a postcard' : `${p ? p.name : 'Your pet'} is away`; return `${_gpCards().length} of ${GP_PLACES.length * 3} postcards`; },
  fresh: () => !!gpGet('new') || (!!gpJourney() && _gdNow() >= gpJourney().back),
  hud: () => { _gpSyncAway(); gpJourneyHome(); },
  open: _gpJourneyOpen });

/* ---------- hide and seek ---------- */
const _gpSeek = { on: false };
function _gpHidingSpots(m) {
  let rows = []; try { rows = gardenWorldObjects(m); } catch (e) { rows = []; }
  return rows.filter(o => (o.kind === 'plant' || o.kind === 'decor') && (o.height || 0) >= 30 && o.top && o.node);
}
function _gpSeekChip(box, text, cls) {
  let c = box.querySelector(':scope > .gp-seekchip');
  if (!c) { c = gpEl('div', 'gp-seekchip'); c.innerHTML = `<span class="gp-seekline" role="status"></span>`; c.appendChild(uiButton({ label: 'Give up', size: 'sm', kind: 'ghost', run: () => _gpSeekEnd(false) })); box.appendChild(c); }
  c.querySelector('.gp-seekline').textContent = text; c.dataset.heat = cls || '';
}
function _gpSeekStart() {
  const pet = gpPet();
  if (!pet) { gpStage('Hide and seek', gpNeedPet); return; }
  if (gpPetAway()) { gpStage('Hide and seek', (el) => el.appendChild(gpEl('p', 'muted', `${pet.name} is on a journey. It will be back soon.`))); return; }
  if (!gpInWorld()) { gpStage('Hide and seek', (el) => el.appendChild(gpEl('p', 'muted', 'This is played in your own garden. Go home first.'))); return; }
  const m = gardenModel(), spots = _gpHidingSpots(m);
  if (spots.length < 2) { gpStage('Hide and seek', (el) => el.appendChild(gpEl('p', 'muted', `${pet.name} has nowhere to hide. Grow something tall, or put a decoration out, and try again.`))); return; }
  gardenPopupClose(); if (typeof _dialogClose === 'function' && _dialogClose) _dialogClose();
  const px = _gw.px, py = _gw.py, far = spots.map(o => ({ o, d: Math.hypot(o.top.x - px, o.top.y - py) })).sort((a, b) => a.d - b.d);
  const pick = far[Math.floor(far.length * 0.35 + Math.random() * far.length * 0.65) % far.length].o;
  document.documentElement.classList.add('gp-seeking');
  const S = gardenWorldAdd({ id: 'gp-seek', x: pick.top.x, y: pick.top.y - 0.06, z: pick.z - 0.01, hit: 0.9, hitUp: 10, label: `Is that ${pet.name}?`,
    svg: petSvgGroup(pet.look, { h: 34, pose: 'sit', mood: { eyes: 'happy', mouth: 'open' }, cls: 'pt-fun-full' }),
    onClick: () => _gpSeekEnd(true) });
  Object.assign(_gpSeek, { on: true, S, pick, t0: _gdNow(), lastHeat: '', rustleAt: 6, sec: 0, name: pet.name });
  const box = _ghBox();
  _gpSeekChip(box, `${pet.name} has gone to hide. Walk about and look.`, 'cold');
  S.update = (dt) => {
    if (!_gpSeek.on) return;
    _gpSeek.sec += dt;
    const d = Math.hypot(_gw.px - S.x, _gw.py - S.y), heat = d < 2.5 ? 'hot' : d < 5 ? 'warm' : d < 10 ? 'mild' : 'cold';
    if (heat !== _gpSeek.lastHeat) { _gpSeek.lastHeat = heat; const b = _ghBox(); if (b) _gpSeekChip(b, { hot: 'You can hear breathing. Very close.', warm: 'Warm. Something giggled.', mild: 'A little warmer.', cold: 'Cold. Nothing moving here.' }[heat], heat); }
    if (_gpSeek.sec > _gpSeek.rustleAt) { _gpSeek.rustleAt = _gpSeek.sec + 9; _gpRustle(pick); }
  };
}
function _gpRustle(o) {
  const leaf = (x, y, r) => `<path d="M${x} ${y}c5-6 11-4 13 2-6 4-11 3-13-2z" fill="#6fa048" transform="rotate(${r} ${x} ${y})"/>`;
  const L = gardenWorldAdd({ id: 'gp-leaves', x: o.top.x, y: o.top.y, lift: o.top.lift || 0, z: o.z + 0.02, svg: `<g class="gp-leaves">${leaf(-12, -6, -30)}${leaf(4, -12, 20)}${leaf(-2, -2, 70)}</g>`, update(dt, s) { s.t = (s.t || 0) + dt; if (s.t > 1.1) s.remove(); else s.lift += dt * 18; } });
  gpTone([180, 150], { gap: 0.07, len: 0.1, vol: 0.03, type: 'sawtooth' });
  return L;
}
function _gpSeekEnd(found) {
  if (!_gpSeek.on) return;
  _gpSeek.on = false;
  const S = _gpSeek.S, x = S.x, y = S.y, secs = Math.round(_gpSeek.sec), box = _ghBox(), P = gpPetMe();
  S.remove();
  document.documentElement.classList.remove('gp-seeking');
  if (box) { const c = box.querySelector(':scope > .gp-seekchip'); if (c) c.remove(); }
  if (P) { P.x = x; P.y = y + 0.2; P.tx = null; P.ty = null; try { P.sit({ eyes: 'happy', mouth: 'open' }); if (found) P.clip('jump', 800, () => { P.sit(); P.busy = 1; if (P.hearts) P.hearts(); }); } catch (e) { /* fine */ } }
  if (!found) { gpNote(`${_gpSeek.name} comes out, very pleased with itself.`); return; }
  const best = gpBest('seek', secs, true), n = Number(gpGet('seek.' + _gdToday(), 0)) + 1;
  gpSet('seek.' + _gdToday(), n);
  const r = gpPay('seek', { tickets: n <= 3 ? 3 : 0, xp: n <= 3 ? 2 : 0 });
  try { petBondGive('play'); } catch (e) { /* fine */ }
  gpTone([523, 659, 784]);
  gpNote(`Found ${_gpSeek.name} in ${secs} seconds${best ? ', your best yet' : ''}! ${gpPaidLine(r)}`);
}
gardenPlayAdd({ id: 'seek', name: 'Hide and seek', icon: 'search', group: 'pet', blurb: 'It hides behind something in your garden. Go and find it.', status: () => { const b = gpGet('best.seek'); return b ? `Best: ${b} seconds` : ''; }, open: _gpSeekStart });

/* ---------- its knack: once a day, what its kind would find ---------- */
const GP_KNACK = Object.freeze({ dig: { verb: 'Ask it to dig', did: 'dug something up', give: 'seed' }, sniff: { verb: 'Ask it to sniff about', did: 'sniffed something out', give: 'crop' }, hunt: { verb: 'Ask it to hunt', did: 'caught something', give: 'bug' }, fish: { verb: 'Ask it to fish', did: 'came back dripping', give: 'fish' }, shine: { verb: 'Ask it to look for shiny things', did: 'found something shiny', give: 'ticket' } });
function _gpKnackOf(pet) {
  const g = pet.sp.gait, k = pet.sp.kind;
  if (g === 'paddle' || g === 'waddle') return 'fish';
  if (g === 'fly' || g === 'glide' || g === 'float' || k === 'bird') return 'shine';
  if (g === 'hop' || g === 'scurry') return 'dig';
  if (pet.look.species === 'cat' || g === 'scuttle') return 'hunt';
  return 'sniff';
}
function _gpKnackGift(kind) {
  const seed = 'gpk|' + _gdToday(), h = gardenHash(seed);
  if (kind === 'seed') { const pool = _gdSeedPool(p => p.rarity === 'common' || p.rarity === 'uncommon'); const id = pool[h % pool.length]; return { items: { ['seed:' + id]: 1 }, what: `a ${gardenPlant(id).name} seed` }; }
  if (kind === 'crop') { const pool = GARDEN_PLANTS.filter(p => p.yield && p.yield.sell && p.rarity === 'common'); const p = pool[h % pool.length]; return { items: { ['crop:' + p.id]: 1 }, what: `a ${p.name}` }; }
  if (kind === 'bug') { const pool = GARDEN_BUGS.filter(b => b.rarity === 'common'); const b = pool[h % pool.length]; return { items: { ['bug:' + b.id]: 1 }, what: `a ${b.name}` }; }
  if (kind === 'fish') { const pool = GARDEN_FISH.filter(f => f.cat === 'fish' && f.rarity === 'common'); const f = pool[h % pool.length]; return { items: { [`fish:${f.id}-0`]: 1 }, what: `a small ${f.name}` }; }
  return { items: { ticket: 4 }, what: 'four tickets, from who knows where' };
}
function _gpKnackGo() {
  const pet = gpPet(); if (!pet) { gpStage('Your pet’s knack', gpNeedPet); return; }
  const day = _gdToday(), kind = _gpKnackOf(pet), K = GP_KNACK[kind];
  if (gpGet('kn.' + day)) { gpStage('Your pet’s knack', (el) => el.appendChild(gpEl('p', 'muted', `${pet.name} has done its bit today. Ask again tomorrow.`))); return; }
  if (gpPetAway()) { gpStage('Your pet’s knack', (el) => el.appendChild(gpEl('p', 'muted', `${pet.name} is on a journey.`))); return; }
  let paid = false;
  const finish = () => {
    if (paid) return; paid = true;
    const G = _gpKnackGift(GP_KNACK[kind].give);
    gpSet('kn.' + day, 1); _gdLed('pl', { i: G.items, x: 1, n: 1 }); _gdSave();
    try { petBondGive('play'); } catch (e) { /* fine */ }
    gpNote(`${pet.name} ${K.did}: ${G.what}.`);
  };
  const P = gpInWorld() ? gpPetMe() : null;
  if (!P) { finish(); gpStage('Your pet’s knack', (el) => { const r = gpEl('div', 'gp-sv'); r.innerHTML = `${gpPetSvg(pet, 72)}<span>${esc(pet.name)} went off and ${esc(K.did)}. It is in your bag.</span>`; el.appendChild(r); }); return; }
  if (typeof _dialogClose === 'function' && _dialogClose) _dialogClose();
  const a = Math.random() * 6.28; let tx = P.x + Math.cos(a) * 4, ty = P.y + Math.sin(a) * 2.5;
  if (!gardenWorldFree(tx, ty, 0.14)) { tx = P.x; ty = P.y; }
  const back = () => { P.sit({ eyes: 'happy', mouth: 'open' }); P.clip('jump', 800, () => { P.sit(); P.busy = 1; }); finish(); };
  setTimeout(finish, 9000);   // (its own habits may have called it away: what it found is yours all the same)
  P.walkTo(tx, ty, true, () => { P.sit(); P.clip('sniff', 1800, () => P.walkTo(_gw.px - 0.6, _gw.py + 0.2, true, back)); });
}
gardenPlayAdd({ id: 'knack', name: 'Your pet’s knack', icon: 'paw-print', group: 'pet', blurb: 'Once a day it goes and finds what its kind is good at finding.',
  status: () => { const p = gpPet(); if (!p) return ''; const K = GP_KNACK[_gpKnackOf(p)]; return gpGet('kn.' + _gdToday()) ? 'Done for today' : K.verb; }, open: _gpKnackGo });

/* ---------- its diary: your day, in its words, from what really happened (counts only: never a task's name) ---------- */
function _gpDiaryFacts(day) {
  const A = _gdAct(), r = A.days.get(day) || { n: 0, focusMin: 0 }, g = _gdG(), led = Object.values(g.led).filter(e => e && e.d === day);
  const count = (k) => led.filter(e => e.k === k).reduce((a, e) => a + (Number(e.n) || 1), 0);
  return { tasks: r.n, focus: r.focusMin, fish: count('fc'), bugs: count('bc'), picked: count('h') + count('hv'), planted: count('p') + count('pl0'), watered: Object.keys(g.wl[day] || {}).length, seek: Number(gpGet('seek.' + day, 0)), away: !!gpGet('dyaway.' + day) };
}
function gpDiaryLines(day, pet) {
  const f = _gpDiaryFacts(day), rnd = gardenRand('gpd|' + day + '|' + pet.look.species), one = (list) => list[Math.floor(rnd() * list.length)], out = [];
  if (f.focus >= 120) out.push(one(['The human stared at a rectangle for hours. I sat on the important part of the floor. Nobody thanked me.', 'A long time of the human not moving. I checked twice that they were alive. They were. I went back to sleep.']));
  else if (f.focus >= 25) out.push(one(['The human did their sitting still for a while. I helped by watching.', 'There was some quiet working. I supervised.']));
  if (f.tasks >= 5) out.push(one([`The human finished ${f.tasks} of their things today. Nobody gave THEM a treat. I do not understand the system.`, `${f.tasks} things crossed off. They looked pleased. I took the credit.`]));
  else if (f.tasks >= 1) out.push(one([`One or two things got done. I felt it was mostly my doing.`, 'They ticked something and breathed out. I breathed out too, in support.']));
  if (f.fish >= 3) out.push(one([`${f.fish} fish came out of the lake. None for me. I have written this down. This is me writing it down.`, 'So many fish. I have started to wonder how many are in there. I will go and look.']));
  else if (f.fish >= 1) out.push('A fish came out of the water. I was very close to it. It was the best moment of the year so far.');
  if (f.bugs >= 1) out.push(one(['They chased a bug with a net. I could have caught it. I was not asked.', 'A bug went into a jar. It looked at me. I looked away.']));
  if (f.watered >= 3) out.push(one(['They watered the plants again. The plants did not say thank you. I said it for them, by sitting in the wet bit.', 'Everything got rained on by the small can. I drank some. Tastes of can.']));
  if (f.picked >= 3) out.push('A lot of picking today. Things that were on the plants are now not on the plants. I have asked no questions.');
  if (f.seek) out.push(f.seek > 1 ? `We played the hiding game ${f.seek} times. I am very good. They only find me because I let them.` : 'We played the hiding game. I picked an excellent spot. They only found me because I let them.');
  if (!out.length) out.push(one(['Quiet day. I thought about food. I thought about it again, later on, from a different spot.', 'Nothing happened. I liked it.', 'The sun moved over. I moved with it. That was the whole day.', 'I walked round the garden to check it was all still there. It was.']));
  out.push(one(['Tomorrow: more of this.', 'Still no sign of the second dinner.', 'I am a very good animal. It should be said more.', 'Goodnight.', 'Must remember to dig up that thing.']));
  return out.slice(0, 4);
}
function _gpDiaryOpen() {
  gpStage('Your pet’s diary', (el) => {
    const pet = gpPet(); if (!pet) { gpNeedPet(el); return; }
    let off = 0;
    const paint = () => {
      el.textContent = '';
      const day = _gdAddDays(_gdToday(), -off), since = _gdG().since || day;
      const page = gpEl('div', 'gp-diary');
      const head = gpEl('div', 'gp-diary-h'); head.innerHTML = `${gpPetSvg(pet, 64, 'sit', { eyes: 'open', mouth: 'smile' })}<div><b>${esc(pet.name)}’s diary</b><span class="muted">${esc(off === 0 ? 'Today, so far' : off === 1 ? 'Yesterday' : day)}</span></div>`;
      page.appendChild(head);
      for (const line of gpDiaryLines(day, pet)) page.appendChild(gpEl('p', '', line));
      el.appendChild(page);
      const nav = gpEl('div', 'gp-row');
      nav.appendChild(uiButton({ label: 'The day before', icon: 'chevron-left', size: 'sm', disabled: day <= since, run: () => { off++; paint(); } }));
      nav.appendChild(uiButton({ label: 'The day after', icon: 'chevron-right', size: 'sm', disabled: off === 0, run: () => { off--; paint(); } }));
      el.appendChild(nav);
    };
    paint();
  }, { size: 'md' });
}
gardenPlayAdd({ id: 'diary', name: 'Your pet’s diary', icon: 'feather', group: 'pet', blurb: 'It keeps notes on your day. They are not all kind.', open: _gpDiaryOpen });
