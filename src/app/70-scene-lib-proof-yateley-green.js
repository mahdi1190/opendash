/* Compact SVG numeric separators without changing the drawing: minus signs delimit coordinates. */
function sceneProofYateleyCompactParts(parts){for(const p of Object.keys(parts))if(Array.isArray(parts[p]))for(const sh of parts[p]){if(Array.isArray(sh)&&typeof sh[1]==='string')sh[1]=sh[1].replace(/\s+(?=-)/g,'');else if(sh&&typeof sh.d==='string')sh.d=sh.d.replace(/\s+(?=-)/g,'');}return parts;}
/* ============================================================
   SCENE LIBRARY: proof-yateley-green (docs/dev/SCENE_ENGINE.md section 2;
   docs/dev/SCENE_ENGINE_V2.md). The parts the hand-composed Yateley Green
   proof scene (71-scene-proof-yateley-green.js) needs and the library lacked.
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.

     bird.proof-heron-stalk   a grey heron wading in the hunting crouch, legs
                              stepping (walk hook): the stalking half
     bird.proof-heron-strike  the same heron standing still, the neck and bill
                              driving down into the water (turn hook): the stab
     water.proof-splash       the burst where the bill goes in: a crown of
                              drops and a ring
     bird.proof-duckling      a mallard duckling in spring and summer; the
                              same brood half-grown (hen plumage) in autumn
                              and winter
     prop.proof-ball          a tennis ball
     animal.proof-dog-ball    the library's dog (animal.dog) carrying the
                              ball home: its own shapes plus the ball
     tree.proof-yew           the old churchyard yew

   Every creature FACES RIGHT (flip to face left); light from the LEFT.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const eye = (x, y, r) => [['#141414', circ(x, y, r)], ['#ffffff', circ(x - r * .35, y - r * .35, r * .38), .9]];
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const def = o => sceneObjDefine(Object.assign({}, o, { build: (v, r, ctx) => tidy(o.build(v, r, ctx)) }));
  /** An irregular leafy blob (a cluster of lobes) round (cx, cy): one closed path, seeded. */
  const blob = (rnd, cx, cy, rx, ry, n) => {
    let d = '';
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rnd() * 0.3, k = 0.78 + rnd() * 0.32; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ox = mx - cx, oy = my - cy, L = Math.hypot(ox, oy) || 1, bulge = 0.26 + rnd() * 0.22;
      d += (i ? '' : `M${f1(p[0])} ${f1(p[1])}`) + `Q${f1(mx + ox / L * rx * bulge)} ${f1(my + oy / L * ry * bulge)} ${f1(q[0])} ${f1(q[1])}`;
    });
    return d + 'z';
  };

  /* ---------- the heron: one drawing, two hooks (stalk: the legs; strike: the neck) ---------- */
  // Anchor: the waterline under the feet. The neck pivots at the shoulder (12, -50); the bill tip rests at (66, -60) and a
  // 78 degree turn puts it 0.7 below the waterline at x 33: the stab (the scene times the splash to the turn's peak).
  const HERON_PAL = { base: { grey: ['#8e99a2', '#b7c0c6', '#5f6b74', '#3b444c'], white: ['#eef1f2', '#d9dfe2'], streak: '#2a3036', bill: ['#e2b24a', '#b8862c'], leg: ['#8a7a4e', '#6a5c3a'], black: '#1c2228', ripple: '#eaf8f4', plume: '#c9d0d4' } };
  const heronLegs = (x0, x1) => [{ s: '@leg.0', w: 2.6, d: `M${x0} -34q1 9 2 18q1 9 2 16` }, { s: '@leg.1', w: 1.2, op: .7, d: `M${x0 + 1} -18l3-3` }, { s: '@leg.0', w: 2.4, d: `M${x1} -34q-1 9-2 18q-1 9-3 16` }];
  const heronBody = () => [
    { s: '@ripple', w: 1.3, op: .55, d: ell(0, 1.2, 15, 2.4) },
    ['@grey.0', 'M-33-40Q-26-61 0-61Q15-61 19-52Q21-42 8-36Q-12-30-33-40z'],
    ['@grey.1', 'M-26-50Q-14-60 2-60Q12-60 16-55Q0-57-26-50z', .85],
    ['@grey.2', 'M-33-40Q-18-34 6-36Q-6-42-26-45z'],
    ['@grey.3', 'M-34-41l-9 5 11-1z'],
    { s: '@grey.3', w: 1.1, op: .55, d: 'M-24-46q10-5 22-6M-18-41q12-3 22-3' },
    { s: '@plume', w: 1.2, op: .8, d: 'M14-44q2 6 0 11M17-45q3 5 2 10M11-43q1 5-1 9' },
    ['@grey.3', 'M-30-44q8-6 20-7-10 4-20 7z', .6],
  ];
  const heronNeck = () => [
    { s: '@white.1', w: 7.5, d: 'M11-49Q14-60 22-65Q30-69 41-67' },
    { s: '@white.0', w: 5, d: 'M12-51Q15-60 22-64Q30-67 40-66' },
    { s: '@streak', w: 1.1, op: .65, d: 'M17-55l2 3M20-59l2 3M24-63l2 2' },
    ['@white.0', 'M37-71Q44-75 49-69Q50-64 44-62Q38-62 37-71z'],
    ['@black', 'M38-70Q42-74 47-72Q41-71 30-69Q34-69 38-70z'],
    { s: '@black', w: 1.3, d: 'M38-70q-6 1-12 4' },
    ['@bill.0', 'M47-69L67-60L46-63z'], { s: '@bill.1', w: .8, d: 'M48-65L64-60.6' },
    ...eye(44.6, -68.4, 1.3),
  ];
  const heron = (id, anim, parts, credit) => def({
    id, category: 'bird', size: [100, 72], variants: 1, seasonal: false, flippable: true, parts, reflect: true, real: { h: 0.78, l: 1.05, w: 0.3 },
    palette: HERON_PAL, anim, shadow: { rx: 22, ry: 3, h: 70 },
    tags: ['uk', 'pond', 'heron', 'grey-heron', 'hunting', 'water', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit,
    build() {
      const legs = heronLegs(3, -3);
      if (parts.includes('legA')) return { legA: [legs[0], legs[1]], legB: [legs[2]], body: heronBody(), neck: heronNeck() };
      return { legs, body: heronBody(), neck: heronNeck() };
    },
  });
  heron('bird.proof-heron-stalk', { walk: { parts: ['legA', 'legB'], pivot: [0, -34], deg: 9, period: 1.7, bob: .5 } }, ['legB', 'body', 'legA', 'neck'],
    'drawn for the Yateley Green proof: a wading grey heron in the hunting crouch, stepping');
  heron('bird.proof-heron-strike', { turn: { part: 'neck', pivot: [12, -50], deg: 78, period: 6, hold: .9 } }, ['legs', 'body', 'neck'],
    'drawn for the Yateley Green proof: the same heron, the neck driving down in a stab');

  /* ---------- water.proof-splash: a crown of drops and a ring where the bill went in ---------- */
  def({
    id: 'water.proof-splash', category: 'water', size: [44, 26], variants: 1, seasonal: false, flippable: true, real: { h: 0.26, l: 0.44, w: 0.3 },
    palette: { base: { foam: ['#f4fbfa', '#d6ebe8'], ring: '#e8f6f3', drop: '#ffffff' } },
    tags: ['uk', 'pond', 'water', 'splash', 'kit:water', 'kit:temperate', 'role:edge'],
    credit: 'drawn for the Yateley Green proof',
    build() {
      // mirror-symmetric, so it may jitter side to side (the scene's grow step) without a visible flip
      const drops = [[6, -21, 1.2], [11, -14, 1.3], [15, -7, 1], [2.5, -24, 1]];
      return {
        body: [
          { s: '@ring', w: 1.6, op: .75, d: ell(0, 0, 20, 3.4) }, { s: '@ring', w: 1, op: .45, d: ell(0, 0, 13, 2.2) },
          ['@foam.1', 'M-8 0q1-7 3-12 2 5 2 3 1-6 3-8 2 2 3 8 0-2 2-3 2 5 3 12z', .9], ['@foam.0', 'M-5 0q1-5 2-8 1 3 2 1 1-4 1-5 0 1 1 5 1 2 2-1 1 3 2 8z'],
          ...drops.flatMap(([x, y, r]) => [['@drop', circ(x, y, r)], ['@drop', circ(-x, y, r)]]),
        ],
      };
    },
  });

  /* ---------- bird.proof-duckling: a downy duckling (spring, summer); half-grown in hen plumage (autumn, winter) ---------- */
  def({
    id: 'bird.proof-duckling', category: 'bird', size: [40, 26], variants: 2, seasonal: true, shapeBySeason: true, flippable: true, reflect: true, real: { h: 0.16, l: 0.25, w: 0.12 },
    palette: { base: { wake: '#f2fbf6', down: ['#5e4a2e', '#7a6440', '#3e3020'], face: ['#e8cf6a', '#f2e090'], bill: '#3a3226', hen: ['#9a7a54', '#bfa07a', '#6a5034', '#84653f'], henBill: '#c97e36', speculum: '#4060b0' } },
    anim: { paddle: { dy: .8, deg: 2.4, period: 1.6 } },
    tags: ['uk', 'pond', 'duck', 'duckling', 'mallard', 'water', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit: 'drawn for the Yateley Green proof (the brood of the green pond)',
    build(v, r, ctx) {
      const s = (ctx && ctx.season) || 'summer', young = s === 'spring' || s === 'summer';
      if (young) {
        const k = v ? 1.08 : 1;
        return {
          body: [{ s: '@wake', w: 1, op: .5, d: `M${-10 * k} 1.5h${18 * k}` }, ['@down.0', `M${-10 * k} 0q-2-8 6-10l9 1q6 2 5 9z`], ['@down.1', 'M-7-8q6-3 12-1-6 1-12 1z', .8], ['@face.0', 'M-4-5q4 2 9 0l1 4h-10z', .8], ['@down.2', 'M-11-4l-3-1 2 3z']],
          head: [['@down.0', 'M3-8q-1-9 6-9 6 1 5 7l-4 3z'], ['@face.0', 'M6-10q3-2 7 0l-1 3h-5z'], { s: '@down.2', w: 1, d: 'M6-13h7' }, ['@bill', 'M13-12l5 1.5-5 1.2z'], ...eye(10, -13, .9)],
        };
      }
      return {
        body: [{ s: '@wake', w: 1.2, op: .5, d: 'M-18 2h30' }, ['@hen.0', 'M-18 0c-3-9 3-14 12-14l16 1c7 0 11 6 10 13z'], ['@hen.1', 'M-15-9q9-5 22-4 3 1 1 3-12-1-23 1z', .8],
          { s: '@hen.2', w: 1.2, d: 'M-13-7l3-1.5M-7-7l3-1.5M-1-7l3-1.5M5-6.5l3-1.5M-10-3l3-1.5M-4-3l3-1.5M2-3l3-1.5' }, ['@speculum', 'M-7-9h8l-2 3h-7z'], ['@hen.3', 'M-19-4l-6-4 2 6z']],
        head: [['@hen.0', 'M8-11q-1-13 7-14 7 0 5 8l-4 7z'], { s: '@hen.2', w: 1.4, d: 'M9-19h9' }, ['@henBill', 'M19-20l8 2.2-8 1.8z'], ...eye(15, -21, 1.1)],
      };
    },
  });
  // the heads turn with the paddle; a small look-round on its own hook would cost a draw per bird: the brood stays at one hook

  /* ---------- prop.proof-ball: a tennis ball ---------- */
  def({
    id: 'prop.proof-ball', category: 'prop', size: [9, 9], variants: 1, seasonal: false, flippable: true, real: { h: 0.07, l: 0.07, w: 0.07 },
    palette: { base: { felt: ['#d8e84a', '#b4c43a', '#eef68a'], seam: '#f8f8f0' } },
    tags: ['uk', 'park', 'green', 'ball', 'dog', 'kit:temperate', 'kit:people', 'role:street'],
    credit: 'drawn for the Yateley Green proof',
    build() {
      return { body: [['@felt.1', circ(0, -4.5, 4.5)], ['@felt.0', circ(-.6, -5.1, 3.7)], ['@felt.2', circ(-1.8, -6.6, 1.4), .8], { s: '@seam', w: .8, d: 'M-3.4-7.4q3 2.6 0 6.2M3.2-7.6q-2.6 3 .2 6.4' }] };
    },
  });

  /* ---------- animal.proof-dog-ball: the library dog carrying the ball home ---------- */
  def({
    id: 'animal.proof-dog-ball', category: 'animal', size: [71, 46], variants: 3, seasonal: false, flippable: true, parts: ['legsFar', 'tail', 'body', 'legsNear', 'head'], real: { h: 0.6, l: 0.9, w: 0.3 },
    palette: { base: { felt: ['#d8e84a', '#b4c43a', '#eef68a'], seam: '#f8f8f0' } },
    anim: { walk: { parts: ['legsNear', 'legsFar'], pivot: [0, -16], deg: 14, period: .55, bob: 1.2 }, sway: { part: 'tail', pivot: [-18, -22], deg: 14 } },
    shadow: { rx: 22, ry: 3, h: 30 },
    tags: ['uk', 'park', 'green', 'dog', 'pet', 'fetch', 'kit:animals', 'kit:temperate', 'role:animal'],
    credit: "the library's animal.dog with a tennis ball in its mouth (drawn for the Yateley Green proof)",
    build(v) {
      const base = typeof sceneObjShapes === 'function' ? sceneObjShapes('animal.dog', v, 'summer') : null;
      const out = {};
      for (const p of ['legsFar', 'tail', 'body', 'legsNear', 'head']) out[p] = base && base.parts[p] ? base.parts[p].map(sh => Object.assign({}, sh)) : [];
      out.head = out.head.filter((sh, i) => i < out.head.length).concat([['@felt.1', circ(34, -24.5, 4.2)], ['@felt.0', circ(33.4, -25.1, 3.4)], { s: '@seam', w: .7, d: 'M31-27.6q2.6 2.4 0 5.6' }]);
      return sceneProofYateleyCompactParts(out);
    },
  });

  /* ---------- tree.proof-yew: the old churchyard yew, broad and dark ---------- */
  def({
    id: 'tree.proof-yew', category: 'tree', size: [220, 240], variants: 2, seasonal: false, flippable: true, parts: ['trunk', 'crown'], real: { h: 12, l: 11, w: 9 },
    palette: { base: { bark: ['#6a3e2a', '#4a2a1c'], yew: ['#1e3a26', '#294a30', '#36603c', '#152a1c'] } },
    anim: { sway: { part: 'crown', pivot: [0, -40], deg: .5 } },
    shadow: { rx: 90, ry: 12, h: 230 },
    tags: ['uk', 'churchyard', 'yew', 'evergreen', 'conifer', 'kit:temperate', 'role:tree'],
    credit: 'drawn for the Yateley Green proof (the churchyard yew of St Peter\'s)',
    build(v) {
      const rnd = sceneRnd(4410 + v * 17);
      const crown = [];
      [['@yew.3', 0, -110, 108, 112], ['@yew.0', -6, -118, 100, 104], ['@yew.1', -16, -132, 78, 86], ['@yew.2', -30, -150, 46, 52]].forEach(([f, cx, cy, rx, ry], j) => {
        let d = '';
        for (let i = 0; i < 5 + j; i++) d += blob(rnd, cx + (rnd() - .5) * rx * .9, cy + (rnd() - .5) * ry * .9, rx * (.45 + rnd() * .2), ry * (.4 + rnd() * .2), 5);
        crown.push({ f, d, op: j === 3 ? .7 : 1 });
      });
      return {
        trunk: [['@bark.0', 'M-16 0q-4-30 4-56h20q8 26 4 56z'], ['@bark.1', 'M4 0q2-28-2-56h8q6 26 4 56z', .8]],
        crown,
      };
    },
  });
})();

