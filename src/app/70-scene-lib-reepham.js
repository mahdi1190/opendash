/* Reepham: hand-drawn architecture, ground metres in the four view files.
   References (viewpoint, not copied pixels): Wikimedia Commons Geograph
   765581 (Market Place), 766121 (the two churches), Reepham railway station
   in 2008; 3154327 (Whitwell platform); whitwellstation.com.
   The former station is a walking/cycling route, NOT an operating railway.
   MODEL: proof-fleet-pond/hampshire-fleet-pond-proof. Take foreground framing,
   a leading line and distance-scaled life; use original masonry/roof geometry.
   Engine owns sky, illumination, shadows, seasons and weather throughout.
   Dimensions are visual estimates, not a measured architectural survey. */
const SCENE_REEPHAM = (function () {
  function base(id, lat, lon, heading, setting, x0) {
    return {v:2,id,view:{lat,lon},camera:{eye:1.65,fov:66,horizon:450,x0:x0||800,lat,lon,heading},
      at:'afternoon',season:'auto',setting,atmos:'auto',weather:'live',cover:'auto',particles:'season',signage:false,
      kits:['temperate','urban','people','birds'],sky:{stars:180,clouds:{n:3,y:[50,305],speed:3},sunR:24,moonR:18},
      surfaces:[],water:[],ground:[],place:[],scatter:[],actors:[],flocks:[],flows:[]};
  }
  function plants(data,on,seed,n,d,near) {
    const range=d||[4.8,95];
    data.scatter.push({obj:{'plant.rph-short-grass':3,'plant.rph-rosette':2,'plant.wildflowers':1},on,d:data.setting==='urban'?range:[Math.max(10,range[0]),range[1]],n:Math.round((n||320)*.5),
      dist:'screen',gap:.22,k:[.9,1.1],seed,anim:false,tint:{col:'#c4a77b',k:[0,.05]}});
    if(data.setting!=='urban')data.scatter.push({obj:{'plant.rph-short-grass':3,'plant.rph-rosette':2},on,d:[4.7,9.1],n:near||360,
      dist:'screen',gap:.16,k:[.9,1.1],seed:seed+1039,anim:false,tint:{col:'#b5ad80',k:[0,.05]}});
  }
  function woodland(data,on,seed,d,n) {
    data.scatter.push({obj:{'tree.pond-oak':3,'tree.pool-birch':2},on,d,n,dist:'ground',
      cluster:{centres:9,spread:12},gap:'foot',seed,k:[.8,1.2],anim:false,shadow:false,tint:{col:'#b7c6bc',k:[0,.15]}});
  }
  function life(data,route,seed) {
    data.actors.push(...sceneBehave.pair(data,{obj:'person.walker',route,preset:'chat',seed,offset:.2}),
      sceneBehave.actor(data,{obj:'person.walker',route,preset:'dog-walker',seed:seed+137,offset:.7}),
      sceneBehave.actor(data,{obj:'animal.dog',route,preset:'dog-trot',seed:seed+353,offset:.74}));
  }
  function raised(data,poly,height) {
    // The existing engine's relief grid raises the actual surface AND feet.
    // No independent deck renderer or hand-painted shadow is introduced.
    const h=[],nx=25,nd=20;
    for(let j=0;j<nd;j++)for(let i=0;i<nx;i++){
      const x=-24+i*2,d=4*Math.pow(110/4,j/(nd-1));let inside=false;
      for(let a=0,b=poly.length-1;a<poly.length;b=a++)if((poly[a][1]>d)!==(poly[b][1]>d)&&x<(poly[b][0]-poly[a][0])*(d-poly[a][1])/(poly[b][1]-poly[a][1])+poly[a][0])inside=!inside;
      h.push(inside?height:0);
    }
    data.ground={relief:{x:[-24,24],d:[4,110],nx,nd,h}};
  }
  function finish(data) {
    // Compact the preset's dense timed samples while keeping waits, turns and
    // timing. Within 0.5 scene pixels of its original screen-space trajectory.
    for(const a of data.actors) {
      if(!a.path||a.path.length<3)continue;
      const P=a.path,T=[0];for(let i=1;i<P.length;i++)T[i]=T[i-1]+(P[i-1][2]||0)+(P[i][4]||0);
      const keep=new Set([0,P.length-1]);for(let i=0;i<P.length;i++)if(P[i][2]||i&&P[i][3]!==P[i-1][3]){keep.add(i);if(i)keep.add(i-1);}
      function split(i,j){let best=.5,idx=-1;for(let k=i+1;k<j;k++){const t=(T[k]-T[i])/(T[j]-T[i]||1),err=Math.hypot(P[k][0]-P[i][0]-(P[j][0]-P[i][0])*t,P[k][1]-P[i][1]-(P[j][1]-P[i][1])*t);if(err>best){best=err;idx=k;}}
        if(idx!==-1){keep.add(idx);split(i,idx);split(idx,j);}}
      const anchors=[...keep].sort((a,b)=>a-b);for(let i=1;i<anchors.length;i++)split(anchors[i-1],anchors[i]);
      const ids=[...keep].sort((a,b)=>a-b);a.path=ids.map((i,j)=>[P[i][0],P[i][1],P[i][2],P[i][3],j?Math.round((T[i]-T[ids[j-1]]-(P[ids[j-1]][2]||0))*100)/100:null]);
      // Scale is linear in projected ground Y for a level camera.
      if(a.sByY&&a.sByY.length>2&&!(data.ground&&data.ground.relief))a.sByY=[a.sByY[0],a.sByY[a.sByY.length-1]];
      else if(a.sByY&&a.sByY.length>2){
        const S=a.sByY,K=new Set([0,S.length-1]);
        function slim(i,j){let e=.001,k=-1;for(let q=i+1;q<j;q++){const t=(S[q][0]-S[i][0])/(S[j][0]-S[i][0]||1),v=Math.abs(S[q][1]-S[i][1]-(S[j][1]-S[i][1])*t);if(v>e){e=v;k=q;}}
          if(k>=0){K.add(k);slim(i,k);slim(k,j);}}
        slim(0,S.length-1);a.sByY=[...K].sort((a,b)=>a-b).map(i=>S[i]);
      }
    }
    return data;
  }
  return {base,plants,woodland,life,finish,raised};
})();
(function () {
  if(typeof sceneObjDefine!=='function')return;
  const r1=x=>Math.round(x*10)/10;
  const rect=(x,y,w,h)=>`M${r1(x)} ${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}z`;
  const ell=(x,y,rx,ry)=>`M${r1(x-rx)} ${r1(y)}a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(rx*2)} 0a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-rx*2)} 0z`;
  sceneObjDefine({id:'plant.rph-short-grass',category:'plant',size:[31,18],real:{h:.09,l:.16,w:.12},variants:3,seasonal:true,shapeBySeason:false,flippable:true,
    palette:{base:{},spring:{leaf:['#59813c','#9fad51']},summer:{leaf:['#456c38','#7e994a']},autumn:{leaf:['#75694b','#a99668']},winter:{leaf:['#7a8170','#b2b5a2']}},
    parts:['body'],tags:['uk','reepham','kit:temperate','role:ground','class:cover'],build(v,r){
      let a='',b='';for(let i=0;i<9;i++){const x=-13+r()*26,h=4+r()*12,dx=-7+r()*14;
        const leaf=`M${r1(x)} 0q${r1(dx-2)} -${r1(h*.7)} ${r1(dx)} -${r1(h)}q${r1(3-dx*.6)} ${r1(h*.5)} ${r1(2-dx)} ${r1(h)}z`;
        if(i%2)a+=leaf;else b+=leaf;}
      return {body:[['@leaf.0',a],['@leaf.1',b]]};}});
  sceneObjDefine({id:'plant.rph-rosette',category:'plant',size:[31,15],real:{h:.08,l:.17,w:.17},variants:3,seasonal:true,shapeBySeason:true,flippable:true,
    palette:{base:{},spring:{leaf:['#698449','#b0b965']},summer:{leaf:['#617843','#9eae5b']},autumn:{leaf:['#83714c','#b6aa7a']},winter:{leaf:['#777d68','#acb0a0']}},
    parts:['body'],tags:['uk','reepham','kit:temperate','role:ground','class:cover'],build(v,r,ctx){
      let d='';for(let i=0;i<7;i++){const a=i*Math.PI/3.5,x=Math.cos(a)*(7+r()*7),y=-4+Math.sin(a)*6;d+=`M0-1Q${r1(x-3)} ${r1(y-3)} ${r1(x)} ${r1(y)}Q${r1(x/2)} ${r1(y+3)} 0-1z`;}
      const B=[['@leaf.0',d],{s:'@leaf.1',w:.6,d:'M-12-4l12 3 11-5M-3-10l3 9 2-9'}];
      if(ctx.season==='spring'&&v===1)B.push({f:'#e7c359',d:ell(2,-9,2,2)});return {body:B};}});
  sceneObjDefine({id:'street.rph-headstone',category:'street',size:[42,58],real:{h:.85,l:.62,w:.15},variants:3,seasonal:false,flippable:true,
    parts:['body'],palette:{base:{}},tags:['uk','reepham','unlit','kit:temperate','role:street'],build(v,r){
      const top=v===0?'Q0-66 18-47':v===1?'L0-57 18-46':'Q0-53 18-45';
      return {body:[{f:'#7b8179',d:`M-20 0V-46${top}V0z`},{f:'#b4b1a0',d:`M-17-1V-44${top}V-1z`},
        {f:'#817f72',op:.5,d:'M-9-34q8-4 16 0v18q-8-3-16 0z'},{f:'#8b9672',d:'M-21 0q4-8 9-4l6 4z'}]};}});
  sceneObjDefine({id:'street.rph-platform-fence',category:'street',size:[280,76],real:{h:1.15,l:4.24,w:.12},variants:1,seasonal:false,flippable:true,
    palette:{base:{}},parts:['body'],tags:['uk','reepham','fence','unlit','kit:temperate','role:street'],build(){const B=[];
      for(const x of [-135,-44,49,132])B.push({f:'#eee6d1',d:`M${x} 0v-72l5-4 5 4V0z`},{f:'#c1bca9',d:rect(x+7,-69,3,69)});
      for(const y of [-54,-25])B.push({f:'#9c4f43',d:rect(-135,y,277,7)},{f:'#bb7861',d:rect(-135,y,277,2)});
      return {body:B};}});
  sceneObjDefine({id:'structure.rph-brick-wall',category:'structure',size:[360,60],real:{h:.75,l:4.5,w:.35},variants:2,seasonal:false,flippable:true,
    palette:{base:{}},parts:['body'],tags:['uk','reepham','wall','unlit','kit:temperate','role:street'],build(v,r){
      const B=[{f:v?'#9b8d7c':'#9d6650',d:rect(-178,-51,354,51)},
        {f:v?'#d5ccba':'#c39571',d:'M-181-51l4-9 351 1 5 9z'},
        {f:'#725946',d:rect(-178,-4,354,4)}];
      for(let i=0;i<45;i++)B.push({f:v?'#c1b59e':['#b48667','#bd9775','#825a49'][i%3],op:.65,d:rect(-170+r()*338,-47+r()*40,5+r()*13,2+r()*3),detail:true});
      for(let y=-42;y<-5;y+=12)B.push({s:'#cead88',w:.9,op:.5,d:`M-177 ${y}h351`});return {body:B};}});
  sceneObjDefine({id:'structure.rph-platform-edge',category:'structure',size:[360,66],real:{h:.55,l:3,w:.2},variants:2,seasonal:false,flippable:true,
    palette:{base:{}},parts:['body'],tags:['uk','reepham','wall','unlit','kit:temperate','role:street','class:street'],build(v,r){
      const B=[{f:'#675647',d:rect(-175,-57,350,57)},{f:'#b5b3a2',d:'M-181-58l8-8h342l12 8v8h-362z'},
        {f:'#e4dcc4',d:rect(-177,-58,352,4)}];
      for(let i=0;i<32;i++)B.push({f:['#92806a','#786958','#b0a18b'][i%3],d:rect(-169+r()*328,-49+r()*41,4+r()*11,3),detail:true});return {body:B};}});
  sceneObjDefine({id:'building.rph-market-side',category:'building',size:[165,260],real:{h:10,l:6.35,w:6},variants:2,seasonal:false,flippable:true,
    palette:{base:{}},parts:['body'],night:{glow:{window:'#ffdc9e'},on:.8},tags:['uk','reepham','kit:urban','role:building-mid'],build(v,r){
      const B=[{f:v?'#d9d4c5':'#aa7057',d:rect(-80,-232,155,232)},{f:'#555951',d:'M-84-232l28-27H53l26 27z'}];
      if(!v)courses(B,-77,-229,149,224,r,false);
      for(const [x,y,w,h]of [[-62,-207,32,43],[18,-205,33,44],[-60,-144,34,48],[20,-144,30,49],[-58,-75,46,55],[18,-74,41,54]])pane(B,x,y,w,h,false);
      B.push({f:'#493f3d',d:rect(-79,-90,155,11)},{f:'#d3bda0',d:rect(-80,-3,155,3)},{f:'#8e745a',d:rect(-57,-265,13,31)},
        {s:'#e0ccaa',w:2,d:'M-79-160H74M-79-224H74'});return {body:B};}});
  sceneObjDefine({id:'street.rph-rail-lantern',category:'street',size:[85,154],real:{h:1.2,l:.66,w:.45},variants:1,seasonal:false,flippable:false,
    palette:{base:{}},parts:['body'],night:{glow:{window:'#d77454'},on:1},tags:['uk','reepham','kit:temperate','role:street'],build(){
      const B=[{f:'#394846',d:rect(-10,-59,20,59)},{f:'#dddccb',d:'M-34-65v-57q0-12 13-12h45q13 0 13 12v57z'},
        {f:'#a5b2a9',d:rect(28,-122,9,54)},{f:'#e8e6d5',d:'M-39-124q39-14 80 0v6h-80z'},
        {f:'#f4ebd5',d:rect(-22,-145,47,14)},{f:'#bcc6b8',d:'M-26-145q26-16 54 0v4h-54z'},
        {s:'#c3cbbd',w:3,d:'M-34-98v-44q36-25 71 0v44'},
        {f:'#263b3b',d:ell(0,-102,21,21)},{f:'#923d30',d:ell(0,-102,15,15),glow:'window'},
        {f:'#d6a176',d:'M-11-107q3-10 13-8l-6 6z'},
        {f:'#677e71',d:rect(-38,-71,79,8)},{f:'#ecdfc5',d:rect(-37,-71,78,3)}];
      for(const x of [-15,-5,5,15])B.push({f:'#5c7065',d:rect(x,-143,4,8)});return {body:B};}});
  function pane(B,x,y,w,h,arched) {
    const d=arched?`M${x} ${y+h}V${y+h*.3}Q${x+w/2} ${y-h*.32} ${x+w} ${y+h*.3}V${y+h}z`:rect(x,y,w,h);
    B.push({f:'#efe7d5',d},{f:'#526772',d:rect(x+3,y+8,w-6,h-11),glow:'window'},
      {s:'#e7dfcf',w:1.7,d:`M${x+w/2} ${y+7}v${h-9}M${x+3} ${y+h*.56}h${w-6}`},
      {f:'#c9b89d',d:rect(x-2,y+h,w+4,3)});
  }
  function courses(B,x,y,w,h,r,stone) {
    // Irregular flint/chipped brick patches, kept inside the actual wall.
    for(let i=0;i<(stone?100:65);i++){
      const px=x+4+r()*(w-10),py=y+4+r()*(h-10),ww=stone?2+r()*4:4+r()*7,hh=stone?2+r()*3:2+r();
      B.push({f:stone?['#8c8d84','#c0bbaa','#666b69','#a7a89a'][i%4]:['#b48065','#c89775','#9b6551'][i%3],
        op:.58,d:stone?`M${r1(px)} ${r1(py)}l${r1(ww)} -1 1 ${r1(hh)} -${r1(ww)} 1z`:rect(px,py,ww,hh),detail:true});
    }
  }
  function tiles(B,x,y,w,h,r,col) {
    for(let i=0;i<45;i++) {const px=x+r()*w,py=y+r()*h;B.push({s:col,w:.7,op:.45,d:`M${r1(px)} ${r1(py)}l${r1(3+r()*6)} -.8`,detail:true});}
  }
  function def(id,size,real,build) {
    sceneObjDefine({id:(id==='whitwell'?'rail.rph-':'landmark.rph-')+id,category:id==='whitwell'?'rail':'landmark',size,real,variants:1,seasonal:false,flippable:false,
      parts:['body','lit'],palette:{base:{}},night:{glow:{window:'#ffd79b'},on:.8},
      tags:['uk','reepham','landmark','place:uk-east/reepham','kit:temperate',id==='whitwell'?'role:vehicle':'role:landmark'].concat(id==='whitwell'?['class:train']:[]),build});
  }
  def('market',[660,310],{h:10,l:22,w:6},function(v,r){
    const B=[];
    // West frontage: brick house, the distinctive stepped gable, white shop.
    B.push({f:'#ac7056',d:rect(-326,-229,198,229)},{f:'#7c5246',d:'M-326-229l36-55h177l-15 55z'},
      {f:'#c99371',d:rect(-323,-220,191,216)});
    courses(B,-323,-219,190,212,r,false);tiles(B,-290,-280,160,40,r,'#d0a68b');
    for(const x of [-291,-219,-153])pane(B,x,-179,30,53,false);
    pane(B,-283,-90,44,66,false);pane(B,-172,-90,33,64,false);
    B.push({f:'#3b4246',d:rect(-223,-87,31,87)},{f:'#d8c7af',d:rect(-223,-91,31,5)},
      {f:'#95705d',d:rect(-305,-299,17,35)},{f:'#d4b293',d:rect(-309,-302,25,5)});
    // The butcher frontage has a Dutch stepped gable, not a triangular roof.
    B.push({f:'#b87859',d:'M-124 0V-231h23v-23h22v-24h22v-19h21v-12h22v12h21v19h22v24h22v23h23V0z'});
    courses(B,-120,-225,187,222,r,false);
    B.push({f:'#e1c5a1',d:'M-126-229h25v-24h22v-24h22v-19h21v-12h22v12h21v19h22v24h22v24h25v5H43v-24H21v-24H-1v-19H-19v-12H-32v12H-53v19H-75v24H-97v24H-126z'});
    pane(B,-55,-270,51,49,true);pane(B,-64,-188,72,70,false);
    B.push({f:'#714349',d:'M-125-102H70l17 30h-226z'},{f:'#a35858',d:'M-125-102H70v5h-195z'},
      {f:'#523e40',d:rect(-126,-72,202,11)});
    for(const x of [-111,-77,5,39])pane(B,x,-59,28,44,false);
    B.push({f:'#303b3c',d:rect(-39,-60,30,60)},{f:'#c5ae88',d:rect(-39,-62,30,4)},
      {f:'#b17b5e',d:rect(-126,-11,202,11)},{f:'#a37257',d:rect(-83,-300,14,32)});
    // White shop: irregular sash widths, steep dark roof and two dormers.
    B.push({f:'#dedbd0',d:rect(77,-220,246,220)},{f:'#f2eee1',d:rect(81,-213,236,204)},
      {f:'#41484b',d:'M77-220l35-67h173l38 67z'},{f:'#696b65',d:'M110-286h174l4 5H107z'});
    tiles(B,112,-280,171,47,r,'#8c8b80');
    for(const x of [139,238]){B.push({f:'#e3ded0',d:`M${x}-228v-33l17-17 18 17v33z`});pane(B,x+6,-254,22,26,false);}
    for(const x of [104,174,253])pane(B,x,-174,37,54,false);
    for(const x of [100,153,250])pane(B,x,-87,45,65,false);
    B.push({f:'#434f52',d:rect(208,-82,29,82)},{f:'#344247',d:rect(82,-109,233,14)},
      {f:'#c8beb0',d:rect(80,-9,242,9)},{f:'#af9179',d:rect(286,-306,14,46)},
      {s:'#c8baa3',w:2,d:'M80-217H319M-320-210H-134M-120-117H69'});
    return {body:B,lit:[]};
  });
  def('churches',[750,460],{h:23,l:37.5,w:14},function(v,r){
    const B=[];
    // St Michael on the left: shorter tower and tall corner pinnacles.
    B.push({f:'#888c80',d:rect(-337,-333,106,333)},{f:'#a7aaa0',d:rect(-335,-330,73,327)});
    courses(B,-334,-325,100,317,r,true);
    for(const x of [-336,-315,-288,-260,-236])B.push({f:'#c2c2ae',d:rect(x,-350,13,19)});
    for(const x of [-335,-238])B.push({f:'#c9c6b1',d:`M${x}-350l6-31 6 31v18h-12z`});
    pane(B,-316,-303,25,49,true);pane(B,-283,-303,25,49,true);
    B.push({f:'#787569',d:'M-370 0V-180l92-75 99 75V0z'},
      {f:'#9f6e50',d:'M-380-180l102-85 110 85h-22l-88-64-85 64z'});
    courses(B,-365,-176,181,170,r,true);pane(B,-310,-165,57,111,true);
    // St Mary: broad square tower with battlements, no spire or pinnacles.
    B.push({f:'#777b72',d:rect(-102,-420,132,420)},{f:'#a5a694',d:rect(-99,-418,105,416)});
    courses(B,-98,-412,119,403,r,true);
    for(const x of [-105,-78,-51,-24,3,23])B.push({f:'#c3bea7',d:rect(x,-438,14,20)});
    for(const x of [-104,17])for(let y=-413;y<-10;y+=20)B.push({f:'#cec5ab',d:rect(x,y,12,17)});
    B.push({f:'#c9c2aa',d:rect(-106,-341,138,6)},{f:'#c9c2aa',d:rect(-106,-221,138,5)});
    pane(B,-78,-396,30,66,true);pane(B,-40,-396,30,66,true);pane(B,-61,-195,40,79,true);
    // Long flint nave to the right, with a clearly pitched dark slate roof.
    B.push({f:'#929487',d:'M30 0V-197l284-24 62 28V0z'},
      {f:'#4f585a',d:'M17-200l43-69 265-22 60 99-69-29z'},
      {f:'#737a76',d:'M60-269l264-22 4 5-267 24z'});
    courses(B,36,-190,330,187,r,true); // Irregular flint texture follows the wall plane.
    // One batch path rather than hundreds of repeated roof shapes.
    let roof='';for(let i=0;i<50;i++){const x=70+r()*248,y=-254+r()*28;roof+=`M${r1(x)} ${r1(y)}l6 -.5`;}
    B.push({s:'#a2a59a',w:.8,op:.48,d:roof,detail:true});
    for(const x of [60,124,191,267]){pane(B,x,-170,42,112,true);B.push({s:'#d6cbb1',w:2,d:`M${x+13}-153v86M${x+29}-153v86`});}
    B.push({f:'#aaa58f',d:'M111 0V-63l37-41 39 40V0z'},{f:'#505e60',d:'M103-63l45-49 49 49h-12l-37-35-31 35z'},
      {f:'#534e48',d:'M134 0v-49q14-27 29 0V0z'},{f:'#c9c0a7',d:rect(34,-9,336,9)});
    return {body:B,lit:[]};
  });
  def('station',[610,230],{h:8,l:21.2,w:6},function(v,r){
    const B=[];
    // Former station: buff-brick gabled block with a low attached range.
    B.push({f:'#b9a77e',d:'M-300 0V-173l69-53 70 53V0z'},
      {f:'#d2c095',d:'M-161 0V-173l155 24V0z'},
      {f:'#727c7a',d:'M-310-173l79-57 145 22 86 59-161-22-70-50z'});
    courses(B,-294,-168,130,163,r,false);courses(B,-156,-143,145,137,r,false);
    pane(B,-247,-171,33,49,true);pane(B,-282,-87,31,64,true);pane(B,-215,-86,34,64,true);
    for(const x of [-140,-86,-37])pane(B,x,-109,31,64,true);
    B.push({f:'#a49170',d:rect(-267,-229,16,29)},{f:'#dfcc9f',d:rect(-271,-232,24,5)},
      {f:'#654e40',d:rect(-143,-50,21,50)},
      {f:'#aa795d',d:'M-7 0V-94l271-12 36 106z'},
      {f:'#626c69',d:'M-20-94l31-32 256-5 40 31-48-6z'});
    courses(B,1,-88,258,81,r,false);tiles(B,16,-121,240,20,r,'#adb0a0');
    for(const x of [25,76,130,195,251])pane(B,x,-72,26,49,false);
    B.push({f:'#423f38',d:rect(161,-63,22,63)},{f:'#d2ba8e',d:rect(-296,-11,590,11)},
      {s:'#e3ce9f',w:2,d:'M-299-96H-163M-157-132L-7-111M-6-79L264-88'});
    return {body:B,lit:[]};
  });
  def('whitwell',[200,210],{h:3.5,l:12,w:2.4},function(v,r){
    const B=[];
    // A three-quarter END view: wheelsets span the gauge, vehicles recede
    // along the siding. They must not be drawn broadside across the rails.
    B.push({f:'#354e47',d:'M20-37V-189l56-13 40 18v135z'},
      {f:'#627a69',d:'M20-37V-189l56-13v152z'},
      {f:'#263c38',d:'M76-202l40 18v135l-40-1z'},
      {f:'#424c4b',d:'M14-189q33-28 64-17l45 18-7 5-40-16q-32-1-54 15z'});
    pane(B,32,-179,17,27,false);pane(B,56,-184,15,27,false);pane(B,82,-178,12,27,false);pane(B,99,-172,10,24,false);
    B.push({f:'#1c292b',d:'M15-37l99-15v8l-99 14z'},
      {f:'#263436',d:ell(29,-29,8,10)},{f:'#263436',d:ell(103,-45,7,9)});
    for(let i=0;i<24;i++)B.push({s:'#9b9d82',w:.7,op:.45,d:`M${r1(24+r()*45)} ${r1(-50-r()*126)}l2 -1`,detail:true});
    // Rounded tank, circular near end and elliptical distant end.
    B.push({f:'#45514d',d:'M-51-71Q-52-132-4-143l65-23q34 5 34 47l-48 71z'},
      {f:'#647069',d:'M-44-107q8-25 34-29l73-22q17 5 21 16l-75 29z'},
      {f:'#273537',d:ell(0,-69,53,51)},{f:'#43514c',d:ell(-5,-75,45,43)},
      {f:'#626c60',d:'M-40-91q15-28 43-24l25 11q-34-9-61 22z'},
      {s:'#7d8476',w:2,d:'M-33-108q-15 32 0 64M53-140q-4 27 15 39'},
      {f:'#939983',d:'M11-141l27-11 18 4-28 11z'},{f:'#303c3c',d:'M18-145l17-6v-9l-17 7z'},
      {f:'#333e3d',d:'M-60-26l81-4 73-66v10L26-16h-86z'});
    // Near wheels contact the rail head at y=0; buffers and coupling above it.
    for(const x of [-39,39])B.push({f:'#202b2c',d:ell(x,-10,10,10)},{f:'#737e78',d:ell(x,-10,4,4)});
    B.push({f:'#313e3f',d:rect(-56,-23,112,10)},
      {f:'#788079',d:ell(-42,-25,9,5)},{f:'#788079',d:ell(42,-25,9,5)},
      {s:'#293133',w:4,d:'M0-15v11q8 9 10 0'});
    for(let i=0;i<35;i++){const x=-31+r()*58,y=-99+r()*65;B.push({f:'#92998a',op:.24,d:rect(x,y,1+r()*2,1),detail:true});}
    return {body:B,lit:[]};
  });
})();
