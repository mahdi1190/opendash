/* ============================================================
   ANIMATION PACK "sky" (v2.2 wave 2): the real sky. PURE classic script.
   Every item has a when(day, ctx) rule that reads ctx.moment ('sunrise' |
   'day' | 'sunset' | 'night', from almSkyMoment: the real sunrise and sunset
   at the weather town, offline) and ctx.now (ms), so these only play through
   the living sky (78-anim-wire.js animSkyAccent) at the right moment:
     sunrise / sunset   about 40 minutes either side of the real times
     the moon           tonight's phase (8 drawings), at night
     meteor showers     on a shower's peak night (almMeteorShower)
     the aurora         a few seeded nights a year, 50 degrees or more from the equator
   All subtle: small, slow, and paused with every scene while the tab is hidden.
   ============================================================ */
(function () {
  const items = [];
  const f = (n) => +n.toFixed(2);
  const add = (o) => items.push(Object.assign({ tags: [], mood: 'calm', intensity: 'subtle', theme: 'any', season: 'any', region: 'any', reduced: 'static', priority: 2 }, o));
  const nowOf = (day, ctx) => (ctx && isFinite(ctx.now) ? ctx.now : Date.parse(day + 'T22:00:00Z'));
  const at = (m) => (day, ctx) => !!ctx && ctx.moment === m;
  const star = (x, y, r, d) => `<circle class="s x-twinkle" style="--d:${d}s" cx="${x}" cy="${y}" r="${r}"/>`;

  /* ---------- sunrise and sunset ---------- */
  add({ id: 'sunrise-hills', slot: 'sky', label: 'Sunrise over the hills', colour: 'amber', tags: ['sunrise', 'morning', 'sun'], mood: 'calm', when: at('sunrise'),
    svg: () => `<g class="x-skyrise"><circle class="c" cx="32" cy="42" r="10"/></g><path class="s" d="M4 44h56" opacity=".5"/><path class="w lm" d="M4 58V46q10-8 20-2t18-4 18 6v12z"/>` });
  add({ id: 'sunrise-sea', slot: 'sky', label: 'Sunrise at sea', colour: 'orange', tags: ['sunrise', 'sea', 'morning'], mood: 'dreamy', when: at('sunrise'),
    svg: () => `<g class="x-skyrise"><circle class="c" cx="40" cy="40" r="9"/></g><rect class="m" x="4" y="42" width="56" height="16"/>${[46, 50, 54].map((y, i) => `<path class="lw x-wave" style="--d:${f(i * 0.4)}s" d="M${30 - i * 2} ${y}h${20 + i * 4}"/>`).join('')}` });
  add({ id: 'sunset-town', slot: 'sky', label: 'Sunset over town', colour: 'orange', tags: ['sunset', 'evening', 'sun'], mood: 'cosy', when: at('sunset'),
    svg: () => `<g class="x-skyset"><circle class="c" cx="24" cy="38" r="11"/></g><path class="k" d="M4 58V44h8v-6h6v20h4V40h10v18h4V46h8v-8h6v20h10v2z"/>` });
  add({ id: 'sunset-field', slot: 'sky', label: 'Sunset over the fields', colour: 'red', tags: ['sunset', 'evening', 'country'], mood: 'calm', when: at('sunset'),
    svg: () => `<g class="x-skyset"><circle class="c" cx="40" cy="40" r="10"/></g><path class="s" d="M4 58V48q28-6 56 0v10z"/><path class="lm" d="M8 54q24-4 48 0"/><path class="k" d="M14 48v-8l-3-3h6l-3 3"/><path class="lm dash" d="M4 20q10-4 20 0"/>` });

  /* ---------- the moon (8 phases; the lit side from the phase, the terminator an ellipse) ---------- */
  const R = 13, CX = 32, CY = 28;
  function lit(p) {
    if (p < 0.03 || p > 0.97) return '';
    if (Math.abs(p - 0.5) < 0.03) return `<circle class="c" cx="${CX}" cy="${CY}" r="${R}"/>`;
    const waxing = p < 0.5, k = Math.abs(Math.cos(2 * Math.PI * p)), rx = f(R * k);
    const crescent = waxing ? p < 0.25 : p > 0.75;
    const limb = waxing ? 1 : 0;                        // the lit limb: right while waxing
    const back = waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
    return `<path class="c" d="M${CX} ${CY - R}A${R} ${R} 0 0 ${limb} ${CX} ${CY + R}A${rx} ${R} 0 0 ${back} ${CX} ${CY - R}z"/>`;
  }
  ALM_MOON_NAMES.forEach((name, i) => {
    add({ id: 'moon-' + name.toLowerCase().replace(/\s+/g, '-'), slot: 'sky', label: name, colour: 'indigo', tags: ['moon', 'night', name.toLowerCase()], mood: 'dreamy', priority: 1,
      when: (day, ctx) => !!ctx && ctx.moment === 'night' && almMoonPhase(nowOf(day, ctx)).index === i,
      svg: () => `<circle class="s x-glow" cx="${CX}" cy="${CY}" r="${R + 6}" opacity=".35"/><circle class="w lm" cx="${CX}" cy="${CY}" r="${R}"/>${lit(i / 8)}${star(10, 12, 1.4, 0)}${star(54, 18, 1.2, 0.9)}${star(14, 50, 1, 1.6)}${star(52, 52, 1.5, 0.4)}` });
  });

  /* ---------- rare nights ---------- */
  add({ id: 'meteor-shower', slot: 'sky', label: 'Meteor shower', colour: 'violet', tags: ['meteors', 'shooting stars', 'night', 'rare'], mood: 'dreamy', priority: 3,
    when: (day, ctx) => !!ctx && ctx.moment === 'night' && !!almMeteorShower(day),
    svg: () => `${[[40, 8, 0], [56, 14, 1.3], [30, 4, 2.4]].map(([x, y, d]) => `<g class="x-meteor" style="--d:${d}s"><path class="lc t" d="M${x} ${y}l-10 10"/><circle class="w" cx="${x - 10}" cy="${y + 10}" r="1.6"/></g>`).join('')}${star(12, 20, 1.3, 0.5)}${star(20, 40, 1, 1.4)}${star(48, 40, 1.4, 0.2)}<path class="m" d="M4 58h56v-5l-10-3-12 3-10-4-12 4-12-2z"/>` });
  add({ id: 'aurora', slot: 'sky', label: 'Northern lights', colour: 'green', tags: ['aurora', 'northern lights', 'night', 'rare'], mood: 'dreamy', priority: 4,
    when: (day, ctx) => !!ctx && ctx.moment === 'night' && isFinite(ctx.lat) && almAuroraNights(+day.slice(0, 4), ctx.lat).includes(day),
    svg: () => `${[[14, 0, 'c'], [26, 0.8, 's'], [38, 1.6, 'c']].map(([y, d, c]) => `<g class="x-aurora o-v" style="--d:${d}s;transform-origin:32px ${y}px"><path class="${c}" opacity=".7" d="M4 ${y + 10}q10-${10 + y / 4} 20-2t20-4 16 6v6q-8-6-16-2t-20 4-20 0z"/></g>`).join('')}${star(10, 6, 1.2, 0.3)}${star(50, 8, 1, 1.1)}<path class="k" d="M4 58V50l8-6 6 4 8-8 10 8 8-6 8 6 8-2v12z"/>` });

  const css = [
    '.anim-scene .x-skyrise { --an: ap-skyrise; --ad: 9s; }',
    '.anim-scene .x-skyset { --an: ap-skyset; --ad: 9s; }',
    '.anim-scene .x-meteor { --an: ap-meteor; --ad: 3.6s; --ae: ease-in; }',
    '.anim-scene .x-aurora { --an: ap-aurora; --ad: 7s; }',
    '@keyframes ap-skyrise { 0%, 100% { transform: translateY(3px); } 50% { transform: translateY(-3px); } }',
    '@keyframes ap-skyset { 0%, 100% { transform: translateY(-3px); } 50% { transform: translateY(3px); } }',
    '@keyframes ap-meteor { 0% { transform: translate(6px, -6px); opacity: 0; } 8% { opacity: 1; } 30% { transform: translate(-14px, 14px); opacity: 0; } 100% { transform: translate(-14px, 14px); opacity: 0; } }',
    '@keyframes ap-aurora { 0%, 100% { transform: scaleY(1) translateX(0); opacity: 0.55; } 50% { transform: scaleY(1.25) translateX(2px); opacity: 0.9; } }',
  ].join('\n');

  animRegisterPack({ id: 'sky', name: 'The real sky', version: '2.2.0', css,
    description: 'Sunrise and sunset at the real local times, the moon\'s phase tonight, meteor showers on their peak nights and the odd aurora. Uses the weather town; nothing is fetched.', items });
})();
