/* Native geometry for Chicago skyline over the lake, Illinois. Original subject, no painting import.
   Draft composition lives in the matching 71 file. */
(function(){
 const D=sceneD,F=n=>Math.round(n*10)/10;
 sceneObjDefine({id:"landmark.us-il-skyline",category:"landmark",weight:0,size:[1020,606],variants:1,seasonal:false,shapeBySeason:false,flippable:false,parts:["body","lit"],palette:{"base":{"stone":["#d9d6c7","#a6aaa5","#707c7e"],"metal":["#e9eee8","#a2b9bd","#556f79"],"glass":["#2c6377","#91bdc6","#173c50"],"wood":["#84513c","#ba7751","#573a31"],"roof":["#2f4953","#657982"],"accent":"#a94938","white":"#eef1e8","black":"#223237","water":"#a0d6da","soil":["#877754","#b8a17a","#5c5e42"]},"spring":{},"summer":{},"autumn":{},"winter":{"stone":["#d9e1df","#a9b8bb","#7c8f98"]}},night:{glow:{window:'#ffdc97',lamp:'#ffe5a9'},on:.78},shadow:{rx:367,ry:9,h:490},reflect:true,tags:["landmark","signature","place:us/state:IL","us","us-midwest"],
 build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),L=(f,d,op)=>lit.push({f,d,op}),W=(x,y,w,h)=>body.push({f:'@glass.1',d:D.rect(x,y,w,h),glow:'window',detail:true});
 ((D,F,P,S,L,W)=>{
 const towers=[[-440,104,217],[-317,122,323],[-166,126,425],[9,146,490],[192,96,254],[322,110,366]];
 for(let k=0;k<towers.length;k++){const[x,w,h]=towers[k];
 if(k===2){P('@glass.2','M'+x+' 0L'+(x+20)+' '+(-h)+'H'+(x+w-20)+'L'+(x+w)+' 0Z');P('@glass.0','M'+x+' 0L'+(x+20)+' '+(-h)+'H'+(x+w*.61)+'L'+(x+w*.65)+' 0Z');P('@metal.2','M'+(x+w*.65)+' 0L'+(x+w*.61)+' '+(-h)+'H'+(x+w-20)+'L'+(x+w)+' 0Z');}
 else if(k===3){P('@glass.2','M9 0V-340H25V-419H49V-490H121V-453H140V-373H155V0Z');P('@glass.0','M9 0V-340H25V-419H49V-490H85V0Z');P('@metal.2','M121-453H140V-373H155V0H121Z');P('@glass.0',D.rect(85,-453,35,453));}
 else {P('@glass.2',D.rect(x,-h,w,h));P('@glass.0',D.rect(x,-h,w*.65,h));P('@metal.2',D.rect(x+w*.72,-h,w*.28,h));}if(k===2)S('@metal.1',2,'M'+x+' -1L'+(x+20)+' '+(-h)+'H'+(x+w-20),.85);else if(k!==3)S('@metal.1',2,`M${x}-1V${-h}h${w}`,1);
 for(let r=0;r<Math.floor(h/22)-1;r++)for(let c=0;c<4;c++){const xx=x+10+c*w*.21,yy=-h+15+r*22;if(k===2&&(xx<x+20*(-yy/h)||xx+6>x+w-20*(-yy/h)))continue;if(k===3&&(yy<-419&&(xx<49||xx+6>121)||yy<-340&&yy>=-419&&(xx<25||xx+6>140)))continue;W(xx,yy,6,6);}
 if(k===2){S('@metal.2',2,'M'+(x+23)+' '+(-h)+'v-66M'+(x+w-23)+' '+(-h)+'v-82');}if(k===2)for(let r=0;r<6;r++){const y=-h+r*h/6,top=8+20*(-y/h),bot=8+20*(-(y+h/6)/h);S('@metal.1',4,`M${F(x+top)} ${F(y+5)}L${F(x+w-bot)} ${F(y+h/6-5)}M${F(x+w-top)} ${F(y+5)}L${F(x+bot)} ${F(y+h/6-5)}`,.9);}
 if(k===3){P('@glass.2',D.rect(52,-527,32,37));P('@glass.0',D.rect(87,-561,31,71));S('@metal.2',2,'M62-527v-58M102-561v-45');}}
 for(let i=0;i<14;i++)L('#ffe7b0',D.rect(-437+i*68,-3,20,2),.85);
})(D,F,P,S,L,W,body,lit,r,ctx);// Window grids retain their geometry while sharing a few paint paths.
 const compactWindows=body.filter(q=>q.glow==='window');if(compactWindows.length>55){const keep=body.filter(q=>q.glow!=='window'),groups=Array.from({length:40},()=>[]);compactWindows.forEach((q,i)=>groups[i%40].push(q.d));for(const paths of groups)keep.push({f:'@glass.1',d:paths.join(''),glow:'window',detail:true});body.splice(0,body.length,...keep);}
 return{body,lit};}});
 
})();
/* Native The Chicago skyline from the lake; original location subject, modeled facets and real detail.
   Explicit placement only; draft scene stays under independent review. */
