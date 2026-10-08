/* Native West Texas landforms. Each skyline is authored separately: the long,
   tilted Franklin ridge and the blockier volcanic Chisos basin. The relief is
   made of branching gullies, scree fans, seams and lit shoulders, not triangles.
   The El Paso star is a physical bulb outline on the south mountain face.
   Anchor: foot of the range. No border imagery, signs or emblems. */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const { define, poly, circ, f1 } = sceneDraw;
  const FRANKLIN = [[-930,-10],[-850,-60],[-780,-78],[-714,-119],[-650,-103],[-590,-158],[-532,-184],[-488,-158],[-443,-210],[-395,-182],[-348,-231],[-300,-216],[-256,-262],[-208,-240],[-162,-298],[-124,-278],[-86,-322],[-52,-316],[-19,-354],[8,-362],[34,-339],[59,-347],[92,-312],[125,-326],[162,-284],[200,-290],[245,-255],[280,-275],[313,-243],[346,-252],[383,-206],[415,-224],[450,-185],[490,-192],[533,-153],[570,-164],[620,-124],[678,-139],[735,-92],[798,-82],[856,-35],[930,-5]];
  const CHISOS = [[-940,-4],[-852,-32],[-775,-91],[-714,-113],[-668,-167],[-612,-202],[-568,-219],[-548,-264],[-520,-273],[-501,-253],[-463,-246],[-434,-210],[-389,-192],[-356,-208],[-328,-181],[-280,-204],[-236,-259],[-215,-302],[-185,-310],[-172,-344],[-142,-350],[-122,-333],[-90,-341],[-69,-316],[-30,-318],[2,-300],[27,-315],[57,-282],[101,-269],[129,-239],[157,-252],[182,-277],[202,-324],[226,-331],[238,-365],[270,-374],[294,-362],[312,-339],[338,-352],[361,-327],[397,-324],[420,-301],[445,-290],[480,-248],[525,-245],[558,-201],[596,-206],[633,-168],[671,-178],[704,-131],[753,-116],[810,-62],[870,-38],[940,-5]];
  const Y = (K,x) => { for(let i=1;i<K.length;i++) if(x<=K[i][0]) { const a=K[i-1], b=K[i], t=(x-a[0])/(b[0]-a[0]); return a[1]+(b[1]-a[1])*t; } return K[K.length-1][1]; };
  const line = p => p.map((v,i)=>(i?'L':'M')+f1(v[0])+' '+f1(v[1])).join('');
  const star = (x,y,R,r) => Array.from({length:10},(_,i)=>{const a=(i*36-90)*Math.PI/180; return [x+Math.cos(a)*(i%2?r:R),y+Math.sin(a)*(i%2?r:R)];});
  function relief(K,r,kind) {
    const body = [];
    const foot = kind==='chisos' ? [[940,4],[862,11],[799,3],[732,18],[665,7],[604,23],[535,9],[461,14],[394,1],[330,19],[256,8],[191,24],[117,12],[51,18],[-24,5],[-99,22],[-164,10],[-238,16],[-310,2],[-382,19],[-459,7],[-531,21],[-607,10],[-682,16],[-754,2],[-829,13],[-903,5],[-940,0]] : [[K[K.length-1][0],14],[K[0][0],14]];
    body.push({f:{lin:[[0,'@rock.2'],[.58,'@rock.0'],[1,'@rock.1']],x1:-350,y1:-340,x2:300,y2:10},d:poly([...K,...foot])});
    // Large irregular shoulders carry the mountain's volume. Their upper edge
    // follows the actual skyline; the lower edge fans into the alluvial foot.
    if(kind==='chisos') {
      // Unequal volcanic buttresses end at ledges, gullies or scree, rather
      // than repeating full-height curved ribbons down the whole range.
      const faces=[[-775,-704,-743,-683,-708,-660,-110],[-612,-548,-594,-520,-552,-487,-123],[-520,-434,-493,-451,-475,-406,-73],[-280,-172,-244,-196,-225,-145,-154],[-142,-69,-116,-57,-98,-12,-186],[27,129,54,111,77,154,-95],[202,270,220,262,234,287,-162],[294,397,332,383,350,423,-205],[445,558,479,542,516,589,-87],[671,753,689,747,720,804,-46]];
      faces.forEach(([a,b,c,d,e,f,ledge],i)=>{
        const ya=Y(K,a),yb=Y(K,b),ym=ledge+(i%3)*17;
        body.push({f:i%3===1?'@rock.3':'@rock.2',op:i%3===1?.31:.23,d:poly([[a,ya+3],[b,yb+2],[d,ym-21],[c,ym],[e,ym+15],[f,Math.min(-8,ym+71)],[e+9,Math.min(8,ym+82)],[c-17,ym+17],[a+12,ya+48]])});
        body.push({f:'@gully',op:.38,d:poly([[b+2,yb+6],[d+9,ym-17],[d+29,ym+20],[f+18,Math.min(11,ym+79)],[f+9,Math.min(11,ym+82)],[d+17,ym+19],[d+1,ym-13]])});
        body.push({s:'@seam.0',w:1.4,op:.25,detail:true,d:`M${c-13} ${ym+4}l${17+i%3*7} -3l${12-i%2*5} 6m-8 -2l-9 21`});
      });
    } else for(let i=1;i<K.length-4;i+=4) {
      const a=K[i], b=K[i+1], c=K[i+2], d=K[i+3], foot=a[0]+(kind==='franklin'?-45:70)+r()*70, fy=-12-r()*30;
      body.push({f:i%8===1?'@rock.1':'@rock.3',op:i%8===1?.45:.3,d:line([a,b,c,d])+`Q${f1(d[0]-18)} ${f1(d[1]*.47)} ${f1(foot+75)} ${f1(fy)}Q${f1(foot+5)} ${f1(fy+9)} ${f1(foot-35)} ${f1(fy-3)}Q${f1(a[0]+14)} ${f1(a[1]*.65)} ${f1(a[0])} ${f1(a[1])}z`});
      const p=[a[0]+4,a[1]+5], q=[foot+12,fy-7];
      body.push({f:'@rock.2',op:.24,d:`M${f1(p[0])} ${f1(p[1])}Q${f1(p[0]-18)} ${f1(p[1]*.6)} ${f1(q[0]-25)} ${f1(q[1])}L${f1(q[0]+3)} ${f1(q[1]+1)}Q${f1(p[0]+12)} ${f1(p[1]*.62)} ${f1(p[0]+18)} ${f1(p[1]+7)}z`});
    }
    // Eroded seams dip with the rock face. They remain short and discontinuous,
    // avoiding the broad flat striping that would flatten a canyon painting.
    for(let i=0;i<31;i++) {
      const x=-790+r()*1580, y=Y(K,x), t=.22+r()*.61, yy=y*(1-t), w=20+r()*67;
      body.push({s:i%3?'@seam.0':'@seam.1',w:1.1+r()*1.8,op:.26+r()*.2,detail:true,d:`M${f1(x-w/2)} ${f1(Math.max(Y(K,x-w/2)+8,yy))}q${f1(w*.22)} ${f1(-3-r()*7)} ${f1(w*.5)} ${f1(-1-r()*3)}t${f1(w*.5)} ${f1(3+r()*6)}`});
    }
    // Branched drainage cuts, widened shadow and pale rim on the lit edge.
    for(let i=0;i<27;i++) {
      const x=-760+r()*1520, top=Y(K,x)+17+r()*32, len=Math.min(-top-12,32+r()*94), bottom=top+len, bend=(r()-.5)*64, w=2+r()*6;
      body.push({f:'@gully',op:.27,d:`M${f1(x)} ${f1(top)}Q${f1(x+bend*.15-w)} ${f1((top+bottom)*.5)} ${f1(x+bend-w)} ${f1(bottom)}Q${f1(x+bend*.55+3)} ${f1((top+bottom)*.56)} ${f1(x+3)} ${f1(top+1)}z`});
      body.push({s:'@rock.2',w:.8,op:.32,detail:true,d:`M${f1(x-3)} ${f1(top+4)}q${f1(bend*.2-4)} ${f1(len*.23)} ${f1(bend*.4)} ${f1(len*.44)}`});
      if(i%3===0) body.push({f:'@gully',op:.32,detail:true,d:poly([[x+bend*.4,top+len*.47],[x-8,top+len*.22],[x-4,top+len*.45],[x+bend*.5+2,top+len*.6]])});
    }
    // Angular talus fans at the foot. These are geology, separate from the
    // scene's scattered near gravel and plants.
    for(let i=0;i<23;i++) {
      const x=-820+i*72+r()*32, y=-8-r()*30, w=19+r()*35;
      body.push({f:i%3?'@rock.0':'@rock.3',op:.48,d:`M${f1(x-w)} ${f1(y+10)}Q${f1(x-25)} ${f1(y-5)} ${f1(x-9)} ${f1(y-10-r()*12)}L${f1(x+7)} ${f1(y-7)}Q${f1(x+22)} ${f1(y+5)} ${f1(x+w)} ${f1(y+12)}z`});
    }
    return body;
  }
  const common={category:'landmark',variants:1,seasonal:false,flippable:false,shadow:false,reflect:false,
    palette:{base:{rock:['#87645f','#594452','#c39376','#6f5258'],seam:['#d2a787','#533f4b'],gully:'#443746',star:'#bba886'}},
    tags:['landmark','natural','texas','kit:arid','role:landmark']};
  define(Object.assign({},common,{
    id:'landmark.franklin-star-range',tags:[...common.tags,'place:texas/place:el-paso'],size:[1860,380],parts:['body','lit'],
    night:{glow:{lamp:'#ffe7ad'},on:1},credit:'native Franklin mountain and El Paso star, after the Texas opening',
    build(v,r){
      const body=relief(FRANKLIN,r,'franklin'), lit=[], P=star(12,-244,55,23);
      // Steel frame visible by day, individual bulbs visible at night.
      body.push({s:'@star',w:2.2,op:.8,d:line([...P,P[0]])});
      for(let i=0;i<P.length;i++) {
        const a=P[i],b=P[(i+1)%P.length],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/8);
        for(let j=0;j<n;j++){const t=j/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;body.push({f:'#d2c3a3',d:circ(x,y,1.25)});lit.push({f:'#ffeac0',d:circ(x,y,2.1)});}
      }
      return {body,lit};
    }
  }));
  define(Object.assign({},common,{
    id:'landmark.chisos-basin',tags:[...common.tags,'place:texas/place:west-texas-sunset'],size:[1880,390],parts:['body'],credit:'native Chisos-inspired volcanic basin and crags',
    palette:{base:{rock:['#9b6d58','#63474a','#d5a078','#80574d'],seam:['#e1b48a','#593e44'],gully:'#4d3b46'}},
    build(v,r){return {body:relief(CHISOS,r,'chisos')};}
  }));
})();
