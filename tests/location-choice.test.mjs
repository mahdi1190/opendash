import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { validateConfig } from '../lib/datadir.mjs';
const source = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');
function deviceRefreshHarness(permissions) {
  const events = {}, timers = [], requests = [], saves = [];
  const context = vm.createContext({
    APP_CONFIG: { locationMode: 'device', location: { name: 'Last fix' } },
    window: { addEventListener(name, fn) { events[name] = fn; } },
    document: { hidden: false, addEventListener(name, fn) { events[name] = fn; } },
    setInterval(fn, ms) { timers.push({ fn, ms }); },
    navigator: { permissions, geolocation: { getCurrentPosition(ok, fail, options) { requests.push({ ok, fail, options }); } } },
    browserTimeZone: () => 'UTC', _bf: {}, briefLoadWeather() {},
    settingsSaveConfig: async patch => { saves.push(patch); Object.assign(context.APP_CONFIG, patch); return true; },
  });
  vm.runInContext(source('78-location.js'), context);
  const settle = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  return { context, events, timers, requests, saves, settle };
}
test('each page load requests a fresh device fix without requiring the Permissions API', async () => {
  for (let load = 0; load < 2; load++) {
    const h = deviceRefreshHarness();
    h.events.load(); await h.settle();
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].options.maximumAge, 0);
    h.requests[0].ok({ timestamp:Date.now(), coords: { latitude: 53.381, longitude: -1.471, accuracy:50 } });
    await vm.runInContext('_locationAutoRefresh', h.context);
    assert.equal(h.saves.length, 1);
    assert.equal(h.saves[0].location.lat, 53.38);
    assert.equal(h.saves[0].location.lon, -1.47);
  }
});
test('periodic and tab-return checks coalesce, pause when hidden and retry after failure', async () => {
  const h = deviceRefreshHarness();
  h.events.load(); await h.settle();
  h.requests[0].fail({ code: 3 }); await vm.runInContext('_locationAutoRefresh', h.context);
  assert.equal(h.saves.length, 0);
  assert.equal(h.context.APP_CONFIG.location.name, 'Last fix');
  assert.equal(h.timers[0].ms, 15 * 60 * 1000);
  h.context.document.hidden = true;
  await h.timers[0].fn(); assert.equal(h.requests.length, 1);
  h.context.document.hidden = false;
  h.events.visibilitychange(); h.timers[0].fn(); await h.settle();
  assert.equal(h.requests.length, 2);
  h.requests[1].ok({ timestamp:Date.now(), coords: { latitude: 53.48, longitude: -2.24, accuracy:50 } });
  await vm.runInContext('_locationAutoRefresh', h.context);
  assert.equal(h.saves.length, 1);
});
test('automatic device checks preserve manual mode and avoid background permission prompts', async () => {
  const h = deviceRefreshHarness({ query: async () => ({ state: 'prompt' }) });
  h.context.APP_CONFIG.locationMode = 'manual';
  h.events.load(); await h.timers[0].fn();
  assert.equal(h.requests.length, 0);
  h.context.APP_CONFIG.locationMode = 'device';
  await h.timers[0].fn(); assert.equal(h.requests.length, 0);
  const check = vm.runInContext('dashboardLocationAutoRefresh(true)', h.context);
  await h.settle(); assert.equal(h.requests.length, 1);
  h.requests[0].fail({ code: 1 }); assert.equal(await check, false);
});
test('device refresh falls back when the geolocation permission query is unsupported', async () => {
  const h = deviceRefreshHarness({ query: async () => { throw new Error('Unsupported permission'); } });
  const check = h.timers.length ? h.timers[0].fn() : vm.runInContext('dashboardLocationAutoRefresh()', h.context);
  await h.settle(); assert.equal(h.requests.length, 1);
  h.requests[0].fail({ code: 3 }); assert.equal(await check, false);
});

test('stale and inaccurate fixes are recorded diagnostically without replacing the location', async()=>{
  for(const fix of [{timestamp:Date.now()-180000,coords:{latitude:53.38,longitude:-1.47,accuracy:50}},{timestamp:Date.now(),coords:{latitude:53.38,longitude:-1.47,accuracy:5000}}]) {
    const h=deviceRefreshHarness();const seen=[];h.context.dashboardLocationObserve=(p,source)=>seen.push({p,source});
    const check=vm.runInContext('dashboardDeviceRefresh(false)',h.context);
    h.requests[0].ok(fix);
    assert.equal(await check,false);assert.equal(h.saves.length,0);assert.equal(seen.length,1);
    assert.equal(h.context.APP_CONFIG.location.name,'Last fix');
  }
});