(function(){const D=sceneD,F=n=>Math.round(n*10)/10;sceneObjDefine(Object.assign({"id":"building.us-chicago-lakefront-depth","category":"building","weight":0,"size":[1460,240],"variants":1,"seasonal":false,"shapeBySeason":false,"flippable":false,"parts":["body","lit"],"palette":{"base":{"stone":["#d5d4c7","#9aa8a4","#586d75"],"snow":["#f4f0dd","#b9d8df","#7ea7c1"],"soil":["#88734e","#b7a171","#51483a"],"wood":["#8b523c","#be845c","#4c3a31"],"leaf":["#3b6849","#648851","#294b3b"],"metal":["#c0ccc5","#8eaaa9","#638995"],"glass":["#83a6af","#b2c7c7","#668c9a"],"red":["#b35342","#d8835c","#783c37"],"white":"#f2f0df","black":"#1e333d","water":["#afd5d7","#729fae","#3f687c"],"light":"#ffe1a7"},"spring":{},"summer":{},"autumn":{"leaf":["#8d824a","#aea264","#59613f"]},"winter":{"stone":["#d4dedd","#b2c2c5","#788f9c"],"snow":["#f3f4eb","#d1e5e6","#9ebdcd"],"leaf":["#607a6e","#8ca094","#3d5a51"],"soil":["#c7d3d0","#dbe3df","#8ba09a"]}},"shadow":{"rx":496.40000000000003,"ry":8,"h":240},"reflect":true,"tags":["place:us/state:IL","us","us-midwest","kit:urban","role:building-far"],"night":{"glow":{"window":"#899d97","lamp":"#a8b7a2"},"on":0.58}}, {build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),W=(x,y,w,h)=>body.push({f:'@glass.1',d:D.rect(x,y,w,h),glow:'window',detail:true}),L=(f,d,op)=>lit.push({f,d,op});const extra=(function(D,F,P,S,W,L,body){
 const t=[[-725,73,89],[-633,91,128],[-522,68,181],[-434,98,139],[-318,73,209],[-227,82,128],[-126,96,163],[-11,81,109],[88,97,168],[208,73,231],[300,91,158],[413,71,108],[505,86,179],[612,102,131]];
 for(let j=0;j<t.length;j++){const [x,w,h]=t[j];P('@glass.0',D.rect(x,-h,w,h));P('@glass.2',D.rect(x+w*.73,-h+6,w*.27,h-6));P('@metal.1',D.rect(x+5,-h-8,w-10,8));if(j===4||j===9)P('@metal.2',D.rect(x+w*.4,-h-19,w*.2,11));for(let c=0;c<3;c++){let q='';for(let k=0;k<Math.floor(h/15)-1;k++)q+=D.rect(x+8+c*w*.27,-h+10+k*15,4,5);body.push({f:'@glass.1',d:q,glow:'window',detail:true});}S('@metal.1',1,'M'+(x+4)+' -2V'+(-h+5),.5);}
})(D,F,P,S,W,L,body,lit,r,ctx,v);const out=Object.assign({body,lit},extra||{});for(const shapes of Object.values(out))if(Array.isArray(shapes))for(const q of shapes)if(q.d)q.d=q.d.replace(/-?\d+\.\d+/g,n=>String(Math.round(Number(n)*10)/10));return out;}}));})();
/* Native The Chicago skyline from the lake; original location subject, modeled facets and real detail.
   Explicit placement only; draft scene stays under independent review. */
