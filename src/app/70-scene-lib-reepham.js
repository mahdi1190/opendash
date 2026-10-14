/* Reepham: hand-drawn architecture, ground metres in the four view files.
   References (viewpoint, not copied pixels): Wikimedia Commons Geograph
   765581 (Market Place), 766121 (the two churches), Reepham railway station
   in 2008; 3154327 (Whitwell platform); whitwellstation.com.
   The former station is a walking/cycling route, NOT an operating railway.
   MODEL: proof-fleet-pond/hampshire-fleet-pond-proof. Take foreground framing,
   a leading line and distance-scaled life; use original masonry/roof geometry.
   Engine owns sky, illumination, shadows, seasons and weather throughout.
   Dimensions are visual estimates, not a measured architectural survey. */
let sceneReephamTrees;
const SCENE_REEPHAM = (function () {
  function base(id, lat, lon, heading, setting, x0) {
    sceneReephamTrees();
    return {v:2,id,view:{lat,lon},camera:{eye:1.65,fov:66,horizon:450,x0:x0||800,lat,lon,heading},
      at:'afternoon',season:'auto',setting,atmos:'auto',weather:'live',cover:'auto',particles:'season',signage:false,
      kits:['temperate','urban','people','birds'],sky:{stars:180,clouds:{n:3,y:[50,305],speed:3},sunR:24,moonR:18},
      surfaces:[],water:[],ground:[],place:[],scatter:[],actors:[],flocks:[],flows:[]};
  }
  function plants(data,on,seed,n,d,near) {
    const range=d||[4.8,95];
    data.scatter.push({obj:{'plant.rph-short-grass':3,'plant.rph-rosette':2,'plant.wildflowers':1},on,d:data.setting==='urban'?range:[Math.max(10,range[0]),range[1]],n:Math.round((n||320)*.5),
      dist:'screen',gap:.22,k:[.9,1.1],seed,anim:false,tint:{col:'#c4a77b',k:[0,.05]}});
    if(data.setting!=='urban')data.scatter.push({obj:{'plant.rph-short-grass':3,'plant.rph-rosette':2},on,d:[4.7,9.1],n:near||360,
      dist:'screen',gap:.16,k:[.9,1.1],seed:seed+1039,anim:false,tint:{col:'#b5ad80',k:[0,.05]}});
  }
  function woodland(data,on,seed,d,n) {
    data.scatter.push({obj:{'tree.rph-wyv-far-oak':3,'tree.rph-pool-birch':2,'tree.rph-wyv-far-sallow':1},on,d,n,dist:'ground',
      cluster:{centres:9,spread:12},gap:'foot',seed,k:[.8,1.2],anim:false,shadow:false,tint:{col:'#b7c6bc',k:[0,.15]}});
  }
  function life(data,route,seed) {
    data.actors.push(...sceneBehave.pair(data,{obj:'person.walker',route,preset:'chat',seed,offset:.2}),
      sceneBehave.actor(data,{obj:'person.walker',route,preset:'dog-walker',seed:seed+137,offset:.7}),
      sceneBehave.actor(data,{obj:'animal.dog',route,preset:'dog-trot',seed:seed+353,offset:.74}));
  }
  function raised(data,poly,height) {
    // The existing engine's relief grid raises the actual surface AND feet.
    // No independent deck renderer or hand-painted shadow is introduced.
    const h=[],nx=25,nd=20;
    for(let j=0;j<nd;j++)for(let i=0;i<nx;i++){
      const x=-24+i*2,d=4*Math.pow(110/4,j/(nd-1));let inside=false;
      for(let a=0,b=poly.length-1;a<poly.length;b=a++)if((poly[a][1]>d)!==(poly[b][1]>d)&&x<(poly[b][0]-poly[a][0])*(d-poly[a][1])/(poly[b][1]-poly[a][1])+poly[a][0])inside=!inside;
      h.push(inside?height:0);
    }
    data.ground={relief:{x:[-24,24],d:[4,110],nx,nd,h}};
  }
  function finish(data) {
    // Compact the preset's dense timed samples while keeping waits, turns and
    // timing. Within 0.5 scene pixels of its original screen-space trajectory.
    for(const a of data.actors) {
      if(!a.path||a.path.length<3)continue;
      const P=a.path,T=[0];for(let i=1;i<P.length;i++)T[i]=T[i-1]+(P[i-1][2]||0)+(P[i][4]||0);
      const keep=new Set([0,P.length-1]);for(let i=0;i<P.length;i++)if(P[i][2]||i&&P[i][3]!==P[i-1][3]){keep.add(i);if(i)keep.add(i-1);}
      function split(i,j){let best=.5,idx=-1;for(let k=i+1;k<j;k++){const t=(T[k]-T[i])/(T[j]-T[i]||1),err=Math.hypot(P[k][0]-P[i][0]-(P[j][0]-P[i][0])*t,P[k][1]-P[i][1]-(P[j][1]-P[i][1])*t);if(err>best){best=err;idx=k;}}
        if(idx!==-1){keep.add(idx);split(i,idx);split(idx,j);}}
      const anchors=[...keep].sort((a,b)=>a-b);for(let i=1;i<anchors.length;i++)split(anchors[i-1],anchors[i]);
      const ids=[...keep].sort((a,b)=>a-b);a.path=ids.map((i,j)=>[P[i][0],P[i][1],P[i][2],P[i][3],j?Math.round((T[i]-T[ids[j-1]]-(P[ids[j-1]][2]||0))*100)/100:null]);
      // Scale is linear in projected ground Y for a level camera.
      if(a.sByY&&a.sByY.length>2&&!(data.ground&&data.ground.relief))a.sByY=[a.sByY[0],a.sByY[a.sByY.length-1]];
      else if(a.sByY&&a.sByY.length>2){
        const S=a.sByY,K=new Set([0,S.length-1]);
        function slim(i,j){let e=.001,k=-1;for(let q=i+1;q<j;q++){const t=(S[q][0]-S[i][0])/(S[j][0]-S[i][0]||1),v=Math.abs(S[q][1]-S[i][1]-(S[j][1]-S[i][1])*t);if(v>e){e=v;k=q;}}
          if(k>=0){K.add(k);slim(i,k);slim(k,j);}}
        slim(0,S.length-1);a.sByY=[...K].sort((a,b)=>a-b).map(i=>S[i]);
      }
    }
    return data;
  }
  return {base,plants,woodland,life,finish,raised};
})();

/* Coppiced hazel beside the former trackbed: upright stems, forked sprays
   and individually drawn pointed leaves rather than rounded hedge blobs.
   The existing shrub supplies the seasonal palette and sway behaviour. */
