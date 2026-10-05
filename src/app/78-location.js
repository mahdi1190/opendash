/* One explicit source for weather and nearby illustrations. Device fixes are
 * requested only after choosing Device; manual coordinates never get replaced. */
let _locationRequest = 0;
function dashboardDevicePoint(pos) {
  const lat = Math.round(pos.coords.latitude * 100) / 100;
  const lon = Math.round(pos.coords.longitude * 100) / 100;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('The device returned an invalid location.');
  const near = typeof ukCountyNearest === 'function' ? ukCountyNearest(lat, lon) : null;
  return { name: near ? near.town : 'Current location', admin: near ? near.name : '', country: near ? 'United Kingdom' : '', countryCode: near ? 'GB' : '', lat, lon, timezone: browserTimeZone() };
}
async function dashboardLocationSave(patch, refreshUI = true) {
  if (!await settingsSaveConfig(patch, false)) return false;
  _bf.weather = null;
  briefLoadWeather(true);
  if (refreshUI && typeof render === 'function') render();
  else if (typeof renderShell === 'function') renderShell();
  return true;
}
async function dashboardDeviceRefresh(choose, quiet = false) {
  const request = ++_locationRequest;
  if (!navigator.geolocation) throw new Error('Device location is unavailable in this browser. Choose a manual location.');
  const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, maximumAge: 300000, timeout: 12000 }));
  if (request !== _locationRequest || (!choose && APP_CONFIG.locationMode !== 'device')) return false;
  const location = dashboardDevicePoint(pos);
  return dashboardLocationSave({ locationMode: 'device', location, ...(choose && APP_CONFIG.locationMode !== 'device' ? { manualLocation: APP_CONFIG.location || null } : {}) }, !quiet);
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
  return _settingsRow('Your location', 'Choose one source for weather, opening titles and nearby art. Device location needs browser permission, refreshes while OpenDash is open, and is rounded to about 1 km. Town names are approximate. Weather coordinates go to Open-Meteo.', ctl);
}
if (typeof window !== 'undefined') window.addEventListener('load', () => {
  const refresh = async () => {
    if (APP_CONFIG.locationMode !== 'device' || document.hidden || !navigator.permissions) return;
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'granted') await dashboardDeviceRefresh(false, true);
    } catch (e) { /* Retain the last device fix; the settings button permits a retry. */ }
  };
  refresh();
  setInterval(refresh, 15 * 60 * 1000);
}, { once: true });
