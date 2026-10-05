/* AI reasons at most once per morning/afternoon/evening while Home is open.
 * Minute refreshes revalidate the proposals locally; only explicit requests use AI. */
let _homeAdvice = null, _homeAdviceBusy = null, _homeAdviceError = '';
const _HOME_ADVICE_KEY = 'dashboard-day-advice';
try { if (typeof localStorage !== 'undefined') _homeAdvice = JSON.parse(localStorage.getItem(_HOME_ADVICE_KEY)||'null'); } catch (e) { /* Private mode. */ }
function homeAdvicePeriod() { const h=Clock.parts(Clock.now()).h; return h<12?'morning':h<17?'afternoon':'evening'; }
function homeAdviceCurrent() {
  const a=_homeAdvice;
  if(!a||!Array.isArray(a.ideas)||a.date!==todayStr()||a.tz!==Clock.zone()||a.period!==homeAdvicePeriod()||!Number.isFinite(a.expiresAt)||Date.now()>=a.expiresAt) return null;
  // A completed/deleted task invalidates its accompanying summary as well as the card.
  if((a.ideas||[]).some(i=>!getItem(i.taskId)||statusOf(i.taskId)==='done'||state.deleted?.[i.taskId])) return null;
  return a;
}
function homeAdviceIdeas() {
  const a=homeAdviceCurrent(),minute=Clock.parts(Clock.now()).min;
  if(!a) return [];
  return (a.ideas||[]).filter(i=>{
    if(!i.start) return true;
    const [h,m]=i.start.split(':').map(Number),[eh,em]=i.end.split(':').map(Number),start=h*60+m,end=eh*60+em;
    if(start<minute)return false;
    if(typeof homeCalStatus==='function') {const status=homeCalStatus();if(!status.ok||status.stale)return false;}
    const busy=[...(typeof homeCalEvents==='function'?homeCalEvents(todayStr()):[]),...(typeof homeTimedTasks==='function'?homeTimedTasks(todayStr()):[])];
    return !busy.some(e=>!e.allDay&&!e.bg&&!e.free&&start<e.end&&end>e.start);
  });
}
function homeAdvisorPaint() {
  const root=typeof _hdRoot==='function'?_hdRoot():null;
  if(root) {
    let host=root.querySelector('.hd-advisor');
    if(!host){host=document.createElement('section');host.className='card hd-advisor';root.appendChild(host);}
    host.innerHTML='<div class="bf-ai-h">'+icon('sparkles')+'<span class="overline">AI day adviser</span><span class="spacer"></span></div><p class="hd-advisor-status muted" role="status"></p><div class="hd-advisor-ideas"></div>';
    const button=document.createElement('button');button.type='button';button.className='btn btn-secondary btn-sm';button.disabled=!!_homeAdviceBusy;
    button.textContent=_homeAdviceBusy?'Thinking through your day…':'Think through my day';button.onclick=()=>homeAdvisorReview(false);host.querySelector('.bf-ai-h').appendChild(button);
    const available=typeof connHas==='function'&&connHas('claude');
    const a=homeAdviceCurrent();
    host.querySelector('.hd-advisor-status').textContent=_homeAdviceBusy?'Reviewing your tasks, deadlines, calendar and recent progress.':a?'AI review · '+new Date(a.at).toLocaleTimeString(APP_CONFIG.locale||undefined,{hour:'2-digit',minute:'2-digit',timeZone:Clock.zone()})+' · '+a.model:available?'Reasons across your day and proposes up to three next steps. Uses your selected AI chat model.':'Connect Claude in Connections to use the day adviser.';
    if(_homeAdviceError&&!_homeAdviceBusy)host.querySelector('.hd-advisor-status').textContent=_homeAdviceError+' The normal suggestions remain available.';
    if(!available){button.disabled=true;button.onclick=null;}
    const row=host.querySelector('.hd-advisor-ideas');
    for(const idea of homeAdviceIdeas()) {
      const el=document.createElement('article');el.className='hd-idea';
      el.innerHTML=`<b>${esc(idea.title)}</b><p>${esc(idea.reason)}</p><p><strong>Next step:</strong> ${esc(idea.nextStep)}</p>`+(idea.start?`<span class="muted">Suggested window: ${esc(idea.start)}–${esc(idea.end)}</span>`:'');
      const open=document.createElement('button');open.type='button';open.className='btn btn-ghost btn-sm';open.textContent='Open task';
      open.onclick=()=>{if(getItem(idea.taskId)&&statusOf(idea.taskId)!=='done')homeOpenTask(idea.taskId,open);else homeAdvisorPaint();};
      el.appendChild(open);row.appendChild(el);
    }
  }
  if(typeof _bfPaintAi==='function')_bfPaintAi(null,false);
}
async function homeAdvisorReview(automatic) {
  if(_homeAdviceBusy)return _homeAdviceBusy;
  if(!briefPrefs().ai){if(!automatic)toast('Turn AI on in Home and stories settings.');return;}
  const task=async()=>{
    try{
      _homeAdviceError='';
      if(state._localDirty && typeof _persistFire==='function')await _persistFire();
      if(state._localDirty)throw new Error('Wait for your latest changes to finish saving, then try again.');
      const response=await fetch('/api/story/advice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({automatic:!!automatic})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error?.message||data.error||'The AI review could not finish.');
      _homeAdvice=data;
      try{localStorage.setItem(_HOME_ADVICE_KEY,JSON.stringify(data));}catch(e){/* Private mode. */}
      if(!automatic)toast(data.cached?'Showing the recent AI review':'Your AI day review is ready',{kind:'ok'});
    }catch(e){_homeAdviceError=e.message;if(!automatic)toast(e.message,{kind:'err'});}
    finally{_homeAdviceBusy=null;homeAdvisorPaint();}
  };
  _homeAdviceBusy=Promise.resolve().then(task);homeAdvisorPaint();return _homeAdviceBusy;
}
function homeAdvisorTick() {
  homeAdvisorPaint();
  if(typeof briefPrefs!=='function')return;
  if(!briefPrefs().advisorAuto||!briefPrefs().ai||document.hidden||typeof _serverAvailable==='undefined'||!_serverAvailable||!connHas('claude')||_homeAdviceBusy)return;
  const key=todayStr()+'|'+Clock.zone()+'|'+homeAdvicePeriod();
  let attempts={};try{attempts=JSON.parse(localStorage.getItem(_HOME_ADVICE_KEY+'-attempts')||'{}');}catch(e){/* Private mode. */}
  if(attempts.key===key&&Date.now()-attempts.at<15*60*1000)return;
  if(_homeAdvice&&_homeAdvice.date===todayStr()&&_homeAdvice.tz===Clock.zone()&&_homeAdvice.period===homeAdvicePeriod())return;
  try{localStorage.setItem(_HOME_ADVICE_KEY+'-attempts',JSON.stringify({key,at:Date.now()}));}catch(e){/* Private mode. */}
  homeAdvisorReview(true);
}
