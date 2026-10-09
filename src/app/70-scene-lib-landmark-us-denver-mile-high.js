 /* Native location-specific architecture. */
 (function(){if(typeof sceneObjDefine!=='function')return;const D=sceneDraw;

 sceneObjDefine({id:'landmark.us-denver-skyline',category:'landmark',weight:0,size:[942,483],variants:1,seasonal:false,shapeBySeason:true,flippable:false,parts:['body','lit'],palette:{base:{glass:['#729ca6','#a9bcb7','#477887','#305c70'],frame:['#b9b9a2','#6d8e8d'],stone:'#b6a785'}},night:{glow:{window:'#e4d3a0',lamp:'#f8dfaa'},on:.75},shadow:{rx:28,ry:2,h:3},tags:['landmark','us','place:us/place:denver'],build(v,r,ctx){const body=[],lit=[];
 const blocks=[{x:-463,w:91,h:194,sl:18},{x:-351,w:122,h:316,sl:-22},{x:-201,w:165,h:451,sl:85},{x:-14,w:163,h:363,sl:-59},{x:174,w:119,h:273,sl:36},{x:321,w:137,h:207,sl:-19}];
 for(const[b,a]of blocks.map((a,b)=>[b,a])){const{x,w,h,sl}=a;body.push({f:['@glass.2','@glass.0','@glass.3','@glass.0','@glass.2','@glass.0'][b],d:D.poly([[x,0],[x,-h],[x+w,-h+sl],[x+w,0]])},{f:'@glass.3',d:D.poly([[x+w*.76,0],[x+w*.76,-h+sl*.76],[x+w,-h+sl],[x+w,0]])},{s:'@frame.0',w:3,d:`M${x} ${-h}L${x+w} ${-h+sl}`});
 let recess='',panes=['',''];for(let col=0;col<Math.floor(w/15)-1;col++){const xx=x+7+col*15,top=-h+sl*(col*15+14)/w+12;for(let y=top;y<-14;y+=20){recess+=D.rect(xx,y,9,11);if((col+Math.round(y/20))%4)panes[col%2]+=D.rect(xx+1,y+1,7,9);}}body.push({f:'@glass.3',d:recess},...panes.map(d=>({f:'@glass.1',op:.78,d,glow:'window'})));for(let y=-16;y>-h+Math.max(0,sl)+15;y-=24)body.push({s:'@frame.1',w:.85,op:.55,d:D.poly([[x+2,y],[x+w-2,y]],false),detail:true});
 for(let i=0;i<4;i++)body.push({s:'@frame.1',w:1.2,op:.65,d:`M${x+8+i*w/4} ${-h+sl*(8+i*w/4)/w+4}V0`});
 if(ctx.season==='winter')body.push({s:'#e5e7d8',w:4,d:`M${x+1} ${-h-1}L${x+w-1} ${-h+sl-1}`});}
 body.push({f:'@frame.1',d:'M-142-419v-23h6v26zM48-384v-28h5v30z'},{f:'@stone',d:'M-478 0v-9h946V0z'});return{body,lit};}});
 sceneObjDefine({id:'building.us-denver-civic-dome',category:'building',weight:0,size:[244,185],variants:1,seasonal:false,flippable:false,parts:['body','lit'],palette:{base:{stone:['#c0af8a','#8f987e'],gold:['#bba96e','#dfc78a','#8f9166'],glass:'#6c8d88'}},night:{glow:{window:'#efd7a4'},on:.75},shadow:{rx:81,ry:4,h:110},tags:['us','kit:colonial','role:building-mid'],build(){const body=[];body.push({f:'@stone.0',d:'M-115 0v-78h230V0zM-65-78v-29H65v29z'},{f:'@gold.0',d:'M-68-111Q-62-159 0-169Q62-159 68-111z'},{f:'@gold.1',d:'M-68-111Q-62-159 0-169Q-27-153-27-111z'},{f:'@gold.2',d:'M-65-111h130v7H-65zM-10-168v-13h20v13z'},{f:'@stone.1',d:'M-123-78L0-105 123-78z'});for(let x=-100;x<101;x+=25)body.push({f:'@stone.1',d:D.rect(x,-65,15,43)},{f:'@glass',d:D.rect(x+3,-62,9,35),glow:'window'});for(let x=-56;x<=56;x+=16)body.push({s:'@gold.2',w:1,op:.5,d:`M${x}-113q${-x*.4}-30 ${-x}-51`});return{body};}});
 sceneObjDefine({id:'vehicle.us-denver-light-rail',category:'vehicle',weight:0,size:[247,49],variants:2,seasonal:false,flippable:true,parts:['body'],palette:{base:{paint:['#d1d3bd','#719580','#435c56'],glass:'#648b8d',rubber:'#3d514c'}},night:{glow:{window:'#e7d6a1',lamp:'#ffe9b0'},on:.75},shadow:{rx:104,ry:4,h:22},tags:['us','kit:vehicles','role:vehicle'],build(){const body=[{f:'@paint.0',d:'M-121-8v-25q0-12 14-12h213q12 0 14 12v25z'},{f:'@paint.1',d:D.rect(-119,-16,236,8)},{f:'@paint.2',d:D.rect(-123,-8,246,5)}];for(let x=-109;x<102;x+=28)body.push({f:'@rubber',d:D.rect(x,-38,21,17)},{f:'@glass',d:D.rect(x+2,-36,17,13),glow:'window'});for(const x of [-87,-67,64,84])body.push({f:'@rubber',d:D.ell(x,-4,7,5)});body.push({f:'#e5d5a3',d:D.rect(114,-17,6,4),glow:'lamp'},{s:'@paint.2',w:2,d:'M-24-45L0-60 24-45M0-60v-5'});return{body};}});
 })();

 /* Private aspen frames: the tall fork and the compact grove have separate
    branch skeletons, crown heights and broad leaf-cluster layouts. */
 (function(){const D=sceneDraw;sceneObjDefine({
 id:'tree.us-denver-frame-aspen',category:'tree',weight:0,size:[252,430],
 variants:2,seasonal:true,shapeBySeason:true,flippable:false,parts:['trunk','crown'],
 palette:{base:{bark:['#d7d5bc','#80908a','#455e58'],leaf:['#4b7447','#88a65c','#b4c480']},spring:{leaf:['#5c9253','#a2bf6f','#d0d694']},summer:{leaf:['#3d7044','#729958','#a8bc71']},autumn:{leaf:['#a8752c','#d8ac3e','#ecd175']},winter:{leaf:['#839c9a','#a9bcb6','#dde1cf'],bark:['#e0e2d2','#8ba1a0','#567275']}},
 shadow:{rx:43,ry:5,h:330},anim:{sway:{part:'crown',pivot:[0,-180],deg:.65,period:9.1}},
 tags:['us','aspen','kit:alpine','role:tree'],build(v,r,ctx){
 const compact=v%2===1,trunk=[],crown=[];
 trunk.push({f:'@bark.0',d:compact?
 'M-29 0L-33-126-56-247-48-307-43-248-21-128-17 0ZM8 0L4-111 19-223 14-288 22-278 28-224 20-110 23 0ZM42 0L40-105 65-196 63-250 71-241 74-193 53-100 55 0Z':
 'M-8 0L-4-166-23-268-29-390-22-409-17-270 9-169 10 0ZM19 0L16-142 43-263 42-345 49-368 54-260 30-141 32 0Z'},
 {f:'@bark.1',d:compact?'M-29 0L-33-126-56-247-48-307-46-250-26-128-24 0ZM42 0L40-105 65-196 63-250 69-195 48-102 48 0Z':'M-8 0L-4-166-23-268-29-390-25-400-21-269 3-168 3 0Z'},
 {s:'@bark.2',w:2.7,d:compact?
 'M-28-112L-70-189-79-232M-43-206L-18-253M15-153L-21-199M22-201L51-239M48-134L86-172':
 'M-8-191L-62-249-85-324M-20-283L-71-343M-25-340L3-381M31-205L72-270 79-318M42-286L11-328M-2-168L-74-203-97-238'});
 const clusters=compact?
 [[-43,-279,33,37],[24,-251,37,40],[-64,-225,39,36],[4,-201,42,36],[66,-179,30,33],[-28,-165,36,31]]:
 [[-20,-378,38,42],[45,-334,46,45],[-70,-327,51,49],[-42,-268,55,44],[52,-252,48,43],[-86,-221,38,36],[6,-211,40,33]];
 if(ctx.season!=='winter')for(const[x,y,w,h]of clusters){
 crown.push({f:'@leaf.0',d:D.poly([[x-w,y+9],[x-w*.92,y-h*.42],[x-w*.51,y-h*.62],[x-w*.23,y-h],[x+w*.17,y-h*.9],[x+w*.44,y-h*.54],[x+w*.85,y-h*.47],[x+w,y+h*.12],[x+w*.64,y+h*.57],[x+w*.19,y+h*.68],[x-w*.19,y+h*.48],[x-w*.58,y+h*.65]])},
 {f:'@leaf.1',op:.72,d:D.poly([[x-w*.87,y+5],[x-w*.77,y-h*.36],[x-w*.38,y-h*.54],[x-w*.12,y-h*.87],[x+w*.2,y-h*.64],[x+w*.34,y-h*.2],[x+w*.06,y+h*.17],[x-w*.42,y+h*.41]])},
 {f:'@leaf.2',op:.47,d:D.poly([[x-w*.43,y-h*.57],[x-w*.14,y-h*.88],[x+w*.16,y-h*.65],[x+w*.3,y-h*.24],[x-w*.05,y-h*.03],[x-w*.48,y-h*.15]])});
 for(let i=0;i<4;i++){const a=x+(r()-.5)*w*1.3,b=y+(r()-.5)*h;
 crown.push({f:i%2?'@leaf.1':'@leaf.2',op:.48,detail:true,d:D.poly([[a-8,b],[a-3,b-7],[a+5,b-6],[a+10,b+1],[a+3,b+6],[a-5,b+5]])});}}
 for(let i=0;i<17;i++)trunk.push({s:'@bark.2',w:1.2,op:.64,detail:true,d:'M'+(compact?-27:-4)+' '+(-14-i*15)+'l6-2'});
 if(ctx.season==='winter')trunk.push({s:'@bark.1',w:1.2,d:compact?'M-79-232l-12-17m12 17l15-19M51-239l-2-24m2 24l19-15M86-172l-1-22':'M-85-324l-14-19m14 19l17-23M-71-343l-3-23m3 23l-18-12M79-318l17-18m-17 18l-3-25M-97-238l-12-19'});
 return{trunk,crown};}});})();

 /* Civic approach: paving joints recede toward the buildings, below the rail lane. */
 (function(){const D=sceneDraw;sceneObjDefine({id:'ground.us-denver-civic-paving',category:'ground',weight:0,size:[1140,100],variants:1,seasonal:false,flippable:false,parts:['body'],shadow:false,tags:['us','ground-detail','kit:colonial','role:ground-cover'],palette:{base:{stone:'#b8b7a3',joint:'#566d64',edge:'#d3d1b9'},winter:{stone:'#bac8bd',joint:'#667f7b',edge:'#d6ddd1'}},build(){const body=[{f:'@stone',d:'M-475 0Q-240-64-67-71H97Q300-52 595 0Z'}];for(let i=0;i<10;i++){const x=-475+i*119,tx=x*.16+18;body.push({s:'@joint',w:1.8,op:.68,d:D.poly([[tx,-70],[x,0]],false)});}for(const y of [-65,-56,-43,-25,-3])body.push({s:'@joint',w:1.6,op:.62,d:'M'+(-475*(1+y/86))+' '+y+'Q22 '+(y+3)+' '+(595*(1+y/86))+' '+y});body.push({s:'@edge',w:3,op:.7,d:'M-475 0Q-240-64-67-71H97Q300-52 595 0'});return{body};}});})();
