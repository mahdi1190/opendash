/* Churchill Downs: two narrow slate pyramids on cream octagonal cupolas,
   a long layered grandstand and the curved rail of the home straight. */
(function(){const D=sceneD,R=n=>Math.round(n*10)/10;
  sceneObjDefine({id:'landmark.us-louisville-twin-spires',category:'landmark',weight:0,size:[790,380],box:[-398,-390,398,18],variants:1,seasonal:false,flippable:false,parts:['body','lit'],palette:{base:{wall:['#e7dfc3','#b9bda7','#8a9c95'],roof:['#344b53','#5f7374','#263d48'],trim:['#f6eed4','#c3b98e'],glass:['#546e73','#93a69c'],brick:'#8d5140'}},night:{glow:{window:'#ffdc97',lamp:'#ffe4b2'},on:1},shadow:{rx:100,ry:7,h:110},tags:['landmark','place:us/place:louisville','us','louisville','twin-spires'],
    build(){const body=[],lit=[],P=(f,d,op)=>body.push({f,d,op}),S=(s,w,d,op)=>body.push({s,w,d,op,cap:'round'});
      P('@wall.2','M-394 0v-109l48-32h692l48 32V0z');P('@wall.0','M-379-4v-105l39-22h680l39 22V-4z');P('@wall.1','M-379-4v-105l39-22v127zM340-131l39 22V-4h-39z');
      P('@roof.2','M-398-109l58-51h680l58 51-19 8-40-31h-678l-39 31z');P('@roof.0','M-398-109l58-51h680l58 51-19 8-44-37h-669l-45 37z');S('@roof.1',3,'M-341-158H340',.8);
      for(let i=0;i<22;i++){const x=-330+i*30.5;P('@wall.2',D.rect(x-2,-111,22,71));P('@glass.0',D.rect(x,-109,18,65));body.push({f:'@glass.1',d:D.rect(x+2,-106,14,35),glow:'window'});S('@trim.1',1.5,`M${x+9} -109v65M${x} -76h18`,.7);P('@trim.0',D.rect(x-4,-111,3,92));}
      P('@roof.1','M-383-40h766v8h-766z');P('@wall.1','M-383-30h766v27h-766z');S('@trim.0',3,'M-382-32H382M-383-3H383');
      for(let i=0;i<32;i++){const x=-370+i*23.8;S('@roof.0',1.5,`M${R(x)} -29v20`,.65);}
      // Broad central entrance, receding arches and a red masonry plinth.
      P('@brick','M-52 0v-63Q0-104 52-63V0z');P('@trim.0','M-42 0v-59Q0-92 42-59V0z');P('@roof.2','M-32 0v-54Q0-80 32-54V0z');P('@glass.0','M-25-5v-46Q0-68 25-46V-5z');S('@trim.1',2,'M0-66V-5M-27-32H27');
      for(const c of [-75,75]){
        P('@wall.1',`M${c-46}-128v-86l20-17h52l20 17v86z`);P('@wall.0',`M${c-46}-214l20-17h52l-7 17v86h-65z`);P('@wall.2',`M${c+26}-231l20 17v86h-27v-86z`);
        P('@trim.0',D.rect(c-49,-218,98,7));P('@trim.1',D.rect(c-47,-139,94,7));
        for(const dx of [-31,-12,8,28]){P('@roof.0',D.rect(c+dx,-204,13,47,5));body.push({f:'@glass.1',d:D.rect(c+dx+2,-201,9,40,4),glow:'window'});S('@trim.0',1.4,`M${c+dx+6} -200v39`);}
        P('@roof.2',`M${c-54}-273l54-107 54 107-27-8H${c-27}z`);P('@roof.0',`M${c-54}-273l54-107v100l-27-1z`);P('@roof.1',`M${c}-380l27 99 27 8z`);
        for(let j=1;j<8;j++){const t=j/8,y=-380+107*t,w=54*t;S('@roof.1',.8,`M${R(c-w)} ${R(y)}Q${c} ${R(y+5)} ${R(c+w)} ${R(y)}`,.6);}
        S('@trim.0',1.3,`M${c-54}-273L${c}-380`,.68);P('@roof.0',D.rect(c-2,-390,4,11));P('@trim.0',D.ell(c,-389,3,3));
        P('@wall.0',D.rect(c-28,-272,56,52));P('@wall.1',D.rect(c+12,-272,16,52));P('@trim.0',D.rect(c-32,-224,64,5));
        for(const dx of [-18,6]){P('@roof.2',D.rect(c+dx,-263,12,31,2));body.push({f:'@glass.1',d:D.rect(c+dx+2,-261,8,27,1),glow:'window'});}
        lit.push({f:{rad:[[0,'#f9d791',.23],[1,'#d7a55e',0]],cx:c,cy:-170,r:85},d:D.ell(c,-170,80,90)},{s:'#d1dbd4',w:1.8,op:.62,d:`M${c-54}-273L${c}-380M${c-46}-214v76`});
      }
      for(const x of [-345,-265,267,347]){S('@roof.0',2.2,`M${x} -2v-48`);body.push({f:'#ded7ba',d:D.rect(x-5,-55,10,7,2),glow:'lamp'});lit.push({f:{rad:[[0,'#ffe6b0',.17],[1,'#ffe6b0',0]],cx:x,cy:-36,r:38},d:D.ell(x,-36,36,40)});}
      lit.push({s:'#d4d9cf',w:2,op:.52,d:'M-398-109l58-51h680l58 51M-382-32H382'});return{body,lit};}
  });
  sceneObjDefine({id:'structure.us-race-rail',category:'structure',weight:0,size:[1500,210],variants:1,seasonal:false,flippable:false,parts:['body'],palette:{base:{rail:['#e4ddc5','#b5bcaa','#536c60']}},tags:['kit:temperate','role:edge','us','racetrack'],build(){const body=[];for(let i=0;i<30;i++){const x=-725+i*50,y=38+Math.pow(x/725,2)*100;body.push({s:'@rail.2',w:3.5,d:`M${x+4} ${R(y-23)}v38`,op:.65},{s:'@rail.0',w:4,d:`M${x} ${R(y-30)}v38`});}body.push({s:'@rail.1',w:5,d:'M-760 119Q0-85 760 119'},{s:'@rail.0',w:4,d:'M-760 110Q0-94 760 110'},{s:'@rail.0',w:2,d:'M-760 93Q0-111 760 93'});return{body};}});
  sceneObjDefine({id:'animal.us-thoroughbred',category:'animal',weight:0,size:[146,92],variants:2,seasonal:false,flippable:true,parts:['tail','legs','body','head'],palette:{base:{coat:['#754331','#3c3d36'],shine:['#a26b4c','#687069'],mane:'#26362f',hoof:'#293b35'}},shadow:{rx:55,ry:4,h:18},anim:{walk:{part:'legs',pivot:[0,-25],deg:7,period:.95},sway:{part:'tail',pivot:[-49,-53],deg:7,period:2.9}},tags:['kit:temperate','role:animal','us','thoroughbred'],build(v){return{tail:[{f:'@mane',d:'M-47-58Q-69-63-70-42L-77-22Q-65-26-62-42Q-58-51-45-49z'}],legs:[{s:'@coat.0',w:7,cap:'round',d:'M-31-37L-27-19-42-3M-40-37L-49-18-53-2M30-38L37-18 29-2M39-38L51-18 61-5'},{s:'@hoof',w:7,cap:'round',d:'M-44-2h6M-56-1h6M27-1h7M59-4l6 1'}],body:[{f:v?'@coat.1':'@coat.0',d:'M-49-48Q-52-68-25-67L24-63Q43-69 50-53L44-34Q21-27 7-34Q-8-26-32-34Q-44-33-49-48z'},{f:v?'@shine.1':'@shine.0',op:.65,d:'M-44-55Q-18-70 18-59L31-45Q5-50-10-44Q-31-40-44-55z'}],head:[{f:v?'@coat.1':'@coat.0',d:'M24-61Q38-75 46-89L57-88 63-70 76-60 71-48 54-52 44-66 42-43z'},{f:'@mane',d:'M30-62Q39-80 46-90l8-1-9 18-8 18zM48-88l-3-13 7 8 8-8-1 17z'},{f:v?'@shine.1':'@shine.0',d:'M53-80l4 13 14 9-5 4-14-9z',op:.7}]};}});
  sceneObjDefine({id:'ground.us-track-hoofprints',category:'ground',weight:0,size:[112,15],variants:2,seasonal:false,flippable:true,parts:['body'],palette:{base:{dust:['#b99472','#735842','#d9ba8b']}},tags:['kit:temperate','role:ground','us','track'],build(v,rnd){let hoof='',grain='';for(let i=0;i<6;i++){const x=-45+i*17,y=(rnd()-.5)*7;hoof+=`M${R(x-2)} ${R(y-2)}q-3 3 0 5q4 1 6-2`;grain+=`M${R(x+7)} ${R(y+3)}l4-1`;}return{body:[{s:'@dust.1',w:1.6,op:.32,d:hoof},{s:'@dust.2',w:1,op:.43,d:grain},{s:'@dust.0',w:.8,op:.6,d:v?'M-45 4q37-8 84-2':'M-52 3q31-7 69-4'}]};}});
})();
