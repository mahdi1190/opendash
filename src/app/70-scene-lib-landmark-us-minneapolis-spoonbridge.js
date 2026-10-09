/* Native geometry for Spoonbridge and Cherry, Minneapolis. Original subject, no painting import.
   Draft composition lives in the matching 71 file. */
(function(){
 const D=sceneD,F=n=>Math.round(n*10)/10;
 sceneObjDefine({id:"landmark.us-minneapolis-spoonbridge",category:"landmark",weight:0,size:[740,350],variants:1,seasonal:false,shapeBySeason:false,flippable:false,parts:["body","lit"],palette:{"base":{"stone":["#d9d6c7","#a6aaa5","#707c7e"],"metal":["#e9eee8","#a2b9bd","#556f79"],"glass":["#2c6377","#91bdc6","#173c50"],"wood":["#84513c","#ba7751","#573a31"],"roof":["#2f4953","#657982"],"accent":"#b92b2d","white":"#eef1e8","black":"#223237","water":"#a0d6da","soil":["#877754","#b8a17a","#5c5e42"]},"spring":{},"summer":{},"autumn":{},"winter":{"stone":["#d9e1df","#a9b8bb","#7c8f98"]}},night:{glow:{window:'#ffdc97',lamp:'#ffe5a9'},on:.78},shadow:{rx:266,ry:9,h:350},reflect:true,tags:["landmark","signature","place:us/place:minneapolis","us","us-midwest"],
 build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),L=(f,d,op)=>lit.push({f,d,op}),W=(x,y,w,h)=>body.push({f:'@glass.1',d:D.rect(x,y,w,h),glow:'window',detail:true});
 ((D,F,P,S,L,W)=>{
 P('@metal.2','M-359-5Q-185-70-60-97L73-176Q167-210 265-183Q344-162 358-104Q300-56 167-64L-35-62Q-194-23-359 13Z');
 P('@metal.0','M-359-10Q-181-78-61-106L73-183Q160-220 264-190Q338-169 358-111Q294-75 165-79L-39-79Q-202-27-359-1Z');
 P('@metal.1','M77-177Q179-199 263-175Q307-162 328-127Q238-97 157-103L-18-86Z');
 for(let i=0;i<26;i++){const x=-318+i*24;S('@metal.1',.9,`M${x} ${F(-19-(x+318)*.21)}l7 5`,.65,true);}
 P('@accent',D.circ(193,-225,75));P('#c64036','M139-271Q187-311 238-269Q180-284 139-246Z',.8);P('#6f242b','M235-278Q293-220 235-160Q276-214 235-278Z',.7);
 S('@black',12,'M184-292Q183-326 216-346',1);S('@wood.1',4,'M186-292Q187-321 214-343',.7);
 for(let i=0;i<48;i++){const a=i*Math.PI*2/48,x=193+Math.cos(a)*72,y=-225+Math.sin(a)*72;S(i%2?'#b7312c':'#ef6c50',.7,`M${F(x)} ${F(y)}l${F(-Math.cos(a)*6)} ${F(-Math.sin(a)*6)}`,.45,true);}
 L('#a8c2d0','M-359-10Q-181-78-61-106L73-183Q91-192 108-195L109-184Q92-180 78-172L-59-97Q-185-71-350-5Z',.3);L('#a8c2d0','M270-187Q338-169 358-111L346-119Q329-173 270-179Z',.3);
 L('#c47f75','M139-271Q187-311 238-269Q180-284 139-246Z',.24);
 lit.push({s:'#b1c8cf',w:2,op:.35,d:'M184-292Q183-326 216-346'});
})(D,F,P,S,L,W,body,lit,r,ctx);// Window grids retain their geometry while sharing a few paint paths.
 const compactWindows=body.filter(q=>q.glow==='window');if(compactWindows.length>55){const keep=body.filter(q=>q.glow!=='window'),groups=Array.from({length:40},()=>[]);compactWindows.forEach((q,i)=>groups[i%40].push(q.d));for(const paths of groups)keep.push({f:'@glass.1',d:paths.join(''),glow:'window',detail:true});body.splice(0,body.length,...keep);}
 return{body,lit};}});
 
})();
/* Native The Spoonbridge and Cherry; original location subject, modeled facets and real detail.
   Explicit placement only; draft scene stays under independent review. */
