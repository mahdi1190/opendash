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
      lit.push({f:'#ffd27d',op:.08,d:'M1090 288L383 238V337z',m},{f:'#ffe3a1',op:.14,d:'M1053 305v-39h74v39z',m});
      return{body,lit};
    }});
})();
