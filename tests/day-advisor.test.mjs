import { test } from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import { dayAdvisorFacts,validateDayAdvice } from '../lib/day-advisor.mjs';
const facts={date:'2026-10-05',time:'13:00',tasks:[{id:'a',estimate:30},{id:'b',estimate:15},{id:'done'}],completedToday:['done'],gaps:[{start:'13:30',end:'15:00'}]};
const idea=(taskId,start='',end='')=>({taskId,title:'A useful task',reason:'A deadline is approaching.',nextStep:'Draft the outline.',start,end});
test('adviser validates task references, completion, future gaps, overlap and estimates',()=>{
  const result=validateDayAdvice({summary:'Today.',ideas:[idea('missing'),idea('done'),idea('a','12:00','12:30'),idea('a','13:30','13:45'),idea('a','13:30','14:00'),idea('b','13:45','14:15'),idea('b','14:00','14:30')]},facts);
  assert.deepEqual(result.ideas.map(i=>i.taskId),['a','b']);
  assert.deepEqual(result.ideas.map(i=>i.start),['13:30','14:00']);
});
test('unknown or stale calendar data never offers asserted free time to AI',()=>{
  const q={s:{custom:[{id:'a',title:'Plan'}]},cfg:{},clock:{time:'09:00'}};
  const data={date:'2026-10-05',now:'13:05',tz:'UTC',calendar:{missing:true},gaps:[{start:'14:00',end:'15:00'}]};
  const f=dayAdvisorFacts(q,data);assert.equal(f.time,'13:05');assert.deepEqual(f.gaps,[]);
  data.calendar={stale:true};assert.deepEqual(dayAdvisorFacts(q,data).gaps,[]);
});
test('client expires AI ideas when time passes, calendar clashes appear or a task is completed',()=>{
  const ctx=vm.createContext({Clock:{now:()=>0,zone:()=> 'UTC',parts:()=>({h:13,min:780})},todayStr:()=> '2026-10-05',getItem:()=>({id:'a'}),statusOf:()=> 'todo',state:{},homeCalStatus:()=>({ok:true}),homeCalEvents:()=>[],homeTimedTasks:()=>[]});
  vm.runInContext(readFileSync(new URL('../src/app/12-home-advisor.js',import.meta.url),'utf8'),ctx);
  vm.runInContext(`_homeAdvice={date:'2026-10-05',tz:'UTC',period:'afternoon',expiresAt:Date.now()+60000,ideas:[{taskId:'a',start:'13:30',end:'14:00'}]}`,ctx);
  assert.equal(vm.runInContext('homeAdviceIdeas().length',ctx),1);
  ctx.homeCalEvents=()=>[{start:800,end:840}];assert.equal(vm.runInContext('homeAdviceIdeas().length',ctx),0);
  ctx.homeCalEvents=()=>[];ctx.Clock.parts=()=>({h:14,min:840});assert.equal(vm.runInContext('homeAdviceIdeas().length',ctx),0);
  ctx.statusOf=()=> 'done';assert.equal(vm.runInContext('homeAdviceCurrent()',ctx),null);
});