(function(){const D=sceneD,F=n=>Math.round(n*10)/10;sceneObjDefine(Object.assign({"id":"building.us-minneapolis-garden-depth","category":"building","weight":0,"size":[1260,346],"variants":1,"seasonal":false,"shapeBySeason":false,"flippable":false,"parts":["body","lit"],"palette":{"base":{"stone":["#b7c6b8","#90afa5","#6a9596"],"snow":["#f4f0dd","#b9d8df","#7ea7c1"],"soil":["#88734e","#b7a171","#51483a"],"wood":["#8b523c","#be845c","#4c3a31"],"leaf":["#3b6849","#648851","#294b3b"],"metal":["#edf0e8","#a9bfc4","#587681"],"glass":["#91b5b4","#c2d1c1","#6d989e"],"red":["#b35342","#d8835c","#783c37"],"white":"#f2f0df","black":"#1e333d","water":["#afd5d7","#729fae","#3f687c"],"light":"#ffe1a7"},"spring":{},"summer":{},"autumn":{"leaf":["#8d824a","#aea264","#59613f"]},"winter":{"stone":["#d4dedd","#b2c2c5","#788f9c"],"snow":["#f3f4eb","#d1e5e6","#9ebdcd"],"leaf":["#607a6e","#8ca094","#3d5a51"],"soil":["#c7d3d0","#dbe3df","#8ba09a"]}},"shadow":{"rx":428.40000000000003,"ry":8,"h":346},"reflect":true,"tags":["place:us/place:minneapolis","us","us-midwest","kit:urban","role:building-far"],"night":{"glow":{"window":"#899d97","lamp":"#a8b7a2"},"on":0.58}}, {build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),W=(x,y,w,h)=>body.push({f:'@glass.1',d:D.rect(x,y,w,h),glow:'window',detail:true}),L=(f,d,op)=>lit.push({f,d,op});const extra=(function(D,F,P,S,W,L,body){
 const t=[[-629,99,147],[-510,76,213],[-414,91,286],[-304,108,174],[-178,85,315],[-75,93,245],[39,108,193],[171,118,297],[312,84,156],[419,101,228],[539,89,133]];
 for(let j=0;j<t.length;j++){const [x,w,h]=t[j];P('@stone.2',D.rect(x,-h,w,h));P('@glass.0',D.rect(x+4,-h+5,w*.67,h-5));P('@glass.2',D.rect(x+w*.76,-h+8,w*.24,h-8));
  if(j===4){P('@stone.1','M'+x+' '+(-h)+'l16-20h'+(w-32)+'l16 20Z');P('@metal.2',D.rect(x+26,-h-30,w-52,10));}
  if(j===7){P('@glass.1',D.rect(x+15,-h-17,w-30,17));S('@metal.1',1.5,'M'+x+' '+(-h)+'h'+w);}
  if(j===1)P('@stone.1','M'+(x+5)+' '+(-h)+'l9-29h'+(w-28)+'l9 29Z');
  for(let c=0;c<3;c++){let q='';for(let k=0;k<Math.floor(h/18)-1;k++)q+=D.rect(x+10+c*w*.28,-h+11+k*18,5,7);body.push({f:'@glass.1',d:q,glow:'window',detail:true});}for(let k=0;k<4;k++)S('@metal.1',.8,'M'+F(x+w*(k+1)/5)+' -2V'+(-h+7),.42,true);
 }
})(D,F,P,S,W,L,body,lit,r,ctx,v);const out=Object.assign({body,lit},extra||{});for(const shapes of Object.values(out))if(Array.isArray(shapes))for(const q of shapes)if(q.d)q.d=q.d.replace(/-?\d+\.\d+/g,n=>String(Math.round(Number(n)*10)/10));return out;}}));})();
