/* The Charter Oak: broad old branch hierarchy, split bark and a natural hollow. */
(function(){
 const D=sceneD,R=n=>Math.round(n*10)/10;
 const pal={base:{bark:['#473f31','#756348','#a38c62'],leaf:['#31583c','#557b44','#83984f'],scar:'#283a2d'},spring:{leaf:['#3c6b3d','#6d964c','#9eb768']},summer:{leaf:['#315f39','#597e3b','#869b49']},autumn:{leaf:['#874626','#ad642b','#c78a3e'],bark:['#49392c','#776046','#a68a60']},winter:{bark:['#42534c','#6d7e72','#a5b3a1'],leaf:['#526b5b','#718775','#a3b5a4']}};
 sceneObjDefine({id:'tree.us-charter-oak',category:'tree',weight:0,size:[864,697],box:[-432,-697,432,6],variants:1,seasonal:true,shapeBySeason:true,flippable:false,palette:pal,parts:['trunk','crown'],shadow:{rx:150,ry:19,h:510},anim:{sway:{part:'crown',pivot:[0,-395],deg:.24,period:9.1}},tags:['us','connecticut','oak','natural','signature','landmark','kit:temperate','role:tree'],
 build(v,r,ctx){const trunk=[],crown=[];
 trunk.push({f:'@bark.0',d:'M-104 5Q-56-22-51-114L-62-272Q-72-308-62-328L-37-315Q-22-365-4-377L10-362 18-307Q49-333 65-324L53-298 38-276Q20-187 42-86Q50-35 101 2L54 1 16-21-17 2z'},
 {f:'@bark.1',d:'M-35 1Q-20-85-31-191L-39-281-48-317-33-309-14-349 2-362 8-333 7-276Q-11-149 6-61L27 0z'},
 {f:'@bark.2',op:.5,d:'M-52-88Q-30-135-45-277L-53-313-35-302Q-10-185-26-92z'},
 {f:'@scar',d:'M-25-2Q-32-77-18-113Q-4-143 12-111Q28-69 17-2z'},
 {s:'@bark.1',w:4,op:.8,d:'M-28-6Q-39-78-24-118Q-5-150 16-113M-65-25q25-13 31-26M49-18l-22-25'});
 const branchEnds=[[-345,-398],[-284,-506],[-202,-574],[-99,-626],[31,-632],[135,-594],[245,-528],[354,-429],[-379,-336],[391,-338]];
 let limbs='',light='',twigs='';
 const point=(a,b,c,t)=>[(1-t)*(1-t)*a[0]+2*(1-t)*t*b[0]+t*t*c[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*b[1]+t*t*c[1]];
 const taper=(a,b,c,width)=>{const left=[],right=[];for(let j=0;j<=7;j++){const t=j/7,p=point(a,b,c,t),dx=2*((1-t)*(b[0]-a[0])+t*(c[0]-b[0])),dy=2*((1-t)*(b[1]-a[1])+t*(c[1]-b[1])),len=Math.hypot(dx,dy)||1,w=width*Math.pow(1-t,.78)+.25;
   left.push([R(p[0]-dy/len*w),R(p[1]+dx/len*w)]);right.push([R(p[0]+dy/len*w),R(p[1]-dx/len*w)]);}return D.poly(left.concat(right.reverse()));};
 const grown=[],parents=[null,0,1,null,null,4,null,6,0,6],forkAt=[0,.28,.38,0,0,.4,0,.38,.15,.25];
 branchEnds.forEach(([x,y],i)=>{const parent=parents[i],a=parent==null?[i<5?-28:12,-285-(i%3)*26]:point(...grown[parent],forkAt[i]),b=[R(a[0]+(x-a[0])*.47),R(y+93)],c=[x,y];grown.push([a,b,c]);
  limbs+=taper(a,b,c,parent==null?11-i%3*1.6:6.2);light+=taper([a[0]-3,a[1]],[b[0]-4,b[1]-1],[x-1,y],parent==null?2.2:1.2);
  for(let j=0;j<3;j++){const t=.43+j*.19,p=point(a,b,c,t),side=(i+j)%2?-1:1,dx=side*(31+j*9),end=[p[0]+dx*1.45,p[1]-47-j*8],control=[p[0]+dx,p[1]-12];
   limbs+=taper(p,control,end,3.7-j*.8);
   for(let k=0;k<2;k++){const q=point(p,control,end,.55+k*.22),ex=q[0]+side*(k?16:-14),ey=q[1]-23-k*8;
    twigs+=`M${R(q[0])} ${R(q[1])}q${side*(k?11:-9)} -11 ${R(ex-q[0])} ${R(ey-q[1])}m0 0l${side*7} -12`;}
  }
 });
 trunk.push({f:'@bark.0',d:limbs},{f:'@bark.1',op:.8,d:light},{s:'@bark.0',w:.85,d:twigs});
 for(let i=0;i<28;i++)trunk.push({s:i%3?'@bark.2':'@bark.0',w:.8+(i%4)*.3,op:.5,d:`M${-42+i%9*9} ${-8-i*9}q${i%2?7:-7} -25 ${i%3?2:-5} -38`,detail:true});
 if(ctx.season!=='winter'){
  const masses=[[-290,-382,114,95],[-239,-488,129,105],[-130,-553,138,95],[28,-567,153,83],[183,-521,148,99],[302,-430,113,93],[222,-349,130,96],[59,-386,170,125],[-112,-378,160,105],[-345,-323,67,57],[359,-337,58,59]];
  const form=(cx,cy,wx,hy,seed)=>{const pts=[];for(let j=0;j<26;j++){const a=j/26*Math.PI*2,sp=1+(j%3===0?.07:-.03)+(r()-.5)*.11;pts.push([R(cx+Math.cos(a)*wx*sp),R(cy+Math.sin(a)*hy*sp)]);}return D.poly(pts);};
  masses.forEach(([x,y,w,h],i)=>{crown.push({f:'@leaf.0',d:form(x,y,w,h,i)});crown.push({f:'@leaf.1',d:form(x-w*.17,y-h*.18,w*.89,h*.76,i+5)});if(i%3!==2)crown.push({f:'@leaf.2',op:.36,d:form(x-w*.18,y-h*.42,w*.74,h*.38,i+9)});});
  let flecks='';for(let i=0;i<45;i++){const x=-337+r()*664,y=-553+r()*208;flecks+=D.poly([[x-3,y],[x+1,y-5],[x+6,y-2],[x+3,y+2]]);}crown.push({f:'@leaf.2',op:.34,d:flecks,detail:true});
 }else{let snow='';for(const[x,y]of branchEnds)snow+=`M${x-7} ${y+3}l14-3`;trunk.push({s:'#dbe5da',w:3,op:.7,d:snow});}
 return{trunk,crown};}});
 sceneObjDefine({id:'ground.us-oak-meadow',category:'ground',weight:0,size:[46,27],variants:3,seasonal:true,shapeBySeason:true,flippable:true,
  palette:{base:{grass:['#677b44','#9b9d62'],soil:'#687147'},spring:{grass:['#698c47','#adc176'],soil:'#718856'},summer:{grass:['#6c7e40','#a1a65d'],soil:'#6c7545'},autumn:{grass:['#8f743f','#b09b58'],soil:'#7a6d45'},winter:{grass:['#8b9f8b','#c2cec0'],soil:'#9aafa0'}},
  parts:['body'],shadow:false,reflect:false,tags:['us','connecticut','natural','kit:temperate','role:ground'],
  build(v){const shift=v*2;return{body:[{f:'@soil',op:.6,d:`M-23-1l8-4 10 1 8-3 17 6-14 2-15-1z`},
   {s:'@grass.0',w:1.2,d:`M-14 0q-1-7-6-11M-10 0q2-12-1-${20+shift}M-4 0q-1-8 5-16M6 0q-1-9 4-${23-shift}M12 0q0-7 7-13`},
   {s:'@grass.1',w:.8,d:'M-12-2l-2-11M1-2l4-10M9-2l4-17M17-2l5-7'}]};}});
})();
