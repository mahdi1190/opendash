/* Quiet island travellers. Pure route/schedule rules; fictional characters are
 * not friend actors, gifts or new progression. The existing host ambient phase
 * determines one arrival, a village pause and its return along the same road. */
const GARDEN_TRAVELLERS = Object.freeze([
  Object.freeze({ id: 'seed-courier', name: 'Aster', title: 'Seed courier', coat: '#648597', trim: '#d6c49a', hat: '#597284', skin: '#c99b77', hair: '#605446', bag: '#ad8057', menu: 'shop', link: 'Browse seeds', icon: 'sprout', hint: 'A little space around a growing plot makes the whole garden easier to enjoy. Keep the promenade and doorways clear, and put your plants in the growing ground.' }),
  Object.freeze({ id: 'travelling-angler', name: 'Reed', title: 'Travelling angler', coat: '#b49b58', trim: '#e2d5ac', hat: '#918850', skin: '#a77b59', hair: '#716c60', bag: '#72806a', menu: 'catch', link: 'Open Catch', icon: 'fish', hint: 'The sea and the freshwater pools have different fish. The Catch book records their homes; trying another shore is often more useful than making the same cast again.' }),
  Object.freeze({ id: 'naturalist', name: 'Moss', title: 'Island naturalist', coat: '#71876a', trim: '#d7caa8', hat: '#927d5e', skin: '#d1aa87', hair: '#66503f', bag: '#787455', menu: 'lands', link: 'See island regions', icon: 'leaf', hint: 'Each misty passage leads to another part of the island. The map and Land book show the garden level that opens it. There is no need to explore everything at once.' })
]);
const GARDEN_TRAVELLER_TIMING = Object.freeze({ cycle: 240000, firstArrival: 6000, walk: 22000, linger: 70000, fade: 1800 });
const _gardenTravellerPaths = new WeakMap();
function gardenTravellerRoadPath(road) {
  if (!road) return null;
  if (_gardenTravellerPaths.has(road)) return _gardenTravellerPaths.get(road);
  const shared = typeof gardenIslandRoutePath === 'function' ? gardenIslandRoutePath(road) : road;
  const points = (shared.points || []).map(p => Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y });
  if (points.length < 2 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const segments = [], W = GARDEN_WORLD; let distance = 0;
  for (let i=1;i<points.length;i++) { const a=points[i-1],b=points[i],length=Math.hypot((b.x-a.x)*W.cellW,(b.y-a.y)*W.cellH); if(length>.001){segments.push(Object.freeze({a,b,start:distance,length}));distance+=length;} }
  if (!segments.length) return null;
  const result=Object.freeze({id:road.id,points:Object.freeze(points.map(Object.freeze)),segments:Object.freeze(segments),distance});_gardenTravellerPaths.set(road,result);return result;
}
function gardenTravellerPoint(path, progress, departing) {
  const t=Math.max(0,Math.min(1,progress)),eased=t*t*(3-2*t),distance=(departing?1-eased:eased)*path.distance;
  const leg=path.segments.find(s=>distance<=s.start+s.length)||path.segments[path.segments.length-1],part=Math.max(0,Math.min(1,(distance-leg.start)/leg.length)),dx=(leg.b.x-leg.a.x)*(departing?-1:1);
  return {x:leg.a.x+(leg.b.x-leg.a.x)*part,y:leg.a.y+(leg.b.y-leg.a.y)*part,face:Math.abs(dx)>.015?Math.sign(dx):departing?-1:1};
}
function gardenTravellerSample(phase, seed, path) {
  const T=GARDEN_TRAVELLER_TIMING;if(!path||!Number.isFinite(phase)||phase<0)return null;
  const cycle=Math.floor(phase/T.cycle),age=phase-cycle*T.cycle-T.firstArrival,total=T.walk*2+T.linger;
  if(age<0||age>=total)return null;
  const def=GARDEN_TRAVELLERS[(cycle+(seed>>>0))%GARDEN_TRAVELLERS.length],stage=age<T.walk?'arriving':age<T.walk+T.linger?'lingering':'departing',moving=stage!=='lingering';
  const point=stage==='arriving'?gardenTravellerPoint(path,age/T.walk,false):stage==='departing'?gardenTravellerPoint(path,(age-T.walk-T.linger)/T.walk,true):gardenTravellerPoint(path,1,false);
  return {id:'traveller:'+def.id,cycle,def,stage,moving,phase,...point,alpha:Math.min(1,Math.max(0,age/T.fade),Math.max(0,(total-age)/T.fade))};
}
