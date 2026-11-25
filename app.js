/* Efecto Mariposa · Operaciones — app (v2.0.0) */
(function () {
'use strict';

const CFG = window.EM_CONFIG || {};
const VERSION = '2.2.0';
const ROOT = document.getElementById('root');

/* ============================ Utilidades ============================ */

const LS = {
  get(k, d) { try { const v = localStorage.getItem('em.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('em.' + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem('em.' + k); } catch (e) {} }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
const nowIso = () => new Date().toISOString();
const norm = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const $ = (sel, el) => (el || document).querySelector(sel);
const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
const pad = n => String(n).padStart(2, '0');
function hms(ms) { const n = Math.max(0, Math.floor(ms / 1000)); return pad(Math.floor(n / 3600)) + ':' + pad(Math.floor(n % 3600 / 60)) + ':' + pad(n % 60); }
function dur(ms) { const m = Math.round(Math.max(0, ms) / 60000); if (m < 60) return m + ' min'; return Math.floor(m / 60) + ' h ' + pad(m % 60) + ' min'; }
function madridDay(v) {
  const d = v ? new Date(v) : new Date();
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const g = k => p.find(x => x.type === k).value;
  return g('year') + '-' + g('month') + '-' + g('day');
}
function shiftDay(day, n) { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function weekStart(day) { return shiftDay(day, -((new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7)); }
function fDate(v, time) { if (!v) return '—'; return new Date(v).toLocaleString('es-ES', Object.assign({ timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit' }, time ? { hour: '2-digit', minute: '2-digit' } : { year: 'numeric' })); }
function fTime(v) { return v ? new Date(v).toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }) : '—'; }
function fRel(v) {
  if (!v) return '';
  const d = madridDay(v), t = madridDay();
  if (d === t) return 'Hoy ' + fTime(v);
  if (d === shiftDay(t, -1)) return 'Ayer ' + fTime(v);
  return fDate(v, true);
}
function localInput(v) { // ISO -> 'YYYY-MM-DDTHH:mm' en hora de Madrid
  if (!v) return '';
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(v));
  const g = k => p.find(x => x.type === k).value;
  return g('year') + '-' + g('month') + '-' + g('day') + 'T' + g('hour') + ':' + g('minute');
}
function fromLocal(v) { // 'YYYY-MM-DDTHH:mm' (Madrid) -> ISO
  if (!v) throw Error('Completa fecha y hora.');
  const guess = Date.parse(v + 'Z');
  for (const off of [60, 120, 0]) { const iso = new Date(guess - off * 60000).toISOString(); if (localInput(iso) === v) return iso; }
  throw Error('Hora no válida.');
}
function initials(n) { return String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
function greet() { const h = Number(new Date().toLocaleString('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23' })); return h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'; }

/* ============================ Iconos ============================ */

const ICONS = {
  home: '<path d="M5 12H3l9-9 9 9h-2"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/>',
  car: '<circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9m-6-6h15m-6 0V6"/>',
  rv: '<circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3V6a1 1 0 0 1 1-1h12l4 6v6h-1m-4 0H9"/><path d="M7 9h4v3H7zM15 11h5"/>',
  alert: '<path d="M12 9v4"/><path d="M10.36 3.59 2.26 17.13A1.91 1.91 0 0 0 3.89 20h16.22a1.91 1.91 0 0 0 1.64-2.87L13.64 3.59a1.91 1.91 0 0 0-3.28 0z"/><path d="M12 16h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  camera: '<path d="M5 7h1a2 2 0 0 0 2-2 1 1 0 0 1 1-1h6a1 1 0 0 1 1 1 2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2"/><circle cx="12" cy="13" r="3"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m21 21-6-6"/>',
  users: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85"/>',
  building: '<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>',
  file: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2zM9 13h6M9 17h6"/>',
  sliders: '<circle cx="6" cy="10" r="2"/><path d="M6 4v4M6 12v8"/><circle cx="12" cy="16" r="2"/><path d="M12 4v10M12 18v2"/><circle cx="18" cy="7" r="2"/><path d="M18 4v1M18 9v11"/>',
  logout: '<path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"/><path d="M9 12h12l-3-3m0 6 3-3"/>',
  login: '<path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"/><path d="M20 12H7l3-3m0 6-3-3"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
  hourglass: '<path d="M6.5 7h11M6.5 17h11M6 20v-2a6 6 0 1 1 12 0v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"/><path d="M6 4v2a6 6 0 1 0 12 0V4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  eye: '<path d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/><path d="M21 12c-2.4 4-5.4 6-9 6s-6.6-2-9-6c2.4-4 5.4-6 9-6s6.6 2 9 6"/>',
  eyeoff: '<path d="M10.59 10.59a2 2 0 0 0 2.83 2.83"/><path d="M16.68 16.67A8.7 8.7 0 0 1 12 18c-3.6 0-6.6-2-9-6 1.27-2.12 2.71-3.68 4.32-4.67m2.86-1.15A9 9 0 0 1 12 6c3.6 0 6.6 2 9 6-.67 1.11-1.38 2.07-2.14 2.87M3 3l18 18"/>',
  wifioff: '<path d="M12 18h.01M9.17 15.17a4 4 0 0 1 5.66 0M6.34 12.34a8 8 0 0 1 3.87-2.14m4.16.16a8 8 0 0 1 3.29 2M3.52 9.52a12 12 0 0 1 3.54-2.46m3.1-.92a12 12 0 0 1 10.33 3.37M3 3l18 18"/>',
  refresh: '<path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>',
  fan: '<path d="M12 12c-1.5-4-1-8 2-8 2.5 0 3 3 1 5"/><path d="M12 12c4 1.5 8 1 8-2 0-2.5-3-3-5-1"/><path d="M12 12c1.5 4 1 8-2 8-2.5 0-3-3-1-5"/><path d="M12 12c-4-1.5-8-1-8 2 0 2.5 3 3 5 1"/>',
  download: '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12"/>',
  note: '<path d="M8 9h8M8 13h6"/><path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5l-5 3v-3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"/>',
  tasks: '<path d="m3.5 5.5 1.5 1.5 2.5-2.5M3.5 11.5 5 13l2.5-2.5M3.5 17.5 5 19l2.5-2.5M11 6h9M11 12h9M11 18h9"/>',
  edit: '<path d="M7 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1"/><path d="M20.39 6.59a2.1 2.1 0 0 0-2.97-2.97L9 12v3h3z"/>',
  archive: '<path d="M3 4h18v4H3z"/><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m10.85 12.15 7.4-7.4M18 5l2 2M15 8l2 2"/>',
  phone: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 4h2M12 17v.01"/>',
  db: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6a8 3 0 0 0 16 0V6"/><path d="M4 12v6a8 3 0 0 0 16 0v-6"/>',
  pin: '<path d="M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/><path d="M17.66 16.66 13.41 20.9a2 2 0 0 1-2.83 0l-4.24-4.24a8 8 0 1 1 11.32 0z"/>',
  sign: '<path d="M3 17c3.33-3.33 5-6 5-8 0-3-1-3-2-3S3.97 7.09 4 9c.03 2.05 1.66 4.88 2.5 6 1.5 2 2.5 2.5 3.5 1l2-3c.33 2.67 1.33 4 3 4 .53 0 2.64-2 3-2 .52 0 1.52.67 3 2"/>',
  coffee: '<path d="M3 14c.83.64 2.08 1.02 3.5 1 1.42.02 2.67-.36 3.5-1 .83-.64 2.08-1.02 3.5-1 1.42-.02 2.67.36 3.5 1"/><path d="M8 3a2.4 2.4 0 0 0-1 2 2.4 2.4 0 0 0 1 2M12 3a2.4 2.4 0 0 0-1 2 2.4 2.4 0 0 0 1 2"/><path d="M3 10h14v5a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z"/><path d="M16.75 16.73a3 3 0 1 0 .25-5.56"/>',
  history: '<path d="M12 8v4l2 2"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/>',
  image: '<path d="M15 8h.01"/><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m3 16 5-5c.93-.9 2.07-.9 3 0l5 5"/><path d="m14 14 1-1c.93-.9 2.07-.9 3 0l3 3"/>',
  shield: '<path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3"/><path d="m9 12 2 2 4-4"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 11h16"/>',
  send: '<path d="M10 14 21 3"/><path d="m21 3-6.5 18a.55.55 0 0 1-1 0L10 14l-7-3.5a.55.55 0 0 1 0-1z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  chat: '<path d="m3 20 1.3-3.9A9 8 0 1 1 7.7 19L3 20"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="16" r="1"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/>',
  flask: '<path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3L14 9V3"/><path d="M7.5 14h9"/>',
  box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m12 12 8-4.5M12 12v9M12 12 4 7.5"/>',
  tool: '<path d="M7 10h3V7L6.5 3.5a6 6 0 0 1 8 8l6 6a2.12 2.12 0 0 1-3 3l-6-6a6 6 0 0 1-8-8z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>'
};
const icon = (n, c) => '<svg class="i ' + (c || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';

/* ============================ Estado ============================ */

const S = {
  token: LS.get('token', ''),
  data: LS.get('snap', null),
  queue: [],
  sending: false,
  syncing: false,
  lastSync: LS.get('lastSync', 0),
  online: navigator.onLine,
  error: '',
  thumbs: {},
  ui: LS.get('ui', { svcTab: 'open', q: '', client: '', incTab: 'open' }),
  installEvt: null
};
const device = LS.get('device', '') || (function () { const d = uid(); LS.set('device', d); return d; })();
const me = () => S.data && S.data.me;
const isAdmin = () => me() && me().rol === 'admin';
const isClient = () => !me() || me().rol === 'cliente';
const saveUi = () => LS.set('ui', S.ui);

/* ============================ Almacén local (IndexedDB) ============================ */

const IDB = (function () {
  let p = null;
  function db() {
    if (!p) p = new Promise((res, rej) => {
      const r = indexedDB.open('em-ops', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('queue', { keyPath: 'qid' }); r.result.createObjectStore('thumbs'); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return p;
  }
  function run(store, mode, fn) {
    return db().then(d => new Promise((res, rej) => {
      const t = d.transaction(store, mode), req = fn(t.objectStore(store));
      t.oncomplete = () => res(req && 'result' in req ? req.result : undefined);
      t.onerror = () => rej(t.error);
    }));
  }
  return {
    all: () => run('queue', 'readonly', s => s.getAll()).catch(() => []),
    put: o => run('queue', 'readwrite', s => s.put(o)).catch(() => {}),
    del: k => run('queue', 'readwrite', s => s.delete(k)).catch(() => {}),
    clear: () => run('queue', 'readwrite', s => s.clear()).catch(() => {}),
    tget: k => run('thumbs', 'readonly', s => s.get(k)).catch(() => null),
    tput: (k, v) => run('thumbs', 'readwrite', s => s.put(v, k)).catch(() => {})
  };
})();

/* ============================ Servidor ============================ */

async function api(action, data, timeout) {
  if (!CFG.API_URL) throw Object.assign(Error('La app aún no está conectada al servidor.'), { server: true });
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeout || 45000);
  let r;
  try {
    r = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, data: data || {}, token: S.token }), signal: ctrl.signal, redirect: 'follow' });
  } catch (e) { throw Object.assign(Error('Sin conexión'), { net: true }); }
  finally { clearTimeout(to); }
  let j;
  try { j = await r.json(); } catch (e) { throw Object.assign(Error('El servidor no responde bien. Reintentando…'), { net: true }); }
  if (!j.ok) {
    if (j.auth) { logout('Tu sesión ha caducado. Vuelve a entrar con tu PIN.'); throw Object.assign(Error('Sesión caducada'), { auth: true }); }
    throw Object.assign(Error(j.error || 'Error'), { server: true });
  }
  return j.data;
}

/* ============================ Datos derivados ============================ */

const D = {
  clients: () => (S.data && S.data.clients) || [],
  client: id => D.clients().find(c => c.id === id) || { nombre: 'Cliente', tipo: 'empresa', tipos: [] },
  services: () => (S.data && S.data.services) || [],
  service: id => D.services().find(s => s.id === id),
  times: sid => ((S.data && S.data.times) || []).filter(t => t.servicio === sid),
  incidents: sid => ((S.data && S.data.incidents) || []).filter(i => !sid || i.servicio === sid),
  photos: sid => ((S.data && S.data.photos) || []).filter(p => p.servicio === sid),
  userName: id => { if (id === 'MAQUINA') return 'Máquina'; const u = ((S.data && S.data.team) || []).find(x => x.id === id); return u ? u.nombre : (id === (me() || {}).id ? me().nombre : 'Usuario'); },
  open: () => D.services().filter(s => !s.cerrado),
  people: sid => { const o = {}; D.times(sid).forEach(t => { if (t.usuario !== 'MAQUINA') o[t.usuario] = 1; }); return Object.keys(o); },
  myOpen: () => ((S.data && S.data.times) || []).find(t => t.usuario === me().id && !t.fin),
  mode: (sid, uid) => { const t = D.times(sid).find(x => x.usuario === uid && !x.fin); return t ? t.tipo : ''; },
  sum: (times, f) => times.filter(f).reduce((n, t) => n + Math.max(0, (t.fin ? Date.parse(t.fin) : Date.now()) - Date.parse(t.inicio)), 0),
  progress: s => { let d = 0, n = 0; (s.grupos || []).forEach(g => g.tasks.forEach(t => { n++; if (t.state !== 'pending') d++; })); return [d, n]; },
  status: s => {
    if (s.cerrado) return 'Entregado';
    if (D.incidents(s.id).some(i => i.bloqueante && !i.resuelta)) return 'Incidencia';
    const open = D.times(s.id).filter(t => !t.fin);
    if (open.some(t => t.tipo === 'Trabajo')) return 'En limpieza';
    if (s.maquina && s.maquina.on) return s.maquina.label || 'Máquina en marcha';
    if (open.some(t => t.tipo === 'Espera')) return 'En espera';
    return 'En pausa';
  },
  mine: s => D.people(s.id).indexOf(me().id) >= 0 || s.creadoPor === me().id
};
function statusChip(st) {
  const c = { 'En limpieza': 'ok', 'En espera': 'warn', 'Incidencia': 'bad', 'En pausa': '', 'Entregado': 'info' }[st];
  return '<span class="chip ' + (c === undefined ? 'info' : c) + '">' + esc(st) + '</span>';
}
function modeLabel(m) { return { Trabajo: 'Trabajando', Espera: 'En espera', Pausa: 'En pausa' }[m] || 'Fuera'; }
function modeChip(m) { return '<span class="chip ' + ({ Trabajo: 'ok', Espera: 'warn', Pausa: '' }[m] || '') + '">' + modeLabel(m) + '</span>'; }

/* ============================ Cambios locales y cola ============================ */

function applyLocal(q) {
  const d = S.data; if (!d) return;
  const at = q.at, u = me().id;
  if (q.kind === 'photo') {
    if (!d.photos.some(p => p.id === q.data.photoId)) d.photos.push({ id: q.data.photoId, servicio: q.data.id, incidencia: q.data.incidentId || '', tipo: q.data.kind, visible: q.data.visible, por: u, fecha: at, local: true });
    return;
  }
  if (q.kind === 'photoVisible') { const p = d.photos.find(x => x.id === q.data.photoId); if (p) p.visible = q.data.visible; return; }
  const s = d.services.find(x => x.id === q.data.id); if (!s) return;
  const x = q.data.d || {};
  const closeMine = () => d.times.forEach(t => { if (t.usuario === u && !t.fin) t.fin = at; });
  switch (q.data.op) {
    case 'tasks': x.items.forEach(a => { const t = s.grupos[a.g] && s.grupos[a.g].tasks[a.t]; if (t) Object.assign(t, { state: a.state, by: u, at: at }); }); break;
    case 'phase': s.fases = s.fases || {}; s.fases[u] = s.grupos[x.g].name; break;
    case 'clock': closeMine(); d.times.push({ id: 'l-' + q.qid, servicio: s.id, usuario: u, tipo: x.kind, inicio: at, fin: '', motivo: x.reason || '' }); s.fases = s.fases || {}; if (!s.fases[u]) s.fases[u] = 'Recepción'; break;
    case 'leave': closeMine(); break;
    case 'machine':
      if (x.on) s.maquina = { on: true, label: x.label, inicio: at, por: u };
      else if (s.maquina) { d.times.push({ id: 'l-' + q.qid, servicio: s.id, usuario: 'MAQUINA', tipo: s.maquina.label, inicio: s.maquina.inicio, fin: at }); s.maquina = null; }
      break;
    case 'note': s.notas = s.notas || []; if (!s.notas.some(n => n.id === x.noteId)) s.notas.push({ id: x.noteId, text: x.text, by: u, at: at }); break;
    case 'incident': if (!d.incidents.some(i => i.id === x.incidentId)) d.incidents.push({ id: x.incidentId, servicio: s.id, tipo: x.type, texto: x.text, bloqueante: !!x.blocking, por: u, fecha: at, resuelta: null, visible: x.visible !== false }); break;
    case 'incidentVisible': { const i = d.incidents.find(v => v.id === x.incidentId); if (i) i.visible = !!x.visible; break; }
    case 'resolve': { const i = d.incidents.find(v => v.id === x.incidentId); if (i) i.resuelta = { text: x.text, by: u, at: at }; break; }
  }
  d.services.forEach(v => { if (!v.cerrado) v.estado = D.status(v); });
}

async function enqueue(kind, data) {
  const q = { qid: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), kind: kind, data: data, at: nowIso(), tries: 0 };
  if (kind === 'op') { data.d = data.d || {}; data.d.requestId = q.qid; }
  S.queue.push(q);
  applyLocal(q);
  persistSnap();
  await IDB.put(q);
  render();
  flushSoon();
}
let flushTimer = null;
function flushSoon(ms) { clearTimeout(flushTimer); flushTimer = setTimeout(flush, ms == null ? 150 : ms); }

async function flush() {
  if (S.sending || !S.queue.length || !S.token) { updateStatus(); return; }
  S.sending = true; updateStatus();
  let changed = false;
  try {
    while (S.queue.length) {
      const q = S.queue[0];
      try {
        if (q.kind === 'op') await api('op', q.data);
        else if (q.kind === 'photo') await api('uploadPhoto', q.data, 120000);
        else if (q.kind === 'photoVisible') await api('photoVisible', q.data);
        S.error = '';
      } catch (e) {
        if (e.net) { S.error = ''; S.online = false; break; }
        if (e.auth) break;
        // El servidor ha rechazado el cambio: se descarta y se avisa.
        console.warn('Cambio rechazado por el servidor', q.kind, q.data && q.data.op, e.message);
        toast(e.message, true);
      }
      S.queue.shift();
      await IDB.del(q.qid);
      if (q.kind === 'photo') delete S.thumbs['local:' + q.data.photoId];
      changed = true;
    }
  } finally {
    S.sending = false;
    if (S.queue.length) flushSoon(8000);
    if (changed && !S.queue.length) sync();
    updateStatus();
  }
}

function persistSnap() { if (S.data) LS.set('snap', S.data); }

async function sync(manual) {
  if (!S.token || S.syncing) return;
  if (S.queue.length && !manual) { flushSoon(); return; }
  S.syncing = true; updateStatus();
  try {
    const data = await api('sync', {});
    S.data = data;
    S.queue.forEach(applyLocal);
    S.lastSync = Date.now(); LS.set('lastSync', S.lastSync);
    if (!isClient() && (!S.invAt || Date.now() - S.invAt > 300000)) { S.invAt = Date.now(); loadInv(); }
    S.online = true; S.error = '';
    persistSnap();
    render(true);
  } catch (e) {
    if (e.net) S.online = false;
    else if (!e.auth) { S.error = e.message; if (manual) toast(e.message, true); }
  } finally { S.syncing = false; updateStatus(); }
}

/* ============================ Interfaz base ============================ */

let toastTimer = null;
function toast(msg, err) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, err ? 5000 : 2600);
}

function sheet(title, body, mount, opts) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="grab"></div><div class="sh-head"><h2>' + esc(title) + '</h2><button class="iconbtn" data-x aria-label="Cerrar">' + icon('x') + '</button></div><div class="sh-body">' + body + '</div></div>';
  const close = () => { scrim.remove(); document.body.style.overflow = ''; };
  scrim.addEventListener('click', e => { if (e.target === scrim && !(opts && opts.sticky)) close(); });
  scrim.querySelector('[data-x]').addEventListener('click', close);
  document.body.appendChild(scrim);
  document.body.style.overflow = 'hidden';
  if (mount) mount(scrim.querySelector('.sheet'), close);
  return close;
}
function confirmSheet(title, text, okLabel, danger) {
  return new Promise(res => {
    let done = false;
    const close = sheet(title, '<p class="muted">' + esc(text) + '</p><div class="actions"><button class="btn ghost" data-no>Cancelar</button><button class="btn ' + (danger ? 'danger' : '') + '" data-yes>' + esc(okLabel || 'Aceptar') + '</button></div>', (el, c) => {
      el.querySelector('[data-no]').onclick = () => { done = true; c(); res(false); };
      el.querySelector('[data-yes]').onclick = () => { done = true; c(); res(true); };
    });
    void close; void done;
  });
}
function promptSheet(title, label, opts) {
  opts = opts || {};
  return new Promise(res => {
    sheet(title, (opts.chips ? '<div class="chips" style="margin-bottom:6px">' + opts.chips.map(c => '<button type="button" data-c="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' : '') +
      '<label class="f">' + esc(label) + '</label><textarea class="in" data-t placeholder="' + esc(opts.placeholder || '') + '"></textarea><div class="actions"><button class="btn ghost" data-no>Cancelar</button><button class="btn" data-yes>' + esc(opts.ok || 'Guardar') + '</button></div>', (el, close) => {
      const ta = el.querySelector('[data-t]');
      $$('[data-c]', el).forEach(b => b.onclick = () => { ta.value = b.dataset.c; $$('[data-c]', el).forEach(x => x.classList.toggle('on', x === b)); });
      el.querySelector('[data-no]').onclick = () => { close(); res(null); };
      el.querySelector('[data-yes]').onclick = () => { const v = ta.value.trim(); if (!v) { ta.focus(); return; } close(); res(v); };
      setTimeout(() => { if (!opts.chips) ta.focus(); }, 50);
    });
  });
}

async function command(fn, okMsg) {
  if (!navigator.onLine) { toast('Necesitas conexión para esta acción.', true); return false; }
  const busy = toast.bind(null, 'Guardando…'); busy();
  try { await fn(); if (okMsg) toast(okMsg); return true; }
  catch (e) { if (!e.auth) toast(e.net ? 'Sin conexión. Inténtalo de nuevo.' : e.message, true); return false; }
}

function updateStatus() {
  const el = $('#syncState'); if (!el) return;
  let dot = '', txt = '';
  if (!navigator.onLine || !S.online) { dot = 'off'; txt = 'Sin conexión' + (S.queue.length ? ' · ' + S.queue.length + ' pendientes' : ''); }
  else if (S.sending || S.queue.length) { dot = 'busy'; txt = 'Guardando' + (S.queue.length ? ' ' + S.queue.length : '') + '…'; }
  else if (S.error) { dot = 'err'; txt = 'Error de sincronización'; }
  else if (S.syncing) { dot = 'busy'; txt = 'Actualizando…'; }
  else { txt = 'Todo guardado'; }
  el.innerHTML = '<i class="dot ' + dot + '"></i>' + esc(txt);
}

/* ============================ Navegación ============================ */

function route() { const h = location.hash.replace(/^#\/?/, ''); const p = h.split('/'); return { name: p[0] || 'inicio', id: decodeURIComponent(p[1] || ''), sub: p[2] || '' }; }
function go(path) { if (location.hash !== '#/' + path) location.hash = '#/' + path; else render(); }
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

const TABS_ADMIN = [['inicio', 'home', 'Inicio'], ['servicios', 'rv', 'Servicios'], ['incidencias', 'alert', 'Incidencias'], ['jornada', 'clock', 'Jornada'], ['mas', 'grid', 'Más']];
const SIDE_ADMIN = [['inicio', 'home', 'Inicio'], ['servicios', 'rv', 'Servicios'], ['incidencias', 'alert', 'Incidencias'], ['jornada', 'clock', 'Mi jornada'], ['almacen', 'box', 'Almacén'], 'Dirección', ['horario', 'calendar', 'Control horario'], ['buscar', 'search', 'Buscar e historial'], ['albaranes', 'file', 'Albaranes'], ['equipo', 'users', 'Equipo'], ['clientes', 'building', 'Clientes'], 'Cuenta', ['ajustes', 'sliders', 'Ajustes'], ['sistema', 'shield', 'Sistema']];
const SIDE_WORKER = [['inicio', 'home', 'Inicio'], ['servicios', 'rv', 'Servicios'], ['incidencias', 'alert', 'Incidencias'], ['jornada', 'clock', 'Mi jornada'], ['almacen', 'box', 'Almacén'], 'Más', ['buscar', 'history', 'Mi historial'], ['albaranes', 'file', 'Albaranes'], ['ajustes', 'sliders', 'Ajustes']];
const SIDE_CLIENT = [['inicio', 'rv', 'Mis vehículos'], ['avisos', 'alert', 'Avisos'], ['albaranes', 'file', 'Albaranes'], 'Cuenta', ['buscar', 'history', 'Historial'], ['cuenta', 'user', 'Mi cuenta']];
const TABS_CLIENT = [['inicio', 'rv', 'Vehículos'], ['avisos', 'alert', 'Avisos'], ['albaranes', 'file', 'Albaranes'], ['cuenta', 'user', 'Cuenta']];

function openIncidents() { return D.incidents().filter(i => !i.resuelta && D.service(i.servicio) && !D.service(i.servicio).cerrado); }

/* ============================ Pantalla de acceso ============================ */

function renderLogin(msg) {
  document.body.style.background = '#fff';
  let pin = '';
  ROOT.innerHTML = '<div class="login"><div class="brand"><img src="icons/logo-header.png" alt=""><h1>Efecto Mariposa</h1><p>Operaciones</p></div>' +
    '<div class="pinbox"><p class="muted small" style="text-align:center">Introduce tu PIN personal (6 a 8 números)</p><div class="pin-dots" id="dots"></div>' +
    '<div class="keypad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => '<button data-k="' + n + '">' + n + '</button>').join('') +
    '<button class="k-del" data-k="del" aria-label="Borrar">' + icon('back') + '</button><button data-k="0">0</button><button class="k-ok" data-k="ok">Entrar</button></div>' +
    '<p class="msg" id="lmsg">' + esc(msg || '') + '</p></div></div>';
  const dots = $('#dots'), lmsg = $('#lmsg');
  const draw = () => { const n = 8; dots.innerHTML = Array.from({ length: n }, (_, i) => '<i class="' + (i < pin.length ? 'on' : '') + '"></i>').join(''); };
  draw();
  async function submit() {
    if (pin.length < 6) { lmsg.textContent = 'El PIN tiene entre 6 y 8 números.'; return; }
    lmsg.style.color = 'var(--muted)'; lmsg.textContent = 'Comprobando…';
    try {
      const r = await api('login', { pin: pin, device: device });
      S.token = r.token; LS.set('token', S.token);
      lmsg.textContent = 'Cargando tus datos…';
      const data = await api('sync', {});
      S.data = data; persistSnap(); S.lastSync = Date.now();
      document.body.style.background = '';
      location.hash = '#/inicio';
      render(true);
    } catch (e) {
      pin = ''; draw();
      lmsg.style.color = ''; lmsg.textContent = e.net ? 'Sin conexión. Comprueba tu cobertura.' : e.message;
    }
  }
  ROOT.querySelector('.keypad').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const k = b.dataset.k;
    if (k === 'del') pin = pin.slice(0, -1);
    else if (k === 'ok') return submit();
    else if (pin.length < 8) pin += k;
    lmsg.textContent = ''; draw();
  });
  document.onkeydown = e => {
    if (S.token) { document.onkeydown = null; return; }
    if (/^\d$/.test(e.key) && pin.length < 8) { pin += e.key; draw(); }
    else if (e.key === 'Backspace') { pin = pin.slice(0, -1); draw(); }
    else if (e.key === 'Enter') submit();
  };
}

function logout(msg) {
  S.token = ''; S.data = null; S.queue = [];
  LS.del('token'); LS.del('snap');
  IDB.clear();
  renderLogin(typeof msg === 'string' ? msg : '');
}

/* ============================ Estructura principal ============================ */

function shell() {
  const r = route(), m = me();
  const side = isClient() ? SIDE_CLIENT : (isAdmin() ? SIDE_ADMIN : SIDE_WORKER);
  const inc = isClient() ? D.incidents().filter(i => !i.resuelta).length : openIncidents().length;
  const tabs = isClient() ? TABS_CLIENT : isAdmin() ? TABS_ADMIN : [['inicio', 'home', 'Inicio'], ['servicios', 'rv', 'Servicios'], ['incidencias', 'alert', 'Incidencias'], ['jornada', 'clock', 'Jornada'], ['mas', 'grid', 'Más']];
  const active = name => {
    const map = isClient() ? { servicio: 'inicio', historico: 'buscar' } : { servicio: 'servicios', nuevo: 'servicios', historico: 'buscar' };
    return (map[r.name] || r.name) === name;
  };
  const activeTab = name => active(name) || (name === 'mas' && ['almacen', 'horario', 'buscar', 'albaranes', 'equipo', 'clientes', 'ajustes', 'sistema', 'historico'].indexOf(r.name) >= 0);
  return '<div class="app">' +
    '<aside class="side"><div class="brand"><img src="icons/logo-header.png" alt=""><div><b>Efecto Mariposa</b><small>Operaciones</small></div></div>' +
    side.map(x => Array.isArray(x) ? '<a href="#/' + x[0] + '" class="' + (active(x[0]) ? 'on' : '') + '">' + icon(x[1]) + x[2] + ((x[0] === 'incidencias' || x[0] === 'avisos') && inc ? '<span class="badge">' + inc + '</span>' : '') + '</a>' : '<div class="grp">' + x + '</div>').join('') +
    '<div class="me"><span class="av lg">' + esc(initials(m.nombre)) + '</span><div class="grow"><b class="ellipsis" style="display:block;font-size:13.5px">' + esc(m.nombre) + '</b><span class="tiny muted">' + (isAdmin() ? 'Dirección' : isClient() ? 'Cliente' : 'Equipo') + '</span></div><button class="iconbtn" data-act="logout" aria-label="Salir">' + icon('logout') + '</button></div></aside>' +
    '<div class="grow" style="min-width:0"><header class="topbar" id="topbar"></header><main id="main"></main></div>' +
    '<nav class="nav">' + tabs.map(t => '<a href="#/' + t[0] + '" class="' + (activeTab(t[0]) ? 'on' : '') + '">' + icon(t[1], 'l') + '<span>' + t[2] + '</span>' + ((t[0] === 'incidencias' || t[0] === 'avisos') && inc ? '<span class="badge">' + inc + '</span>' : '') + '</a>').join('') + '</nav>' +
    '</div>';
}

function topbar(title, opts) {
  opts = opts || {};
  return (opts.back ? '<button class="back" data-act="back" aria-label="Volver">' + icon('back') + '</button>' : '<img class="logo" src="icons/logo-header.png" alt="">') +
    '<div class="title"><b>' + esc(title) + '</b><small id="syncState"></small></div>' + (opts.right || '') +
    '<button class="iconbtn" data-act="sync" aria-label="Actualizar">' + icon('refresh') + '</button>';
}

let lastRendered = '';
function render(fromSync) {
  if (!S.token) return renderLogin();
  if (!S.data) { ROOT.innerHTML = ''; return; }
  const r = route();
  // No repintar mientras se escribe en un formulario si la actualización viene del servidor.
  const ae = document.activeElement;
  if (fromSync && ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ae.closest('main') && lastRendered === location.hash) { updateStatus(); return; }
  if (fromSync && $('.scrim')) { updateStatus(); return; }
  if (fromSync && ['nuevo', 'ajustes', 'cuenta', 'horario', 'albaranes', 'almacen', 'buscar', 'equipo', 'clientes', 'sistema', 'jornada'].indexOf(r.name) >= 0 && lastRendered === location.hash) { updateStatus(); return; }
  const y = lastRendered === location.hash ? window.scrollY : 0;
  ROOT.innerHTML = shell();
  const view = isClient() ? (CVIEWS[r.name] || CVIEWS.inicio) : (VIEWS[r.name] || VIEWS.inicio);
  const out = view(r) || {};
  $('#topbar').innerHTML = topbar(out.title || 'Efecto Mariposa', out);
  $('#main').innerHTML = out.html || '';
  if (out.mount) out.mount($('#main'));
  updateStatus();
  tick();
  if (lastRendered === location.hash) window.scrollTo(0, y);
  lastRendered = location.hash;
}

/* Acciones con data-act (delegación) */
const ACT = {
  back: () => { if (history.length > 1) history.back(); else go('inicio'); },
  sync: () => { if (S.queue.length) flush(); else sync(true); },
  logout: async () => { if (S.queue.length && !(await confirmSheet('Cambios pendientes', 'Hay ' + S.queue.length + ' cambios sin enviar. Si sales ahora se perderán.', 'Salir igualmente', true))) return; logout(); },
  go: el => go(el.dataset.to)
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (t && ACT[t.dataset.act]) { e.preventDefault(); ACT[t.dataset.act](t, e); }
});

/* ============================ Tarjetas ============================ */

function svcCard(s) {
  const c = D.client(s.cliente), p = D.progress(s), st = D.status(s);
  const people = D.people(s.id);
  const avs = people.slice(0, 4).map(id => '<span class="av ' + (D.mode(s.id, id) === 'Trabajo' ? 'on' : '') + '" title="' + esc(D.userName(id)) + '">' + esc(initials(D.userName(id))) + '</span>').join('');
  const work = D.sum(D.times(s.id), t => t.tipo === 'Trabajo');
  return '<div class="card svc" data-act="go" data-to="servicio/' + esc(s.id) + '">' +
    '<div class="row between"><div class="grow"><div class="plate ellipsis">' + esc(s.matricula || s.chasis) + '</div><div class="meta ellipsis">' + esc(c.nombre) + ' · ' + esc(s.tipo) + '</div></div>' + statusChip(st) + '</div>' +
    (s.cerrado ? '' : '<div class="progress"><i style="width:' + (p[1] ? Math.round(100 * p[0] / p[1]) : 0) + '%"></i></div>') +
    '<div class="foot"><div class="row" style="gap:8px"><div class="avatars">' + avs + '</div>' + (s.cerrado ? '<span>Entregado ' + esc(fRel(s.cerrado)).replace(/^(Hoy|Ayer)/, m => m.toLowerCase()) + '</span>' : '<span>' + p[0] + '/' + p[1] + ' tareas</span>') + '</div>' +
    '<span class="row" style="gap:4px">' + icon('clock', 's') + '<span data-sum="' + esc(s.id) + '|Trabajo">' + hms(work) + '</span></span></div></div>';
}

function empty(ic, title, text, btn) {
  return '<div class="card empty">' + icon(ic) + '<p style="font-weight:600;color:var(--ink)">' + esc(title) + '</p>' + (text ? '<p class="small" style="margin-top:3px">' + esc(text) + '</p>' : '') + (btn || '') + '</div>';
}

/* ============================ Vistas ============================ */

const VIEWS = {};

/* ---------- Inicio ---------- */
VIEWS.inicio = function () {
  const m = me(), wk = weekStart(madridDay());
  const open = D.open();
  const mine = open.filter(D.mine), others = open.filter(s => !D.mine(s));
  const working = {};
  (S.data.times || []).forEach(t => { if (!t.fin && t.tipo === 'Trabajo' && t.usuario !== 'MAQUINA') working[t.usuario] = 1; });
  const delivered = D.services().filter(s => s.cerrado && madridDay(s.cerrado) >= wk && (isAdmin() || D.mine(s))).length;
  const incN = openIncidents().length;
  const kpis = isAdmin()
    ? [['En curso', open.length, 'rv', 'servicios'], ['Trabajando ahora', Object.keys(working).length, 'users', 'servicios'], ['Entregados (semana)', delivered, 'check', 'servicios/cerrados'], ['Incidencias abiertas', incN, 'alert', 'incidencias']]
    : [['Mis vehículos', mine.length, 'rv', 'servicios'], ['Entregados (semana)', delivered, 'check', 'servicios/cerrados'], ['Incidencias abiertas', incN, 'alert', 'incidencias'], ['En curso en tu centro', open.length, 'building', 'servicios']];
  const install = installBanner();
  const html =
    '<div class="row between" style="margin:2px 2px 12px"><div><h1>' + greet() + ', ' + esc(m.nombre.split(' ')[0]) + '</h1><p class="muted small">' + new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long' }) + '</p></div></div>' +
    install +
    '<div id="workChip"></div>' +
    (S.inv && S.inv.articulos.some(a => a.compraEstado || a.bajo) ? '<div class="banner warn" style="margin-top:10px">' + icon('box') + '<span class="grow">Almacén: ' + S.inv.articulos.filter(a => a.bajo).length + ' bajo mínimo · ' + S.inv.articulos.filter(a => a.compraEstado).length + ' en la lista de compra</span><button class="btn sm" data-act="go" data-to="almacen">Ver</button></div>' : '') +
    '<div class="kpis" style="margin-top:10px">' + kpis.map(k => '<button class="kpi ' + (k[2] === 'alert' && k[1] ? 'alert' : '') + '" data-act="go" data-to="' + k[3] + '"><small>' + icon(k[2], 's') + esc(k[0]) + '</small><b>' + k[1] + '</b></button>').join('') + '</div>' +
    '<button class="btn green wide" style="margin-top:12px" data-act="go" data-to="nuevo">' + icon('plus') + 'Nuevo servicio</button>' +
    (isAdmin()
      ? '<div class="sec"><h2>En curso</h2><a class="link" href="#/servicios">Ver todo</a></div>' + (open.length ? '<div class="cols">' + open.sort(byUpdated).map(svcCard).join('') + '</div>' : empty('rv', 'No hay vehículos en curso', 'Cuando alguien registre un servicio aparecerá aquí.'))
      : '<div class="sec"><h2>Mis vehículos</h2></div>' + (mine.length ? '<div class="cols">' + mine.sort(byUpdated).map(svcCard).join('') + '</div>' : empty('rv', 'Ningún vehículo en marcha', 'Registra uno nuevo o únete a uno en curso.')) +
        (others.length ? '<div class="sec"><h2>Otros vehículos en curso</h2></div><div class="cols">' + others.sort(byUpdated).map(svcCard).join('') + '</div>' : ''));
  return { title: 'Inicio', html: html, mount: () => { workChip(); mountInstall(); } };
};
const byUpdated = (a, b) => Date.parse(b.actualizado || b.creado) - Date.parse(a.actualizado || a.creado);

let workCache = LS.get('work', null);
async function workChip() {
  const el = $('#workChip'); if (!el) return;
  const draw = () => {
    const j = workCache && workCache.current;
    if (!j) { el.innerHTML = '<div class="banner"><span>' + icon('login') + '</span><span class="grow">No has fichado la entrada hoy.</span><button class="btn sm green" data-act="go" data-to="jornada">Fichar</button></div>'; return; }
    const br = (j.descansos || []).some(b => !b.end);
    el.innerHTML = '<div class="banner" style="background:var(--ok-bg);color:var(--ok)">' + icon(br ? 'coffee' : 'clock') + '<span class="grow">' + (br ? 'En descanso' : 'Jornada en curso') + ' · desde ' + fTime(j.inicio) + '</span><b class="timer" data-work="1">' + hms(workMs(j)) + '</b></div>';
  };
  draw();
  try {
    const today = madridDay();
    workCache = await api('workSnapshot', { from: weekStart(today), to: shiftDay(weekStart(today), 6) });
    LS.set('work', workCache);
    if ($('#workChip')) draw();
  } catch (e) {}
}
function workMs(j, lo, hi) {
  lo = lo == null ? -Infinity : lo; hi = hi == null ? Infinity : hi;
  const ov = (a, b) => Math.max(0, Math.min(b ? Date.parse(b) : Date.now(), hi) - Math.max(Date.parse(a), lo));
  return Math.max(0, ov(j.inicio, j.fin) - (j.descansos || []).reduce((n, b) => n + ov(b.start, b.end), 0));
}

/* ---------- Instalar app ---------- */
function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
function installBanner() {
  if (isStandalone() || LS.get('installDismissed', false)) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!S.installEvt && !ios) return '';
  return '<div class="banner" id="installBanner" style="margin-bottom:10px">' + icon('phone') + '<span class="grow">' + (ios ? 'Instala la app: pulsa <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.' : 'Instala la app en este dispositivo para abrirla como una aplicación.') + '</span>' +
    (ios ? '' : '<button class="btn sm" id="installBtn">Instalar</button>') + '<button class="iconbtn" id="installX" aria-label="Cerrar">' + icon('x', 's') + '</button></div>';
}
function mountInstall() {
  const b = $('#installBtn'), x = $('#installX');
  if (b) b.onclick = async () => { if (!S.installEvt) return; S.installEvt.prompt(); await S.installEvt.userChoice; S.installEvt = null; render(); };
  if (x) x.onclick = () => { LS.set('installDismissed', true); $('#installBanner').remove(); };
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; if (route().name === 'inicio' && S.token) render(); });

/* ---------- Servicios ---------- */
VIEWS.servicios = function (r) {
  if (r.id === 'cerrados') { S.ui.svcTab = 'closed'; saveUi(); history.replaceState(null, '', '#/servicios'); }
  const tab = S.ui.svcTab, q = norm(S.ui.q), cl = S.ui.client;
  let list = D.services().filter(s => (tab === 'open' ? !s.cerrado : !!s.cerrado));
  if (!isAdmin() && tab === 'closed') list = list.filter(D.mine);
  if (q) list = list.filter(s => norm(s.matricula).indexOf(q) >= 0 || norm(s.chasis).indexOf(q) >= 0 || norm(D.client(s.cliente).nombre).indexOf(q) >= 0);
  if (cl) list = list.filter(s => s.cliente === cl);
  list.sort(tab === 'open' ? byUpdated : (a, b) => Date.parse(b.cerrado) - Date.parse(a.cerrado));
  const usedClients = Array.from(new Set(D.services().map(s => s.cliente))).map(D.client).filter(c => c.id);
  const html =
    '<div class="seg" style="margin-bottom:10px"><button class="' + (tab === 'open' ? 'on' : '') + '" data-tab="open">En curso · ' + D.open().length + '</button><button class="' + (tab === 'closed' ? 'on' : '') + '" data-tab="closed">Entregados</button></div>' +
    '<div class="row" style="gap:8px"><div class="search grow">' + icon('search', 's') + '<input class="in" id="q" placeholder="Buscar matrícula o cliente" value="' + esc(S.ui.q) + '" autocomplete="off"></div><button class="btn green hide-m" data-act="go" data-to="nuevo">' + icon('plus') + 'Nuevo</button></div>' +
    (usedClients.length > 1 ? '<div class="chips" style="margin-top:10px"><button class="' + (!cl ? 'on' : '') + '" data-cl="">Todos</button>' + usedClients.map(c => '<button class="' + (cl === c.id ? 'on' : '') + '" data-cl="' + esc(c.id) + '">' + esc(c.tipo === 'particular' ? c.nombre : c.nombre) + '</button>').join('') + '</div>' : '') +
    '<div style="margin-top:12px" id="svcList">' + (list.length ? '<div class="cols">' + list.map(svcCard).join('') + '</div>' : empty('rv', tab === 'open' ? 'No hay vehículos en curso' : 'Sin entregas recientes', tab === 'open' ? '' : 'Las entregas antiguas están en Buscar e historial.')) + '</div>' +
    (tab === 'closed' ? '<p class="small muted" style="text-align:center;margin-top:14px">Se muestran los últimos ' + (isAdmin() ? 45 : 30) + ' días. <a href="#/buscar">Buscar en todo el historial</a></p>' : '') +
    '<button class="btn green wide hide-d" style="margin-top:14px" data-act="go" data-to="nuevo">' + icon('plus') + 'Nuevo servicio</button>';
  return {
    title: 'Servicios', html: html, mount: el => {
      $$('[data-tab]', el).forEach(b => b.onclick = () => { S.ui.svcTab = b.dataset.tab; saveUi(); render(); });
      $$('[data-cl]', el).forEach(b => b.onclick = () => { S.ui.client = b.dataset.cl; saveUi(); render(); });
      const qi = $('#q');
      let t = null;
      qi.oninput = () => { clearTimeout(t); t = setTimeout(() => { S.ui.q = qi.value; saveUi(); const pos = qi.selectionStart; render(); const n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); }, 250); };
    }
  };
};

/* ---------- Nuevo servicio ---------- */
const VEHICULOS = ['Autocaravana', 'Camper', 'Caravana', 'Furgoneta', 'Turismo', 'Otro'];
VIEWS.nuevo = function () {
  const clients = D.clients().filter(c => c.tipo === 'empresa' && c.activo !== false);
  const canPart = isAdmin() || (me().acceso || []).indexOf('PARTICULARES') >= 0;
  const st = S.newForm || (S.newForm = { cliente: clients[0] ? clients[0].id : (canPart ? 'NEW' : ''), tipo: '', vehiculo: 'Autocaravana', suciedad: 'Normal', extras: [], exterior: false });
  const recentPart = D.clients().filter(c => c.tipo === 'particular').slice(-6).reverse();
  const html = '<div class="card">' +
    '<label class="f" style="margin-top:0">Cliente</label><div class="chips" id="cliChips">' +
    clients.map(c => '<button type="button" data-cli="' + esc(c.id) + '" class="' + (st.cliente === c.id ? 'on' : '') + '">' + esc(c.nombre) + '</button>').join('') +
    recentPart.map(c => '<button type="button" data-cli="' + esc(c.id) + '" class="' + (st.cliente === c.id ? 'on' : '') + '">' + icon('user', 's') + ' ' + esc(c.nombre) + '</button>').join('') +
    (canPart ? '<button type="button" data-cli="NEW" class="' + (st.cliente === 'NEW' ? 'on' : '') + '">' + icon('plus', 's') + ' Particular nuevo</button>' : '') + '</div>' +
    '<div id="newCli"></div>' +
    '<label class="f">Tipo de servicio</label><div class="chips" id="tipoChips"></div>' +
    '<div class="two"><div><label class="f">Matrícula</label><input class="in plate" id="mat" autocomplete="off" placeholder="0000 ABC"></div><div><label class="f">Nº chasis (si no hay)</label><input class="in plate" id="cha" autocomplete="off" style="font-size:15px"></div></div>' +
    '<div id="dupBox"></div>' +
    '<label class="f">Vehículo</label><div class="chips" id="vehChips">' + VEHICULOS.map(v => '<button type="button" data-veh="' + v + '" class="' + (st.vehiculo === v ? 'on' : '') + '">' + v + '</button>').join('') + '</div>' +
    '<div class="two"><div><label class="f">Marca</label><input class="in" id="marca" autocomplete="off"></div><div><label class="f">Modelo</label><input class="in" id="modelo" autocomplete="off"></div></div>' +
    '<label class="f">Estado inicial</label><div class="seg" id="dirtSeg">' + ['Normal', 'Elevado', 'Intensivo'].map(v => '<button type="button" data-dirt="' + v + '" class="' + (st.suciedad === v ? 'on' : '') + '">' + v + '</button>').join('') + '</div>' +
    '<div id="optBox"></div>' +
    '<label class="f">Alcance u observaciones</label><textarea class="in" id="alcance" placeholder="Lo acordado con el cliente, accesos, avisos…"></textarea>' +
    '<button class="btn green wide" style="margin-top:16px" id="createBtn">' + icon('play') + 'Registrar y empezar</button></div>';
  return {
    title: 'Nuevo servicio', back: true, html: html, mount: el => {
      const drawClient = () => {
        $$('[data-cli]', el).forEach(b => b.classList.toggle('on', b.dataset.cli === st.cliente));
        const c = st.cliente === 'NEW' ? { protocolo: 'general', tipos: S.data.config.tiposGeneral } : D.client(st.cliente);
        $('#newCli').innerHTML = st.cliente === 'NEW' ? '<div class="two"><div><label class="f">Nombre del cliente</label><input class="in" id="ncName" autocomplete="off"></div><div><label class="f">Teléfono</label><input class="in" id="ncTel" inputmode="tel" autocomplete="off"></div></div><label class="f">Email (para avisos y seguimiento)</label><input class="in" id="ncMail" type="email" inputmode="email" autocomplete="off" placeholder="cliente@correo.com">' : '';
        const tipos = c.tipos || [];
        if (tipos.indexOf(st.tipo) < 0) st.tipo = tipos[0] || '';
        $('#tipoChips').innerHTML = tipos.map(t => '<button type="button" data-tipo="' + esc(t) + '" class="' + (st.tipo === t ? 'on' : '') + '">' + esc(t) + '</button>').join('');
        $('#optBox').innerHTML = c.protocolo === 'K2'
          ? '<label class="check"><input type="checkbox" id="ext" ' + (st.exterior ? 'checked' : '') + '> Incluye exterior (contratado o autorizado)</label>'
          : '<label class="f">Extras</label><div class="chips">' + S.data.config.extras.map(x => '<button type="button" data-ex="' + esc(x) + '" class="' + (st.extras.indexOf(x) >= 0 ? 'on' : '') + '">' + esc(x) + '</button>').join('') + '</div>';
        dup();
      };
      const dup = () => {
        const keys = [norm($('#mat').value), norm($('#cha').value)].filter(Boolean);
        const hit = keys.length && D.open().find(s => s.cliente === st.cliente && [s.matricula, s.chasis].filter(Boolean).some(v => keys.indexOf(norm(v)) >= 0));
        $('#dupBox').innerHTML = hit ? '<div class="banner warn" style="margin-top:10px">' + icon('alert') + '<span class="grow">Este vehículo ya está en curso.</span><button class="btn sm" data-act="go" data-to="servicio/' + esc(hit.id) + '">Ver y unirme</button></div>' : '';
      };
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.cli) { st.cliente = b.dataset.cli; drawClient(); }
        if (b.dataset.tipo) { st.tipo = b.dataset.tipo; $$('[data-tipo]', el).forEach(x => x.classList.toggle('on', x === b)); }
        if (b.dataset.veh) { st.vehiculo = b.dataset.veh; $$('[data-veh]', el).forEach(x => x.classList.toggle('on', x === b)); }
        if (b.dataset.dirt) { st.suciedad = b.dataset.dirt; $$('[data-dirt]', el).forEach(x => x.classList.toggle('on', x === b)); }
        if (b.dataset.ex) { const i = st.extras.indexOf(b.dataset.ex); if (i >= 0) st.extras.splice(i, 1); else st.extras.push(b.dataset.ex); b.classList.toggle('on'); }
      });
      el.addEventListener('change', e => { if (e.target.id === 'ext') st.exterior = e.target.checked; });
      $('#mat').oninput = dup; $('#cha').oninput = dup;
      drawClient();
      $('#createBtn').onclick = async () => {
        const mat = $('#mat').value.trim(), cha = $('#cha').value.trim();
        if (!st.cliente) return toast('Elige el cliente.', true);
        if (!mat && !cha) return toast('Indica la matrícula o el número de chasis.', true);
        const body = { id: uid(), tipo: st.tipo, matricula: mat, chasis: cha, marca: $('#marca').value, modelo: $('#modelo').value, vehiculo: st.vehiculo, suciedad: st.suciedad, alcance: $('#alcance').value, exterior: st.exterior, extras: st.extras };
        if (st.cliente === 'NEW') { const n = $('#ncName').value.trim(); if (!n) return toast('Indica el nombre del cliente.', true); body.newClient = { nombre: n, telefono: $('#ncTel').value.trim(), email: $('#ncMail').value.trim() }; }
        else body.cliente = st.cliente;
        const b = $('#createBtn'); b.disabled = true;
        await command(async () => {
          if (S.queue.length) await flush();
          const r = await api('createService', body);
          S.data = await api('sync', {}); S.queue.forEach(applyLocal); persistSnap();
          S.newForm = null;
          if (r.duplicate) { toast('Ese vehículo ya estaba en curso. Te llevo a él.'); go('servicio/' + r.duplicate); }
          else go('servicio/' + r.id);
        }, '');
        b.disabled = false;
      };
    }
  };
};

