/* Low Chihuahuan desert cover: sotol, ocotillo, prickly pear, creosote,
   black-grama tufts and weathered limestone. Kept low around the view's
   central story. Native seeds vary width, lean and pad arrangements. */
(function(){
  if(typeof sceneObjDefine!=='function'||typeof sceneDraw==='undefined')return;
  const {define,poly,ell,leaf,f1,seasons}=sceneDraw;
  const PAL=Object.assign({base:{plant:['#58603d','#8e9562','#303c2f'],dry:['#a48c59','#c7b17b'],flower:['#cb6041','#e5b36f'],rock:['#997b62','#c4a080','#5e5148']}},seasons({
    plant:{spring:['#4a713f','#8fa66b','#2f4937'],summer:['#687144','#9eaa6a','#3f4b32'],autumn:['#8f6b38','#bb9b59','#59432d'],winter:['#777b68','#a1a493','#4f594c']},
    dry:{spring:['#8e9e61','#bdc98c'],summer:['#a99e60','#d0bf80'],autumn:['#b47c45','#d7ad72'],winter:['#aaa898','#d1d0bf']}
  }));
  const common={variants:4,seasonal:true,shapeBySeason:true,flippable:true,palette:PAL,parts:['body'],tags:['texas','chihuahuan','kit:arid','role:ground']};
  define(Object.assign({},common,{id:'plant.desert-sotol',category:'plant',size:[100,90],shadow:{rx:31,ry:4,h:18},anim:{sway:{part:'body',pivot:[0,0],deg:1,period:6.3}},build(v,r,ctx){
    const body=[],p=['','',''];
    for(let i=0;i<21;i++){const a=(-174+i*8.1+(r()-.5)*4)*Math.PI/180,L=24+r()*33+(v%2)*8; p[i%3]+=leaf(0,-3,a,L,1.8+r());}
    p.forEach((d,i)=>body.push({f:'@plant.'+i,d}));
    body.push({f:'@dry.0',d:'M-2 1Q-17 -10 -27 -17Q-8 -9 0 -3Q12 -10 24 -17Q12 -4 2 1z'});
    if(v===2){body.push({s:'@dry.0',w:2.7,d:'M2 -5Q5 -43 1 -84'});for(let i=0;i<7;i++)body.push({f:'@dry.1',d:ell(1+(i%2?2:-2),-79+i*4,3.5+i*.22,1.4)});}
    return{body};
  }}));
  define(Object.assign({},common,{id:'plant.desert-pricklypear',category:'plant',size:[122,110],shadow:{rx:35,ry:5,h:55},anim:{sway:{part:'body',pivot:[0,0],deg:.45,period:7.6}},build(v,r,ctx){
    const body=[],pads=[[0,-21,14,26],[-20,-40,17,24],[23,-43,18,27],[-35,-66,15,23],[8,-73,16,24],[39,-73,14,21]];
    if(v===1)pads.splice(4,1);if(v===2)pads.push([-52,-88,11,17]);if(v===3)pads[5]=[44,-53,19,18];
    for(let i=0;i<pads.length;i++){let[x,y,rx,ry]=pads[i];x+=(r()-.5)*8;y+=(r()-.5)*7;body.push({f:i%2?'@plant.0':'@plant.2',d:ell(x,y,rx,ry)});body.push({f:'@plant.1',op:.42,d:`M${f1(x-2)} ${f1(y-ry+2)}Q${f1(x-rx)} ${f1(y-ry+8)} ${f1(x-rx+3)} ${f1(y+ry-7)}Q${f1(x-5)} ${f1(y+9)} ${f1(x-2)} ${f1(y-ry+2)}z`});let sp='';for(let j=0;j<8;j++){const xx=x+(r()-.5)*rx*1.3,yy=y+(r()-.5)*ry*1.4;sp+=`M${f1(xx-1.3)} ${f1(yy-2)}l2.1 2.8`;}body.push({s:'@dry.1',w:.7,op:.65,d:sp,detail:true});if(ctx.season==='spring'&&i%2)body.push({f:'@flower.1',d:ell(x,y-ry,4,2.8)});}
    return{body};
  }}));
  define(Object.assign({},common,{id:'plant.desert-ocotillo',category:'plant',size:[150,240],shadow:{rx:18,ry:4,h:60},anim:{sway:{part:'body',pivot:[0,0],deg:1.2,period:8.4}},build(v,r,ctx){
    const body=[],green=ctx.season==='spring'||ctx.season==='summer';
    for(let i=0;i<9;i++){const x=(i-4)*(11+v),h=120+r()*100,dx=(i-4)*4;body.push({f:i%2?'@plant.2':'@dry.0',d:`M${i-5} 1Q${f1(x*.4)} ${f1(-h*.5)} ${f1(x+dx)} ${f1(-h)}Q${f1(x*.4+2)} ${f1(-h*.5)} ${i-2} 1z`});if(green){let l='';for(let j=1;j<8;j++){const t=j/9;l+=leaf((i-3)*(1-t)+(x+dx)*t,-h*t,(-130+(j%2)*90)*Math.PI/180,4+r()*3,1.9);}body.push({f:'@plant.1',op:.8,d:l});}if(ctx.season==='spring')body.push({f:'@flower.0',d:ell(x+dx,-h-3,2.8,7)});}
    return{body};
  }}));
  define(Object.assign({},common,{id:'plant.desert-creosote',category:'plant',size:[95,57],shadow:{rx:30,ry:4,h:22},anim:{sway:{part:'body',pivot:[0,0],deg:1.3,period:5.7}},build(v,r){
    const body=[],P=['','',''];let branches='';for(let i=0;i<11;i++){const x=(i-5)*7,h=17+r()*34;branches+=`M${f1((i-5)*.7)} 0Q${f1(x*.5)} ${f1(-h*.45)} ${x} ${f1(-h)}`;for(let j=0;j<6;j++){const t=.38+j*.1,xx=x*t,yy=-h*t;P[(i+j)%3]+=leaf(xx,yy,(j%2?-28:-150)*Math.PI/180,5+r()*4,2.3);}}
    body.push({s:'@plant.2',w:1.2,d:branches});P.forEach((d,i)=>body.push({f:'@plant.'+i,d}));return{body};
  }}));
  define(Object.assign({},common,{id:'ground.desert-tuft',category:'ground',size:[65,38],shadow:false,anim:{sway:{part:'body',pivot:[0,0],deg:1.7,period:4.8}},build(v,r){const p=['',''];for(let i=0;i<13;i++){const x=(r()-.5)*34,h=8+r()*22,lean=(r()-.5)*23;p[i%2]+=leaf(x,0,Math.atan2(-h,lean),Math.hypot(h,lean),.9+r()*.65);}return{body:p.map((d,i)=>({f:'@dry.'+i,d}))};}}));
  define(Object.assign({},common,{id:'ground.desert-gravel',category:'ground',size:[80,18],seasonal:false,shapeBySeason:false,shadow:false,anim:undefined,build(v,r){const body=[];for(let i=0;i<5+v;i++){const x=(r()-.5)*68,y=-r()*7,w=2+r()*5,h=1.2+r()*2.8;body.push({f:'@rock.'+(i%3),op:.55,detail:i>2,d:poly([[x-w,y+h],[x-w*.6,y-h],[x+w*.25,y-h*1.3],[x+w,y],[x+w*.6,y+h]])});}return{body};}}));
  define(Object.assign({},common,{id:'rock.desert-boulder',category:'rock',size:[130,63],seasonal:false,shapeBySeason:false,shadow:{rx:42,ry:5,h:25},anim:undefined,build(v,r){const w=43+v*5,h=30+v*6;return{body:[{f:'@rock.0',d:poly([[-w,0],[-w-7,-h*.4],[-w*.5,-h],[w*.4,-h-7],[w,-h*.65],[w+7,0]])},{f:'@rock.1',d:poly([[-w-3,-h*.4],[-w*.5,-h],[w*.4,-h-7],[w*.12,-h*.4],[-w*.5,-h*.25]])},{f:'@rock.2',d:poly([[w*.12,-h*.4],[w*.4,-h-7],[w,-h*.65],[w+7,0],[w*.1,0]])},{s:'@rock.2',w:1.5,op:.7,d:`M${f1(-w*.4)} ${-h+4}l${f1(w*.2)} ${f1(h*.3)}l-10 ${f1(h*.3)}`,detail:true}]};}}));
})();
