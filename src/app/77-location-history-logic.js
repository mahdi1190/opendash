/* Local location observations, not continuous proof of whereabouts. Pure rules.
 * Coordinates retain the dashboard's approximately 1 km rounding. Device fixes
 * older than two minutes or with accuracy worse than 1 km cannot confirm a visit.
 * Retention: 90 days, 250 visits and 1,000 observations. Manual choices are
 * separate from observed presence. Departure is a bounded estimate. */
const LH_DAY = 86400000;
function locationHistoryDistance(a, b) {
  if (![a && a.lat, a && a.lon, b && b.lat, b && b.lon].every(Number.isFinite)) return 0;
  const r = Math.PI / 180;
  const h = Math.sin((b.lat-a.lat)*r/2)**2 + Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lon-a.lon)*r/2)**2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}
function locationHistoryPoint(p) {
  if (!p || ![p.lat,p.lon].every(Number.isFinite) || Math.abs(p.lat)>90 || Math.abs(p.lon)>180) return null;
  const lat=Math.round(p.lat*100)/100, lon=Math.round(p.lon*100)/100;
  const name=String(p.name || p.town || 'Current location').slice(0,120), cc=String(p.countryCode || p.cc || '').toUpperCase().slice(0,2);
  const key=cc+'|'+name.trim().toLowerCase()+(name==='Current location'?'|'+lat+','+lon:'');
  return {key,name,cc,lat,lon};
}
function locationHistoryObserveState(raw, p, source, now) {
  const state={version:1,visits:[],observations:[],...(raw || {})};
  state.visits=(Array.isArray(state.visits)?state.visits:[]).filter(v=>v && v.firstSeenAt>=now-90*LH_DAY).slice(-250).map(v=>({...v}));
  state.observations=(Array.isArray(state.observations)?state.observations:[]).filter(v=>v && v.receivedAt>=now-90*LH_DAY).slice(-999);
  const point=locationHistoryPoint(p);
  if (!point || !Number.isFinite(now)) return state;
  const device=source==='device', at=device?(Number.isFinite(p.observedAt)?p.observedAt:null):now;
  const finite=(n,min=0)=>Number.isFinite(n)&&n>=min?n:null;
  const accuracy=finite(p.accuracy);
  const accepted=!device || (at!==null && at<=now+5000 && now-at<=120000 && accuracy!==null && accuracy<=1000);
  const fix={...point,source,observedAt:at,receivedAt:now,accuracy,accepted,
    altitude:finite(p.altitude,-12000),altitudeAccuracy:finite(p.altitudeAccuracy),speed:finite(p.speed),heading:finite(p.heading)};
  const last=state.observations.at(-1);
  const latest=state.lastFix;
  if (latest && latest.source===source && latest.observedAt===at && latest.key===point.key && latest.accuracy===accuracy) return state;
  // Preserve the latest fix, sampling unchanged observations at most once/minute.
  state.lastFix=fix;
  if (!last || last.key!==point.key || last.accepted!==accepted || at-last.observedAt>=60000) state.observations.push(fix);
  if (!accepted) return state;
  const current=state.visits.at(-1);
  if (current && at<current.lastConfirmedAt) return state;
  const km=current?locationHistoryDistance(current.point,point):0;
  const changed=current && (current.source!==source || (current.point.key!==point.key && (!device || km>=Math.max(3,((current.accuracy || 0)+accuracy)/1000))));
  if (current && !changed) {
    if (device) {
      const gap=Math.max(0,at-current.lastConfirmedAt);
      if (gap<=20*60000) current.sampledPresenceMs+=gap;
      else {current.unobservedMs+=gap;current.gapCount++;}
      current.lastConfirmedAt=at; current.accuracy=accuracy; current.lastPoint=point;
      current.confirmations++;
    }
    return state;
  }
  if (current) {
    current.departureEarliestAt=current.lastConfirmedAt;
    current.departureLatestAt=at;
    current.departedAt=Math.round((current.lastConfirmedAt+at)/2);
    current.departureEstimated=true;
    current.closedBy=source;
    // Switching to a manual choice cannot prove a physical departure.
    current.departureConfirmed=device && current.source==='device';
  }
  state.visits.push({id:source+':'+at,point,source,firstSeenAt:at,arrivedAt:at,arrivalEstimated:true,
    arrivalEarliestAt:current && device && current.source==='device'?current.lastConfirmedAt:null,
    lastConfirmedAt:at,lastPoint:point,accuracy,confirmations:device?1:0,
    sampledPresenceMs:0,unobservedMs:0,gapCount:0,
    previousDisplacementKm:device && current && current.source==='device'?locationHistoryDistance(current.lastPoint || current.point,point):0});
  state.visits=state.visits.slice(-250);
  return state;
}
function locationHistoryContext(state, p, source, now) {
  const point=locationHistoryPoint(p);
  const visits=state && Array.isArray(state.visits)?state.visits:[];
  if (!point) return null;
  const matching=visits.filter(v=>v.source===source && v.point.key===point.key);
  const current=matching.at(-1), previous=matching.slice(0,-1).at(-1);
  if (!current) return null;
  const observed=source==='device';
  const previousLocation=visits[visits.indexOf(current)-1];
  const recent=visits.filter(v=>v.source===source && v.firstSeenAt<=now);
  // Use last confirmed presence before departure, not the previous arrival.
  const awayMinMs=observed && previous && previous.departureConfirmed?Math.max(0,current.firstSeenAt-previous.departureLatestAt):null;
  const awayMaxMs=observed && previous && previous.departureConfirmed?Math.max(0,current.firstSeenAt-previous.departureEarliestAt):null;
  return {source:previousLocation && previousLocation.source!==source?'manual':observed?'geo':'manual',
    ...(previousLocation && previousLocation.source===source?{from:{...(previousLocation.lastPoint || previousLocation.point),town:previousLocation.point.name}}:{}),returning:matching.length>1,visitCount:matching.length,
    awayMs:awayMaxMs || 0,awayMinMs,awayMaxMs,
    uniqueToday:new Set(recent.filter(v=>Math.max(v.firstSeenAt,observed?v.lastConfirmedAt:0)>now-LH_DAY).map(v=>v.point.key)).size,
    uniqueWeek:new Set(recent.filter(v=>Math.max(v.firstSeenAt,observed?v.lastConfirmedAt:0)>now-7*LH_DAY).map(v=>v.point.key)).size,
    returningCountry:recent.slice(0,-1).some(v=>v.point.cc && v.point.cc===point.cc),
    observedSpanMs:observed?Math.max(0,current.lastConfirmedAt-current.firstSeenAt):0,
    sampledPresenceMs:current.sampledPresenceMs,unobservedMs:current.unobservedMs,
    previousStayMs:observed && previous?Math.max(0,previous.lastConfirmedAt-previous.firstSeenAt):0,
    previousSampledMs:observed && previous?previous.sampledPresenceMs:0,
    previousLastSeenAt:observed && previous?previous.lastConfirmedAt:null,
    displacementKm:current.previousDisplacementKm,
    observedDisplacementWeekKm:recent.filter(v=>v.firstSeenAt>now-7*LH_DAY).reduce((n,v)=>n+(v.previousDisplacementKm || 0),0),
    historySource:source};
}
