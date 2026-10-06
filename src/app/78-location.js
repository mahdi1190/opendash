/* One explicit source for weather and nearby illustrations. Device fixes are
 * requested only after choosing Device; manual coordinates never get replaced. */
let _locationRequest = 0;
let _locationAutoRefresh = null;
let _locationWatchId = null;
let _locationWatchLastAt = 0;
let _locationInitialRefresh = null;
let _locationOpeningPending = false;
function dashboardLocationInitialRefresh() {
  if (!_locationInitialRefresh) _locationInitialRefresh = dashboardLocationAutoRefresh(true);
  return _locationInitialRefresh;
}
async function dashboardLocationBeforeOpening(budgetMs = 4000) {
  if (APP_CONFIG.locationMode !== 'device') return false;
  _locationOpeningPending = true;
  let timer;
  try {
    return await Promise.race([
      dashboardLocationInitialRefresh(),
      new Promise(resolve => { timer = setTimeout(() => resolve(false), budgetMs); }),
    ]);
  } finally { clearTimeout(timer); _locationOpeningPending = false; }
}
function dashboardDevicePoint(pos) {
  const lat = Math.round(pos.coords.latitude * 100) / 100;
  const lon = Math.round(pos.coords.longitude * 100) / 100;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('The device returned an invalid location.');
  const near = typeof ukCountyNearest === 'function' ? ukCountyNearest(lat, lon) : null;
  const world = !near && typeof trNearestCity === 'function' ? trNearestCity(lat,lon,{maxKm:15}) : null;
  const city = world && world.city;
  return { name: near ? near.town : city ? city.name : 'Current location', admin: near ? near.name : '', country: near ? 'United Kingdom' : city && typeof trCountry==='function' ? (trCountry(city.cc) || {}).name || '' : '', countryCode: near ? 'GB' : city ? city.cc : '', lat, lon, timezone: city && city.zone || browserTimeZone(),
    observedAt: pos.timestamp, accuracy: pos.coords.accuracy, altitude: pos.coords.altitude,
    altitudeAccuracy: pos.coords.altitudeAccuracy, speed: pos.coords.speed, heading: pos.coords.heading };
}
async function dashboardLocationSave(patch, refreshUI = true) {
  if (typeof animUkArrivalState === 'function' && typeof animUkWhere === 'function') animUkArrivalState(animUkWhere());
  if (!await settingsSaveConfig(patch, false)) return false;
  if (patch.location && typeof dashboardLocationObserve === 'function') dashboardLocationObserve(patch.location, patch.locationMode === 'device' ? 'device' : 'manual');
  if (patch.locationMode === 'manual') dashboardDeviceWatchStop();
  _bf.weather = null;
  briefLoadWeather(true);
  if (refreshUI && typeof render === 'function') render();
  else if (typeof renderShell === 'function') renderShell();
  if (typeof animUkCheck === 'function') {
    animUkCheck();
    setTimeout(() => animUkCheck(), 7000); // Retry after an active opening; pending arrivals are retained.
  }
  return true;
}
async function dashboardDeviceRefresh(choose, quiet = false) {
  const request = ++_locationRequest;
  if (!navigator.geolocation) throw new Error('Device location is unavailable in this browser. Choose a manual location.');
  const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, maximumAge: 0, timeout: 12000 }));
  if (request !== _locationRequest || (!choose && APP_CONFIG.locationMode !== 'device')) return false;
  const location = dashboardDevicePoint(pos);
  if (!Number.isFinite(location.accuracy) || location.accuracy < 0 || location.accuracy > 1000 || !Number.isFinite(location.observedAt) || Date.now()-location.observedAt>120000 || location.observedAt>Date.now()+5000) {
    if (typeof dashboardLocationObserve === 'function') dashboardLocationObserve(location,'device');
    return false;
  }
  const saved = await dashboardLocationSave({ locationMode: 'device', location, ...(choose && APP_CONFIG.locationMode !== 'device' ? { manualLocation: APP_CONFIG.location || null } : {}) }, !quiet);
  if (saved) dashboardDeviceWatchStart();
  return saved;
}
function dashboardDeviceWatchStop() {
  if (_locationWatchId !== null && navigator.geolocation && navigator.geolocation.clearWatch) navigator.geolocation.clearWatch(_locationWatchId);
  _locationWatchId = null;
}
function dashboardDeviceWatchStart() {
  if (_locationWatchId !== null || APP_CONFIG.locationMode !== 'device' || document.hidden || !navigator.geolocation.watchPosition) return;
  _locationWatchId = navigator.geolocation.watchPosition(async pos => {
    if (APP_CONFIG.locationMode !== 'device' || document.hidden) return;
    try {
      const location=dashboardDevicePoint(pos);
      if (typeof dashboardLocationObserve === 'function') dashboardLocationObserve(location,'device');
      const old=APP_CONFIG.location;
      const moved=!old || location.name!==old.name || Math.abs(location.lat-old.lat)+Math.abs(location.lon-old.lon)>=0.03;
      if (moved && Date.now()-_locationWatchLastAt>=60000 && Number.isFinite(location.accuracy) && location.accuracy>=0 && location.accuracy<=1000 && Date.now()-location.observedAt<=120000 && location.observedAt<=Date.now()+5000) {
        _locationWatchLastAt=Date.now();
        await dashboardLocationSave({locationMode:'device',location},false);
      }
    } catch (e) { /* Invalid fixes never replace the last location. */ }
  }, error => { if (error && error.code===1) dashboardDeviceWatchStop(); }, {enableHighAccuracy:false,maximumAge:0,timeout:12000});
}
function dashboardLocationAutoRefresh(explicit = false) {
  if (APP_CONFIG.locationMode !== 'device' || document.hidden) return Promise.resolve(false);
  if (_locationAutoRefresh) return _locationAutoRefresh;
  _locationAutoRefresh = Promise.resolve().then(async () => {
    if (!explicit && navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state !== 'granted') return false;
      } catch (e) { /* Browsers without this permission query can still locate. */ }
    }
    if (APP_CONFIG.locationMode !== 'device' || document.hidden) return false;
    try { return await dashboardDeviceRefresh(false, true); }
    catch (e) { return false; } // Keep the last fix on denial, timeout or offline failure.
  }).finally(() => { _locationAutoRefresh = null; });
  return _locationAutoRefresh;
}
function dashboardLocationSettings() {
  const device = APP_CONFIG.locationMode === 'device';
  const ctl = document.createElement('div'); ctl.className = 'loc-ctl';
  const status = document.createElement('span'); status.className = 'muted'; status.setAttribute('role', 'status');
  const select = _settingsSelect([['manual', 'Manual location'], ['device', 'Device location']], device ? 'device' : 'manual', async value => {
    select.disabled = true;
    try {
      if (value === 'device') { status.textContent = 'Waiting for device location permission…'; await dashboardDeviceRefresh(true); }
      else { ++_locationRequest; await dashboardLocationSave({ locationMode: 'manual', location: APP_CONFIG.manualLocation || null }); }
    } catch (e) { status.textContent = e.code === 1 ? 'Location permission was denied. Allow it in your browser or choose Manual location.' : 'Device location could not be found. Try again or choose Manual location.'; }
    select.value = APP_CONFIG.locationMode === 'device' ? 'device' : 'manual'; select.disabled = false;
  });
  select.setAttribute('aria-label', 'Location source'); ctl.appendChild(select);
  if (!device) {
    ctl.appendChild(briefLocationPicker(APP_CONFIG.location, async location => {
      ++_locationRequest;
      await dashboardLocationSave({ locationMode: 'manual', location, manualLocation: location });
    }));
    if (APP_CONFIG.location) {
      const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'btn btn-ghost btn-sm'; clear.textContent = 'Clear';
      clear.onclick = async () => { ++_locationRequest; await dashboardLocationSave({ locationMode: 'manual', location: null, manualLocation: null }); };
      ctl.appendChild(clear);
    }
  } else {
    const label = document.createElement('span'); label.textContent = 'Near ' + (APP_CONFIG.location && APP_CONFIG.location.name || 'your last device location'); ctl.appendChild(label);
    const refresh = document.createElement('button'); refresh.type = 'button'; refresh.className = 'btn btn-ghost btn-sm'; refresh.textContent = 'Refresh location';
    refresh.onclick = async () => { refresh.disabled = true; try { await dashboardDeviceRefresh(false); } catch (e) { status.textContent = 'Unable to refresh. The last device location is still in use.'; } refresh.disabled = false; };
    ctl.appendChild(refresh);
  }
  ctl.appendChild(status);
  if (typeof dashboardLocationHistoryPanel === 'function') ctl.appendChild(dashboardLocationHistoryPanel());
  return _settingsRow('Your location', 'Choose one source for weather, opening titles and nearby art. Device mode checks on load, Refresh today and tab return, watches for changes while visible, and polls every 15 minutes. Local visit history keeps arrivals, confirmed presence, departure estimates and observation gaps. Coordinates are rounded to about 1 km; town names are approximate. Weather coordinates go to Open-Meteo.', ctl);
}
if (typeof window !== 'undefined') window.addEventListener('load', () => {
  dashboardLocationInitialRefresh();
  setInterval(() => dashboardLocationAutoRefresh(), 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) dashboardLocationAutoRefresh();
    else dashboardDeviceWatchStop();
  });
  window.addEventListener('pagehide', dashboardDeviceWatchStop);
}, { once: true });
