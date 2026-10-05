/* Per-browser history; no server upload, precise route or inferred closed-app
 * tracking. Fresh device observations drive durations; manual choices stay separate. */
let _locationHistoryMemory = null;
function dashboardLocationHistory() {
  try { _locationHistoryMemory=JSON.parse(localStorage.getItem('dashboard-location-history') || 'null') || _locationHistoryMemory; } catch (e) { /* private mode */ }
  return _locationHistoryMemory || {version:1,visits:[],observations:[]};
}
function dashboardLocationObserve(location, source) {
  if (!location.countryCode && typeof ukCountyNearest==='function' && ukCountyNearest(location.lat,location.lon)) location={...location,countryCode:'GB'};
  _locationHistoryMemory=locationHistoryObserveState(dashboardLocationHistory(),location,source,Date.now());
  try { localStorage.setItem('dashboard-location-history',JSON.stringify(_locationHistoryMemory)); } catch (e) { /* bounded in-memory fallback */ }
  return _locationHistoryMemory;
}
function dashboardLocationHistoryContext(w) {
  const source=APP_CONFIG.locationMode==='device'?'device':'manual';
  const p={...w,name:w.town || w.name,countryCode:w.cc || ''};
  return locationHistoryContext(dashboardLocationHistory(),p,source,Date.now());
}
function dashboardLocationHistoryClear() {
  _locationHistoryMemory={version:1,visits:[],observations:[]};
  if (typeof _aukArrivalMemory !== 'undefined') _aukArrivalMemory=null;
  try { localStorage.removeItem('dashboard-location-history');localStorage.removeItem('dashboard-anim-uk-arrival'); } catch (e) { /* private mode */ }
}
function dashboardLocationHistoryPanel() {
  const box=document.createElement('div');box.className='loc-history';
  const draw=()=>{
    box.replaceChildren();
    const history=dashboardLocationHistory(), visits=history.visits.slice(-6).reverse();
    const note=document.createElement('p');note.className='muted';
    note.textContent='Local history: '+history.visits.length+' visits/selections. Device presence is sampled; departures and time between fixes are estimates. Retained for up to 90 days.';box.appendChild(note);
    const date=at=>Number.isFinite(at)?new Date(at).toLocaleString():'Unknown'; // clock-ok: observed real timestamps, not simulated clock
    const duration=ms=>Math.round(ms/60000)+' min';
    for(const v of visits){
      const row=document.createElement('p');
      row.textContent=v.source==='device'
        ? v.point.name+' — first seen '+date(v.firstSeenAt)+'; last confirmed '+date(v.lastConfirmedAt)+'; departure '+(v.departureConfirmed?'between '+date(v.departureEarliestAt)+' and '+date(v.departureLatestAt):v.closedBy?'unknown (source changed)':'not observed')+'; observed span '+duration(v.lastConfirmedAt-v.firstSeenAt)+'; sampled presence '+duration(v.sampledPresenceMs)+'; unobserved gaps '+duration(v.unobservedMs)+'; fix accuracy '+v.accuracy+' m.'
        : v.point.name+' — manual selection first recorded '+date(v.firstSeenAt)+'; physical presence and time spent unknown.';
      box.appendChild(row);
    }
    const clear=document.createElement('button');clear.className='btn btn-ghost btn-sm';clear.textContent='Clear location history';clear.onclick=()=>{dashboardLocationHistoryClear();draw();};box.appendChild(clear);
  };draw();return box;
}
if (typeof window !== 'undefined') window.addEventListener('load',()=>{
  if (APP_CONFIG.locationMode !== 'manual' || !APP_CONFIG.location) return;
  const point=locationHistoryPoint(APP_CONFIG.location), last=dashboardLocationHistory().visits.at(-1);
  if (point && (!last || last.source!=='manual' || last.point.key!==point.key)) dashboardLocationObserve(APP_CONFIG.location,'manual');
}, {once:true});
