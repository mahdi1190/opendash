/* Native geometry for Riverfront towers at dawn, Detroit. Original subject, no painting import.
   Draft composition lives in the matching 71 file. */
(function(){
 const D=sceneD,F=n=>Math.round(n*10)/10;
 sceneObjDefine({id:"landmark.us-detroit-ren-cen",category:"landmark",weight:0,size:[710,510],variants:1,seasonal:false,shapeBySeason:false,flippable:false,parts:["body","lit"],palette:{"base":{"stone":["#d9d6c7","#a6aaa5","#707c7e"],"metal":["#e9eee8","#a2b9bd","#556f79"],"glass":["#2c6377","#91bdc6","#173c50"],"wood":["#84513c","#ba7751","#573a31"],"roof":["#2f4953","#657982"],"accent":"#a94938","white":"#eef1e8","black":"#223237","water":"#a0d6da","soil":["#877754","#b8a17a","#5c5e42"]},"spring":{},"summer":{},"autumn":{},"winter":{"stone":["#d9e1df","#a9b8bb","#7c8f98"]}},night:{glow:{window:'#ffdc97',lamp:'#ffe5a9'},on:.78},shadow:{rx:256,ry:9,h:510},reflect:true,tags:["landmark","signature","place:us/place:detroit","us","us-midwest"],
 build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),L=(f,d,op)=>lit.push({f,d,op}),W=(x,y,w,h)=>body.push({f:'@glass.1',d:D.rect(x,y,w,h),glow:'window',detail:true});
 ((D,F,P,S,L,W)=>{
 const ts=[[-290,104,290],[-155,115,367],[-35,134,510],[112,118,355],[252,101,280]];
 for(const[x,w,h]of ts){P('@glass.2',`M${x} 0V${-h+14}Q${x+w/2} ${-h-12} ${x+w} ${-h+14}V0Z`);P('@glass.0',D.rect(x+w*.16,-h+9,w*.43,h-9));P('@glass.1',D.rect(x+w*.27,-h+9,w*.1,h-9),.35);P('@metal.2',D.ell(x+w*.5,-h+10,w*.5,13));S('@metal.1',2,`M${x+w*.16} -2V${-h+12}`,.7);
 for(let r=0;r<Math.floor(h/12);r++){const y=-h+22+r*12;S('@metal.1',1,`M${x+2} ${y}h${w-4}`,.55,true);for(let c=0;c<4;c++)W(x+11+c*22,y+2,5,3);}}
 P('@metal.2',D.rect(-300,-25,664,25));for(let i=0;i<14;i++)L('#ffe0a4',D.rect(-290+i*47,-19,13,5),.85);
})(D,F,P,S,L,W,body,lit,r,ctx);// Window grids retain their geometry while sharing a few paint paths.
 const compactWindows=body.filter(q=>q.glow==='window');if(compactWindows.length>55){const keep=body.filter(q=>q.glow!=='window'),groups=Array.from({length:40},()=>[]);compactWindows.forEach((q,i)=>groups[i%40].push(q.d));for(const paths of groups)keep.push({f:'@glass.1',d:paths.join(''),glow:'window',detail:true});body.splice(0,body.length,...keep);}
 return{body,lit};}});
 
})();
/* Native The Renaissance Center; original location subject, modeled facets and real detail.
   Explicit placement only; draft scene stays under independent review. */
(function(){const D=sceneD,F=n=>Math.round(n*10)/10;sceneObjDefine(Object.assign({"id":"building.us-detroit-river-depth","category":"building","weight":0,"size":[1410,260],"variants":1,"seasonal":false,"shapeBySeason":false,"flippable":false,"parts":["body","lit"],"palette":{"base":{"stone":["#adb9ac","#8fa7a1","#6a8990"],"snow":["#f4f0dd","#b9d8df","#7ea7c1"],"soil":["#88734e","#b7a171","#51483a"],"wood":["#8b523c","#be845c","#4c3a31"],"leaf":["#3b6849","#648851","#294b3b"],"metal":["#edf0e8","#a9bfc4","#587681"],"glass":["#86a4a9","#bdc9bc","#61838f"],"red":["#b35342","#d8835c","#783c37"],"white":"#f2f0df","black":"#1e333d","water":["#afd5d7","#729fae","#3f687c"],"light":"#ffe1a7"},"spring":{},"summer":{},"autumn":{"leaf":["#8d824a","#aea264","#59613f"]},"winter":{"stone":["#d4dedd","#b2c2c5","#788f9c"],"snow":["#f3f4eb","#d1e5e6","#9ebdcd"],"leaf":["#607a6e","#8ca094","#3d5a51"],"soil":["#c7d3d0","#dbe3df","#8ba09a"]}},"shadow":{"rx":479.40000000000003,"ry":8,"h":260},"reflect":true,"tags":["place:us/place:detroit","us","us-midwest","kit:urban","role:building-far"],"night":{"glow":{"window":"#899d97","lamp":"#a8b7a2"},"on":0.58}}, {build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),W=(x,y,w,h)=>body.push({f:'@glass.1',d:D.rect(x,y,w,h),glow:'window',detail:true}),L=(f,d,op)=>lit.push({f,d,op});const extra=(function(D,F,P,S,W,L,body){
 const t=[[-704,117,126],[-564,114,204],[-424,91,255],[-310,89,149],[-197,106,184],[-68,96,115],[50,109,143],[181,126,238],[331,101,170],[456,88,117],[566,134,155]];
 for(let j=0;j<t.length;j++){const [x,w,h]=t[j];P('@stone.1',D.rect(x,-h,w,h));P('@glass.0',D.rect(x+5,-h+4,w*.68,h-4));P('@stone.2',D.rect(x+w*.76,-h+8,w*.24,h-8));
  if(j===2){P('@stone.1','M'+x+' '+(-h)+'l16-24h'+(w-32)+'l16 24Z');P('@stone.2',D.rect(x+15,-h-28,w-30,8));}
  if(j===7){P('@stone.0',D.rect(x+11,-h-19,w-22,19));P('@stone.1',D.rect(x+29,-h-35,w-58,16));}
  for(let c=0;c<4;c++){let q='';for(let k=0;k<Math.floor(h/17)-1;k++)q+=D.rect(x+9+c*w*.22,-h+12+k*17,4.5,6);body.push({f:'@glass.1',d:q,glow:'window',detail:true});}for(let k=1;k<5;k++)S('@stone.0',.8,'M'+F(x+w*k/5)+' -3V'+(-h+5),.45,true);
 }
})(D,F,P,S,W,L,body,lit,r,ctx,v);const out=Object.assign({body,lit},extra||{});for(const shapes of Object.values(out))if(Array.isArray(shapes))for(const q of shapes)if(q.d)q.d=q.d.replace(/-?\d+\.\d+/g,n=>String(Math.round(Number(n)*10)/10));return out;}}));})();