(function(){const D=sceneD,F=n=>Math.round(n*10)/10;sceneObjDefine(Object.assign({"id":"prop.us-navy-pier-wheel","category":"prop","weight":0,"size":[146,162],"variants":1,"seasonal":false,"shapeBySeason":false,"flippable":false,"parts":["body","wheel","lit"],"palette":{"base":{"stone":["#d5d4c7","#9aa8a4","#586d75"],"snow":["#f4f0dd","#b9d8df","#7ea7c1"],"soil":["#88734e","#b7a171","#51483a"],"wood":["#8b523c","#be845c","#4c3a31"],"leaf":["#3b6849","#648851","#294b3b"],"metal":["#bac5ba","#8ca7a8","#65848a"],"glass":["#2d657b","#88b7c9","#193c53"],"red":["#ac9290","#c3b2a5","#818f89"],"white":"#f2f0df","black":"#1e333d","water":["#afd5d7","#729fae","#3f687c"],"light":"#ffe1a7"},"spring":{},"summer":{},"autumn":{"leaf":["#8d824a","#aea264","#59613f"]},"winter":{"stone":["#d4dedd","#b2c2c5","#788f9c"],"snow":["#f3f4eb","#d1e5e6","#9ebdcd"],"leaf":["#607a6e","#8ca094","#3d5a51"],"soil":["#c7d3d0","#dbe3df","#8ba09a"]}},"shadow":{"rx":49.64,"ry":8,"h":162},"reflect":true,"tags":["place:us/state:IL","us","us-midwest","kit:urban","role:street"],"anim":{"spin":{"part":"wheel","pivot":[0,-83],"period":47}},"night":{"glow":{"window":"#ffe0a4","lamp":"#ffe6b5","lava":"#f36a26"},"on":0.8}}, {build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),W=(x,y,w,h)=>body.push({f:'@glass.1',d:D.rect(x,y,w,h),glow:'window',detail:true}),L=(f,d,op)=>lit.push({f,d,op});const extra=(function(D,F,P,S,W,L,body){const wheel=[];
 S('@metal.2',4,'M-54 0L-9-76H9L54 0M-37-23H37');P('@metal.1',D.circ(0,-83,5));
 wheel.push({s:'@metal.1',w:3,d:D.circ(0,-83,68)},{s:'@metal.0',w:1.2,d:D.circ(0,-83,61)});
 for(let i=0;i<24;i++){const a=i*Math.PI/12,x=Math.cos(a)*68,y=-83+Math.sin(a)*68;wheel.push({s:'@metal.1',w:.8,d:'M0-83L'+F(x)+' '+F(y)},{f:'@red.'+(i%3),d:D.rect(x-3,y-2,6,5,1)},{f:'@metal.0',d:D.circ(x,y,1.3),glow:'lamp',detail:true});}return{wheel};
})(D,F,P,S,W,L,body,lit,r,ctx,v);const out=Object.assign({body,lit},extra||{});for(const shapes of Object.values(out))if(Array.isArray(shapes))for(const q of shapes)if(q.d)q.d=q.d.replace(/-?\d+\.\d+/g,n=>String(Math.round(Number(n)*10)/10));return out;}}));})();

/* The elevated railway is part of this skyline's original story.
   Native steelwork and an unbranded silver train, explicit placement only. */
