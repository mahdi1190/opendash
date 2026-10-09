/* Native timberwork and northern maples for the Vermont covered-bridge view.
   The original broad red bridge and stream are the subject; nothing from its
   whole painting is embedded. Separate boards, portal framing, roof seams,
   stone piers and interior lamps stay legible through the live light. */
(function () {
  const D = sceneD, R = n => Math.round(n * 10) / 10;
  sceneObjDefine({
    id: 'landmark.us-vt-covered-bridge', category: 'landmark', weight: 0, size: [740, 270], box: [-375, -274, 380, 30],
    variants: 1, seasonal: true, shapeBySeason: true, flippable: false, parts: ['body', 'lit'],
    palette: { base: { red: ['#8c3029', '#b64b39', '#682d2b'], timber: ['#e5d6ad', '#b39b71', '#452f2b'], roof: ['#39464a', '#657070', '#263940'], stone: ['#777b72', '#a6a697', '#505e5e'] },
      spring: { red: ['#913b31', '#bd5543', '#6c312c'] }, summer: { red: ['#973f31', '#be5b45', '#6e332e'] },
      autumn: { red: ['#91342d', '#b74c36', '#6b292b'] }, winter: { red: ['#793a37', '#a54c42', '#572c31'] } },
    night: { glow: { window: '#ffdc99', lamp: '#ffdf9d' }, on: 1 }, shadow: { rx: 310, ry: 2.5, h: 20 }, reflect: true,
    tags: ['landmark', 'place:us/state:VT', 'us', 'vermont', 'timber', 'covered-bridge'],
    build(v, rnd, ctx) {
      const b = [], lit = [], P = (f, d, op) => b.push({ f, d, op }), S = (s, w, d, op) => b.push({ s, w, d, op, cap: 'round' });
      // Stone abutments and the timber deck cross the stream; a visible front
      // portal carries into the long side wall in one consistent perspective.
      P('@stone.2', 'M-360 18L-354-18-290-24-286 22zM304 9l4-35 58-4 10 36z');
      P('@stone.0', 'M-353-18l62-6-4 40-64 2zM309-26l55-4 7 30-65 8z');
      for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) {
        const x = -352 + i * 15 + (j % 2) * 2, y = -14 + j * 10;
        S('@stone.1', 1.2, `M${x} ${y}h13m-5 0v8`, .65);
      }
      P('@timber.2', 'M-374-15L368-33 378-12-372 8z');
      P('#203d45', 'M-360 10L375-7 363 12-348 32z', .32);
      P('@timber.1', 'M-374-18L366-37 370-25-373-6z');
      for (let i = 0; i < 16; i++) S('@roof.2', 1.2, `M${-350+i*44} -17l${-8+i*.3} 13`, .6);
      P('@red.2', 'M-326-163L-86-158-84-20-326-12z');
      P('@red.0', 'M-86-158L355-144 355-35-84-20z');
      P('@red.1', 'M-324-161L-204-242-88-157z');
      P('@roof.0', 'M-365-164L-205-270 327-247 382-146-86-158-205-243z');
      P('@roof.1', 'M-365-164L-205-270 327-247 314-237-204-258z');
      P('@roof.2', 'M-205-270L327-247 382-146-86-158-205-243z');
      S('@timber.0', 4, 'M-357-164L-205-260-93-160 374-147', .9);
      S('@roof.1', 2.4, 'M-202-269L325-246', .8);
      // Roof courses converge; board widths and grain strokes are individually
      // weathered rather than repeating a pasted facade image.
      for (let i = 1; i <= 11; i++) {
        const t = i / 12;
        S('@roof.1', .9, `M${R(-205+119*t)} ${R(-270+112*t)}L${R(327+55*t)} ${R(-247+101*t)}`, .5);
      }
      for (let i = 0; i < 38; i++) {
        const x = -82 + i * 11.4, top = -156 + (x+82)*.032, bottom = -22-(x+82)*.033;
        P(i%4===0?'@red.1':i%3===0?'@red.2':'@red.0', D.poly([[x,top],[x+10.3,top+.33],[x+10.3,bottom-.34],[x,bottom]]), i%4===0?.72:.9);
        S('@timber.2', .8, `M${R(x+1.6)} ${R(top+8)}L${R(x+2.7)} ${R(bottom-5)}`, .35);
        if (i%3===1) S('@timber.1', .7, `M${R(x+5)} ${R(top+20)}l-1 24m2 10l-1 16`, .23);
      }
      // Dark open portal: roof rafters, a receding light at its far end and
      // the deck are visible inside, never a flat black hole.
      P('#293a3c', 'M-294-18V-141L-205-204-116-139V-23z');
      P('#414e49', 'M-285-23L-255-84-171-90-124-27z');
      P('@timber.2', 'M-294-141L-205-204-116-139-124-129-205-188-286-131z');
      P('#687469', 'M-236-56V-118l31-25 32 25v59z');
      for (let i = 0; i < 5; i++) {
        const t = i/6, x = -288+t*38, xr = -121-t*47, y = -137+t*20, cy = -198+t*55;
        S('@timber.1', 2.6-i*.3, `M${R(x)} -23V${R(y)}L-205 ${R(cy)}L${R(xr)} ${R(y)}V-25`, .68);
      }
      lit.push({f:{rad:[[0,'#efbb6f',.32],[1,'#b88649',0]],cx:-205,cy:-105,r:125},d:'M-294-18V-141L-205-204-116-139V-23z'});
      lit.push({s:'#e1be83',w:2.2,d:'M-287-25V-135L-205-195-124-133V-28M-279-26L-255-84-171-90-130-30',op:.5});
      P('@timber.0', 'M-329-166h13l3 151-14 1zM-99-161h13l1 139-13 1z');
      S('@timber.1', 3.3, 'M-324-163L-205-246-92-159M-315-15L-94-23', .95);
      // Six open bays: pale daylight at the back, warm interior lamps only
      // after real dusk. Braces form a second structural detail system.
      for (let i = 0; i < 6; i++) {
        const x = -50+i*64, y = -130+i*2.1;
        P('@timber.2', D.poly([[x-3,y-3],[x+48,y-1.4],[x+48,y+47],[x-3,y+48.5]]));
        P('#56665e', D.poly([[x,y],[x+43,y+1.4],[x+43,y+39],[x,y+40.4]]));
        P('#a5b2a1', D.poly([[x+7,y+4],[x+39,y+5],[x+39,y+27],[x+7,y+28]]), .55);
        S('@timber.1', 2.7, `M${x} ${R(y+39)}l42-34M${x+1} ${R(y+2)}l41 35`, .72);
        for (let j = 0; j < 2; j++) b.push({ f: '#b7ab87', d: D.rect(x+8+j*22,y+6,7,9,1), glow: 'window' });
        lit.push({ f: '#e6bb7c', d: D.poly([[x+9,y+13],[x+35,y+13],[x+41,y+38],[x+2,y+39]]), op: .13 });
      }
      S('@timber.1', 3, 'M-84-67L355-80M-84-28L355-43', .65);
      for (const x of [-81,47,175,303,351]) S('@timber.2', 4.5, `M${x} ${R(-154+(x+82)*.032)}L${x} ${R(-24-(x+82)*.033)}`, .7);
      lit.push({ s: '#c7d5df', w: 1.5, d: 'M-355-164L-205-261-93-160 372-147', op: .6 });
      if (ctx.season==='winter') {
        P('#e6edf0', 'M-365-164L-205-270 327-247 325-240-204-262-359-157z', .95);
        S('#d6e2e6', 4, 'M-89-158L378-146', .88);
      }
      return { body: b, lit };
    },
  });
  sceneObjDefine({id:'ground.us-vt-bridge-reflection',category:'ground',weight:0,size:[750,94],box:[-375,-4,375,94],variants:1,seasonal:false,flippable:false,parts:['body','lit'],shadow:false,
    palette:{base:{red:'#97524b',roof:'#455e64'}},tags:['us','water','kit:water','role:ground'],
    build(v,r){const body=[],lit=[];
      // The side wall and dark portal break into unequal water fragments;
      // there is no full-width horizontal stripe under the dry approach.
      for(let i=0;i<9;i++){const y=5+i*9;for(let j=0;j<3;j++){const x=-83+j*143+(r()-.5)*28+i*3,w=53+r()*63;
        body.push({f:i>5?'@roof':i%3?'@red':'@roof',op:.19*(1-i/12),detail:i>4,d:`M${R(x)} ${y}q${R(w*.4)} -2 ${R(w)} 1l-9 ${R(2+r()*3)}q${R(-w*.45)} -2 ${R(-w+17)} 0z`});}}
      for(let i=0;i<4;i++){const x=-145+i*9,y=12+i*13;body.push({f:'@roof',op:.15-i*.02,d:`M${x} ${y}l${46-i*5} 2-8 7-${32-i*4} -1z`});}
      for(let i=0;i<6;i++){const x=-36+i*64;lit.push({f:'#e7c38e',op:.16,d:`M${x} 11l26 1-6 2-18-1zM${x+8} 29h12l-5 2h-8z`});}return{body,lit};}});
  sceneObjDefine({
    id: 'tree.us-northern-maple', category: 'tree', weight: 0, size: [365, 485], box: [-205,-490,205,8], variants: 4,
    seasonal: true, shapeBySeason: true, flippable: true, parts: ['trunk','crown'],
    palette: { base: { bark: ['#4b3b31','#806447','#ae8b5e'] },
      spring: { leaf: ['#35553c','#6a8a45','#a3b86c'] }, summer: { leaf: ['#274c37','#4e7440','#7c9950'] },
      autumn: { leaf: ['#673527','#b35b2e','#db9644'] }, winter: { leaf: ['#5f625c','#92988e','#bec9bd'] } },
    shadow: {rx:35,ry:4,h:180}, reflect: true, anim:{sway:{part:'crown',pivot:[0,-190],deg:.7,period:8.1}},
    tags: ['us','maple','deciduous','kit:temperate','role:tree'],
    build(v, rnd, ctx) {
      const trunk=[], crown=[], lean=(v-1.5)*12;
      trunk.push({f:'@bark.0',d:`M-19 4Q-9-152 ${lean-13}-302L${lean+4}-360 ${lean+18}-301Q8-118 22 4z`});
      trunk.push({f:'@bark.1',d:`M-8 2Q-2-144 ${lean-5}-309L${lean+1}-349 ${lean+3}-300Q5-142 3 1z`,op:.75});
      for(let i=0;i<9;i++){
        const side=i%2?-1:1,y=-166-i*21,ex=side*(53+rnd()*89),ey=y-70-rnd()*52;
        trunk.push({s:'@bark.0',w:Math.max(2.5,9-i*.6),cap:'round',d:`M${R(lean*.4)} ${y}Q${R(ex*.5)} ${R(y-24)} ${R(ex)} ${R(ey)}`});
        trunk.push({s:'@bark.1',w:1.3,op:.65,d:`M${R(ex*.55)} ${R(y-25)}L${R(ex+side*19)} ${R(ey-31)}`});
      }
      if(ctx.season!=='winter'){
        const crownD=(cx,cy,rx,ry,n)=>{const p=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,k=.83+rnd()*.19;p.push([cx+Math.cos(a)*rx*k,cy+Math.sin(a)*ry*k]);const aa=a+.45/n*Math.PI*2;p.push([cx+Math.cos(aa)*rx*k*.94,cy+Math.sin(aa)*ry*k*.94]);}let d=`M${R(p[0][0])} ${R(p[0][1])}`;for(let i=1;i<p.length;i++)d+=`L${R(p[i][0])} ${R(p[i][1])}`;return d+'z';};
        const outline=crownD(lean,-337,176+v*4,133,24);
        crown.push({f:'@leaf.0',d:outline});
        // Welded irregular tone masses follow the branch hierarchy. They are
        // broad connected shapes, never a pile of pale circular leaf coins.
        const mass=pts=>D.poly(pts.map(([x,y])=>[x+lean+(rnd()-.5)*11,y+(rnd()-.5)*9]));
        crown.push({f:'@leaf.1',op:.72,d:mass([[-146,-340],[-157,-381],[-124,-416],[-86,-419],[-68,-451],[-16,-460],[16,-436],[49,-443],[74,-418],[115,-403],[146,-378],[134,-348],[161,-324],[132,-292],[103,-283],[88,-262],[45,-277],[19,-251],[-21,-273],[-61,-256],[-91,-277],[-129,-290],[-143,-315]])});
        crown.push({f:'@leaf.2',op:.24,d:mass([[-139,-374],[-113,-412],[-76,-408],[-62,-440],[-18,-444],[9,-425],[-15,-403],[13,-390],[-13,-370],[-41,-381],[-63,-356],[-92,-364],[-113,-344]])});
        crown.push({f:'@leaf.0',op:.34,d:mass([[-117,-318],[-84,-303],[-50,-311],[-21,-292],[11,-309],[47,-297],[83,-314],[126,-310],[112,-284],[83,-276],[44,-282],[17,-265],[-19,-281],[-54,-271],[-89,-287]])});
        let flecks='';for(let i=0;i<48;i++){const a=rnd()*6.28,x=lean+Math.cos(a)*rnd()*153,y=-352+Math.sin(a)*rnd()*102;flecks+=D.poly([[x-5,y],[x-2,y-6],[x+2,y-3],[x+6,y-5],[x+5,y+2],[x,y+5]]);}
        crown.push({f:'@leaf.2',d:flecks,op:.36,detail:true});
      }else{
        // The tree loses its foliage; twigs, rather than green winter coins,
        // carry the crown and catch the low winter light.
        for(let i=0;i<25;i++){
          const a=(i/25*2-1)*1.18,tx=Math.sin(a)*(115+rnd()*60)+lean,ty=-320-Math.cos(a)*(90+rnd()*56);
          crown.push({s:'@bark.0',w:1.8+rnd()*1.5,cap:'round',d:`M${R(lean)} -260Q${R(tx*.52)} ${R(ty+49)} ${R(tx)} ${R(ty)}`,detail:i>12});
          crown.push({s:'@bark.1',w:1.1,d:`M${R(tx*.75)} ${R(ty+24)}l${R((rnd()-.5)*45)} -27`,op:.8,detail:true});
        }
        crown.push({s:'#dfe7e5',w:3,op:.6,d:`M-16-244Q-50-288-89-311M8-229Q61-277 96-320`});
      }
      return {trunk,crown};
    },
  });
})();