function sceneReephamHazel() {
  if(sceneObj('plant.rph-hazel-coppice'))return;
  const model=sceneObj('plant.shrub');
  // A connected trackside stand, not separate ornamental shrub crowns.
  // Long arching shoots carry small leaves with open gaps between sprays.
  sceneObjDefine(Object.assign({},model,{id:'plant.rph-trackside-thicket',size:[700,500],
    real:{h:4.5,l:6.3,w:3.2},variants:2,parts:['body'],weight:0,
    palette:{base:{},spring:{twig:['#4d5140','#646547'],leaf:['#263f2c','#456440','#718456']},
      summer:{twig:['#494d3d','#5e6046'],leaf:['#253d2a','#405d36','#687c48']},
      autumn:{twig:['#4b4938','#666048'],leaf:['#494b2d','#72713b','#a38b43']},
      winter:{twig:['#555447','#757161'],leaf:['#555b47','#727761','#92947a']}},
    anim:{sway:{part:'body',pivot:[0,0],deg:.2}},build(v,r,ctx){
      const B=[],stems=['',''],foliage=['','',''],fine=['','',''],N=x=>Math.round(x);
      for(let j=0;j<18;j++){
        const root=(r()-.5)*360,tip=root+(r()-.5)*350,h=180+r()*260,
          control=root+(tip-root)*.15;
        stems[0]+=`M${N(root-2)} 0Q${N(control-3)} ${N(-h*.7)} ${N(tip)} ${N(-h)}Q${N(control+3)} ${N(-h*.7)} ${N(root+2)} 0z`;
        for(let k=0;k<7;k++){
          const t=.22+k*.105,x=(1-t)*(1-t)*root+2*(1-t)*t*control+t*t*tip,
            y=-h*(1.4*t-.4*t*t),side=(k+j)%2?1:-1,
            tx=x+side*(35+r()*65),ty=y-25-r()*38;
          stems[1]+=`M${N(x)} ${N(y)}Q${N(x+side*25)} ${N(y-25)} ${N(tx)} ${N(ty)}`;
          if(ctx.season==='winter')continue;
          for(let q=0;q<3;q++){
            const u=.15+q*.3,xl=x+(tx-x)*u+(r()-.5)*15,yl=y+(ty-y)*u,
              w=5+r()*5,l=12+r()*9,sg=q%2?1:-1;
            (q===0?foliage:fine)[(j+k+q)%3]+=`M${N(xl)} ${N(yl)}q${N(sg*w*1.6)} ${N(-l*.2)} ${N(sg*w)} ${N(-l)}q${N(-sg*w*1.2)} ${N(l*.1)} ${N(-sg*w)} ${N(l)}z`;
          }
        }
      }
      if(ctx.season!=='winter'){
        // Dense interlocking foliage planes establish the stand's volume.
        // Small sprays soften their broken outlines, rather than covering
        // the whole silhouette with uniformly bright individual leaves.
        let mass='',massFine='';
        for(let j=0;j<7;j++){
          const cx=-245+j*77+(r()-.5)*30,cy=-85-r()*105;
          for(let k=0;k<80;k++){
            const a=r()*Math.PI*2,z=Math.sqrt(r()),x=cx+Math.cos(a)*87*z,
              y=cy+Math.sin(a)*126*z,w=8+r()*8,l=17+r()*11,sg=k%2?1:-1;
            const leaf=`M${N(x)} ${N(y)}q${N(sg*w)} ${N(-l*.8)} ${N(sg*w)} ${N(-l)}q${N(-sg*w*1.6)} ${N(l*.1)} ${N(-sg*w)} ${N(l)}z`;
            if(k%12===0)mass+=leaf;else massFine+=leaf;
          }
        }
        B.push({f:'@leaf.0',d:mass});
        B.push({f:'@leaf.0',d:massFine,detail:true});
      }
      if(ctx.season!=='winter')for(let j=0;j<170;j++){
        // The bramble layer knits the coppice stems together down to the
        // ground; its outline follows arching shoots rather than a hedge box.
        const x=(r()-.5)*580,y=-25-r()*175*(1-Math.abs(x)/380),
          w=5+r()*6,l=11+r()*10,sg=j%2?1:-1;
        fine[j%3]+=`M${N(x)} ${N(y)}q${N(sg*w*1.6)} ${N(-l*.25)} ${N(sg*w)} ${N(-l)}q${N(-sg*w*1.2)} ${N(l*.1)} ${N(-sg*w)} ${N(l)}z`;
      }
      B.push({f:'@twig.0',d:stems[0]},{s:'@twig.1',w:1,d:stems[1]});
      foliage.forEach((d,i)=>{if(d)B.push({f:'@leaf.'+i,d,detail:true});});
      fine.forEach((d,i)=>{if(d)B.push({f:'@leaf.'+i,d,detail:true});});
      return {body:B};
    }}));
  sceneObjDefine(Object.assign({},model,{id:'plant.rph-hazel-coppice',size:[460,300],
    real:{h:2.7,l:4.2,w:2.2},variants:3,parts:['body'],weight:0,
    anim:{sway:{part:'body',pivot:[0,-20],deg:.45}},
    build(v,r,ctx){
      const B=[],leaves=['','',''],fine=['','',''],catkins=[],branches=['',''];
      const N=x=>Math.round(x);
      function leaf(x,y,a,length,bucket){
        const p=(u,t)=>[N(x+u*Math.cos(a)-t*Math.sin(a)),N(y+u*Math.sin(a)+t*Math.cos(a))].join(' ');
        // An asymmetrical heart-shaped hazel leaf, attached at its base.
        bucket.push('M'+p(0,0)+'Q'+p(-length*.65,-length*.3)+' '+p(-length*.32,-length*.68)+
          'Q'+p(-length*.15,-length*.85)+' '+p(0,-length)+'Q'+p(length*.6,-length*.62)+' '+p(length*.4,-length*.27)+
          'Q'+p(length*.15,-length*.08)+' '+p(0,0)+'z');
      }
      for(let stem=0;stem<7;stem++){
        const bx=(r()-.5)*65,ex=(r()-.5)*290,ey=-145-r()*115;
        branches[0]+='M'+N(bx-2)+' 0Q'+N(ex*.5-1)+' '+N(ey*.52)+' '+N(ex)+' '+N(ey)+
          'Q'+N(ex*.5+2)+' '+N(ey*.52)+' '+N(bx+2)+' 0z';
        for(let j=0;j<5;j++){
          const t=.3+j*.13,px=bx+(ex-bx)*t,py=ey*t,side=(j+stem)%2?1:-1,
            tx=px+side*(35+r()*50),ty=py-30-r()*35;
          branches[1]+='M'+N(px)+' '+N(py)+'Q'+N((px+tx)/2)+' '+N(py-20)+' '+N(tx)+' '+N(ty);
          if(ctx.season==='winter'){
            if(j%3===0)catkins.push('M'+N(tx)+' '+N(ty)+'l2 9');
            continue;
          }
          for(let k=0;k<5;k++){
            const u=.12+k*.18+r()*.12,x=px+(tx-px)*u+(r()-.5)*12,y=py+(ty-py)*u+(r()-.5)*12,
              a=(side===1?.8:-.8)+(r()-.5)*.65,L=14+r()*11,index=(stem+j+k)%3,out=[];
            leaf(x,y,a+(k%2?.7:-.3),L,out);
            (k===0?leaves:fine)[index]+=out.join('');
          }
        }
      }
      B.push({f:'@twig.0',d:branches[0]},{s:'@twig.1',w:.9,d:branches[1],detail:true});
      leaves.forEach((d,i)=>{if(d)B.push({f:'@leaf.'+i,d});});
      fine.forEach((d,i)=>{if(d)B.push({f:'@leaf.'+i,d,detail:true});});
      if(catkins.length)B.push({s:'@catkin',w:2,d:catkins.join(''),detail:true});
      return {body:B};
    }}));
  sceneObjDefine({id:'plant.rph-woodland-sedge',category:'plant',size:[120,110],
    real:{h:.38,l:.45,w:.3},variants:4,seasonal:true,shapeBySeason:false,flippable:true,
    parts:['body'],tags:['uk','woodland','kit:temperate','role:ground','class:cover'],
    palette:{base:{},spring:{leaf:['#5b783f','#859954']},summer:{leaf:['#48673d','#70834c']},
      autumn:{leaf:['#756747','#96865d']},winter:{leaf:['#706c56','#939078']}},
    anim:{sway:{part:'body',pivot:[0,0],deg:1}},build(v,r){
      const paths=['',''],N=x=>Math.round(x);
      for(let i=0;i<21;i++){
        const x=(r()-.5)*22,dx=(r()-.5)*100,h=28+r()*70;
        paths[i%2]+='M'+N(x)+' 0Q'+N(x+dx*.1)+' '+N(-h*.75)+' '+N(x+dx)+' '+N(-h)+
          'Q'+N(x+dx*.16+2)+' '+N(-h*.7)+' '+N(x+1.5)+' 0z';
      }
      return {body:paths.map((d,i)=>({f:'@leaf.'+i,d}))};
    }});
}

/* Camera-specific station geometry, using the existing engine projection.
   Unlike an elevation sprite, every window, roof course and platform coping
   lies on its actual plane in metres. Placements remain ground anchors. */
