/* One retained island traveller on the existing public promenade. No save
 * fields, friend membership, rewards, collision masks or extra timers. Native
 * and Classic both tick through the existing gardenWorldAdd sprite loop. */
const _gtr = { sprite:null, context:'', road:null, path:null, phase:null, classicBase:0, classicAt:null, classicRate:1, received:null, paused:false, current:null };
function gardenTravellerReceiveClock(value, fid, session) {
  if (!Array.isArray(value)||value.length!==2||!Number.isFinite(value[0])||value[0]<0||value[0]>8.64e15||![0,1].includes(value[1])) return false;
  _gtr.received={phase:value[0],rate:value[1],at:performance.now(),fid:String(fid||''),session:String(session||'')};return true;
}
function gardenTravellerClearClock() { _gtr.received=null; }
function _gtrHeld(environment) {
  return !!document.hidden || !!(environment && environment.paused) || typeof _gfs !== 'undefined' && !!_gfs.ambientPaused || !!(_gw.svg && (_gw.svg.hasAttribute('data-garden-frozen') || _gw.svg.classList.contains('gd-hush')));
}
function gardenTravellerAmbientClock() {
  if(typeof _gw==='undefined'||!_gw.on||typeof gardenHere!=='function')return null;
  const m=gardenHere();if(!m||m.pending||m.visit||Number(m.wv)!==4||typeof gardenIslandArrivalRoad!=='function'||!gardenIslandArrivalRoad())return null;
  const now=performance.now();
  if(_gtr.classicAt==null){_gtr.classicAt=now;_gtr.classicBase=0;}
  else if(_gtr.classicRate)_gtr.classicBase+=Math.max(0,now-_gtr.classicAt);
  _gtr.classicAt=now;_gtr.classicRate=_gtrHeld(null)?0:1;
  return [Math.min(8.64e15,Math.max(0,Math.round(_gtr.classicBase))),_gtr.classicRate];
}
function _gtrArt(def) {
  const angler=def.id==='travelling-angler',naturalist=def.id==='naturalist',hat=angler?`<path d="M-15-49Q-10-58 0-57Q11-57 15-49L20-46H-20Z" fill="${def.hat}" stroke="#59634f" stroke-width="1.1"/><path d="M-13-50H13" stroke="${def.trim}" stroke-width="2"/>`:naturalist?`<path d="M-14-50Q-11-59 1-58Q12-58 14-50Z" fill="${def.hair}"/>`:`<path d="M-14-50Q-12-58 0-58Q11-58 14-51L19-49H-13Z" fill="${def.hat}" stroke="#465b65" stroke-width="1.1"/>`;
  const carried=angler?'<path d="M10-19L24-78Q27-80 29-77" fill="none" stroke="#6b7256" stroke-width="1.7"/><path d="M28-77Q32-46 23-20" fill="none" stroke="#c2cdb8" stroke-width=".65"/>':naturalist?'<path d="M4-29L17-27V-13L4-16Z" fill="#d7d5b9" stroke="#656b52" stroke-width="1.1"/><path d="M7-25L13-24M7-21L13-20" stroke="#80916a" stroke-width="1"/>':`<path d="M7-27L18-24V-10L6-12Z" fill="${def.bag}" stroke="#776448" stroke-width="1"/><path d="M8-26L15-23L17-29L10-32Z" fill="#e0d4af" stroke="#a89b7a" stroke-width=".7"/>`;
  return `<g class="gd-traveller-art"><ellipse cx="1" cy="2" rx="12" ry="4" fill="#243e32" opacity=".18"/><g data-traveller-part="body"><g data-traveller-part="face">`
    + `<g data-traveller-part="leg-a"><path d="M-8-17L-8-2H-1L1-17Z" fill="#59665b"/><path d="M-9-4H-1V1H-12Q-13-2-9-4Z" fill="#514e43"/></g><g data-traveller-part="leg-b"><path d="M1-17L2-2H9L8-17Z" fill="#667266"/><path d="M2-4H10Q13-2 13 1H2Z" fill="#5f594b"/></g>`
    + `<path d="M-10-38Q0-42 11-37L13-15Q2-10-12-16Z" fill="${def.coat}" stroke="#526552" stroke-width="1.1"/><path d="M-4-37L-1-17" stroke="${def.trim}" stroke-width="1.7"/><circle cx="1" cy="-28" r="1" fill="${def.trim}"/><circle cx="2" cy="-22" r="1" fill="${def.trim}"/>`
    + `<g data-traveller-part="arm"><path d="M-10-35Q-17-26-14-17" fill="none" stroke="${def.coat}" stroke-width="7" stroke-linecap="round"/><circle cx="-14" cy="-17" r="3" fill="${def.skin}"/></g><path d="M10-35L14-25" stroke="${def.coat}" stroke-width="7" stroke-linecap="round"/>${carried}`
    + `<path d="M-5-41V-35Q0-32 5-36V-42" fill="${def.skin}"/><path d="M-13-49Q-13-37-3-36Q9-35 13-46Q13-57 0-57Q-11-57-13-49Z" fill="${def.skin}" stroke="#846f57" stroke-width=".8"/>${hat}<path d="M-7-47h2M3-47h2" stroke="#41483e" stroke-width="1.7" stroke-linecap="round"/><path d="M-3-41Q0-39 4-41" fill="none" stroke="#84614d" stroke-width=".9"/>`
    + (naturalist?'<g fill="none" stroke="#65715b" stroke-width=".8"><circle cx="-5" cy="-47" r="4"/><circle cx="5" cy="-47" r="4"/><path d="M-1-47H1"/></g>':'')+`<path d="M-7-36Q1-31 8-36L6-31Q0-28-8-32Z" fill="${def.trim}"/></g></g></g>`;
}
function _gtrPose(dt,S) {
  if(!S.node)return;
  if(S.partsNode!==S.node){S.partsNode=S.node;S.parts={};for(const key of ['body','face','leg-a','leg-b','arm'])S.parts[key]=S.node.querySelector('[data-traveller-part="'+key+'"]');S.poseKey='';}
  const sample=_gtr.current;if(!sample)return;
  const motion=typeof gardenMotionOn!=='function'||gardenMotionOn(),held=_gtr.paused,walk=sample.moving&&motion,step=walk?Math.sin(sample.phase/145):0;
  const values=[sample.face,Math.round(step*10)/10,Math.round((walk?Math.abs(step)*.75:0)*10)/10,sample.alpha.toFixed(2)].join('|');if(held&&S.poseKey)return;if(values===S.poseKey)return;S.poseKey=values;
  S.parts.face?.setAttribute('transform','scale('+sample.face+' 1)');S.parts.body?.setAttribute('transform','translate(0 '+(-Math.abs(step)*.75).toFixed(2)+')');S.parts['leg-a']?.setAttribute('transform','rotate('+(step*8).toFixed(2)+' -4 -15)');S.parts['leg-b']?.setAttribute('transform','rotate('+(-step*8).toFixed(2)+' 5 -15)');S.parts.arm?.setAttribute('transform','rotate('+(-step*9).toFixed(2)+' -10 -35)');S.node.setAttribute('opacity',motion?sample.alpha.toFixed(3):'1');
}
function _gtrDrop() { if(_gtr.sprite){_gtr.sprite.remove();_gtr.sprite=null;} _gtr.current=null; }
function gardenTravellersStop(keepPhase) { _gtrDrop();_gtr.phase=null;if(!keepPhase){_gtr.context='';_gtr.road=null;_gtr.path=null;_gtr.received=null;} }
function gardenTravellerTalk(id) {
  const sample=_gtr.current,S=_gtr.sprite;if(!sample||!S||sample.id!==id||sample.stage!=='lingering')return false;
  const def=sample.def;gardenBubbleOpen({x:S.x,y:S.y-.5},{title:def.name+' · '+def.title,sub:def.hint,items:[{ic:def.icon,label:def.link,text:def.link,run:()=>{gardenBubbleClose();gardenPopupOpen(def.menu);}}],cls:'is-words'});return true;
}
function gardenTravellerInteract() {
  const S=_gtr.sprite;if(!S||!_gtr.current||_gtr.current.stage!=='lingering'||S._off)return false;
  if(Math.hypot((S.x-_gw.px)*GARDEN_WORLD.cellW,(S.y-_gw.py)*GARDEN_WORLD.cellH)>82)return false;
  return gardenTravellerTalk(S.id);
}
function gardenTravellersFrame(dt) {
  if(!_gw.on||!_gw.svg||!_gw.svg.isConnected||typeof gardenIslandArrivalRoad!=='function'){_gtrDrop();return;}
  const m=gardenHere(),road=gardenIslandArrivalRoad();if(!m||m.pending||Number(m.wv)!==4||!road){_gtrDrop();return;}
  const context=(m.visit?'visit:'+m.visit.fid:'home')+'|'+m.lh,now=performance.now();
  if(context!==_gtr.context||road!==_gtr.road){_gtrDrop();_gtr.context=context;_gtr.road=road;_gtr.path=gardenTravellerRoadPath(road);_gtr.phase=null;}
  if(!_gtr.path||m.visit&&!m.visit.live){_gtrDrop();return;}
  const light=window.GardenNative&&GardenNative.active()&&GardenNative.lighting(),env=light&&light.environment?light.environment():null;
  let target=null;
  if(m.visit){const received=_gtr.received;if(received&&received.fid===String(m.visit.fid))target=received.phase+(received.rate?Math.max(0,now-received.at):0);}
  else {const native=light&&light.ambientClock?light.ambientClock():null,fallback=native||gardenTravellerAmbientClock();if(fallback){target=fallback[0];_gtr.classicBase=target;_gtr.classicAt=now;_gtr.classicRate=fallback[1];}}
  if(target==null){_gtrDrop();return;}
  const paused=_gtrHeld(env);
  _gtr.paused=paused;
  // Local holds keep the current presentation. Resuming rejoins the actual
  // shared host phase instead of slowly replaying an old arrival for minutes.
  // A host rate of zero naturally holds the same schedule point on every client.
  if(_gtr.phase==null||!paused)_gtr.phase=target;
  if(typeof _grm!=='undefined'&&_grm.on){if(_gtr.sprite?.node)_gtr.sprite.node.setAttribute('visibility','hidden');return;}
  const seed=gardenHash('island-travellers-v1|'+m.lh+'|'+road.id),sample=gardenTravellerSample(_gtr.phase,seed,_gtr.path);
  if(!sample){_gtrDrop();return;}
  const motion=typeof gardenMotionOn!=='function'||gardenMotionOn();if(!motion){const at=gardenTravellerPoint(_gtr.path,1,false);sample.x=at.x;sample.y=at.y;sample.face=at.face;sample.moving=false;sample.alpha=1;sample.stage='lingering';}
  if(!_gtr.sprite||_gtr.sprite.id!==sample.id){_gtrDrop();const def=sample.def;_gtr.sprite=gardenWorldAdd({id:sample.id,kind:'road-traveller',svg:_gtrArt(def),x:sample.x,y:sample.y,ground:false,lift:0,hit:.55,hitUp:28,label:def.name+' · '+def.title+' (island traveller)',cursor:'hand',nodeAttrs:{'data-traveller':def.id},update:_gtrPose,onClick:()=>gardenTravellerTalk(sample.id)});}
  _gtr.current=sample;const S=_gtr.sprite;S.x=sample.x;S.y=sample.y;S.hit=sample.stage==='lingering'?.55:0;
  if(S.node&&S.node.getAttribute('visibility')==='hidden')S.node.removeAttribute('visibility');
}

// The Classic loop sleeps while hidden. Settle the fallback at the real
// visibility transition so a host hold is shared as a held phase/rate.
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(typeof _gw!=='undefined'&&_gw.on)gardenTravellerAmbientClock();});
