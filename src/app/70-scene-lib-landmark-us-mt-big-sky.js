/* A prairie gambrel barn and the Rocky Mountain Front. Board, roof, glazing,
   silo and snow-gully systems are independent native geometry. */
(function () {
  const {define,poly,ell,rect,f1}=sceneDraw;
  define({id:'building.us-prairie-barn',category:'building',weight:0,size:[560,350],variants:2,seasonal:true,shapeBySeason:true,flippable:true,parts:['body','lit'],shadow:{rx:147,ry:7,h:160},
    palette:{base:{wall:['#9a4d3d','#c37a58','#623d36'],roof:['#5a6865','#8d9991','#384c4c'],trim:['#d9c8a0','#ae9c78'],glass:'#839d99',metal:['#aeb3a2','#d4d0b6','#6d827e']},spring:{wall:['#a85645','#c67d60','#6b463c']},summer:{wall:['#a65e45','#d08a61','#744d3c']},autumn:{wall:['#a6523c','#d27f51','#713e32']},winter:{wall:['#885e5a','#b58a7e','#5b4c4b'],roof:['#bdc9c6','#e3e7d9','#889d9b']}},night:{glow:{window:'#ffdc99',lamp:'#ffe8b2'},on:1},tags:['us','prairie','barn','signature','landmark','kit:temperate','role:building-mid'],
    build(v,r,ctx){const body=[],lit=[],P=(f,d,op)=>body.push({f,d,op}),S=(s,w,d,op)=>body.push({s,w,d,op});
      P('@wall.0','M-190 4V-200L-159-274-71-327 38-281 70-200V4z');P('@wall.2','M70-200L185-174V5H70z');P('@wall.1','M-190-200L-159-274-71-327 38-281 70-200 55-203 27-274-71-312-149-266-177-197z');
      for(let i=0;i<26;i++){const x=-183+i*9.3,top=x<-150?-197:x<-71?-269-(x+150)*.53:x<34?-313+(x+71)*.42:-273+(x-34)*2;S(i%4?'@wall.1':'@wall.2',1.3,`M${f1(x)} ${f1(top)}V-4`,.55);}
      for(let i=1;i<11;i++)S('@wall.1',1,`M${70+i*10} ${-197+i*2.2}V0`,.4);
      P('@roof.0','M-72-342L43-316 164-262 49-288z');P('@roof.2','M49-288L164-262 199-164 79-194z');P('@roof.1','M-72-342L43-316 164-262 160-258 40-309-71-335z');P('@roof.0','M-205-200L-171-281-72-342 49-288 79-194 62-190 31-273-70-319-151-268-181-193z');
      for(let i=1;i<10;i++){const u=i/10;S('@roof.1',1,`M${f1(-72+115*u)} ${f1(-342+26*u)}L${f1(49+115*u)} ${f1(-288+26*u)}L${f1(79+120*u)} ${f1(-194+30*u)}`,.54);}
      P('@roof.2',rect(-133,-137,119,141));P('@wall.2',rect(-128,-132,109,136));for(let i=0;i<10;i++)S('@wall.0',1.5,`M${-125+i*10.5} -131V0`);S('@trim.0',4,'M-129-133v136M-73-132V3M-18-133v136M-129-131h111M-127-129L-76-4-22-129M-127-4L-75-126-22-4');
      P('@roof.2',poly([[-95,-241],[-73,-263],[-50,-241],[-51,-213],[-95,-213]]));P('@trim.0',rect(-92,-238,39,23));
      const wins=[[-168,-168,24,30],[-3,-168,24,30],[-88,-238,30,19],[91,-140,23,27],[138,-131,22,27]];
      for(const [x,y,w,h]of wins){P('@trim.0',rect(x-3,y-3,w+6,h+6));for(let j=0;j<2;j++)for(let k=0;k<2;k++)body.push({f:'@glass',d:rect(x+j*w/2+1,y+k*h/2+1,w/2-2,h/2-2),glow:'window'});}
      const sx=230,sh=278+v*16;P('@metal.2',rect(sx-35,-sh,70,sh+5,7));P('@metal.0',rect(sx-34,-sh,47,sh+4,5));P('@metal.1',rect(sx-23,-sh,12,sh+1),.7);P('@roof.0',`M${sx-41} ${-sh}q41-54 82 0z`);P('@metal.1',`M${sx-37} ${-sh+1}q32-44 49-12l9 12z`,.65);
      for(let i=1;i<18;i++)S('@metal.2',1.2,`M${sx-34} ${f1(-sh+i*sh/18)}q34 7 68 0`,.68);S('@roof.2',2,`M${sx+19} -4V${-sh+12}M${sx+28} -4V${-sh+12}`);for(let i=0;i<17;i++)S('@metal.1',1.1,`M${sx+19} ${-9-i*15}h9`,.8);
      for(const x of [-145,35,166]){P('@roof.2',rect(x,-183,13,7,2));body.push({f:'#d7d2ad',d:ell(x+6,-179,4.5,2.8),glow:'lamp'});lit.push({f:{rad:[[0,'#ebcf94',.2],[1,'#ebcf94',0]],cx:x+5,cy:-157,r:29},d:ell(x+5,-157,28,27)});}
      if(ctx.season==='winter')S('#e1e7d9',5,'M-202-201L-168-280-72-338 48-284 195-242',.9);
      lit.push({s:'#b9c7c0',w:1.2,op:.55,d:'M-205-200L-171-281-72-342 49-288 199-245M-190-196V3M70-193V3'});return{body,lit};
    }});
  define({id:'rock.us-rocky-front',category:'rock',weight:0,size:[1780,150],variants:2,seasonal:true,shapeBySeason:true,flippable:false,parts:['body'],shadow:false,palette:{base:{rock:['#8f9d9c','#bdc7be','#667f81'],snow:['#d8ded3','#b0c3bf']},spring:{rock:['#899f92','#bbccad','#5c7d74']},summer:{rock:['#989f87','#c6c7aa','#6d806f']},autumn:{rock:['#a69b88','#d1c3a8','#7a8075']},winter:{rock:['#a9bdc1','#d0dcda','#7c9ca4'],snow:['#f1f3e8','#ccdddb']}},tags:['us','montana','rocky-front','natural','kit:alpine','role:rock'],
    build(v,r,ctx){const body=[],peaks=[[-890,7],[-841,-41],[-802,-69],[-765,-49],[-721,-102],[-680,-137],[-645,-119],[-605,-162],[-562,-145],[-526,-207],[-491,-188],[-450,-231],[-421,-267],[-391,-241],[-352,-262],[-319,-204],[-279,-178],[-241,-212],[-207,-185],[-169,-128],[-130,-161],[-93,-143],[-58,-185],[-20,-217],[17,-184],[51,-197],[88,-163],[127,-180],[165,-147],[201,-173],[235,-210],[268,-199],[301,-243],[339,-272],[371,-253],[407,-281],[439,-230],[476,-211],[509,-173],[548,-196],[584,-151],[623,-170],[664,-119],[700,-133],[742,-88],[781,-100],[821,-60],[890,4]];
      body.push({f:'@rock.0',d:poly(peaks)},{f:'@rock.2',op:.65,d:'M-421-267L-391-241-352-262-319-204-279-178-241-212-207-185-169-128-130-161-93-143-58-185-20-217-12-178-43-140-25-104-64-67-86 7-301 4-294-61-330-91-319-133-364-173-359-213zM407-281L439-230 476-211 509-173 548-196 584-151 623-170 664-119 700-133 742-88 781-100 821-60 890 4 519 6 491-52 477-86 446-111 459-157 427-198z'});
      body.push({f:'@snow.0',d:'M-450-231L-421-267-391-241-352-262-330-223-351-234-365-219-384-232-400-215-412-239-426-221-440-212zM301-243L339-272 371-253 407-281 428-249 410-258 394-238 381-244 367-228 350-245 333-239 319-220zM-58-185L-20-217 17-184 4-191-11-183-20-198-38-180z'});
      for(const [x,y]of [[-419,-249],[-351,-242],[-527,-194],[338,-254],[404,-261],[267,-185]])body.push({s:'@snow.1',w:ctx.season==='winter'?6:3,op:.8,d:`M${x} ${y}q-8 22 4 39t-9 31m7-24q13 6 11 23`});
      for(let i=0;i<26;i++){const x=-701+r()*1390,y=-28-r()*85;body.push({s:i%3?'@rock.1':'@rock.2',w:1.2,op:.4,d:`M${f1(x)} ${f1(y)}q${f1(18+r()*33)} -8 ${f1(49+r()*31)} 0`,detail:i>9});}for(const sh of body)sh.m=[1,0,0,.48,0,0];return{body};
    }});
})();