const SCENE_REEPHAM_STATION = (function () {
  const camera={eye:1.65,fov:66,horizon:490,x0:800};
  const edges=[];
  for(let d=9;d<77;d+=4)edges.push({d,end:d+4,x:-2.65-.025*d});
  function draw(anchor,realH,sizeH,viewCamera) {
    const cam=sceneCamera({camera:viewCamera||camera}),a=sceneProject(cam,anchor[0],anchor[1],anchor[2]||0),s=a.k*realH/sizeH;
    const p=(x,d,h)=>{const q=sceneProject(cam,x,d,h);return [Math.round((q.X-a.X)/s*10)/10,Math.round((q.Y-a.Y)/s*10)/10];};
    const path=pts=>pts.map((v,i)=>(i?'L':'M')+p(...v).join(' ')).join('')+'z';
    return {p,path};
  }
  function define() {
    if(sceneObj('landmark.rph-station-perspective'))return;
    sceneReephamHazel();
    const bough=sceneObj('plant.canal-view-bough');
    sceneObjDefine(Object.assign({},bough,{id:'plant.rph-station-bough',weight:0,tags:bough.tags.filter(t=>!t.startsWith('role:')).concat('role:shrub'),build(v,r,ctx){
      const S=sceneObjShapes('plant.canal-view-bough',v,ctx.season),out={};
      for(const part of S.order)out[part]=S.parts[part].map((q,i)=>{
        const shape=Object.assign({},q,part==='leaves'&&i%8!==0?{detail:true}:{});
        if(part==='leaves'&&q.f&&ctx.season!=='winter'){
          const b=scenePathBox(q.d),cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2,
            h=(b[3]-b[1])*.45,a=(r()-.5)*1.5,point=(x,y)=>[
              Math.round(cx+(x*Math.cos(a)-y*Math.sin(a))*h/17),
              Math.round(cy+(x*Math.sin(a)+y*Math.cos(a))*h/17)];
          const side=[[0,-17],[5,-10],[3,-5],[6,1],[0,13]],
            ring=side.concat(side.slice(1,-1).reverse().map(([x,y])=>[-x,y]));
          const P=ring.map(p=>point(...p)),mid=(p,q)=>p.map((v,j)=>Math.round((v+q[j])/2));
          shape.d='M'+mid(P[P.length-1],P[0]).join(' ');
          P.forEach((p,j)=>{shape.d+='Q'+p.join(' ')+' '+mid(p,P[(j+1)%P.length]).join(' ');});
          shape.d+='z';
        }
        return shape;
      });
      Object.defineProperty(out,'$anim',{value:S.anim});return out;
    }}));
    sceneObjDefine({id:'landmark.rph-station-perspective',category:'landmark',size:[1100,800],
      real:{h:8.5,l:8,w:16},variants:1,seasonal:false,flippable:false,parts:['body','roof','win'],
      palette:{base:{}},night:{glow:{window:'#ffd5a0'},on:.65},
      tags:['uk','reepham','landmark','place:uk-east/reepham','kit:temperate','role:landmark'],build(v,r){
        const G=draw([-4.9,28,.55],8.5,800),B=[],roof=[],win=[];
        const poly=(out,col,pts,extra)=>out.push(Object.assign({f:col,d:G.path(pts)},extra));
        // The buff-brick two-storey block, with its gabled side visible;
        // the long platform wall and lower range recede westward.
        poly(B,'#c5ad78',[[-12,28,.55],[-4.9,28,.55],[-4.9,28,5.8],[-12,28,5.8]]);
        poly(B,'#b79d69',[[-4.9,28,.55],[-4.9,39,.55],[-4.9,39,5.8],[-4.9,33.5,8.55],[-4.9,28,5.8]]);
        poly(B,'#ac7451',[[-4.9,39,.55],[-4.9,62,.55],[-4.9,62,3.2],[-4.9,39,3.2]]);
        const marks=['','',''];
        for(let i=0;i<235;i++){
          const h=.75+Math.floor(r()*33)*.145,x=-11.8+r()*6.6;
          marks[i%3]+=G.path([[x,28,h],[x+.21,28,h],[x+.21,28,h+.09],[x,28,h+.09]]);
        }
        for(let i=0;i<245;i++){
          const d=28.2+r()*10.5,h=.75+Math.floor(r()*33)*.145;
          marks[i%3]+=G.path([[-4.9,d,h],[-4.9,d+.23,h],[-4.9,d+.23,h+.09],[-4.9,d,h+.09]]);
        }
        marks.forEach((d,i)=>B.push({f:['#cfb985','#ac976c','#cbb881'][i],d,detail:true}));
        // Slate is laid on the pitched plane, not a rectangular roof grid.
        poly(roof,'#525d59',[[-12.25,27.65,5.8],[-4.65,27.65,5.8],[-4.65,33.5,8.65],[-12.25,33.5,8.65]]);
        poly(roof,'#59655f',[[-8.2,38.8,4.25],[-8.2,62.4,4.25],[-4.6,62.4,3.2],[-4.6,38.8,3.2]]);
        let tiles='';
        for(let j=1;j<17;j++)for(let x=-12.2;x<-4.8;x+=.42){
          const d=27.65+j*5.85/17,h=5.8+j*2.85/17;
          tiles+=G.path([[x,d,h+.015],[x+.36,d,h+.015],[x+.36,d+.025,h],[x,d+.025,h]]);
        }
        roof.push({f:'#a2aaa0',op:.4,d:tiles,detail:true});
        // Quoins and string courses follow both visible masonry planes.
        for(let h=.55;h<5.65;h+=.29){
          poly(B,'#e0c99b',[[-5.2,28,h],[-4.9,28,h],[-4.9,28,h+.22],[-5.2,28,h+.22]],{detail:true});
          poly(B,'#d4bb8c',[[-4.9,28,h],[-4.9,28.3,h],[-4.9,28.3,h+.22],[-4.9,28,h+.22]],{detail:true});
        }
        function opening(side,t,h,w,height,door){
          const at=(u,z,depth)=>side?[-4.9+(depth||0),t+u,z]:[t+u,28-(depth||0),z];
          const quad=(out,c,u,z,ww,hh,extra)=>poly(out,c,[at(u,z),at(u+ww,z),at(u+ww,z+hh),at(u,z+hh)],extra);
          quad(B,'#e1d6b2',-.08,h-.1,w+.16,height+.22);
          quad(B,'#454c46',0,h,w,height);
          if(door){quad(B,'#64765f',.06,h+.08,w-.12,height-.16);quad(B,'#344b48',.13,h+height*.6,w-.26,height*.32);return;}
          let panes='';
          for(const u of [.065,w*.52])for(const z of [h+.06,h+height*.53])panes+=G.path([at(u,z),at(u+w*.42,z),at(u+w*.42,z+height*.43),at(u,z+height*.43)]);
          win.push({f:'#526e72',d:panes,glow:'window'});
          quad(B,'#eee6c9',w*.48,h,.045,height);
          quad(B,'#eee6c9',0,h+height*.5,w,.045);
          quad(B,'#d8c99f',-.13,h-.1,w+.26,.08);
        }
        opening(false,-10.9,.55,1.1,2.2,true);
        opening(false,-7.4,1.3,1.15,1.7);
        // The paired round-headed opening distinguishes the former station
        // from a domestic frontage. Its arch and glazing share the wall plane.
        for(const x of [-10.9,-10.08]){
          const h=4.1,w=.66,hh=1.18,at=(u,z)=>[x+u,27.99,z],arch=(border)=>{
            const pts=[at(-border,h-border),at(w+border,h-border),at(w+border,h+hh-.31)];
            for(let j=0;j<=10;j++){const a=j*Math.PI/10;pts.push(at(w/2+(w/2+border)*Math.cos(a),h+hh-.31+(w/2+border)*Math.sin(a)));}
            return pts.concat([at(-border,h-border)]);
          };
          poly(B,'#e4ddbf',arch(.085));
          poly(win,'#526e72',arch(0),{glow:'window'});
          // The white mullion is a hole in the single room's glow path.
          const q=[at(w*.47,h),at(w*.53,h),at(w*.53,h+hh-.12),at(w*.47,h+hh-.12)];
          win[win.length-1].d+=G.path(q.reverse());
        }
        for(const d of [29.7,33.6,37]){opening(true,d,1.25,1.05,1.7);opening(true,d,4.1,1,1.2);}
        opening(true,40.5,.55,.95,2.05,true);
        for(const d of [44,48,52.5,57.5])opening(true,d,1.1,.9,1.35);
        poly(B,'#8b7958',[[-10.2,32.4,7.4],[-9.6,32.4,7.4],[-9.6,32.4,9.05],[-10.2,32.4,9.05]]);
        poly(B,'#bca37b',[[-9.6,32.4,7.4],[-9.6,33,7.4],[-9.6,33,9.05],[-9.6,32.4,9.05]]);
        return {body:B,roof,win};
      }});
    edges.forEach((e,i)=>sceneObjDefine({id:'structure.rph-platform-perspective-'+i,category:'structure',size:[1500,100],
      real:{h:.55,l:4,w:.3},foot:.15,variants:1,seasonal:false,flippable:false,parts:['body'],palette:{base:{}},
      tags:['uk','reepham','unlit','kit:temperate','role:street','class:street'],build(v,r){
        const G=draw([e.x,e.d,0],.55,100),out=[],endx=-2.65-.025*e.end,left=-6.1-.075*e.d,leftEnd=-6.1-.075*e.end;
        const shape=(f,pts,more)=>out.push(Object.assign({f,d:G.path(pts)},more));
        shape('#aaa58d',[[left,e.d,.55],[e.x,e.d,.55],[endx,e.end,.55],[leftEnd,e.end,.55]]);
        shape('#6c6857',[[e.x,e.d,0],[endx,e.end,0],[endx,e.end,.5],[e.x,e.d,.5]]);
        shape('#cec7ac',[[e.x-.22,e.d,.55],[e.x+.05,e.d,.55],[endx+.05,e.end,.55],[endx-.22,e.end,.55]]);
        let joints='',wear='';
        for(let d=e.d+.45;d<e.end;d+=.72){const x=-2.65-.025*d;
          joints+=G.path([[x-.23,d,.558],[x+.06,d,.558],[x+.06,d+.025,.558],[x-.23,d+.025,.558]]);
          wear+=G.path([[x,d,.13],[x+.006,d+.42,.13],[x+.006,d+.42,.19],[x,d,.19]]);
        }
        out.push({f:'#736d59',d:joints,detail:true},{f:'#a38d68',d:wear,detail:true});
        const a=G.p(left+.5,e.d+1,.559),b=G.p((left+e.x)/2,e.d+1.65,.559),c=G.p(e.x-.6,e.d+1.4,.559);
        out.push({s:'#837e69',w:.55,d:`M${a.join(' ')}Q${b.join(' ')} ${c.join(' ')}`,detail:true});
        let moss='';
        for(let j=0;j<12;j++){const d=e.d+r()*4,x=-2.65-.025*d;
          moss+=G.path([[x-.2,d,.56],[x-.08,d+.15,.56],[x-.13,d+.29,.56],[x-.32,d+.16,.56]]);}
        out.push({f:'#7b8863',d:moss,detail:true});
        let erosion='',cracks='',grass='';
        for(let j=0;j<18;j++){
          const d=e.d+r()*4,x=left+(e.x-left)*r(),w=.09+r()*.38;
          erosion+=G.path([[x,d,.561],[x+w*.6,d+.07,.561],[x+w,d+.27,.561],
            [x+w*.35,d+.42,.561],[x-.05,d+.19,.561]]);
        }
        for(let j=0;j<3;j++){
          const d=e.d+.25+j*1.2,x=left+.3+r()*(e.x-left-.6);
          const pts=[[x,d,.563],[x+.3,d+.25,.563],[x+.17,d+.42,.563],[x+.42,d+.71,.563]].map(q=>G.p(...q));
          cracks+='M'+pts.map(q=>q.join(' ')).join('L');
        }
        for(let j=0;j<7;j++){
          const d=e.d+r()*4,x=-2.65-.025*d-.12;
          grass+=G.path([[x,d,.55],[x-.04,d,.55+.08+r()*.12],[x+.025,d,.55]]);
        }
        out.push({f:'#8a8d70',d:erosion,detail:true},{s:'#64685a',w:.8,d:cracks,detail:true},
          {f:'#667743',d:grass,detail:true});
        return {body:out};
      }}));
  }
  return {camera,edges,define,draw};
})();
(function () {
  if(typeof sceneObjDefine!=='function')return;
  const r1=x=>Math.round(x*10)/10;
  const rect=(x,y,w,h)=>`M${r1(x)} ${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}z`;
  const ell=(x,y,rx,ry)=>`M${r1(x-rx)} ${r1(y)}a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(rx*2)} 0a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-rx*2)} 0z`;
  // Opposite footway at Market Place. Every slab and kerb joint occupies
  // its ground plane; the cross-street separates the viewer from the shops.
  for(let i=4;i<8;i++){
    const x=-24+i*4,d=8.25+(x+24)*.02;
    sceneObjDefine({id:'street.rph-market-footway-'+i,category:'street',size:[1800,100],
      real:{h:.14,l:4,w:.15},foot:.1,variants:1,seasonal:false,flippable:false,
      parts:['body'],palette:{base:{}},tags:['uk','reepham','unlit','kit:urban','role:street','class:street'],
      build(v,r){
        const G=SCENE_REEPHAM_STATION.draw([x+2,d,0],.14,100,{eye:1.65,fov:66,horizon:620,x0:800}),B=[];
        const P=(f,pts)=>B.push({f,d:G.path(pts)});
        P('#b3ac99',[[x,d,.14],[x+4,d+.08,.14],[x+4,d-3.2,.14],[x,d-3.28,.14]]);
        P('#77786e',[[x,d,0],[x+4,d+.08,0],[x+4,d+.08,.14],[x,d,.14]]);
        P('#cdc7b5',[[x,d-.25,.145],[x+4,d-.17,.145],[x+4,d+.08,.145],[x,d,.145]]);
        let joints='',grain='',chips='';
        for(let row=0;row<6;row++){
          const y=d-.3-row*.52,offset=row%2?.3:0;
          for(let col=0;col<7;col++){
            const xx=x+col*.6+offset;
            if(xx>=x+3.98)continue;
            const end=Math.min(x+3.98,xx+.58);
            joints+=G.path([[xx,y,.147],[end,y+.011,.147],[end,y+.023,.147],[xx,y+.012,.147]])+
              G.path([[xx,y,.147],[xx+.015,y,.147],[xx+.015,y-.49,.147],[xx,y-.49,.147]]);
          }
        }
        for(let k=0;k<60;k++){
          const xx=x+.06+r()*3.87,y=d-.33-r()*2.8,w=.018+r()*.035;
          grain+=G.path([[xx,y,.148],[xx+w,y,.148],[xx+w*.4,y+.04,.148]]);
        }
        for(let k=0;k<8;k++){
          const xx=x+r()*4,y=d-.02+r()*.065;
          chips+=G.path([[xx,y,.149],[xx+.1,y-.04,.149],[xx+.15,y+.014,.149]]);
        }
        B.push({f:'#8f8f81',d:joints},{f:'#989889',d:grain,detail:true},{f:'#9e9b89',d:chips,detail:true});
        return {body:B};
      }});
  }
  for(const type of ['ballast','paving-wear'])sceneObjDefine({id:'ground.rph-'+type,
    category:'ground',size:[90,12],real:{h:type==='ballast'?.035:.025,l:.3,w:.2},
    variants:4,seasonal:false,flippable:true,parts:['body'],palette:{base:{}},
    tags:['uk','reepham','unlit','kit:temperate','kit:urban','role:ground','class:cover'],build(v,r){
      const P=['','',''];
      for(let i=0;i<(type==='ballast'?19:9);i++){
        const x=-43+r()*86,y=-r()*9,w=1+r()*4;
        P[i%3]+=`M${r1(x)} ${r1(y)}l${r1(w*.7)} -.8 ${r1(w*.5)} 1.1 -${r1(w*.4)} 1.5 -${r1(w)} -.5z`;
      }
      return {body:P.map((d,i)=>({f:(type==='ballast'?['#746d62','#90887a','#a29a8c']:['#817d71','#989284','#a49d8d'])[i],d,detail:i===2}))};
    }});
  // Reuse library oaks intact at full-screen size. Reserve fine foliage and
  // twigs for the large view, following the gold reference's tile method.
  function sceneReephamTreeDefinitions(){if(sceneObj('tree.rph-pond-oak'))return;for(const src of ['tree.pond-oak','tree.bank-oak','tree.pool-birch','tree.canal-oak','tree.wyv-far-oak','tree.wyv-far-sallow']){
    const base=sceneObj(src);if(!base)continue;
    sceneObjDefine(Object.assign({},base,{id:src.replace('.','.rph-'),weight:0,real:sceneObjReal(src),build(v,r,ctx){
      const sh=sceneObjShapes(src,v,ctx&&ctx.season||'summer'),out={};let leaf=0;
      for(const p of sh.order){out[p]=[];for(const q of sh.parts[p]){
        const subs=(q.d||'').split(/(?=M)/);
        if(subs.length>1&&(q.d||'').length>400){
          out[p].push(Object.assign({},q,{d:subs.filter((_,i)=>i%8===0).join('')}));
          out[p].push(Object.assign({},q,{d:subs.filter((_,i)=>i%8!==0).join(''),detail:true}));
        }else out[p].push(Object.assign({},q,q.s&&q.w<4.5||q.m&&q.f&&(leaf++%8)!==0?{detail:true}:{}));
      }}
      Object.defineProperty(out,'$anim',{value:sh.anim});return out;
    }}));
  }}
  sceneReephamTrees=sceneReephamTreeDefinitions;
  sceneObjDefine({id:'plant.rph-short-grass',category:'plant',size:[31,18],real:{h:.09,l:.16,w:.12},variants:3,seasonal:true,shapeBySeason:false,flippable:true,
    palette:{base:{},spring:{leaf:['#59813c','#9fad51']},summer:{leaf:['#456c38','#7e994a']},autumn:{leaf:['#75694b','#a99668']},winter:{leaf:['#7a8170','#b2b5a2']}},
    parts:['body'],tags:['uk','reepham','kit:temperate','role:ground','class:cover'],build(v,r){
      let a='',b='';for(let i=0;i<9;i++){const x=-13+r()*26,h=4+r()*12,dx=-7+r()*14;
        const leaf=`M${r1(x)} 0q${r1(dx-2)} -${r1(h*.7)} ${r1(dx)} -${r1(h)}q${r1(3-dx*.6)} ${r1(h*.5)} ${r1(2-dx)} ${r1(h)}z`;
        if(i%2)a+=leaf;else b+=leaf;}
      return {body:[['@leaf.0',a],['@leaf.1',b]]};}});
  sceneObjDefine({id:'plant.rph-rosette',category:'plant',size:[31,15],real:{h:.08,l:.17,w:.17},variants:3,seasonal:true,shapeBySeason:true,flippable:true,
    palette:{base:{},spring:{leaf:['#698449','#b0b965']},summer:{leaf:['#617843','#9eae5b']},autumn:{leaf:['#83714c','#b6aa7a']},winter:{leaf:['#777d68','#acb0a0']}},
    parts:['body'],tags:['uk','reepham','kit:temperate','role:ground','class:cover'],build(v,r,ctx){
      let d='';for(let i=0;i<7;i++){const a=i*Math.PI/3.5,x=Math.cos(a)*(7+r()*7),y=-4+Math.sin(a)*6;d+=`M0-1Q${r1(x-3)} ${r1(y-3)} ${r1(x)} ${r1(y)}Q${r1(x/2)} ${r1(y+3)} 0-1z`;}
      const B=[['@leaf.0',d],{s:'@leaf.1',w:.6,d:'M-12-4l12 3 11-5M-3-10l3 9 2-9'}];
      if(ctx.season==='spring'&&v===1)B.push({f:'#e7c359',d:ell(2,-9,2,2)});return {body:B};}});
  sceneObjDefine({id:'street.rph-headstone',category:'street',size:[42,58],real:{h:.85,l:.62,w:.15},variants:3,seasonal:false,flippable:true,
    parts:['body'],palette:{base:{}},tags:['uk','reepham','unlit','kit:temperate','role:street'],build(v,r){
      const top=v===0?'Q0-66 18-47':v===1?'L0-57 18-46':'Q0-53 18-45';
      return {body:[{f:'#7b8179',d:`M-20 0V-46${top}V0z`},{f:'#b4b1a0',d:`M-17-1V-44${top}V-1z`},
        {f:'#817f72',op:.5,d:'M-9-34q8-4 16 0v18q-8-3-16 0z'},{f:'#8b9672',d:'M-21 0q4-8 9-4l6 4z'}]};}});
  sceneObjDefine({id:'structure.rph-lantern-post',category:'structure',size:[80,330],
    real:{h:3.3,l:.8,w:.16},variants:1,seasonal:false,flippable:false,parts:['body'],
    palette:{base:{}},tags:['uk','reepham','unlit','kit:temperate','role:street','class:street'],build(){
      return {body:[{f:'#343f3c',d:'M25 0V-309h12V0z'},
        {f:'#536058',d:'M26-309v-9h-62v9z'},
        {s:'#919990',w:2,d:'M-34-309v31q9 4 10-2',detail:true},
        {f:'#9d9983',d:'M22-7h18v7H22z'}]};
    }});
  sceneObjDefine({id:'street.rph-platform-fence',category:'street',size:[280,76],real:{h:1.15,l:4.24,w:.12},variants:1,seasonal:false,flippable:true,
    palette:{base:{}},parts:['body'],tags:['uk','reepham','fence','unlit','kit:temperate','role:street'],build(){const B=[];
      for(const x of [-135,-44,49,132])B.push({f:'#eee6d1',d:`M${x} 0v-72l5-4 5 4V0z`},{f:'#c1bca9',d:rect(x+7,-69,3,69)});
      for(const y of [-54,-25])B.push({f:'#9c4f43',d:rect(-135,y,277,7)},{f:'#bb7861',d:rect(-135,y,277,2)});
      return {body:B};}});
  sceneObjDefine({id:'structure.rph-brick-wall',category:'structure',size:[360,60],real:{h:.75,l:4.5,w:.35},variants:2,seasonal:false,flippable:true,
    palette:{base:{}},parts:['body'],tags:['uk','reepham','wall','unlit','kit:temperate','role:street'],build(v,r){
      const B=[{f:v?'#9b8d7c':'#9d6650',d:rect(-178,-51,354,51)},
        {f:v?'#d5ccba':'#c39571',d:'M-181-51l4-9 351 1 5 9z'},
        {f:'#725946',d:rect(-178,-4,354,4)}];
      for(let i=0;i<45;i++)B.push({f:v?'#c1b59e':['#b48667','#bd9775','#825a49'][i%3],op:.65,d:rect(-170+r()*338,-47+r()*40,5+r()*13,2+r()*3),detail:true});
      for(let y=-42;y<-5;y+=12)B.push({s:'#cead88',w:.9,op:.5,d:`M-177 ${y}h351`});return {body:B};}});
  sceneObjDefine({id:'structure.rph-platform-edge',category:'structure',size:[360,66],real:{h:.55,l:3,w:.2},variants:2,seasonal:false,flippable:true,
    palette:{base:{}},parts:['body'],tags:['uk','reepham','wall','unlit','kit:temperate','role:street','class:street'],build(v,r){
      const B=[{f:'#675647',d:rect(-175,-57,350,57)},{f:'#b5b3a2',d:'M-181-58l8-8h342l12 8v8h-362z'},
        {f:'#e4dcc4',d:rect(-177,-58,352,4)}];
      for(let i=0;i<32;i++)B.push({f:['#92806a','#786958','#b0a18b'][i%3],d:rect(-169+r()*328,-49+r()*41,4+r()*11,3),detail:true});return {body:B};}});
  sceneObjDefine({id:'building.rph-market-side',category:'building',size:[165,260],real:{h:10,l:6.35,w:6},variants:2,seasonal:false,flippable:true,
    palette:{base:{}},parts:['body'],night:{glow:{window:'#ffdc9e'},on:.8},tags:['uk','reepham','kit:urban','role:building-mid'],build(v,r){
      const B=[{f:v?'#d9d4c5':'#aa7057',d:rect(-80,-232,155,232)},{f:'#555951',d:'M-84-232l28-27H53l26 27z'}];
      if(!v)courses(B,-77,-229,149,224,r,false);
      for(const [x,y,w,h]of [[-62,-207,32,43],[18,-205,33,44],[-60,-144,34,48],[20,-144,30,49],[-58,-75,46,55],[18,-74,41,54]])pane(B,x,y,w,h,false);
      B.push({f:'#493f3d',d:rect(-79,-90,155,11)},{f:'#d3bda0',d:rect(-80,-3,155,3)},{f:'#8e745a',d:rect(-57,-265,13,31)},
        {s:'#e0ccaa',w:2,d:'M-79-160H74M-79-224H74'});return {body:B};}});
  sceneObjDefine({id:'street.rph-rail-lantern',category:'street',size:[85,154],real:{h:1.2,l:.66,w:.45},variants:1,seasonal:false,flippable:false,
    palette:{base:{}},parts:['body'],night:{glow:{window:'#d77454'},on:1},tags:['uk','reepham','kit:temperate','role:street'],build(){
      const B=[{f:'#dddccb',d:'M-34-65v-57q0-12 13-12h45q13 0 13 12v57z'},
        {f:'#a5b2a9',d:rect(28,-122,9,54)},{f:'#e8e6d5',d:'M-39-124q39-14 80 0v6h-80z'},
        {f:'#f4ebd5',d:rect(-22,-145,47,14)},{f:'#bcc6b8',d:'M-26-145q26-16 54 0v4h-54z'},
        {s:'#c3cbbd',w:3,d:'M-34-98v-44q36-25 71 0v44'},
        {f:'#263b3b',d:ell(0,-102,21,21)},{f:'#923d30',d:ell(0,-102,15,15),glow:'window'},
        {f:'#d6a176',d:'M-11-107q3-10 13-8l-6 6z'},
        {f:'#677e71',d:rect(-38,-71,79,8)},{f:'#ecdfc5',d:rect(-37,-71,78,3)}];
      for(const x of [-15,-5,5,15])B.push({f:'#5c7065',d:rect(x,-143,4,8)});
      B.forEach(q=>{q.m=[1,0,0,1,0,65];});return {body:B};}});
  for(let i=0;i<6;i++){
    const d0=18+i*8,x0=4.2+.04*d0;
    sceneObjDefine({id:'street.rph-whitwell-fence-'+i,category:'street',size:[900,110],
      real:{h:1.1,l:8,w:.12},foot:.15,variants:1,seasonal:false,flippable:false,
      parts:['body'],palette:{base:{}},tags:['uk','reepham','unlit','kit:temperate','role:street'],build(){
        const G=SCENE_REEPHAM_STATION.draw([x0,d0,0],1.1,110,{eye:1.65,fov:66,horizon:475,x0:680}),B=[];
        const poly=(f,pts)=>B.push({f,d:G.path(pts)});
        for(const d of [d0,d0+2.65,d0+5.3,d0+8]){
          const x=4.2+.04*d;
          poly('#e1dcc7',[[x-.06,d,0],[x+.06,d,0],[x+.06,d,1.04],[x,d,1.13],[x-.06,d,1.04]]);
        }
        for(const h of [.45,.8])poly('#9a4c43',[[x0,d0,h],[x0+.32,d0+8,h],
          [x0+.32,d0+8,h+.065],[x0,d0,h+.065]]);
        return {body:B};
      }});
  }
  function pane(B,x,y,w,h,arched) {
    const d=arched?`M${x} ${y+h}V${y+h*.3}Q${x+w/2} ${y-h*.32} ${x+w} ${y+h*.3}V${y+h}z`:rect(x,y,w,h);
    const gx=x+4,gy=y+9,gw=w-8,gh=h-13,mx=gx+gw*.5,my=gy+gh*.52;
    const cut=(a,b,c,d)=>`M${r1(a)} ${r1(b)}V${r1(d)}H${r1(c)}V${r1(b)}z`;
    // One glow shape per opening, with reverse-wound mullion holes. The
    // lighting pass can then brighten the whole room without burying bars.
    const glass=arched?`M${x+4} ${y+h-4}V${y+h*.32}Q${x+w*.5} ${y-h*.16} ${x+w-4} ${y+h*.32}V${y+h-4}z`+
      cut(mx-1,y+h*.1,mx+1,y+h-4)+cut(gx,my-1,x+w-4,my+1)+rect(mx-1,my-1,2,2):
      rect(gx,gy,gw*.5-1,gh*.52-1)+rect(mx+1,gy,gw*.5-1,gh*.52-1)+rect(gx,my+1,gw*.5-1,gh*.48-1)+rect(mx+1,my+1,gw*.5-1,gh*.48-1);
    B.push({f:'#d3ccbb',d},{f:'#40525a',d:glass,glow:'window'},
      {f:'#98b7bd',op:.35,d:rect(gx+1,gy+1,gw*.5-3,gh*.21)},
      {s:'#e7dfcf',w:1.7,d:`M${x+w/2} ${y+7}v${h-9}M${x+3} ${y+h*.56}h${w-6}`},
      {f:'#c9b89d',d:rect(x-2,y+h,w+4,3)});
    if(arched)B.push({s:'#d4c8ab',w:1.5,d:`M${x+w*.5} ${y}v${h*.32}`});
  }
  function courses(B,x,y,w,h,r,stone) {
    // Irregular flint/chipped brick patches, kept inside the actual wall.
    const paths=['','','',''];
    for(let i=0;i<(stone?285:260);i++){
      const ww=stone?2+r()*4:4+r()*7,hh=stone?2+r()*3:2+r(),px=x+2+r()*(w-ww-4),py=y+2+r()*(h-hh-4);
      paths[i%4]+=stone?`M${r1(px)} ${r1(py)}l${r1(ww*.7)} -1 ${r1(ww*.3)} 1.5 -1 ${r1(hh)} -${r1(ww*.8)} -.5z`:rect(px,py,ww,hh);
    }
    for(let i=0;i<4;i++)B.push({f:stone?['#71736c','#a6a393','#7d8278','#aaa696'][i]:['#b48065','#d0a187','#8b5c4b','#c0896b'][i],op:stone?.85:.72,d:paths[i],detail:true});
    if(!stone){let mortar='';for(let yy=y+7;yy<y+h;yy+=9)mortar+=`M${r1(x)} ${r1(yy)}h${r1(w)}`;
      B.push({s:'#e0b194',w:.45,op:.36,d:mortar,detail:true});}
  }
  function tiles(B,x,y,w,h,r,col) {
    let ribs='',joints='';for(let xx=x+2;xx<x+w-2;xx+=6)ribs+=`M${r1(xx)} ${r1(y)}q-2 ${r1(h*.5)} -4 ${r1(h)}`;
    for(let yy=y+4;yy<y+h;yy+=7)joints+=`M${r1(x)} ${r1(yy)}l${r1(w)} -1`;
    B.push({s:col,w:1.2,op:.65,d:ribs,detail:true},{s:col,w:.5,op:.5,d:joints,detail:true});
  }
  function def(id,size,real,build) {
    sceneObjDefine({id:(id==='whitwell'?'rail.rph-':'landmark.rph-')+id,category:id==='whitwell'?'rail':'landmark',size,real,variants:1,seasonal:false,flippable:false,
      parts:['body','lit'],palette:{base:{}},night:{glow:{window:'#ffd79b'},on:.8},
      tags:['uk','reepham','landmark','place:uk-east/reepham','kit:temperate',id==='whitwell'?'role:vehicle':'role:landmark'].concat(id==='whitwell'?['class:train']:[]),build});
  }
  sceneObjDefine({id:'plant.rph-church-shrub',category:'plant',size:[260,220],real:{h:3.2,l:3.8,w:2.3},variants:3,seasonal:false,flippable:true,
    parts:['stems','leaf'],palette:{base:{}},tags:['uk','reepham','unlit','kit:temperate','role:shrub'],
    anim:{sway:{part:'leaf',pivot:[0,-60],deg:.6,period:9}},build(v,r){
      const stems=[],leaf=[],P=['','','',''];
      const centres=[[-80,-70,45],[-46,-132,39],[6,-156,48],[63,-116,38],[96,-56,30],[-16,-57,59]];
      for(const [cx,cy,rad]of centres){stems.push({s:'#635849',w:3,d:`M0 0Q${cx*.3} ${cy*.7} ${cx} ${cy}`});
        for(let i=0;i<95;i++){const a=r()*Math.PI*2,z=Math.sqrt(r()),x=cx+Math.cos(a)*rad*z,y=cy+Math.sin(a)*rad*z,len=4+r()*8;
          P[i%4]+=`M${r1(x)} ${r1(y)}q-4 -${r1(len*.7)} 1 -${r1(len)}q4 ${r1(len*.6)} -1 ${r1(len)}z`;}}
      for(let i=0;i<4;i++)leaf.push({f:['#192f25','#294536','#426044','#66805a'][i],d:P[i],detail:i>0});
      return {stems,leaf};}});
  sceneObjDefine({id:'plant.rph-flower-tub',category:'plant',size:[220,140],real:{h:1.15,l:1.8,w:.8},variants:3,seasonal:true,shapeBySeason:true,flippable:true,
    parts:['body','leaf'],palette:{base:{}},tags:['uk','reepham','unlit','kit:urban','role:street','class:street'],build(v,r,ctx){
      const body=[{f:'#514e43',d:'M-101-52h200l-12 52h-177z'},{f:'#83715a',d:'M-101-52l15-9 185 1 10 8z'},
        {f:'#373d32',d:'M-86-53h174l-4 8h-166z'}],leaf=[],P=['','',''];
      for(let i=0;i<115;i++){const x=-88+r()*172,y=-52-r()*55,z=3+r()*7;P[i%3]+=`M${r1(x)} ${r1(y)}q-${r1(z)} -${r1(z*1.8)} 0 -${r1(z*2)}q${r1(z*1.2)} ${r1(z)} 0 ${r1(z*2)}z`;}
      for(let i=0;i<3;i++)leaf.push({f:ctx.season==='winter'?['#4a574a','#687767','#aab4a3'][i]:['#244c33','#416c43','#709254'][i],d:P[i],detail:i>0});
      if(ctx.season!=='winter')for(let i=0;i<35;i++){const x=-83+r()*168,y=-60-r()*64;leaf.push({f:ctx.season==='autumn'?'#b77638':['#db9aae','#f2cf7d','#9d82ae'][(i+v)%3],d:ell(x,y,2.4+r()*1.8,2.2)});}
      for(let i=0;i<17;i++){const x=-95+i*11;body.push({s:'#a49178',w:.6,op:.5,d:`M${x}-47l2 41`,detail:true});}
      return {body,leaf};}});
  def('market',[660,310],{h:10,l:22,w:6},function(v,r){
    const B=[];
    // West frontage: brick house, the distinctive stepped gable, white shop.
    B.push({f:'#ac7056',d:rect(-326,-229,198,229)},{f:'#7c5246',d:'M-326-229l36-55h177l-15 55z'},
      {f:'#c99371',d:rect(-323,-220,191,216)});
    courses(B,-323,-219,190,212,r,false);tiles(B,-290,-280,160,40,r,'#d0a68b');
    for(const x of [-280,-191])pane(B,x,-202,43,42,false);
    // The low brick house has a broad ground-floor window and the entrance
    // to its right, rather than a generic symmetrical house frontage.
    pane(B,-283,-93,64,68,false);
    B.push({f:'#3b4246',d:rect(-174,-91,32,91)},{f:'#d8c7af',d:rect(-178,-97,40,7)},
      {f:'#95705d',d:rect(-305,-299,17,35)},{f:'#d4b293',d:rect(-309,-302,25,5)});
    // The butcher frontage has a Dutch stepped gable, not a triangular roof.
    const steps=[[-124,0],[-124,-227]];
    for(let j=0;j<11;j++){steps.push([-124+j*8.7,-227-j*7.2],[-124+(j+1)*8.7,-227-j*7.2]);}
    steps.push([-28,-310],[-15,-310]);
    for(let j=10;j>=0;j--)steps.push([70-(j+1)*7.75,-227-j*7.2],[70-j*7.75,-227-j*7.2]);
    steps.push([70,0]);
    B.push({f:'#a36349',d:'M'+steps.map(p=>p.join(' ')).join('L')+'z'});
    courses(B,-120,-225,187,222,r,false);
    B.push({s:'#c49d7b',w:2,d:'M'+steps.slice(1,-1).map(p=>p.join(' ')).join('L')},
      {f:'#735e4c',d:rect(-28,-324,13,14)},{f:'#d5bd89',d:rect(-26,-334,9,11)},
      {f:'#534439',d:ell(-21.5,-337,3,3)});
    pane(B,-44,-279,37,31,true);pane(B,-48,-209,45,62,false);
    // Shallow hipped entrance roof above a canvas awning, as in the photo.
    B.push({f:'#914c4e',d:'M-122-111L-83-132H27l43 21z'},
      {s:'#e5d9c4',w:3,d:'M-125-110H74M-121-113L-82-133H27l46 20'},
      {f:'#714349',d:'M-125-108H70l17 30h-226z'},{f:'#a35858',d:'M-125-108H70v5h-195z'},
      {f:'#523e40',d:rect(-126,-72,202,11)});
    for(const x of [-111,5])pane(B,x,-66,58,46,false);
    B.push({f:'#303b3c',d:rect(-39,-68,30,68)},{f:'#c5ae88',d:rect(-39,-70,30,4)},
      {f:'#b17b5e',d:rect(-126,-11,202,11)},{f:'#a37257',d:rect(-83,-300,14,32)});
    // White shop: irregular sash widths, steep dark roof and two dormers.
    B.push({f:'#dedbd0',d:rect(77,-220,246,220)},{f:'#f2eee1',d:rect(81,-213,236,204)},
      {f:'#41484b',d:'M77-220l35-67h173l38 67z'},{f:'#696b65',d:'M110-286h174l4 5H107z'});
    tiles(B,112,-280,171,47,r,'#8c8b80');
    for(const x of [139,238]){B.push({f:'#e3ded0',d:`M${x}-228v-33l17-17 18 17v33z`});pane(B,x+6,-254,22,26,false);}
    for(const x of [104,174,253])pane(B,x,-174,37,54,false);
    for(const x of [100,153,250])pane(B,x,-87,45,65,false);
    B.push({f:'#434f52',d:rect(208,-82,29,82)},{f:'#344247',d:rect(82,-109,233,14)},
      {f:'#c8beb0',d:rect(80,-9,242,9)},{f:'#af9179',d:rect(286,-306,14,46)},
      {s:'#c8baa3',w:2,d:'M80-217H319M-320-210H-134M-120-117H69'});
    B.push({f:'#8c634f',d:'M-326 0V-229l15-12V0z'},
      {f:'#b7bbb0',d:'M77 0V-220l17-11V0z'},
      {s:'#d9c4a5',w:1.4,d:'M-320-6V-211M81-9V-214'},
      {f:'#512e34',d:rect(-126,-73,203,6)});
    let scallop='';for(let x=-126;x<74;x+=13)scallop+=`M${x}-73q6 8 13 0z`;
    B.push({f:'#985657',d:scallop});
    return {body:B,lit:[]};
  });
  def('churches',[750,460],{h:23,l:37.5,w:14},function(v,r){
    const B=[];
    // St Michael on the left: shorter tower and tall corner pinnacles.
    B.push({f:'#888c80',d:rect(-337,-333,106,333)},{f:'#a7aaa0',d:rect(-335,-330,73,327)});
    courses(B,-334,-325,100,317,r,true);
    for(const x of [-336,-315,-288,-260,-236])B.push({f:'#c2c2ae',d:rect(x,-350,13,19)});
    for(const x of [-335,-238])B.push({f:'#c9c6b1',d:`M${x}-350l6-31 6 31v18h-12z`});
    pane(B,-316,-303,25,49,true);pane(B,-283,-303,25,49,true);
    B.push({f:'#787569',d:'M-370 0V-180l92-75 99 75V0z'},
      {f:'#9f6e50',d:'M-380-180l102-85 110 85h-22l-88-64-85 64z'});
    courses(B,-365,-176,181,170,r,true);pane(B,-310,-165,57,111,true);
    // St Michael stands behind St Mary in this sightline; its tower and
    // nave are visibly smaller, not a second near-camera elevation.
    B.forEach(q=>{q.m=[.66,0,0,.66,-94,0];});
    // St Mary: broad square tower with battlements, no spire or pinnacles.
    B.push({f:'#777b72',d:rect(-102,-420,132,420)},{f:'#a5a694',d:rect(-99,-418,105,416)});
    courses(B,-98,-412,119,403,r,true);
    for(const x of [-105,-78,-51,-24,3,23])B.push({f:'#c3bea7',d:rect(x,-438,14,20)});
    for(const x of [-104,17])for(let y=-413;y<-10;y+=20)B.push({f:'#cec5ab',d:rect(x,y,12,17)});
    B.push({f:'#c9c2aa',d:rect(-106,-341,138,6)},{f:'#c9c2aa',d:rect(-106,-221,138,5)});
    B.push({f:'#555f58',d:'M6 0V-418l35-17v408z'},{f:'#999b88',d:'M6-418l35-17v7L6-409z'},
      {s:'#b8b59e',w:3,d:'M8-338l30-14M8-218l30-8'});
    pane(B,-78,-396,30,66,true);pane(B,-40,-396,30,66,true);pane(B,-61,-195,40,79,true);
    // The evergreen ivy climbing St Mary's lower tower is prominent in
    // the south churchyard view. Small lobed leaves follow irregular sprays.
    B.push({f:'#304631',d:'M-104 0L-105-46Q-120-62-103-83L-104-119Q-93-139-103-166L-91-198L-79-172L-88-135Q-73-118-84-91L-76-57L-91-24L-79 0zM-71 0L-77-44Q-93-63-76-85L-63-103L-54-77L-65-52L-53-31L-36 0z'});
    const ivy=['','',''];
    const sprays=[[-96,-35,13],[-100,-75,14],[-96,-115,10],[-96,-155,10],[-90,-190,7],[-72,-35,15],[-74,-68,12]];
    for(let i=0;i<190;i++){
      const [cx,cy,w]=sprays[i%sprays.length],a=r()*6.28,t=Math.sqrt(r()),x=cx+Math.cos(a)*w*t,y=cy+Math.sin(a)*w*t,L=3+r()*3;
      ivy[i%3]+=`M${r1(x)} ${r1(y)}q${r1(-L)} ${r1(-L*.4)} ${r1(-L)} ${r1(-L)}l${r1(L*.5)} 0 ${r1(L*.5)} ${r1(-L*.7)} ${r1(L*.5)} ${r1(L*.7)} ${r1(L*.7)} -.5q0 ${r1(L)} ${r1(-L*1.2)} ${r1(L)}z`;
    }
    ivy.forEach((d,i)=>B.push({f:['#3a5637','#526c44','#6c8150'][i],d,detail:i===2}));
    // Long flint nave to the right, with a clearly pitched dark slate roof.
    B.push({f:'#8b8980',d:'M30 0V-174l286-75 60 22V0z'},
      {f:'#4f585a',d:'M17-175l43-69 265-96 60 113-69-22z'},
      {f:'#737a76',d:'M60-244l264-96 4 5-267 98z'});
    let flint='';
    for(let i=0;i<210;i++){
      const x=36+r()*325,top=-174-(Math.min(x,316)-30)*.262,y=top+8+r()*(-top-14);
      flint+=`M${r1(x)} ${r1(y)}l3 -1 2 2-1 2-4-1z`;
    }
    B.push({f:'#a39f92',d:flint,detail:true});
    // One batch path rather than hundreds of repeated roof shapes.
    let roof='';for(let i=0;i<50;i++){const x=70+r()*248,y=-238-(x-60)*.36+r()*40;roof+=`M${r1(x)} ${r1(y)}l6 -2`;}
    B.push({s:'#a2a59a',w:.8,op:.48,d:roof,detail:true});
    for(const x of [60,124,191,267]){
      const y=-150-(x-60)*.26,h=105+(x-60)*.2;
      pane(B,x,y,42,h,true);
      B.push({s:'#c4beaa',w:1.2,d:`M${x+13} ${y+18}v${h-26}M${x+29} ${y+18}v${h-26}`});
      B.push({f:'#aaa696',d:`M${x+46} 0v${y+25}l7-4 8 9V0z`});
    }
    B.push({f:'#aaa58f',d:'M111 0V-63l37-41 39 40V0z'},{f:'#505e60',d:'M103-63l45-49 49 49h-12l-37-35-31 35z'},
      {f:'#534e48',d:'M134 0v-49q14-27 29 0V0z'},{f:'#c9c0a7',d:rect(34,-9,336,9)});
    return {body:B,lit:[]};
  });
  def('station',[610,230],{h:8,l:21.2,w:6},function(v,r){
    const B=[];
    // Former station: buff-brick gabled block with a low attached range.
    B.push({f:'#b9a77e',d:'M-300 0V-173l69-53 70 53V0z'},
      {f:'#d2c095',d:'M-161 0V-173l155 24V0z'},
      {f:'#727c7a',d:'M-310-173l79-57 145 22 86 59-161-22-70-50z'});
    courses(B,-294,-168,130,163,r,false);courses(B,-156,-143,145,137,r,false);
    pane(B,-247,-171,33,49,true);pane(B,-282,-87,31,64,true);pane(B,-215,-86,34,64,true);
    for(const x of [-140,-86,-37])pane(B,x,-109,31,64,true);
    B.push({f:'#a49170',d:rect(-267,-229,16,29)},{f:'#dfcc9f',d:rect(-271,-232,24,5)},
      {f:'#654e40',d:rect(-143,-50,21,50)},
      {f:'#aa795d',d:'M-7 0V-94l271-12 36 106z'},
      {f:'#626c69',d:'M-20-94l31-32 256-5 40 31-48-6z'});
    courses(B,1,-88,258,81,r,false);tiles(B,16,-121,240,20,r,'#adb0a0');
    for(const x of [25,76,130,195,251])pane(B,x,-72,26,49,false);
    B.push({f:'#423f38',d:rect(161,-63,22,63)},{f:'#d2ba8e',d:rect(-296,-11,590,11)},
      {s:'#e3ce9f',w:2,d:'M-299-96H-163M-157-132L-7-111M-6-79L264-88'});
    return {body:B,lit:[]};
  });
  def('whitwell',[200,210],{h:3.5,l:12,w:2.4},function(v,r){
    const B=[];
    // A three-quarter END view: wheelsets span the gauge, vehicles recede
    // along the siding. They must not be drawn broadside across the rails.
    B.push({f:'#354e47',d:'M20-37V-189l56-13 40 18v135z'},
      {f:'#627a69',d:'M20-37V-189l56-13v152z'},
      {f:'#263c38',d:'M76-202l40 18v135l-40-1z'},
      {f:'#424c4b',d:'M14-189q33-28 64-17l45 18-7 5-40-16q-32-1-54 15z'});
    pane(B,32,-179,17,27,false);pane(B,56,-184,15,27,false);pane(B,82,-178,12,27,false);pane(B,99,-172,10,24,false);
    B.push({f:'#1c292b',d:'M15-37l99-15v8l-99 14z'},
      {f:'#263436',d:ell(29,-29,8,10)},{f:'#263436',d:ell(103,-45,7,9)});
    for(let i=0;i<24;i++)B.push({s:'#9b9d82',w:.7,op:.45,d:`M${r1(24+r()*45)} ${r1(-50-r()*126)}l2 -1`,detail:true});
    // Rounded tank, circular near end and elliptical distant end.
    B.push({f:'#45514d',d:'M-51-71Q-52-132-4-143l65-23q34 5 34 47l-48 71z'},
      {f:'#647069',d:'M-44-107q8-25 34-29l73-22q17 5 21 16l-75 29z'},
      {f:'#172326',d:ell(0,-69,53,51)},{f:'#28373a',d:ell(-5,-75,45,43)},
      {f:'#626c60',d:'M-40-91q15-28 43-24l25 11q-34-9-61 22z'},
      {s:'#7d8476',w:2,d:'M-33-108q-15 32 0 64M53-140q-4 27 15 39'},
      {f:'#939983',d:'M11-141l27-11 18 4-28 11z'},{f:'#303c3c',d:'M18-145l17-6v-9l-17 7z'},
      {f:'#333e3d',d:'M-60-26l81-4 73-66v10L26-16h-86z'});
    // Near wheels contact the rail head at y=0; buffers and coupling above it.
    for(const x of [-39,39])B.push({f:'#202b2c',d:ell(x,-10,10,10)},{f:'#737e78',d:ell(x,-10,4,4)});
    B.push({f:'#313e3f',d:rect(-56,-23,112,10)},
      {f:'#788079',d:ell(-42,-25,9,5)},{f:'#788079',d:ell(42,-25,9,5)},
      {s:'#293133',w:4,d:'M0-15v11q8 9 10 0'});
    for(let i=0;i<35;i++){const x=-31+r()*58,y=-99+r()*65;B.push({f:'#92998a',op:.24,d:rect(x,y,1+r()*2,1),detail:true});}
    return {body:B,lit:[]};
  });
})();

if(typeof sceneObjDefine==='function')SCENE_REEPHAM_STATION.define();
