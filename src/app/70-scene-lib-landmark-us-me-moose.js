/* Native hero refined from selected geometry of us-northeast/me-moose.
    Geometry is a place object, not the old full painting. */
(function(){
  sceneObjDefine({id:'landmark.us-me-moose',category:'landmark',weight:0,size:[272,433],variants:1,seasonal:false,flippable:false,
    parts:['body','lit'],night:{glow:{window:'#ffd99b',lamp:'#ffe6ae'},on:.75},shadow:{rx:76,ry:8,h:433},reflect:true,
    tags:['landmark','us','place:us/state:ME'],credit:'native geometry refined from us-northeast/me-moose',
    build(){const m=[1,0,0,1,-1010,-635],body=[{"f":"#f1ece4","d":"M900 628V566h132v62z","m":[1,0,0,1,-1010,-635]},{"f":"#9c4437","d":"M890 566L966 528L1042 566z","m":[1,0,0,1,-1010,-635]},{"f":"#3a2f2c","d":"M888 568h156v8H888z","m":[1,0,0,1,-1010,-635]},{"f":"#ebe3d6","d":"M1010 628V586h60v42z","m":[1,0,0,1,-1010,-635]},{"f":"#52606c","d":"M918 584h22v26h-22z","m":[1,0,0,1,-1010,-635]},{"f":"#52606c","d":"M954 584h22v26h-22z","m":[1,0,0,1,-1010,-635]},{"f":"#52606c","d":"M990 584h22v26h-22z","m":[1,0,0,1,-1010,-635]},{"f":"#789397","d":"M922 584h14a4 4 0 0 1 4 4v18a4 4 0 0 1 -4 4h-14a4 4 0 0 1 -4 -4v-18a4 4 0 0 1 4 -4z","glow":"window","m":[1,0,0,1,-1010,-635]},{"f":"#789397","d":"M958 584h14a4 4 0 0 1 4 4v18a4 4 0 0 1 -4 4h-14a4 4 0 0 1 -4 -4v-18a4 4 0 0 1 4 -4z","glow":"window","m":[1,0,0,1,-1010,-635]},{"f":"#f4efe6","d":"M1042 626L1059 330H1121L1138 626z","m":[1,0,0,1,-1010,-635]},{"f":"#d9d2c6","d":"M1104 626L1114 330H1121L1138 626z","m":[1,0,0,1,-1010,-635]},{"f":"#4c5560","d":"M1076 420h12v20h-12z","m":[1,0,0,1,-1010,-635]},{"f":"#4c5560","d":"M1078 500h14v22h-14z","m":[1,0,0,1,-1010,-635]},{"f":"#3c444e","d":"M1080 580h18v30h-18z","m":[1,0,0,1,-1010,-635]},{"f":"#2d3238","d":"M1034 330h112v10h-112zM1040 322h100v8h-100z","m":[1,0,0,1,-1010,-635]},{"d":"M1038 322v-16M1062 322v-16M1090 322v-16M1118 322v-16M1142 322v-16M1038 306H1142","s":"#2d3238","w":3,"m":[1,0,0,1,-1010,-635]},{"f":"#789397","d":"M1058 268h64v38h-64z","glow":"window","m":[1,0,0,1,-1010,-635]},{"d":"M1079 268v38M1101 268v38M1058 287H1122","s":"#2d3238","w":4,"m":[1,0,0,1,-1010,-635]},{"f":"#a8372d","d":"M1050 268L1090 226L1130 268z","m":[1,0,0,1,-1010,-635]},{"f":"#2d3238","d":"M1085 226h10v-14h-10z","m":[1,0,0,1,-1010,-635]},{"f":"#2d3238","d":"M1084 208a6 6 0 1 0 12 0a6 6 0 1 0 -12 0z","m":[1,0,0,1,-1010,-635]}],lit=[];

      // Narrow limestone courses, recesses and wrought-iron balcony stay native.
      for(let y=346;y<625;y+=12){const w=31+(y-330)/296*17;body.push({s:'#b4afa1',w:.9,op:.65,d:'M'+(1090-w)+' '+y+'H'+(1090+w),m,detail:y%24!==10});}
      for(let y=350;y<620;y+=24)body.push({s:'#c5bca8',w:.7,d:'M1082 '+y+'v8m24 4v8',m,detail:true});
      for(const y of [420,500,580])body.push({s:'#e5ddca',w:2,d:'M1074 '+(y+22)+'h24',m});
      for(let x=1040;x<=1140;x+=10)body.push({s:'#263c41',w:1.6,d:'M'+x+' 306v16',m});
      for(let i=0;i<6;i++){const x=1058+(i%3)*21,y=269+Math.floor(i/3)*19;body.push({f:'#d6d4bb',d:'M'+x+' '+y+'h19v17h-19z',m,glow:'window'});}
      for(const x of [918,954,990])for(let i=0;i<4;i++)body.push({f:'#94afb4',d:'M'+(x+(i%2)*11)+' '+(584+Math.floor(i/2)*13)+'h9v11h-9z',m,glow:'window'});
      body.push({s:'#f9f0db',w:3,d:'M1059 342l-15 278M900 628h169',m},{s:'#cf9b79',w:1.1,d:'M908 558l58-26 60 26',m});
      lit.push({f:{lin:[[0,'#ffd27d',0],[.72,'#ffd27d',.4],[1,'#ffe9ab']],x1:370,x2:1090,y1:280,y2:280},op:.16,d:'M1090 282L383 238Q360 285 383 337L1090 292z',m},
        {f:'#ffe3a1',op:.14,d:'M1053 305v-39h74v39z',m});
      return{body,lit};
    }});
  sceneObjDefine({id:'rock.us-maine-islet',category:'rock',weight:0,size:[666,118],variants:1,seasonal:true,shapeBySeason:true,flippable:false,
    palette:{base:{rock:['#5b7778','#81928a','#a8ada0'],grass:'#465d4c'},spring:{grass:'#507455'},summer:{grass:'#4c6949'},autumn:{grass:'#766e4a'},winter:{rock:['#668389','#91a6a0','#c1ccc2'],grass:'#7c978a'}},
    parts:['body'],reflect:true,shadow:false,tags:['us','maine','natural','kit:temperate','role:rock'],
    build(){const body=[{f:'@rock.0',d:'M-333 0L-280-13-252-28-212-25-189-41-150-48-123-40-89-62-42-67 2-91 34-84 71-71 99-77 137-55 175-49 207-35 252-27 280-11 333 0z'},
      {f:'@rock.1',d:'M-280-13L-212-25-189-41-150-48-123-40-164-17-89-26-42-67 2-91 34-84-8-56 36-30 99-77 137-55 113-25 207-35 252-27 218-12 143-8 78-19 17-9-58-17-128-7z'},
      {f:'@grass',d:'M-212-25L-189-41-150-48-123-40-89-62-42-67 2-91 34-84 71-71 99-77 137-55 175-49 150-39 106-54 65-48 22-66-12-61-39-43-83-41-115-25-164-29z'}];
      let fissures='';for(let i=0;i<29;i++){const x=-250+i*18,y=-13-(i%7)*6;fissures+=`M${x} ${y}l${9+i%5*2} ${-6-i%4*3}m-4 13l16-3`;}
      body.push({s:'@rock.2',w:1.2,op:.42,d:fissures,detail:true},{s:'@rock.0',w:2,d:'M-55-64l24 14-18 27M53-67l-16 29 31 20M159-45l-24 18 41 11'});return{body};}});
  // Broken foam follows the granite's wet edge; unequal swells stay out at sea.
  sceneObjDefine({id:'ground.us-maine-surf',category:'ground',weight:0,size:[720,260],variants:1,seasonal:false,flippable:false,parts:['body'],
    anim:{paddle:{part:'body',pivot:[0,-95],dy:1.2,period:8.3}},shadow:false,reflect:false,tags:['us','maine','natural','kit:water','role:edge'],
    build(){const m=[1,0,0,1,-480,-850];return{body:[
      {s:'#cfdfd6',w:3.1,op:.58,d:'M343 842q29-7 47-16m12-10 19-13M435 790q20-12 36-23m15-10q22-15 45-21M549 730l31-12m16-6 35-13m15-4q27-13 52-16m16-5 27-2',m},
      {s:'#a8c9cc',w:1.5,op:.5,d:'M334 830l39-11m34-19 32-20M473 749l43-24m41-10 33-9M615 693q24-12 52-17M141 696q53-4 103 1m27 8 61-1M69 746q44-5 89-2m58 2 77-4M181 786q44-4 72-2',m},
      {s:'#d5e4d9',w:1.1,op:.35,d:'M113 706h51m62 5 28-1M86 758l39-1m57 4 43-1M293 804q20-4 40-5M490 759l29-15m60-28 31-9',m}]};}});
  const fishing=sceneObj('boat.fishing-boat');
  sceneObjDefine({id:'boat.us-maine-fishing',category:'boat',weight:0,size:[250,214],variants:3,seasonal:false,flippable:true,
    palette:fishing.palette,parts:['reflection','wake','body'],night:fishing.night,anim:fishing.anim,reflect:true,tags:['us','maine','kit:boats','role:boat'],
    build(v,r,ctx){const p=fishing.build(v,r,ctx),reflection=[];for(const raw of p.body){const sh=Array.isArray(raw)?{f:raw[0],d:raw[1],op:raw[2]}:{...raw};
      if(sh.f)reflection.push({...sh,glow:undefined,op:(sh.op??1)*.2,m:[1,0,0,-.25,0,16]});}
      return{reflection,wake:[{s:'#bdd3cf',w:2.2,op:.5,d:'M-168 17q28-5 54-2m213 4q31 4 60-2M-151 29q38-4 60-1m57 15q35 3 69-2'}],body:p.body};}});
})();