/* ---------- Detalle de servicio ---------- */
VIEWS.servicio = function (r) {
  const s = D.service(r.id);
  if (!s) return { title: 'Servicio', back: true, html: empty('rv', 'Servicio no disponible', 'Puede que se haya archivado o que no tengas acceso.') };
  return detailView({ s: s, times: D.times(s.id), incidents: D.incidents(s.id), photos: D.photos(s.id), live: true });
};
VIEWS.historico = function (r) {
  const ctx = S.archived && S.archived.service.id === r.id ? S.archived : null;
  if (!ctx) {
    return { title: 'Historial', back: true, html: '<div class="card empty">Cargando…</div>', mount: async () => {
      try { const d = await api('archivedService', { id: r.id, year: r.sub }); S.archived = d; render(); }
      catch (e) { $('#main').innerHTML = empty('history', 'No se ha podido abrir', e.message); }
    } };
  }
  return detailView({ s: ctx.service, times: ctx.times, incidents: ctx.incidents, photos: ctx.photos, live: false, year: r.sub });
};

function detailView(ctx) {
  const s = ctx.s, c = D.client(s.cliente), u = me().id, live = ctx.live && !s.cerrado;
  const st = ctx.live ? D.status(s) : 'Entregado';
  const people = (function () { const o = {}; ctx.times.forEach(t => { if (t.usuario !== 'MAQUINA') o[t.usuario] = 1; }); return Object.keys(o); })();
  const myMode = live ? D.mode(s.id, u) : '';
  const joined = people.indexOf(u) >= 0;
  const p = D.progress(s);

  // Cabecera con el reloj
  let hero = '<div class="hero"><div class="row between"><div class="grow"><div class="plate">' + esc(s.matricula || s.chasis) + '</div><div class="meta">' + esc(c.nombre) + ' · ' + esc(s.tipo) + (s.vehiculo ? ' · ' + esc(s.vehiculo) : '') + '</div></div>' + '<span class="chip">' + esc(st) + '</span></div>';
  if (live && !isClient()) {
    if (!joined || !myMode) {
      hero += '<p class="meta" style="margin-top:12px">' + (joined ? 'Has salido de este vehículo.' : 'Aún no estás trabajando en este vehículo.') + '</p><button class="btn green wide" style="margin-top:8px" data-clock="Trabajo">' + icon('play') + (joined ? 'Volver a trabajar aquí' : 'Unirme y empezar') + '</button>';
    } else {
      hero += '<div class="meta" style="margin-top:10px">Tu tiempo trabajado aquí</div><div class="big timer" data-sum="' + esc(s.id) + '|Trabajo|' + esc(u) + '">' + hms(D.sum(ctx.times, t => t.usuario === u && t.tipo === 'Trabajo')) + '</div>' +
        '<div class="seg big"><button class="' + (myMode === 'Trabajo' ? 'on g' : '') + '" data-clock="Trabajo">' + icon('play', 's') + 'Trabajo</button><button class="' + (myMode === 'Espera' ? 'on w' : '') + '" data-clock="Espera">' + icon('hourglass', 's') + 'Espera</button><button class="' + (myMode === 'Pausa' ? 'on p' : '') + '" data-clock="Pausa">' + icon('pause', 's') + 'Pausa</button></div>' +
        '<button class="leave" data-leave>' + icon('logout', 's') + 'Salir de este vehículo</button>';
    }
  } else if (s.cerrado) {
    hero += '<div class="row" style="gap:18px;margin-top:12px"><div><div class="meta">Entregado</div><b>' + esc(fDate(s.cerrado, true)) + '</b></div><div><div class="meta">Horas-persona</div><b>' + dur(D.sum(ctx.times, t => t.tipo === 'Trabajo')) + '</b></div><div><div class="meta">Equipo</div><b>' + people.length + '</b></div></div>';
  }
  hero += '</div>';

  // Equipo
  const team = '<div class="card"><div class="row between"><h2>Equipo en el vehículo</h2><span class="small muted">' + (ctx.live && !s.cerrado ? 'Duración ' : '') + (ctx.live && !s.cerrado ? '<span class="timer" data-since="' + esc(s.creado) + '">' + hms(Date.now() - Date.parse(s.creado)) + '</span>' : '') + '</span></div>' +
    (people.length ? people.map(id => {
      const m = ctx.live && !s.cerrado ? D.mode(s.id, id) : '';
      const ms = D.sum(ctx.times, t => t.usuario === id && t.tipo === 'Trabajo');
      return '<div class="person"><span class="av lg ' + (m === 'Trabajo' ? 'on' : '') + '">' + esc(initials(D.userName(id))) + '</span><div class="grow"><b style="font-size:14px">' + esc(D.userName(id)) + (id === u ? ' <span class="muted small">(tú)</span>' : '') + '</b><div class="small muted ellipsis">' + esc((s.fases || {})[id] || 'Recepción') + ' · ' + '<span data-sum="' + esc(s.id) + '|Trabajo|' + esc(id) + '" data-fmt="dur">' + dur(ms) + '</span></div></div>' + (s.cerrado ? '' : modeChip(m)) + '</div>';
    }).join('') : '<p class="muted small" style="margin-top:8px">Nadie ha empezado todavía.</p>') +
    (ctx.live && !s.cerrado ? machineRow(s) : machineSummary(ctx)) + '</div>';

  // Tareas
  const groups = (s.grupos || []).map((g, gi) => {
    const done = g.tasks.filter(t => t.state !== 'pending').length;
    const here = (s.fases || {})[u] === g.name;
    const key = s.id + gi, pref = S.openGroups && S.openGroups[key];
    const openAcc = pref !== undefined ? pref : (live && (here || firstPendingGroup(s) === gi));
    return '<details class="acc" data-g="' + gi + '" ' + (openAcc ? 'open' : '') + '><summary>' + icon('chev', 's chev') + '<b class="grow" style="font-size:14.5px">' + esc(g.name) + '</b>' +
      (live && joined ? '<button class="here ' + (here ? 'on' : '') + '" data-phase="' + gi + '">' + (here ? 'Estás aquí' : 'Estoy aquí') + '</button>' : '') +
      '<span class="count ' + (done === g.tasks.length ? 'done' : '') + '">' + done + '/' + g.tasks.length + '</span></summary>' +
      g.tasks.map((t, ti) => {
        const lock = !live || t.label === 'Albarán firmado';
        const canNa = live && ['Recepción', 'Calidad', 'Entrega', 'Ozono'].indexOf(g.name) < 0 && t.label !== 'Albarán firmado';
        return '<div class="task ' + (t.state === 'done' ? 'done' : t.state === 'na' ? 'na' : '') + '" ' + (lock ? '' : 'data-task="' + gi + '.' + ti + '"') + '><span class="bx">' + (t.state === 'done' ? icon('check', 's') : t.state === 'na' ? '<b style="font-size:9px;color:#fff">N/A</b>' : '') + '</span><span class="tx">' + esc(t.label) +
          (t.state !== 'pending' && t.by ? '<div class="by">' + esc(D.userName(t.by)) + ' · ' + esc(fTime(t.at)) + '</div>' : '') + '</span>' + (canNa ? '<button class="na-btn" data-na="' + gi + '.' + ti + '">No aplica</button>' : '') + '</div>';
      }).join('') + '</details>';
  }).join('');
  const tasks = '<div class="card"><div class="row between" style="margin-bottom:4px"><h2>Protocolo de limpieza</h2><span class="small muted">' + p[0] + '/' + p[1] + '</span></div><div class="progress" style="margin-bottom:6px"><i style="width:' + (p[1] ? Math.round(100 * p[0] / p[1]) : 0) + '%"></i></div>' + groups + '</div>';

  // Fotos
  const gal = ctx.photos.filter(f => f.tipo !== 'Firma');
  const photos = '<div class="card"><div class="row between" style="margin-bottom:10px"><h2>Fotos <span class="muted small">· ' + gal.length + '</span></h2>' + (gal.length && !isClient() ? '<span class="tiny muted row" style="gap:4px">' + icon('eye', 's') + 'visible para el cliente</span>' : '') + '</div>' +
    '<div class="photos">' + (live && !isClient() ? '<button class="ph add" data-addphoto>' + icon('camera', 'l') + 'Añadir</button>' : '') + gal.slice().reverse().map(f => photoTile(f, ctx.year)).join('') + '</div>' +
    (!gal.length && !live ? '<p class="muted small">Sin fotos.</p>' : '') + '</div>';

  // Incidencias
  const incs = '<div class="card"><div class="row between"><h2>Incidencias</h2>' + (live ? '<button class="btn sm soft" data-newinc>' + icon('plus', 's') + 'Nueva</button>' : '') + '</div>' +
    (ctx.incidents.length ? ctx.incidents.map(i => {
      const ph = ctx.photos.filter(f => f.incidencia === i.id);
      return '<div class="inc ' + (i.resuelta ? 'res' : '') + '"><div class="row between"><b style="font-size:14px">' + esc(i.tipo) + '</b>' + (i.resuelta ? '<span class="chip ok">Resuelta</span>' : i.bloqueante ? '<span class="chip bad">Bloquea la entrega</span>' : '<span class="chip warn">Abierta</span>') + '</div><p style="margin-top:3px">' + esc(i.texto) + '</p><p class="tiny muted row wrap" style="margin-top:3px;gap:6px">' + esc(D.userName(i.por)) + ' · ' + esc(fRel(i.fecha)) + (live ? ' <button class="here ' + (i.visible !== false ? 'on' : '') + '" data-incvis="' + esc(i.id) + '">' + (i.visible !== false ? 'Visible para el cliente' : 'Interna') + '</button>' : ' · ' + (i.visible !== false ? 'visible para el cliente' : 'interna')) + '</p>' +
        (ph.length ? '<div class="photos" style="margin-top:8px">' + ph.map(f => photoTile(f, ctx.year)).join('') + '</div>' : '') +
        (i.resuelta ? '<p class="small" style="margin-top:6px;color:var(--ok)">' + icon('check', 's') + ' ' + esc(i.resuelta.text) + ' <span class="muted">· ' + esc(D.userName(i.resuelta.by)) + '</span></p>' : live ? '<button class="btn sm ghost" style="margin-top:8px" data-resolve="' + esc(i.id) + '">Registrar solución</button>' : '') + '</div>';
    }).join('') : '<p class="muted small" style="margin-top:8px">Sin incidencias.</p>') + '</div>';

  // Notas
  const notes = '<div class="card"><h2>Notas</h2>' + ((s.notas || []).map(n => '<div class="note">' + esc(n.text) + '<div class="tiny muted" style="margin-top:3px">' + esc(D.userName(n.by)) + ' · ' + esc(fRel(n.at)) + '</div></div>').join('') || '<p class="muted small" style="margin-top:6px">Sin notas.</p>') +
    (live ? '<div class="row" style="margin-top:10px;gap:8px"><input class="in grow" id="noteIn" placeholder="Escribe una nota para el equipo o dirección" value="' + esc((S.noteDraft || {})[s.id] || '') + '"><button class="btn sm" style="min-height:44px" data-note>' + icon('note', 's') + '</button></div>' : '') + '</div>';

  // Datos del vehículo
  const info = '<div class="card"><div class="row between"><h2>Datos del vehículo</h2>' + (ctx.live && (isAdmin() || (live && D.mode(s.id, u))) ? '<button class="btn sm soft" data-edit>' + icon('edit', 's') + 'Corregir</button>' : '') + '</div><dl class="kv" style="margin-top:10px">' +
    '<dt>Matrícula</dt><dd>' + esc(s.matricula || '—') + '</dd>' + (s.chasis ? '<dt>Chasis</dt><dd>' + esc(s.chasis) + '</dd>' : '') +
    '<dt>Vehículo</dt><dd>' + esc([s.vehiculo, s.marca, s.modelo].filter(Boolean).join(' · ') || '—') + '</dd><dt>Estado inicial</dt><dd>' + esc(s.suciedad || 'Normal') + '</dd>' +
    ((s.extras || []).length ? '<dt>Extras</dt><dd>' + esc(s.extras.join(', ')) + '</dd>' : '') + (s.exterior ? '<dt>Exterior</dt><dd>Incluido</dd>' : '') +
    '<dt>Registrado</dt><dd>' + esc(fDate(s.creado, true)) + ' · ' + esc(D.userName(s.creadoPor)) + '</dd>' + (s.alcance ? '<dt>Alcance</dt><dd>' + esc(s.alcance) + '</dd>' : '') + '</dl>' +
    (isAdmin() && ctx.live ? '<button class="btn sm danger" style="margin-top:12px" data-archive>' + icon('archive', 's') + 'Quitar del listado</button>' : '') + '</div>';

  const delivery = s.cerrado ? receiptSummary(s, ctx) : live ? deliveryCard(s) : '';

  const share = ctx.live ? '<div class="card"><div class="row between" style="align-items:flex-start"><div class="grow"><h2>Seguimiento del cliente</h2><p class="small muted" style="margin-top:3px">Ve el avance, las fotos y las incidencias visibles' + (D.client(s.cliente).tipo === 'particular' ? '' : ', también desde su portal') + '.</p></div><button class="btn sm soft" data-share>' + icon('send', 's') + 'Compartir</button></div></div>' : '';
  const html = hero + '<div class="detail" style="margin-top:12px"><div class="col">' + tasks + photos + incs + '</div><div class="col">' + team + delivery + share + notes + info + '</div></div>';
  return { title: s.matricula || s.chasis, back: true, html: html, mount: el => mountDetail(el, s, ctx) };
}
function firstPendingGroup(s) { return (s.grupos || []).findIndex(g => g.tasks.some(t => t.state === 'pending')); }

