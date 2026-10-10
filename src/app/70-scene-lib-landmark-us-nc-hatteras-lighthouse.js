/* Cape Hatteras's tapered spiral daymark, red masonry foot and keeper house.
   The spiral follows the taper; the lantern is a glazed structure above it. */
(function(){const D=sceneD,R=n=>Math.round(n*10)/10;
  sceneObjDefine({id:'landmark.us-nc-hatteras-lighthouse',category:'landmark',weight:0,size:[450,552],box:[-125,-580,345,15],variants:1,seasonal:false,flippable:false,parts:['body','lit'],palette:{base:{wall:['#e3e3ce','#b3bdb2','#829698'],ink:['#283d43','#4e6266'],brick:['#a55b3e','#d68b5f','#754a3b'],roof:['#754a3d','#a26c4c'],glass:'#668d93'}},night:{glow:{window:'#ffdc99',lamp:'#f4dca5'},on:1},shadow:{rx:79,ry:10,h:490},reflect:true,tags:['landmark','place:us/state:NC','us','hatteras','lighthouse'],
    build(){const body=[],lit=[],P=(f,d,op)=>body.push({f,d,op}),S=(s,w,d,op)=>body.push({s,w,d,op,cap:'round'});
      P('@brick.2','M-100 0l-9-53 25-25H69l32 23-8 55z');P('@brick.0','M-100 0l-9-53 25-25h107v78z');P('@brick.1','M-109-53l25-25h107v13l-126 21z');
      for(let j=0;j<6;j++)for(let i=0;i<10;i++){const x=-96+i*17+(j%2)*5,y=-61+j*10;S('@brick.1',.8,`M${x} ${y}h13m-4 0v8`,.65);}
      P('@wall.0','M-69-75L-36-466H37L73-75z');P('@wall.1','M19-466h18L73-75H37z');P('@wall.2','M56-75L29-466h8L73-75z',.7);
      const left=y=>-36-(y+466)*33/391,right=y=>37+(y+466)*36/391;
      for(const y of [-453,-327,-201]){const y1=y+70,y2=y+114,y3=y+42;P('@ink.0',`M${R(left(y))} ${y}C${R(left(y)+9)} ${y+17} ${R(right(y1)-32)} ${y+38} ${R(right(y1))} ${y1}L${R(right(y2))} ${y2}C${R(right(y2)-8)} ${y+90} ${R(left(y3)+29)} ${y+75} ${R(left(y3))} ${y3}z`);S('@ink.1',1.5,`M${R(left(y)+3)} ${y+3}Q0 ${y+28} ${R(right(y1)-3)} ${y1+4}`,.7);}
      for(let i=0;i<5;i++){const y=-420+i*68;P('@wall.2',D.rect(-7,y,15,24,3));P('@ink.0',D.rect(-4,y+3,9,18,2));body.push({f:'@glass',d:D.rect(-2,y+5,5,12,1),glow:'window'});S('@wall.0',1.3,`M-8 ${y+26}H9`,.8);}
      P('@wall.0',D.rect(-41,-478,82,13));P('@ink.0','M-48-479l7-13h82l8 13z');P('@ink.1',D.rect(-37,-529,74,39));
      for(let i=0;i<7;i++){const x=-34+i*10;body.push({f:'@glass',d:D.rect(x,-526,8,30),glow:'window'});S('@ink.0',2.3,`M${x-1} -529v38`);}
      P('@ink.0','M-44-529l9-12 34-13 35 13 10 12z');S('@wall.1',1.7,'M-34-541l33-11 33 11',.8);P('@ink.0',D.rect(-2,-556,4,7));
      S('@ink.0',3,'M-54-484H55M-54-472H55');for(let i=0;i<12;i++)S('@ink.0',1.7,`M${-52+i*9.5} -486v17`);
      P('@brick.2',D.rect(-20,-43,39,43,12));P('@ink.0',D.rect(-15,-38,29,38,9));P('@brick.1','M-25 0h49v6h-49z');
      // A low keeper house preserves the original landmark's scale cue.
      P('@wall.1','M126 0v-81l115-15 82 27v69z');P('@wall.0','M126-81l115-15v96H126z');P('@wall.2','M241-96l82 27v69h-82z');P('@wall.0','M126-81L188-130 241-96v15z');P('@roof.0','M188-143L251-100 336-71 268-112z');P('@roof.0','M110-82l78-61 63 43 85 29-15 6-81-23-53-40-63 49z');P('@roof.1','M110-82l78-61 63 43-12 7-52-37-64 52z');
      for(let i=0;i<8;i++)S('@roof.1',1,`M${145+i*14} ${R(-105-Math.min(i,4)*7)}l18 15`,.5);
      for(const x of [143,180,216,263,297]){P('@ink.0',D.rect(x,-66,21,30));P('@wall.0',D.rect(x+1,-65,19,27));body.push({f:'@glass',d:D.rect(x+3,-63,15,22),glow:'window'});S('@ink.1',1,`M${x+10} -63v22M${x+3} -52h15`);}
      S('@wall.0',2,'M127-10H321M242-94v89');P('@ink.0',D.rect(178,-35,25,35));P('@roof.1',D.rect(181,-31,19,31));
      lit.push({f:{rad:[[0,'#f8ddb4',.4],[1,'#eacb8a',0]],cx:0,cy:-505,r:110},d:D.ell(0,-505,110,70)},{f:{lin:[[0,'#d3e2d4',.22],[1,'#adc7c7',0]],x1:5,y1:-270,x2:140,y2:-270},d:'M-36-466H37L73-75H-69z'},{s:'#c3d4d0',w:1.8,op:.68,d:'M-36-466L-69-75M-100 0l-9-53 25-25M-44-529l9-12 34-13'});
      return{body,lit};}
  });
  sceneObjDefine({id:'plant.us-sea-oats',category:'plant',weight:0,size:[100,115],variants:3,seasonal:true,shapeBySeason:true,flippable:true,parts:['body','tips'],palette:{base:{stem:['#7a7e4e','#c5b979'],seed:['#b19b5e','#dac586']},spring:{stem:['#63814c','#a3b667']},summer:{stem:['#6f844b','#b7b16b']},autumn:{stem:['#93814c','#c8b47d'],seed:['#9f7843','#c6a665']},winter:{stem:['#8a8d73','#b8baa0'],seed:['#b4b59b','#d3d4c0']}},anim:{sway:{part:'tips',pivot:[0,-45],deg:2,period:6.9}},tags:['kit:temperate','role:edge','us','dune','sea-oats'],build(v,rnd){const body=[],tips=[];let grass='';for(let i=0;i<13;i++){const x=(rnd()-.5)*45,h=25+rnd()*45;grass+=`M${R(x)} 0Q${R(x-6)} ${R(-h*.65)} ${R(x+(rnd()-.5)*55)} ${R(-h)}`;}body.push({s:'@stem.0',w:1.5,d:grass,op:.9});for(let i=0;i<6;i++){const x=-20+i*8,h=70+rnd()*35,lean=(v-1)*9+rnd()*13;tips.push({s:'@stem.1',w:1.5,d:`M${x} -30Q${R(x+lean)} ${R(-h*.7)} ${R(x+lean+8)} ${R(-h)}`});for(let j=0;j<4;j++){const y=-h+5+j*6,xx=x+lean+7-j*1.2;tips.push({detail:j>0,f:j%2?'@seed.1':'@seed.0',d:D.poly([[xx,y],[xx-8,y-5],[xx-10,y-1],[xx-5,y+3],[xx,y+2]])});}}return{body,tips};}});
  sceneObjDefine({id:'ground.us-dune-grain',category:'ground',weight:0,size:[104,16],variants:2,seasonal:false,flippable:true,parts:['body'],palette:{base:{grain:['#d4c49a','#a3946c','#eee1bb']}},tags:['kit:temperate','role:ground','us','sand'],build(v,rnd){let grit='',ripple='';for(let i=0;i<15;i++){const x=(rnd()-.5)*100,y=(rnd()-.5)*10;grit+=D.poly([[x,y],[x+2,y-1],[x+3,y+1],[x+1,y+2]]);}for(let i=0;i<3;i++)ripple+=`M${-44+i*18} ${-2+i*4}q${17+v*4}-4 ${35+v*3}-1`;return{body:[{f:'@grain.1',d:grit,op:.6},{s:'@grain.0',w:1.2,op:.6,d:ripple},{s:'@grain.2',w:.8,op:.5,d:'M-28-4q16-3 28-1M8 4q13-4 26-2'}]};}});
})();