/* Proof-local LOD for the two flowering hawthorns and Church End cottages. Their structural drawing is retained;
   tiny leaves, thatch strokes and mortar speckles are detail at full size instead of being baked into every tile. */
function sceneProofYateleyLocalObjects(){const compact=d=>d.replace(/[-+]?(?:\d*\.?\d+)(?:e[-+]?\d+)?/gi,n=>String(Math.round(Number(n)*10)/10)).replace(/\s+(?=-)/g,'');if(typeof sceneObjDefine!=='function'||sceneProofYateleyLocalObjects.done)return;
 sceneProofYateleyLocalObjects.done=true;
 for(const [id,src] of [['tree.proof-yg-hawthorn','tree.hawthorn'],['building.proof-yg-thatched-cottage','building.thatched-cottage'],['building.proof-yg-green-cottage','building.green-cottage'],['tree.proof-yg-oak','tree.green-oak'],['tree.proof-yg-chestnut','tree.green-chestnut'],['tree.proof-yg-birch','tree.green-birch'],['tree.proof-yg-willow','tree.green-willow'],['tree.proof-yg-distant','tree.distant'],['tree.proof-yg-edge','tree.woods-edge']]){
  const base=sceneObj(src);sceneObjDefine(Object.assign({},base,{id,weight:0,variants:src==='tree.distant'||src==='tree.woods-edge'?2:base.variants,real:sceneObjReal(src),credit:base.credit+'; native proof-scene LOD',build(v,r,ctx){
    const sh=sceneObjShapes(src,v,ctx&&ctx.season||'summer'),out={};let leaf=0;
    for(const p of sh.order){out[p]=[];for(const source of sh.parts[p]){const q=Object.assign({},source,{d:compact(source.d)});
      if(q.s&&q.w<4.5)out[p].push(Object.assign({},q,{detail:true}));
      else if(src.startsWith('tree.green-')&&q.m&&q.f){const n=leaf++;if(n%3===0)out[p].push(Object.assign({},q,{detail:q.detail||n%12!==0}));}
      else if(src.startsWith('tree.green-')&&q.detail&&q.d.length>1500){const parts=q.d.split(/(?=M)/);out[p].push(Object.assign({},q,{d:parts.filter((_,j)=>j%3===0).join('')}));}
      else if(src==='tree.hawthorn'&&p==='crown'&&!q.m&&q.d.length>1000){const subs=q.d.split(/(?=M)/);out[p].push(Object.assign({},q,{d:subs.filter((_,j)=>j%24===0).join(''),detail:q.detail}));out[p].push(Object.assign({},q,{d:subs.filter((_,j)=>j%24!==0&&(!/^#(?:fff4f6|f6c9d7)$/.test(q.f)||j%3===0)).join(''),detail:true}));}
      else if(src==='tree.hawthorn'&&p==='crown'&&q.m&&q.f){const n=leaf++;if(n%4)continue;if(n%42===0){const subs=q.d.split(/(?=M)/);out[p].push(Object.assign({},q,{d:subs[0],detail:q.detail}));if(subs.length>1)out[p].push(Object.assign({},q,{d:subs.slice(1).join(''),detail:true}));}else out[p].push(Object.assign({},q,{detail:true}));}
      else if(src!=='tree.hawthorn'&&q.d.length>250&&(q.d.match(/M/g)||[]).length>1){const subs=q.d.split(/(?=M)/);out[p].push(Object.assign({},q,{d:subs.filter((_,j)=>j%6===0).join(''),detail:q.detail}));out[p].push(Object.assign({},q,{d:subs.filter((_,j)=>j%6!==0).join(''),detail:true}));}
      else out[p].push(q);
    }}Object.defineProperty(out,'$anim',{value:sh.anim});return sceneProofYateleyCompactParts(out);
  }}));
 }
 const R=n=>Math.round(n*10)/10, blob=(r,x,y,rx,ry,n)=>sceneD.lobed(r,x,y,rx,ry,n,.3);
 for(const kind of ['herbs','rushes','shrubs','tuft']){const tall=kind==='rushes',shrub=kind==='shrubs',tiny=kind==='tuft',height=tall?150:shrub?95:tiny?24:50;
  sceneObjDefine({id:'plant.proof-yg-'+kind,category:'plant',weight:0,size:[620,height+10],variants:4,seasonal:true,flippable:true,parts:['body'],real:{h:tall?1.6:shrub?1.15:tiny?.18:.55,l:tiny?.4:3.5,w:1},foot:[.12,.1],
   palette:{base:{leaf:['#526c35','#78934b','#a4b566'],flower:['#e6ce74','#f0eee1'],head:'#80624b'},spring:{leaf:['#53793a','#7da44e','#afc96c'],flower:['#f0d481','#fff6eb']},summer:{leaf:['#4e6b32','#7b9145','#b4b969'],flower:['#e2c45e','#f3eee4']},autumn:{leaf:['#71623c','#9e8b50','#bdab6c'],flower:['#ab7951','#d5c8a8']},winter:{leaf:['#777261','#9c9780','#b9b49b'],flower:['#a79b7d','#d3c9b2']}},
   tags:['uk','green','meadow','class:cover','kit:temperate',shrub?'role:shrub':tall?'role:edge':'role:ground'],credit:"Yateley Green native planting: layered grass, meadow flowers, rushes and cottage shrubs",
   build(v,r){let stems='',leaves='',flowers='',shade='';const width=tiny?18:55+75*v,n=tiny?9:shrub?15:22;
    for(let i=0;i<n;i++){const x=(r()-.5)*2*width,h=height*(.38+r()*.57),lean=(r()-.5)*(tiny?9:25);
     stems+='M'+R(x)+' 0Q'+R(x+lean*.3)+' '+R(-h*.55)+' '+R(x+lean)+' '+R(-h);
     if(shrub){const y=-h*.5,rx=12+r()*15;leaves+=blob(r,x,y,rx,h*.55,7);shade+=blob(r,x+rx*.15,y+h*.12,rx*.72,h*.36,6);}
     else{for(const sg of [-1,1])leaves+='M'+R(x)+' '+R(-h*.25)+'Q'+R(x+sg*12)+' '+R(-h*.75)+' '+R(x+sg*21)+' '+R(-h*.55)+'Q'+R(x+sg*7)+' '+R(-h*.3)+' '+R(x)+' '+R(-h*.25)+'Z';}
     if(tall)flowers+='M'+R(x+lean-2)+' '+R(-h+14)+'q-2-10 0-18q4-3 5 2v14q-2 4-5 2Z';
     else if(!tiny&&!shrub&&i%3===0){const y=-h,xx=x+lean;flowers+='M'+R(xx-3)+' '+R(y)+'q-2-4 1-5q4-1 4 2q5-1 5 3q-1 4-5 3q-3 4-5 0Z';}
    }return{body:[{s:'@leaf.1',w:tiny?.8:1.1,cap:'round',d:stems},{f:'@leaf.0',d:leaves.split(/(?=M)/).filter((_,j)=>j%4===0).join('')},{f:'@leaf.0',d:leaves.split(/(?=M)/).filter((_,j)=>j%4!==0).join(''),detail:true},{f:'@leaf.1',d:shade}, {f:tall?'@head':'@flower.'+(v%2),d:flowers.split(/(?=M)/).filter((_,j)=>j%3===0).join('')},{f:tall?'@head':'@flower.'+(v%2),d:flowers.split(/(?=M)/).filter((_,j)=>j%3!==0).join(''),detail:true}]};}
  });
 }
}
