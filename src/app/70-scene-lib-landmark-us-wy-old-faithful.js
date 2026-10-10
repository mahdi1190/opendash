/* Old Faithful's irregular silica apron, erupting water and separate drifting
   steam, a rustic log inn, lodgepole groves and distant grazing bison. */
(function () {
  const {define,poly,ell,f1}=sceneDraw;
  define({id:'ground.us-faithful-eruption',category:'ground',weight:0,size:[580,575],variants:1,seasonal:false,flippable:false,parts:['cone','jet','steamLeft','steamRight','spray'],shadow:false,reflect:false,
    palette:{base:{silica:['#ded4bb','#f4e9ce','#a5a48c','#c3c5aa'],water:['#e5f1e6','#f5f7ed','#94bcb5'],steam:['#e0e7e3','#fffdf1','#aebfbc']}},
    anim:{flap:{part:'jet',pivot:[0,-21],sy:[.78,1],period:17.3},bob:{part:'steamLeft',dy:9,period:8.3},sway:{part:'steamRight',pivot:[33,-300],deg:1.4,period:12.7},flicker:{part:'spray',op:[.38,.8],period:4.9}},
    tags:['us','wyoming','old-faithful','landmark','signature','natural','kit:alpine','role:ground'],
    build(v,r){const cone=[],jet=[],steamLeft=[],steamRight=[],spray=[];
      cone.push({f:{lin:[[0,'@silica.1'],[.4,'@silica.0'],[1,'@silica.2']],y1:-53,y2:8},d:'M-274 5L-244-6-207-9-170-18-130-23-95-37-57-41-25-57 4-62 27-54 52-46 83-43 116-31 147-27 181-17 218-13 247-3 279 8 201 13 153 9 92 16 24 12-41 17-117 12-184 16z'},
        {f:'@silica.2',op:.6,d:'M-57-41L-25-57 4-62 27-54 52-46 30-29 61-18 12-9-48-14-25-28z'},
        {f:'@water.2',op:.8,d:'M-39-32Q-4-49 28-32Q10-24-20-27z'});
      for(let i=0;i<23;i++){const x=-245+r()*480,y=-4-r()*25,w=12+r()*39;cone.push({s:i%3?'@silica.1':'@silica.2',w:1+r()*1.2,op:.55,detail:i>10,d:`M${f1(x)} ${f1(y)}q${f1(w*.4)} -4 ${f1(w)} -1`});}
      for(let i=0;i<20;i++){const x=-244+r()*482,y=-2-r()*20;cone.push({f:i%2?'@silica.1':'@silica.3',op:.7,detail:true,d:poly([[x-4,y],[x+2,y-3],[x+12,y-2],[x+8,y+2]])});}
      // A connected irregular column replaces the original single white spike.
      jet.push({f:{lin:[[0,'@water.1'],[.5,'@water.0'],[1,'@water.2']],x1:-34,y1:-500,x2:47,y2:-80},d:'M-22-29Q-31-104-15-169Q-42-203-29-244Q-49-274-28-308Q-45-337-25-363Q-36-389-19-416Q-29-446-9-466Q-16-493 1-513Q8-535 21-554Q36-540 28-519Q49-498 36-475Q56-453 38-427Q55-402 38-377Q58-348 35-318Q52-289 34-263Q51-226 29-199Q40-149 26-115Q40-69 22-28z'},
        {f:'@water.1',op:.73,d:'M-7-34Q-11-118 4-185Q-15-225 2-269Q-16-313 4-357Q-6-399 10-437Q1-469 21-510Q12-460 24-431Q10-392 26-358Q11-313 24-274Q12-226 19-191Q7-124 14-34z'});
      for(let i=0;i<19;i++){const x=-29+i*3.3,y=-85-r()*280,tip=-475+r()*176;jet.push({s:i%3?'@water.1':'@water.2',w:.7+r()*1.3,op:.4+r()*.4,detail:i>10,d:`M${f1(x)} -31Q${f1(x-13+r()*26)} ${f1(y)} ${f1(x+(r()-.5)*44)} ${f1(tip)}`});}
      steamLeft.push({f:{lin:[[0,'@steam.2',0],[.23,'@steam.0',.28],[.52,'@steam.1',.8],[.8,'@steam.0',.36],[1,'@steam.2',0]],x1:-220,y1:-350,x2:4,y2:-350},op:.7,d:'M-2-170Q-65-171-78-211Q-123-201-139-238Q-181-235-186-272Q-222-286-209-320Q-222-355-193-377Q-197-415-163-431Q-153-464-119-455Q-93-480-65-454Q-29-455-24-423Q5-397-16-366Q5-329-23-306Q-1-263-23-237Q-2-203-2-170z'},
        {f:{lin:[[0,'@steam.1',0],[.5,'@steam.1',.33],[1,'@steam.1',0]],y1:-423,y2:-252},d:'M-156-404Q-174-378-156-354Q-191-329-160-303Q-174-277-144-259Q-155-292-130-310Q-151-342-132-362Q-147-381-130-401z'});
      steamRight.push({f:{lin:[[0,'@steam.2',0],[.2,'@steam.0',.45],[.48,'@steam.1',.88],[.77,'@steam.0',.3],[1,'@steam.2',0]],x1:10,y1:-350,x2:226,y2:-350},op:.7,d:'M18-192Q67-194 76-227Q123-215 139-252Q177-250 186-285Q224-296 211-329Q230-365 199-388Q201-424 170-439Q160-475 128-467Q100-493 74-468Q41-473 29-439Q1-418 20-386Q0-357 22-328Q6-295 31-268Q7-239 18-192z'},
        {f:{lin:[[0,'@steam.1',0],[.5,'@steam.1',.3],[1,'@steam.1',0]],y1:-450,y2:-280},d:'M106-445Q90-422 109-402Q83-378 108-353Q94-330 118-313Q109-287 136-280Q120-309 140-331Q117-351 137-376Q117-398 132-419z'});
      for(let i=0;i<24;i++){const side=i%2?1:-1,x=side*(25+r()*83),y=-102-r()*334; spray.push({s:'@water.1',w:1+r()*1.8,op:.6,detail:i>9,d:`M${f1(x)} ${f1(y)}q${f1(side*(3+r()*6))} ${f1(9+r()*15)} ${f1(side*(3+r()*10))} ${f1(18+r()*19)}`});}
      return{cone,jet,steamLeft,steamRight,spray};
    }});
  define({id:'building.us-faithful-inn',category:'building',weight:0,size:[570,300],variants:1,seasonal:false,shapeBySeason:true,flippable:false,parts:['body','lit'],
    palette:{base:{log:['#715643','#9c7a54','#423d35'],roof:['#4b5a4c','#293c38','#87947a'],stone:['#8b8b7b','#b8b099'],glass:'#9ca995'}},shadow:{rx:183,ry:9,h:145},night:{glow:['lit'],on:.8},tags:['us','old-faithful-inn','kit:alpine','role:building-mid'],
    build(v,r,ctx){const body=[],lit=[];
      body.push({f:'@log.0',d:'M-275 0V-118L-130-163-88-217 0-272 91-217 132-161 275-118V0z'},
        {f:'@log.2',d:'M-90 0V-216L0-272 90-216V0z'},
        {f:'@roof.1',d:'M-292-119L-132-174-96-220 0-292 97-221 135-172 292-119 280-107 127-151 86-205 0-269-85-205-125-151-280-107z'},
        {f:'@roof.0',d:'M-132-174L-95-218-90-157-270-109zM97-219L135-172 271-110 91-157z'},
        {f:'@stone.0',d:'M-160-169V-252L-135-263-112-251V-185z'});
      for(let i=0;i<17;i++){const y=-8-i*7.6;body.push({s:i%3?'@log.1':'@log.2',w:2.2,op:.65,d:`M-271 ${f1(y)}H-92M94 ${f1(y)}H271`});}
      for(let i=0;i<14;i++)body.push({s:'@roof.2',w:.8,op:.4,detail:true,d:`M${-88+i*13} ${-207-Math.min(i,13-i)*8}l0 35`});
      for(let i=0;i<9;i++)body.push({s:'@stone.1',w:1.5,op:.6,detail:true,d:`M-157 ${-176-i*9}l42 -10`});
      for(let i=0;i<12;i++){const x=i<6?-251+(i%6)*29:101+(i%6)*29,y=-84;body.push({f:'@log.2',d:poly([[x,y],[x+18,y],[x+18,y+26],[x,y+26]])});for(let k=0;k<4;k++)lit.push({f:'@glass',glow:true,d:poly([[x+2+k%2*8,y+2+Math.floor(k/2)*12],[x+8+k%2*8,y+2+Math.floor(k/2)*12],[x+8+k%2*8,y+12+Math.floor(k/2)*12],[x+2+k%2*8,y+12+Math.floor(k/2)*12]])});}
      body.push({f:'@log.1',d:'M-90-50L0-104 90-50 82-40 0-83-82-40z'},{s:'@log.1',w:5,d:'M-76-43V0M-35-66V0M35-66V0M76-43V0'},{f:'@log.0',d:'M-23 0V-66Q0-84 23-66V0z'},{s:'@log.1',w:2,d:'M0-68V-7M-21-37H22'});
      for(const x of [-57,0,57]){body.push({s:'@log.2',w:2,d:`M${x} -43v15`});lit.push({f:'@glass',glow:true,d:ell(x,-32,3,4)});}
      if(ctx.season==='winter')body.push({f:'#d4dacc',op:.8,d:'M-292-119L-132-174-96-220 0-292 97-221 135-172 292-119 280-118 130-164 91-214 0-282-91-213-128-164-280-116z'});
      return{body,lit};
    }});
  define({id:'animal.us-yellowstone-bison',category:'animal',weight:0,size:[166,112],variants:3,seasonal:true,shapeBySeason:true,flippable:true,parts:['legsFar','body','head','legsNear'],
    palette:{base:{coat:['#68513e','#897157','#3d3c32'],shag:['#3c392f','#585041'],horn:'#c9bfa0'},spring:{coat:['#5d503d','#8b7955','#3b3d31']},summer:{coat:['#75573c','#a18358','#484033']},autumn:{coat:['#654a38','#917450','#3c352f']},winter:{coat:['#554d44','#827f6d','#353d38']}},shadow:{rx:64,ry:4,h:48},
    anim:{walk:{parts:['legsNear','legsFar'],pivot:[0,-20],deg:8,period:1.8,bob:.5},turn:{part:'head',pivot:[-43,-55],deg:3,period:11.1,hold:.7}},tags:['us','bison','kit:alpine','role:animal'],
    build(v,r,ctx){const legsFar=[{f:'@coat.2',d:'M-35-38L-30-7-22 0-15-2-20-41zM42-39L43-11 49-2 57-1 54-12 56-43z'}],body=[],head=[],legsNear=[{f:'@shag.0',d:'M-22-44L-17-9-11 1 0 1-5-10 0-48zM51-39L52-11 59 0 69 0 64-10 64-44z'}];
      body.push({f:'@coat.0',d:'M-58-49Q-64-79-45-93Q-28-115-6-107Q21-102 28-83Q49-83 63-67Q74-52 68-37Q52-28 26-36Q0-27-22-36z'},
        {f:'@coat.1',op:.65,d:'M-43-88Q-28-106-9-100Q11-96 21-77Q43-80 57-65Q30-70 11-60Q-9-78-43-76z'},
        {f:'@shag.0',d:'M-58-57Q-64-83-44-95Q-28-106-11-101Q-4-78-14-56L-17-35-25-41-32-35-37-43-46-40-48-49z'},
        {s:'@coat.2',w:2.4,d:'M63-59q17 1 15 20l-3 5'},{f:'@shag.0',d:'M75-38l-4 10 6-3 5-8z'});
      for(let i=0;i<14;i++)body.push({s:i%3?'@shag.1':'@coat.1',w:1.1,op:.56,detail:i>5,d:`M${-51+i*2.5} ${-75-r()*15}l${-1+r()*4} ${7+r()*9}`});
      head.push({f:'@shag.0',d:'M-43-75Q-58-81-68-67L-77-55-72-42-58-38-47-45-37-55z'},
        {f:'@shag.1',d:'M-70-65L-83-57-80-47-68-45-61-55z'},
        {f:'@shag.0',d:'M-63-42L-60-22-52-26-46-45z'},
        {f:'@horn',d:'M-59-73Q-68-78-66-91Q-76-82-67-70zM-45-74Q-38-80-42-90Q-29-80-39-70z'},
        {f:'#262d2a',d:ell(-68,-59,1.5,1.3)});
      if(ctx.season==='winter')body.push({s:'@coat.1',w:2.3,op:.6,d:'M-53-80l5-10 7 4 5-11 6 6 7-12 6 9 8-7'});
      return{legsFar,body,head,legsNear};
    }});
  define({id:'ground.us-sinter-fragment',category:'ground',weight:0,size:[54,15],variants:4,seasonal:false,flippable:true,parts:['body'],shadow:false,palette:{base:{crust:['#b5b69f','#e6dfc7','#8f9d8d']}},tags:['us','silica','kit:alpine','role:ground'],
    build(v,r){const x=v*2;return{body:[{f:'@crust.0',d:poly([[-26,-3],[-16,-8],[-8,-7],[x,-13],[14,-9],[26,-3],[19,1],[5,-2],[-8,2]])},{f:'@crust.1',op:.8,d:poly([[-25,-3],[-16,-8],[-8,-7],[x,-13],[14,-9],[9,-5],[-5,-6],[-15,-2]])},{s:'@crust.2',w:.8,op:.6,d:`M${x} -11l4 4-6 3m13-2 6 2`} ]};}});
  define({id:'tree.us-lodgepole-pine',category:'tree',weight:0,size:[282,485],variants:3,seasonal:true,shapeBySeason:true,flippable:true,parts:['trunk','crown'],palette:{base:{bark:['#544c3f','#9a8b6e'],leaf:['#243e34','#3d5941','#647c53']},spring:{leaf:['#264c37','#47714b','#7d995d']},summer:{leaf:['#294735','#4d6641','#8a975b']},autumn:{leaf:['#344b37','#617047','#a5a264']},winter:{leaf:['#344d49','#648077','#a2b5a4']}},shadow:{rx:48,ry:5,h:150},anim:{sway:{part:'crown',pivot:[0,-240],deg:.55,period:10.3}},tags:['us','lodgepole','kit:alpine','role:tree'],
    build(v,r,ctx){const lean=(v-1)*11,trunk=[{f:'@bark.0',d:`M-9 3L${lean-4} -453l6-7L10 3z`},{s:'@bark.1',w:2,op:.6,d:`M-2 0L${lean+1} -443`}],crown=[];
      for(let i=0;i<9;i++){const y=-465+i*38,rx=20+i*12+(r()-.5)*15,xx=lean*(1-i/12)+(r()-.5)*12;
        crown.push({f:'@leaf.0',d:`M${f1(xx)} ${y-15}Q${f1(xx-rx*.4)} ${y+7} ${f1(xx-rx)} ${y+27}Q${f1(xx-rx*.55)} ${y+30} ${f1(xx-rx*.18)} ${y+24}L${f1(xx-rx*.38)} ${y+38}Q${f1(xx)} ${y+30} ${f1(xx+rx*.32)} ${y+39}L${f1(xx+rx*.19)} ${y+25}Q${f1(xx+rx*.75)} ${y+31} ${f1(xx+rx)} ${y+22}Q${f1(xx+rx*.35)} ${y+4} ${f1(xx)} ${y-15}z`},
          {f:'@leaf.1',op:.77,d:`M${f1(xx)} ${y-8}Q${f1(xx-rx*.35)} ${y+7} ${f1(xx-rx*.76)} ${y+23}L${f1(xx-rx*.24)} ${y+18} ${f1(xx)} ${y+3} ${f1(xx+rx*.65)} ${y+23} ${f1(xx+rx*.22)} ${y+6}z`});
        let needles='';for(let k=0;k<9;k++){const x=xx+(r()-.5)*rx*1.5,yy=y+9+r()*18;needles+=`M${f1(x-3)} ${f1(yy+1)}l4-6 2 4 4-2`;}
        crown.push({s:'@leaf.2',w:.9,op:.5,d:needles,detail:i>2});
        if(ctx.season==='winter')crown.push({f:'#d6ddd1',op:.72,d:`M${f1(xx)} ${y-9}Q${f1(xx-rx*.3)} ${y+6} ${f1(xx-rx*.7)} ${y+19}L${f1(xx-rx*.22)} ${y+13} ${f1(xx)} ${y+1} ${f1(xx+rx*.63)} ${y+18} ${f1(xx+rx*.19)} ${y+6}z`});
      }return{trunk,crown};
    }});
  define({id:'tree.us-subalpine-fir',category:'tree',weight:0,size:[224,365],variants:3,seasonal:true,shapeBySeason:true,flippable:true,parts:['trunk','crown'],shadow:{rx:36,ry:4,h:110},
    palette:{base:{bark:'#615b49',leaf:['#304b42','#536a51','#809073']},spring:{leaf:['#315a46','#5b805a','#92a273']},summer:{leaf:['#344e3c','#597148','#8b9566']},autumn:{leaf:['#4c5840','#747b51','#a6a46e']},winter:{leaf:['#47625b','#81998a','#c1cebc']}},anim:{sway:{part:'crown',pivot:[0,-130],deg:.55,period:11.7}},tags:['us','fir','kit:alpine','role:tree'],
    build(v,r,ctx){const trunk=[{f:'@bark',d:'M-6 2L-2-352 3-354 7 2z'}],crown=[],left=[],right=[];
      for(let i=0;i<25;i++){const t=i/24,y=-355+t*307,rad=5+Math.pow(t,.79)*99,j=i%3===1?1:.74+r()*.13;left.push([-rad*j+(v-1)*t*9,y]);right.push([rad*(i%3===2?1:.69+r()*.2)+(v-1)*t*9,y+3]);}
      crown.push({f:'@leaf.0',d:poly([...left,[-13,-37],[4,-44],[17,-38],...right.reverse()])},
        {f:'@leaf.1',op:.75,d:poly([...left.slice(0,23),[-24,-74],[-11,-118],[-6,-184],[1,-258],[2,-348]])});
      for(let i=0;i<13;i++){const y=-326+i*21,w=13+i*5; crown.push({s:'@leaf.2',w:1.5,op:.4,detail:i>4,d:`M-2 ${y}q${f1(-w*.4)} 7 ${-w} 11m${w+2} -11q${f1(w*.4)} 7 ${w} 10`});}
      if(ctx.season==='winter')for(let i=0;i<5;i++){const y=-324+i*54,w=13+i*16;crown.push({s:'#d6dfd1',w:3,op:.65,d:`M${-w} ${y+12}l${w-3} -9 12 4 ${w-7} 8`});}
      return{trunk,crown};
    }});
})();
