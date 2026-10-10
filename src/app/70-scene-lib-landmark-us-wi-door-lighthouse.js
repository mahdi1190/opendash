/* Native A Door County lighthouse; original location subject, modeled facets and real detail.
   Explicit placement only; draft scene stays under independent review. */
(function(){const D=sceneD,F=n=>Math.round(n*10)/10;sceneObjDefine(Object.assign({"id":"landmark.us-wi-door-lighthouse","category":"landmark","weight":0,"size":[420,436],"variants":1,"seasonal":false,"shapeBySeason":false,"flippable":false,"parts":["body","lit"],"palette":{"base":{"stone":["#e5e2ca","#b2bdb0","#65817e"],"snow":["#f4f0dd","#b9d8df","#7ea7c1"],"soil":["#88734e","#b7a171","#51483a"],"wood":["#8b523c","#be845c","#4c3a31"],"leaf":["#3b6849","#648851","#294b3b"],"metal":["#edf0e8","#a9bfc4","#587681"],"glass":["#2d657b","#88b7c9","#193c53"],"red":["#a34f3c","#cb7956","#723e37"],"white":"#f2f0df","black":"#1e333d","water":["#afd5d7","#729fae","#3f687c"],"light":"#ffe1a7"},"spring":{},"summer":{},"autumn":{"leaf":["#8d824a","#aea264","#59613f"]},"winter":{"stone":["#d4dedd","#b2c2c5","#788f9c"],"snow":["#f3f4eb","#d1e5e6","#9ebdcd"],"leaf":["#607a6e","#8ca094","#3d5a51"],"soil":["#c7d3d0","#dbe3df","#8ba09a"]}},"shadow":{"rx":142.8,"ry":8,"h":436},"reflect":true,"tags":["landmark","signature","place:us/state:WI","us","us-midwest"],"night":{"glow":{"window":"#ffe0a4","lamp":"#ffe6b5","lava":"#f36a26"},"on":0.8}}, {build(v,r,ctx){const body=[],lit=[],P=(f,d,op,detail)=>body.push({f,d,op,detail}),S=(s,w,d,op,detail)=>body.push({s,w,d,op,detail,cap:'round'}),W=(x,y,w,h)=>body.push({f:'@glass.1',d:D.rect(x,y,w,h),glow:'window',detail:true}),L=(f,d,op)=>lit.push({f,d,op});const extra=(function(D,F,P,S,W,L){
 P('@stone.2','M-185 0V-121L-93-177-2-122V0Z');P('@red.0','M-194-120L-93-186 8-120-2-110-93-172-181-111Z');P('@stone.0',D.rect(-178,-116,170,116));
 for(let i=0;i<9;i++)S('@stone.1',1,'M-176 '+(-8-i*12)+'h166',.46,i%2===0);
 for(let j=0;j<2;j++)for(let i=0;i<3;i++){const x=-157+i*51,y=-104+j*50;P('@stone.2',D.rect(x-2,y-2,25,32));W(x,y,21,28);S('@white',1,'M'+(x+10)+' '+y+'v28m-10-14h21',.65,true);}
 P('@wood.2',D.rect(-110,-49,32,49));P('@wood.0',D.rect(-105,-45,22,45));
 P('@stone.1','M-6 0L15-311 105-311 128 0Z');P('@stone.0','M-6 0L15-311H47L37 0Z');P('@stone.2','M90-311H105L128 0H100Z');
 for(let i=0;i<29;i++){const y=-8-i*10.4,x=-5+i*.7,w=132-i*1.45;S('@stone.1',.8,'M'+F(x)+' '+F(y)+'h'+F(w),.52,i%3===0);}
 P('@metal.2',D.rect(0,-323,119,12));P('@metal.1',D.rect(8,-375,104,53));
 for(let i=0;i<8;i++){const x=13+i*12;W(x,-369,8,36);S('@metal.2',2,'M'+(x-2)+' -373v49');}
 P('@red.2','M0-375L60-414 121-375Z');P('@red.0','M0-375L60-414 66-375Z');P('@metal.2',D.rect(55,-427,9,14));
 S('@metal.2',2.5,'M-7-319H128M-2-330H122');for(let i=0;i<10;i++)S('@metal.2',1.5,'M'+(i*14-3)+' -318v-12',.8,true);
 for(const y of[-70,-164,-258]){P('@stone.2',D.rect(43,y,20,28));W(47,y+3,12,22);}
 L('#e8e5ba',D.ell(60,-351,15,5),.65);L('#bacdd3','M15-311H23L3 0H-6Z',.25);
})(D,F,P,S,W,L,body,lit,r,ctx,v);lit.unshift({f:'#c4d5d5',op:.07,d:'M-17-359L-710-461V-391Z'},{f:'#c4d5d5',op:.065,d:'M25-360L720-419V-366Z'});const out=Object.assign({body,lit},extra||{});for(const shapes of Object.values(out))if(Array.isArray(shapes))for(const q of shapes)if(q.d)q.d=q.d.replace(/-?\d+\.\d+/g,n=>String(Math.round(Number(n)*10)/10));return out;}}));})();

