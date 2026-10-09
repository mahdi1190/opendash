/* Gypsum landforms, soaptree yucca and pale dune wildlife. The broad curved
   ridge is terrain, not an illuminated building: live moonlight grades it. */
(function () {
  const D=sceneD, R=n=>Math.round(n*10)/10;
  const sand={base:{sand:['#f7eee5','#b4acc2','#fff8ed','#7c7d9c'],grain:['#89839d','#e6dce2']},
    spring:{sand:['#f4eadc','#b1a7b9','#fff7e9','#7d7c94'],grain:['#898198','#e8ded9']},
    summer:{sand:['#fff1dc','#baa7b6','#fff8e7','#837a96'],grain:['#938296','#efe0ce']},
    autumn:{sand:['#f4e6e4','#aaa1ba','#fff2e9','#74738e'],grain:['#858098','#e5d7dd']},
    winter:{sand:['#e9e8ec','#a6b2c6','#f5f4f5','#6f809d'],grain:['#7b87a0','#dce0e9']}};
  sceneObjDefine({id:'ground.us-white-sands-dune',category:'ground',weight:0,size:[1920,315],box:[-964,-309,964,12],variants:1,seasonal:true,flippable:false,parts:['body'],palette:sand,shadow:false,
    tags:['us','new-mexico','white-sands','gypsum','natural','signature','kit:arid','role:ground'],
    build(v,r){const body=[];
      body.push({f:{lin:[[0,'@sand.2'],[.54,'@sand.0'],[1,'@sand.1']],x1:-210,y1:-305,x2:70,y2:10},d:'M-960-92C-684-109-430-136-385-199C-330-265-253-307-155-304C88-298 177-189 326-181C489-174 681-83 960-76L960 6H-960z'});
      // The steep slip face folds inward; one clean curving crest distinguishes
      // it from the long low windward surface and the farther interlocking dunes.
      body.push({f:{lin:[[0,'@sand.1'],[1,'@sand.3']],x1:-150,y1:-300,x2:-210,y2:0},d:'M-155-304C88-298 177-189 326-181C221-173 125-168 17-108C-70-60-92-29-143 6H-412C-320-53-245-169-155-304z'});
      body.push({f:'@sand.0',op:.65,d:'M-155-304C20-299 100-231 167-204C76-218 12-221-61-233C-105-244-137-268-155-304z'});
      body.push({s:'@sand.2',w:3.4,cap:'round',d:'M-951-92C-684-109-430-136-385-199C-330-265-253-307-155-304C88-298 177-189 326-181C489-174 681-83 956-77'});
      body.push({s:'@sand.3',w:1.2,op:.36,d:'M-157-298C-235-157-294-64-403-2'});
      for(let i=0;i<27;i++){
        const x=-630+i*19,y=-99+i*.9+(r()-.5)*10,w=28+r()*60;
        body.push({s:i%3?'@grain.0':'@sand.2',w:.7+r()*.8,op:.26+r()*.18,d:`M${R(x)} ${R(y)}q${R(w*.44)} ${R(-8-r()*8)} ${R(w)} ${R(-4+r()*5)}`,detail:i>10});
      }
      for(let i=0;i<19;i++){
        const t=i/19,x=-144+t*446,y=-293+t*108;
        body.push({s:i%3?'@sand.0':'@sand.3',w:.7+r()*.6,op:.29,d:`M${R(x)} ${R(y)}C${R(x-52)} ${R(y+36)} ${R(x-67)} ${R(y+92)} ${R(x-151)} ${R(Math.min(4,y+170))}`,detail:i>5});
      }
      for(let i=0;i<35;i++){
        const x=216+r()*411,y=-14-r()*46;
        body.push({f:i%2?'@grain.0':'@sand.2',op:.17+r()*.22,d:D.poly([[x-4,y],[x+1,y-1],[x+6,y],[x+1,y+1]]),detail:true});
      }
      return{body};
    }});
  sceneObjDefine({id:'plant.us-soaptree-yucca',category:'plant',weight:0,size:[196,248],box:[-101,-250,101,6],variants:4,seasonal:true,shapeBySeason:true,flippable:true,parts:['trunk','crown'],
    palette:{base:{trunk:['#454b3c','#897c59','#ada07c'],leaf:['#293f34','#5e7355','#9aa77b'],dry:['#656343','#a69b72'],flower:'#f3eac9'},
      spring:{leaf:['#274d38','#557b56','#91a875']},summer:{leaf:['#2c4935','#607a4c','#a1b07a']},autumn:{leaf:['#3d4935','#69774f','#a0a77d']},winter:{leaf:['#344d45','#687e70','#a1b09f']}},
    shadow:{rx:21,ry:3,h:160},anim:{sway:{part:'crown',pivot:[0,-126],deg:.85,period:7.7}},tags:['us','new-mexico','soaptree-yucca','kit:arid','role:ground'],
    build(v,r,ctx){const trunk=[],crown=[],lean=(v-1.5)*5,h=127+v*8;
      trunk.push({f:'@trunk.0',d:`M-9 4Q-2-56 ${lean-5} ${-h}L${lean+10} ${-h-4}Q7-51 10 3z`},{f:'@trunk.1',d:`M-2 3L${lean+2} ${-h}l4-2L4 3z`});
      for(let i=0;i<16;i++)trunk.push({s:i%2?'@trunk.2':'@trunk.0',w:.8,op:.55,d:`M${-7+i%4*4} ${-7-i*7}l${i%2?9:-9} -5`,detail:i>6});
      // Drooping dead leaf skirt and curved blade fans, each blade tapering to
      // a needle rather than a straight stick or generic palm frond.
      for(let i=0;i<14;i++){const x=(i-6.5)*3,tip=x*2.7+(r()-.5)*17;
        crown.push({f:'@dry.'+(i%2),op:.85,d:`M${R(lean+x)} ${-h-2}Q${R(lean+tip*.7)} ${-h+21} ${R(lean+tip)} ${R(-h+54+r()*22)}Q${R(lean+tip*.35)} ${-h+29} ${R(lean+x+1.5)} ${-h-3}z`});}
      for(let i=0;i<35;i++){const a=(-177+i*5.2+(r()-.5)*5)*Math.PI/180,len=47+r()*48+(i%4===0?7:0),xx=Math.cos(a)*len+lean,yy=-h+Math.sin(a)*len,wx=Math.cos(a+1.57)*(1.4+r()*1.3),wy=Math.sin(a+1.57)*(1.4+r()*1.3);
        crown.push({f:'@leaf.'+(i%3),d:`M${lean} ${-h}Q${R((lean+xx)*.5+wx*3)} ${R((-h+yy)*.5+wy*3)} ${R(xx)} ${R(yy)}Q${R((lean+xx)*.5-wx)} ${R((-h+yy)*.5-wy)} ${lean+1} ${-h+2}z`});
        if(i%3===0)crown.push({s:'@leaf.2',w:.6,op:.7,d:`M${lean} ${-h}Q${R((lean+xx)*.5+wx)} ${R((-h+yy)*.5+wy)} ${R(xx)} ${R(yy)}`,detail:true});
      }
      if(ctx.season==='spring'&&v===2){crown.push({s:'@trunk.2',w:2,d:`M${lean} ${-h}q8-50 3-97`});for(let i=0;i<9;i++)crown.push({f:'@flower',d:D.ell(lean+3+(i%2?4:-4),-h-89+i*5.5,3.2+i*.2,4)});}
      return{trunk,crown};
    }});
  sceneObjDefine({id:'ground.us-gypsum-ripple',category:'ground',weight:0,size:[110,25],box:[-60,-25,60,4],variants:4,seasonal:true,flippable:true,parts:['body'],palette:sand,shadow:false,tags:['us','gypsum','kit:arid','role:ground'],
    build(v,r){const body=[];for(let i=0;i<4;i++){const w=30+r()*26,x=(r()-.5)*9,y=-3-i*4.5;
      body.push({s:i%2?'@sand.2':'@grain.0',w:.7+i*.18,op:.24+r()*.14,d:`M${R(x-w)} ${R(y)}q${R(w*.7)} -4 ${R(w*1.2)} -2t${R(w*.7)} 1`,detail:i>1});}return{body};}});
  sceneObjDefine({id:'ground.us-gypsum-crust',category:'ground',weight:0,size:[57,16],box:[-30,-16,30,4],variants:4,seasonal:true,flippable:true,parts:['body'],palette:sand,shadow:false,tags:['us','gypsum','kit:arid','role:ground'],
    build(v,r){const body=[];for(let i=0;i<7;i++){const x=(r()-.5)*49,y=-r()*11,w=1+r()*3;body.push({f:i%3?'@grain.1':'@grain.0',op:.3+r()*.3,d:D.poly([[x-w,y],[x,y-1-r()*2],[x+w*1.4,y],[x+1,y+1]]),detail:i>3});}return{body};}});
  sceneObjDefine({id:'animal.us-pale-earless-lizard',category:'animal',weight:0,size:[76,30],box:[-43,-30,43,4],variants:2,seasonal:false,flippable:true,parts:['body','head','legs'],palette:{base:{skin:['#c5bfa6','#e4dec8','#938e80'],eye:'#393b38'}},shadow:{rx:19,ry:2,h:8},
    anim:{walk:{part:'legs',pivot:[0,-8],deg:14,period:.28},turn:{part:'head',pivot:[16,-11],deg:5,period:4.9,hold:.7}},tags:['us','white-sands','kit:arid','role:animal'],
    build(v){return{body:[{f:'@skin.2',d:'M-16-10Q-28-9-41-2Q-28-7-16-15z'},{f:'@skin.0',d:'M-20-12Q-10-22 8-18L22-13 21-7Q-2-2-15-7z'},{f:'@skin.1',d:'M-12-15Q3-20 17-12Q1-8-12-15z'},{s:'@skin.2',w:1,op:.6,d:'M-9-15l2 3m5-4 2 3m4-3 2 3'}],head:[{f:'@skin.0',d:'M17-15L29-16 37-10 29-5 18-7z'},{f:'@skin.1',d:'M23-14L29-15 34-11 27-10z'},{f:'@eye',d:D.circ(29,-12,1)}],legs:[{s:'@skin.2',w:2,cap:'round',d:'M-10-11l-8-6-8 2m16 5-4 10-8 2M11-12l6-11 8-2m-11 16 6 9 8 1'}]};}});
})();
