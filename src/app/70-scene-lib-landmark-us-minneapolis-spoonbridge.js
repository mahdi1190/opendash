/* Native Spoonbridge and Cherry: a narrow arched handle, shallow
   horizontal bowl, seated red cherry and its small stem fountain. */
(function(){
 const D=sceneD,F=n=>Math.round(n*10)/10;
 sceneObjDefine({id:'landmark.us-minneapolis-spoonbridge',category:'landmark',weight:0,
  size:[740,260],box:[-362,-262,376,20],variants:1,seasonal:true,shapeBySeason:true,
  flippable:false,parts:['body','spray','lit'],
  palette:{base:{metal:['#e4ede7','#a1b8bf','#4a6779'],accent:['#bc2938','#df5c51','#761c35'],stem:['#495f66','#8da8a9'],water:['#d6e8e7','#9cc4cf'],snow:['#eef4ed','#bdced5']},spring:{},summer:{},autumn:{metal:['#e5e5d1','#a8b8b8','#566b79']},winter:{metal:['#d7e3e1','#a6bdc6','#54748a'],snow:['#f1f5ed','#c0d5dd']}},
  anim:{flicker:{part:'spray',period:3.8,lo:.58}},
  night:{glow:{lamp:'#d5e1ca'},on:1},shadow:{rx:248,ry:7,h:260},reflect:true,
  tags:['landmark','signature','place:us/place:minneapolis','us','us-midwest'],
  build(v,r,ctx){
   const body=[],spray=[],lit=[],winter=ctx.season==='winter';
   const P=(f,d,op,detail)=>body.push({f,d,op,detail});
   const S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'});
   const outline='M-355-7C-285-12-239-45-198-96C-180-118-168-156-144-154C-120-153-77-112-34-78C9-43 47-39 97-39H323Q367-41 371-18Q368 9 323 12H99C43 11 13-10-26-42L-127-120Q-144-134-154-114C-205-44-254-3-340 14Q-356 17-355-7Z';
   P({lin:[[0,'@metal.0'],[.46,'@metal.1'],[1,'@metal.2']],x1:0,y1:-157,x2:0,y2:18},outline);
   P('@metal.2','M-348 8C-262-2-207-42-157-110Q-142-132-127-118L-28-40C14-6 46 8 100 8H323Q355 6 368-9Q363 15 323 17H100Q41 15-30-34L-129-112Q-143-126-155-106C-207-37-270 5-342 17Z',.72);
   P('@metal.0','M-351-7C-278-15-231-50-191-101Q-169-143-145-148Q-128-147-113-134Q-139-150-158-127C-210-54-272-13-350-2Z');
   P('@metal.1',D.ell(215,-34,147,14));
   P('@metal.0',D.ell(212,-38,131,8),.86);
   P('@metal.2',D.ell(215,-29,75,8),.72);
   // Subtle brushed-metal changes follow the handle's arch and bowl rim.
   for(let i=0;i<14;i++){
    const t=i/13,x=-327+204*t,y=-7-134*Math.pow(t,1.72);
    S('@metal.0',.7,'M'+F(x)+' '+F(y)+'q9-3 17-9',.3,true);
   }
   for(let i=0;i<10;i++){const x=77+i*27;S('@metal.1',.65,'M'+x+' -33q10 4 20 .5',.38,true);}
   // The cherry rests on the low bowl. Curved red facets model its volume.
   P({rad:[[0,'@accent.1'],[.44,'@accent.0'],[1,'@accent.2']],cx:188,cy:-139,r:112},D.circ(215,-111,75));
   P('#ef9a7d','M171-150Q185-168 205-160Q206-151 183-142Q174-141 171-150Z',.64);
   P('@accent.2','M254-170Q302-110 254-55Q281-109 254-170Z',.55);
   for(let i=0;i<32;i++){
    const a=i*Math.PI/16,x=215+Math.cos(a)*71,y=-111+Math.sin(a)*71;
    S(i<16?'@accent.2':'@accent.1',.6,'M'+F(x)+' '+F(y)+'q'+F(-Math.sin(a)*2.5)+' '+F(Math.cos(a)*2.5)+' '+F(-Math.cos(a)*3.2)+' '+F(-Math.sin(a)*3.2),.15,true);
   }
   S('@stem.0',11,'M207-185Q208-223 242-253',1);
   S('@stem.1',3.3,'M205-186Q207-223 240-250',.9);
   P('@stem.0',D.ell(242,-253,4.3,2));
   if(!winter){
    // The fountain is seasonal; it is dry in Minnesota winter.
    spray.push({s:'@water.1',w:1.3,d:'M242-253Q257-278 272-242M242-253Q232-269 223-244',op:.54});
    for(let i=0;i<32;i++){
     const t=i/31,x=245+22*t+Math.sin(i*2.3)*5,y=-255+83*t*t;
     spray.push({f:'@water.0',d:D.ell(F(x),F(y),.65+(i%3)*.17,1.2+(i%4)*.2),op:.52,detail:true});
    }
   }else{
    // A light snow hem changes the spoon profile without burying it.
    P('@snow.0','M-347-5Q-251-23-195-100Q-165-148-145-149Q-128-147-116-135Q-147-147-160-125Q-222-38-290-14Z',.85);
    P('@snow.0','M81-40Q211-52 345-39L338-34Q211-43 91-35Z',.9);
    for(let i=0;i<32;i++){const x=85+i*8.1,y=-38+(i%4)*1.1;P('@snow.'+(i%2),D.ell(F(x),F(y),1.9,.7),.72,true);}
   }
   // Restrained garden illumination keeps red volume and silver form
   // ahead of the cooler, deliberately muted distant city windows.
   lit.push({f:{rad:[[0,'#d27468',.94],[.5,'#a53d4c',.88],[1,'#54243b',.84]],cx:187,cy:-137,r:114},d:D.circ(215,-111,75)});
   lit.push({f:'#d49a8a',d:'M171-150Q185-168 205-160Q206-151 183-142Q174-141 171-150Z',op:.52});
   lit.push({f:'#8caabc',d:'M-351-7C-278-15-231-50-191-101Q-169-143-145-148Q-128-147-113-134Q-139-150-158-127C-210-54-272-13-350-2Z',op:.62});
   lit.push({s:'#c2d6dd',w:2.5,d:'M-355-7C-285-12-239-45-198-96C-180-118-168-156-144-154C-120-153-77-112-34-78C9-43 47-39 97-39H127',op:.72});
   lit.push({s:'#afc7d1',w:2,d:'M293-39H323Q367-41 371-18Q368 9 323 12H99',op:.58});
   lit.push({s:'#9eb7c2',w:2.5,d:'M205-186Q207-223 240-250',op:.68});
   return{body,spray,lit};
  }
 });
 sceneObjDefine({id:'plant.us-minneapolis-garden-perennial',category:'plant',weight:0,
  size:[54,64],variants:3,seasonal:true,shapeBySeason:true,flippable:true,
  parts:['body','flowers'],palette:{base:{leaf:['#447354','#73905c'],petal:['#b58bac','#d3b0ba'],head:'#8a6c3f'},spring:{leaf:['#5d915c','#9db67a'],petal:['#c6bca3','#e0d1b3']},summer:{},autumn:{leaf:['#886f43','#b29c65'],petal:['#9c7049','#b28e66'],head:'#654d36'},winter:{leaf:['#c2cec3','#819b99'],petal:['#e2eadd','#bccfd2'],head:'#7b8980'}},
  tags:['kit:temperate','role:ground','us','place:us/place:minneapolis'],
  build(v,r,ctx){const body=[],flowers=[];for(let j=0;j<4;j++){
   const x=-19+j*12+(r()-.5)*5,h=37+r()*23-v*3;
   body.push({s:'@leaf.0',w:1.1,d:'M'+F(x*.6)+' 0Q'+F(x+5)+' '+F(-h*.5)+' '+F(x)+' '+F(-h)});
   body.push({f:'@leaf.1',d:'M'+F(x+1)+' '+F(-h*.38)+'q-17-5-16-13q13-1 17 13Z'});
   if(ctx.season==='winter')body.push({f:'@petal.0',d:D.ell(F(x),F(-h+1),4.5,2.2)});
   else if(ctx.season==='summer')for(let k=0;k<7;k++){const a=k*Math.PI*2/7;flowers.push({f:'@petal.'+(k%2),d:D.poly([[F(x),F(-h)],[F(x+Math.cos(a)*7),F(-h+Math.sin(a)*7)],[F(x+Math.cos(a+.5)*6),F(-h+Math.sin(a+.5)*6)]])});}
   flowers.push({f:'@head',d:D.ell(F(x),F(-h),ctx.season==='spring'?2.2:3.2,ctx.season==='autumn'?4.2:2.4)});
  }return{body,flowers};}
 });
})();
/* Native The Spoonbridge and Cherry; original location subject, modeled facets and real detail.
   Explicit placement only; draft scene stays under independent review. */
