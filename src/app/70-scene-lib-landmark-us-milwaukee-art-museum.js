/* Native Milwaukee Art Museum: two separately raised brise-soleil
   wings and the low arched glass hall. Explicit placement only. */
(function(){
 const D=sceneD,F=n=>Math.round(n*10)/10;
 sceneObjDefine({
  id:'landmark.us-milwaukee-art-museum',category:'landmark',weight:0,
  size:[880,380],box:[-442,-382,442,14],variants:1,seasonal:false,
  shapeBySeason:false,flippable:false,parts:['body','lit'],
  palette:{base:{metal:['#e5eee7','#8daab6','#3d5d72'],glass:['#40768b','#96bdc9','#23485f'],stone:['#d2d9d1','#93a8a9','#54717d'],white:'#f0f3e9'},spring:{},summer:{},autumn:{},winter:{stone:['#dce7e0','#adc3c7','#7896a5']}},
  night:{glow:{window:'#ffe3ac',lamp:'#dce7d6'},on:.8},
  shadow:{rx:325,ry:9,h:380},reflect:true,
  tags:['landmark','signature','place:us/place:milwaukee','us','us-midwest'],
  build(){
   const body=[],lit=[];
   const P=(f,d,op,detail)=>body.push({f,d,op,detail});
   const S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'});
   // The curved hall stays below the wing hinges: light roof rim,
   // shaded left glass and a narrower lit right facet.
   P('@stone.2','M-159 1Q-161-92-77-119L0-145L77-119Q161-92 159 1Z');
   P('@metal.0','M-156 0Q-155-86-73-113L0-137L73-113Q155-86 156 0L140 1Q139-76 65-99L0-122L-65-99Q-139-76-140 1Z');
   P('@glass.2','M-139 0Q-138-75-65-99L0-122L65-99Q138-75 139 0Z');
   P('@glass.0','M-138-1Q-136-74-65-98L-4-119V-1Z');
   P('@glass.1','M4-119L63-98Q136-74 138-1H4Z',.74);
   for(let i=0;i<13;i++){
    const x=-125+i*20.8,roof=-117+Math.abs(x)*.4;
    S('@metal.1',2.1,'M'+F(x)+' -1Q'+F(x*.87)+' '+F(roof*.52)+' '+F(x*.65)+' '+F(roof),.92);
    body.push({f:'@glass.1',d:D.rect(x-3,-19,6,11),glow:'window',detail:true});
   }
   S('@metal.0',2.3,'M-141-33Q-70-41 0-42T141-33',.85);
   P('@metal.1',D.rect(-174,1,348,9));P('@metal.0',D.rect(-182,0,364,3));
   // Each wing has its OWN outward-rising spine and rib attachments.
   // The empty V between the two upper fans is part of the identity.
   for(const sg of [-1,1]){
    const lower=[],upper=[];
    for(let i=0;i<=34;i++){
     const t=i/34,sx=sg*(20+382*t),sy=-142-68*t+9*t*t;
     const len=51+162*Math.sin(Math.PI*(.1+.9*t))*(1-.12*t);
     const ex=sx+sg*(48*(1-t)+13),ey=sy-len;
     lower.push([F(sx),F(sy)]);upper.push([F(ex),F(ey)]);
     P('@metal.0',D.poly([[F(sx-sg*2.7),F(sy)],[F(ex-sg*2.4),F(ey)],[F(ex+sg*2.5),F(ey+2.4)],[F(sx+sg*2.7),F(sy+1.8)]]));
     P('@metal.2',D.poly([[F(sx-sg*2.7),F(sy)],[F(ex-sg*2.4),F(ey)],[F(ex-sg*.5),F(ey+1.5)],[F(sx-sg*.6),F(sy+.8)]]),.78,true);
     if(i%4===1)lit.push({s:'#bed4df',w:2.2,op:sg<0?.47:.62,d:'M'+F(sx)+' '+F(sy)+'L'+F(ex)+' '+F(ey)});
    }
    S('@metal.2',4.5,'M'+lower.map(p=>p.join(' ')).join('L'),.95);
    S('@metal.1',1.5,'M'+upper.map(p=>p.join(' ')).join('L'),.8,true);
    P('@metal.1',D.poly([[sg*16,-130],[sg*18,-147],[sg*31,-149],[sg*33,-134]]));
    P('@metal.0',D.poly([[sg*15,-131],[sg*18,-147],[sg*24,-148],[sg*22,-133]]));
    lit.push({s:'#aac4d4',w:2,op:.45,d:'M'+lower.map(p=>p.join(' ')).join('L')});
   }
   lit.push({s:'#c8dee2',w:2.5,op:.62,d:'M-156 0Q-155-86-73-113L0-137L73-113Q155-86 156 0'});
   for(let i=0;i<9;i++)lit.push({f:'#e4d3ae',d:D.rect(-160+i*39,4,12,1.8),op:.55});
   return{body,lit};
  }
 });
})();
/* Private shore birch: a left-leaning high fork and longer lower bough
   make this right frame different from the lake-birch silhouette. */