test('visible device watch confirms presence and stops when hidden or switched to manual', async()=>{
  const h=deviceRefreshHarness();let watch,cleared=[];const seen=[];
  h.context.dashboardLocationObserve=(p,source)=>seen.push({p,source});
  h.context.navigator.geolocation.watchPosition=(fn)=>{watch=fn;return 7;};
  h.context.navigator.geolocation.clearWatch=id=>cleared.push(id);
  h.events.load();await h.settle();
  h.requests[0].ok({timestamp:Date.now(),coords:{latitude:53.38,longitude:-1.47,accuracy:30}});
  await vm.runInContext('_locationAutoRefresh',h.context);assert.equal(typeof watch,'function');
  await watch({timestamp:Date.now()+1,coords:{latitude:53.38,longitude:-1.47,accuracy:30,speed:0}});
  assert.equal(seen.at(-1).source,'device');assert.equal(seen.at(-1).p.speed,0);
  assert.equal(h.saves.length,1,'same-place watch confirmations do not repeatedly save configuration');
  h.context.document.hidden=true;h.events.visibilitychange();assert.deepEqual(cleared,[7]);
  const n=seen.length;await watch({timestamp:Date.now(),coords:{latitude:53.48,longitude:-2.24,accuracy:30}});
  assert.equal(seen.length,n,'hidden callbacks cannot record presence');
  h.context.document.hidden=false;vm.runInContext('dashboardDeviceWatchStart()',h.context);
  await vm.runInContext("dashboardLocationSave({locationMode:'manual',location:{name:'Chosen',lat:53.38,lon:-1.47}},false)",h.context);
  assert.deepEqual(cleared,[7,7]);assert.equal(seen.at(-1).source,'manual');
});
test('location source defaults to manual and retains a separately saved manual place', () => {
  const place = {name:'Sheffield',lat:53.38,lon:-1.47};
  const manual = validateConfig({location:place}).config;
  assert.equal(manual.locationMode,'manual'); assert.equal(manual.manualLocation.name,'Sheffield');
  const device = validateConfig({...manual,locationMode:'device',location:{name:'Manchester',lat:53.48,lon:-2.24}}).config;
  assert.equal(device.location.name,'Manchester'); assert.equal(device.manualLocation.name,'Sheffield');
});
test('a delayed device fix cannot overwrite a subsequent manual choice', async () => {
  let resolve, saves=0;
  const context=vm.createContext({APP_CONFIG:{locationMode:'device'},navigator:{geolocation:{getCurrentPosition(ok){resolve=ok;}}},browserTimeZone:()=> 'Europe/London',settingsSaveConfig:async()=>{saves++;return true;},_bf:{},briefLoadWeather(){}});
  vm.runInContext(source('78-location.js'),context);
  const pending=vm.runInContext('dashboardDeviceRefresh(false)',context);
  vm.runInContext("++_locationRequest; APP_CONFIG.locationMode='manual'",context);
  resolve({coords:{latitude:53.38,longitude:-1.47}});
  assert.equal(await pending,false); assert.equal(saves,0);
});
test('device denial preserves the selected manual location', async () => {
  let saves=0;
  const context=vm.createContext({APP_CONFIG:{locationMode:'manual'},navigator:{geolocation:{getCurrentPosition(ok,fail){fail({code:1});}}},settingsSaveConfig:async()=>{saves++;}});
  vm.runInContext(source('78-location.js'),context);
  await assert.rejects(vm.runInContext('dashboardDeviceRefresh(true)',context));
  assert.equal(saves,0); assert.equal(context.APP_CONFIG.locationMode,'manual');
});
test('manual opening title keeps the chosen town even when its offline anchor is another town', () => {
  const context=vm.createContext({APP_CONFIG:{locationMode:'manual',location:{name:'Local village',lat:53.38,lon:-1.47}},animLook:()=>({ukRegional:true}),TravelStore:{on:()=>{throw new Error('travel should not be consulted');}}});
  vm.runInContext(source('71-uk-counties.js')+'\n'+source('78-anim-uk.js'),context);
  assert.equal(vm.runInContext('animUkWhere().town',context),'Local village');
  assert.equal(vm.runInContext('animUkWhere().id',context),'south-yorkshire');
});
test('profile art prefers a nearby mini, falls back to nearby full art and respects blocks', () => {
  const full={ref:'local/full',county:'south-yorkshire',ukTown:'Sheffield',slot:'opening',full:true};
  const mini={...full,ref:'local/mini',slot:'symbol',full:false};
  const distant={...mini,ref:'local/distant',county:'greater-manchester',ukTown:'Manchester'};
  const look={block:[]};
  const context=vm.createContext({animUkWhere:()=>({id:'south-yorkshire',town:'Sheffield',lat:53.38,lon:-1.47}),animLook:()=>look,animItems:()=>[distant,full,mini],_agLevel:()=> 'subtle',_animFitsLevel:()=>true,_awWhen:()=>true,todayStr:()=> '2026-10-05',_animHash:()=>0});
  vm.runInContext(source('71-uk-counties.js')+'\n'+source('71-anim-registry.js')+'\n'+source('78-anim-profile.js'),context);
  // The pure registry defines animItems; replace it with this synthetic gallery.
  context.animItems=()=>[distant,full,mini]; context._animFitsLevel=()=>true;
  assert.equal(vm.runInContext('animProfileScene().ref',context),'local/mini');
  look.block.push('local/mini');
  assert.equal(vm.runInContext('animProfileScene().ref',context),'local/full');
  look.block.push('local/full');
  assert.equal(vm.runInContext('animProfileScene()',context),null);
});