(function(){const D=sceneD,F=n=>Math.round(n*10)/10;sceneObjDefine(Object.assign({"id":"building.us-minneapolis-garden-depth","category":"building","weight":0,"size":[1260,346],"variants":1,"seasonal":false,"shapeBySeason":false,"flippable":false,"parts":["body","lit"],"palette":{"base":{"stone":["#b7c6b8","#90afa5","#6a9596"],"snow":["#f4f0dd","#b9d8df","#7ea7c1"],"soil":["#88734e","#b7a171","#51483a"],"wood":["#8b523c","#be845c","#4c3a31"],"leaf":["#3b6849","#648851","#294b3b"],"metal":["#edf0e8","#a9bfc4","#587681"],"glass":["#91b5b4","#c2d1c1","#6d989e"],"red":["#b35342","#d8835c","#783c37"],"white":"#f2f0df","black":"#1e333d","water":["#afd5d7","#729fae","#3f687c"],"light":"#ffe1a7"},"spring":{},"summer":{},"autumn":{"leaf":["#8d824a","#aea264","#59613f"]},"winter":{"stone":["#d4dedd","#b2c2c5","#788f9c"],"snow":["#f3f4eb","#d1e5e6","#9ebdcd"],"leaf":["#607a6e","#8ca094","#3d5a51"],"soil":["#c7d3d0","#dbe3df","#8ba09a"]}},"shadow":{"rx":428.40000000000003,"ry":8,"h":346},"reflect":true,"tags":["place:us/place:minneapolis","us","us-midwest","kit:urban","role:building-far"],"night":{"glow":{"window":"#596b73","lamp":"#8a9b9d"},"on":0.46}}, {build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),W=(x,y,w,h)=>body.push({f:'@glass.1',d:D.rect(x,y,w,h),glow:'window',detail:true}),L=(f,d,op)=>lit.push({f,d,op});const extra=(function(D,F,P,S,W,L,body){
 const t=[[-629,99,147],[-510,76,213],[-414,91,286],[-304,108,174],[-178,85,315],[-75,93,245],[39,108,193],[171,118,297],[312,84,156],[419,101,228],[539,89,133]];
 for(let j=0;j<t.length;j++){const [x,w,h]=t[j];P('@stone.2',D.rect(x,-h,w,h));P('@glass.0',D.rect(x+4,-h+5,w*.67,h-5));P('@glass.2',D.rect(x+w*.76,-h+8,w*.24,h-8));
  if(j===4){P('@stone.1','M'+x+' '+(-h)+'l16-20h'+(w-32)+'l16 20Z');P('@metal.2',D.rect(x+26,-h-30,w-52,10));}
  if(j===7){P('@glass.1',D.rect(x+15,-h-17,w-30,17));S('@metal.1',1.5,'M'+x+' '+(-h)+'h'+w);}
  if(j===1)P('@stone.1','M'+(x+5)+' '+(-h)+'l9-29h'+(w-28)+'l9 29Z');
  for(let c=0;c<3;c++){let q='';for(let k=0;k<Math.floor(h/18)-1;k++)q+=D.rect(x+10+c*w*.28,-h+11+k*18,5,7);body.push({f:'@glass.1',d:q,glow:'window',detail:true});}for(let k=0;k<4;k++)S('@metal.1',.8,'M'+F(x+w*(k+1)/5)+' -2V'+(-h+7),.42,true);
 }
})(D,F,P,S,W,L,body,lit,r,ctx,v);const out=Object.assign({body,lit},extra||{});for(const shapes of Object.values(out))if(Array.isArray(shapes))for(const q of shapes)if(q.d)q.d=q.d.replace(/-?\d+\.\d+/g,n=>String(Math.round(Number(n)*10)/10));return out;}}));})();
