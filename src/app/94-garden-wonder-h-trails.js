/* Five quiet field stops lead to existing places. The player must solve the
 * observation, then deliberately set the discovered place out through Land.
 * Existing room hours, keys, gifts and ownership remain unchanged. */
const GARDEN_EXPLORATION_STOPS = Object.freeze([
  Object.freeze({ id: 'hollow-glade', zone: 1, name: 'The hollow glade', hint: 'Look around the woodland bench for a fallen branch with three cut marks.', kind: 'wood', near: [18, 35], sight: 'ld-hollow', mode: 'sequence', sequence: [0, 1, 0], labels: ['Short knock', 'Long knock', 'Rest'], notes: [392, 262, 523], clue: 'Three marks inside the bark: short, long, short. Something answers farther into the wood.', intro: 'A fallen branch has a thumb-sized hollow. The glade is quieter than the path; three cut marks sit above the opening.', found: 'The answer comes from a hollow oak. You remember the place; something inside only wakes toward dusk.' }),
  Object.freeze({ id: 'tidal-driftline', zone: 2, name: 'The tidal driftline', hint: 'Beyond the smoker, look along the east tidal beach for wood and blue glass.', kind: 'tide', near: [86, 72], sight: 'ld-boathouse', mode: 'search', labels: ['Turn the driftwood', 'Lift the shell', 'Brush the glass'], clues: ['A rope groove runs through the wood, worn round by the sea.', 'Under the shell is a blue fleck of old boat paint.', 'The glass covers the end of a drawing: a boat hanging above four chalk marks.'], intro: 'The high-water line has left one small tangle of wood, shell and blue glass. Three pieces fit the same story.', found: 'A little sketch points back inland to an old boathouse. Its loft is worth finding; the hulls in the rafters still have a tune in them.' }),
  Object.freeze({ id: 'ruin-approach', zone: 3, name: 'The mason\'s approach', hint: 'Follow the old watchtower approach uphill to three rubbing stones.', kind: 'ruin', near: [20, 67], sight: 'ld-barn', mode: 'cycle', target: [1, 2, 0], labels: ['Arch', 'Grain', 'Bell'], intro: 'Three loose rubbing stones lie beside the old approach. Their edges make a small picture when they face the right way.', clue: 'The worn picture runs left to right: grain, bell, arch. Turn each rubbing stone until its mark matches.', found: 'The rubbing shows an old barn beside the chapel approach. There may still be a sensible place to keep a key in its loft.' }),
  Object.freeze({ id: 'orchard-roots', zone: 4, name: 'The orchard root bank', hint: 'Look beside the southeast bank of the orchard pond, where roots show through.', kind: 'orchard', near: [79, 42], sight: 'ld-stump', mode: 'search', labels: ['Trace the roots', 'Lift a fallen leaf', 'Listen at the knot'], clues: ['Two roots curve inward, as though they once made a doorstep.', 'A tiny hinge has left its shape on the underside of the leaf.', 'A very small cup rattles somewhere beyond the bank.'], intro: 'The bank under the orchard has a fold of exposed roots. Fallen leaves collect around a knot that looks rather like a door.', found: 'The roots lead to an enormous old stump with a very small parlour inside. Its inhabitants keep their own visiting hour at dusk.' }),
  Object.freeze({ id: 'foothill-horizon', zone: 5, name: 'The foothill horizon', hint: 'Below the high peaks, three flat stones frame the sea, ridge and cloud.', kind: 'mountain', near: [80, 22], sight: 'ld-hut', mode: 'cycle', target: [0, 1, 2], labels: ['Sea', 'Ridge', 'Cloud'], intro: 'Three flat horizon stones sit below the high pass. Each has a different edge cut into it.', clue: 'Stack the view from low to high: sea, ridge, cloud. Turn each stone to fit the layer.', found: 'Along the ridge you pick out a shepherd\'s hut. It is a real little place to explore, with a warm stove and nobody home.' }),
]);
const _gexplore = { layout: null, points: new Map(), art: new Map(), sprites: new Map(), said: new Set(), talk: null };
function gardenExploreKnown(id, model) { return !(model && model.visit) && typeof gardenSightKnown === 'function' && gardenSightKnown(id); }
function _gexploreOpen(row, model) { return !!(model && !model.worldPending && GARDEN_WORLD.v >= 4 && (model.areas || []).includes('zn-' + row.zone)); }
function _gexploreGround(row, x, y) {
  const cell = gardenIslandBaseCell(Math.floor(x), Math.floor(y)), land = typeof gardenLandCell === 'function' ? gardenLandCell(Math.floor(x), Math.floor(y)) : null;
  if (!cell || !cell.land || cell.freshwater || cell.solid || cell.reserved || row.kind !== 'tide' && cell.beach || land && (land.plot || land.solid || land.lane || land.trail)) return false;
  const region = gardenIslandRegionAt(x, y); if (!region || region.zone !== row.zone || !gardenIslandLandContains(x, y)) return false;
  if (gardenIslandGeometry().freshwater.some(w => w.boundary && _gardenIslandInLoop(x, y, w.boundary))) return false;
  return true;
}
function _gexploreApproach(row, x, y) {
  const start = gardenIslandBaseCell(Math.floor(x), Math.floor(y));
  if (row.kind === 'tide' && start && start.beach) return true;
  // A clear common shoulder must lead directly to an existing path. This
  // avoids placing a clue in a lawn pocket enclosed by unowned growing plots.
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) for (let d=1;d<=3;d++) {
    const px=x+dx*d,py=y+dy*d,c=gardenIslandBaseCell(Math.floor(px),Math.floor(py));
    const r=typeof gardenLandCell==='function'?gardenLandCell(Math.floor(px),Math.floor(py)):null;
    if(!c||!c.land||c.freshwater||c.solid||c.regionZone!==row.zone||r&&(r.plot||r.solid))break;
    if(c.route)return true;
    if(c.reserved||c.beach)break;
  }
  return false;
}
function _gexploreSpot(row) {
  const data = gardenIslandData();
  if (_gexplore.layout !== data) { _gexplore.layout = data; _gexplore.points.clear(); _gexplore.art.clear(); }
  if (_gexplore.points.has(row.id)) return _gexplore.points.get(row.id);
  const choices = [];
  for (let y = Math.max(1, row.near[1] - 8); y <= Math.min(GARDEN_WORLD.rows - 2, row.near[1] + 8); y++) for (let x = Math.max(1, row.near[0] - 8); x <= Math.min(GARDEN_WORLD.cols - 2, row.near[0] + 8); x++) {
    const px = x + .5, py = y + .76;
    if (![[-.48,-.74],[.48,-.74],[-.48,.2],[.48,.2],[0,0]].every(([dx,dy]) => _gexploreGround(row, px + dx, py + dy)) || !_gexploreApproach(row,px,py)) continue;
    const coast = gardenIslandCoastDistance(px, py), score = Math.hypot(px - row.near[0], (py - row.near[1]) * 1.3) + (row.kind === 'tide' ? Math.abs(coast - 47) / 50 : 0);
    choices.push({ x: px, y: py, score });
  }
  choices.sort((a,b) => a.score - b.score || a.y - b.y || a.x - b.x);
  const first = choices[0], point = first ? Object.freeze({ x: first.x, y: first.y }) : null; _gexplore.points.set(row.id, point); return point;
}
function _gexploreClear(point, model) {
  const near = (p,w,h) => point.x + .48 > p.x && point.x - .48 < p.x + w && point.y + .2 > p.y && point.y - .8 < p.y + h;
  for (const p of gardenPropsNow()) if (near(p,p.w || 1,p.h || 1)) return false;
  for (const p of model.plants || []) { const d = p.def || gardenPlant(p.id); if (d && near(p,d.fp || 1,d.fp || 1)) return false; }
  for (const p of model.decor || []) { const d = p.def || gardenDecor(p.id); if (d && near(p,d.w || 1,d.h || 1)) return false; }
  return true;
}
function gardenExploreStops(model) {
  if (GARDEN_WORLD.v < 4 || !gardenIslandActive()) return [];
  const out = []; for (const row of GARDEN_EXPLORATION_STOPS) { if (!_gexploreOpen(row,model)) continue; const point = _gexploreSpot(row); if (point && _gexploreClear(point,model)) out.push({ row, point }); } return out;
}
function _gexploreArt(row, season, ground) {
  const key = row.kind + ':' + season + ':' + !!ground; if (_gexplore.art.has(key)) return _gexplore.art.get(key);
  const A = GART, winter = season === 'winter', autumn = season === 'autumn', leaf = winter ? '#a8b6a0' : autumn ? '#a99460' : '#789563'; let s = '';
  if (ground) {
    const colors = row.kind === 'tide' ? ['#b3a886','#e2d1a6'] : row.kind === 'mountain' || row.kind === 'ruin' ? ['#84927a','#b2b39a'] : ['#66805c',leaf];
    s = A.P(colors[0], A.blob(A.rng(A.hash(row.id)), -1, 0, 17, 6, 11, .28), .15) + A.P(colors[1], A.blob(A.rng(A.hash(row.id+'b')), 6, -2, 11, 4, 9, .3), .15);
    for (let i=0;i<4;i++) { const x = -17+i*10, y = i%2 ? 2 : -4; s += row.kind === 'tide' ? A.S('#cab994',.6,`M${x} ${y}q3 -1 6 0`,.65) : A.P(leaf,A.leaf(x,y,-.6+i*.7,4,1.1),.6); }
  } else if (row.kind === 'wood') {
    s = A.P('#3d5140',A.ell(2,1,20,4),.17)+A.P('#715e42','M-21 0Q-15 -11 14 -9L21 -3Q3 5-21 0Z')+A.P('#ab9871','M-19 -3Q-7 -10 14 -7L16 -4Q-2 1-19 -3Z')+A.P('#283d2d',A.ell(-9,-5,5,3))+A.S('#705c3f',1.1,'M2 -7l1 4M7 -8l1 4M12 -7l1 3')+A.P(leaf,A.leaf(-19,-4,-.5,7,2));
  } else if (row.kind === 'tide') {
    s = A.P('#796c50','M-21 -3Q-1 -12 20 -5L18 -1Q-1 -5-17 2Z')+A.S('#c3b08b',1.4,'M-15 -2Q0 -8 15 -4')+A.P('#e5d7b3','M-9 -10Q-14 -19-5 -21Q5 -16-1 -9Z')+A.S('#b7a583',.7,'M-5 -19L-3 -11M-8 -17L-5 -11')+A.P('#7eaaa5','M9 -13L15 -16L19 -12L14 -8Z')+A.S('#c5d9c0',.8,'M11 -13l3 -1');
  } else if (row.kind === 'ruin') {
    for (let i=0;i<3;i++) { const x=-15+i*15; s+=A.P('#798772',A.rrect(x-6,-8-i%2*3,13,9,2))+A.P('#b4b79c',A.rrect(x-5,-9-i%2*3,11,7,1))+A.S('#6f8069',.9,`M${x-2} ${-7-i%2*3}q3 -4 5 0`); }
    s+=A.P(leaf,A.leaf(-18,-1,2.2,7,2));
  } else if (row.kind === 'orchard') {
    s=A.S('#6d6545',5,'M-22 0Q-7 -2 0 -19M-5 -2Q10 -10 21 -5M-1 -14Q-11 -12-16 -17')+A.S('#ad9970',1.2,'M-20 -1Q-7 -4 0 -18M3 -7Q13 -10 19 -5')+A.P('#4f5639',A.ell(0,-9,4,6))+A.P(leaf,A.leaf(-15,-5,-1,8,3)+A.leaf(14,-5,2.3,8,3))+A.P(autumn?'#c7a263':'#d1b27d',A.leaf(9,1,-.4,6,2.3));
  } else {
    s=A.P('#405b4b',A.ell(2,2,21,5),.17)+A.P('#7d8a7a',A.blob(A.rng(4),0,-2,19,6,8,.18))+A.P('#a2aa92',A.blob(A.rng(5),-1,-5,15,5,8,.14))+A.P('#7c8b7a',A.blob(A.rng(6),1,-10,11,4,7,.12))+A.P(winter?'#d9dfd1':'#c9c6a6',A.blob(A.rng(7),0,-14,8,3,7,.1))+A.S('#657b65',1,'M-9 -3h7M-4 -8l2 -3 3 3M-3 -13h5');
  }
  _gexplore.art.set(key,s); return s;
}
/** Static, bounded natural patches share ordinary retained world art and Photo. */
function gardenExploreDetailRows(scene) {
  return gardenExploreStops(scene).map(({row,point}) => ({ id:'explore-detail:'+row.id,x:point.x,y:point.y,html:`<g pointer-events="none" transform="translate(${GART.f1(point.x*GARDEN_WORLD.cellW)} ${GART.f1(GARDEN_WORLD.sky+point.y*GARDEN_WORLD.cellH)})">${_gexploreArt(row,scene.season,true)}</g>` }));
}
function _gexploreOwnTalk(T,S,context) {
  const m=gardenHere();return !!(T && _gexplore.talk===T && _wd.talk===T && T.el.isConnected && _gw.on && !(typeof _grm!=='undefined'&&_grm.on) && !(typeof _ee!=='undefined'&&_ee.on) && _gexplore.sprites.get(S.row.id)===S && _gexploreOpen(S.row,m) && wdNear(S.x,S.y,3) && (m.visit ? 'visit:'+(m.visit.key||m.visit.fid||'') : 'home')===context.key && (m.visit || _gdG()===context.garden));
}
function gardenExploreOpenPlaces() {
  gardenPopupOpen('lands');
  const details=typeof _gdp!=='undefined'&&_gdp.pop&&_gdp.pop.el.querySelector('details[data-discovered-places]');
  if(details){details.open=true;details.scrollIntoView({block:'nearest'});}
}
function _gexploreFoundActions(T,S,context) {
  const row=S.row,m=gardenHere(); if(m.visit){T.say(row.found+' Only the garden owner can remember this place and choose where to set it out.');return;}
  const sight=gardenLandSight(row.sight),actions=[];
  if(!gardenSightIsSetOut(row.sight))actions.push({label:'Set out '+sight.name.toLowerCase()+' nearby',primary:true,run:()=>{if(!_gexploreOwnTalk(T,S,context))return;const r=gardenSightSetNearby(row.sight);if(!r.ok){T.say(r.msg||'Walk to a larger clear space, then use Your discovered places in Land.');return;}T.say('The place is now nearby. Walk up and click its door. Some doors open at particular hours or need the right key.');}});
  actions.push({label:'Open Your discovered places',run:()=>{if(!_gexploreOwnTalk(T,S,context))return;wdTalkClose(true);gardenExploreOpenPlaces();}});
  if(row.id==='ruin-approach' && gpGet('rm.k.iron') && !gardenExploreKnown('ld-chapel',m))actions.unshift({label:'Follow the bell with the iron key',primary:true,run:()=>{if(!_gexploreOwnTalk(T,S,context)||gardenHere().visit||!gpGet('rm.k.iron'))return;gpSet('explore.ld-chapel',_gdToday());T.say('The key belongs to the ruined chapel. It is now in Your discovered places too. Set it out deliberately, then try its normal low door.',[{label:'Open Your discovered places',run:()=>{if(_gexploreOwnTalk(T,S,context)){wdTalkClose(true);gardenExploreOpenPlaces();}}}]);}});
  T.say(row.found+' It is remembered in Land, under Your discovered places. Choose where to set it out, then walk to its door.',actions);
}
function _gexploreFinish(T,S,context) {
  if(!_gexploreOwnTalk(T,S,context))return;
  if(!gardenHere().visit && !gardenExploreKnown(S.row.sight,gardenHere()))gpSet('explore.'+S.row.sight,_gdToday());
  _gexploreFoundActions(T,S,context);
}
function _gexplorePuzzle(T,S,context) {
  const row=S.row;let step=0,mask=0,turns=[0,0,0];
  const valid=()=>_gexploreOwnTalk(T,S,context);
  if(row.mode==='search'){
    const show=(line)=>{if(!valid())return;const actions=row.labels.map((label,i)=>({label:(mask&1<<i?'Look again: ':'')+label,run:()=>{if(!valid())return;mask|=1<<i;show(row.clues[i]);}}));if(mask===7)actions.push({label:'Follow the pieces of the story',primary:true,run:()=>_gexploreFinish(T,S,context)});T.say(line||row.intro,actions);};show();return;
  }
  if(row.mode==='cycle'){
    const show=()=>{if(!valid())return;const actions=turns.map((value,i)=>({label:'Turn '+['left','middle','right'][i]+' stone: '+row.labels[value],run:()=>{if(!valid())return;turns[i]=(turns[i]+1)%3;show();}}));if(turns.every((value,i)=>value===row.target[i]))actions.push({label:'Trace the complete picture',primary:true,run:()=>_gexploreFinish(T,S,context)});T.say(row.clue+' Facing you: '+turns.map(i=>row.labels[i].toLowerCase()).join(', ')+'.',actions);};show();return;
  }
  const show=(line)=>{if(!valid())return;const actions=row.labels.map((label,i)=>({label,run:()=>{if(!valid())return;if(i!==2)wdSound([[row.notes[i],i===1?.5:.18,'sine',.015]]);if(i===row.sequence[step]){step++;if(step===row.sequence.length){_gexploreFinish(T,S,context);return;}show('The hollow answers. '+step+' of three marks join. '+row.clue);}else{step=0;show('The rhythm trails off. Start with the first mark. '+row.clue);}}}));actions.push({label:'Listen to the marked rhythm',run:()=>{if(!valid())return;wdSound(row.sequence.map((i,n)=>[row.notes[i],i===1?.5:.18,'sine',.015,n*.65]));show(row.clue);}});T.say(line||row.clue,actions);};show();
}
function gardenExploreStopOpen(S) {
  const m=gardenHere();if(!_gexploreOpen(S.row,m)||!wdNear(S.x,S.y,3)||typeof _gwFishBusy==='function'&&_gwFishBusy())return;
  const context={key:m.visit?'visit:'+(m.visit.key||m.visit.fid||''):'home',garden:m.visit?null:_gdG()};let T;
  T=wdTalk({name:S.row.name,art:_gexploreArt(S.row,m.season,false),at:{x:S.x,y:S.y},lines:[S.row.intro],bye:'Leave the trail stop',closeQuiet:true,onClose(){if(_gexplore.talk===T)_gexplore.talk=null;}});if(!T)return;_gexplore.talk=T;
  if(gardenExploreKnown(S.row.sight,m))_gexploreFoundActions(T,S,context);
  else T.say(S.row.intro,[{label:S.row.mode==='sequence'?'Read the marks and answer':'Look more closely',primary:true,run:()=>{if(_gexploreOwnTalk(T,S,context))_gexplorePuzzle(T,S,context);}}]);
}
function _gexploreReconcile(model) {
  const keep=new Set();
  for(const {row,point} of gardenExploreStops(model)){
    keep.add(row.id);let S=_gexplore.sprites.get(row.id);
    if(!S){S=wdSprite({id:'explore-stop:'+row.id,x:point.x,y:point.y,z:point.y+.02,still:true,ground:true,foot:.1,hit:.55,hitUp:10,cursor:'hand',label:row.name,svg:_gexploreArt(row,model.season,false),onClick:()=>gardenExploreStopOpen(S)});S.row=row;_gexplore.sprites.set(row.id,S);}
    else wdArt(S,_gexploreArt(row,model.season,false));
  }
  for(const [id,S]of _gexplore.sprites)if(!keep.has(id)){S.remove();_gexplore.sprites.delete(id);if(_gexplore.talk?.o?.at?.x===S.x&&_gexplore.talk?.o?.at?.y===S.y){if(_wd.talk===_gexplore.talk)wdTalkClose(true);_gexplore.talk=null;}}
}
wdMod({id:'regional-exploration',fun:false,visit:true,
  begin(model){_gexplore.said.clear();_gexploreReconcile(model);},painted:_gexploreReconcile,
  tick(model){_gexploreReconcile(model);if(typeof _grm!=='undefined'&&_grm.on||typeof _ee!=='undefined'&&_ee.on||typeof _gwFishBusy==='function'&&_gwFishBusy())return;for(const [id,S]of _gexplore.sprites)if(!_gexplore.said.has(id)&&wdNear(S.x,S.y,3.2)){_gexplore.said.add(id);gardenMessage(S.row.name+'. '+S.row.intro,{ambient:true,source:'exploration:'+id,icon:'footprints'});break;}},
  end(){if(_wd.talk===_gexplore.talk)wdTalkClose(true);_gexplore.talk=null;for(const S of _gexplore.sprites.values())S.remove();_gexplore.sprites.clear();_gexplore.said.clear();}
});
