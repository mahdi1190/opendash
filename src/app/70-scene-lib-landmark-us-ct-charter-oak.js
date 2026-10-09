/* The Charter Oak: broad old branch hierarchy, split bark and a natural hollow. */
(function(){
 const D=sceneD,R=n=>Math.round(n*10)/10;
 const pal={base:{bark:['#473f31','#756348','#a38c62'],leaf:['#31583c','#557b44','#83984f'],scar:'#283a2d'},spring:{leaf:['#3c6b3d','#6d964c','#9eb768']},summer:{leaf:['#315f39','#597e3b','#869b49']},autumn:{leaf:['#874626','#ad642b','#c78a3e'],bark:['#49392c','#776046','#a68a60']},winter:{bark:['#42534c','#6d7e72','#a5b3a1'],leaf:['#526b5b','#718775','#a3b5a4']}};
 sceneObjDefine({id:'tree.us-charter-oak',category:'tree',weight:0,size:[820,650],box:[-420,-650,420,6],variants:1,seasonal:true,shapeBySeason:true,flippable:false,palette:pal,parts:['trunk','crown'],shadow:{rx:150,ry:19,h:510},anim:{sway:{part:'crown',pivot:[0,-395],deg:.24,period:9.1}},tags:['us','connecticut','oak','natural','signature','landmark','kit:temperate','role:tree'],
 build(v,r,ctx){const trunk=[],crown=[];
 trunk.push({f:'@bark.0',d:'M-104 5Q-56-22-51-114L-66-313-110-401-88-420-35-351-18-467 7-476 16-326 67-397 92-388 38-293Q20-187 42-86Q50-35 101 2L54 1 16-21-17 2z'},
 {f:'@bark.1',d:'M-35 1Q-20-85-31-191L-39-314-85-407-67-386-19-326-10-463 2-462 7-276Q-11-149 6-61L27 0z'},
 {f:'@bark.2',op:.5,d:'M-52-88Q-30-135-45-297L-83-399-63-381-27-309Q-10-185-26-92z'},
 {f:'@scar',d:'M-25-2Q-32-77-18-113Q-4-143 12-111Q28-69 17-2z'},
 {s:'@bark.1',w:4,op:.8,d:'M-28-6Q-39-78-24-118Q-5-150 16-113M-65-25q25-13 31-26M49-18l-22-25'});
 const branchEnds=[[-345,-398],[-284,-506],[-202,-574],[-99,-626],[31,-632],[135,-594],[245,-528],[354,-429],[-379,-336],[391,-338]];
 branchEnds.forEach(([x,y],i)=>{const bx=i<5?-28:12,by=-285-(i%3)*26,w=12-i%3*2;
  trunk.push({s:'@bark.0',w:w+7,cap:'round',d:`M${bx} ${by}Q${R(x*.47)} ${R(y+93)} ${x} ${y}`},{s:'@bark.1',w:w*.37,cap:'round',d:`M${bx-3} ${by}Q${R(x*.47-3)} ${R(y+91)} ${x-4} ${y-2}`});
  for(let j=0;j<4;j++){const t=.45+j*.13,xx=bx+(x-bx)*t,yy=by+(y-by)*t,dx=(j%2?-1:1)*(25+j*7);trunk.push({s:'@bark.0',w:4-j*.65,cap:'round',d:`M${R(xx)} ${R(yy)}q${dx} -23 ${R(dx*1.3)} ${-48-j*4}`});}
 });
 for(let i=0;i<28;i++)trunk.push({s:i%3?'@bark.2':'@bark.0',w:.8+(i%4)*.3,op:.5,d:`M${-42+i%9*9} ${-8-i*9}q${i%2?7:-7} -25 ${i%3?2:-5} -38`,detail:true});
 if(ctx.season!=='winter'){
  const masses=[[-290,-382,114,95],[-239,-488,129,105],[-130,-553,138,95],[28,-567,153,83],[183,-521,148,99],[302,-430,113,93],[222,-349,130,96],[59,-386,170,125],[-112,-378,160,105],[-345,-323,67,57],[359,-337,58,59]];
  const form=(cx,cy,wx,hy,seed)=>{const pts=[];for(let j=0;j<26;j++){const a=j/26*Math.PI*2,sp=1+(j%3===0?.07:-.03)+(r()-.5)*.11;pts.push([R(cx+Math.cos(a)*wx*sp),R(cy+Math.sin(a)*hy*sp)]);}return D.poly(pts);};
  masses.forEach(([x,y,w,h],i)=>{crown.push({f:'@leaf.0',d:form(x,y,w,h,i)});crown.push({f:'@leaf.1',d:form(x-w*.17,y-h*.18,w*.89,h*.76,i+5)});if(i%3!==2)crown.push({f:'@leaf.2',op:.36,d:form(x-w*.18,y-h*.42,w*.74,h*.38,i+9)});});
  let flecks='';for(let i=0;i<67;i++){const x=-337+r()*664,y=-553+r()*208;flecks+=D.poly([[x-3,y],[x+1,y-5],[x+6,y-2],[x+3,y+2]]);}crown.push({f:'@leaf.2',op:.34,d:flecks,detail:true});
 }else{let snow='';for(const[x,y]of branchEnds)snow+=`M${x-7} ${y+3}l14-3`;trunk.push({s:'#dbe5da',w:3,op:.7,d:snow});}
 return{trunk,crown};}});
})();
