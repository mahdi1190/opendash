/* Crafted, static Garden materials. Directional stone/wood/glass planes and
 * grouped planting borrow the opening scenes' drawing method, never their city
 * assets. These helpers only return vector art; geometry and saves stay owned
 * by the canonical world. Native and Classic consume the same bounded rows. */
const _GARDEN_CRAFT = { data:null, surfaceKey:'', surfaces:[], buildings:new Map() };
function _gardenCraftColor(value,fallback) { return typeof value==='number'?'#'+(value>>>0).toString(16).padStart(6,'0').slice(-6):typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback; }
function _gardenCraftPath(points) { return 'M'+points.map(p=>GART.f1(p[0])+' '+GART.f1(p[1])).join('L')+'Z'; }
function _gardenCraftStone(x,y,rx,ry,seed,wet) {
  const A=GART,f=A.f1,tilt=(seed%7-3)*.13,l=x-rx,r=x+rx,t=y-ry,b=y+ry;
  const body=_gardenCraftPath([[l+rx*.2,y],[l+rx*.48,t],[x+rx*.3,t+ry*.1],[r,y-ry*.12],[r-rx*.24,b],[x-rx*.38,b+ry*.04]]);
  return A.P(wet?'#365e55':'#455943',A.ell(x+1.4,y+ry*.72,rx*.97,ry*.54),wet?.16:.19)
    + A.P(wet?'#829a89':'#a9ad90',body,.92)
    + A.P(wet?'#a8bb9e':'#d0cbb0',_gardenCraftPath([[l+rx*.2,y],[l+rx*.48,t],[x+rx*.3,t+ry*.1],[r-rx*.13,y-ry*.2],[x-rx*.15,y+ry*.12]]),.82)
    + A.P(wet?'#5d8273':'#78856b',_gardenCraftPath([[r-rx*.13,y-ry*.2],[r,y-ry*.12],[r-rx*.24,b],[x-rx*.38,b+ry*.04],[x-rx*.15,y+ry*.12]]),.8)
    + A.S(wet?'#ced5b7':'#e0d8b9',.65,`M${f(l+rx*.45)} ${f(t+ry*.16)}L${f(x+rx*.25)} ${f(t+ry*.28+tilt)}`, .66);
}
function gardenCraftBuildingSkin(prop,sc,frame) {
  if(!frame||!(frame.right>frame.left)||!(frame.eave>frame.peak))return '';
  const key=JSON.stringify([prop.id,sc.season,sc.tod,frame]),cache=_GARDEN_CRAFT.buildings;if(cache.has(key))return cache.get(key);
  const A=GART,f=A.f1,seed=gardenHash('crafted-house|'+prop.id),r=A.rng(seed),L=frame.left,R=frame.right,cx=(L+R)/2,foot=frame.foot,eave=frame.eave,peak=frame.peak,roofL=frame.roofLeft??L-6,roofR=frame.roofRight??R+6,roof=_gardenCraftColor(frame.roof,'#70806c'),wood=_gardenCraftColor(frame.wood,'#96764f'),night=sc.tod==='night'||sc.tod==='dusk';
  let tiles=['','',''],tileShade='',tileLight='',grain='',knots='',body='';
  const courses=Math.max(5,Math.min(9,Math.round((eave-peak)/7))),step=Math.max(10,Math.min(19,(R-L)/8));
  if(!frame.roofKind||/tile|slate|shingle/.test(frame.roofKind))for(let row=0;row<courses;row++){
    if(sc.season==='winter'&&row<courses-2)continue;
    const a=(row+.1)/courses,b=(row+.93)/courses,y0=peak+(eave-peak)*a,y1=peak+(eave-peak)*b,x0=roofL+(cx-roofL)* (1-a),x1=roofR-(roofR-cx)*(1-a),offset=(row%2)*step*.5;
    for(let x=x0+offset;x<x1-3;x+=step){const right=Math.min(x1-1,x+step-1),chip=.7+r()*1.4;if(right-x<3)continue;const d=_gardenCraftPath([[x+.5,y0],[right-.4,y0+.4],[right,y1-chip*.35],[right-chip,y1],[x+chip*.5,y1-.25],[x,y0+chip]]);tiles[(row+Math.floor(x/step))%3]+=d;tileShade+=`M${f(x+chip*.5)} ${f(y1+.6)}H${f(right-chip*.8)}`;tileLight+=`M${f(x+1.2)} ${f(y0+1)}H${f(right-1.1)}`;}
  }
  body+=A.P(A.dk(roof,.12),tiles[0],.27)+A.P(A.lt(roof,.13),tiles[1],.32)+A.P(A.lt(roof,.045),tiles[2],.17)+A.S(A.dk(roof,.35),.75,tileShade,.66)+A.S(A.lt(roof,.37),.56,tileLight,.58);
  body+=A.S('#304b3b',2.2,`M${f(roofL+2)} ${f(eave+2.3)}H${f(roofR-2)}`, .27)+A.S('#e0d4af',.65,`M${f(roofL+3)} ${f(eave+.1)}H${f(roofR-3)}`, .58);
  // Grain follows the corner boards, not the whole plaster facade.
  for(const x of [L+1.5,R-1.7])for(let i=0;i<3;i++){const xx=x+(i-1)*.7,y=eave+7+i*4;grain+=`M${f(xx)} ${f(y)}q-1.1 ${f((foot-y)*.24)} .2 ${f((foot-y)*.47)}t-.4 ${f((foot-y)*.43)}`;}
  for(const x of [L+2,R-2])knots+=A.ell(x,foot-(foot-eave)*.47,.9,2.4);
  body+=A.S(A.dk(wood,.31),.48,grain,.62)+A.S(A.lt(wood,.32),.43,grain,.22)+A.P(A.dk(wood,.26),knots,.6);
  for(const window of frame.windows||[]){const{x,y,w,h}=window;
    body+=A.P('#213f37',A.rect(x,y,w,2.2)+A.rect(x,y+1,2.1,h-2),.27)
      + A.P(night?'#ffeac1':'#d8e2ce',_gardenCraftPath([[x+w*.12,y+h*.87],[x+w*.43,y+3],[x+w*.58,y+3],[x+w*.27,y+h*.87]]),night?.15:.26)
      + A.S('#e3d9b9',.75,`M${f(x+w-.4)} ${f(y+2)}V${f(y+h-.4)}H${f(x+2)}`,.72)
      + A.P('#455b47',_gardenCraftPath([[x-2,y+h+1],[x+w+3,y+h+1],[x+w+4,y+h+4],[x-1,y+h+4]]),.64)
      + A.S('#dbca9d',1,`M${f(x-2)} ${f(y+h+1)}H${f(x+w+3)}`,.86);
  }
  if(frame.door){const d=frame.door,ww=d.w,hh=d.h,xx=d.x,yy=d.y;body+=A.S('#273f33',.65,`M${f(xx+ww*.2)} ${f(yy+hh*.4)}v${f(hh*.48)}h${f(ww*.6)}v${f(-hh*.48)}Z`,.42)+A.S('#dac69d',.45,`M${f(xx+ww*.25)} ${f(yy+hh*.43)}v${f(hh*.4)}`, .55);}
  // A worn stone sole and the thin dark contact under it carry the building.
  for(let x=L+3,i=0;x<R-4;x+=16,i++){const w=Math.min(14+(i%3),R-x);body+=_gardenCraftStone(x+w/2,foot-.8,w/2,2.1,seed+i,false);}
  body+=A.S('#263f31',1.2,`M${f(L+4)} ${f(foot+3)}Q${f(cx)} ${f(foot+5)} ${f(R+3)} ${f(foot+2)}`,.3);
  const result=`<g class="gd-crafted-building" pointer-events="none">${body}</g>`;if(cache.size>=48)cache.clear();cache.set(key,result);return result;
}
function gardenCraftGlasshouse(x,y,w,roofTop,roofBase,season) {
  const A=GART,f=A.f1,mid=x+w/2;let seams='',glass='';
  for(let i=1;i<Math.max(3,Math.round(w/28));i++){const xx=x+i*w/Math.max(3,Math.round(w/28)),top=roofBase+(roofTop-roofBase)*(1-Math.abs((xx-mid)/(w/2)));seams+=`M${f(xx+1.4)} ${f(top+3)}V${f(y-1)}`;if(i%2)glass+=_gardenCraftPath([[xx+3,y-4],[xx+8,top+7],[xx+13,top+9],[xx+8,y-4]]);}
  return A.S('#526f65',.8,seams,.37)+A.P(season==='winter'?'#eef3e5':'#e7ead7',glass,.18)+A.S('#5f735e',2.4,`M${f(x+2)} ${f(y+1)}H${f(x+w-2)}`,.7)+A.S('#d2ccb0',.8,`M${f(x+3)} ${f(y-1)}H${f(x+w-3)}`,.9);
}
function gardenCraftUnderstoryClump(x,y,seed,theme,season) {
  const A=GART,f=A.f1,r=A.rng(seed),rock=/mount|ruin/.test(theme),grass=/valley|mill/.test(theme),autumn=season==='autumn',winter=season==='winter',deep=winter?'#647c68':'#476948',mid=winter?'#90a28a':autumn?'#879354':'#72965a',light=winter?'#bdc7ac':autumn?'#b6ad72':'#abc37b';
  let out=A.P('#35523b',A.ell(x+1,y+1,17,4.4),.17),stems='',leaf=["","",""],veins='';
  if(rock)out+=_gardenCraftStone(x+7,y-1,8,3.8,seed,false);
  const fans=grass?3:2;
  for(let fan=0;fan<fans;fan++){const bx=x-7+fan*8,by=y+(fan%2)*1.5;
    for(let i=-2;i<=2;i++){const angle=-Math.PI/2+i*.27+(r()-.5)*.14,len=11+r()*10,tx=bx+Math.cos(angle)*len,ty=by+Math.sin(angle)*len;stems+=`M${f(bx)} ${f(by)}Q${f(bx+i*2.5)} ${f(by-len*.55)} ${f(tx)} ${f(ty)}`;
      if(grass){leaf[(i+fan+6)%3]+=A.leaf(bx+i*2,by-6,angle,7,1.7);continue;}
      for(let j=1;j<=3;j++){const t=j/4,px=bx+(tx-bx)*t,py=by+(ty-by)*t,s=3.8*(1-t)+1.5;leaf[(j+fan)%3]+=A.leaf(px,py,angle-.8,s,1.4)+A.leaf(px,py,angle+.8,s,1.4);}
      veins+=`M${f(bx)} ${f(by)}L${f(tx)} ${f(ty)}`;
    }
  }
  out+=A.S(deep,.95,stems,.86)+A.P(deep,leaf[0],.93)+A.P(mid,leaf[1],.95)+A.P(light,leaf[2],.88)+A.S(light,.38,veins,.54);return out;
}
function gardenCraftTreeDetail(tree,season,barkOnly) {
  const A=GART,f=A.f1,h=tree.height,x=tree.x,y=tree.y,r=A.rng(tree.seed+701);let flakes='',light='',leaves=['','',''];
  for(let i=0;i<9;i++){const yy=y-h*(.08+i*.047),xx=x+(r()-.5)*7,w=2+r()*3;flakes+=_gardenCraftPath([[xx-w,yy],[xx-w*.5,yy-3],[xx+w,yy-2],[xx+w*.7,yy+4],[xx-w*.8,yy+5]]);light+=`M${f(xx-w*.5)} ${f(yy-2.3)}l${f(w*.9)} -.4`;}
  if(!barkOnly&&season!=='winter')for(let i=0;i<17;i++){const a=r()*Math.PI*2,rad=Math.sqrt(r()),xx=x+Math.cos(a)*h*.24*rad,yy=y-h*.7+Math.sin(a)*h*.22*rad;leaves[yy<y-h*.77?2:yy>y-h*.6?0:1]+=A.leaf(xx,yy,r()*6.2,3.8+r()*3,1.8);}
  return A.P('#b8b08b',flakes,.35)+A.S('#d4c6a0',.48,light,.65)+A.P('#3b6244',leaves[0],.6)+A.P(season==='autumn'?'#9b9d5d':'#75945c',leaves[1],.54)+A.P('#bac88c',leaves[2],.58);
}
function gardenCraftSurfaceRows(sc) {
  if(typeof gardenIslandActive!=='function'||!gardenIslandActive())return[];
  const data=gardenIslandData(),A=GART,W=GARDEN_WORLD,open=new Set(sc.areas||[]),key=sc.season+'|'+(sc.areas||[]).join(',')+'|'+!!(sc.rain&&sc.rain.snow);
  if(_GARDEN_CRAFT.data!==data){_GARDEN_CRAFT.data=data;_GARDEN_CRAFT.surfaceKey='';_GARDEN_CRAFT.surfaces=[];}
  if(_GARDEN_CRAFT.surfaceKey===key)return _GARDEN_CRAFT.surfaces;
  const groups=new Map(),point=(x,y)=>({x:x/W.cellW,y:(y-W.sky)/W.cellH});
  const add=(id,x,y,html)=>{if(!html)return;const tile=Math.floor(x/480)+':'+Math.floor((y-W.sky)/300),k=id+':'+tile;if(!groups.has(k))groups.set(k,{id:k,x0:Math.floor(x/480)*480,y0:W.sky+Math.floor((y-W.sky)/300)*300,html:''});groups.get(k).html+=html;};
  const roadPoint=(x,y)=>{const p=point(x,y),c=gardenIslandBaseCell(p.x,p.y),r=c&&gardenLandCell(Math.floor(p.x),Math.floor(p.y));return !!(c&&c.land&&!c.beach&&!c.freshwater&&!c.solid&&(c.route||c.reservation==='apron')&&(!c.regionZone||open.has('zn-'+c.regionZone))&&!(r&&(r.plot||r.solid))&&gardenIslandLandContains(p.x,p.y));};
  // Leave bends and junctions as a single quiet stone surface. Overlapping
  // rotated courses at those points make the paving look scattered.
  const corners=(data.routes||[]).filter(route=>gardenIslandRoadStyle(route).main).flatMap(route=>route.points||[]);
  // Worn flagstone courses live only inside the actual public road surface.
  for(const route of data.routes||[]){if(!route.points||typeof gardenIslandRoadStyle!=='function')continue;const style=gardenIslandRoadStyle(route);if(!style.main)continue;const pts=gardenIslandRoutePath(route).points;let carried=0,index=0;
    for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dx=(b.x-a.x)*W.cellW,dy=(b.y-a.y)*W.cellH,len=Math.hypot(dx,dy);if(len<.01)continue;const tx=dx/len,ty=dy/len,nx=-ty,ny=tx,radius=style.radius/Math.hypot(nx/W.cellW,ny/W.cellH);
      for(let distance=carried;distance<len;distance+=27,index++){const t=distance/len,cx=(a.x+(b.x-a.x)*t)*W.cellW,cy=W.sky+(a.y+(b.y-a.y)*t)*W.cellH,seed=gardenHash('flagstone|'+route.id+'|'+index),rng=A.rng(seed),offset=(index%2)*.34;
        if(corners.some(([x,y])=>Math.hypot(cx-x*W.cellW,cy-W.sky-y*W.cellH)<W.cellW*1.25))continue;
        for(let lane=-1;lane<=1;lane++){const side=(lane+offset-.17)*radius*.47,half=Math.min(14,radius*.23),along=9.5+rng()*2.5,x=cx+nx*side,y=cy+ny*side,p=[[-along,-half],[along,-half+.8],[along-1,half-1],[-along+.7,half]].map(([u,v])=>[x+tx*u+nx*v,y+ty*u+ny*v]);if(!p.every(q=>roadPoint(q[0],q[1])))continue;
          const color=lane===0&&index%5===0?'#c0b28f':(seed+lane)%3?'#d7caaa':'#c4b998',d=_gardenCraftPath(p),edge=`M${A.f1(p[0][0]+.5)} ${A.f1(p[0][1]+.5)}L${A.f1(p[1][0]-.5)} ${A.f1(p[1][1]-.5)}`;
          add('flagstone',x,y,A.P(color,d,.38)+A.S('#a19779',.62,d,.42)+A.S('#ece0bf',.65,edge,.58));
        }
      }carried=(carried-len)%27;if(carried<0)carried+=27;
    }
  }
  const validDry=(x,y,beach)=>{const p=point(x,y),c=gardenIslandBaseCell(p.x,p.y),r=c&&gardenLandCell(Math.floor(p.x),Math.floor(p.y));return !!(c&&c.land&&!c.reserved&&!c.freshwater&&!c.solid&&(!c.regionZone||open.has('zn-'+c.regionZone))&&(!beach?!c.beach:c.beach)&&!(r&&(r.plot||r.solid||r.trail||r.lane)));};
  const sampleRing=(ring,step,fn)=>{let carried=0,index=0;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=(b[0]-a[0])*W.cellW,dy=(b[1]-a[1])*W.cellH,len=Math.hypot(dx,dy);if(len<.01)continue;for(let d=carried;d<len;d+=step,index++){const t=d/len;fn((a[0]+(b[0]-a[0])*t)*W.cellW,W.sky+(a[1]+(b[1]-a[1])*t)*W.cellH,dx/len,dy/len,index);}carried=(carried-len)%step;if(carried<0)carried+=step;}};
  // Submerged silt shelves and paired river stones stay inside each actual
  // basin; they add depth underneath existing reflections, fish and ripples.
  for(const basin of data.freshwater||[]){if(!basin.boundary)continue;const centroid=basin.boundary.reduce((v,p)=>[v[0]+p[0]/basin.boundary.length,v[1]+p[1]/basin.boundary.length],[0,0]),region=gardenIslandRegionAt(...centroid);if(region&&region.zone&&!open.has('zn-'+region.zone))continue;
    sampleRing(basin.boundary,72,(x,y,tx,ty,index)=>{let nx=-ty,ny=tx;const probe=point(x+nx*4,y+ny*4);if(!_gardenIslandInLoop(probe.x,probe.y,basin.boundary)){nx=-nx;ny=-ny;}const seed=gardenHash('bank-strata|'+basin.id+'|'+index),cx=x+nx*9,cy=y+ny*9;
      if(index%3!==1){const p=[[x-tx*19+nx*3,y-ty*19+ny*3],[x+tx*23+nx*4,y+ty*23+ny*4],[x+tx*17+nx*9,y+ty*17+ny*9],[x-tx*15+nx*7,y-ty*15+ny*7]],stones=_gardenCraftStone(cx,cy,5.5+(seed%3),2.8,seed,true)+_gardenCraftStone(cx+tx*12+nx*3,cy+ty*12+ny*3,3.4,1.8,seed+1,true);const probes=p.concat([[cx-9,cy-5],[cx+9,cy-5],[cx+9,cy+5],[cx-9,cy+5],[cx+tx*12+nx*3-5,cy+ty*12+ny*3-3],[cx+tx*12+nx*3+5,cy+ty*12+ny*3+3]]);if(probes.every(v=>{const q=point(v[0],v[1]);return _gardenIslandInLoop(q.x,q.y,basin.boundary);}))add('water:'+basin.id,cx,cy,A.P('#547e70',_gardenCraftPath(p),.17)+stones);}
      const bx=x-nx*13,by=y-ny*13;if(index%3===0&&[[-10,-6],[10,-6],[10,6],[-10,6]].every(([dx,dy])=>validDry(bx+dx,by+dy,false)))add('bank',bx,by,_gardenCraftStone(bx,by,9,4,seed,false));
    });
  }
  // Small shingle groups belong to a few genuine sandy pockets, never lawn.
  for(const ring of data.coast.land)sampleRing(ring,186,(x,y,tx,ty,index)=>{if(index%2)return;let nx=-ty,ny=tx;const q=point(x+nx*40,y+ny*40);if(!gardenIslandLandContains(q.x,q.y)){nx=-nx;ny=-ny;}const cx=x+nx*43,cy=y+ny*43;if(![[-14,-7],[14,-7],[14,7],[-14,7]].every(([dx,dy])=>validDry(cx+dx,cy+dy,true)))return;const seed=gardenHash('tideline-shingle|'+index);add('shingle',cx,cy,_gardenCraftStone(cx-6,cy,6.5,3.1,seed,false)+_gardenCraftStone(cx+7,cy+3,4.2,2.1,seed+1,false)+A.S('#c5bc97',.6,`M${A.f1(cx-18)} ${A.f1(cy+6)}q15 2 29 -.5`,.47));});
  const rows=[...groups.values()].map(row=>({id:row.id,html:`<g class="gd-crafted-surface" pointer-events="none">${row.html}</g>`,bounds:{x:row.x0-32,y:row.y0-32,width:544,height:364}}));_GARDEN_CRAFT.surfaceKey=key;return _GARDEN_CRAFT.surfaces=rows;
}