function machineRow(s) {
  const on = s.maquina && s.maquina.on;
  return '<div class="person">' + '<span class="av lg" style="background:' + (on ? 'var(--info-bg)' : 'var(--bg)') + ';color:var(--info)">' + icon('fan', 's') + '</span><div class="grow"><b style="font-size:14px">' + (on ? esc(s.maquina.label) : 'Ozono / máquina') + '</b><div class="small muted">' + (on ? 'En marcha · <span class="timer" data-since="' + esc(s.maquina.inicio) + '">' + hms(Date.now() - Date.parse(s.maquina.inicio)) + '</span>' : 'No cuenta como horas de persona') + '</div></div><label class="switch"><input type="checkbox" data-machine ' + (on ? 'checked' : '') + '><span></span></label></div>';
}
function machineSummary(ctx) {
  const m = ctx.times.filter(t => t.usuario === 'MAQUINA');
  return m.length ? '<div class="person"><span class="av lg" style="background:var(--info-bg);color:var(--info)">' + icon('fan', 's') + '</span><div class="grow"><b style="font-size:14px">Máquina</b><div class="small muted">' + esc(m.map(t => t.tipo).join(', ')) + ' · ' + dur(D.sum(m, () => true)) + '</div></div></div>' : '';
}

function photoTile(f, year) {
  const key = f.id;
  const src = S.thumbs[key] || S.thumbs['local:' + key] || '';
  const pending = S.queue.some(q => q.kind === 'photo' && q.data.photoId === f.id);
  return '<div class="ph" data-photo="' + esc(f.id) + '" data-year="' + esc(year || '') + '">' + (src ? '<img src="' + src + '" alt="">' : '') + '<span class="tag">' + esc(f.tipo) + '</span>' +
    (!isClient() ? '<span class="vis ' + (f.visible ? '' : 'off') + '">' + icon(f.visible ? 'eye' : 'eyeoff', 's') + '</span>' : '') + (pending ? '<span class="pend"><i class="dot busy"></i></span>' : '') + '</div>';
}

function fetchPhoto(id, size, year) {
  if (S.publicToken) return api('publicPhoto', { t: S.publicToken, photoId: id, size: size }, 90000);
  return api('photo', { photoId: id, size: size, year: year || undefined }, 90000);
}
/* Miniaturas: se cargan en segundo plano (3 a la vez) y se guardan en el móvil */
const thumbQ = [];
let thumbBusy = 0;
function loadThumbs(root) {
  $$('.ph[data-photo]', root).forEach(el => {
    const id = el.dataset.photo;
    if (S.thumbs[id] || S.thumbs['local:' + id] || el.dataset.loading) return;
    el.dataset.loading = '1';
    thumbQ.push({ id: id, year: el.dataset.year });
  });
  pumpThumbs();
}
function pumpThumbs() {
  while (thumbBusy < 3 && thumbQ.length) {
    const it = thumbQ.shift();
    thumbBusy++;
    (async () => {
      try {
        let v = await IDB.tget(it.id);
        if (!v) { const r = await fetchPhoto(it.id, 'mini', it.year); v = r.data; IDB.tput(it.id, v); }
        S.thumbs[it.id] = v;
        $$('.ph[data-photo="' + it.id + '"]').forEach(el => { if (!el.querySelector('img')) el.insertAdjacentHTML('afterbegin', '<img src="' + v + '" alt="">'); });
      } catch (e) {}
      finally { thumbBusy--; pumpThumbs(); }
    })();
  }
}

function mountDetail(el, s, ctx) {
  loadThumbs(el);
  S.openGroups = S.openGroups || {};
  $$('details.acc', el).forEach(d => d.addEventListener('toggle', () => { S.openGroups[s.id + d.dataset.g] = d.open; }));
  const live = ctx.live && !s.cerrado;
  el.addEventListener('click', async e => {
    const t = e.target;
    const ph = t.closest('[data-photo]');
    if (ph) return viewPhoto(ph.dataset.photo, ph.dataset.year, ctx);
    if (t.closest('[data-share]')) return shareTracking(s);
    if (!live) return;
    const ck = t.closest('[data-clock]');
    if (ck) {
      const kind = ck.dataset.clock;
      if (D.mode(s.id, me().id) === kind) return;
      let reason = '';
      if (kind === 'Espera') { reason = await promptSheet('¿Por qué esperas?', 'Motivo', { chips: ['Esperando llaves', 'Falta material', 'Esperando al cliente', 'Vehículo ocupado', 'Sin agua o luz'], ok: 'Poner en espera' }); if (!reason) return; }
      const other = D.myOpen();
      if (kind === 'Trabajo' && other && other.servicio !== s.id) { const o = D.service(other.servicio); toast('Has salido de ' + (o ? (o.matricula || o.chasis) : 'otro vehículo') + ' y empiezas aquí.'); }
      return enqueue('op', { id: s.id, op: 'clock', d: { kind: kind, reason: reason } });
    }
    if (t.closest('[data-leave]')) return enqueue('op', { id: s.id, op: 'leave', d: {} });
    const ph2 = t.closest('[data-phase]');
    if (ph2) { e.preventDefault(); e.stopPropagation(); return enqueue('op', { id: s.id, op: 'phase', d: { g: Number(ph2.dataset.phase) } }); }
    const na = t.closest('[data-na]');
    if (na) { e.stopPropagation(); const [g, ti] = na.dataset.na.split('.').map(Number); const cur = s.grupos[g].tasks[ti].state; return enqueue('op', { id: s.id, op: 'tasks', d: { items: [{ g: g, t: ti, state: cur === 'na' ? 'pending' : 'na' }] } }); }
    const tk = t.closest('[data-task]');
    if (tk) {
      if (!D.mode(s.id, me().id) && !isAdmin()) return toast('Pulsa «Unirme y empezar» para marcar tareas.', true);
      const [g, ti] = tk.dataset.task.split('.').map(Number); const cur = s.grupos[g].tasks[ti].state;
      return enqueue('op', { id: s.id, op: 'tasks', d: { items: [{ g: g, t: ti, state: cur === 'done' ? 'pending' : 'done' }] } });
    }
    const iv = t.closest('[data-incvis]');
    if (iv) { const inc = D.incidents(s.id).find(x => x.id === iv.dataset.incvis); return enqueue('op', { id: s.id, op: 'incidentVisible', d: { incidentId: inc.id, visible: inc.visible === false } }); }
    if (t.closest('[data-addphoto]')) return addPhotos(s);
    if (t.closest('[data-newinc]')) return newIncident(s);
    const rs = t.closest('[data-resolve]');
    if (rs) { const v = await promptSheet('Solución de la incidencia', '¿Cómo se ha resuelto o a quién se ha comunicado?', { ok: 'Guardar solución' }); if (v) enqueue('op', { id: s.id, op: 'resolve', d: { incidentId: rs.dataset.resolve, text: v } }); return; }
    if (t.closest('[data-note]')) { const i = $('#noteIn'); const v = i.value.trim(); if (!v) return i.focus(); i.value = ''; if (S.noteDraft) delete S.noteDraft[s.id]; return enqueue('op', { id: s.id, op: 'note', d: { noteId: uid(), text: v } }); }
    if (t.closest('[data-edit]')) return editVehicle(s);
    if (t.closest('[data-archive]')) {
      const v = await promptSheet('Quitar del listado', 'Motivo (por ejemplo: servicio de prueba, duplicado…)', { ok: 'Quitar' });
      if (v) await command(async () => { await api('op', { id: s.id, op: 'archive', d: { reason: v } }); await sync(true); go('servicios'); }, 'Servicio retirado');
      return;
    }
  });
  const mc = $('[data-machine]', el);
  if (mc) mc.onchange = async () => {
    if (mc.checked) {
      const label = await promptSheet('¿Qué queda en marcha?', 'Descripción', { chips: ['Ozono en marcha', 'Secando', 'Desinfección'], ok: 'Poner en marcha' });
      if (!label) { mc.checked = false; return; }
      enqueue('op', { id: s.id, op: 'machine', d: { on: true, label: label } });
    } else enqueue('op', { id: s.id, op: 'machine', d: { on: false } });
  };
  const ni = $('#noteIn', el);
  if (ni) ni.oninput = () => { (S.noteDraft = S.noteDraft || {})[s.id] = ni.value; };
  if (live) mountDelivery(el, s);
}

