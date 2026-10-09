/* Unequal limestone hoodoos and joined fins, with resistant pale caps,
   fluted orange shoulders, broken beds and wind-shaped rim bristlecones. */
(function () {
  const {define,poly,ell,f1}=sceneDraw;
  const palette={base:{rock:['#d27850','#f0c39b','#a84f3c','#8d5960','#f5ddbb'],joint:['#7a4844','#f8d5ac']}};
  define({id:'rock.us-bryce-hoodoo',category:'rock',weight:0,size:[280,440],variants:5,seasonal:false,flippable:true,parts:['body'],palette,shadow:{rx:61,ry:7,h:220},reflect:false,tags:['us','bryce','hoodoos','natural','signature','landmark','kit:arid','role:rock'],
    build(v,r){const body=[],h=364+v*13,w=45+v*7,lean=(v-2)*9;
      const tops=[[[-10,-h+40],[-22,-h+24],[-18,-h-6],[0,-h-14],[15,-h-11],[29,-h+12],[18,-h+39]],
        [[-38,-h+46],[-43,-h+7],[-27,-h-9],[-12,-h+4],[3,-h+22],[17,-h-4],[35,-h+15],[29,-h+45],[19,-h+54]],
        [[-51,-h+41],[-72,-h+15],[-67,-h-7],[12,-h-17],[63,-h-12],[71,-h+23],[34,-h+42]],
        [[-12,-h+61],[-30,-h+40],[-28,-h+3],[-8,-h-16],[21,-h+6],[33,-h+30],[16,-h+57]],
        [[-30,-h+50],[-52,-h+29],[-43,-h-3],[-12,-h-13],[7,-h+4],[30,-h-9],[49,-h+12],[36,-h+42],[7,-h+64]]];
      const l=[[-w*1.5,5],[-w*1.25,-43],[-w*.9,-64],[-w*.96,-96],[-w*.63,-125],[-w*.79,-163],[-w*.45,-192],[-w*.53,-223],[-w*.28,-258],[-w*.38,-286],[lean-15,-h+49]];
      const rr=[[lean+19,-h+43],[w*.43,-288],[w*.31,-257],[w*.66,-229],[w*.51,-193],[w*.86,-166],[w*.77,-126],[w*1.11,-102],[w*.98,-69],[w*1.41,-40],[w*1.65,7]];
      body.push({f:{lin:[[0,'@rock.4'],[.23,'@rock.1'],[.49,'@rock.0'],[1,'@rock.2']],x1:-10,y1:-h,x2:21,y2:8},d:poly([...l,...tops[v].map(([x,y])=>[x+lean,y]),...rr])});
      body.push({f:'@rock.3',op:.77,d:poly([[lean+10,-h+43],...rr,[w*.53,6],[w*.28,-44],[w*.44,-86],[w*.14,-119],[w*.25,-160],[w*.04,-196],[w*.17,-231],[lean+2,-278]])});
      body.push({f:'@rock.4',op:.66,d:poly(tops[v].map(([x,y])=>[x+lean,y]).slice(0,-1).concat([[lean+12,-h+13],[lean-26,-h+7]]))});
      const strata=[[-64,20],[-116,9],[-158,15],[-211,10],[-264,14],[-309,8]];
      strata.forEach(([y,hh],i)=>{const half=w*(.28+Math.max(0,(y+300))/330),x=lean*(1+y/430)*.3;body.push({f:i%2?'@rock.1':'@rock.2',op:i%2?.65:.4,d:`M${f1(x-half)} ${y}l${f1(half*.8)} -3 ${f1(half*.8)} 2 ${f1(half*.43)} -2 -3 ${hh} ${f1(-half)} 4 ${f1(-half*.9)} -2z`});});
      for(let i=0;i<19;i++){const y=-29-r()*273,half=w*(.25+(y+300)/340),x=(r()-.5)*half;body.push({s:i%4?'@joint.1':'@joint.0',w:.7+r()*.7,op:.34,detail:i>8,d:`M${f1(x-half*.5)} ${f1(y)}q${f1(half*.4)} ${f1(-3-r()*3)} ${f1(half)} ${f1(-1+r()*2)}`});}
      for(const [i,x]of [-.65,-.26,.1,.43].entries())body.push({s:'@joint.0',w:1.2,op:.32,d:`M${f1(w*x)} -38q${i%2?12:-9} -31 ${i%2?3:-4} -57t${i%2?-1:8} -54m-2-10q7-34-2-52`});
      const cap=tops[v];body.push({f:'@rock.2',op:.42,d:poly([[cap[0][0]+lean,cap[0][1]],[lean-11,-h+31],[lean+12,-h+28],[cap[cap.length-1][0]+lean,cap[cap.length-1][1]],[lean+9,-h+47],[lean-12,-h+47]])});
      for(let i=0;i<7;i++){const x=lean-23+r()*46,y=-h+4+r()*20;body.push({s:'@joint.0',w:.8,op:.33,d:`M${f1(x)} ${f1(y)}l${f1(4+r()*8)} -2m-3 3 2 5`});}
      return{body};
    }});
  define({id:'rock.us-bryce-fin',category:'rock',weight:0,size:[600,365],variants:3,seasonal:false,flippable:true,parts:['body'],palette,shadow:false,reflect:false,tags:['us','bryce','natural','kit:arid','role:rock'],
    build(v,r){const body=[],profiles=[
      [[-297,5],[-271,-48],[-235,-67],[-223,-127],[-204,-140],[-196,-225],[-171,-245],[-169,-317],[-148,-349],[-119,-340],[-114,-292],[-95,-263],[-87,-199],[-64,-186],[-45,-229],[-42,-285],[-19,-313],[8,-306],[17,-265],[43,-249],[49,-185],[76,-157],[99,-171],[108,-247],[130,-262],[149,-247],[156,-205],[185,-178],[198,-102],[228,-77],[255,-34],[299,8]],
      [[-298,5],[-270,-45],[-240,-61],[-226,-119],[-200,-143],[-191,-213],[-164,-244],[-158,-291],[-130,-304],[-101,-286],[-93,-237],[-65,-225],[-53,-174],[-31,-156],[-8,-192],[6,-253],[26,-279],[51,-273],[63,-228],[86,-207],[97,-139],[121,-109],[143,-138],[152,-204],[176,-221],[197,-209],[208,-162],[231,-138],[243,-84],[265,-61],[299,6]],
      [[-298,5],[-274,-39],[-243,-53],[-229,-114],[-208,-137],[-201,-189],[-174,-201],[-159,-245],[-135,-254],[-113,-235],[-107,-196],[-83,-182],[-66,-132],[-40,-153],[-32,-213],[-10,-237],[13,-223],[24,-177],[49,-155],[60,-106],[87,-118],[101,-177],[123,-192],[144,-177],[160,-135],[179,-124],[193,-71],[225,-59],[252,-29],[299,6]]],p=profiles[v];
      body.push({f:{lin:[[0,'@rock.4'],[.3,'@rock.1'],[1,'@rock.0']],y1:-348,y2:6},d:poly(p)});
      body.push({f:'@rock.3',op:.65,d:v===0?'M-119-340L-114-292-95-263-87-199-64-186-45-229-42-285-19-313-8-282-22-240-10-206-31-167-11-112-28-78 2 7-97 5-105-51-129-82-115-120-137-159-124-204-140-241-127-277zM149-247L156-205 185-178 198-102 228-77 255-34 299 8 184 4 171-37 157-66 164-99 143-128 150-163 129-190z':poly(p.slice(16).concat([[112,5],[78,-39],[83,-78],[56,-117],[69,-154],[40,-181],[41,-210]]))});
      for(let i=0;i<17;i++){const y=-29-i*16,x=-230+r()*366,w=36+r()*97;body.push({s:i%3?'@joint.1':'@joint.0',w:1.3,op:.33,detail:i>6,d:`M${f1(x)} ${y}q${f1(w*.4)} -5 ${f1(w)} -1`});}
      body.push({f:'@rock.2',op:.6,d:'M-244-17L-223-53-207-50-186-21-166-11-173 4-266 4zM53 5L72-51 93-80 117-54 138-25 149 8z'});
      return{body};
    }});
  define({id:'tree.us-bristlecone',category:'tree',weight:0,size:[435,420],variants:3,seasonal:true,shapeBySeason:true,flippable:true,parts:['trunk','crown'],shadow:{rx:91,ry:7,h:170},
    palette:{base:{bark:['#665643','#b99c72','#3b3d34'],leaf:['#2e473b','#52664a','#85916c']},spring:{leaf:['#31513c','#608053','#a0ab70']},summer:{leaf:['#344a35','#667345','#9b9c61']},autumn:{leaf:['#465039','#7a7950','#b1a575']},winter:{leaf:['#4a6258','#859b88','#cad3bd']}},anim:{sway:{part:'crown',pivot:[0,-175],deg:.55,period:12.3}},tags:['us','bristlecone','wind-shaped','kit:alpine','role:tree'],
    build(v,r,ctx){const trunk=[],crown=[],lean=(v-1)*15;
      trunk.push({f:'@bark.2',d:`M-25 5Q-40-36-17-82Q-8-112-22-145Q-43-188-20-219Q${-38+lean}-261 ${-87+lean}-277L${-83+lean}-288Q${-21+lean}-275 7-225Q30-260 19-311L31-314Q53-247 23-200Q9-169 27-129Q47-169 103-178L139-199 145-191 117-166Q54-151 37-106Q10-51 28 4z`});
      trunk.push({s:'@bark.1',w:6,op:.8,d:`M-11 1Q-23-41 3-83Q19-122-4-156Q-26-192 3-222Q-4-253 ${-52+lean}-277M12-132Q41-163 99-169`},{s:'@bark.0',w:2.1,d:'M-5-10q22-44 6-79t2-61m-17-19q-8-29 10-52'});
      const masses=[[-122+lean,-283,77,39],[-31+lean,-326,84,46],[48+lean,-345,68,37],[108,-210,72,32],[159,-236,49,29],[-66,-216,63,28]];
      masses.forEach(([x,y,rx,ry],i)=>{x+=(r()-.5)*19;y+=(r()-.5)*13;const pts=Array.from({length:27},(_,j)=>{const a=j*Math.PI*2/27,k=.82+r()*.23;return[x+Math.cos(a)*rx*k,y+Math.sin(a)*ry*k];});crown.push({f:'@leaf.0',d:poly(pts)},{f:'@leaf.1',op:.8,d:poly(pts.slice(14).concat([[x+rx*.4,y+4],[x-rx*.8,y+8]]))});let sprigs='';for(let j=0;j<14;j++){const xx=x+(r()-.5)*rx*1.5,yy=y+(r()-.5)*ry*1.3;sprigs+=`M${f1(xx)} ${f1(yy)}l-5-5m5 5 1-7m-1 7 5-5`;}crown.push({s:'@leaf.2',w:1.2,op:.5,d:sprigs,detail:true});if(ctx.season==='winter')crown.push({s:'#dbe1d3',w:5,op:.67,d:`M${f1(x-rx*.6)} ${f1(y-ry*.3)}q${f1(rx*.6)} ${f1(-ry*.5)} ${f1(rx*1.2)} ${f1(ry*.1)}`});});
      return{trunk,crown};
    }});
})();
