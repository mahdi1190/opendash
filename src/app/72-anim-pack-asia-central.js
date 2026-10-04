/* ============================================================
   ANIMATION PACK "asia-central": Central Asia and Asian Russia (KZ UZ TM TJ KG RU).
   PURE classic script. Opening scenes come from the registered full-screen scenes;
   this file adds one small symbol per country and one per small town.
   ============================================================ */
(function () {
  const B = asiaBuilder('central');
  B.scenes();
  const stars = (pts) => pts.map(([x, y], i) => `<circle class="k x-twinkle" style="--d:${((i * 0.37) % 2).toFixed(2)}s" cx="${x}" cy="${y}" r="0.9"/>`).join('');
  const gnd = (y, x1 = 2, x2 = 62) => `<path class="lm" d="M${x1} ${y}H${x2}"/>`;
  const bird = (x, y, d) => `<g class="x-bob" style="--d:${d}s"><path class="lk" d="M${x} ${y}q3-4 6 0q3-4 6 0"/></g>`;
  const steam = (x, y, d) => `<path class="lk x-steam" style="--d:${d}s" d="M${x} ${y}q-2-3 0-6t0-6"/>`;

  // ---- countries ----
  B.element('KZ', { id: 'dombra', label: 'Dombra', colour: 'amber', mood: 'cheerful', tags: ['instrument', 'music'],
    svg: () => '<g transform="rotate(-35 32 34)"><ellipse class="c" cx="32" cy="46" rx="10" ry="12"/><rect class="s" x="29.5" y="8" width="5" height="26"/><rect class="k" x="28" y="4" width="8" height="6" rx="1"/>' +
      '<circle class="w" cx="32" cy="46" r="3.2"/><path class="lk" d="M30.5 10V52M33.5 10V52"/></g>' +
      '<g class="x-wobble"><path class="lc" d="M44 58q3-2 6 0M46 62q3-2 6 0"/></g>' +
      '<g class="x-float"><circle class="c" cx="14" cy="22" r="2.6"/><path class="lk" d="M16.4 22V12l5 1.5"/></g>' +
      '<g class="x-float" style="--d:0.8s"><circle class="c" cx="50" cy="18" r="2.2"/><path class="lk" d="M52 18V9l4 1.2"/></g>' });
  B.element('UZ', { id: 'plov', label: 'Plov cauldron', colour: 'orange', mood: 'cosy', tags: ['food', 'rice'],
    svg: () => steam(24, 28, 0) + steam(32, 28, 0.6) + steam(40, 28, 1.2) +
      '<path class="k" d="M10 36h44l-4 16q-2 6-8 6H22q-6 0-8-6z"/><ellipse class="c" cx="32" cy="36" rx="22" ry="4.5"/>' +
      '<g class="x-pulse"><circle class="w" cx="22" cy="35" r="1.6"/><circle class="w" cx="30" cy="37" r="1.6"/><circle class="w" cx="40" cy="35" r="1.6"/></g>' +
      '<path class="lk" d="M8 36q-5 0-5 5M56 36q5 0 5 5"/>' +
      '<g class="x-flicker"><path class="c" d="M24 62q-2-4 2-8 0 3 2 3 1-2 0-4 4 3 3 9z"/></g><g class="x-flicker" style="--d:0.4s"><path class="c" d="M38 62q-2-4 2-8 0 3 2 3 1-2 0-4 4 3 3 9z"/></g>' });
  B.element('TM', { id: 'carpet', label: 'Woven carpet', colour: 'red', mood: 'proud', tags: ['craft', 'textile'],
    svg: () => '<rect class="c" x="8" y="12" width="48" height="36" rx="1"/><rect class="k" x="12" y="16" width="40" height="28"/>' +
      '<g class="x-spin-slow"><path class="c" d="M24 22l5 8-5 8-5-8z"/></g>' +
      '<g class="x-spin-slow"><path class="c" d="M40 22l5 8-5 8-5-8z"/></g>' +
      '<g class="x-pulse"><circle class="w" cx="24" cy="30" r="2"/><circle class="w" cx="40" cy="30" r="2"/></g>' +
      '<path class="lw" d="M12 16h40v28H12z"/>' +
      '<g class="x-swing o-t"><path class="lc t" d="M12 49v7M18 49v7M24 49v7M30 49v7M36 49v7M42 49v7M48 49v7M54 49v7"/></g>' });
  B.element('TJ', { id: 'ibex', label: 'Ibex', colour: 'slate', mood: 'proud', tags: ['animal', 'mountain'],
    svg: () => '<path class="s" d="M0 60l14-22 8 10 8-14 10 18 8-10 16 18z"/><path class="w" d="M30 34l-3 4 3-1 3 2z"/>' +
      '<g class="x-bob"><path class="lk t" d="M24 24q-10-4-12-16M28 22q-4-6-3-14"/><path class="lk t" d="M36 22q2-10 10-14M40 24q8-2 8-12"/>' +
      '<path class="m" d="M22 30q0-8 8-8h8q6 0 6 8l-4 8h-14z"/><path class="k" d="M28 38l4 6 4-6z"/><circle class="w" cx="30" cy="29" r="1.5"/><circle class="w" cx="38" cy="29" r="1.5"/><circle class="k" cx="30" cy="29" r="0.7"/><circle class="k" cx="38" cy="29" r="0.7"/></g>' + gnd(60) });
  B.element('KG', { id: 'yurt', label: 'Yurt', colour: 'teal', mood: 'cosy', tags: ['architecture', 'tent'],
    svg: () => '<path class="m" d="M0 44q18-10 32-6t32-4v26H0z"/>' + steam(34, 20, 0) + steam(30, 20, 0.7) +
      '<rect class="w" x="12" y="34" width="40" height="18"/><path class="c" d="M8 36q24-24 48 0z"/><path class="lk" d="M32 14V36M22 22l6 14M42 22l-6 14"/>' +
      '<circle class="k" cx="32" cy="14" r="3"/><path class="lw" d="M12 40h40"/><path class="k" d="M27 52V42q5-5 10 0v10z"/>' +
      '<g class="x-flicker"><circle class="c" cx="32" cy="48" r="1.6"/></g><path class="lc t" d="M12 46h40"/>' + bird(46, 10, 0.5) + gnd(52) });
  B.element('RU', { id: 'samovar', label: 'Samovar', colour: 'amber', mood: 'cosy', tags: ['tea', 'object'],
    svg: () => steam(32, 14, 0) + steam(27, 14, 0.8) +
      '<rect class="c" x="26" y="14" width="12" height="4" rx="1"/><circle class="k" cx="32" cy="12" r="2"/>' +
      '<path class="c" d="M22 20h20q8 6 8 16t-8 14H22q-8-4-8-14t8-16z"/><path class="w" d="M20 26q-4 6 0 14" />' +
      '<rect class="k" x="24" y="50" width="16" height="5"/><rect class="c" x="20" y="55" width="24" height="4" rx="1"/>' +
      '<path class="lk t" d="M13 32q-7 0-7 6M51 32q7 0 7 6"/><g class="x-pulse"><circle class="k" cx="50" cy="40" r="1.8"/></g><path class="lk" d="M30 28h4M30 33h4"/>' });

  // ---- small places ----
  B.place('baikonur', { id: 'rocket-steppe', label: 'Rocket on the steppe', colour: 'indigo', mood: 'energetic', tags: ['space', 'rocket'], intensity: 'standard',
    svg: () => stars([[8, 10], [54, 8], [48, 26], [14, 30]]) +
      '<path class="m" d="M0 52q20-6 34-2t30-4v18H0z"/>' +
      '<rect class="s" x="12" y="24" width="4" height="30"/><path class="lk" d="M12 30h4M12 38h4M12 46h4"/>' +
      '<g class="x-takeoff"><path class="w" d="M32 10q5 8 5 22v10H27V32q0-14 5-22z"/><path class="c" d="M27 38l-5 8 5-2zM37 38l5 8-5-2z"/><circle class="k" cx="32" cy="26" r="2.4"/>' +
      '<g class="x-flicker"><path class="c" d="M29 42q3 12 6 0z"/></g></g>' +
      '<g class="x-rise"><circle class="w" cx="32" cy="54" r="3"/></g><g class="x-rise" style="--d:0.6s"><circle class="w" cx="26" cy="54" r="2.2"/></g>' + gnd(54) });
  B.place('samarkand', { id: 'blue-dome', label: 'Blue dome', colour: 'blue', mood: 'proud', tags: ['architecture', 'tiles'],
    svg: () => stars([[8, 8], [56, 10], [50, 22]]) + '<g class="x-glow"><circle class="w lc" cx="14" cy="14" r="4"/></g>' +
      '<rect class="s" x="4" y="30" width="14" height="28"/><rect class="s" x="46" y="30" width="14" height="28"/>' +
      '<path class="c" d="M3 30l8-12 8 12z"/><path class="c" d="M45 30l8-12 8 12z"/>' +
      '<rect class="w" x="20" y="42" width="24" height="16"/><path class="k" d="M27 58V50q5-6 10 0v8z"/>' +
      '<path class="c" d="M20 42q-2-18 12-22 14 4 12 22z"/><path class="lw" d="M24 40q-1-10 8-14M32 20V42M40 40q1-10-8-14"/>' +
      '<g class="x-pulse"><circle class="w" cx="32" cy="32" r="2"/></g><path class="lk" d="M32 20v-6"/><g class="x-blink"><circle class="c" cx="32" cy="13" r="1.6"/></g>' + gnd(58) });
  B.place('bukhara', { id: 'kalyan-minaret', label: 'Minaret and swallows', colour: 'amber', mood: 'calm', tags: ['architecture', 'minaret'],
    svg: () => '<path class="m" d="M0 46q16-8 32-4t32-2v24H0z"/>' +
      '<path class="c" d="M26 58l2-38h8l2 38z"/><path class="lk" d="M27 28h10M27 36h10M27 44h10M27 52h10"/>' +
      '<rect class="s" x="24" y="14" width="16" height="6"/><path class="lk" d="M27 14v6M32 14v6M37 14v6"/><path class="c" d="M25 14q7-12 14 0z"/><path class="lk" d="M32 6V2"/>' +
      '<g class="x-flap"><path class="lk" d="M6 22q3-4 6 0q3-4 6 0"/></g><g class="x-flap" style="--d:0.5s"><path class="lk" d="M46 12q3-4 6 0q3-4 6 0"/></g><g class="x-flap" style="--d:0.9s"><path class="lk" d="M46 34q3-4 6 0q3-4 6 0"/></g>' + gnd(58) });
  B.place('darvaza', { id: 'fire-crater', label: 'Burning crater', colour: 'red', mood: 'energetic', tags: ['fire', 'desert'], intensity: 'standard',
    svg: () => stars([[8, 8], [22, 14], [48, 8], [58, 20]]) +
      '<path class="m" d="M0 40q16-4 30 0t34-2v26H0z"/><ellipse class="k" cx="32" cy="46" rx="22" ry="8"/><ellipse class="c" cx="32" cy="46" rx="16" ry="5"/>' +
      '<g class="x-flicker"><path class="c" d="M18 46q-2-10 4-14 0 5 3 6 1-6 5-10 2 6 3 8 3-3 3-6 6 6 3 16z"/></g>' +
      '<g class="x-flicker" style="--d:0.35s"><path class="w" d="M26 46q0-8 6-10 6 2 6 10z"/></g>' +
      '<g class="x-rise"><circle class="c" cx="24" cy="30" r="1.4"/></g><g class="x-rise" style="--d:0.7s"><circle class="c" cx="40" cy="30" r="1.2"/></g><g class="x-rise" style="--d:1.3s"><circle class="c" cx="32" cy="28" r="1"/></g>' });
  B.place('karakol', { id: 'ski-gondola', label: 'Mountain gondola', colour: 'blue', mood: 'cheerful', tags: ['mountain', 'ski'],
    svg: () => '<path class="s" d="M0 56l16-30 10 16 10-24 14 26 14-14v34z"/><path class="w" d="M13 32l3-6 4 7-3-2zM33 26l3-8 5 9-4-2z"/>' +
      '<path class="lk" d="M4 8L60 22"/><g class="x-slidel"><path class="lk" d="M30 15v7"/><rect class="c" x="25" y="22" width="10" height="8" rx="1.5"/><rect class="w" x="27" y="24" width="6" height="3"/></g>' +
      '<path class="c" d="M0 58q16-4 32 0t32-2v8H0z"/><g class="x-fall"><circle class="w" cx="12" cy="8" r="1.2"/></g><g class="x-fall" style="--d:0.8s"><circle class="w" cx="44" cy="6" r="1.2"/></g><g class="x-fall" style="--d:1.5s"><circle class="w" cx="56" cy="10" r="1.2"/></g>' });
  B.place('irkutsk', { id: 'baikal-seal', label: 'Baikal seal on ice', colour: 'teal', mood: 'calm', tags: ['lake', 'animal', 'ice'],
    svg: () => '<path class="m" d="M0 0h64v26H0z"/><g class="x-glow"><circle class="w lc" cx="50" cy="12" r="5"/></g><path class="s" d="M0 26l10-5 8 5 12-6 10 6 10-4 14 5v8H0z"/>' +
      '<path class="w" d="M0 34h64v30H0z"/><path class="lc" d="M8 44l12 2M40 40l10-1M14 56l16-2"/>' +
      '<g class="x-breathe"><path class="m" d="M16 52q2-10 14-9 12 0 20 6l6-2-2 8q-8 4-20 3-14 1-18-6z"/><circle class="k" cx="21" cy="46" r="1.2"/><path class="lk" d="M16 49h-5M16 51l-5 2"/></g>' +
      '<g class="x-pop" style="--d:1s"><ellipse class="lc" cx="54" cy="56" rx="4" ry="1.5"/></g>' });
  animRegisterPack(B.pack({ id: 'asia-central', name: 'Asia: Central', description: 'Kazakhstan, Uzbekistan, Turkmenistan, Tajikistan, Kyrgyzstan and Siberia: steppe, silk road domes, and mountain lakes.' }));
})();
