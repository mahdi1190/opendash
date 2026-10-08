/* A wind pump, low adobe blocks and the small life of the dry country.
   Generic structures without signs, brands or people. Ground anchors at 0,0. */
(function(){
  if(typeof sceneObjDefine!=='function'||typeof sceneDraw==='undefined')return;
  const {define,poly,ell,circ,rect,f1}=sceneDraw;
  define({id:'structure.west-texas-windpump',category:'structure',size:[158,300],variants:1,seasonal:false,flippable:false,parts:['body','rotor'],
    palette:{base:{steel:['#45474a','#92918a','#d3c6ae'],tank:['#8d8b7a','#b8b49a','#686e65']}},night:{glow:{metal:'#526175'},on:1},shadow:{rx:34,ry:5,h:90},
    anim:{spin:{part:'rotor',pivot:[0,-237],period:9.7}},tags:['texas','wind-pump','signature','kit:arid','role:street'],
    credit:'native steel ranch wind pump after the West Texas sunset opening',build(){
      const body=[],rotor=[];
      body.push({s:'@steel.0',w:4,d:'M-31 0L-10 -234M31 0L10 -234M0 0V-237'});
      body.push({s:'@steel.1',w:1.5,d:'M-29 -4L-8 -234M29 -4L8 -234'});
      // Filled slivers carry reflected moonlight; stroke-only glow shapes
      // would turn the rotor's ring into a solid disc in the canvas renderer.
      body.push({f:'@steel.1',d:'M-29 -4L-8 -234L-7 -234L-27.8 -4Z',glow:'metal'},{f:'@steel.1',d:'M29 -4L8 -234L9 -234L30 -4Z',glow:'metal'});
      for(let i=0;i<6;i++){const y=-8-i*35,w=30-i*3.2,ww=w-3.2;body.push({s:'@steel.0',w:2,d:`M${f1(-w)} ${y}L${f1(ww)} ${y-35}M${f1(w)} ${y}L${f1(-ww)} ${y-35}M${f1(-w)} ${y}H${f1(w)}`});body.push({f:'@steel.2',d:circ(-w,y,1.4)+circ(w,y,1.4),detail:true});}
      body.push({s:'@steel.2',w:1.2,d:'M-5 -23V-213M5 -23V-213'});
      for(let y=-28;y>-214;y-=14)body.push({s:'@steel.1',w:1.2,d:`M-5 ${y}H5`,detail:true});
      // The tail is fixed to the head. The fan rotates independently around
      // its real hub; placing a spin on the whole tower would be wrong.
      body.push({s:'@steel.0',w:3,d:'M0 -237H74'});
      body.push({f:'@steel.1',d:'M46 -245L75 -256V-219L46 -229z'},{f:'@steel.2',op:.7,d:'M48 -243L73 -252V-247L48 -237z'});
      body.push({f:'@steel.0',d:rect(-12,-245,24,15)});
      for(let i=0;i<18;i++){const a=i*Math.PI/9,at=(q,rr)=>[Math.cos(q)*rr,Math.sin(q)*rr-237];rotor.push({f:'@steel.1',d:poly([at(a-.015,19),at(a+.11,44),at(a+.25,44),at(a+.13,18)])});rotor.push({f:'@steel.2',op:.8,d:poly([at(a+.1,42),at(a+.12,44),at(a+.25,44),at(a+.22,42)]),glow:'metal'});rotor.push({s:'@steel.0',w:.85,d:`M0 -237L${f1(at(a+.1,44)[0])} ${f1(at(a+.1,44)[1])}`});}
      rotor.push({s:'@steel.0',w:1.5,d:ell(0,-237,45,45)},{s:'@steel.2',w:.9,d:ell(0,-237,18,18)},{f:'@steel.0',d:circ(0,-237,7)},{f:'@steel.2',d:circ(-1,-239,3)});
      // Galvanised stock tank beside the pump, with a recessed dark interior.
      body.push({f:'@tank.2',d:'M36 -11V-34Q65 -44 94 -34V-11Q65 -1 36 -11z'},{f:'@tank.0',d:'M36 -34Q65 -22 94 -34V-11Q65 -1 36 -11z'},{s:'@tank.1',w:2,d:ell(65,-34,29,6)});
      for(let x=41;x<94;x+=7)body.push({s:'@tank.1',w:1,op:.5,d:`M${x} -27v16`,detail:true});
      return{body,rotor};
    }});
  define({id:'building.el-paso-adobe',category:'building',size:[150,96],variants:4,seasonal:false,flippable:true,parts:['body'],
    palette:{base:{wall:['#b6896a','#8b685a','#d1ac86'],roof:['#82675a','#dac3a0'],glass:['#3c525b','#70847b'],trim:'#674e49'}},night:{glow:{window:'#ffd396',lamp:'#ffe5b3'},on:.86},shadow:{rx:56,ry:4,h:35},tags:['texas','adobe','kit:arid','role:building-near'],build(v,r){
      const body=[],w=120+v*7,h=48+v*9,x=-w/2,side=17+v;
      body.push({f:'@wall.0',d:rect(x,-h,w,h)},{f:'@wall.1',d:poly([[x+w,-h],[x+w+side,-h-9],[x+w+side,-5],[x+w,0]])},{f:'@roof.0',d:poly([[x-3,-h],[x+14,-h-10],[x+w+side+3,-h-10],[x+w+2,-h]])},{f:'@roof.1',d:rect(x-3,-h-5,w+6,5)});
      body.push({f:'@wall.2',op:.65,d:rect(x,-h+5,w,3)},{f:'@trim',d:rect(x-2,-9,w+5,3)});
      for(let i=0;i<4;i++){const xx=x+11+i*(w-18)/4,ww=(w-26)/4-8,yy=-h+16;body.push({f:'@trim',d:rect(xx-2,yy-2,ww+4,23)},{f:'@glass.0',d:rect(xx,yy,ww,19),glow:'window'},{f:'@glass.1',op:.5,d:poly([[xx,yy],[xx+ww*.5,yy],[xx,yy+12]])},{s:'@wall.2',w:1.4,d:`M${f1(xx+ww*.5)} ${yy}v19`},{f:'@wall.2',d:rect(xx-3,yy+20,ww+6,2)});}
      body.push({f:'@trim',d:rect(x+w*.44,-24,15,24)},{f:'@glass.0',d:rect(x+w*.44+3,-21,9,7),glow:'window'},{f:'@roof.1',d:rect(x+w*.39,-27,30,3)});
      // Parapet notches, a recessed wall vent and discreet roof equipment.
      body.push({f:'@wall.0',d:rect(x+8,-h-10,25,7)},{f:'@wall.1',d:rect(x+w-25,-h-13,16,10)},{s:'@trim',w:1,op:.6,d:`M${f1(x+w-20)} ${-h+10}h10M${f1(x+w-20)} ${-h+13}h10`,detail:true});
      for(let i=0;i<5;i++){const xx=x+8+r()*(w-20),yy=-5-r()*(h-10);body.push({s:'@wall.2',w:.8,op:.25,d:`M${f1(xx)} ${f1(yy)}h${3+r()*10}`,detail:true});}
      return{body};
    }});
  define({id:'building.desert-courtyard',category:'building',size:[174,80],variants:3,seasonal:false,flippable:true,parts:['body'],palette:{base:{wall:['#bd9a7a','#8f7562','#d6b995'],roof:'#766154',glass:'#3c5054',beam:'#64594b'}},night:{glow:{window:'#ffdb9f'},on:.82},shadow:{rx:62,ry:4,h:31},tags:['texas','adobe','kit:arid','role:building-near'],build(v){
    const body=[],h=44+v*7;
    body.push({f:'@wall.1',d:rect(-82,-h,29,h)},{f:'@wall.0',d:rect(20,-h-6,62,h+6)},{f:'@wall.2',d:rect(-54,-29,75,29)},{f:'@roof',d:rect(-85,-h-4,35,4)+rect(17,-h-10,69,4)},{f:'@wall.1',d:'M-45 0V-17Q-27 -38 -10 -17V0Z'});
    for(const[x,y,w,hh]of[[-75,-h+12,14,20],[29,-h+6,13,19],[49,-h+6,13,19],[67,-h+6,10,19]])body.push({f:'@beam',d:rect(x-2,y-2,w+4,hh+4)},{f:'@glass',d:rect(x,y,w,hh),glow:'window'},{s:'@wall.2',w:1,d:`M${x+w/2} ${y}v${hh}`});
    body.push({s:'@beam',w:2.5,d:'M-49 -3V-35H19V-3'});
    for(let x=-47;x<20;x+=9)body.push({s:'@beam',w:2,d:`M${x} -35l8 -8`});
    body.push({f:'@wall.1',d:rect(-86,-5,171,5)},{s:'@wall.2',w:1.2,d:'M-83 -5H82'});return{body};
  }});
  define({id:'bird.desert-roadrunner',category:'bird',size:[110,53],variants:2,seasonal:false,flippable:true,parts:['legsFar','tail','body','legsNear','head'],palette:{base:{feather:['#4b4238','#917451','#d0ae79'],pale:'#d6c5a1',leg:'#84725c',eye:'#211f27'}},shadow:{rx:31,ry:3,h:18},anim:{walk:{parts:['legsNear','legsFar'],pivot:[0,-14],deg:20,period:.34,bob:1},turn:{part:'head',pivot:[26,-31],deg:9,period:5.3,hold:.8},sway:{part:'tail',pivot:[-19,-28],deg:3,period:2.7}},tags:['texas','roadrunner','kit:arid','role:bird'],build(v){
      const legs=(a)=>[{s:'@leg',w:1.7,d:`M${a} -18l4 12-4 5m4-5 6 5m-6-5 9-1`}];
      return{legsFar:legs(3),tail:[{f:'@feather.0',d:'M-16 -28Q-29 -34 -53 -43L-49 -46Q-26 -39 -12 -32z'},{s:'@feather.2',w:.9,d:'M-48 -43L-19 -30',detail:true}],body:[{f:'@feather.0',d:'M-24 -30Q-21 -42 -5 -42Q10 -41 22 -34Q29 -27 20 -23Q5 -18 -12 -23Q-22 -24 -24 -30z'},{f:'@pale',d:'M-19 -27Q-2 -32 21 -30Q17 -21 -2 -22Q-14 -22 -19 -27z'},{f:'@feather.1',d:'M-17 -37Q0 -43 15 -32Q-5 -28 -17 -37z'},{s:'@feather.2',w:1.5,d:'M-12 -37l8 4M-4 -39l8 5M4 -36l8 5',detail:true}],legsNear:legs(-8),head:[{f:'@feather.0',d:'M15 -32Q22 -36 22 -43L19 -47L24 -46L25 -51L29 -47L33 -50L33 -45Q42 -43 39 -36L52 -32L38 -31Q31 -27 23 -29z'},{f:'@pale',d:'M29 -36Q34 -39 39 -36L49 -32L36 -32z'},{f:'@eye',d:circ(34,-39,1.3)},{f:v?'#a87054':'#9a7455',d:ell(29,-38,3,1.5)}]};
    }});
  define({id:'prop.desert-tumbleweed',category:'prop',size:[68,62],variants:3,seasonal:false,flippable:true,parts:['body'],palette:{base:{twig:['#8f764c','#c2a371','#5f533e']}},shadow:{rx:21,ry:3,h:12},anim:{spin:{part:'body',pivot:[0,-28],period:4.8}},tags:['texas','tumbleweed','kit:arid','role:edge'],build(v,r){const body=[];for(let i=0;i<18;i++){const a=r()*6.283,rad=18+r()*10,x=Math.cos(a)*rad,y=-28+Math.sin(a)*rad;body.push({s:'@twig.'+(i%3),w:1.2,op:.8,d:`M${f1(-x*.8)} ${f1(-28-(y+28)*.8)}Q${f1((r()-.5)*40)} ${f1(-28+(r()-.5)*35)} ${f1(x)} ${f1(y)}`});}body.push({s:'@twig.1',w:1,op:.7,d:ell(0,-28,23,26)});return{body};}});
})();
