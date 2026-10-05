import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const src = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');
function harness() {
  let now = Date.parse('2026-10-05T10:59:00Z'), paints = 0, resolve;
  const wait = new Promise(r => resolve = r);
  const ctx = vm.createContext({
    Clock: { now: () => now, parts: n => ({ h: new Date(n).getUTCHours(), min: new Date(n).getUTCHours()*60+new Date(n).getUTCMinutes() }) },
    state: {view:'home'}, todayStr:()=>new Date(now).toISOString().slice(0,10),
    document: { hidden:false,activeElement:null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){} },
    _bfPaintAi:()=>paints++, _serverAvailable:false, homeDataRefreshVisible:()=>wait,
    _hhModel:()=>({tpl:{}}), homeTodayTemplate:()=>({sentences:[{text:'Current day summary.'}]}),
  });
  vm.runInContext(src('12-home-refresh.js'),ctx);
  return {ctx,resolve,setTime:v=>now=Date.parse(v),paints:()=>paints};
}
test('refresh today immediately updates derived content and deduplicates repeated clicks', async()=>{
  const h=harness();
  assert.equal(vm.runInContext('homeUseCurrentSummary()',h.ctx),false);
  const first=vm.runInContext('homeRefreshToday()',h.ctx);
  assert.equal(h.paints(),1);
  assert.equal(vm.runInContext('homeUseCurrentSummary()',h.ctx),true);
  assert.equal(vm.runInContext('homeRefreshToday()',h.ctx),first);
  h.resolve(); await first;
  assert.equal(h.paints(),2);
});
test('the live refresh runs once per minute, skips hidden tabs and catches up after noon',()=>{
  const h=harness();
  vm.runInContext('homeRefreshClock();homeRefreshClock()',h.ctx); assert.equal(h.paints(),1);
  h.ctx.document.hidden=true; h.setTime('2026-10-05T12:01:00Z');
  vm.runInContext('homeRefreshClock()',h.ctx); assert.equal(h.paints(),1);
  h.ctx.document.hidden=false; vm.runInContext('homeRefreshClock()',h.ctx);
  assert.equal(h.paints(),2); assert.equal(vm.runInContext('homeUseCurrentSummary()',h.ctx),true);
});
test('Refresh today checks device location before refreshing location-dependent data', async () => {
  const h = harness(), calls = [];
  let finishLocation;
  h.ctx.dashboardLocationAutoRefresh = explicit => {
    assert.equal(explicit, true); calls.push('location');
    return new Promise(resolve => { finishLocation = resolve; });
  };
  h.ctx.homeDataRefreshVisible = () => { calls.push('data'); return Promise.resolve(); };
  const pending = vm.runInContext('homeRefreshToday()', h.ctx);
  await Promise.resolve();
  assert.deepEqual(calls, ['location']);
  finishLocation(false); await pending;
  assert.deepEqual(calls, ['location', 'data']);
});
test('Home refresh preserves notebook and capture editors and focused widget controls',()=>{
  const h=harness(),repaint=[];
  h.ctx.document.querySelectorAll=()=>['notebook','capture','suggest','schedule'].map(id=>({dataset:{wid:id},contains:()=>id==='schedule'}));
  h.ctx.homeRerenderWidget=id=>repaint.push(id);
  vm.runInContext('homeRefreshDerived()',h.ctx);
  assert.deepEqual(repaint,['suggest']);
});
test('fallback ideas discard time windows that have already passed',()=>{
  const ctx=vm.createContext({Clock:{now:()=>0,parts:()=>({min:721})}});
  vm.runInContext(src('12-home-head.js'),ctx);
  assert.equal(vm.runInContext('_hdIdea({kind:"gap",text:"Before noon",refs:[{type:"time",ref:"11:00"}]},{data:{gaps:[]}})',ctx),null);
});
