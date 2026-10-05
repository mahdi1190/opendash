import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../src/app/77-location-history-logic.js',import.meta.url),'utf8');
const c=vm.createContext({});vm.runInContext(code,c);
const observe=(s,p,source,now)=>c.locationHistoryObserveState(s,p,source,now);
const ctx=(s,p,source,now)=>c.locationHistoryContext(s,p,source,now);
const base=Date.UTC(2026,9,5,10), minute=60000, day=86400000;
const a={name:'Yateley',countryCode:'GB',lat:51.34,lon:-0.83,accuracy:50};
const b={name:'Fleet',countryCode:'GB',lat:51.28,lon:-0.84,accuracy:50};
const device=(s,p,t)=>observe(s,{...p,observedAt:t},'device',t);
test('fresh confirmations accumulate sampled presence while closed-app gaps remain unknown',()=>{
  let s=device(null,a,base);s=device(s,a,base+15*minute);s=device(s,a,base+2*day);
  const v=s.visits[0];
  assert.equal(v.arrivedAt,base);assert.equal(v.lastConfirmedAt,base+2*day);
  assert.equal(v.sampledPresenceMs,15*minute);assert.equal(v.unobservedMs,2*day-15*minute);
  assert.equal(v.gapCount,1);assert.equal(v.confirmations,3);
  assert.equal(ctx(s,a,'device',base+2*day).observedSpanMs,2*day);
});
test('departures have bounds and returning time is measured from presence, not old arrival',()=>{
  let s=device(null,a,base);s=device(s,a,base+4*day);s=device(s,b,base+4*day+15*minute);s=device(s,a,base+4*day+60*minute);
  assert.equal(s.visits[0].departureEarliestAt,base+4*day);
  assert.equal(s.visits[0].departureLatestAt,base+4*day+15*minute);
  assert.equal(s.visits[0].departureEstimated,true);
  const stats=ctx(s,a,'device',base+4*day+60*minute);
  assert.equal(stats.awayMinMs,45*minute);assert.equal(stats.awayMaxMs,60*minute);
  assert.equal(stats.visitCount,2);assert.equal(stats.previousStayMs,4*day);
  assert.equal(stats.uniqueToday,2);assert.ok(stats.displacementKm>3);
});
test('stale, future, inaccurate and out-of-order fixes cannot invent arrivals or presence',()=>{
  let s=device(null,a,base);
  const missing=observe(s,b,'device',base+minute);
  assert.equal(missing.visits.length,1);assert.equal(missing.lastFix.observedAt,null);
  for(const p of [{...b,observedAt:base-3*minute},{...b,observedAt:base+minute},{...b,observedAt:base,accuracy:5000},{...b,observedAt:base}]) {
    s=observe(s,p,'device',base+minute/2);
  }
  assert.equal(s.visits.length,2,'only the final fresh accurate changed place is accepted');
  const before=s.visits.at(-1).lastConfirmedAt;
  s=observe(s,{...a,observedAt:base-1},'device',base+minute/2);
  assert.equal(s.visits.length,2);assert.equal(s.visits.at(-1).lastConfirmedAt,before);
});
test('GPS boundary wobble and duplicate fixes do not create visits',()=>{
  let s=device(null,a,base);s=device(s,{...a,name:'Neighbouring town',lat:51.35},base+minute);
  assert.equal(s.visits.length,1);assert.equal(s.visits[0].point.name,'Yateley');
  const n=s.visits[0].confirmations;s=device(s,{...a,name:'Neighbouring town',lat:51.35},base+minute);
  assert.equal(s.visits[0].confirmations,n);
});
test('manual selections never accrue physical duration or prove device departure',()=>{
  let s=device(null,a,base);s=observe(s,b,'manual',base+minute);s=observe(s,b,'manual',base+day);
  assert.equal(s.visits[0].departureConfirmed,false);
  assert.equal(s.visits[1].sampledPresenceMs,0);
  const stats=ctx(s,b,'manual',base+day);assert.equal(stats.observedSpanMs,0);assert.equal(stats.awayMinMs,null);
});
test('history survives serialisation, retains optional sensor metadata, and is bounded',()=>{
  let s=device(null,{...a,altitude:50,altitudeAccuracy:10,speed:2,heading:120},base);
  assert.equal(s.lastFix.altitude,50);assert.equal(s.lastFix.heading,120);
  s=JSON.parse(JSON.stringify(s));
  for(let i=1;i<1300;i++)s=device(s,{...a,name:'Place '+i,lat:i%2?52:51},base+i*minute);
  assert.ok(s.visits.length<=250);assert.ok(s.observations.length<=1000);
  s=device(s,a,base+100*day);assert.equal(s.visits.length,1);assert.equal(s.observations.length,1);
});

test('browser history feeds visit context across reloads and clearing also removes legacy visit memory',()=>{
  const store=new Map([['unrelated-preference','keep']]);let now=base;
  const page=()=>{
    const p=vm.createContext({APP_CONFIG:{locationMode:'device'},Date:class extends Date {static now(){return now;}},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
    vm.runInContext(code+'\nlet _aukArrivalMemory={seen:["old"]};\n'+readFileSync(new URL('../src/app/78-location-history.js',import.meta.url),'utf8'),p);return p;
  };
  let p=page();p.dashboardLocationObserve({...a,observedAt:now},'device');
  now+=15*minute;p=page();p.dashboardLocationObserve({...a,observedAt:now},'device');
  const stats=p.dashboardLocationHistoryContext({town:'Yateley',cc:'GB',lat:a.lat,lon:a.lon});
  assert.equal(stats.sampledPresenceMs,15*minute);assert.equal(stats.visitCount,1);
  store.set('dashboard-anim-uk-arrival','private-history');p.dashboardLocationHistoryClear();
  assert.equal(store.has('dashboard-location-history'),false);assert.equal(store.has('dashboard-anim-uk-arrival'),false);
  assert.equal(store.get('unrelated-preference'),'keep');assert.equal(vm.runInContext('_aukArrivalMemory',p),null);
});