/* ---------- Fotos ---------- */
async function compress(file, max, q) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(Error('Formato de imagen no compatible.')); i.src = url; });
    const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * r); c.height = Math.round(img.naturalHeight * r);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  } finally { URL.revokeObjectURL(url); }
}
function pickFiles() {
  return new Promise(res => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = () => res(Array.from(inp.files || []));
    inp.click();
  });
}
async function queuePhotos(s, files, kind, visible, incidentId) {
  if (!files.length) return;
  toast('Preparando ' + files.length + (files.length === 1 ? ' foto…' : ' fotos…'));
  for (const f of files) {
    try {
      const data = await compress(f, 1600, 0.82), thumb = await compress(f, 360, 0.7);
      const id = uid();
      S.thumbs['local:' + id] = thumb;
      await enqueue('photo', { id: s.id, photoId: id, kind: kind, visible: visible, incidentId: incidentId || '', data: data, thumb: thumb });
    } catch (e) { toast(e.message, true); }
  }
  toast(files.length === 1 ? 'Foto guardada' : files.length + ' fotos guardadas');
}
function addPhotos(s) {
  const kinds = ['Antes', 'Después', 'Exterior', 'Interior', 'Detalle'];
  let kind = S.lastKind || 'Antes', vis = kind !== 'Detalle';
  sheet('Añadir fotos', '<label class="f" style="margin-top:0">Tipo de foto</label><div class="chips" id="pk">' + kinds.map(k => '<button type="button" data-k="' + k + '" class="' + (k === kind ? 'on' : '') + '">' + k + '</button>').join('') + '</div>' +
    '<div class="row between" style="margin-top:14px"><div><b style="font-size:14px">Visible para el cliente</b><p class="small muted">Si lo desactivas, la foto queda solo para el equipo.</p></div><label class="switch"><input type="checkbox" id="pv" ' + (vis ? 'checked' : '') + '><span></span></label></div>' +
    '<div class="actions"><button class="btn green" id="pgo">' + icon('camera') + 'Hacer o elegir fotos</button></div><p class="tiny muted" style="text-align:center;margin-top:8px">Puedes elegir varias a la vez. Se guardan aunque no haya cobertura.</p>', (el, close) => {
    $$('[data-k]', el).forEach(b => b.onclick = () => { kind = b.dataset.k; S.lastKind = kind; $$('[data-k]', el).forEach(x => x.classList.toggle('on', x === b)); $('#pv').checked = kind !== 'Detalle'; });
    $('#pgo').onclick = async () => { const v = $('#pv').checked; const files = await pickFiles(); close(); queuePhotos(s, files, kind, v); };
  });
}
function newIncident(s) {
  const types = S.data.config.tiposIncidencia;
  let files = [];
  sheet('Nueva incidencia', '<label class="f" style="margin-top:0">Tipo</label><select class="in" id="it">' + types.map(t => '<option>' + esc(t) + '</option>').join('') + '</select>' +
    '<label class="f">Descripción</label><textarea class="in" id="ix" placeholder="Qué pasa, dónde y qué se ha hecho"></textarea>' +
    '<label class="check"><input type="checkbox" id="ib"> Impide terminar o entregar el vehículo</label>' +
    '<div class="row between" style="margin-top:4px"><div><b style="font-size:14px">Visible para el cliente</b><p class="small muted">La incidencia y sus fotos. Recibirá un aviso por correo.</p></div><label class="switch"><input type="checkbox" id="iv" checked><span></span></label></div>' +
    '<label class="f">Fotos de la incidencia</label><div class="photos" id="ip"><button type="button" class="ph add" id="ipa">' + icon('camera', 'l') + 'Añadir</button></div>' +
    '<div class="actions"><button class="btn ghost" data-cancel>Cancelar</button><button class="btn" id="isave">Registrar</button></div>', (el, close) => {
    const draw = () => { $$('.ph.prev', el).forEach(x => x.remove()); files.forEach(f => { const u = URL.createObjectURL(f); $('#ip').insertAdjacentHTML('beforeend', '<div class="ph prev"><img src="' + u + '" alt=""></div>'); }); };
    $('#ipa').onclick = async () => { files = files.concat(await pickFiles()); draw(); };
    el.querySelector('[data-cancel]').onclick = close;
    $('#isave').onclick = async () => {
      const text = $('#ix').value.trim();
      if (!text) return toast('Describe la incidencia.', true);
      if (!files.length) return toast('Añade al menos una foto.', true);
      const iid = uid();
      const vis = $('#iv').checked, type = $('#it').value, blocking = $('#ib').checked;
      close();
      await enqueue('op', { id: s.id, op: 'incident', d: { incidentId: iid, type: type, text: text, blocking: blocking, visible: vis } });
      queuePhotos(s, files, 'Incidencia', vis, iid);
    };
  });
}
async function viewPhoto(id, year, ctx) {
  const f = ctx.photos.find(x => x.id === id); if (!f) return;
  const v = document.createElement('div');
  v.className = 'viewer';
  const staff = !isClient() && !S.publicToken;
  v.innerHTML = '<div class="bar"><button class="iconbtn" data-close aria-label="Cerrar">' + icon('x') + '</button><b class="grow">' + esc(f.tipo) + '</b></div><img alt="" src="' + (S.thumbs[id] || S.thumbs['local:' + id] || '') + '"><div class="foot"><span class="small">' + (staff ? esc(D.userName(f.por)) + ' · ' : '') + esc(fRel(f.fecha)) + '</span>' +
    (staff && ctx.live ? '<label class="row small" style="gap:8px">Visible para el cliente <span class="switch"><input type="checkbox" data-vis ' + (f.visible ? 'checked' : '') + '><span></span></span></label>' : '') + '</div>';
  document.body.appendChild(v);
  v.querySelector('[data-close]').onclick = () => v.remove();
  const vis = v.querySelector('[data-vis]');
  if (vis) vis.onchange = () => { enqueue('photoVisible', { photoId: id, visible: vis.checked }); };
  if (!S.queue.some(q => q.kind === 'photo' && q.data.photoId === id)) {
    try { const r = await fetchPhoto(id, 'full', year); if (v.isConnected) v.querySelector('img').src = r.data; } catch (e) {}
  } else {
    const q = S.queue.find(q => q.kind === 'photo' && q.data.photoId === id); if (q) v.querySelector('img').src = q.data.data;
  }
}

function editVehicle(s) {
  const adm = isAdmin();
  sheet('Corregir datos', '<label class="f" style="margin-top:0">Matrícula</label><input class="in plate" id="em" value="' + esc(s.matricula) + '">' +
    (adm ? '<label class="f">Nº chasis</label><input class="in" id="ec" value="' + esc(s.chasis) + '"><div class="two"><div><label class="f">Marca</label><input class="in" id="eb" value="' + esc(s.marca) + '"></div><div><label class="f">Modelo</label><input class="in" id="eo" value="' + esc(s.modelo) + '"></div></div><label class="f">Vehículo</label><select class="in" id="ev">' + VEHICULOS.map(v => '<option ' + (v === s.vehiculo ? 'selected' : '') + '>' + v + '</option>').join('') + '</select><label class="f">Alcance</label><textarea class="in" id="ea">' + esc(s.alcance) + '</textarea>' : '') +
    '<label class="f">Motivo de la corrección</label><input class="in" id="er" placeholder="Por ejemplo: matrícula mal escrita">' +
    '<div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn" id="es">Guardar</button></div>', (el, close) => {
    el.querySelector('[data-c]').onclick = close;
    $('#es').onclick = async () => {
      const body = { matricula: $('#em').value, reason: $('#er').value };
      if (adm) Object.assign(body, { chasis: $('#ec').value, marca: $('#eb').value, modelo: $('#eo').value, vehiculo: $('#ev').value, alcance: $('#ea').value });
      if (!body.reason.trim()) return toast('Indica el motivo.', true);
      const ok = await command(async () => { if (S.queue.length) await flush(); await api('op', { id: s.id, op: 'edit', d: body }); await sync(true); }, 'Datos corregidos');
      if (ok) close();
    };
  });
}

/* ---------- Entrega y firma ---------- */
function blockers(s) {
  const out = [];
  const pend = []; (s.grupos || []).forEach(g => g.tasks.forEach(t => { if (t.state === 'pending' && t.label !== 'Albarán firmado') pend.push(t); }));
  if (pend.length) out.push(pend.length + (pend.length === 1 ? ' tarea pendiente' : ' tareas pendientes'));
  const inc = D.incidents(s.id);
  if (inc.some(i => !i.resuelta)) out.push('Incidencias sin solución registrada');
  if (['Elevado', 'Intensivo'].indexOf(s.suciedad) >= 0 && !inc.some(i => i.tipo === 'Suciedad extraordinaria')) out.push('Falta la incidencia de suciedad extraordinaria con fotos');
  if (D.times(s.id).some(t => !t.fin && t.tipo === 'Trabajo' && t.usuario !== me().id)) out.push('Otro compañero sigue trabajando (debe salir del vehículo)');
  if (s.maquina && s.maquina.on) out.push('Hay una máquina en marcha');
  return out;
}
const RECEIPT = {};
function deliveryCard(s) {
  const b = blockers(s);
  const r = RECEIPT[s.id] || (RECEIPT[s.id] = { signer: '', role: D.client(s.cliente).tipo === 'empresa' ? 'Responsable de empresa' : 'Cliente', conformity: 'Conforme', observations: '', accepted: false, strokes: [] });
  if (b.length) return '<div class="card"><h2>Entrega y albarán</h2><p class="small muted" style="margin-top:6px">Para firmar la entrega falta:</p><ul class="small" style="margin:6px 0 0;padding-left:18px">' + b.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
  return '<div class="card" id="deliv"><h2>Entrega y albarán</h2><p class="small muted" style="margin-top:4px">Todo listo. Quien recibe el vehículo revisa y firma en pantalla.</p>' +
    '<label class="f">Nombre y apellidos de quien recibe</label><input class="in" id="rs" value="' + esc(r.signer) + '" autocomplete="off">' +
    '<label class="f">En calidad de</label><select class="in" id="rr">' + ['Cliente', 'Responsable de empresa', 'Representante autorizado'].map(x => '<option ' + (x === r.role ? 'selected' : '') + '>' + x + '</option>').join('') + '</select>' +
    '<label class="f">Resultado</label><div class="seg" id="rc"><button type="button" class="' + (r.conformity === 'Conforme' ? 'on' : '') + '" data-c="Conforme">Conforme</button><button type="button" class="' + (r.conformity !== 'Conforme' ? 'on' : '') + '" data-c="Con observaciones">Con observaciones</button></div>' +
    '<div id="robs" ' + (r.conformity === 'Conforme' ? 'hidden' : '') + '><label class="f">Observaciones</label><textarea class="in" id="ro">' + esc(r.observations) + '</textarea></div>' +
    '<label class="f">Firma</label><canvas class="sig" id="sig" width="900" height="340"></canvas><div class="row between" style="margin-top:6px"><span class="tiny muted">Firma con el dedo dentro del recuadro</span><button class="btn sm soft" type="button" id="sigClear">Borrar</button></div>' +
    '<label class="check"><input type="checkbox" id="ra" ' + (r.accepted ? 'checked' : '') + '> He revisado el servicio y recibo el vehículo en las condiciones indicadas.</label>' +
    '<button class="btn green wide" id="rgo">' + icon('sign') + 'Firmar y entregar</button></div>';
}
function mountDelivery(el, s) {
  const box = $('#deliv', el); if (!box) return;
  const r = RECEIPT[s.id];
  $('#rs').oninput = e => r.signer = e.target.value;
  $('#rr').onchange = e => r.role = e.target.value;
  $('#ra').onchange = e => r.accepted = e.target.checked;
  const ro = $('#ro'); ro.oninput = () => r.observations = ro.value;
  $$('[data-c]', $('#rc')).forEach(b => b.onclick = () => { r.conformity = b.dataset.c; $$('[data-c]', $('#rc')).forEach(x => x.classList.toggle('on', x === b)); $('#robs').hidden = r.conformity === 'Conforme'; });
  const c = $('#sig'), x = c.getContext('2d');
  let active = null;
  const draw = () => { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = '#102d48'; x.lineWidth = 4.5; x.lineCap = 'round'; x.lineJoin = 'round'; r.strokes.forEach(st => { if (st.length < 2) return; x.beginPath(); x.moveTo(st[0][0], st[0][1]); st.slice(1).forEach(p => x.lineTo(p[0], p[1])); x.stroke(); }); };
  const pt = e => { const q = c.getBoundingClientRect(); return [(e.clientX - q.left) * c.width / q.width, (e.clientY - q.top) * c.height / q.height]; };
  c.addEventListener('pointerdown', e => { if (active !== null) return; e.preventDefault(); active = e.pointerId; r.strokes.push([pt(e)]); c.setPointerCapture(e.pointerId); });
  c.addEventListener('pointermove', e => { if (active !== e.pointerId) return; r.strokes[r.strokes.length - 1].push(pt(e)); draw(); });
  const stop = e => { if (active === e.pointerId) active = null; };
  c.addEventListener('pointerup', stop); c.addEventListener('pointercancel', stop);
  draw();
  $('#sigClear').onclick = () => { r.strokes = []; draw(); };
  $('#rgo').onclick = async () => {
    const signed = r.strokes.some(st => st.length > 3);
    if (!r.signer.trim()) return toast('Indica el nombre de quien recibe.', true);
    if (r.conformity !== 'Conforme' && !r.observations.trim()) return toast('Escribe las observaciones.', true);
    if (!signed) return toast('Falta la firma.', true);
    if (!r.accepted) return toast('Marca la casilla de conformidad.', true);
    if (!(await confirmSheet('Entregar vehículo', 'Se guardará el albarán firmado y el servicio quedará cerrado.', 'Firmar y entregar'))) return;
    const sigData = c.toDataURL('image/png');
    await command(async () => {
      if (S.queue.length) { await flush(); if (S.queue.length) throw Object.assign(Error('Hay cambios pendientes de enviar. Espera a tener cobertura.'), { server: true }); }
      await api('op', { id: s.id, op: 'close', d: { requestId: 'close-' + s.id, receipt: { signer: r.signer, role: r.role, conformity: r.conformity, observations: r.observations, accepted: true, signature: sigData } } }, 90000);
      delete RECEIPT[s.id];
      await sync(true);
    }, 'Vehículo entregado');
  };
}
function receiptSummary(s, ctx) {
  const r = s.recibo;
  if (!r) return '<div class="card"><h2>Entrega</h2><p class="muted small" style="margin-top:6px">Sin albarán firmado.</p></div>';
  const sig = ctx.photos.find(f => f.id === r.firma);
  return '<div class="card"><div class="row between"><h2>Albarán firmado</h2><span class="chip info">' + esc(r.numero) + '</span></div><dl class="kv" style="margin-top:10px"><dt>Recibe</dt><dd>' + esc(r.signer) + ' · ' + esc(r.role) + '</dd><dt>Resultado</dt><dd>' + esc(r.conformity) + '</dd>' + (r.observations ? '<dt>Observaciones</dt><dd>' + esc(r.observations) + '</dd>' : '') + '<dt>Fecha</dt><dd>' + esc(fDate(r.at, true)) + '</dd><dt>Registrado por</dt><dd>' + esc(D.userName(r.by)) + '</dd></dl>' +
    (sig ? '<div class="photos" style="margin-top:10px;grid-template-columns:160px">' + photoTile(sig, ctx.year).replace('class="ph"', 'class="ph" style="aspect-ratio:2.6;background:#fff;border:1px solid var(--line)"') + '</div>' : '') + '</div>';
}

/* ---------- Incidencias ---------- */
VIEWS.incidencias = function () {
  const tab = S.ui.incTab;
  const all = D.incidents().filter(i => D.service(i.servicio));
  const list = all.filter(i => tab === 'open' ? !i.resuelta : !!i.resuelta).sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const html = '<div class="seg" style="margin-bottom:12px"><button class="' + (tab === 'open' ? 'on' : '') + '" data-t="open">Abiertas · ' + all.filter(i => !i.resuelta).length + '</button><button class="' + (tab !== 'open' ? 'on' : '') + '" data-t="done">Resueltas</button></div>' +
    (list.length ? '<div class="cols">' + list.map(i => {
      const s = D.service(i.servicio), n = D.photos(s.id).filter(f => f.incidencia === i.id).length;
      return '<div class="card svc" data-act="go" data-to="servicio/' + esc(s.id) + '"><div class="row between"><div class="grow"><div class="plate">' + esc(s.matricula || s.chasis) + '</div><div class="meta">' + esc(D.client(s.cliente).nombre) + '</div></div>' + (i.resuelta ? '<span class="chip ok">Resuelta</span>' : i.bloqueante ? '<span class="chip bad">Bloquea</span>' : '<span class="chip warn">Abierta</span>') + '</div>' +
        '<p style="margin-top:8px"><b>' + esc(i.tipo) + '.</b> ' + esc(i.texto) + '</p><div class="foot"><span>' + esc(D.userName(i.por)) + ' · ' + esc(fRel(i.fecha)) + '</span><span class="row" style="gap:4px">' + icon('image', 's') + n + '</span></div></div>';
    }).join('') + '</div>' : empty('alert', tab === 'open' ? 'No hay incidencias abiertas' : 'Sin incidencias resueltas recientes'));
  return { title: 'Incidencias', html: html, mount: el => $$('[data-t]', el).forEach(b => b.onclick = () => { S.ui.incTab = b.dataset.t; saveUi(); render(); }) };
};

