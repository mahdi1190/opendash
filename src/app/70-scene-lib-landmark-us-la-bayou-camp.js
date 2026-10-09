/* Native Louisiana raised cabin, buttressed bald cypress and narrow pirogue. */
(function(){
  const D=sceneD,R=n=>Math.round(n*10)/10;
  sceneObjDefine({id:'landmark.us-la-bayou-camp',category:'landmark',weight:0,size:[470,280],box:[-245,-280,245,35],variants:1,seasonal:false,flippable:false,parts:['body','lit'],
    palette:{base:{wood:['#6e5140','#aa805b','#3c3830'],roof:['#59676b','#84908d','#334751'],trim:['#d4bd8c','#937c58'],glass:'#698b89'}},night:{glow:{window:'#ffd58a',lamp:'#f8d399'},on:1},shadow:{rx:190,ry:9,h:45},reflect:true,tags:['landmark','place:us/state:LA','us','louisiana','bayou','cabin'],
    build(){const body=[],lit=[],P=(f,d,op)=>body.push({f,d,op}),S=(s,w,d,op)=>body.push({s,w,d,op,cap:'round'});
      P('@wood.2','M-175-4l-7-99h13l7 100zM-68 5l-6-104h12l6 104zM109 11l-3-114h12l6 117zM200 16l-4-99h12l7 101z');P('@wood.1','M-174-5l-4-94h4l7 96zM110 10l-1-111h4l6 113zM201 15l-1-94h4l6 97z');
      P('@wood.0','M-196-95L181-108 226-84-163-65z');P('@wood.1','M-194-95L180-108 181-101-193-86z');for(let i=0;i<17;i++)S('@wood.2',1.2,`M${-183+i*23} -94l32 20`,.65);
      P('@wood.2','M-159-96v-115l267-7 79 38v92l-346 16z');P('@wood.0','M-158-210l266-8v114l-266 9z');P('@wood.2','M108-218l79 38v92l-79-16z');
      for(let i=0;i<16;i++){const y=-204+i*6.4;S(i%3?'@wood.1':'@wood.2',1.7,`M-155 ${R(y)}l260-7`,.65);S('@wood.1',.7,`M115 ${R(y-7)}l67 32`,.33);}
      P('@wood.1','M-157-211l131-58 134 51z');for(let i=0;i<9;i++)S('@wood.2',1.2,`M${-138+i*28} ${R(-215-Math.min(i,8-i)*9)}v${R(10+Math.min(i,8-i)*8)}`,.6);
      P('@roof.2','M-190-209L-27-279 142-233 219-183 109-204-27-254-152-200z');P('@roof.0','M-27-279L142-233 219-183 109-204z');P('@roof.1','M-190-209L-27-279 142-233 136-228-28-268-178-205z');
      for(let i=1;i<12;i++){const t=i/12;S('@roof.1',1.1,`M${R(-27+169*t)} ${R(-279+46*t)}L${R(109+110*t)} ${R(-204+21*t)}`,.65);}S('@trim.0',3,'M-181-207L-27-269 108-216 210-186',.8);
      P('@wood.2',D.rect(-35,-173,45,76));P('@trim.1',D.rect(-31,-170,37,71));P('@wood.0',D.rect(-27,-167,29,68));S('@trim.0',1.6,'M-27-164v59M-27-148H2',.6);P('@trim.0',D.ell(-3,-130,1.8,1.8));
      for(const [x,y,w] of [[-125,-181,47],[42,-183,44],[131,-166,31]]){P('@wood.2',D.rect(x-5,y-5,w+10,48));P('@trim.0',D.rect(x-2,y-2,w+4,43));P('@glass',D.rect(x,y,w,39));
        for(let j=0;j<4;j++)body.push({f:'#94aa9a',d:D.rect(x+3+(j%2)*(w/2),y+3+Math.floor(j/2)*18,w/2-5,14),glow:'window'});S('@wood.1',2,`M${R(x+w/2)} ${y}v39M${x} ${y+20}h${w}`);lit.push({f:{rad:[[0,'#ffd28a',.17],[1,'#c58b45',0]],cx:x+w/2,cy:y+32,r:58},d:D.ell(x+w/2,y+32,60,52)});}
      P('@wood.2','M-222 9L-124-54 8-58 15-47-114-42-206 17z');P('@wood.1','M-222 9L-124-54 8-58 7-51-119-47-215 14z');for(let i=0;i<13;i++){const t=i/13;S('@wood.2',1.3,`M${R(-218+98*t)} ${R(9-63*t)}l15 6`,.8);}
      for(const [x,y] of [[-215,13],[-120,-46],[8,-53]]){P('@wood.2',D.rect(x-3,y-29,6,48));S('@trim.1',1.3,`M${x-1} ${y-28}v42`,.75);}
      for(const [x,y] of [[-146,-113],[100,-124],[-120,-65],[9,-71]]){S('@wood.2',2,`M${x} ${y+10}v-18l6-4`);P('@roof.2',D.rect(x+1,y-20,11,13,2));body.push({f:'#d4c6a0',d:D.rect(x+3,y-18,7,9,1),glow:'lamp'});lit.push({f:{rad:[[0,'#ffdf9b',.23],[1,'#e4ad58',0]],cx:x+6,cy:y-8,r:35},d:D.ell(x+6,y-8,36,29)});}
      lit.push({s:'#ddc091',w:1.6,op:.58,d:'M-190-209L-27-274 138-231 218-183M-194-95L180-108M-222 9L-124-54 8-58'});return{body,lit};}
  });
  sceneObjDefine({id:'tree.us-bald-cypress',category:'tree',weight:0,detailPx:120,size:[440,530],box:[-330,-560,330,15],variants:3,seasonal:true,shapeBySeason:true,flippable:true,parts:['trunk','crown','moss'],palette:{base:{bark:['#343e35','#69715a','#939178'],moss:['#68776b','#9aa48c']},spring:{leaf:['#294d39','#5c7a4c','#8e9b63']},summer:{leaf:['#244936','#466c46','#7d925f']},autumn:{leaf:['#5f422c','#927040','#b39358']},winter:{leaf:['#4f5244','#7f806a','#a0a58c']}},shadow:{rx:53,ry:8,h:180},reflect:true,anim:{sway:{part:'moss',pivot:[0,-270],deg:1.1,period:9.7}},tags:['kit:temperate','kit:tropical','role:tree','us','bald-cypress'],
    build(v,rnd,ctx){const trunk=[],crown=[],moss=[],boughs=[],lean=(v-1)*12;
      trunk.push({f:'@bark.0',d:`M-60 5Q-30-28-22-130L${lean-12}-342Q${lean-10}-405 ${lean+1}-476Q${lean+13}-396 ${lean+17}-337L23-130Q29-35 63 6L25-1 7-15-10-2-32 5z`},{f:'@bark.1',d:`M-31 3Q-9-63-10-155L${lean}-403 ${lean+5}-430 2-135Q-1-44 13-2L1-13-9 1z`,op:.65});
      for(let i=0;i<10;i++){const side=i%2?1:-1,y=-206-i*24,ex=side*(66+rnd()*103)+lean,ey=y-30-rnd()*30;boughs.push([lean*.4,y+20,ex,ey,side]);trunk.push({s:'@bark.0',w:12-i*.8,cap:'round',d:`M${lean*.4} ${y+32}Q${R(ex*.48)} ${R(y+8)} ${R(ex)} ${R(ey)}`},{s:'@bark.1',w:1.5,op:.55,d:`M${R(ex*.4)} ${R(y+11)}L${R(ex)} ${R(ey+2)}`});
        for(let j=0;j<3;j++){const x=ex-22+j*22,y0=ey+8,h=27+rnd()*48;let strands='';for(let k=0;k<4;k++)strands+=`M${R(x+k*2)} ${R(y0)}q${R(-8+rnd()*9)} ${R(h*.4)} ${R(-2+rnd()*7)} ${R(h)}q-5-9-3-17`;moss.push({s:j%2?'@moss.1':'@moss.0',w:1.7,cap:'round',op:.65,detail:true,d:strands});}}
      if(ctx.season!=='winter'){
        // Bald cypress foliage is made of loose, narrow feather sprays. Gaps
        // between the boughs preserve the branching rather than one solid cap.
        for(let i=0;i<7;i++){const y=-394-i*18,side=i%2?1:-1;boughs.push([lean,y+14,lean+side*(62-i*6),y-27,side]);}
        boughs.forEach(([ax,ay,bx,by,side],i)=>{let needles='',light='',stems='',base='';for(let j=0;j<4;j++){const t=.16+j*.24,sx=ax+(bx-ax)*t,sy=ay+(by-ay)*t,ex=sx+side*(25+rnd()*35),ey=sy-20-rnd()*37,dx=ex-sx,dy=ey-sy,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;stems+=`M${R(sx)} ${R(sy)}L${R(ex)} ${R(ey)}`;
          for(let k=0;k<7;k++){const u=(k+rnd()*.42)/7,x=sx+dx*u,y=sy+dy*u,w=(2+Math.sin(u*Math.PI)*10)*(1-rnd()*.35);for(const s of [-1,1]){const pin=`M${R(x)} ${R(y)}l${R(nx*w*s*(.6+rnd()*.7)-dx*.08)} ${R(ny*w*s*(.6+rnd()*.7)-dy*.08)}`;needles+=pin;if(k%3===j%3)light+=pin;}}}
          for(let k=1;k<5;k++){const t=k/5,x=ax+(bx-ax)*t,y=ay+(by-ay)*t,h=12+Math.sin(t*Math.PI)*16;for(const s of [-1,1])base+=`M${R(x)} ${R(y)}l${R(side*(h*.55+s*5))} ${R(-h+s*9)}l${R(-side*4)} 9z`;}
          crown.push({f:i%3?'@leaf.0':'@leaf.1',d:base,op:.48},{s:i%3?'@leaf.0':'@leaf.1',w:1.5,cap:'round',d:needles,detail:true},{s:'@leaf.2',w:.8,cap:'round',op:.7,d:light,detail:true},{s:'@leaf.1',w:1.7,cap:'round',d:stems,detail:true});});
      }else{let twigs='';for(let i=0;i<28;i++){const side=i%2?1:-1,y=-260-i*7.2,x=side*(45+rnd()*110);twigs+=`M${lean} ${R(y+32)}Q${R(x*.45)} ${R(y)} ${R(x)} ${R(y-20)}m${R(-x*.3)} 8l${R(side*15)} -22`;}crown.push({s:'@bark.1',w:1.4,d:twigs,op:.9});}
      let bark='';for(let i=0;i<9;i++){const x=-17+i*3.6;bark+=`M${R(x)} -20Q${R(x*.7)} -116 ${R(lean+x*.3)} -298`;}trunk.push({s:'@bark.2',w:.9,op:.4,detail:true,d:bark});return{trunk,crown,moss};}
  });
  sceneObjDefine({id:'boat.us-bayou-pirogue',category:'boat',weight:0,size:[116,28],variants:2,seasonal:false,parts:['body'],palette:{base:{wood:['#594333','#9c7650','#c29c69']}},reflect:true,shadow:{rx:50,ry:3,h:8},anim:{bob:{dy:1.8,period:4.7}},tags:['kit:temperate','kit:tropical','role:boat','us','pirogue'],build(v){return{body:[{f:'@wood.0',d:'M-58-14Q-4-7 58-18L45-1Q-5 14-47 0z'},{f:'@wood.1',d:'M-58-14Q-5-26 58-18L40-7Q-3-1-43-5z'},{f:'#2c3b35',d:'M-43-13Q-3-22 44-17L34-10Q-4-5-36-8z'},{s:'@wood.2',w:2,d:'M-58-14Q-4-8 58-18',op:.8},{s:'@wood.1',w:4,d:'M-17-17l3 10M20-18l2 9'},{s:'@wood.2',w:2.5,d:v?'M-22-25L45-4':'M-40-1L33-29',cap:'round'}]};}});
  sceneObjDefine({id:'ground.us-cypress-knees',category:'ground',weight:0,size:[85,40],variants:3,seasonal:false,flippable:true,parts:['body'],palette:{base:{bark:['#4f5140','#81816a','#a29c7d']}},tags:['kit:temperate','kit:tropical','role:ground','us','cypress-knees'],build(v){const body=[];for(let i=0;i<3;i++){const x=-30+i*29,h=13+(i+v)%3*8;body.push({f:'@bark.0',d:`M${x-9} 2Q${x-5} -7 ${x-4} ${-h}Q${x} ${-h-8} ${x+4} ${-h}Q${x+3} -5 ${x+10} 2z`},{s:'@bark.1',w:2,d:`M${x-2} -3L${x} ${-h+1}`,op:.7});}return{body};}});
})();
