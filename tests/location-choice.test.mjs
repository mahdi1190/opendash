import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { validateConfig } from '../lib/datadir.mjs';
const source = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');
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