/* Door County shore cedar: wind-shaped fans above a fractured limestone ledge. */
/* A low limestone peninsula has chipped coping and a shaded rock face. */
(function(){sceneObjDefine({id:'ground.us-wi-limestone-shore',category:'ground',weight:0,size:[1440,220],box:[-762,-124,655,51],variants:1,seasonal:true,shapeBySeason:false,flippable:false,parts:['body'],shadow:false,reflect:true,tags:['us','us-midwest','natural','role:shore'],palette:{base:{stone:['#a4b0a6','#7f9695','#4b6c78'],crack:'#4e6e75'},spring:{},summer:{},autumn:{stone:['#acaf97','#899780','#536e6c']},winter:{stone:['#c2d2ce','#9ab8bd','#5d8593']}},build(){return{body:[
 {f:'@stone.2',d:'M-760 31Q-276-61 83-40Q312-7 641-14L653-6 602 12 490 5 369 16 281 8 153-11 82-18Q-263-43-760 49Z'},
 {f:'@stone.1',d:'M-760-56Q-493-117-149-111Q75-121 277-77L641-14Q312-7 83-40Q-276-61-760 31Z'},
 {f:'@stone.0',d:'M-760 31Q-276-61 83-40Q312-7 641-14L631-7Q305 2 83-31Q-271-52-760 39Z'},
 {s:'@crack',w:1.8,op:.65,d:'M-313-44l8 18 22 1M-108-42l12 21 27-3M107-33l6 17 28 5M278-11l-3 16 22 5M462-7l-6 15 28-3M593-11l-8 19',detail:true},
 {s:'@stone.2',w:1.5,op:.48,d:'M-644-29l62-8M-491-53l73-4M-243-69l53 4M-53-61l46 3M165-31l42 5M373-17l44 2',detail:true}
 ]};}});})();
(function(){const D=sceneD,F=n=>Math.round(n*10)/10;sceneObjDefine({id:'tree.us-wi-shore-cedar',category:'tree',weight:0,size:[500,404],variants:2,seasonal:true,shapeBySeason:true,flippable:true,parts:['body','fans'],shadow:{rx:165,ry:12,h:404},reflect:false,tags:['us','us-midwest','natural','kit:temperate','role:tree-near'],palette:{base:{leaf:['#203f3e','#3a6050','#5c7d62'],wood:['#30463f','#798479'],rock:['#2c4951','#567783','#849795'],snow:'#d6e0dc'},spring:{leaf:['#244a3e','#467453','#73956d']},summer:{leaf:['#1e4438','#3c684d','#62865b']},autumn:{leaf:['#2d473b','#50664c','#839164']},winter:{leaf:['#27474b','#43666b','#748e88'],rock:['#2d4b5d','#577c8d','#94a9ad'],wood:['#304b51','#799293']}},anim:{sway:{part:'fans',pivot:[5,-139],deg:1.1,period:9.9}},build(v,r,ctx){const body=[],fans=[];
// The second cedar has six staggered boughs and a bent fork on a different ledge.
const rocks=v?[
'M-250 0V-29L-215-57-146-46-102-88-30-70 18-98 79-84 132-52 197-74 250-23V0Z',
'M-215-57L-146-46-102-88-66-68-120-32-228-23ZM18-98L79-84 132-52 85-39 32-68Z',
'M-102-88L-30-70-52-63-93-73ZM132-52L197-74 222-42 185-52Z'
]:[
'M-250 0V-21L-202-67-125-58-70-96-18-83 35-110 104-69 166-84 247-31V0Z',
'M-202-67L-125-58-70-96-42-73-124-31-225-26ZM35-110L104-69 65-53-7-70Z',
'M-202-67L-125-58-110-50-187-53ZM35-110L104-69 83-68 22-96Z'];
rocks.forEach((d,i)=>body.push({f:'@rock.'+i,d}));
body.push({f:'@wood.0',d:v?'M16 0Q38-71 6-149L-32-227-38-323-22-358-6-355-19-316-13-231 28-156 48-59 45 0Z':'M-17 0Q-20-114 8-217L25-341 41-339 29-212 8-126 27 0Z'},
{s:'@wood.1',w:4,d:v?'M30-7Q36-82 16-150L-23-230-29-318':'M-7-6Q-8-119 17-222',detail:true});
 const shelves=v?[[-44,-130,118,38],[82,-192,143,43],[-68,-243,124,46],[24,-298,143,45],[8,-353,71,39],[-25,-381,39,22]]:[[-69,-167,147,48],[37,-226,151,50],[-34,-278,127,48],[48,-336,91,44],[21,-376,42,27]];
const forks=[[17,-103],[6,-167],[-15,-212],[-26,-268],[-30,-321],[-20,-353]];
for(let j=0;j<shelves.length;j++){const [x,y,w,h]=shelves[j],a=v?forks[j]:[13,y+61];
body.push({s:'@wood.0',w:7-j*.7,cap:'round',d:'M'+a[0]+' '+a[1]+'Q'+F((a[0]+x)*.5)+' '+F(y+13)+' '+x+' '+y});
const inset=v?(j%2?14:-26):-21,fh=v?(j%2?.7:.48):.58,fw=v?(j%2?.62:.85):.77;
fans.push({f:'@leaf.0',d:D.lobed(r,x,y,w,h,v?19:17,v?.38:.46)},{f:'@leaf.1',d:D.lobed(r,x+inset,y-(v?8:12),w*fw,h*fh,v?13:14,.43)});
for(let i=0;i<7;i++){const bx=x-w*.74+i*w*.21,by=y-7+r()*13;fans.push({s:'@leaf.2',w:1.6,d:'M'+F(bx)+' '+F(by)+'l-7-9m7 9l3-12m-3 12l10-7',detail:true});}
if(ctx.season==='winter')fans.push({s:'@snow',w:2,d:'M'+F(x-w*.5)+' '+F(y-16)+'Q'+x+' '+F(y-29)+' '+F(x+w*.3)+' '+F(y-17),detail:true});}
for(const [x,y] of (v?[[-185,-39],[-118,-61],[35,-59],[179,-41]]:[[-171,-43],[-81,-60],[58,-50],[158,-47]]))body.push({s:'@rock.0',w:2,d:'M'+x+' '+y+(v?'l16 13 29-4':'l25 8 17-6'),detail:true});return{body,fans};}});})();
