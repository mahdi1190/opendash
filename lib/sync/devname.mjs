// lib/sync/devname.mjs - a friendly default name for this computer in Settings > Sync
// ("MacBook Pro", "Lenovo Legion 7", "Windows laptop") instead of a host name
// such as "Mahdis-MacBook-Pro.local" or "DESKTOP-7H2K9LQ". The user can rename
// it at any time; a name they typed always wins.
//
// PLATFORM-AGNOSTIC: no node: imports. The Node host (lib/sync/node-host.mjs)
// passes what it learnt cheaply: the host name, macOS's ComputerName
// (`scutil --get ComputerName`), and on Windows the maker and model from the
// registry (HKLM\HARDWARE\DESCRIPTION\System\BIOS).
//
// The owner's name is never part of the default: "Mahdi's MacBook Pro" ->
// "MacBook Pro" (device names travel to the other devices, encrypted).

const MAC_MODELS = ['MacBook Pro', 'MacBook Air', 'MacBook', 'iMac Pro', 'iMac', 'Mac mini', 'Mac Studio', 'Mac Pro'];
const MAKERS = { lenovo: 'Lenovo', dell: 'Dell', hp: 'HP', hewlett: 'HP', asus: 'ASUS', asustek: 'ASUS', acer: 'Acer', microsoft: 'Microsoft', msi: 'MSI', 'micro-star': 'MSI', razer: 'Razer', samsung: 'Samsung', huawei: 'Huawei', lg: 'LG', gigabyte: 'Gigabyte', framework: 'Framework', toshiba: 'Toshiba', dynabook: 'Dynabook', medion: 'Medion', xiaomi: 'Xiaomi', apple: 'Apple' };
const JUNK = /^(to be filled|system product name|system manufacturer|default string|not applicable|none|o\.?e\.?m\.?|x+|\d+|[0-9a-f]{4,}_?[0-9a-z]*)$/i;
const clean = (s) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();

/** "Mahdi's MacBook Pro" -> "MacBook Pro"; "Mahdis-MacBook-Pro" -> "MacBook Pro"; anything else as it is. */
export function dropOwner(name) {
  let s = clean(name);
  // "Mahdi's MacBook Pro", "Mahdi’s iMac"
  const m = /^[^\s'’]{1,40}['’]s?\s+(.+)$/.exec(s);
  if (m) s = m[1];
  for (const model of MAC_MODELS) {
    const i = s.toLowerCase().indexOf(model.toLowerCase());
    if (i > 0 && /^[^\s]+s\s+$/i.test(s.slice(0, i))) return s.slice(i);       // "Mahdis MacBook Pro"
  }
  return s;
}

/** A Windows maker and model as people say it, or null. */
export function windowsModel({ manufacturer, product, family, version } = {}) {
  const ok = (x) => { const c = clean(x); return c && c.length <= 40 && !JUNK.test(c) ? c : null; };
  const mk = clean(manufacturer).toLowerCase().split(/[\s,.]+/)[0];
  const maker = MAKERS[mk] || null;
  // Lenovo puts the machine type in the product name ("21DE") and the model in the version ("ThinkPad X1 Carbon Gen 10").
  let model = maker === 'Lenovo' ? (ok(version) || ok(family)) : (ok(product) || ok(family));
  if (!model) return null;
  model = model.replace(/^[0-9A-Z]+_[0-9A-Z]+\s+/i, '');                 // HP: "103C_5335KV HP Spectre" -> "HP Spectre"
  if (/^\d|^[0-9A-Z]{4,6}$/.test(model) && !/\s/.test(model)) return null;   // a part number, not a name
  if (maker && !model.toLowerCase().includes(maker.toLowerCase())) model = `${maker} ${model}`;
  return model.slice(0, 40);
}

/**
 * The default name: {hostname, platform, computerName (macOS), bios (Windows: {manufacturer, product, family, version})}.
 */
export function friendlyDeviceName({ hostname = '', platform = '', computerName = '', bios = null } = {}) {
  const host = clean(hostname).replace(/\.(local|lan|home|localdomain)$/i, '');
  if (platform === 'darwin') {
    const n = dropOwner(computerName || host.replace(/-/g, ' '));
    if (n) return n.slice(0, 60);
    return 'Mac';
  }
  if (platform === 'win32') {
    const model = bios ? windowsModel(bios) : null;
    if (model) return model;
    if (/^LAPTOP-[0-9A-Z]{5,}$/i.test(host)) return 'Windows laptop';
    if (/^DESKTOP-[0-9A-Z]{5,}$/i.test(host)) return 'Windows desktop';
    if (!host) return 'Windows PC';
  }
  if (!host) return platform === 'linux' ? 'Linux computer' : 'This computer';
  // A name someone chose: tidy it ("MAHDI-PC" -> "Mahdi PC"), drop an owner's "'s".
  const words = host.split(/[-_]+/).filter(Boolean).map(w => (w.length > 3 && w === w.toUpperCase() ? w.charAt(0) + w.slice(1).toLowerCase() : w));
  return dropOwner(words.join(' ')).slice(0, 60) || host.slice(0, 60);
}
