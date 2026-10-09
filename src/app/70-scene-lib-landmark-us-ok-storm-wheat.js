/* Oklahoma storm farm: an articulated steel windpump, wind-bent wheat heads,
   a layered storm shelf and a distant twisting funnel. No whole-scene sprite. */
(function () {
  const {define,poly,ell,f1}=sceneDraw;
  define({id:'structure.us-prairie-windpump',category:'structure',weight:0,size:[275,395],variants:2,seasonal:false,flippable:true,parts:['tower','rotor','lit'],shadow:{rx:76,ry:5,h:310},
    palette:{base:{steel:['#7d8f8c','#cbd1bd','#4a6463'],wood:['#87704e','#b19a6d']}},anim:{spin:{part:'rotor',pivot:[0,-291],period:12.9}},tags:['us','prairie','windpump','signature','landmark','kit:temperate','role:building-mid'],
    build(v,r){const tower=[],rotor=[],S=(s,w,d,op)=>tower.push({s,w,d,op});
      tower.push({f:'@steel.2',d:'M-62 5L-24-275-17-275-52 5zM52 5L17-275 24-275 62 5z'},{s:'@steel.1',w:2,d:'M-57 2L-20-273M57 2L20-273',op:.76});
      for(let i=0;i<12;i++){const y=-15-i*21,a=55-i*3.1,b=a-3.1;S(i%2?'@steel.0':'@steel.2',2,`M${f1(-a)} ${y}L${f1(b)} ${y-21}M${f1(a)} ${y}L${f1(-b)} ${y-21}`, .92);S('@steel.1',1.2,`M${f1(-a)} ${y}H${f1(a)}`,.76);for(const x of [-a,a])tower.push({f:'@steel.1',d:ell(x,y,1.8,1.8),detail:true});}
      S('@steel.2',3,'M-12-7V-267M0-277v-23M-25-266h50M-49-28h98');for(let i=0;i<15;i++)S('@steel.0',1.2,`M-12 ${-15-i*16}h10`,.82);
      tower.push({s:'@steel.0',w:4,d:'M4-291L96-304'},{f:'@steel.1',d:'M89-324L130-331 126-280 93-283z'},{f:'@steel.0',d:'M109-327L130-331 126-280 106-282z'},{s:'@steel.2',w:1.5,d:'M89-324L126-280M109-327L106-282'});
      const tr=(x,y,a)=>[x*Math.cos(a)-y*Math.sin(a),-291+x*Math.sin(a)+y*Math.cos(a)];
      for(let i=0;i<12;i++){const a=i*Math.PI/6+v*.13,pts=[[19,-3],[71,-16-v*3],[89,-9],[91,7],[42,12],[21,5]].map(([x,y])=>tr(x,y,a));rotor.push({f:i%2?'@steel.0':'@steel.1',d:poly(pts)},{f:'@steel.2',op:.55,d:poly([[45,9],[89,4],[91,7],[42,12]].map(([x,y])=>tr(x,y,a)))},{s:'@steel.2',w:1.4,d:poly([tr(12,0,a),tr(88,0,a)])});const p=tr(64,-7,a),q=tr(83,-6,a);rotor.push({s:'@steel.1',w:1,op:.8,d:`M${f1(p[0])} ${f1(p[1])}L${f1(q[0])} ${f1(q[1])}`,detail:true});}
      rotor.push({f:'@steel.2',d:ell(0,-291,16,16)},{f:'@steel.1',d:ell(-3,-294,10,10)},{f:'@steel.0',d:ell(0,-291,4,4)});
      const lit=[{s:'#a3bfc1',w:1.7,op:.44,d:'M-58 3L-21-274M52 2L20-274M-43-68h86M-32-153h64M-20-237h40'},{s:'#a3bfc1',w:1.2,op:.4,d:'M90-323L129-330 125-281M-11-299q9-10 20-1'}];return{tower,rotor,lit};
    }});
  define({id:'plant.us-prairie-wheat',category:'plant',weight:0,size:[85,140],variants:4,seasonal:true,shapeBySeason:true,flippable:true,parts:['stem','heads'],shadow:false,
    palette:{base:{stem:['#8e8350','#c1af73'],grain:['#c1a260','#ead49a','#8f7b49']},spring:{stem:['#66814b','#a2b777'],grain:['#8fa866','#c9ce91','#64874e']},summer:{stem:['#a29451','#d4bd70'],grain:['#cfb16b','#f0dc9b','#a0874b']},autumn:{stem:['#9e7544','#cda269'],grain:['#bd9154','#e3be83','#825f37']},winter:{stem:['#8c9a88','#bfccb5'],grain:['#b9c4a7','#dfe3c9','#829589']}},anim:{sway:{part:'heads',pivot:[0,-38],deg:2.2,period:6.7}},tags:['us','wheat','prairie','kit:temperate','role:ground'],
    build(v,r,ctx){const stem=[],heads=[];for(let i=0;i<4;i++){const x=(i-1.5)*13+(r()-.5)*10,y=-82-r()*39,lean=8+v*4;stem.push({s:'@stem.0',w:1.6,d:`M${f1(x*.6)} 3Q${f1(x-5)} -44 ${f1(x+lean)} ${f1(y+18)}`},{f:'@stem.0',d:`M${f1(x)} -36q-28-9-27-28q22 4 27 28M${f1(x+2)} -53q21-19 27-36q-25 9-27 36z`});
        const hx=x+lean,hy=y+14;heads.push({s:'@stem.1',w:1.2,d:`M${f1(hx)} ${f1(hy+5)}l5-28`});for(let j=0;j<6;j++){const yy=hy-j*4.2,xx=hx+j*.65;heads.push({f:j%2?'@grain.0':'@grain.1',d:`M${f1(xx)} ${f1(yy)}q-9-2-9-8q7 0 9 8M${f1(xx)} ${f1(yy-1)}q9-5 8-10q-7 2-8 10z`},{s:'@grain.2',w:.65,op:.8,d:`M${f1(xx-7)} ${f1(yy-6)}l-7-8M${f1(xx+6)} ${f1(yy-8)}l6-9`,detail:true});}}
      if(ctx.season==='winter')heads.push({s:'#e3e8d9',w:1.8,op:.65,d:'M-19-111l15-9M9-106l17-12'});return{stem,heads};
    }});
  define({id:'sky.us-prairie-storm-shelf',category:'sky',weight:0,size:[1780,345],variants:1,seasonal:false,flippable:false,parts:['body','rain','bolt'],shadow:false,
    palette:{base:{cloud:['#657780','#394f5d','#839198'],rain:'#9eafb0',bolt:'#dce6d6'}},anim:{bob:{part:'rain',dy:10,period:5.9},flicker:{part:'bolt',op:[.01,.38],period:9.7}},tags:['us','storm','kit:temperate','role:sky'],
    build(v,r){const body=[],rain=[],bolt=[];
      body.push({f:{lin:[[0,'@cloud.0'],[.6,'@cloud.1'],[1,'@cloud.0']],y1:-330,y2:-52},d:'M-890-33V-252Q-835-284-784-270Q-739-319-671-300Q-625-340-551-315Q-473-351-405-319Q-332-337-269-302Q-206-325-145-292Q-74-321-6-283Q71-311 139-273Q203-294 272-257Q341-279 410-237Q478-260 538-213Q623-233 684-186Q743-203 798-161Q847-170 890-133V-49Q819-31 744-52Q674-34 595-60Q509-43 429-73Q350-53 272-83Q189-67 112-99Q34-83-45-110Q-128-94-212-121Q-289-104-373-129Q-454-111-540-137Q-630-119-710-141Q-802-125-890-145z'},
        {f:'@cloud.2',op:.31,d:'M-890-193Q-807-231-727-204T-560-208T-390-192T-211-182T-31-159T149-144T329-117T509-89T689-65L744-52Q674-34 595-60Q509-43 429-73Q350-53 272-83Q189-67 112-99Q34-83-45-110Q-128-94-212-121Q-289-104-373-129Q-454-111-540-137Q-630-119-710-141Q-802-125-890-145z'});
      for(let i=0;i<37;i++){const x=-850+i*37+(r()-.5)*19,y=-98+r()*42;rain.push({s:'@rain',w:1+r(),op:.07+r()*.13,d:`M${f1(x)} ${f1(y)}l-19 ${f1(75+r()*51)}`});}
      bolt.push({s:'@bolt',w:2.1,op:.7,d:'M-393-119l-27 42 17 9-31 45 11 9-22 24',cap:'round'});return{body,rain,bolt};
    }});
  define({id:'sky.us-prairie-funnel',category:'sky',weight:0,size:[300,350],variants:1,seasonal:false,flippable:false,parts:['body'],shadow:false,
    palette:{base:{cloud:['#596f78','#889a9e','#3b5665']}},anim:{sway:{part:'body',pivot:[4,-10],deg:.7,period:10.3}},tags:['us','storm-funnel','kit:temperate','role:sky'],
    build(v,r){const body=[];body.push({f:{lin:[[0,'@cloud.2'],[.48,'@cloud.0'],[1,'@cloud.1']],x1:-95,y1:-180,x2:94,y2:-180},d:'M-140-339Q-118-291-82-269Q-51-239-58-212Q-68-178-40-149Q-8-119-14-91Q-26-58-5-30L7 0 20-3Q1-36 17-65Q33-99 10-128Q-8-154 9-187Q31-218 61-243Q95-273 137-333Q81-349 28-339Q-43-354-140-339z'},{f:'@cloud.1',op:.36,d:'M-87-313Q-54-275-24-251Q3-226-15-195Q-29-162-9-136Q16-104 6-78L-5-42 2-21-5-30Q-26-58-14-91Q-8-119-40-149Q-68-178-58-212Q-51-239-82-269Q-118-291-140-339z'});
      for(let i=0;i<17;i++){const y=-36-i*17,w=[6,7,8,8,9,11,14,15,19,24,30,36,42,50,62,76,89][i],x=[7,3,0,-2,-5,-12,-22,-28,-28,-23,-14,0,10,15,16,12,3][i];body.push({s:i%3?'@cloud.1':'@cloud.2',w:1.1,op:.3,d:`M${f1(x-w)} ${y}q${f1(w)} 7 ${f1(w*2)} 0`});}return{body};
    }});
})();