/* ---------- Mi jornada ---------- */
VIEWS.jornada = function () {
  const html = '<div id="wk"><div class="card empty">Cargando tu jornada…</div></div>';
  return { title: 'Mi jornada', html: html, mount: () => loadWork() };
};
async function loadWork(silent) {
  const box = $('#wk'); if (!box) return;
  const draw = () => {
    const w = workCache || { current: null, list: [], horas: 0 };
    const j = w.current;
    const br = j && (j.descansos || []).some(b => !b.end);
    const today = madridDay(), wk = weekStart(today);
    const lo = Date.parse(fromLocal(wk + 'T00:00')), hi = Date.parse(fromLocal(shiftDay(wk, 7) + 'T00:00'));
    const week = (w.list || []).reduce((n, x) => n + workMs(x, lo, hi), 0);
    const contract = (w.horas || 0) * 3600000;
    const days = (w.list || []).slice().sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio));
    box.innerHTML = '<div class="hero"><div class="meta">' + (j ? (br ? 'En descanso' : 'Jornada en curso') + ' · entrada ' + fTime(j.inicio) : 'Sin jornada abierta') + '</div><div class="big timer" data-work="1">' + hms(j ? workMs(j) : 0) + '</div><div class="meta">Tiempo neto (sin descansos)</div>' +
      '<div class="row" style="gap:8px;margin-top:14px">' + (!j ? '<button class="btn green wide" data-p="in">' + icon('login') + 'Fichar entrada</button>' : (br ? '<button class="btn green grow" data-p="resume">' + icon('play') + 'Volver del descanso</button>' : '<button class="btn soft grow" data-p="break">' + icon('coffee') + 'Descanso</button>') + '<button class="btn grow" style="background:#fff;color:var(--navy)" data-p="out">' + icon('logout') + 'Fichar salida</button>') + '</div></div>' +
      '<div class="kpis" style="margin-top:10px"><div class="kpi"><small>Esta semana</small><b>' + dur(week) + '</b></div><div class="kpi"><small>' + (contract ? (week <= contract ? 'Restan' : 'Exceso') : 'Horas contrato') + '</small><b>' + (contract ? dur(Math.abs(contract - week)) : '—') + '</b></div></div>' +
      '<div class="sec"><h2>Registros de la semana</h2></div><div class="card list">' + (days.length ? days.map(x => '<div class="li"><span class="ic">' + icon('calendar', 's') + '</span><div class="grow"><b>' + esc(new Date(x.inicio).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric' })) + '</b><div class="small muted">' + fTime(x.inicio) + ' – ' + (x.fin ? fTime(x.fin) : 'abierta') + ((x.descansos || []).length ? ' · ' + x.descansos.length + ' descanso(s)' : '') + ((x.auditoria || []).length ? ' · corregida' : '') + '</div></div><b class="small">' + dur(workMs(x)) + '</b></div>').join('') : '<p class="muted small">Aún no hay fichajes esta semana.</p>') + '</div>' +
      '<p class="tiny muted" style="margin-top:10px;text-align:center">Al fichar entrada y salida se guarda la ubicación aproximada del móvil.</p>';
    $$('[data-p]', box).forEach(b => b.onclick = () => punch(b.dataset.p, b));
  };
  draw();
  if (silent) return;
  try {
    const t = madridDay();
    workCache = await api('workSnapshot', { from: weekStart(t), to: shiftDay(weekStart(t), 6) });
    LS.set('work', workCache);
    if ($('#wk')) draw();
  } catch (e) { if (!e.auth) toast(e.net ? 'Sin conexión: se muestran los últimos datos.' : e.message, true); }
}
function getGeo() {
  return new Promise(res => {
    let done = false;
    const fin = v => { if (!done) { done = true; res(v); } };
    setTimeout(() => fin({ status: 'unavailable', reason: 'Tiempo de espera agotado' }), 9000);
    if (!navigator.geolocation) return fin({ status: 'unavailable', reason: 'GPS no disponible' });
    navigator.geolocation.getCurrentPosition(p => fin({ status: 'ok', lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }), e => fin({ status: 'unavailable', reason: e.code === 1 ? 'Permiso de ubicación denegado' : 'Ubicación no disponible' }), { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
  });
}
async function punch(op, btn) {
  if (op === 'out' && !(await confirmSheet('Fichar salida', 'Se cerrará tu jornada y saldrás de los vehículos en los que estés.', 'Fichar salida'))) return;
  btn.disabled = true;
  const geo = op === 'in' || op === 'out' ? getGeo() : null;
  await command(async () => {
    const j = await api('workPunch', { op: op });
    if (geo) { const e = (j.geo || []).slice(-1)[0]; const g = await geo; if (e) api('workLocation', { jornada: j.id, event: e.id, geo: g }).catch(() => {}); }
    await loadWork();
    if (op === 'out') sync(true);
  }, { in: 'Entrada registrada', out: 'Salida registrada', break: 'Descanso iniciado', resume: 'Descanso terminado' }[op]);
  btn.disabled = false;
}

/* ---------- Más ---------- */
VIEWS.mas = function () {
  const items = (isAdmin() ? SIDE_ADMIN : SIDE_WORKER).filter(x => Array.isArray(x) && ['inicio', 'servicios', 'incidencias', 'jornada'].indexOf(x[0]) < 0);
  const m = me();
  const html = '<div class="card row" style="gap:12px"><span class="av lg" style="width:44px;height:44px;font-size:15px">' + esc(initials(m.nombre)) + '</span><div class="grow"><b>' + esc(m.nombre) + '</b><div class="small muted">' + (isAdmin() ? 'Dirección · acceso completo' : 'Equipo de limpieza') + '</div></div></div>' +
    '<div class="card list menu" style="margin-top:10px;padding:4px 14px">' + items.map(x => '<a class="li" href="#/' + x[0] + '" style="text-decoration:none;color:inherit"><span class="ic">' + icon(x[1]) + '</span><b class="grow" style="font-weight:600">' + esc(x[2]) + '</b>' + icon('chev', 's') + '</a>').join('') +
    '<div class="li" data-act="logout"><span class="ic" style="color:var(--bad)">' + icon('logout') + '</span><b class="grow" style="font-weight:600;color:var(--bad)">Cerrar sesión</b></div></div>' +
    '<p class="tiny muted" style="text-align:center;margin-top:16px">Efecto Mariposa · Operaciones · v' + VERSION + '</p>';
  return { title: 'Más', html: html };
};

/* ---------- Control horario (dirección) ---------- */
VIEWS.horario = function () {
  if (!isAdmin()) return VIEWS.inicio();
  const f = S.hf || (S.hf = { from: weekStart(madridDay()), to: shiftDay(weekStart(madridDay()), 6), user: '' });
  const html = '<div class="card"><div class="two"><div><label class="f" style="margin-top:0">Desde</label><input type="date" class="in" id="hf" value="' + f.from + '"></div><div><label class="f" style="margin-top:0">Hasta</label><input type="date" class="in" id="ht" value="' + f.to + '"></div></div>' +
    '<label class="f">Persona</label><select class="in" id="hu"><option value="">Todo el equipo</option>' + S.data.users.filter(u => u.rol !== 'cliente').map(u => '<option value="' + esc(u.id) + '" ' + (u.id === f.user ? 'selected' : '') + '>' + esc(u.nombre) + (u.activo ? '' : ' (inactivo)') + '</option>').join('') + '</select>' +
    '<div class="row" style="gap:8px;margin-top:12px"><button class="btn grow" id="hgo">Consultar</button><button class="btn ghost" id="hadd">' + icon('plus', 's') + 'Jornada olvidada</button></div></div><div id="hout"></div>';
  return { title: 'Control horario', back: true, html: html, mount: el => {
    const load = async () => {
      f.from = $('#hf').value; f.to = $('#ht').value; f.user = $('#hu').value;
      const out = $('#hout'); out.innerHTML = '<div class="card empty" style="margin-top:10px">Cargando…</div>';
      try {
        const list = await api('workList', { from: f.from, to: f.to, user: f.user });
        const lo = Date.parse(fromLocal(f.from + 'T00:00')), hi = Date.parse(fromLocal(shiftDay(f.to, 1) + 'T00:00'));
        const people = S.data.users.filter(u => u.rol !== 'cliente' && (!f.user || u.id === f.user));
        const rows = people.map(u => {
          const h = list.filter(j => j.usuario === u.id).reduce((n, j) => n + workMs(j, lo, hi), 0);
          const cl = (S.data.times || []).filter(t => t.usuario === u.id && t.tipo === 'Trabajo').reduce((n, t) => n + Math.max(0, Math.min(t.fin ? Date.parse(t.fin) : Date.now(), hi) - Math.max(Date.parse(t.inicio), lo)), 0);
          return { u: u, h: h, cl: cl };
        }).filter(x => x.h || x.cl || f.user);
        out.innerHTML = '<div class="sec"><h2>Resumen</h2><button class="link" id="csv">' + icon('download', 's') + ' CSV</button></div><div class="card" style="padding:4px 14px"><table class="t"><tr><th>Persona</th><th>Jornada</th><th>En vehículos</th><th class="hide-m">Contrato/sem.</th></tr>' + rows.map(x => '<tr><td><b>' + esc(x.u.nombre) + '</b></td><td>' + dur(x.h) + '</td><td>' + dur(x.cl) + '</td><td class="hide-m">' + (x.u.horas ? x.u.horas + ' h' : '—') + '</td></tr>').join('') + '</table>' + (rows.length ? '' : '<p class="muted small" style="padding:10px 0">Sin registros en el periodo.</p>') + '</div>' +
          '<div class="sec"><h2>Fichajes</h2></div><div class="card list" style="padding:4px 14px">' + (list.length ? list.sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio)).map(j => {
            const geo = (j.geo || []).map(g => g.status === 'ok' || g.status === 'low_accuracy' ? '<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + g.lat + ',' + g.lng + '">' + (g.kind === 'in' ? 'Entrada' : 'Salida') + ' ' + icon('pin', 's') + '</a>' : '<span class="tiny muted">' + (g.kind === 'in' ? 'Entrada' : 'Salida') + ': sin ubicación</span>').join(' · ');
            return '<div class="li"><span class="av lg">' + esc(initials(D.userName(j.usuario))) + '</span><div class="grow"><b>' + esc(D.userName(j.usuario)) + '</b> <span class="small muted">' + esc(fDate(j.inicio)) + '</span><div class="small muted">' + fTime(j.inicio) + ' – ' + (j.fin ? fTime(j.fin) : 'abierta') + ' · ' + dur(workMs(j)) + ((j.auditoria || []).length ? ' · <span style="color:var(--warn)">corregida</span>' : '') + '</div><div class="small">' + geo + '</div></div><button class="btn sm soft" data-fix="' + esc(j.id) + '">' + icon('edit', 's') + '</button></div>';
          }).join('') : '<p class="muted small" style="padding:10px 0">Sin fichajes.</p>') + '</div>';
        $('#csv').onclick = () => {
          const lines = [['Persona', 'Fecha', 'Entrada', 'Salida', 'Descansos (min)', 'Tiempo neto', 'Corregida']].concat(list.map(j => [D.userName(j.usuario), j.dia, fTime(j.inicio), j.fin ? fTime(j.fin) : '', Math.round((j.descansos || []).reduce((n, b) => n + Math.max(0, Date.parse(b.end || nowIso()) - Date.parse(b.start)), 0) / 60000), dur(workMs(j)), (j.auditoria || []).length ? 'Sí' : 'No']));
          const csv = '﻿' + lines.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
          download('registro-horario-' + f.from + '.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        };
        $$('[data-fix]', out).forEach(b => b.onclick = () => fixWork(list.find(j => j.id === b.dataset.fix), load));
      } catch (e) { out.innerHTML = empty('alert', 'No se ha podido cargar', e.message); }
    };
    $('#hgo').onclick = load;
    $('#hadd').onclick = () => addWork(load);
    load();
  } };
};
function fixWork(j, after) {
  let breaks = (j.descansos || []).map(b => ({ start: localInput(b.start), end: localInput(b.end) }));
  sheet('Corregir fichaje · ' + D.userName(j.usuario), '<div class="two"><div><label class="f" style="margin-top:0">Entrada</label><input type="datetime-local" class="in" id="fs" value="' + localInput(j.inicio) + '"></div><div><label class="f" style="margin-top:0">Salida</label><input type="datetime-local" class="in" id="fe" value="' + localInput(j.fin) + '"></div></div><div id="fb"></div><button class="btn sm soft" style="margin-top:8px" id="fab">' + icon('plus', 's') + 'Añadir descanso</button><label class="f">Motivo (obligatorio)</label><input class="in" id="fr"><div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn" id="fsv">Guardar corrección</button></div>', (el, close) => {
    const drawB = () => { $('#fb').innerHTML = breaks.map((b, i) => '<div class="two" style="margin-top:6px"><div><label class="f">Inicio descanso</label><input type="datetime-local" class="in" data-bs="' + i + '" value="' + b.start + '"></div><div><label class="f">Fin <button class="na-btn" data-bx="' + i + '" style="float:right">Quitar</button></label><input type="datetime-local" class="in" data-be="' + i + '" value="' + b.end + '"></div></div>').join(''); $$('[data-bs]', el).forEach(x => x.oninput = () => breaks[x.dataset.bs].start = x.value); $$('[data-be]', el).forEach(x => x.oninput = () => breaks[x.dataset.be].end = x.value); $$('[data-bx]', el).forEach(x => x.onclick = () => { breaks.splice(Number(x.dataset.bx), 1); drawB(); }); };
    drawB();
    $('#fab').onclick = () => { breaks.push({ start: '', end: '' }); drawB(); };
    el.querySelector('[data-c]').onclick = close;
    $('#fsv').onclick = async () => {
      let body;
      try { body = { id: j.id, start: fromLocal($('#fs').value), end: fromLocal($('#fe').value), breaks: breaks.map(b => ({ start: fromLocal(b.start), end: fromLocal(b.end) })), reason: $('#fr').value }; } catch (e) { return toast(e.message, true); }
      if (!body.reason.trim()) return toast('Indica el motivo.', true);
      if (await command(() => api('workCorrect', body), 'Corrección guardada')) { close(); after(); }
    };
  });
}
function addWork(after) {
  sheet('Registrar jornada olvidada', '<label class="f" style="margin-top:0">Persona</label><select class="in" id="au">' + S.data.users.filter(u => u.activo && u.rol !== 'cliente').map(u => '<option value="' + esc(u.id) + '">' + esc(u.nombre) + '</option>').join('') + '</select><div class="two"><div><label class="f">Entrada</label><input type="datetime-local" class="in" id="as"></div><div><label class="f">Salida</label><input type="datetime-local" class="in" id="ae"></div></div><label class="f">Motivo</label><input class="in" id="ar" placeholder="Por ejemplo: olvidó fichar"><div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn" id="asv">Guardar</button></div>', (el, close) => {
    el.querySelector('[data-c]').onclick = close;
    $('#asv').onclick = async () => {
      let body; try { body = { user: $('#au').value, start: fromLocal($('#as').value), end: fromLocal($('#ae').value), reason: $('#ar').value }; } catch (e) { return toast(e.message, true); }
      if (await command(() => api('workAdd', body), 'Jornada registrada')) { close(); after(); }
    };
  });
}
function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); }

/* ---------- Buscar e historial ---------- */
VIEWS.buscar = function () {
  const f = S.bf || (S.bf = { plate: '', cliente: '', worker: isAdmin() || isClient() ? '' : me().id, period: 'month', status: '' });
  const periods = [['week', 'Esta semana'], ['month', 'Este mes'], ['3m', 'Últimos 3 meses'], ['year', 'Este año'], ['all', 'Todo']];
  const html = '<div class="card"><div class="search">' + icon('search', 's') + '<input class="in" id="bp" placeholder="Matrícula o chasis" value="' + esc(f.plate) + '" autocomplete="off"></div>' +
    '<div class="two" style="margin-top:2px">' + (isAdmin() ? '<div><label class="f">Cliente</label><select class="in" id="bc"><option value="">Todos</option>' + D.clients().map(c => '<option value="' + esc(c.id) + '" ' + (c.id === f.cliente ? 'selected' : '') + '>' + esc(c.nombre) + '</option>').join('') + '</select></div><div><label class="f">Persona</label><select class="in" id="bw"><option value="">Todo el equipo</option>' + S.data.users.filter(u => u.rol !== 'cliente').map(u => '<option value="' + esc(u.id) + '" ' + (u.id === f.worker ? 'selected' : '') + '>' + esc(u.nombre) + '</option>').join('') + '</select></div>' : '') + '</div>' +
    '<label class="f">Periodo</label><div class="chips" id="bpe">' + periods.map(p => '<button type="button" data-p="' + p[0] + '" class="' + (f.period === p[0] ? 'on' : '') + '">' + p[1] + '</button>').join('') + '</div>' +
    '<button class="btn wide" style="margin-top:14px" id="bgo">' + icon('search') + 'Buscar</button></div><div id="bout"></div>';
  return { title: isAdmin() ? 'Buscar e historial' : 'Mi historial', back: true, html: html, mount: el => {
    $$('[data-p]', el).forEach(b => b.onclick = () => { f.period = b.dataset.p; $$('[data-p]', el).forEach(x => x.classList.toggle('on', x === b)); });
    const run = async () => {
      f.plate = $('#bp').value; if (isAdmin()) { f.cliente = $('#bc').value; f.worker = $('#bw').value; }
      const t = madridDay();
      const from = { week: weekStart(t), month: t.slice(0, 8) + '01', '3m': shiftDay(t, -92), year: t.slice(0, 4) + '-01-01', all: '2000-01-01' }[f.period];
      const out = $('#bout'); out.innerHTML = '<div class="card empty" style="margin-top:10px">Buscando…</div>';
      try {
        const r = await api('history', { plate: f.plate, cliente: f.cliente, worker: f.worker, from: from, to: t, status: f.status }, 90000);
        const svc = r.services.sort((a, b) => Date.parse(b.creado) - Date.parse(a.creado));
        const work = id => r.times.filter(x => x.servicio === id && x.tipo === 'Trabajo').reduce((n, x) => n + Math.max(0, Date.parse(x.fin || nowIso()) - Date.parse(x.inicio)), 0);
        const total = svc.reduce((n, s) => n + work(s.id), 0);
        out.innerHTML = '<div class="kpis" style="margin-top:12px"><div class="kpi"><small>Servicios</small><b>' + svc.length + '</b></div><div class="kpi"><small>Entregados</small><b>' + svc.filter(s => s.cerrado).length + '</b></div><div class="kpi"><small>Horas-persona</small><b>' + Math.round(total / 360000) / 10 + '</b></div><div class="kpi"><small>Incidencias</small><b>' + r.incidents.length + '</b></div></div>' +
          (svc.length ? '<div class="card" style="margin-top:10px;padding:4px 14px"><table class="t"><tr><th>Matrícula</th><th class="hide-m">Cliente</th><th>Fecha</th><th class="hide-m">Tipo</th><th>Horas</th></tr>' + svc.map(s => '<tr class="click" data-open="' + esc(s.id) + '" data-y="' + (s.year || '') + '"><td><b>' + esc(s.matricula || s.chasis) + '</b><div class="tiny muted hide-d">' + esc(D.client(s.cliente).nombre) + '</div></td><td class="hide-m">' + esc(D.client(s.cliente).nombre) + '</td><td>' + esc(fDate(s.creado)) + '</td><td class="hide-m">' + esc(s.tipo) + '</td><td>' + dur(work(s.id)) + '</td></tr>').join('') + '</table></div>' : empty('search', 'Sin resultados', 'Prueba con otro periodo o matrícula.')) +
          (r.truncated ? '<p class="small muted" style="margin-top:8px">Se muestran los 400 más recientes. Acota la búsqueda.</p>' : '');
        $$('[data-open]', out).forEach(row => row.onclick = () => { const id = row.dataset.open; if (D.service(id)) go('servicio/' + id); else { S.archived = null; go('historico/' + id + '/' + row.dataset.y); } });
      } catch (e) { out.innerHTML = empty('alert', 'No se ha podido buscar', e.message); }
    };
    $('#bgo').onclick = run;
    $('#bp').onkeydown = e => { if (e.key === 'Enter') run(); };
  } };
};

/* ---------- Albaranes ---------- */
VIEWS.albaranes = function () {
  const t = madridDay();
  const f = S.af || (S.af = { cliente: (D.clients().find(c => c.tipo === 'empresa') || {}).id || '', from: weekStart(t), to: t });
  const gen = isAdmin() ? '<div class="card"><p class="small muted" style="margin-bottom:6px">Genera un PDF con todos los vehículos entregados en el periodo, con la firma de cada entrega y sin precios. Se guarda en la carpeta del cliente en tu Drive y se le avisa por correo para que dé su conformidad.</p>' +
    '<label class="f">Cliente</label><select class="in" id="ac">' + D.clients().map(c => '<option value="' + esc(c.id) + '" ' + (c.id === f.cliente ? 'selected' : '') + '>' + esc(c.nombre) + '</option>').join('') + '</select>' +
    '<div class="two"><div><label class="f">Desde (entrega)</label><input type="date" class="in" id="af" value="' + f.from + '"></div><div><label class="f">Hasta</label><input type="date" class="in" id="at" value="' + f.to + '"></div></div>' +
    '<button class="btn wide" style="margin-top:14px" id="ago">' + icon('file') + 'Generar albarán PDF</button></div>' : '<p class="small muted" style="margin:0 2px 4px">Si el cliente no da la conformidad desde su móvil, puede firmarla aquí en persona.</p>';
  const html = gen + '<div class="sec"><h2>Albaranes del periodo</h2></div><div id="alist"><div class="card empty">Cargando…</div></div>';
  return { title: 'Albaranes', back: isAdmin(), html: html, mount: () => {
    const list = () => loadReceipts($('#alist'), true);
    const g = $('#ago');
    if (g) g.onclick = async () => {
      f.cliente = $('#ac').value; f.from = $('#af').value; f.to = $('#at').value;
      g.disabled = true; g.textContent = 'Generando…';
      await command(() => api('receiptCreate', { cliente: f.cliente, from: f.from, to: f.to }, 120000), 'Albarán guardado en Drive');
      g.disabled = false; g.innerHTML = icon('file') + 'Generar albarán PDF';
      list();
    };
    list();
  } };
};
function receiptCard(r, staff) {
  const c = r.conformidad;
  const veh = (r.servicios || []).filter(x => typeof x === 'object');
  return '<div class="card" data-rc="' + esc(r.id) + '"><div class="row between" style="align-items:flex-start"><div class="grow"><b>' + esc(D.client(r.cliente).nombre || 'Cliente') + '</b><div class="small muted">' + esc(fDate(r.desde + 'T12:00:00Z')) + ' – ' + esc(fDate(r.hasta + 'T12:00:00Z')) + ' · ' + r.n + (r.n === 1 ? ' vehículo · ' : ' vehículos · ') + esc(r.id) + '</div></div>' + (c ? '<span class="chip ok">' + icon('check', 's') + esc(c.conformity) + '</span>' : '<span class="chip warn">Pendiente</span>') + '</div>' +
    (veh.length ? '<details class="acc" style="margin-top:4px"><summary>' + icon('chev', 's chev') + '<span class="small grow">Ver vehículos</span></summary><div class="small" style="padding:0 0 8px 24px">' + veh.map(v => '<div class="row between" style="padding:3px 0"><b>' + esc(v.matricula) + '</b><span class="muted">' + esc(v.tipo) + ' · ' + esc(fDate(v.cerrado)) + '</span></div>').join('') + '</div></details>' : '') +
    (c ? '<p class="small" style="margin-top:6px;color:var(--ok)">' + esc(c.signer) + ' · ' + esc(fDate(c.at, true)) + ' · ' + esc(c.canal) + (c.observations ? '<br><span class="muted">' + esc(c.observations) + '</span>' : '') + '</p>' : '') +
    '<div class="row" style="gap:8px;margin-top:10px"><button class="btn sm ghost" data-rdl="' + esc(r.id) + '">' + icon('download', 's') + 'PDF</button>' + (!c ? (staff ? '<button class="btn sm green" data-rsign="' + esc(r.id) + '">' + icon('sign', 's') + 'Firmar en persona</button>' : '<button class="btn sm green" data-rconf="' + esc(r.id) + '">' + icon('check', 's') + 'Dar conformidad</button>') : '') + '</div></div>';
}
async function loadReceipts(box, staff) {
  if (!box) return;
  try {
    const l = await api('receiptList', {});
    if (!box.isConnected) return;
    const pend = l.filter(r => !r.conformidad), done = l.filter(r => r.conformidad);
    box.innerHTML = l.length ? (pend.length ? '<div class="cols">' + pend.map(r => receiptCard(r, staff)).join('') + '</div>' : '') + (done.length ? (pend.length ? '<div class="sec"><h2>Con conformidad</h2></div>' : '') + '<div class="cols">' + done.map(r => receiptCard(r, staff)).join('') + '</div>' : '') : empty('file', 'Todavía no hay albaranes', staff ? '' : 'Cuando Efecto Mariposa genere el albarán de un periodo lo verás aquí.');
    $$('[data-rdl]', box).forEach(b => b.onclick = () => command(async () => { const v = await api('receiptFile', { id: b.dataset.rdl }, 90000); download(v.name, new Blob([Uint8Array.from(atob(v.data), c => c.charCodeAt(0))], { type: 'application/pdf' })); }, 'Descargado'));
    $$('[data-rsign]', box).forEach(b => b.onclick = () => signReceipt(l.find(r => r.id === b.dataset.rsign), () => loadReceipts(box, staff)));
    $$('[data-rconf]', box).forEach(b => b.onclick = () => confirmReceipt(l.find(r => r.id === b.dataset.rconf), () => loadReceipts(box, staff)));
  } catch (e) { box.innerHTML = empty('alert', 'No se han podido cargar', e.message); }
}
function sigPad(c) {
  const x = c.getContext('2d'), strokes = [];
  let active = null;
  const draw = () => { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = '#102d48'; x.lineWidth = 4.5; x.lineCap = 'round'; x.lineJoin = 'round'; strokes.forEach(st => { if (st.length < 2) return; x.beginPath(); x.moveTo(st[0][0], st[0][1]); st.slice(1).forEach(p => x.lineTo(p[0], p[1])); x.stroke(); }); };
  const pt = e => { const q = c.getBoundingClientRect(); return [(e.clientX - q.left) * c.width / q.width, (e.clientY - q.top) * c.height / q.height]; };
  c.addEventListener('pointerdown', e => { if (active !== null) return; e.preventDefault(); active = e.pointerId; strokes.push([pt(e)]); c.setPointerCapture(e.pointerId); });
  c.addEventListener('pointermove', e => { if (active !== e.pointerId) return; strokes[strokes.length - 1].push(pt(e)); draw(); });
  const stop = e => { if (active === e.pointerId) active = null; };
  c.addEventListener('pointerup', stop); c.addEventListener('pointercancel', stop);
  draw();
  return { signed: () => strokes.some(st => st.length > 3), clear: () => { strokes.length = 0; draw(); }, data: () => c.toDataURL('image/png') };
}
function conformityFields() {
  return '<label class="f">Resultado</label><div class="seg" id="kc"><button type="button" class="on" data-k="Conforme">Conforme</button><button type="button" data-k="Con observaciones">Con observaciones</button></div><div id="kobs" hidden><label class="f">Observaciones</label><textarea class="in" id="ko"></textarea></div>';
}
function mountConformity(el) {
  let v = 'Conforme';
  $$('[data-k]', el).forEach(b => b.onclick = () => { v = b.dataset.k; $$('[data-k]', el).forEach(x => x.classList.toggle('on', x === b)); $('#kobs').hidden = v === 'Conforme'; });
  return () => ({ conformity: v, observations: $('#ko').value.trim() });
}
function signReceipt(r, after) {
  sheet('Firmar conformidad en persona', '<p class="small muted">' + esc(D.client(r.cliente).nombre) + ' · ' + esc(fDate(r.desde + 'T12:00:00Z')) + ' – ' + esc(fDate(r.hasta + 'T12:00:00Z')) + ' · ' + r.n + ' vehículos</p>' +
    '<label class="f">Nombre y apellidos de quien firma</label><input class="in" id="kn" autocomplete="off">' + conformityFields() +
    '<label class="f">Firma</label><canvas class="sig" id="ksig" width="900" height="340"></canvas><div class="row between" style="margin-top:6px"><span class="tiny muted">Firma con el dedo dentro del recuadro</span><button class="btn sm soft" type="button" id="kclr">Borrar</button></div>' +
    '<div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn green" id="kgo">' + icon('sign', 's') + 'Firmar</button></div>', (el, close) => {
    const pad = sigPad($('#ksig')), get = mountConformity(el);
    $('#kclr').onclick = pad.clear;
    el.querySelector('[data-c]').onclick = close;
    $('#kgo').onclick = async () => {
      const v = get(), name = $('#kn').value.trim();
      if (!name) return toast('Indica quién firma.', true);
      if (v.conformity !== 'Conforme' && !v.observations) return toast('Escribe las observaciones.', true);
      if (!pad.signed()) return toast('Falta la firma.', true);
      if (await command(() => api('receiptConfirm', { id: r.id, conformity: v.conformity, observations: v.observations, signer: name, signature: pad.data() }, 120000), 'Conformidad firmada')) { close(); after(); }
    };
  }, { sticky: true });
}
function confirmReceipt(r, after) {
  sheet('Dar conformidad', '<p class="small muted">Albarán ' + esc(r.id) + ' · ' + r.n + ' vehículos del ' + esc(fDate(r.desde + 'T12:00:00Z')) + ' al ' + esc(fDate(r.hasta + 'T12:00:00Z')) + '. Revísalo en el PDF antes de confirmar.</p>' + conformityFields() +
    '<p class="tiny muted" style="margin-top:12px">' + icon('lock', 's') + ' Quedará registrado a tu nombre (' + esc(me().nombre) + ') con fecha y hora.</p>' +
    '<div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn green" id="kgo">Confirmar</button></div>', (el, close) => {
    const get = mountConformity(el);
    el.querySelector('[data-c]').onclick = close;
    $('#kgo').onclick = async () => {
      const v = get();
      if (v.conformity !== 'Conforme' && !v.observations) return toast('Escribe las observaciones.', true);
      if (await command(() => api('receiptConfirm', { id: r.id, conformity: v.conformity, observations: v.observations }, 120000), 'Conformidad registrada. Gracias.')) { close(); after(); }
    };
  });
}

async function shareTracking(s) {
  let r;
  if (!(await command(async () => { r = await api('shareLink', { id: s.id }); }))) return;
  const plate = s.matricula || s.chasis;
  const msg = 'Hola, aquí puedes seguir el servicio de tu vehículo ' + plate + ' con Efecto Mariposa: ' + r.url;
  const tel = String(r.telefono || '').replace(/[^0-9]/g, '');
  sheet('Compartir seguimiento', '<p class="small muted">Enlace privado de ' + esc(plate) + '. Muestra el avance, las fotos y las incidencias visibles. ' + (r.expires ? 'Disponible hasta el ' + esc(fDate(r.expires)) + '.' : 'Seguirá activo hasta ' + 15 + ' días después de la entrega.') + '</p>' +
    '<input class="in" id="shu" readonly value="' + esc(r.url) + '" style="margin-top:10px;font-size:13px">' +
    '<div class="actions" style="flex-wrap:wrap"><button class="btn ghost" id="shc">' + icon('copy', 's') + 'Copiar</button><a class="btn green" target="_blank" rel="noopener" href="https://wa.me/' + (tel.length >= 9 ? (tel.length === 9 ? '34' + tel : tel) : '') + '?text=' + encodeURIComponent(msg) + '">' + icon('chat', 's') + 'WhatsApp</a>' +
    (r.email ? '<a class="btn" href="mailto:' + esc(r.email.split(/[\s,;]+/)[0]) + '?subject=' + encodeURIComponent('Seguimiento de tu vehículo ' + plate) + '&body=' + encodeURIComponent(msg) + '">' + icon('mail', 's') + 'Email</a>' : '') + '</div>' +
    (r.email ? '' : '<p class="tiny muted" style="margin-top:10px">Este cliente no tiene email: no recibirá avisos automáticos.</p>'), (el) => {
    $('#shc').onclick = async () => { try { await navigator.clipboard.writeText(r.url); toast('Enlace copiado'); } catch (e) { $('#shu').select(); document.execCommand('copy'); toast('Enlace copiado'); } };
  });
}

/* ---------- Equipo ---------- */
const ROLE_NAMES = { admin: 'Dirección', trabajador: 'Trabajador', subcontrata: 'Subcontrata', cliente: 'Cliente' };
VIEWS.equipo = function () {
  if (!isAdmin()) return VIEWS.inicio();
  const users = S.data.users.slice().sort((a, b) => (b.activo - a.activo) || a.nombre.localeCompare(b.nombre, 'es'));
  const html = '<button class="btn green wide" id="unew">' + icon('plus') + 'Añadir persona</button><div class="card list" style="margin-top:12px;padding:4px 14px">' + users.map(u => '<div class="li" data-u="' + esc(u.id) + '" style="cursor:pointer;' + (u.activo ? '' : 'opacity:.55') + '"><span class="av lg">' + esc(initials(u.nombre)) + '</span><div class="grow"><b>' + esc(u.nombre) + '</b><div class="small muted ellipsis">' + ROLE_NAMES[u.rol] + (u.horas ? ' · ' + u.horas + ' h/sem' : '') + ' · ' + esc(accessText(u)) + '</div></div>' + (u.activo ? '' : '<span class="chip">Inactivo</span>') + icon('chev', 's') + '</div>').join('') + '</div>' +
    '<p class="tiny muted" style="margin-top:10px">Cada persona entra con su PIN personal. Solo ve los clientes que le asignes.</p>';
  return { title: 'Equipo', back: true, html: html, mount: el => {
    $('#unew').onclick = () => editUser(null);
    $$('[data-u]', el).forEach(r => r.onclick = () => editUser(S.data.users.find(u => u.id === r.dataset.u)));
  } };
};
function accessText(u) {
  if (u.rol === 'admin') return 'Todo';
  if (u.rol === 'cliente') return 'Portal de ' + ((u.acceso || [])[0] ? D.client(u.acceso[0]).nombre : '—');
  const a = u.acceso || [];
  if (!a.length) return 'Sin clientes asignados';
  return a.map(x => x === 'PARTICULARES' ? 'Particulares' : D.client(x).nombre).join(', ');
}
function editUser(u) {
  const st = u ? JSON.parse(JSON.stringify(u)) : { nombre: '', rol: 'trabajador', acceso: [], horas: 40, activo: true, empresa: '' };
  const opts = D.clients().filter(c => c.tipo === 'empresa').map(c => [c.id, c.nombre]).concat([['PARTICULARES', 'Particulares']]);
  const isDir = u && u.id === 'direccion';
  sheet(u ? 'Editar persona' : 'Nueva persona', '<label class="f" style="margin-top:0">Nombre y apellidos</label><input class="in" id="un" value="' + esc(st.nombre) + '">' +
    (isDir ? '' : '<label class="f">Rol</label><div class="seg" id="ur">' + ['trabajador', 'subcontrata', 'cliente', 'admin'].map(r => '<button type="button" data-r="' + r + '" class="' + (st.rol === r ? 'on' : '') + '">' + ROLE_NAMES[r] + '</button>').join('') + '</div>') +
    '<div id="uemp" ' + (st.rol === 'subcontrata' ? '' : 'hidden') + '><label class="f">Empresa subcontratada</label><input class="in" id="ue" value="' + esc(st.empresa) + '"></div>' +
    '<div id="uacc" ' + (st.rol === 'admin' ? 'hidden' : '') + '><label class="f" id="ual">' + (st.rol === 'cliente' ? 'Empresa a la que pertenece' : 'Clientes a los que tiene acceso') + '</label><div class="chips" id="ua">' + opts.map(o => '<button type="button" data-a="' + esc(o[0]) + '" class="' + (st.acceso.indexOf(o[0]) >= 0 ? 'on' : '') + '">' + esc(o[1]) + '</button>').join('') + '</div></div>' +
    '<div id="uhw" ' + (st.rol === 'cliente' ? 'hidden' : '') + '><label class="f">Horas semanales de contrato</label><input class="in" id="uh" type="number" min="0" max="60" value="' + esc(st.horas || 0) + '"></div>' +
    '<p class="tiny muted" id="ucl" style="margin-top:10px" ' + (st.rol === 'cliente' ? '' : 'hidden') + '>' + icon('lock', 's') + ' Solo verá los vehículos de su empresa: avance, fotos e incidencias visibles y albaranes. Nunca ve trabajadores, horas ni notas internas.</p>' +
    (u && !isDir ? '<div class="row between" style="margin-top:14px"><b style="font-size:14px">Acceso activo</b><label class="switch"><input type="checkbox" id="uact" ' + (st.activo ? 'checked' : '') + '><span></span></label></div>' : '') +
    '<div class="actions">' + (u && !isDir && u.activo ? '<button class="btn ghost" id="upin">' + icon('key', 's') + 'Nuevo PIN</button>' : '') + '<button class="btn" id="usv">Guardar</button></div>', (el, close) => {
    $$('[data-r]', el).forEach(b => b.onclick = () => { st.rol = b.dataset.r; $$('[data-r]', el).forEach(x => x.classList.toggle('on', x === b)); $('#uemp').hidden = st.rol !== 'subcontrata'; $('#uacc').hidden = st.rol === 'admin'; $('#uhw').hidden = st.rol === 'cliente'; $('#ucl').hidden = st.rol !== 'cliente'; $('#ual').textContent = st.rol === 'cliente' ? 'Empresa a la que pertenece' : 'Clientes a los que tiene acceso'; $('[data-a="PARTICULARES"]', el).hidden = st.rol === 'cliente'; if (st.rol === 'cliente') { st.acceso = st.acceso.filter(x => x !== 'PARTICULARES').slice(0, 1); $$('[data-a]', el).forEach(x => x.classList.toggle('on', st.acceso.indexOf(x.dataset.a) >= 0)); } });
    $$('[data-a]', el).forEach(b => b.onclick = () => { if (st.rol === 'cliente') { st.acceso = [b.dataset.a]; $$('[data-a]', el).forEach(x => x.classList.toggle('on', x === b)); return; } const i = st.acceso.indexOf(b.dataset.a); if (i >= 0) st.acceso.splice(i, 1); else st.acceso.push(b.dataset.a); b.classList.toggle('on'); });
    if (st.rol === 'cliente') $('[data-a="PARTICULARES"]', el).hidden = true;
    const pinBtn = $('#upin');
    if (pinBtn) pinBtn.onclick = async () => {
      if (!(await confirmSheet('Nuevo PIN', 'El PIN actual de ' + u.nombre + ' dejará de funcionar.', 'Generar nuevo PIN'))) return;
      let res; if (await command(async () => { res = await api('resetPin', { id: u.id }); })) showPin(res.nombre, res.pin);
    };
    $('#usv').onclick = async () => {
      const body = { id: u ? u.id : '', nombre: $('#un').value, rol: st.rol, acceso: st.rol === 'admin' ? [] : st.acceso, horas: Number($('#uh').value) || 0, empresa: $('#ue') ? $('#ue').value : '' };
      if ($('#uact')) body.activo = $('#uact').checked;
      if (!body.nombre.trim()) return toast('Indica el nombre.', true);
      if (body.rol !== 'admin' && !body.acceso.length) return toast(body.rol === 'cliente' ? 'Elige su empresa.' : 'Asigna al menos un cliente.', true);
      let res;
      if (await command(async () => { res = await api('saveUser', body); await sync(true); }, u ? 'Cambios guardados' : '')) { close(); if (res && res.pin) showPin(res.nombre, res.pin); }
    };
  });
}
function showPin(name, pin) {
  sheet('PIN de ' + name, '<p class="muted">Entrégale este PIN en persona. Por seguridad no se volverá a mostrar; podrá cambiarlo desde Ajustes.</p><div class="pinshow">' + esc(pin) + '</div><div class="actions"><button class="btn" data-ok>Hecho</button></div>', (el, close) => { el.querySelector('[data-ok]').onclick = close; }, { sticky: true });
}

/* ---------- Clientes ---------- */
VIEWS.clientes = function () {
  if (!isAdmin()) return VIEWS.inicio();
  const cs = D.clients().slice().sort((a, b) => (a.tipo === b.tipo ? a.nombre.localeCompare(b.nombre, 'es') : a.tipo === 'empresa' ? -1 : 1));
  const html = '<button class="btn green wide" id="cnew">' + icon('plus') + 'Añadir cliente</button><div class="card list" style="margin-top:12px;padding:4px 14px">' + cs.map(c => '<div class="li" data-c="' + esc(c.id) + '" style="cursor:pointer"><span class="ic">' + icon(c.tipo === 'empresa' ? 'building' : 'user') + '</span><div class="grow"><b>' + esc(c.nombre) + '</b><div class="small muted ellipsis">' + (c.tipo === 'empresa' ? 'Empresa' : 'Particular') + (c.protocolo === 'K2' ? ' · protocolo K2' : '') + (c.telefono ? ' · ' + esc(c.telefono) : '') + '</div></div>' + icon('chev', 's') + '</div>').join('') + '</div>' +
    '<p class="tiny muted" style="margin-top:10px">Los particulares se dan de alta solos al registrar su vehículo. Cada cliente tiene su carpeta en Drive con fotos y albaranes.</p>';
  return { title: 'Clientes', back: true, html: html, mount: el => {
    $('#cnew').onclick = () => editClient(null);
    $$('[data-c]', el).forEach(r => r.onclick = () => editClient(D.clients().find(c => c.id === r.dataset.c)));
  } };
};
function editClient(c) {
  const st = c ? JSON.parse(JSON.stringify(c)) : { nombre: '', tipo: 'empresa', protocolo: 'general', tipos: S.data.config.tiposGeneral.slice(), contacto: '', telefono: '', email: '', revisor: '', activo: true };
  sheet(c ? 'Editar cliente' : 'Nuevo cliente', '<label class="f" style="margin-top:0">Nombre</label><input class="in" id="cn" value="' + esc(st.nombre) + '">' +
    '<div class="two"><div><label class="f">Tipo</label><select class="in" id="ct"><option value="empresa" ' + (st.tipo === 'empresa' ? 'selected' : '') + '>Empresa</option><option value="particular" ' + (st.tipo === 'particular' ? 'selected' : '') + '>Particular</option></select></div><div><label class="f">Protocolo</label><select class="in" id="cp"><option value="general">General</option><option value="K2" ' + (st.protocolo === 'K2' ? 'selected' : '') + '>K2 (concesionario)</option></select></div></div>' +
    '<label class="f">Tipos de servicio (separados por comas)</label><input class="in" id="cty" value="' + esc((st.tipos || []).join(', ')) + '">' +
    '<div class="two"><div><label class="f">Persona de contacto</label><input class="in" id="cc" value="' + esc(st.contacto) + '"></div><div><label class="f">Revisa las entregas</label><input class="in" id="cr" value="' + esc(st.revisor) + '"></div></div>' +
    '<div class="two"><div><label class="f">Teléfono</label><input class="in" id="ctel" value="' + esc(st.telefono) + '"></div><div><label class="f">Emails para avisos</label><input class="in" id="cem" placeholder="uno@empresa.com, otro@empresa.com" value="' + esc(st.email) + '"></div></div>' +
    '<div class="row between" style="margin-top:14px"><div><b style="font-size:14px">Avisos por correo</b><p class="small muted">Listo, incidencias, entrega y albaranes.</p></div><label class="switch"><input type="checkbox" id="cav" ' + (st.avisos !== false ? 'checked' : '') + '><span></span></label></div>' +
    '<div class="row between" style="margin-top:14px"><b style="font-size:14px">Cliente activo</b><label class="switch"><input type="checkbox" id="ca" ' + (st.activo !== false ? 'checked' : '') + '><span></span></label></div>' +
    '<div class="actions"><button class="btn" id="csv2">Guardar</button></div>', (el, close) => {
    $('#csv2').onclick = async () => {
      const body = { id: c ? c.id : '', nombre: $('#cn').value, tipo: $('#ct').value, protocolo: $('#cp').value, tipos: $('#cty').value.split(',').map(x => x.trim()).filter(Boolean), contacto: $('#cc').value, revisor: $('#cr').value, telefono: $('#ctel').value, email: $('#cem').value, activo: $('#ca').checked, avisos: $('#cav').checked };
      if (!body.nombre.trim()) return toast('Indica el nombre.', true);
      if (await command(async () => { await api('saveClient', body); await sync(true); }, 'Cliente guardado')) close();
    };
  });
}

/* ---------- Ajustes ---------- */
VIEWS.ajustes = function () {
  const html = '<div class="card"><h2>Cambiar mi PIN</h2><p class="small muted" style="margin-top:4px">De 6 a 8 números. Evita fechas o números seguidos.</p><div class="two"><div><label class="f">Nuevo PIN</label><input class="in" id="p1" type="password" inputmode="numeric" maxlength="8"></div><div><label class="f">Repítelo</label><input class="in" id="p2" type="password" inputmode="numeric" maxlength="8"></div></div><button class="btn wide" style="margin-top:12px" id="pgo">' + icon('key') + 'Cambiar PIN</button></div>' +
    '<div class="card"><h2>Instalar la app</h2><p class="small muted" style="margin-top:4px">' + (isStandalone() ? 'Ya la estás usando como app instalada.' : (/iphone|ipad|ipod/i.test(navigator.userAgent) ? 'En iPhone: abre esta página en Safari, pulsa Compartir y después «Añadir a pantalla de inicio».' : 'En Android: abre el menú del navegador y pulsa «Instalar aplicación» o «Añadir a pantalla de inicio».')) + '</p>' + (S.installEvt ? '<button class="btn wide" style="margin-top:10px" id="ins">' + icon('phone') + 'Instalar ahora</button>' : '') + '</div>' +
    '<div class="card"><h2>Datos en este dispositivo</h2><p class="small muted" style="margin-top:4px">' + (S.queue.length ? S.queue.length + ' cambios pendientes de enviar.' : 'Todo está enviado al servidor.') + ' Última actualización: ' + (S.lastSync ? fRel(S.lastSync) : '—') + '.</p><button class="btn ghost wide" style="margin-top:10px" data-act="sync">' + icon('refresh') + 'Actualizar ahora</button></div>' +
    '<button class="btn danger wide" style="margin-top:12px" data-act="logout">' + icon('logout') + 'Cerrar sesión</button>';
  return { title: 'Ajustes', back: true, html: html, mount: () => {
    $('#pgo').onclick = async () => {
      const a = $('#p1').value, b = $('#p2').value;
      if (a !== b || !/^\d{6,8}$/.test(a)) return toast('Escribe el mismo PIN (6 a 8 números) dos veces.', true);
      await command(async () => { const r = await api('changePin', { pin: a }); S.token = r.token; LS.set('token', S.token); $('#p1').value = $('#p2').value = ''; }, 'PIN cambiado');
    };
    const ins = $('#ins'); if (ins) ins.onclick = async () => { S.installEvt.prompt(); await S.installEvt.userChoice; S.installEvt = null; render(); };
  } };
};

/* ---------- Sistema ---------- */
VIEWS.sistema = function () {
  if (!isAdmin()) return VIEWS.inicio();
  return { title: 'Sistema', back: true, html: '<div id="sys"><div class="card empty">Cargando…</div></div>', mount: async () => {
    try {
      const r = await api('systemStatus', {});
      const gb = v => (v / 1073741824).toFixed(1).replace('.', ',') + ' GB';
      const pct = r.storageLimit ? Math.min(100, Math.round(100 * r.storageUsed / r.storageLimit)) : 0;
      $('#sys').innerHTML = '<div class="card"><h2>Almacenamiento de Google</h2><div class="bar-st" style="margin:12px 0 6px"><i style="width:' + pct + '%"></i></div><p class="small muted">' + gb(r.storageUsed) + ' de ' + gb(r.storageLimit) + ' usados (' + pct + ' %). Incluye Gmail y todo tu Drive.</p></div>' +
        '<div class="card"><h2>Copias y archivo</h2><dl class="kv" style="margin-top:10px"><dt>Última copia</dt><dd>' + (r.lastBackup ? esc(fRel(r.lastBackup)) : 'Pendiente (cada noche a las 3:00)') + '</dd><dt>Último archivo</dt><dd>' + (r.lastArchive ? esc(fRel(r.lastArchive)) : 'Pendiente (día 1 de cada mes)') + '</dd><dt>Versión</dt><dd>' + esc(r.version) + '</dd></dl><p class="small muted" style="margin-top:10px">Cada noche se guarda una copia de la base (se conservan 30). Cada mes, los servicios entregados hace más de 60 días pasan al histórico anual, para que la app siga igual de rápida.</p></div>' +
        '<div class="card"><h2>Registros en la base activa</h2><dl class="kv" style="margin-top:10px">' + Object.keys(r.counts).map(k => '<dt>' + esc(k) + '</dt><dd>' + r.counts[k] + '</dd>').join('') + '</dl></div>';
    } catch (e) { $('#sys').innerHTML = empty('alert', 'No disponible', e.message); }
  } };
};

/* ============================ Almacén ============================ */

S.inv = LS.get('inv', null);
const INV_TIPOS = { producto: ['Productos', 'flask'], material: ['Material', 'tasks'], consumible: ['Consumibles', 'box'], maquina: ['Maquinaria', 'tool'] };
const NIVELES = ['lleno', 'medio', 'poco', 'agotado'];
const NIVEL_TXT = { lleno: 'Lleno', medio: 'Medio', poco: 'Queda poco', agotado: 'Agotado', '': 'Sin medir' };
const PRIOS = ['Urgente', 'Alta', 'Según trabajo', 'Posterior'];
let invLoading = false;
async function loadInv(force) {
  if (invLoading) return;
  invLoading = true;
  try {
    S.inv = await api('invSync', {});
    LS.set('inv', S.inv);
    const ae = document.activeElement;
    if (route().name === 'almacen' && !$('.scrim') && !(ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) render();
    else if (route().name === 'inicio' && !$('.scrim')) render(true);
  } catch (e) { if (!e.auth && force) toast(e.net ? 'Sin conexión: se muestran los últimos datos.' : e.message, true); }
  finally { invLoading = false; }
}
function invArt(id) { return ((S.inv && S.inv.articulos) || []).find(a => a.id === id); }
function invReplace(a) { const l = S.inv.articulos, i = l.findIndex(x => x.id === a.id); if (i >= 0) l[i] = a; else l.push(a); LS.set('inv', S.inv); }
function levelHtml(a) {
  if (a.medida === 'nivel') {
    const k = NIVELES.indexOf(a.nivel), fill = k < 0 ? 0 : 4 - k;
    const col = k === 0 || k === 1 ? 'var(--green)' : k === 2 ? '#c28a1d' : 'var(--bad)';
    return '<div class="lvl" title="' + esc(NIVEL_TXT[a.nivel || '']) + '">' + [0, 1, 2, 3].map(i => '<i style="background:' + (i < fill ? col : '#e2e8eb') + '"></i>').join('') + '</div><div class="tiny muted" style="text-align:right">' + esc(NIVEL_TXT[a.nivel || '']) + '</div>';
  }
  if (a.cantidad === '' || a.cantidad == null) return '<b class="small muted">—</b>';
  return '<b style="font-size:15px;color:' + (a.bajo ? 'var(--bad)' : 'var(--navy)') + '">' + esc(a.cantidad) + '</b> <span class="tiny muted">' + esc(a.unidad || 'uds') + '</span>' + (a.minimo !== '' && a.minimo != null ? '<div class="tiny muted" style="text-align:right">mín. ' + esc(a.minimo) + '</div>' : '');
}
function invChip(a) {
  if (a.compraEstado === 'pedido') return '<span class="chip info">Pedido</span>';
  if (a.tipo === 'maquina' && a.estado && !/operativ/i.test(a.estado)) return '<span class="chip warn">' + esc(a.estado) + '</span>';
  if (a.bajo) return '<span class="chip bad">' + (a.nivel === 'agotado' || Number(a.cantidad) === 0 ? 'Agotado' : 'Bajo') + '</span>';
  if (a.compraEstado === 'pendiente') return '<span class="chip warn">En compra</span>';
  return '';
}
function invThumb(a, big) {
  const src = a.mini && S.thumbs['inv:' + a.mini];
  return '<div class="ithumb' + (big ? ' big' : '') + '" data-ith="' + esc(a.id) + '" data-mini="' + esc(a.mini || '') + '">' + (src ? '<img src="' + src + '" alt="">' : icon((INV_TIPOS[a.tipo] || INV_TIPOS.material)[1], big ? 'l' : '')) + '</div>';
}
function loadInvThumbs(root) {
  $$('[data-ith]', root).forEach(el => {
    const mini = el.dataset.mini; if (!mini || S.thumbs['inv:' + mini] || el.dataset.l) return;
    el.dataset.l = '1';
    (async () => {
      try {
        let v = await IDB.tget('inv:' + mini);
        if (!v) { v = (await api('invFoto', { id: el.dataset.ith, size: 'mini' }, 60000)).data; IDB.tput('inv:' + mini, v); }
        S.thumbs['inv:' + mini] = v;
        $$('[data-mini="' + mini + '"]').forEach(x => { x.innerHTML = '<img src="' + v + '" alt="">'; });
      } catch (e) {}
    })();
  });
}
function invRow(a) {
  return '<div class="li irow" data-art="' + esc(a.id) + '">' + invThumb(a) + '<div class="grow" style="min-width:0"><b class="ellipsis" style="display:block;font-size:14.5px">' + esc(a.nombre) + '</b><div class="small muted ellipsis">' + esc([a.marca, a.ubicacion].filter(Boolean).join(' · ') || (INV_TIPOS[a.tipo] || [''])[0]) + '</div></div><div style="text-align:right;min-width:84px">' + levelHtml(a) + '</div>' + (invChip(a) && !(a.medida === 'nivel' && a.bajo && !a.compraEstado) ? '<div style="min-width:64px;text-align:right">' + invChip(a) + '</div>' : '') + '</div>';
}
function monthKey(v) { return madridDay(v).slice(0, 7); }
function money(n) { return (Math.round(n * 100) / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }); }

VIEWS.almacen = function () {
  if (!S.inv) return { title: 'Almacén', back: isAdmin(), html: '<div class="card empty">Cargando el almacén…</div>', mount: () => loadInv(true) };
  const tab = S.ui.invTab || 'stock', arts = S.inv.articulos;
  const falta = arts.filter(a => a.bajo).length, compra = arts.filter(a => a.compraEstado).length;
  const tabs = [['stock', 'Stock'], ['compras', 'Compras' + (compra ? ' (' + compra + ')' : '')], ['cargas', 'Llevar']].concat(isAdmin() ? [['gastos', 'Gastos']] : []);
  let body = '';
  if (tab === 'stock') body = invStockHtml();
  if (tab === 'compras') body = invComprasHtml();
  if (tab === 'cargas') body = invCargasHtml();
  if (tab === 'gastos' && isAdmin()) body = invGastosHtml();
  const mes = monthKey();
  const gastoMes = isAdmin() ? (S.inv.movimientos || []).filter(m => m.importe && (m.tipo === 'gasto' || m.tipo === 'entrada') && monthKey(m.fecha) === mes).reduce((n, m) => n + Number(m.importe), 0) : 0;
  const html = '<div class="kpis' + (isAdmin() ? '' : ' kpis3') + '"><button class="kpi" data-it="stock"><small>' + icon('box', 's') + 'Artículos</small><b>' + arts.length + '</b></button><button class="kpi ' + (falta ? 'alert' : '') + '" data-it="stock" data-only="1"><small>' + icon('alert', 's') + 'Bajo mínimo</small><b>' + falta + '</b></button><button class="kpi" data-it="compras"><small>' + icon('file', 's') + 'Por comprar</small><b>' + compra + '</b></button>' + (isAdmin() ? '<button class="kpi" data-it="gastos"><small>' + icon('calendar', 's') + 'Gasto este mes</small><b style="font-size:19px">' + money(gastoMes) + '</b></button>' : '') + '</div>' +
    '<div class="seg" style="margin:12px 0">' + tabs.map(t => '<button class="' + (tab === t[0] ? 'on' : '') + '" data-it="' + t[0] + '">' + esc(t[1]) + '</button>').join('') + '</div>' + body;
  return { title: 'Almacén', back: false, html: html, mount: el => mountInv(el) };
};
function invStockHtml() {
  const q = norm(S.ui.invQ || ''), tipo = S.ui.invTipo || '', only = !!S.ui.invOnly;
  let list = S.inv.articulos.filter(a => (!tipo || a.tipo === tipo) && (!only || a.bajo || a.compraEstado) && (!q || norm(a.nombre + a.marca + a.ubicacion + a.funcion + a.codigo).indexOf(q) >= 0));
  const order = ['producto', 'consumible', 'material', 'maquina'];
  const groups = order.map(t => [t, list.filter(a => a.tipo === t).sort((x, y) => (y.bajo - x.bajo) || x.nombre.localeCompare(y.nombre, 'es'))]).filter(g => g[1].length);
  return '<div class="row" style="gap:8px"><div class="search grow">' + icon('search', 's') + '<input class="in" id="iq" placeholder="Buscar producto, material o máquina" value="' + esc(S.ui.invQ || '') + '" autocomplete="off"></div>' + (isAdmin() ? '<button class="btn green" id="inew" aria-label="Nuevo artículo">' + icon('plus') + '<span class="hide-m">Nuevo</span></button>' : '') + '</div>' +
    '<div class="chips" style="margin-top:10px"><button class="' + (!tipo ? 'on' : '') + '" data-tp="">Todo</button>' + order.map(t => '<button class="' + (tipo === t ? 'on' : '') + '" data-tp="' + t + '">' + INV_TIPOS[t][0] + '</button>').join('') + '<button class="' + (only ? 'on' : '') + '" id="ionly">' + icon('alert', 's') + ' Lo que falta</button></div>' +
    (groups.length ? groups.map(g => '<div class="sec"><h2>' + INV_TIPOS[g[0]][0] + ' · ' + g[1].length + '</h2></div><div class="card list" style="padding:2px 14px">' + g[1].map(invRow).join('') + '</div>').join('') : empty('search', 'Nada que mostrar', only ? 'No falta nada. ¡Todo en orden!' : 'Prueba con otra búsqueda.')) +
    '<p class="tiny muted" style="text-align:center;margin-top:12px">Toca un artículo para registrar lo que usas o avisar de que se acaba.</p>';
}
function invComprasHtml() {
  const list = S.inv.articulos.filter(a => a.compraEstado);
  if (!list.length) return empty('check', 'Lista de compra vacía', 'Cuando algo baje del mínimo o alguien avise de que se acaba, aparecerá aquí.');
  const pr = a => { const i = PRIOS.findIndex(p => norm(p) === norm(a.compraPrioridad)); return i < 0 ? 9 : i; };
  const groups = [['pendiente', 'Por pedir'], ['pedido', 'Pedido, pendiente de recibir']].map(g => [g[1], list.filter(a => a.compraEstado === g[0]).sort((x, y) => pr(x) - pr(y))]).filter(g => g[1].length);
  return (isAdmin() ? '<button class="btn ghost wide" id="iaddbuy">' + icon('plus', 's') + 'Añadir a la compra</button>' : '') +
    groups.map(g => '<div class="sec"><h2>' + g[0] + ' · ' + g[1].length + '</h2></div><div class="cols">' + g[1].map(a => '<div class="card"><div class="row" style="align-items:flex-start">' + invThumb(a) + '<div class="grow" style="min-width:0"><div class="row between"><b class="ellipsis">' + esc(a.nombre) + '</b>' + (a.compraPrioridad ? '<span class="chip ' + (/urgente/i.test(a.compraPrioridad) ? 'bad' : /alta/i.test(a.compraPrioridad) ? 'warn' : '') + '">' + esc(a.compraPrioridad) + '</span>' : '') + '</div><div class="small muted">' + esc([a.compraCantidad, a.compraMotivo].filter(Boolean).join(' · ') || 'Reponer') + '</div>' + (isAdmin() && (a.proveedor || a.enlace) ? '<div class="small" style="margin-top:3px">' + esc(a.proveedor || '') + (a.enlace ? ' <a href="' + esc(a.enlace) + '" target="_blank" rel="noopener">Ver tienda ' + icon('chev', 's') + '</a>' : '') + '</div>' : '') + '</div></div>' +
      (isAdmin() ? '<div class="row" style="gap:6px;margin-top:10px">' + (a.compraEstado === 'pendiente' ? '<button class="btn sm soft" data-bp="' + esc(a.id) + '">Marcar pedido</button>' : '') + '<button class="btn sm green" data-br="' + esc(a.id) + '">' + icon('check', 's') + 'Recibido</button><button class="btn sm ghost" data-bq="' + esc(a.id) + '">Quitar</button></div>' : '') + '</div>').join('') + '</div>').join('');
}
function cargaKey(id) { return 'carga:' + id + ':' + madridDay(); }
function invCargasHtml() {
  const cs = S.inv.cargas || [];
  return '<p class="small muted" style="margin:0 2px 10px">Marca lo que cargas antes de salir. Las marcas se reinician cada día.</p>' + (isAdmin() ? '<button class="btn ghost wide" style="margin-bottom:10px" data-cg="">' + icon('plus', 's') + 'Nueva lista de carga</button>' : '') +
    '<div class="cols">' + cs.map(c => {
      const done = LS.get(cargaKey(c.id), {});
      const n = (c.base || []).length, k = (c.base || []).filter((x, i) => done[i]).length;
      return '<div class="card"><div class="row between"><h2>' + esc(c.nombre) + '</h2><span class="row" style="gap:6px"><span class="small ' + (n && k === n ? '' : 'muted') + '" style="' + (n && k === n ? 'color:var(--green);font-weight:650' : '') + '">' + k + '/' + n + '</span>' + (isAdmin() ? '<button class="iconbtn" data-cg="' + esc(c.id) + '" aria-label="Editar">' + icon('edit', 's') + '</button>' : '') + '</span></div>' +
        '<p class="tiny muted" style="margin:8px 0 2px;font-weight:650;text-transform:uppercase;letter-spacing:.05em">Llevar siempre</p>' + (c.base || []).map((x, i) => '<label class="check" style="padding:6px 0"><input type="checkbox" data-ck="' + esc(c.id) + '" data-i="' + i + '" ' + (done[i] ? 'checked' : '') + '> <span>' + esc(x) + '</span></label>').join('') +
        ((c.segun || []).length ? '<p class="tiny muted" style="margin:10px 0 4px;font-weight:650;text-transform:uppercase;letter-spacing:.05em">Según el trabajo</p><ul class="small" style="margin:0;padding-left:18px">' + c.segun.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
        ((c.no || []).length ? '<p class="tiny" style="margin:10px 0 4px;font-weight:650;text-transform:uppercase;letter-spacing:.05em;color:var(--bad)">No llevar por defecto</p><ul class="small muted" style="margin:0;padding-left:18px">' + c.no.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') + '</div>';
    }).join('') + '</div>' +
    ((S.inv.ubicaciones || []).length ? '<details class="card" style="margin-top:12px"><summary style="cursor:pointer;font-weight:650">' + icon('pin', 's') + ' Dónde se guarda cada cosa</summary><table class="t" style="margin-top:8px"><tr><th>Lugar</th><th>Contenido</th></tr>' + S.inv.ubicaciones.map(u => '<tr><td><b>' + esc(u.ubicacion) + '</b><div class="tiny muted">' + esc(u.seccion) + '</div></td><td>' + esc(u.material) + '<div class="tiny muted">' + esc(u.regla) + '</div></td></tr>').join('') + '</table></details>' : '');
}
function invGastosHtml() {
  const m = S.ui.invMes || monthKey();
  const movs = (S.inv.movimientos || []).filter(x => x.importe && (x.tipo === 'gasto' || x.tipo === 'entrada') && monthKey(x.fecha) === m).sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const total = movs.reduce((n, x) => n + Number(x.importe), 0);
  const cats = {};
  movs.forEach(x => { const c = x.categoria || 'Otros'; cats[c] = (cats[c] || 0) + Number(x.importe); });
  const max = Math.max(1, ...Object.values(cats));
  const label = new Date(m + '-15T12:00:00Z').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return '<div class="card"><div class="row between"><button class="iconbtn" data-mes="-1" aria-label="Mes anterior">' + icon('back') + '</button><div style="text-align:center"><div class="small muted" style="text-transform:capitalize">' + esc(label) + '</div><b style="font-size:24px;color:var(--navy)">' + money(total) + '</b></div><button class="iconbtn" data-mes="1" aria-label="Mes siguiente">' + icon('chev') + '</button></div>' +
    (Object.keys(cats).length ? '<div style="margin-top:12px">' + Object.keys(cats).sort((a, b) => cats[b] - cats[a]).map(c => '<div style="margin-top:8px"><div class="row between small"><span>' + esc(c) + '</span><b>' + money(cats[c]) + '</b></div><div class="bar-st" style="margin-top:4px"><i style="width:' + Math.round(100 * cats[c] / max) + '%;background:var(--green)"></i></div></div>').join('') + '</div>' : '') + '</div>' +
    '<button class="btn green wide" style="margin-top:10px" id="igasto">' + icon('plus') + 'Añadir gasto</button>' +
    '<div class="sec"><h2>Movimientos del mes</h2><button class="link" id="icsv">' + icon('download', 's') + ' CSV</button></div><div class="card list" style="padding:2px 14px">' + (movs.length ? movs.map(x => '<div class="li"><div class="grow"><b style="font-size:14px">' + esc(x.concepto || (invArt(x.articulo) || {}).nombre || 'Compra') + '</b><div class="small muted">' + esc(fDate(x.fecha)) + ' · ' + esc(x.categoria || 'Otros') + (x.tipo === 'entrada' ? ' · compra de almacén' : '') + (x.nota ? ' · ' + esc(x.nota) : '') + '</div></div><b>' + money(Number(x.importe)) + '</b>' + (x.tipo === 'gasto' ? '<button class="iconbtn" data-gdel="' + esc(x.id) + '" aria-label="Anular">' + icon('trash', 's') + '</button>' : '') + '</div>').join('') : '<p class="muted small" style="padding:10px 0">Sin gastos este mes. Las compras recibidas en el almacén con importe aparecen aquí solas.</p>') + '</div>';
}

function mountInv(el) {
  loadInvThumbs(el);
  if (!S.invFresh || Date.now() - S.invFresh > 20000) { S.invFresh = Date.now(); loadInv(); }
  $$('[data-it]', el).forEach(b => b.onclick = () => { S.ui.invTab = b.dataset.it; if (b.dataset.only) S.ui.invOnly = true; saveUi(); render(); });
  $$('[data-tp]', el).forEach(b => b.onclick = () => { S.ui.invTipo = b.dataset.tp; saveUi(); render(); });
  const on = $('#ionly'); if (on) on.onclick = () => { S.ui.invOnly = !S.ui.invOnly; saveUi(); render(); };
  const qi = $('#iq');
  if (qi) { let t; qi.oninput = () => { clearTimeout(t); t = setTimeout(() => { S.ui.invQ = qi.value; saveUi(); const p = qi.selectionStart; render(); const n = $('#iq'); n.focus(); n.setSelectionRange(p, p); }, 250); }; }
  const nw = $('#inew'); if (nw) nw.onclick = () => editArt(null);
  $$('[data-art]', el).forEach(r => r.onclick = () => artSheet(invArt(r.dataset.art)));
  $$('[data-bp]', el).forEach(b => b.onclick = () => invDo(b.dataset.bp, { tipo: 'pedido' }, 'Marcado como pedido'));
  $$('[data-bq]', el).forEach(b => b.onclick = () => invDo(b.dataset.bq, { tipo: 'quitar' }, 'Quitado de la compra'));
  $$('[data-br]', el).forEach(b => b.onclick = () => entradaSheet(invArt(b.dataset.br)));
  const ab = $('#iaddbuy'); if (ab) ab.onclick = () => pickArt(a => compraSheet(a));
  $$('[data-ck]', el).forEach(c => c.onchange = () => { const k = cargaKey(c.dataset.ck), v = LS.get(k, {}); v[c.dataset.i] = c.checked; LS.set(k, v); render(); });
  $$('[data-cg]', el).forEach(b => b.onclick = () => editCarga((S.inv.cargas || []).find(c => c.id === b.dataset.cg) || null));
  $$('[data-mes]', el).forEach(b => b.onclick = () => { const m = S.ui.invMes || monthKey(); const d = new Date(m + '-15T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + Number(b.dataset.mes)); S.ui.invMes = d.toISOString().slice(0, 7); saveUi(); render(); });
  const g = $('#igasto'); if (g) g.onclick = gastoSheet;
  $$('[data-gdel]', el).forEach(b => b.onclick = async () => { if (await confirmSheet('Anular gasto', 'El gasto dejará de contar en el total.', 'Anular', true)) { if (await command(() => api('invGasto', { borrar: b.dataset.gdel }), 'Gasto anulado')) loadInv(true); } });
  const csv = $('#icsv'); if (csv) csv.onclick = () => {
    const m = S.ui.invMes || monthKey();
    const rows = [['Fecha', 'Concepto', 'Categoría', 'Importe', 'Nota']].concat((S.inv.movimientos || []).filter(x => x.importe && (x.tipo === 'gasto' || x.tipo === 'entrada') && monthKey(x.fecha) === m).map(x => [madridDay(x.fecha), x.concepto || (invArt(x.articulo) || {}).nombre || '', x.categoria || '', String(x.importe).replace('.', ','), x.nota || '']));
    download('gastos-' + m + '.csv', new Blob(['﻿' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  };
}
async function invDo(id, body, okMsg) {
  let r;
  if (await command(async () => { r = await api('invMove', Object.assign({ id: id }, body)); }, okMsg)) { invReplace(r); render(); return r; }
  return null;
}
function artSheet(a) {
  if (!a) return;
  const adm = isAdmin();
  const hist = (S.inv.movimientos || []).filter(m => m.articulo === a.id).slice(-6).reverse();
  sheet(a.nombre, '<div class="row" style="gap:12px;align-items:flex-start">' + invThumb(a, true) + '<div class="grow"><div class="small muted">' + esc([(INV_TIPOS[a.tipo] || [''])[0], a.marca, a.codigo].filter(Boolean).join(' · ')) + '</div>' + (a.funcion ? '<p style="margin-top:4px">' + esc(a.funcion) + '</p>' : '') + '<div class="row" style="gap:8px;margin-top:6px">' + invChip(a) + (a.ubicacion ? '<span class="small muted">' + icon('pin', 's') + ' ' + esc(a.ubicacion) + '</span>' : '') + '</div></div><div style="min-width:80px;text-align:right">' + levelHtml(a) + '</div></div>' +
    (a.precaucion ? '<div class="banner warn" style="margin-top:12px">' + icon('alert') + '<span class="small">' + esc(a.precaucion) + '</span></div>' : '') +
    (a.notas ? '<p class="small muted" style="margin-top:10px">' + esc(a.notas) + '</p>' : '') +
    (a.compraEstado ? '<p class="small" style="margin-top:10px;color:var(--warn)">' + icon('file', 's') + ' En la lista de compra' + (a.compraMotivo ? ': ' + esc(a.compraMotivo) : '') + '</p>' : '') +
    (a.tipo === 'maquina' ? '<button class="btn ghost wide" style="margin-top:14px" data-a="warn">' + icon('alert', 's') + 'Avisar de un problema</button>' : '<div class="two" style="margin-top:14px"><button class="btn green" data-a="use">' + icon('check', 's') + 'He usado</button><button class="btn ghost" data-a="warn">' + icon('alert', 's') + 'Se está acabando</button></div>') +
    '<button class="btn soft wide" style="margin-top:8px" data-a="photo">' + icon('camera', 's') + (a.foto ? 'Cambiar foto' : 'Añadir foto') + '</button>' +
    (adm ? '<div class="sec"><h2>Dirección</h2></div><div class="two"><button class="btn ghost" data-a="in">' + icon('download', 's') + 'Entrada / compra</button><button class="btn ghost" data-a="adj">' + icon('sliders', 's') + 'Ajustar stock</button></div><div class="two" style="margin-top:8px"><button class="btn ghost" data-a="buy">' + icon('file', 's') + (a.compraEstado ? 'Editar compra' : 'Añadir a la compra') + '</button><button class="btn ghost" data-a="edit">' + icon('edit', 's') + 'Editar ficha</button></div>' +
      (a.tipo === 'maquina' ? '<label class="f">Estado de la máquina</label><div class="chips">' + ['Operativa', 'En revisión', 'Averiada', 'Prestada'].map(x => '<button type="button" data-est="' + x + '" class="' + (norm(a.estado) === norm(x) ? 'on' : '') + '">' + x + '</button>').join('') + '</div>' : '') +
      (a.precio ? '<p class="small muted" style="margin-top:10px">Último precio: ' + money(Number(a.precio)) + (a.medida === 'cantidad' ? ' / ' + esc(a.unidad || 'ud') : '') + '</p>' : '') : '') +
    (hist.length ? '<div class="sec"><h2>Últimos movimientos</h2></div><div class="list">' + hist.map(m => '<div class="li" style="padding:7px 0"><div class="grow small"><b>' + esc({ consumo: 'Uso', aviso: 'Aviso', entrada: 'Entrada', ajuste: 'Ajuste' }[m.tipo] || m.tipo) + '</b> · ' + esc(m.nivel ? NIVEL_TXT[m.nivel] : (m.cantidad !== '' ? m.cantidad + ' ' + (a.unidad || '') : '')) + (m.nota ? ' · ' + esc(m.nota) : '') + '<div class="tiny muted">' + esc(D.userName(m.usuario)) + ' · ' + esc(fRel(m.fecha)) + '</div></div>' + (m.importe ? '<b class="small">' + money(Number(m.importe)) + '</b>' : '') + '</div>').join('') + '</div>' : ''), (el, close) => {
    loadInvThumbs(el);
    const act = { use: () => useSheet(a), warn: () => warnSheet(a), in: () => entradaSheet(a), adj: () => ajusteSheet(a), buy: () => compraSheet(a), edit: () => editArt(a), photo: () => artPhoto(a) };
    $$('[data-a]', el).forEach(b => b.onclick = () => { close(); act[b.dataset.a](); });
    $$('[data-est]', el).forEach(b => b.onclick = async () => { close(); await invDo(a.id, { tipo: 'estado', estado: b.dataset.est }, 'Estado actualizado'); });
  });
}
function levelPicker(cur) { return '<div class="seg" id="lv">' + NIVELES.map(n => '<button type="button" data-lv="' + n + '" class="' + (cur === n ? 'on' : '') + '">' + NIVEL_TXT[n] + '</button>').join('') + '</div>'; }
function mountLevel(el, start) { let v = start; $$('[data-lv]', el).forEach(b => b.onclick = () => { v = b.dataset.lv; $$('[data-lv]', el).forEach(x => x.classList.toggle('on', x === b)); }); return () => v; }
function useSheet(a) {
  const mine = D.open().filter(s => D.mine(s));
  sheet('He usado · ' + a.nombre, (a.medida === 'nivel' ? '<label class="f" style="margin-top:0">¿Cómo queda?</label>' + levelPicker(a.nivel) : '<label class="f" style="margin-top:0">Cantidad usada (' + esc(a.unidad || 'uds') + ')</label><input class="in" id="uq" type="number" min="1" inputmode="numeric" value="1">') +
    (mine.length ? '<label class="f">Vehículo (opcional)</label><select class="in" id="us"><option value="">Sin vincular</option>' + mine.map(s => '<option value="' + esc(s.id) + '">' + esc(s.matricula || s.chasis) + ' · ' + esc(D.client(s.cliente).nombre) + '</option>').join('') + '</select>' : '') +
    '<div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn green" id="ugo">Guardar</button></div>', (el, close) => {
    const lv = a.medida === 'nivel' ? mountLevel(el, a.nivel) : null;
    el.querySelector('[data-c]').onclick = close;
    $('#ugo').onclick = async () => {
      const body = { tipo: 'consumo', servicio: $('#us') ? $('#us').value : '' };
      if (lv) { body.nivel = lv(); if (!body.nivel) return toast('Elige cómo queda.', true); } else { body.cantidad = Number($('#uq').value); if (!(body.cantidad > 0)) return toast('Indica la cantidad.', true); }
      close(); const r = await invDo(a.id, body, 'Registrado');
      if (r && r.compraEstado === 'pendiente' && !a.compraEstado) toast('Registrado. Queda poco: añadido a la lista de compra.');
    };
  });
}
function warnSheet(a) {
  const maq = a.tipo === 'maquina';
  sheet(maq ? 'Avisar de un problema' : 'Se está acabando', '<p class="muted">' + esc(a.nombre) + (maq ? ' quedará marcada «En revisión» y dirección lo verá.' : ' pasará a la lista de compra y dirección lo verá.') + '</p><label class="f">' + (maq ? '¿Qué le pasa?' : 'Comentario (opcional)') + '</label><input class="in" id="wn" placeholder="' + (maq ? 'Por ejemplo: pierde presión' : 'Por ejemplo: queda para 2 servicios') + '"><div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn" id="wgo">Avisar</button></div>', (el, close) => {
    el.querySelector('[data-c]').onclick = close;
    $('#wgo').onclick = () => { const n = $('#wn').value; if (maq && !n.trim()) return toast('Cuenta brevemente qué le pasa.', true); close(); invDo(a.id, { tipo: 'aviso', nota: n }, 'Aviso enviado. Gracias.'); };
  });
}
function entradaSheet(a) {
  if (!a) return;
  sheet('Entrada · ' + a.nombre, (a.medida === 'nivel' ? '<label class="f" style="margin-top:0">¿Cómo queda?</label>' + levelPicker('lleno') + '<label class="f">Unidades compradas (opcional)</label><input class="in" id="eq" type="number" min="0" inputmode="numeric">' : '<label class="f" style="margin-top:0">Cantidad recibida (' + esc(a.unidad || 'uds') + ')</label><input class="in" id="eq" type="number" min="1" inputmode="numeric" value="1">') +
    '<label class="f">Importe total (€, opcional)</label><input class="in" id="ei" inputmode="decimal" placeholder="0,00"><p class="tiny muted" style="margin-top:6px">Si pones el importe, contará en los gastos del mes. La compra sale de la lista.</p>' +
    '<div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn green" id="ego">Registrar entrada</button></div>', (el, close) => {
    const lv = a.medida === 'nivel' ? mountLevel(el, 'lleno') : null;
    el.querySelector('[data-c]').onclick = close;
    $('#ego').onclick = () => { const body = { tipo: 'entrada', cantidad: Number($('#eq').value) || 0, importe: $('#ei').value }; if (lv) body.nivel = lv(); else if (!(body.cantidad > 0)) return toast('Indica la cantidad.', true); close(); invDo(a.id, body, 'Entrada registrada').then(r => { if (r && body.importe) loadInv(); }); };
  });
}
function ajusteSheet(a) {
  sheet('Ajustar stock · ' + a.nombre, (a.medida === 'nivel' ? '<label class="f" style="margin-top:0">Nivel real</label>' + levelPicker(a.nivel) : '<label class="f" style="margin-top:0">Cantidad real contada (' + esc(a.unidad || 'uds') + ')</label><input class="in" id="aq" type="number" min="0" inputmode="numeric" value="' + esc(a.cantidad) + '">') +
    '<label class="f">Motivo (opcional)</label><input class="in" id="an" placeholder="Recuento, rotura, pérdida…"><div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn" id="ago2">Guardar</button></div>', (el, close) => {
    const lv = a.medida === 'nivel' ? mountLevel(el, a.nivel) : null;
    el.querySelector('[data-c]').onclick = close;
    $('#ago2').onclick = () => { const body = { tipo: 'ajuste', nota: $('#an').value }; if (lv) { body.nivel = lv(); if (!body.nivel) return toast('Elige el nivel.', true); } else body.cantidad = Number($('#aq').value); close(); invDo(a.id, body, 'Stock ajustado'); };
  });
}
function compraSheet(a) {
  sheet('Lista de compra · ' + a.nombre, '<label class="f" style="margin-top:0">Prioridad</label><div class="chips" id="cpr">' + PRIOS.map(p => '<button type="button" data-p="' + p + '" class="' + (norm(a.compraPrioridad || 'Alta') === norm(p) ? 'on' : '') + '">' + p + '</button>').join('') + '</div>' +
    '<label class="f">Cantidad a comprar</label><input class="in" id="cq" value="' + esc(a.compraCantidad) + '" placeholder="Ej.: 2 garrafas de 5 L"><label class="f">Motivo</label><input class="in" id="cm" value="' + esc(a.compraMotivo) + '" placeholder="Ej.: para IFEMA">' +
    '<div class="actions">' + (a.compraEstado ? '<button class="btn ghost" id="cdel">Quitar</button>' : '<button class="btn ghost" data-c>Cancelar</button>') + '<button class="btn" id="cgo">Guardar</button></div>', (el, close) => {
    let p = a.compraPrioridad || 'Alta';
    $$('[data-p]', el).forEach(b => b.onclick = () => { p = b.dataset.p; $$('[data-p]', el).forEach(x => x.classList.toggle('on', x === b)); });
    const c = el.querySelector('[data-c]'); if (c) c.onclick = close;
    const d = $('#cdel'); if (d) d.onclick = () => { close(); invDo(a.id, { tipo: 'quitar' }, 'Quitado de la compra'); };
    $('#cgo').onclick = () => { const body = { tipo: 'compra', prioridad: p, cantidadTxt: $('#cq').value, motivo: $('#cm').value }; close(); invDo(a.id, body, 'Añadido a la compra'); };
  });
}
function pickArt(cb) {
  sheet('¿Qué hay que comprar?', '<div class="search">' + icon('search', 's') + '<input class="in" id="pq" placeholder="Buscar en el almacén" autocomplete="off"></div><div class="list" id="pl" style="margin-top:6px;max-height:50vh;overflow:auto"></div><button class="btn ghost wide" style="margin-top:10px" id="pnew">' + icon('plus', 's') + 'Es algo nuevo: crear artículo</button>', (el, close) => {
    const draw = () => { const q = norm($('#pq').value); $('#pl').innerHTML = S.inv.articulos.filter(a => !q || norm(a.nombre + a.marca).indexOf(q) >= 0).slice(0, 40).map(a => '<div class="li" data-pk="' + esc(a.id) + '" style="cursor:pointer">' + invThumb(a) + '<b class="grow" style="font-size:14px">' + esc(a.nombre) + '</b>' + invChip(a) + '</div>').join(''); $$('[data-pk]', el).forEach(r => r.onclick = () => { close(); cb(invArt(r.dataset.pk)); }); };
    $('#pq').oninput = draw; draw();
    $('#pnew').onclick = () => { close(); editArt(null, true); };
  });
}
function editArt(a, toBuy) {
  const st = a ? Object.assign({}, a) : { tipo: 'producto', medida: 'nivel', nivel: '', cantidad: '', minimo: '', unidad: 'uds' };
  sheet(a ? 'Editar ficha' : 'Nuevo artículo', '<label class="f" style="margin-top:0">Nombre</label><input class="in" id="fn" value="' + esc(st.nombre || '') + '">' +
    '<label class="f">Tipo</label><div class="seg" id="ft">' + Object.keys(INV_TIPOS).map(t => '<button type="button" data-t="' + t + '" class="' + (st.tipo === t ? 'on' : '') + '">' + INV_TIPOS[t][0] + '</button>').join('') + '</div>' +
    '<div class="two"><div><label class="f">Marca</label><input class="in" id="fm" value="' + esc(st.marca || '') + '"></div><div><label class="f">Ubicación</label><input class="in" id="fu" value="' + esc(st.ubicacion || '') + '"></div></div>' +
    '<label class="f">Para qué se usa</label><input class="in" id="ff" value="' + esc(st.funcion || '') + '">' +
    '<label class="f">Cómo se controla</label><div class="seg" id="fmd"><button type="button" data-md="nivel" class="' + (st.medida === 'nivel' ? 'on' : '') + '">Por nivel</button><button type="button" data-md="cantidad" class="' + (st.medida !== 'nivel' ? 'on' : '') + '">Por cantidad</button></div>' +
    '<div id="fcant" ' + (st.medida === 'nivel' ? 'hidden' : '') + '><div class="two"><div><label class="f">Cantidad</label><input class="in" id="fq" type="number" min="0" value="' + esc(st.cantidad) + '"></div><div><label class="f">Unidad</label><input class="in" id="fun" value="' + esc(st.unidad || 'uds') + '"></div></div><label class="f">Mínimo (avisa al llegar aquí)</label><input class="in" id="fmin" type="number" min="0" value="' + esc(st.minimo) + '"></div>' +
    '<div id="fniv" ' + (st.medida === 'nivel' ? '' : 'hidden') + '><label class="f">Nivel actual</label>' + levelPicker(st.nivel) + '</div>' +
    '<label class="f">Precaución de uso</label><textarea class="in" id="fp" style="min-height:60px">' + esc(st.precaucion || '') + '</textarea>' +
    '<div class="two"><div><label class="f">Proveedor</label><input class="in" id="fpr" value="' + esc(st.proveedor || '') + '"></div><div><label class="f">Enlace de compra</label><input class="in" id="fe" value="' + esc(st.enlace || '') + '" placeholder="https://"></div></div>' +
    '<label class="f">Notas</label><input class="in" id="fno" value="' + esc(st.notas || '') + '">' +
    '<div class="actions">' + (a ? '<button class="btn danger" id="fdel">' + icon('trash', 's') + 'Dar de baja</button>' : '') + '<button class="btn" id="fsv">Guardar</button></div>', (el, close) => {
    $$('[data-t]', el).forEach(b => b.onclick = () => { st.tipo = b.dataset.t; $$('[data-t]', el).forEach(x => x.classList.toggle('on', x === b)); });
    $$('[data-md]', el).forEach(b => b.onclick = () => { st.medida = b.dataset.md; $$('[data-md]', el).forEach(x => x.classList.toggle('on', x === b)); $('#fcant').hidden = st.medida === 'nivel'; $('#fniv').hidden = st.medida !== 'nivel'; });
    const lv = mountLevel(el, st.nivel);
    const save = async extra => {
      const body = Object.assign({ id: a ? a.id : '', nombre: $('#fn').value, tipo: st.tipo, marca: $('#fm').value, ubicacion: $('#fu').value, funcion: $('#ff').value, medida: st.medida, nivel: lv(), cantidad: $('#fq').value, unidad: $('#fun').value, minimo: $('#fmin').value, precaucion: $('#fp').value, proveedor: $('#fpr').value, enlace: $('#fe').value, notas: $('#fno').value }, extra || {});
      if (!body.nombre.trim()) return toast('Indica el nombre.', true);
      let r; if (await command(async () => { r = await api('invSave', body); }, extra ? 'Dado de baja' : 'Guardado')) { close(); if (extra) S.inv.articulos = S.inv.articulos.filter(x => x.id !== r.id); else invReplace(r); render(); if (toBuy && r && !extra) compraSheet(r); }
    };
    $('#fsv').onclick = () => save();
    const del = $('#fdel'); if (del) del.onclick = async () => { if (await confirmSheet('Dar de baja', a.nombre + ' dejará de aparecer en el almacén. El historial se conserva.', 'Dar de baja', true)) save({ activo: false }); };
  });
}
async function artPhoto(a) {
  const files = await pickFiles(); if (!files.length) return;
  toast('Subiendo foto…');
  try {
    const data = await compress(files[0], 1400, 0.82), thumb = await compress(files[0], 300, 0.7);
    let r; if (await command(async () => { r = await api('invPhoto', { id: a.id, data: data, thumb: thumb }, 120000); }, 'Foto guardada')) { S.thumbs['inv:' + r.mini] = thumb; IDB.tput('inv:' + r.mini, thumb); invReplace(r); render(); }
  } catch (e) { toast(e.message, true); }
}
function editCarga(c) {
  sheet(c ? 'Editar lista de carga' : 'Nueva lista de carga', '<label class="f" style="margin-top:0">Nombre</label><input class="in" id="kn2" value="' + esc(c ? c.nombre : '') + '" placeholder="Ej.: Particular integral">' +
    '<label class="f">Llevar siempre (una cosa por línea)</label><textarea class="in" id="kb">' + esc(c ? (c.base || []).join('\n') : '') + '</textarea>' +
    '<label class="f">Según el trabajo</label><textarea class="in" id="ks" style="min-height:60px">' + esc(c ? (c.segun || []).join('\n') : '') + '</textarea>' +
    '<label class="f">No llevar por defecto</label><textarea class="in" id="kno" style="min-height:60px">' + esc(c ? (c.no || []).join('\n') : '') + '</textarea>' +
    '<div class="actions">' + (c ? '<button class="btn danger" id="kdel">' + icon('trash', 's') + 'Borrar</button>' : '') + '<button class="btn" id="ksv">Guardar</button></div>', (el, close) => {
    $('#ksv').onclick = async () => { if (await command(() => api('invCarga', { id: c ? c.id : '', nombre: $('#kn2').value, base: $('#kb').value, segun: $('#ks').value, no: $('#kno').value }), 'Lista guardada')) { close(); loadInv(true); } };
    const d = $('#kdel'); if (d) d.onclick = async () => { if (await confirmSheet('Borrar lista', 'Se borrará «' + c.nombre + '».', 'Borrar', true)) { if (await command(() => api('invCarga', { id: c.id, borrar: true }), 'Lista borrada')) { close(); loadInv(true); } } };
  });
}
function gastoSheet() {
  const cats = (S.inv && S.inv.categorias) || ['Otros'];
  sheet('Añadir gasto', '<label class="f" style="margin-top:0">Concepto</label><input class="in" id="gc" placeholder="Ej.: Gasolina, peaje, herramienta…"><div class="two"><div><label class="f">Importe (€)</label><input class="in" id="gi" inputmode="decimal" placeholder="0,00"></div><div><label class="f">Fecha</label><input class="in" id="gf" type="date" value="' + madridDay() + '"></div></div>' +
    '<label class="f">Categoría</label><div class="chips" id="gk">' + cats.map((c, i) => '<button type="button" data-k="' + esc(c) + '" class="' + (i === cats.length - 1 ? 'on' : '') + '">' + esc(c) + '</button>').join('') + '</div>' +
    '<label class="f">Nota (opcional)</label><input class="in" id="gn"><div class="actions"><button class="btn ghost" data-c>Cancelar</button><button class="btn green" id="ggo">Guardar</button></div>', (el, close) => {
    let k = cats[cats.length - 1];
    $$('[data-k]', el).forEach(b => b.onclick = () => { k = b.dataset.k; $$('[data-k]', el).forEach(x => x.classList.toggle('on', x === b)); });
    el.querySelector('[data-c]').onclick = close;
    $('#ggo').onclick = async () => { if (await command(() => api('invGasto', { concepto: $('#gc').value, importe: $('#gi').value, fecha: $('#gf').value, categoria: k, nota: $('#gn').value }), 'Gasto guardado')) { close(); loadInv(true); } };
  });
}

/* ============================ Portal del cliente ============================ */

const ETAPAS = ['Recibido', 'Limpieza', 'Calidad', 'Listo', 'Entregado'];
function etapaChip(s) {
  if (s.aviso && !s.cerrado) return '<span class="chip warn">Aviso</span>';
  const c = { Recibido: '', Limpieza: 'ok', Calidad: 'ok', Listo: 'info', Entregado: 'navy' }[s.etapa];
  return '<span class="chip ' + (c || '') + '">' + esc(s.etapa === 'Listo' ? 'Listo para entrega' : s.etapa) + '</span>';
}
function stepper(s, detail) {
  const k = ETAPAS.indexOf(s.etapa);
  const when = { 0: s.creado, 3: s.listo, 4: s.cerrado };
  return '<div class="steps' + (detail ? ' big' : '') + '">' + ETAPAS.map((e, i) =>
    (i ? '<span class="ln ' + (i <= k ? 'on' : '') + '"></span>' : '') + '<span class="st ' + (i < k || k === 4 ? 'on' : i === k ? 'now' : '') + '">' + (i < k || k === 4 ? icon('check', 's') : '') + '</span>').join('') + '</div>' +
    '<div class="steps-l">' + ETAPAS.map((e, i) => '<span class="' + (i === k ? 'cur' : '') + '">' + e + (detail && when[i] && i <= k ? '<small>' + esc(fTime(when[i])) + '</small>' : '') + '</span>').join('') + '</div>';
}
function clientCard(s) {
  const n = D.photos(s.id).filter(f => f.tipo !== 'Firma').length;
  return '<div class="card svc" data-act="go" data-to="servicio/' + esc(s.id) + '"><div class="row between"><div class="grow"><div class="plate ellipsis">' + esc(s.matricula || s.chasis) + '</div><div class="meta ellipsis">' + esc([s.marca, s.modelo].filter(Boolean).join(' ') || s.vehiculo || '') + (s.tipo ? ' · ' + esc(s.tipo) : '') + '</div></div>' + etapaChip(s) + '</div>' +
    (s.cerrado ? '' : stepper(s)) + '<div class="foot"><span>' + (s.cerrado ? 'Entregado ' + esc(fRel(s.cerrado)).replace(/^(Hoy|Ayer)/, m => m.toLowerCase()) : 'Recibido ' + esc(fRel(s.creado)).replace(/^(Hoy|Ayer)/, m => m.toLowerCase())) + '</span><span class="row" style="gap:4px">' + icon('image', 's') + n + ' fotos</span></div></div>';
}
function clientDetailHtml(ctx) {
  const s = ctx.s, photos = ctx.photos.filter(f => f.tipo !== 'Firma');
  const order = ['Antes', 'Después', 'Exterior', 'Interior', 'Detalle', 'Incidencia'];
  const groups = order.map(k => [k, photos.filter(f => f.tipo === k)]).filter(g => g[1].length);
  const hero = '<div class="hero"><div class="row between"><div class="grow"><div class="plate">' + esc(s.matricula || s.chasis) + '</div><div class="meta">' + esc([s.vehiculo, s.marca, s.modelo].filter(Boolean).join(' · ')) + (s.tipo ? ' · ' + esc(s.tipo) : '') + '</div></div><span class="chip">' + esc(s.etapa === 'Listo' ? 'Listo para entrega' : s.etapa) + '</span></div>' +
    '<div class="client-steps">' + stepper(s, true) + '</div>' +
    '<p class="meta" style="margin-top:10px">' + icon('shield', 's') + ' Protocolo de calidad: ' + s.progreso[0] + ' de ' + s.progreso[1] + ' controles completados</p></div>';
  const gal = '<div class="card"><div class="row between" style="margin-bottom:6px"><h2>Fotos</h2><span class="small muted">' + photos.length + '</span></div>' +
    (groups.length ? groups.map(g => '<p class="small muted" style="margin:10px 0 6px;font-weight:600">' + esc(g[0]) + '</p><div class="photos">' + g[1].map(f => photoTile(f, ctx.year)).join('') + '</div>').join('') : '<p class="muted small">' + (s.cerrado ? 'No hay fotos compartidas.' : 'Las fotos aparecerán aquí a medida que el equipo las suba.') + '</p>') + '</div>';
  const incs = ctx.incidents.length ? '<div class="card"><h2>Incidencias</h2>' + ctx.incidents.map(i => '<div class="inc ' + (i.resuelta ? 'res' : '') + '"><div class="row between"><b style="font-size:14px">' + esc(i.tipo) + '</b>' + (i.resuelta ? '<span class="chip ok">Resuelta</span>' : '<span class="chip warn">En revisión</span>') + '</div><p style="margin-top:3px">' + esc(i.texto) + '</p><p class="tiny muted" style="margin-top:3px">' + esc(fRel(i.fecha)) + '</p>' + (i.resuelta ? '<p class="small" style="margin-top:6px;color:var(--ok)">' + icon('check', 's') + ' ' + esc(i.resuelta.text) + '</p>' : '') + '</div>').join('') + '</div>' : '';
  const r = s.recibo;
  const sig = r && ctx.photos.find(f => f.id === r.firma);
  const rec = r ? '<div class="card"><div class="row between"><h2>Albarán de entrega</h2><span class="chip info">' + esc(r.numero) + '</span></div><dl class="kv" style="margin-top:10px"><dt>Recibido por</dt><dd>' + esc(r.signer) + '</dd><dt>Resultado</dt><dd>' + esc(r.conformity) + '</dd>' + (r.observations ? '<dt>Observaciones</dt><dd>' + esc(r.observations) + '</dd>' : '') + '<dt>Fecha</dt><dd>' + esc(fDate(r.at, true)) + '</dd></dl>' +
    (sig ? '<div class="photos" style="margin-top:10px;grid-template-columns:160px">' + photoTile(sig, ctx.year).replace('class="ph"', 'class="ph" style="aspect-ratio:2.6;background:#fff;border:1px solid var(--line)"') + '</div>' : '') + '</div>' : '';
  const info = '<div class="card"><h2>Datos del servicio</h2><dl class="kv" style="margin-top:10px"><dt>Matrícula</dt><dd>' + esc(s.matricula || '—') + '</dd>' + (s.chasis ? '<dt>Chasis</dt><dd>' + esc(s.chasis) + '</dd>' : '') + '<dt>Servicio</dt><dd>' + esc(s.tipo) + '</dd><dt>Recibido</dt><dd>' + esc(fDate(s.creado, true)) + '</dd>' + (s.cerrado ? '<dt>Entregado</dt><dd>' + esc(fDate(s.cerrado, true)) + '</dd>' : '') + '</dl></div>';
  return hero + '<div class="detail" style="margin-top:12px"><div class="col">' + gal + incs + '</div><div class="col">' + rec + info + '</div></div>';
}
function mountClientDetail(el, ctx) {
  loadThumbs(el);
  el.addEventListener('click', e => { const ph = e.target.closest('[data-photo]'); if (ph) viewPhoto(ph.dataset.photo, ph.dataset.year, ctx); });
}

const CVIEWS = {};
CVIEWS.inicio = function () {
  const m = me(), c = D.clients()[0] || { nombre: '' };
  const list = D.services();
  const open = list.filter(s => !s.cerrado).sort((a, b) => Date.parse(b.creado) - Date.parse(a.creado));
  const month = madridDay().slice(0, 7);
  const done = list.filter(s => s.cerrado).sort((a, b) => Date.parse(b.cerrado) - Date.parse(a.cerrado));
  const html = '<div style="margin:2px 2px 12px"><h1>' + greet() + ', ' + esc(m.nombre.split(' ')[0]) + '</h1><p class="muted small">' + esc(c.nombre) + ' · portal de cliente</p></div>' +
    '<div class="banner" style="background:var(--ok-bg);color:var(--ok);margin-bottom:10px">' + icon('lock') + '<span class="grow">Acceso privado. Solo ves los vehículos de ' + esc(c.nombre) + '.</span></div>' +
    '<div class="kpis kpis3"><div class="kpi"><small>En proceso</small><b>' + open.filter(s => s.etapa !== 'Listo').length + '</b></div><div class="kpi"><small>Listos</small><b style="color:var(--green)">' + open.filter(s => s.etapa === 'Listo').length + '</b></div><div class="kpi"><small>Entregados este mes</small><b>' + done.filter(s => madridDay(s.cerrado).slice(0, 7) === month).length + '</b></div></div>' +
    '<div class="sec"><h2>En proceso</h2></div>' + (open.length ? '<div class="cols">' + open.map(clientCard).join('') + '</div>' : empty('rv', 'Ahora mismo no hay vehículos en proceso', 'Cuando dejemos un vehículo en limpieza lo verás aquí en tiempo real.')) +
    (done.length ? '<div class="sec"><h2>Entregados recientemente</h2><a class="link" href="#/buscar">Historial</a></div><div class="cols">' + done.slice(0, 8).map(clientCard).join('') + '</div>' : '');
  return { title: 'Mis vehículos', html: html };
};
CVIEWS.servicio = function (r) {
  const s = D.service(r.id);
  if (!s) return { title: 'Vehículo', back: true, html: empty('rv', 'Vehículo no disponible', 'Búscalo en el historial.') };
  const ctx = { s: s, photos: D.photos(s.id), incidents: D.incidents(s.id) };
  return { title: s.matricula || s.chasis, back: true, html: clientDetailHtml(ctx), mount: el => mountClientDetail(el, ctx) };
};
CVIEWS.historico = function (r) {
  const a = S.archived && S.archived.service.id === r.id ? S.archived : null;
  if (!a) return { title: 'Historial', back: true, html: '<div class="card empty">Cargando…</div>', mount: async () => { try { S.archived = await api('archivedService', { id: r.id, year: r.sub }); render(); } catch (e) { $('#main').innerHTML = empty('history', 'No se ha podido abrir', e.message); } } };
  const ctx = { s: a.service, photos: a.photos, incidents: a.incidents, year: r.sub };
  return { title: a.service.matricula || a.service.chasis, back: true, html: clientDetailHtml(ctx), mount: el => mountClientDetail(el, ctx) };
};
CVIEWS.avisos = function () {
  const list = D.incidents().slice().sort((a, b) => (!!a.resuelta - !!b.resuelta) || Date.parse(b.fecha) - Date.parse(a.fecha));
  const html = list.length ? '<div class="cols">' + list.map(i => { const s = D.service(i.servicio) || {}; return '<div class="card svc" data-act="go" data-to="servicio/' + esc(i.servicio) + '"><div class="row between"><div class="grow"><div class="plate">' + esc(s.matricula || s.chasis || '') + '</div><div class="meta">' + esc(fRel(i.fecha)) + '</div></div>' + (i.resuelta ? '<span class="chip ok">Resuelta</span>' : '<span class="chip warn">En revisión</span>') + '</div><p style="margin-top:8px"><b>' + esc(i.tipo) + '.</b> ' + esc(i.texto) + '</p>' + (i.resuelta ? '<p class="small" style="margin-top:6px;color:var(--ok)">' + esc(i.resuelta.text) + '</p>' : '') + '</div>'; }).join('') + '</div>'
    : empty('check', 'Sin avisos', 'Si durante un servicio detectamos algo en tu vehículo, te lo contaremos aquí con fotos.');
  return { title: 'Avisos', html: html };
};
CVIEWS.albaranes = function () {
  return { title: 'Albaranes', html: '<p class="small muted" style="margin:0 2px 10px">Cada albarán reúne los vehículos entregados en un periodo, con la firma de cada entrega. Revísalo y da tu conformidad.</p><div id="alist"><div class="card empty">Cargando…</div></div>', mount: () => loadReceipts($('#alist'), false) };
};
CVIEWS.buscar = function () { return VIEWS.buscar(); };
CVIEWS.cuenta = function () {
  const v = VIEWS.ajustes();
  const c = D.clients()[0] || {};
  v.title = 'Mi cuenta'; v.back = false;
  v.html = '<div class="card row" style="gap:12px"><span class="av lg" style="width:44px;height:44px;font-size:15px">' + esc(initials(me().nombre)) + '</span><div class="grow"><b>' + esc(me().nombre) + '</b><div class="small muted">' + esc(c.nombre || '') + ' · portal de cliente</div></div></div>' + v.html +
    '<p class="tiny muted" style="text-align:center;margin-top:16px">' + icon('lock', 's') + ' Tus datos están protegidos. Efecto Mariposa · v' + VERSION + '</p>';
  return v;
};

/* ============================ Enlace público (particulares) ============================ */

async function renderPublic(token) {
  S.publicToken = token;
  document.body.style.background = 'var(--bg)';
  const frame = inner => '<header class="topbar" style="position:sticky"><img class="logo" src="icons/logo-header.png" alt="" style="display:block"><div class="title"><b>Efecto Mariposa</b><small>Seguimiento de tu vehículo</small></div></header><main style="padding-bottom:30px">' + inner + '</main>';
  ROOT.innerHTML = frame('<div class="card empty" style="margin-top:20px">Cargando el seguimiento…</div>');
  const load = async first => {
    try {
      const d = await api('public', { t: token });
      S.data = { photos: d.photos, incidents: d.incidents, services: [d.service], clients: [d.client], times: [], team: [] };
      const ctx = { s: d.service, photos: d.photos, incidents: d.incidents };
      ROOT.innerHTML = frame('<div class="banner" style="background:var(--ok-bg);color:var(--ok);margin-bottom:10px">' + icon('lock') + '<span class="grow">Enlace privado para ' + esc(d.client.nombre) + '. No lo compartas.</span></div>' + clientDetailHtml(ctx) +
        '<p class="tiny muted" style="text-align:center;margin-top:16px">' + (d.expires ? 'Este enlace estará disponible hasta el ' + esc(fDate(d.expires)) + '.' : 'Se actualiza solo mientras trabajamos en tu vehículo.') + '<br>Efecto Mariposa Clean &amp; Care · limpieza de autocaravanas y campers</p>');
      mountClientDetail($('main'), ctx);
      if (!d.service.cerrado) setTimeout(() => { if (document.visibilityState === 'visible' && !$('.viewer')) load(); else setTimeout(load, 60000); }, 60000);
    } catch (e) {
      if (first) ROOT.innerHTML = frame(empty(e.net ? 'wifioff' : 'lock', e.net ? 'Sin conexión' : 'Enlace no disponible', e.net ? 'Comprueba tu conexión y vuelve a abrir el enlace.' : e.message));
    }
  };
  await load(true);
}

/* ============================ Relojes en vivo ============================ */

function tick() {
  if (!S.data) return;
  $$('[data-sum]').forEach(el => {
    const [sid, kind, who] = el.dataset.sum.split('|');
    const times = (S.archived && S.archived.service.id === sid ? S.archived.times : D.times(sid));
    const ms = D.sum(times, t => t.tipo === kind && (!who || t.usuario === who));
    el.textContent = el.dataset.fmt === 'dur' ? dur(ms) : hms(ms);
  });
  $$('[data-since]').forEach(el => { el.textContent = hms(Date.now() - Date.parse(el.dataset.since)); });
  $$('[data-work]').forEach(el => { const j = workCache && workCache.current; el.textContent = hms(j ? workMs(j) : 0); });
}
setInterval(tick, 1000);

/* ============================ Arranque ============================ */

window.addEventListener('online', () => { S.online = true; updateStatus(); flush(); if (!S.queue.length) sync(); });
window.addEventListener('offline', () => { S.online = false; updateStatus(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.token) { if (S.queue.length) flush(); else if (Date.now() - S.lastSync > 15000) sync(); } });
setInterval(() => { if (document.visibilityState === 'visible' && S.token && !S.queue.length && Date.now() - S.lastSync > 25000) sync(); }, 5000);

async function start() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  S.queue = (await IDB.all()).sort((a, b) => (a.qid < b.qid ? -1 : 1));
  S.queue.forEach(q => { if (q.kind === 'photo' && q.data.thumb) S.thumbs['local:' + q.data.photoId] = q.data.thumb; });
  const sp = $('#splash');
  const pub = new URLSearchParams(location.search).get('v');
  if (pub) { await renderPublic(pub); if (sp) { sp.style.opacity = '0'; setTimeout(() => sp.remove(), 260); } return; }
  if (!S.token) { renderLogin(); }
  else {
    if (S.data) { S.queue.forEach(applyLocal); render(); }
    if (S.queue.length) flush(); else sync();
    if (!S.data) { try { S.data = await api('sync', {}); persistSnap(); render(); } catch (e) { if (!e.auth) ROOT.innerHTML = '<div class="login">' + empty('wifioff', 'Sin conexión', 'Conéctate a internet para cargar tus datos por primera vez.') + '</div>'; } }
  }
  if (sp) { sp.style.opacity = '0'; setTimeout(() => sp.remove(), 260); }
}
start();

})();