(function(){
 const D=sceneD,F=n=>Math.round(n*10)/10;
 sceneObjDefine({id:'structure.us-chicago-l-trestle',category:'structure',weight:0,
  size:[1920,56],box:[-962,-107,962,-49],variants:1,seasonal:false,flippable:false,parts:['body','lit'],
  palette:{base:{steel:['#597888','#35596e','#244655'],foot:['#8eabae','#5d7b82'],light:'#e5dfbb'},spring:{},summer:{},autumn:{},winter:{}},
  tags:['kit:urban','role:street','us','place:us/state:IL'],night:{glow:{lamp:'#cad6bb'},on:.8},reflect:false,
  build(){const body=[],lit=[];
   body.push({f:'@steel.1',d:D.rect(-960,-79,1920,27)},{f:'@steel.0',d:D.rect(-960,-82,1920,4)},{f:'@steel.2',d:D.rect(-960,-55,1920,5)});
   let braces='',posts='';
   for(let x=-960;x<960;x+=64){braces+='M'+x+' -77l32 23 32-23';posts+='M'+x+' -82v-18';}
   body.push({s:'@steel.0',w:2.8,d:braces},{s:'@steel.1',w:1.3,d:posts},{s:'@steel.0',w:1.4,d:'M-960-100H960'});
   for(let i=0;i<11;i++){
    const x=-907+i*181.4;
    body.push({f:'@steel.0',d:D.rect(F(x-1),-105,3,5),glow:'lamp',detail:true});
   }
   return{body,lit};
  }
 });
 // Individual columns have real contacts and narrow cast shadows. The suspended
 // deck must not project one enormous oval over the lake behind the railway.
 sceneObjDefine({id:'structure.us-chicago-l-pier',category:'structure',weight:0,
  size:[120,94],box:[-23,-94,97,2],variants:1,seasonal:false,flippable:false,parts:['body'],
  palette:{base:{steel:['#597888','#35596e','#244655'],foot:['#8eabae','#5d7b82']},spring:{},summer:{},autumn:{},winter:{}},
  tags:['kit:urban','role:street','us','place:us/state:IL','row','unlit'],shadow:{rx:11,ry:2,h:91},reflect:false,
  build(){return{body:[{f:'@steel.2',d:D.poly([[-10,-91],[10,-91],[13,0],[-13,0]])},
   {f:'@steel.0',d:D.poly([[-10,-91],[-3,-91],[-3,0],[-13,0]])},
   {f:'@foot.1',d:D.rect(-22,-8,44,9)},
   {s:'@steel.1',w:2.5,d:'M10-77L95-15',detail:true}]};}
 });
 sceneObjDefine({id:'vehicle.us-chicago-elevated-train',category:'vehicle',weight:0,
  size:[470,53],box:[-237,-54,237,2],variants:1,seasonal:false,flippable:true,parts:['body','lit'],
  palette:{base:{metal:['#b8c9cb','#7f9ea8','#3b5c70'],glass:['#385a76','#91b2bb'],stripe:'#a97769',wheel:'#294553'},spring:{},summer:{},autumn:{},winter:{}},
  night:{glow:{window:'#f0d7a4',lamp:'#eadab4',tail:'#b75b60'},on:1},shadow:{rx:157,ry:5,h:53},reflect:false,
  tags:['kit:urban','role:vehicle','us','place:us/state:IL'],
  build(){const body=[],lit=[];let windows='';
   for(let j=0;j<3;j++){
    const x=-234+j*158;
    body.push({f:'@metal.2',d:D.rect(x,-47,152,43,6)},
      {f:'@metal.0',d:D.rect(x+1,-46,150,35,5)},
      {f:'@metal.1',d:D.rect(x+4,-52,140,8,4)},
      {f:'@stripe',d:D.rect(x+1,-17,150,3)},
      {f:'@metal.2',d:D.rect(x+10,-8,132,5)});
    for(let k=0;k<5;k++){
     const xx=x+10+k*28;
     windows+=D.rect(xx,-39,20,14,2);
     body.push({s:'@metal.1',w:.8,d:'M'+F(xx-2)+' -40v27h24v-27',detail:true});
    }
    for(const a of[24,116])body.push({f:'@wheel',d:D.circ(x+a,-3,5)},{f:'@metal.1',d:D.circ(x+a,-3,2),detail:true});
    if(j<2)body.push({f:'@wheel',d:D.rect(x+151,-15,8,6)});
   }
   body.push({f:'@glass.0',d:windows,glow:'window'});
   body.push({f:'@metal.1',d:D.rect(217,-41,12,19,2)},{f:'@glass.1',d:D.rect(219,-39,8,12),glow:'window'});
   body.push({f:'@metal.0',d:D.circ(230,-20,1.7),glow:'lamp'});
   body.push({f:'@metal.2',d:D.circ(-232,-20,1.4),glow:'tail'});
   return{body,lit};
  }
 });
})();
