/* ============================================================
   SCENE LIBRARY: landmark.mackinac-bridge (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   After the suspension bridge in the hand-drawn mi-mackinac-bridge art (its two towers, the
   computed cable curves and suspenders, the deck on its truss), redrawn by hand:
   - the real structure: the Mackinac Bridge across the Straits of Mackinac, a long suspension
     bridge with two steel towers, each a pair of legs braced by horizontal struts and X-bracing
     above the roadway, standing on massive concrete piers; the two main cables in a deep
     parabola over the main span and down the side spans to the concrete anchorage blocks; the
     vertical suspenders; the deep open stiffening truss under the roadway; beyond the
     anchorages the truss approach spans on slim piers. Seen a little from the side, so each
     tower shows both legs and the two cable planes part near the towers; the towers drawn
     taller than the true proportion (the span foreshortened), as the old art did
   - its colours: ivory towers and cables, the foam-green truss; lit from the left
   - night: the lights strung along the main cables and the roadway lamps (glow), the towers
     floodlit, the aviation beacons on the tower tops (the 'lit' part)
   No text, no flags. Anchor: the waterline at the middle of the main span (the towers at x +-380,
   the anchorages at +-740).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const TX = 380, AX = 740, END = 880, TOP = -262, SAD = -255, PIER = -16, TD = 14;   // towers, anchorages, box edge, tower top, cable saddles, pier top, truss depth
  const dk = x => { const a = Math.abs(x); return a <= AX ? -96 - 8 * (1 - Math.pow(a / AX, 2)) : -96 + (a - AX) * 0.1; };   // the roadway (cambered, falling on the approaches)
  const LOW = dk(0) - 5;   // the main cables' low point, just above the roadway at mid-span
  // a main cable: the plane at offset o (near -15, far +15); the main span, then the two side spans to the anchorages
  const mainY = (x, o) => LOW + (SAD - LOW) * Math.pow((x - o) / TX, 2);
  const sideY = (x, o) => { const sg = Math.sign(x), x0 = sg * TX + o, t = (x - x0) / (sg * AX - x0), y0 = SAD, y1 = dk(AX) - 3; return y0 + (y1 - y0) * t + 14 * Math.sin(Math.PI * t); };
  const cableD = o => {
    // The native suspension parabola is exact as a quadratic, rather than
    // hundreds of tiny line segments repeated in its real water reflection.
    let d='M'+(-TX+o)+' '+SAD+'Q'+o+' '+f1(2*LOW-SAD)+' '+(TX+o)+' '+SAD;
    for(const sg of[-1,1]){const x0=sg*TX+o,x1=sg*AX,y1=dk(AX)-3;d+='M'+x0+' '+SAD+'Q'+f1((x0+x1)/2)+' '+f1((SAD+y1)/2+28)+' '+x1+' '+y1;}
    return d;
  };
  const cableAt = (x, o) => (Math.abs(x - o) <= TX ? mainY(x, o) : sideY(x, o));
  define({
    id: 'landmark.mackinac-bridge', category: 'landmark', size: [1144, 270], box: [-575, -270, 575, 40], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      tower: ['#e3e5cf', '#8b9c91', '#526f73', '#314f59'], cable: ['#4c6970', '#779298'], truss: ['#8db4a1', '#4e8174', '#315f64', '#234851'],
      pier: ['#c4c2ba', '#9a988e', '#6e6c64'], lamp: '#ffe2a8', neck: '#fff4d8', flood: '#fff0d0', beacon: '#ff4a3a',
    } },
    night: { glow: { lamp: '#ffe6b4' }, on: 0.9 },
    tags: ['landmark', 'place:us/state:MI', 'us', 'us-midwest', 'bridge', 'suspension-bridge', 'signature'],
    credit: 'native (scene engine upgrade), after the hand-drawn mi-mackinac-bridge art (its towers and cable curves)',
    build() {
      const body = [], lit = [];
      const xs = []; for (let x = -END; x <= END; x += 20) xs.push(x);
      // the approach and anchorage piers (behind the truss): slim piers with caps, then the anchorage blocks
      for (const sg of [-1, 1]) {
        for (const a of [800, 856]) { const x = sg * a, y = dk(x) + TD; body.push(['@pier.1', poly([[x - 6, 0], [x - 4, y], [x + 4, y], [x + 6, 0]])], ['@pier.2', poly([[x + 1, 0], [x + 1, y], [x + 4, y], [x + 6, 0]]), 0.8]); }
        const x = sg * AX, y = dk(AX) + 2;
        body.push(['@pier.0', poly([[x - 30, 0], [x - 26, y], [x + 26, y], [x + 30, 0]])], ['@pier.2', poly([[x + 8, 0], [x + 8, y], [x + 26, y], [x + 30, 0]]), 0.7]);
        body.push(['@pier.1', rect(x - 28, y - 2, 56, 3)], { s: '@pier.2', w: 0.6, op: 0.5, d: `M${x - 27} ${f1(y * 0.66)}H${x + 27}M${x - 28} ${f1(y * 0.33)}H${x + 28}`, detail: true });
        // the cable bent on the anchorage, where the cables splay into the block; the wash at its foot
        body.push(['@tower.1', poly([[x - 6, y - 2], [x - 3, y - 9], [x + 3, y - 9], [x + 6, y - 2]])], ['@tower.3', rect(x + 1, y - 9, 2, 7), 0.6]);
        body.push({ s: '@cable.0', w: 1, op: 0.45, d: `M${x - 34} -1Q${x} 2 ${x + 34} -1` });
      }
      // the far cable plane and its suspenders (fainter), then the far tower legs, in shade
      body.push({ s: '@cable.1', w: 1.6, op: 0.7, d: cableD(15) });
      let hf = ''; for (let x = -AX + 20; x < AX; x += 19) { if (Math.abs(Math.abs(x) - TX) < 12) continue; hf += `M${x} ${f1(cableAt(x, 15) + 1)}V${f1(dk(x))}`; }
      body.push({ s: '@cable.1', w: 0.4, op: 0.45, d: hf, detail: true });
      for (const cx of [-TX, TX]) {
        body.push(['@tower.2', poly([[cx + 9, PIER], [cx + 21, PIER], [cx + 19, SAD], [cx + 10, SAD]])], ['@tower.3', poly([[cx + 15, PIER], [cx + 21, PIER], [cx + 19, SAD], [cx + 15, SAD]]), 0.7]);
        body.push({ s: '@tower.3', w: 0.5, op: 0.5, d: `M${cx + 12} ${PIER}L${cx + 12.5} ${SAD}`, detail: true });
        // the struts between the legs and the X-bracing in the panels above the roadway
        const ys = [SAD + 2, -202, -152, dk(cx) - 18];
        body.push(['@tower.1', ys.map((y, k) => rect(cx - 12, y, 24, k ? 6 : 9)).join('')], ['@tower.2', ys.map(y => rect(cx - 12, y + 4, 24, 2)).join(''), 0.7]);
        let xb = ''; for (let k = 0; k < 3; k++) { const a = ys[k] + (k ? 6 : 9), b = ys[k + 1]; xb += `M${cx - 11} ${f1(a)}L${cx + 11} ${f1(b)}M${cx + 11} ${f1(a)}L${cx - 11} ${f1(b)}`; }
        body.push({ s: '@tower.1', w: 2.2, d: xb }, { s: '@tower.0', w: 0.7, op: 0.6, d: xb, detail: true });
        // below the roadway: one strut, the legs' footing on the pier
        body.push(['@tower.2', rect(cx - 12, -58, 24, 6)]);
      }
      // the stiffening truss under the roadway: the chords, the Warren web, the roadway's edge in the light
      const topP = xs.map(x => [x, dk(x)]), botP = xs.map(x => [x, dk(x) + TD]).reverse();
      body.push(['@truss.2', poly(topP.concat(botP)), 0.35]);
      let web = ''; for (let x = -END; x < END; x += 10) { const xm = x + 5, xn = x + 10; web += `M${x} ${f1(dk(x) + TD)}L${xm} ${f1(dk(xm))}L${xn} ${f1(dk(xn) + TD)}`; }
      body.push({ s: '@truss.1', w: 1, d: web }, { s: '@truss.3', w: 0.5, op: 0.6, d: (() => { let d = ''; for (let x = -END + 5; x < END; x += 10) d += `M${x} ${f1(dk(x))}V${f1(dk(x) + TD)}`; return d; })(), detail: true });
      body.push(['@truss.1', poly(topP.concat(xs.map(x => [x, dk(x) + 3]).reverse()))], ['@truss.0', poly(topP.concat(xs.map(x => [x, dk(x) + 1.2]).reverse()))], ['@truss.2', poly(xs.map(x => [x, dk(x) + TD - 2.4]).concat(botP))]);
      // the roadway's railing and its lamp standards (glow, in six groups)
      body.push({ s: '@truss.3', w: 0.6, op: 0.7, d: 'M' + xs.map(x => f1(x) + ' ' + f1(dk(x) - 3)).join('L'), detail: true });
      const lampD = ['', '', '', '', '', '']; let posts = '';
      for (let x = -860, i = 0; x <= 860; x += 40, i++) { lampD[(i * 5) % 6] += ell(x + 2, dk(x) - 8.4, 1.3, 1.1); posts += `M${x} ${f1(dk(x))}v-8h2`; }
      body.push({ s: '@truss.3', w: 0.6, op: 0.8, d: posts, detail: true });
      lampD.forEach(d => body.push({ f: '@truss.3', d, glow: 'lamp' }));
      // the near suspenders and the near main cable over the deck
      let hn = ''; for (let x = -AX + 10; x < AX; x += 19) { if (Math.abs(Math.abs(x) - TX) < 12) continue; hn += `M${x} ${f1(cableAt(x, -15) + 1)}V${f1(dk(x))}`; }
      body.push({ s: '@cable.0', w: 0.5, op: 0.7, d: hn, detail: true }, { s: '@cable.0', w: 2.4, d: cableD(-15) }, { s: '@cable.1', w: 0.8, op: 0.6, d: cableD(-15), detail: true });
      // the towers' near legs (in the light), their fluting, the caps with the saddles, the piers
      for (const cx of [-TX, TX]) {
        body.push(['@pier.0', rect(cx - 36, PIER, 72, -PIER)], ['@pier.2', rect(cx + 12, PIER, 24, -PIER), 0.7], ['@pier.1', rect(cx - 38, PIER - 2, 76, 2.6)], ['@pier.2', rect(cx - 36, -3, 72, 3), 0.6]);
        body.push({ s: '@cable.0', w: 1.2, op: 0.5, d: `M${cx - 42} -1Q${cx} 2 ${cx + 42} -1` });
        body.push(['@tower.0', poly([[cx - 21, PIER], [cx - 9, PIER], [cx - 10, SAD], [cx - 19, SAD]])], ['@tower.1', poly([[cx - 14, PIER], [cx - 9, PIER], [cx - 10, SAD], [cx - 14, SAD]]), 0.8]);
        body.push({ s: '@tower.2', w: 0.5, op: 0.55, d: `M${cx - 17} ${PIER}L${cx - 16.4} ${SAD}M${cx - 12} ${PIER}L${cx - 12} ${SAD}`, detail: true });
        body.push(['@tower.1', rect(cx - 23, TOP, 15, SAD - TOP + 1) + rect(cx + 8, TOP, 15, SAD - TOP + 1)], ['@tower.0', rect(cx - 23, TOP, 15, 2)], ['@tower.2', rect(cx - 23, SAD - 1, 46, 2), 0.8], ['@tower.3', rect(cx + 14, TOP, 9, SAD - TOP + 1), 0.6]);
        body.push(['@beacon', ell(cx - 15.5, TOP - 1, 1.1, 1.1) + ell(cx + 15.5, TOP - 1, 1.1, 1.1)]);
        // night: the towers floodlit from their piers, the beacons
        lit.push({ f: { lin: [[0, '@flood', 0.08], [1, '@flood', 0.55]], x1: 0, y1: TOP, x2: 0, y2: PIER }, d: poly([[cx - 21, PIER], [cx - 19, SAD], [cx + 19, SAD], [cx + 21, PIER]]) });
        for (const bx of [cx - 15.5, cx + 15.5]) lit.push({ f: { rad: [[0, '@beacon', 0.8], [1, '@beacon', 0]], cx: bx, cy: TOP - 1, r: 5 }, d: ell(bx, TOP - 1, 5, 5) });
      }
      // night: the lights strung along both main cables (the bridge's necklace), as glow in four groups
      const neck = ['', '', '', ''];
      let k = 0;
      for (const o of [-15, 15]) for (let x = -AX + 8; x < AX; x += 24, k++) neck[k % 4] += ell(x, cableAt(x, o) - 1, 1.1, 1.1);
      neck.forEach(d => body.push({ f: '@cable.1', d, op: 0.8, glow: 'lamp' }));
      lit.push({ s: '@neck', w: 1, op: 0.35, d: cableD(-15) });
      // A foreshortened view keeps both towers in a square and their height legible.
      const perspective = sh => Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2], m: [.65,0,0,1,0,0] } : Object.assign({},sh,{m:[.65,0,0,1,0,0]});
      return { body: body.map(perspective), lit: lit.map(perspective) };
    },
  });
  sceneObjDefine({id:'tree.us-mackinac-shore',category:'tree',weight:0,size:[260,120],variants:4,seasonal:true,shapeBySeason:true,flippable:true,shadow:{rx:90,ry:4,h:70},reflect:true,
    palette:{base:{leaf:['#385e4c','#5d7b60','#83a080'],trunk:'#536153'},spring:{leaf:['#4b7756','#6f965f','#9ab77e']},summer:{leaf:['#385f48','#5b7e54','#83a16d']},autumn:{leaf:['#756d46','#9a9259','#b4aa73']},winter:{leaf:['#829a92','#a5b8ad','#c1cec3']}},tags:['us','straits','mixed-wood','kit:temperate','role:tree'],
    build(v,r,ctx){const D=sceneD,F=n=>Math.round(n*10)/10,body=[],outline=[];for(let i=0;i<25;i++){const x=-129+i*10.7,y=-34-(18+29*r())*(.6+Math.sin(i*.72+v)*.32);outline.push([F(x),F(y)]);}
      const d=D.poly([[-132,0],...outline,[132,0]]);body.push({f:'@leaf.0',d},
        {f:'@leaf.1',d:D.poly([[-130,-3],...outline.map(([x,y])=>[x,y*.83+5]),[130,-3]])},
        {f:'@leaf.2',op:.5,d:D.poly([[-129,-15],...outline.map(([x,y])=>[x,y*.74-5]),[127,-15]])});
      for(let i=0;i<5;i++){const x=-104+i*51+(r()-.5)*15,y=-24-r()*19;body.push({s:'@trunk',w:1.3,d:'M'+F(x)+' 0v'+F(y)});}
      return{body};}});
  // A shaded version of the same paper-birch silhouette frames this east-facing shore.
  // The accepted lake object is unchanged; this local colour treatment is explicit only.
  sceneObjDefine({id:'tree.us-mackinac-paper-birch',category:'tree',weight:0,size:[180,340],variants:3,seasonal:true,shapeBySeason:true,flippable:true,parts:['body','crown'],shadow:{rx:40,ry:5,h:270},reflect:true,
    palette:{base:{bark:['#758d7b','#364f49','#203d3d'],leaf:['#183b32','#2a4b3b','#46654a']},spring:{leaf:['#244b35','#3d6141','#658454']},summer:{leaf:['#183b32','#2b4c39','#48694a']},autumn:{leaf:['#3a4631','#586139','#7d7d47']},winter:{bark:['#698278','#314f4e','#203c42']}},anim:{sway:{part:'crown',pivot:[0,-110],deg:1.2,period:7.7}},tags:['us','paper-birch','shore-shade','kit:temperate','role:tree'],build(v,r,ctx){return sceneObj('tree.us-lake-paper-birch').build(v,r,ctx);}});
  sceneObjDefine({id:'plant.us-lake-meadow',category:'plant',weight:0,size:[100,86],variants:3,seasonal:true,shapeBySeason:true,flippable:true,parts:['body','tips'],shadow:{rx:29,ry:3,h:24},
    palette:{base:{leaf:['#35593b','#708451','#a3a16a'],seed:'#bbad78'},spring:{leaf:['#457844','#80a45c','#b1bd73'],seed:'#bdc88a'},summer:{leaf:['#3a6a3e','#7c9851','#b0b76e']},autumn:{leaf:['#62613b','#958854','#b9aa73'],seed:'#ae935b'},winter:{leaf:['#7a8c79','#a3ad92','#c8ccb4'],seed:'#b8bba3'}},anim:{sway:{part:'tips',pivot:[0,-11],deg:1.4,period:7.4}},tags:['us','great-lakes','kit:temperate','role:ground'],build(v,r){const D=sceneD,body=[],tips=[];let a='',b='',c='';for(let i=0;i<17;i++){const x=-28+r()*56,h=15+r()*42,ex=x+(r()-.5)*57,d='M'+x+' 2Q'+(x+ex)*.45+' '+(-h*.73)+' '+ex+' '+(-h)+'Q'+(x+ex)*.52+' '+(-h*.36)+' '+(x+2.8)+' 2Z';if(i%3===0)c+=d;else if(i%2)a+=d;else b+=d;}body.push({f:'@leaf.0',d:a},{f:'@leaf.1',d:b},{f:'@leaf.2',d:c});for(let i=0;i<3;i++){const x=-22+i*21,h=54+r()*22,ex=x+(v-1)*7;tips.push({s:'@leaf.2',w:1.1,d:'M'+x+' -5Q'+(ex-6)+' -43 '+ex+' '+(-h)},{f:'@seed',d:D.poly([[ex,-h+6],[ex-4,-h-1],[ex-1,-h-9],[ex+3,-h+1]])});}for(const q of [...body,...tips])q.d=q.d.replace(/-?\d+\.\d+/g,n=>String(Math.round(Number(n)*10)/10));return{body,tips};}});
  sceneObjDefine({id:'plant.us-lake-clover',category:'plant',weight:0,size:[96,48],variants:3,seasonal:true,shapeBySeason:true,flippable:true,parts:['body','tips'],shadow:{rx:28,ry:2,h:12},
    palette:{base:{leaf:['#355b3d','#6e8e57'],stem:'#7d8a58',bloom:['#ddd5b5','#b9ac8a']},spring:{leaf:['#467a45','#89aa66']},summer:{leaf:['#3a6b3e','#7e9e57']},autumn:{leaf:['#68703e','#9b9858'],bloom:['#baaa7e','#8d805a']},winter:{leaf:['#89967b','#b4bca1'],bloom:['#c5c9b4','#9ba78c']}},anim:{sway:{part:'tips',pivot:[0,-3],deg:1.8,period:6.3}},tags:['us','great-lakes','kit:temperate','role:ground'],build(v,r,ctx){const D=sceneD,body=[],tips=[];let a='',b='',stems='';for(let i=0;i<10;i++){const x=-38+r()*76,y=-7-r()*24;stems+='M0 1Q'+x*.2+' '+y*.6+' '+x+' '+y;for(let j=0;j<3;j++){const t=j*2.094,z=D.ell(x+Math.cos(t)*4,y+Math.sin(t)*3.4,4.8,3.1);if(i%2)a+=z;else b+=z;}}body.push({s:'@stem',w:.8,d:stems},{f:'@leaf.0',d:a},{f:'@leaf.1',d:b});if(ctx.season!=='winter')for(let i=0;i<3;i++){const x=-22+i*22,y=-23-r()*12;tips.push({s:'@stem',w:1,d:'M'+x+' -3V'+y},{f:'@bloom.0',d:D.lobed(r,x,y,4.8,4,6,.14)},{s:'@bloom.1',w:.8,d:'M'+(x-3)+' '+y+'l5-1',detail:true});}for(const q of [...body,...tips])q.d=q.d.replace(/-?\d+\.\d+/g,n=>String(Math.round(Number(n)*10)/10));return{body,tips};}});
})();