(function(){const D=sceneD;sceneObjDefine({
 id:'tree.us-milwaukee-shore-birch',category:'tree',weight:0,size:[246,365],
 variants:1,seasonal:true,shapeBySeason:true,flippable:false,parts:['body','crown'],
 palette:{base:{bark:['#758d7b','#364f49','#203d3d'],leaf:['#183b32','#2a4b3b','#46654a']},spring:{leaf:['#244b35','#3d6141','#658454']},summer:{leaf:['#183b32','#2b4c39','#48694a']},autumn:{leaf:['#3a4631','#586139','#7d7d47']},winter:{bark:['#698278','#314f4e','#203c42']}},
 shadow:{rx:43,ry:5,h:315},reflect:true,
 anim:{sway:{part:'crown',pivot:[0,-125],deg:.8,period:8.6}},
 tags:['us','paper-birch','shore-shade','kit:temperate','role:tree'],build(v,r,ctx){
 const body=[{f:'@bark.1',d:'M-9 0L-6-129-37-220-34-304-27-328-26-221 9-133 12 0Z'},
 {f:'@bark.0',d:'M-7 0L-4-129-33-221-31-304-28-321-29-220 6-133 5 0Z'},
 {s:'@bark.2',w:3.2,d:'M-15-165L-74-218-98-269M-31-255L-64-297-67-323M-29-279L7-314 20-331M-2-147L45-214 51-280M-7-169L-63-177-104-203M41-212L73-235'},
 {s:'@bark.0',w:1.5,op:.6,d:'M-15-166L-74-218-98-269M-31-255L-64-297M-2-147L45-214 51-280'}],crown=[];
 if(ctx.season!=='winter')crown.push(
 {f:'@leaf.0',d:'M-62-116C-115-137-126-172-102-198Q-134-226-102-254Q-109-287-72-306Q-66-349-27-342Q14-359 30-326Q62-334 80-300Q101-273 81-245Q95-212 61-200Q80-170 49-146Q28-111-10-124Z'},
 {f:'@leaf.1',d:'M-94-169Q-117-194-88-219Q-104-249-73-268Q-74-306-44-313Q-34-339-5-319Q24-327 36-295Q64-296 63-265Q81-244 56-222Q68-193 39-176Q21-144-18-154Z'},
 {f:'@leaf.2',op:.57,d:'M-77-254Q-92-278-68-301Q-60-326-34-330Q-44-300-36-278Q-49-255-77-254Z'},
 {f:'@leaf.2',op:.26,d:'M-103-198Q-124-225-99-244Q-99-216-76-209Q-65-187-78-165Z'});
 for(let i=0;i<13;i++){const y=-22-i*19,x=-4-Math.max(0,i-6)*3;
 body.push({s:'@bark.2',w:1.1,op:.7,detail:true,d:'M'+x+' '+y+'l7-2'});}
 if(ctx.season==='winter')body.push({s:'@bark.0',w:1.3,op:.65,d:'M-98-269l-17-19m17 19l9-26M-67-323l-13-18m13 18l15-21M20-331l-1-24m1 24l19-11M51-280l16-19m-16 19l-8-26M-104-203l-21-13'});
 return{body,crown};}});})();

/* The museum's paved peninsula has a visible retaining face at the lake.
   Radial joints recede toward the entrance rather than floating on water. */
(function(){
 sceneObjDefine({
  id:'ground.us-milwaukee-quay',category:'ground',weight:0,
  size:[1540,215],box:[-961,-193,581,30],variants:1,seasonal:true,
  shapeBySeason:false,flippable:false,parts:['body','lit'],
  palette:{base:{paving:['#c4b79b','#9c9989','#647c7d'],rim:['#b9c2b7','#718b8e','#42636f']},spring:{},summer:{},autumn:{},winter:{paving:['#cad7d2','#abbfba','#769799'],rim:['#c1d0ca','#94b2b4','#567e8b']}},
  shadow:false,reflect:true,
  tags:['ground','place:us/place:milwaukee','us','us-midwest'],
  build(){
   const body=[
    {f:'@rim.2',d:'M579-39Q116 11-960-15V3Q116 29 579-21Z'},
    {f:'@rim.1',d:'M579-39Q116 11-960-15V-8Q116 18 579-32Z'},
    {f:'@paving.0',d:'M-960-180Q-440-191-19-171T434-147L579-39Q116 11-960-15Z'},
    {f:'@paving.1',op:.38,d:'M-960-180Q-440-191-19-171L38-160Q-401-169-960-155Z'},
    {s:'@rim.0',w:3.4,d:'M-960-15Q116 11 579-39'},
    {s:'@paving.2',w:1.3,op:.35,d:'M-705-176L-803-11M-495-177L-570-6M-280-175L-335-5M-69-172L-104-6M146-164L142-10M359-152L376-21'},
    {s:'@paving.2',w:1.2,op:.3,d:'M-960-101Q-409-113 492-116M-960-56Q-386-60 539-70'},
    {s:'@rim.2',w:1.4,op:.65,d:'M-710-8V11M-455-3V15M-196-3V15M61-7V10M311-17V1M536-34V-16'}
   ];
   return {body,lit:[{s:'#a6c2c9',w:1.5,op:.36,d:'M-960-15Q116 11 579-39'}]};
  }
 });
})();
