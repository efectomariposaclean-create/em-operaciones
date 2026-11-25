/**
 * Efecto Mariposa · Operaciones — servidor (Google Apps Script)
 * Versión 2.0
 *
 * La app del móvil habla con este servidor mediante peticiones POST.
 * Los datos viven en una hoja de cálculo privada y las fotos en tu Drive.
 *
 * Instalación: ejecuta una sola vez la función  instalar()  desde el editor.
 */

const APP = {
  nombre: 'Efecto Mariposa · Operaciones',
  version: '2.0.0',
  zona: 'Europe/Madrid',
  diasArchivo: 60,        // servicios entregados hace más de X días pasan al histórico
  diasJornadasArchivo: 120,
  copiasGuardadas: 30,    // copias diarias que se conservan
  sesionDias: 30,
  logoDriveId: '19NRhA8ki8p5HPogdmMtAWarafkQAUu5I'
};

const ROLES = ['admin', 'trabajador', 'subcontrata', 'cliente'];
const PARTICULARES = 'PARTICULARES';
const TIPOS_GENERAL = ['Interior completo', 'Interior profundo', 'Exterior', 'Integral completo', 'Integral profundo'];
const TIPOS_K2 = ['Alquiler', 'Exposición', 'Entrega', 'Ocasión'];
const EXTRAS = ['Extracción tapicerías', 'Colchones', 'Olores persistentes', 'Ozono', 'Desmontaje autorizado'];
const TIPOS_FOTO = ['Antes', 'Después', 'Exterior', 'Interior', 'Detalle', 'Incidencia', 'Firma'];
const TIPOS_INCIDENCIA = ['Suciedad extraordinaria', 'Daño o avería', 'Zona inaccesible', 'Mancha persistente', 'Falta material', 'Otra incidencia'];

/* ------------------------------------------------------------------ */
/* Esquema de la base de datos                                         */
/* ------------------------------------------------------------------ */

const SCHEMA = {
  Clientes:   ['id', 'nombre', 'tipo', 'protocolo', 'tipos', 'contacto', 'telefono', 'email', 'revisor', 'carpeta', 'activo', 'creado'],
  Usuarios:   ['id', 'nombre', 'rol', 'pin', 'acceso', 'horas', 'activo', 'tokenV', 'empresa', 'creado'],
  Servicios:  ['id', 'cliente', 'matricula', 'chasis', 'marca', 'modelo', 'vehiculo', 'tipo', 'estado', 'suciedad', 'alcance', 'exterior', 'extras', 'grupos', 'notas', 'fases', 'maquina', 'recibo', 'creadoPor', 'creado', 'actualizado', 'cerrado', 'archivado', 'carpeta', 'version'],
  Tiempos:    ['id', 'servicio', 'usuario', 'tipo', 'inicio', 'fin', 'motivo'],
  Incidencias:['id', 'servicio', 'tipo', 'texto', 'bloqueante', 'por', 'fecha', 'resuelta'],
  Fotos:      ['id', 'servicio', 'incidencia', 'tipo', 'visible', 'archivo', 'mini', 'por', 'fecha'],
  Jornadas:   ['id', 'usuario', 'dia', 'inicio', 'fin', 'descansos', 'geo', 'auditoria'],
  Albaranes:  ['id', 'cliente', 'desde', 'hasta', 'n', 'fecha', 'archivo', 'titulo', 'servicios', 'por'],
  Cambios:    ['id', 'fecha', 'usuario', 'servicio', 'motivo', 'antes', 'despues'],
  Actividad:  ['id', 'fecha', 'usuario', 'servicio', 'accion']
};
const JSON_COLS = { tipos: 1, acceso: 1, extras: 1, grupos: 1, notas: 1, fases: 1, maquina: 1, recibo: 1, archivado: 1, resuelta: 1, descansos: 1, geo: 1, auditoria: 1, servicios: 1, antes: 1, despues: 1 };
const ARCHIVABLES = ['Servicios', 'Tiempos', 'Incidencias', 'Fotos', 'Jornadas', 'Cambios', 'Actividad'];

/* ------------------------------------------------------------------ */
/* Instalación (ejecutar una vez desde el editor)                      */
/* ------------------------------------------------------------------ */

function instalar() {
  const p = props_();
  if (p.getProperty('DB')) throw Error('Ya está instalado. No se ha cambiado nada.');
  const root = DriveApp.createFolder(APP.nombre + ' (PRIVADO)');
  const ss = SpreadsheetApp.create('EM Operaciones · Base (PRIVADO)');
  DriveApp.getFileById(ss.getId()).moveTo(root);
  Object.keys(SCHEMA).forEach((name, i) => {
    const sh = i === 0 ? ss.getSheets()[0] : ss.insertSheet();
    sh.setName(name);
    sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  const clientes = root.createFolder('Clientes');
  const copias = root.createFolder('Copias de seguridad');
  const historico = root.createFolder('Histórico');
  p.setProperties({
    DB: ss.getId(), ROOT: root.getId(), CLIENTES: clientes.getId(), COPIAS: copias.getId(),
    HISTORICO: historico.getId(), SECRET: secret_(), PEPPER: secret_()
  });
  const now = iso_();
  insert_('Clientes', { id: 'k2', nombre: 'Caravaning K2', tipo: 'empresa', protocolo: 'K2', tipos: TIPOS_K2, contacto: '', telefono: '', email: '', revisor: 'Inma', carpeta: '', activo: true, creado: now });
  const pin = nuevoPin_([]);
  insert_('Usuarios', { id: 'direccion', nombre: 'Enrique', rol: 'admin', pin: pinHash_(pin), acceso: [], horas: 0, activo: true, tokenV: 1, empresa: '', creado: now });
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('copiaDiaria').timeBased().everyDays(1).atHour(3).inTimezone(APP.zona).create();
  ScriptApp.newTrigger('archivarMensual').timeBased().onMonthDay(1).atHour(4).inTimezone(APP.zona).create();
  console.log('==============================================');
  console.log('INSTALACIÓN COMPLETADA');
  console.log('Tu PIN de dirección (apúntalo): ' + pin);
  console.log('Carpeta en Drive: ' + root.getUrl());
  console.log('==============================================');
  return 'OK';
}

/** Por si pierdes tu PIN: ejecútalo desde el editor y mira el registro. */
function restablecerPinDireccion() {
  const users = read_('Usuarios');
  const u = users.find(x => x.id === 'direccion');
  const pin = nuevoPin_(users);
  u.pin = pinHash_(pin); u.tokenV = (Number(u.tokenV) || 1) + 1; u.activo = true;
  update_('Usuarios', u);
  console.log('Nuevo PIN de dirección: ' + pin);
}

/* ------------------------------------------------------------------ */
/* Entrada HTTP                                                        */
/* ------------------------------------------------------------------ */

function doGet() {
  return out_({ ok: true, app: APP.nombre, version: APP.version });
}

function doPost(e) {
  _ver = null; _ss = null;
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'Petición no válida.' }); }
  try {
    const fn = ACTIONS[req.action];
    if (!fn) throw Error('Acción desconocida.');
    const user = req.action === 'login' ? null : session_(req.token);
    const data = fn(req.data || {}, user, req);
    return out_({ ok: true, data: data, at: iso_() });
  } catch (err) {
    const msg = String(err && err.message || err);
    if (!/^[A-ZÁÉÍÓÚ¿]/.test(msg)) console.error(err && err.stack || err);
    return out_({ ok: false, error: msg, auth: msg === 'SESION' });
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

const ACTIONS = {
  login: login_,
  sync: sync_,
  createService: createService_,
  op: serviceOp_,
  uploadPhoto: uploadPhoto_,
  photo: getPhoto_,
  photoVisible: photoVisible_,
  history: history_,
  archivedService: archivedService_,
  changePin: changePin_,
  workSnapshot: workSnapshot_,
  workPunch: workPunch_,
  workLocation: workLocation_,
  workList: workList_,
  workCorrect: workCorrect_,
  workAdd: workAdd_,
  receiptCreate: receiptCreate_,
  receiptList: receiptList_,
  receiptFile: receiptFile_,
  saveUser: saveUser_,
  resetPin: resetPin_,
  saveClient: saveClient_,
  systemStatus: systemStatus_
};

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function props_() { return PropertiesService.getScriptProperties(); }
function iso_(d) { return (d || new Date()).toISOString(); }
function day_(t) { return Utilities.formatDate(new Date(t), APP.zona, 'yyyy-MM-dd'); }
function uid_() { return Utilities.getUuid(); }
function hex_(bytes) { return bytes.map(x => ('0' + ((x + 256) % 256).toString(16)).slice(-2)).join(''); }
function secret_() { return (uid_() + uid_()).replace(/-/g, ''); }
function clean_(x, n) { return String(x == null ? '' : x).trim().slice(0, n || 1500); }
function upper_(x, n) { return clean_(x, n).toUpperCase(); }
function norm_(v) { return String(v || '').replace(/[^A-Z0-9]/gi, '').toUpperCase(); }
function safeId_(x) { const v = clean_(x, 60); return /^[A-Za-z0-9_-]{6,60}$/.test(v) ? v : uid_(); }
function fail_(m) { throw Error(m); }
function admin_(u) { if (u.rol !== 'admin') fail_('Solo dirección.'); }
function locked_(fn) {
  const l = LockService.getScriptLock();
  if (!l.tryLock(20000)) fail_('El servidor está ocupado. Reintentando…');
  try { return fn(); } finally { l.releaseLock(); }
}

/* ------------------------------------------------------------------ */
/* Acceso a tablas (con caché versionada)                              */
/* ------------------------------------------------------------------ */

let _ss = null, _ver = null;
function ss_() { if (!_ss) { const id = props_().getProperty('DB'); if (!id) fail_('Falta ejecutar instalar().'); _ss = SpreadsheetApp.openById(id); } return _ss; }
function sheet_(name, ss) { return (ss || ss_()).getSheetByName(name); }
function versions_() { if (!_ver) _ver = props_().getProperties(); return _ver; }

function parseRow_(cols, r) {
  const o = {};
  cols.forEach((c, i) => {
    let v = r[i];
    if (JSON_COLS[c]) { try { v = v === '' ? null : JSON.parse(v); } catch (e) { v = null; } }
    else if (v instanceof Date) v = v.toISOString();
    o[c] = v;
  });
  return o;
}
function rowOf_(cols, o) {
  return cols.map(c => {
    const v = o[c];
    if (JSON_COLS[c]) return v == null ? '' : JSON.stringify(v);
    if (v === undefined || v === null) return '';
    return v;
  });
}

function read_(name, ss) {
  const cols = SCHEMA[name];
  if (!ss) {
    const ver = versions_()['V_' + name] || '0';
    const key = 't:' + name + ':' + ver;
    const c = CacheService.getScriptCache().get(key);
    if (c) return JSON.parse(c);
    const rows = readSheet_(sheet_(name), cols);
    const json = JSON.stringify(rows);
    if (json.length < 95000) { try { CacheService.getScriptCache().put(key, json, 21600); } catch (e) {} }
    return rows;
  }
  const sh = sheet_(name, ss);
  return sh ? readSheet_(sh, cols) : [];
}
function readSheet_(sh, cols) {
  const n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, cols.length).getValues().filter(r => r[0] !== '').map(r => parseRow_(cols, r));
}
function bump_(name) {
  const v = String(Date.now()) + Math.floor(Math.random() * 1000);
  props_().setProperty('V_' + name, v);
  if (_ver) _ver['V_' + name] = v;
}
function insert_(name, o) {
  sheet_(name).appendRow(rowOf_(SCHEMA[name], o));
  bump_(name);
  return o;
}
function findRow_(sh, id) {
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const cell = sh.getRange(2, 1, n - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : 0;
}
function update_(name, o) {
  const sh = sheet_(name), r = findRow_(sh, o.id);
  if (!r) fail_('Registro no encontrado.');
  const row = rowOf_(SCHEMA[name], o);
  if (row.some(v => typeof v === 'string' && v.length > 49000)) fail_('Registro demasiado grande.');
  sh.getRange(r, 1, 1, row.length).setValues([row]);
  bump_(name);
  return o;
}
function log_(u, servicio, accion) {
  insert_('Actividad', { id: uid_(), fecha: iso_(), usuario: u ? u.id : '', servicio: servicio || '', accion: clean_(accion, 200) });
}

/* ------------------------------------------------------------------ */
/* Sesiones y PIN                                                      */
/* ------------------------------------------------------------------ */

function pinHash_(pin) { return hex_(Utilities.computeHmacSha256Signature(String(pin), props_().getProperty('PEPPER'))); }
function nuevoPin_(users) {
  let k;
  do { k = String(10000000 + parseInt(uid_().replace(/-/g, '').slice(0, 8), 16) % 90000000); }
  while (users.some(x => x.pin === pinHash_(k)));
  return k;
}
function sign_(s) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, props_().getProperty('SECRET'))).replace(/=+$/, ''); }
function token_(u) {
  const body = Utilities.base64EncodeWebSafe(JSON.stringify({ u: u.id, v: Number(u.tokenV) || 1, e: Date.now() + APP.sesionDias * 864e5 })).replace(/=+$/, '');
  return body + '.' + sign_(body);
}
function session_(token) {
  if (typeof token !== 'string' || token.indexOf('.') < 0) fail_('SESION');
  const parts = token.split('.');
  if (sign_(parts[0]) !== parts[1]) fail_('SESION');
  let p;
  try { p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString()); } catch (e) { fail_('SESION'); }
  if (!p || p.e < Date.now()) fail_('SESION');
  const u = read_('Usuarios').find(x => x.id === p.u);
  if (!u || !u.activo || (Number(u.tokenV) || 1) !== p.v) fail_('SESION');
  u.acceso = u.acceso || [];
  return u;
}

function login_(d) {
  const cache = CacheService.getScriptCache();
  const dev = 'a:' + clean_(d.device, 64).replace(/[^A-Za-z0-9-]/g, '');
  const devCount = Number(cache.get(dev) || 0), allCount = Number(cache.get('a:all') || 0);
  if (devCount >= 8) fail_('Demasiados intentos desde este dispositivo. Espera 15 minutos.');
  if (allCount >= 150) fail_('Acceso bloqueado temporalmente por seguridad. Prueba en 15 minutos.');
  const pin = String(d.pin || '');
  const u = /^\d{6,8}$/.test(pin) ? read_('Usuarios').find(x => x.activo && x.pin === pinHash_(pin)) : null;
  if (!u) {
    cache.put(dev, String(devCount + 1), 900);
    cache.put('a:all', String(allCount + 1), 900);
    fail_('PIN incorrecto.');
  }
  cache.remove(dev);
  return { token: token_(u) };
}

function changePin_(d, u) {
  return locked_(() => {
    const pin = String(d.pin || '');
    if (!/^\d{6,8}$/.test(pin)) fail_('El PIN debe tener de 6 a 8 números.');
    if (/^(\d)\1+$/.test(pin) || ['123456', '1234567', '12345678', '87654321', '654321'].indexOf(pin) >= 0) fail_('Ese PIN es demasiado fácil. Elige otro.');
    const users = read_('Usuarios');
    if (users.some(x => x.id !== u.id && x.pin === pinHash_(pin))) fail_('Elige otro PIN.');
    const me = users.find(x => x.id === u.id);
    me.pin = pinHash_(pin); me.tokenV = (Number(me.tokenV) || 1) + 1;
    update_('Usuarios', me);
    log_(u, '', 'cambio de PIN');
    return { token: token_(me) };
  });
}

/* ------------------------------------------------------------------ */
/* Permisos                                                            */
/* ------------------------------------------------------------------ */

function clientById_(clients, id) { return clients.find(c => c.id === id); }
function canClient_(u, client) {
  if (!client) return false;
  if (u.rol === 'admin') return true;
  const acc = u.acceso || [];
  return acc.indexOf(client.id) >= 0 || (client.tipo === 'particular' && acc.indexOf(PARTICULARES) >= 0);
}
function participants_(times, sid) {
  const s = {};
  times.forEach(t => { if (t.servicio === sid && t.usuario !== 'MAQUINA') s[t.usuario] = 1; });
  return s;
}
function canService_(u, s, clients, times) {
  if (u.rol === 'admin') return true;
  if (!canClient_(u, clientById_(clients, s.cliente))) return false;
  if (!s.cerrado) return true;
  return !!participants_(times, s.id)[u.id] || s.creadoPor === u.id;
}
function loadService_(u, id) {
  const s = read_('Servicios').find(x => x.id === id && !x.archivado);
  if (!s) fail_('Servicio no encontrado.');
  if (!canService_(u, s, read_('Clientes'), read_('Tiempos'))) fail_('No tienes acceso a este servicio.');
  return s;
}

/* ------------------------------------------------------------------ */
/* Sincronización                                                      */
/* ------------------------------------------------------------------ */

function publicUser_(x) { return { id: x.id, nombre: x.nombre, rol: x.rol }; }

function sync_(d, u) {
  const clients = read_('Clientes'), users = read_('Usuarios'), times = read_('Tiempos');
  const limit = Date.now() - (u.rol === 'admin' ? 45 : 30) * 864e5;
  const services = read_('Servicios').filter(s => !s.archivado && (!s.cerrado || Date.parse(s.cerrado) >= limit) && canService_(u, s, clients, times));
  const ids = {};
  services.forEach(s => ids[s.id] = 1);
  const visibleClients = clients.filter(c => c.activo !== false && canClient_(u, c));
  return {
    me: { id: u.id, nombre: u.nombre, rol: u.rol, horas: Number(u.horas) || 0, acceso: u.acceso },
    config: { extras: EXTRAS, tiposGeneral: TIPOS_GENERAL, tiposFoto: TIPOS_FOTO, tiposIncidencia: TIPOS_INCIDENCIA, version: APP.version },
    clients: visibleClients.map(c => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, protocolo: c.protocolo, tipos: c.tipos || TIPOS_GENERAL, revisor: c.revisor, contacto: u.rol === 'admin' ? c.contacto : '', telefono: u.rol === 'admin' ? c.telefono : '', email: u.rol === 'admin' ? c.email : '', activo: c.activo !== false })),
    team: users.filter(x => x.activo || u.rol === 'admin').map(publicUser_),
    users: u.rol === 'admin' ? users.map(x => ({ id: x.id, nombre: x.nombre, rol: x.rol, acceso: x.acceso || [], horas: Number(x.horas) || 0, activo: !!x.activo, empresa: x.empresa || '' })) : [],
    services: services,
    times: times.filter(t => ids[t.servicio]),
    incidents: read_('Incidencias').filter(i => ids[i.servicio]),
    photos: read_('Fotos').filter(f => ids[f.servicio]).map(f => ({ id: f.id, servicio: f.servicio, incidencia: f.incidencia, tipo: f.tipo, visible: !!f.visible, por: f.por, fecha: f.fecha })),
    now: iso_()
  };
}

/* ------------------------------------------------------------------ */
/* Protocolos de limpieza                                              */
/* ------------------------------------------------------------------ */

function protocol_(client, type, extras, exterior) {
  const g = [];
  const k2 = client.protocolo === 'K2';
  const add = (name, tasks) => g.push({ name: name, tasks: tasks.map(t => ({ label: t, state: 'pending', by: '', at: '' })) });
  add('Recepción', ['Identificar y localizar vehículo', 'Revisar alcance, estado y daños iniciales', 'Fotos de estado inicial']);
  const outside = type === 'Exterior', inside = !outside;
  const ext = (k2 && exterior === true) || outside || String(type).indexOf('Integral') === 0;
  if (inside) {
    add('Preparación', ['Vaciar y ordenar pertenencias o equipamiento cuando corresponda', 'Preparar productos y material', 'Aspirar habitáculo']);
    add('Interior', ['Cabina y maletero', 'Cocina, baño y vivienda', 'Muebles y armarios accesibles', 'Cristales y ventanas']);
  }
  if (k2 && type === 'Alquiler') add('Alquiler K2', ['Retirar y lavar menaje, ollas y baldas de nevera', 'Colocar menaje y accesorios', 'Protector colchón, sábanas, nórdico, almohadas y toallas', 'Papel higiénico nuevo', 'Agua en nevera', 'Caramelos en mesa', 'Bolsa con esponja y Fairy']);
  if (k2 && type === 'Exposición') add('Exposición K2', ['Tensar bolsas de colchones', 'Proteger cojines, mesa y apoyacabezas con film', 'Protector volante y bolsas de asientos', 'Guardar accesorios de ducha en lugar autorizado', 'Comprobar presentación de exposición']);
  if (k2 && type === 'Entrega') add('Entrega comercial', ['Revisar detalle, marcas, adhesivos y acabados', 'Comprobar presentación para el comprador']);
  if (k2 && type === 'Ocasión') add('Ocasión', ['Valorar suciedad extraordinaria y documentar si procede', 'Revisar recuperación de plásticos si corresponde']);
  if (String(type).indexOf('profundo') >= 0) add('Limpieza profunda', ['Retirar solo componentes autorizados y accesibles', 'Limpiar zonas de acceso complejo', 'Recolocar componentes y comprobar estado']);
  (extras || []).forEach(e => {
    const t = e === 'Ozono' ? ['Confirmar autorización y protocolo del equipo', 'Confirmar ausencia de personas y animales', 'Registrar tratamiento y ventilación', 'Verificar condiciones seguras antes de entrada']
      : e === 'Desmontaje autorizado' ? ['Identificar elementos y autorización', 'Retirar, limpiar y recolocar sin daños']
      : ['Realizar ' + e.toLowerCase() + ' según alcance aprobado', 'Comprobar resultado y registrar limitaciones'];
    add(e, t);
  });
  if (inside) add('Final interior', ['Colocar pertenencias y elementos según servicio', 'Fregar suelo como última tarea interior']);
  if (ext) add('Exterior', ['Quitamosquitos y zonas de difícil acceso', 'Lavado exterior según medios autorizados', 'Revisión carrocería y acabados']);
  add('Calidad', ['Autocontrol de limpieza y alcance', 'Fotos del resultado final', 'Comprobar incidencias y limitaciones comunicadas']);
  add('Entrega', k2 ? ['Revisión de ' + (client.revisor || 'responsable'), 'Correcciones completadas o no necesarias', 'Albarán firmado', 'Aparcar según indicación del cliente'] : ['Revisar resultado con cliente', 'Explicar limitaciones e incidencias', 'Albarán firmado']);
  return g;
}
const OBLIGATORIOS = ['Recepción', 'Calidad', 'Entrega', 'Ozono'];

/* ------------------------------------------------------------------ */
/* Servicios                                                           */
/* ------------------------------------------------------------------ */

function status_(s, times, incidents) {
  if (s.cerrado) return 'Entregado';
  const inc = incidents.filter(i => i.servicio === s.id);
  if (inc.some(i => i.bloqueante && !i.resuelta)) return 'Incidencia';
  const open = times.filter(t => t.servicio === s.id && !t.fin);
  if (open.some(t => t.tipo === 'Trabajo')) return 'En limpieza';
  if (s.maquina && s.maquina.on) return s.maquina.label || 'Máquina en marcha';
  if (open.some(t => t.tipo === 'Espera')) return 'En espera';
  return 'En pausa';
}

function closeUserTimes_(userId, at, exceptService) {
  const changed = [];
  read_('Tiempos').forEach(t => {
    if (t.usuario === userId && !t.fin && t.servicio !== exceptService) { t.fin = at; update_('Tiempos', t); changed.push(t.servicio); }
  });
  return changed;
}

function refreshStatus_(ids) {
  const times = read_('Tiempos'), inc = read_('Incidencias'), all = read_('Servicios');
  ids.forEach(id => {
    const s = all.find(x => x.id === id);
    if (!s || s.cerrado) return;
    const st = status_(s, times, inc);
    if (st !== s.estado) { s.estado = st; s.actualizado = iso_(); s.version = (Number(s.version) || 0) + 1; update_('Servicios', s); }
  });
}

function createService_(d, u) {
  if (u.rol === 'cliente') fail_('Sin permiso.');
  return locked_(() => {
    let clients = read_('Clientes');
    let client;
    if (d.newClient) {
      const nombre = clean_(d.newClient.nombre, 120);
      if (!nombre) fail_('Indica el nombre del cliente.');
      if (u.rol !== 'admin' && (u.acceso || []).indexOf(PARTICULARES) < 0) fail_('No puedes crear clientes.');
      client = clients.find(c => c.tipo === 'particular' && norm_(c.nombre) === norm_(nombre) && clean_(c.telefono, 40) === clean_(d.newClient.telefono, 40));
      if (!client) {
        client = { id: 'c-' + uid_().slice(0, 8), nombre: nombre, tipo: 'particular', protocolo: 'general', tipos: TIPOS_GENERAL, contacto: nombre, telefono: clean_(d.newClient.telefono, 40), email: clean_(d.newClient.email, 120), revisor: '', carpeta: '', activo: true, creado: iso_() };
        insert_('Clientes', client);
        log_(u, '', 'alta cliente ' + client.id);
      }
    } else {
      client = clientById_(clients, d.cliente);
    }
    if (!client || !canClient_(u, client)) fail_('Cliente no permitido.');
    const tipos = client.tipos || TIPOS_GENERAL;
    const tipo = clean_(d.tipo, 80);
    if (tipos.indexOf(tipo) < 0) fail_('Tipo de servicio no válido para este cliente.');
    const matricula = upper_(d.matricula, 40), chasis = upper_(d.chasis, 60);
    if (!matricula && !chasis) fail_('Falta matrícula o número de chasis.');
    const services = read_('Servicios');
    const keys = [matricula, chasis].filter(Boolean).map(norm_);
    const dup = services.find(x => !x.cerrado && !x.archivado && x.cliente === client.id && [x.matricula, x.chasis].filter(Boolean).some(v => keys.indexOf(norm_(v)) >= 0));
    if (dup) return { duplicate: dup.id };
    const id = safeId_(d.id), at = iso_();
    if (services.some(x => x.id === id)) return { id: id };
    const extras = client.protocolo === 'K2' ? [] : (Array.isArray(d.extras) ? d.extras.filter(x => EXTRAS.indexOf(x) >= 0) : []);
    const s = {
      id: id, cliente: client.id, matricula: matricula, chasis: chasis, marca: clean_(d.marca, 80), modelo: clean_(d.modelo, 80),
      vehiculo: clean_(d.vehiculo, 40), tipo: tipo, estado: 'En limpieza', suciedad: clean_(d.suciedad, 30) || 'Normal', alcance: clean_(d.alcance),
      exterior: d.exterior === true, extras: extras, grupos: protocol_(client, tipo, extras, d.exterior === true), notas: [], fases: {},
      maquina: null, recibo: null, creadoPor: u.id, creado: at, actualizado: at, cerrado: '', archivado: null, carpeta: '', version: 1
    };
    s.fases[u.id] = 'Recepción';
    const changed = closeUserTimes_(u.id, at, id);
    insert_('Servicios', s);
    insert_('Tiempos', { id: uid_(), servicio: id, usuario: u.id, tipo: 'Trabajo', inicio: at, fin: '', motivo: '' });
    refreshStatus_(changed);
    log_(u, id, 'crear servicio');
    return { id: id };
  });
}

function serviceOp_(d, u) {
  if (u.rol === 'cliente') fail_('Sin permiso.');
  return locked_(() => {
    const s = loadService_(u, d.id);
    const op = d.op, x = d.d || {}, at = iso_();
    const req = clean_(x.requestId, 80);
    const done = CacheService.getScriptCache();
    if (req && done.get('r:' + req)) return { ok: true, repeated: true };
    if (s.cerrado && op !== 'edit') fail_('El servicio ya está entregado.');
    let related = [];
    switch (op) {
      case 'tasks': {
        if (!Array.isArray(x.items) || x.items.length > 200) fail_('Lote inválido.');
        x.items.forEach(a => {
          const g = s.grupos[a.g], t = g && g.tasks[a.t];
          if (!t || ['pending', 'done', 'na'].indexOf(a.state) < 0) fail_('Tarea inválida.');
          if (t.label === 'Albarán firmado') return;
          if (a.state === 'na' && OBLIGATORIOS.indexOf(g.name) >= 0) fail_('Este control es obligatorio.');
          t.state = a.state; t.by = u.id; t.at = at;
        });
        break;
      }
      case 'phase': {
        const g = s.grupos[x.g];
        if (!g) fail_('Fase inválida.');
        s.fases = s.fases || {}; s.fases[u.id] = g.name;
        break;
      }
      case 'clock': {
        if (['Trabajo', 'Espera', 'Pausa'].indexOf(x.kind) < 0) fail_('Estado no válido.');
        const reason = clean_(x.reason, 300);
        if (x.kind === 'Espera' && !reason) fail_('Indica el motivo de la espera.');
        const times = read_('Tiempos');
        const mine = times.find(t => t.usuario === u.id && !t.fin && t.servicio === s.id);
        if (mine && mine.tipo === x.kind) break;
        related = closeUserTimes_(u.id, at, null);
        insert_('Tiempos', { id: uid_(), servicio: s.id, usuario: u.id, tipo: x.kind, inicio: at, fin: '', motivo: reason });
        s.fases = s.fases || {}; if (!s.fases[u.id]) s.fases[u.id] = 'Recepción';
        break;
      }
      case 'leave': {
        related = closeUserTimes_(u.id, at, null);
        break;
      }
      case 'machine': {
        const label = clean_(x.label, 40) || 'Máquina en marcha';
        if (x.on && !(s.maquina && s.maquina.on)) s.maquina = { on: true, label: label, inicio: at, por: u.id };
        else if (!x.on && s.maquina && s.maquina.on) {
          insert_('Tiempos', { id: uid_(), servicio: s.id, usuario: 'MAQUINA', tipo: s.maquina.label, inicio: s.maquina.inicio, fin: at, motivo: u.id });
          s.maquina = null;
        }
        break;
      }
      case 'note': {
        const text = clean_(x.text);
        if (!text) fail_('Escribe la nota.');
        s.notas = s.notas || [];
        if (!s.notas.some(n => n.id === x.noteId)) s.notas.push({ id: clean_(x.noteId, 60) || uid_(), text: text, by: u.id, at: at });
        break;
      }
      case 'incident': {
        const text = clean_(x.text);
        if (!text) fail_('Describe la incidencia.');
        const iid = safeId_(x.incidentId);
        if (!read_('Incidencias').some(i => i.id === iid)) {
          insert_('Incidencias', { id: iid, servicio: s.id, tipo: TIPOS_INCIDENCIA.indexOf(x.type) >= 0 ? x.type : 'Otra incidencia', texto: text, bloqueante: !!x.blocking, por: u.id, fecha: at, resuelta: null });
        }
        break;
      }
      case 'resolve': {
        const i = read_('Incidencias').find(v => v.id === x.incidentId && v.servicio === s.id);
        if (!i) fail_('Incidencia no encontrada.');
        const text = clean_(x.text);
        if (!text) fail_('Indica cómo se ha resuelto o comunicado.');
        i.resuelta = { text: text, by: u.id, at: at };
        update_('Incidencias', i);
        break;
      }
      case 'edit': {
        const isAdmin = u.rol === 'admin';
        const open = read_('Tiempos').some(t => t.servicio === s.id && t.usuario === u.id && !t.fin);
        if (!isAdmin && (s.cerrado || !open)) fail_('Solo puedes corregir la matrícula de un servicio en el que estás trabajando.');
        const reason = clean_(x.reason, 300);
        if (!reason) fail_('Indica el motivo de la corrección.');
        const before = { matricula: s.matricula, chasis: s.chasis, marca: s.marca, modelo: s.modelo, alcance: s.alcance, vehiculo: s.vehiculo };
        const mat = upper_(x.matricula, 40), ch = isAdmin ? upper_(x.chasis, 60) : s.chasis;
        if (!mat && !ch) fail_('Introduce matrícula o chasis.');
        const keys = [mat, ch].filter(Boolean).map(norm_);
        if (!s.cerrado && read_('Servicios').some(o => o.id !== s.id && !o.cerrado && !o.archivado && o.cliente === s.cliente && [o.matricula, o.chasis].filter(Boolean).some(v => keys.indexOf(norm_(v)) >= 0))) fail_('Ya hay un servicio activo con ese vehículo.');
        s.matricula = mat; s.chasis = ch;
        if (isAdmin) { s.marca = clean_(x.marca, 80); s.modelo = clean_(x.modelo, 80); s.alcance = clean_(x.alcance); s.vehiculo = clean_(x.vehiculo, 40); }
        insert_('Cambios', { id: uid_(), fecha: at, usuario: u.id, servicio: s.id, motivo: reason, antes: before, despues: { matricula: s.matricula, chasis: s.chasis, marca: s.marca, modelo: s.modelo, alcance: s.alcance, vehiculo: s.vehiculo } });
        break;
      }
      case 'archive': {
        admin_(u);
        const reason = clean_(x.reason, 300);
        if (!reason) fail_('Indica el motivo.');
        closeServiceTimes_(s.id, at);
        s.archivado = { by: u.id, at: at, reason: reason };
        break;
      }
      case 'close': {
        closeService_(s, u, x, at);
        break;
      }
      default: fail_('Acción no permitida.');
    }
    s.actualizado = at;
    s.version = (Number(s.version) || 0) + 1;
    if (!s.cerrado) s.estado = status_(s, read_('Tiempos'), read_('Incidencias'));
    update_('Servicios', s);
    refreshStatus_(related.filter(id => id !== s.id));
    if (req) done.put('r:' + req, '1', 21600);
    log_(u, s.id, op);
    return { ok: true };
  });
}

function closeServiceTimes_(sid, at) {
  read_('Tiempos').forEach(t => { if (t.servicio === sid && !t.fin) { t.fin = at; update_('Tiempos', t); } });
}

function closeService_(s, u, x, at) {
  const r = x.receipt || {};
  const signer = clean_(r.signer, 120);
  if (!signer || ['Cliente', 'Responsable de empresa', 'Representante autorizado'].indexOf(r.role) < 0 || ['Conforme', 'Con observaciones'].indexOf(r.conformity) < 0 || r.accepted !== true) fail_('Completa los datos y la conformidad del albarán.');
  const obs = clean_(r.observations, 1500);
  if (r.conformity === 'Con observaciones' && !obs) fail_('Indica las observaciones de entrega.');
  if (typeof r.signature !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(r.signature) || r.signature.length < 500 || r.signature.length > 1500000) fail_('Falta la firma de quien recibe.');
  const inc = read_('Incidencias').filter(i => i.servicio === s.id);
  if (['Elevado', 'Intensivo'].indexOf(s.suciedad) >= 0 && !inc.some(i => i.tipo === 'Suciedad extraordinaria')) fail_('La suciedad elevada requiere registrar una incidencia de suciedad extraordinaria con fotos.');
  const pending = [];
  s.grupos.forEach(g => g.tasks.forEach(t => { if (t.state === 'pending' && t.label !== 'Albarán firmado') pending.push(g.name + ': ' + t.label); }));
  if (pending.length) fail_('Faltan ' + pending.length + ' controles: ' + pending.slice(0, 6).join('; ') + (pending.length > 6 ? '…' : ''));
  if (read_('Tiempos').some(t => t.servicio === s.id && t.usuario !== u.id && !t.fin && t.tipo === 'Trabajo')) fail_('Otro compañero sigue trabajando en este vehículo. Debe salir antes de entregar.');
  if (inc.some(i => !i.resuelta)) fail_('Registra cómo se ha resuelto o comunicado cada incidencia.');
  if (s.maquina && s.maquina.on) fail_('Detén la máquina en marcha antes de entregar.');
  const blob = Utilities.newBlob(Utilities.base64Decode(r.signature.split(',')[1]), 'image/png', 'firma-' + s.id + '.png');
  const file = serviceFolder_(s).createFile(blob);
  const fid = uid_();
  insert_('Fotos', { id: fid, servicio: s.id, incidencia: '', tipo: 'Firma', visible: true, archivo: file.getId(), mini: '', por: u.id, fecha: at });
  s.recibo = { numero: 'EM-' + day_(at).replace(/-/g, '') + '-' + s.id.replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase(), signer: signer, role: r.role, conformity: r.conformity, observations: obs, at: at, by: u.id, firma: fid, matricula: s.matricula || s.chasis, tipo: s.tipo };
  s.grupos.forEach(g => g.tasks.forEach(t => { if (t.label === 'Albarán firmado') { t.state = 'done'; t.by = u.id; t.at = at; } }));
  closeServiceTimes_(s.id, at);
  s.cerrado = at;
  s.estado = 'Entregado';
}

/* ------------------------------------------------------------------ */
/* Fotos (carpeta por cliente y vehículo)                              */
/* ------------------------------------------------------------------ */

function folderNamed_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function clientFolder_(clientId) {
  const clients = read_('Clientes');
  const c = clientById_(clients, clientId);
  if (!c) fail_('Cliente no encontrado.');
  if (c.carpeta) { try { return DriveApp.getFolderById(c.carpeta); } catch (e) {} }
  const name = c.tipo === 'particular' ? 'Particulares' : c.nombre;
  let f = folderNamed_(DriveApp.getFolderById(props_().getProperty('CLIENTES')), name);
  if (c.tipo === 'particular') f = folderNamed_(f, c.nombre + (c.telefono ? ' · ' + c.telefono : ''));
  c.carpeta = f.getId();
  update_('Clientes', c);
  return f;
}
function serviceFolder_(s) {
  if (s.carpeta) { try { return DriveApp.getFolderById(s.carpeta); } catch (e) {} }
  const month = folderNamed_(clientFolder_(s.cliente), day_(s.creado).slice(0, 7));
  const f = month.createFolder((s.matricula || s.chasis) + ' · ' + day_(s.creado));
  s.carpeta = f.getId();
  return f;
}

function uploadPhoto_(d, u) {
  if (u.rol === 'cliente') fail_('Sin permiso.');
  const m = String(d.data || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  const t = String(d.thumb || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > 6000000) fail_('Imagen no válida o demasiado grande.');
  const id = safeId_(d.photoId);
  // La subida del archivo se hace fuera del bloqueo para no frenar al resto del equipo.
  const s0 = loadService_(u, d.id);
  if (s0.cerrado && u.rol !== 'admin') fail_('El servicio ya está entregado.');
  if (read_('Fotos').some(f => f.id === id)) return { ok: true, repeated: true };
  let folder;
  if (!s0.carpeta) {
    locked_(() => { const s = loadService_(u, d.id); if (!s.carpeta) { serviceFolder_(s); update_('Servicios', s); } s0.carpeta = s.carpeta; });
  }
  folder = DriveApp.getFolderById(s0.carpeta);
  const kind = TIPOS_FOTO.indexOf(d.kind) >= 0 ? d.kind : 'Detalle';
  const stamp = Utilities.formatDate(new Date(), APP.zona, 'yyyyMMdd-HHmmss');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), 'image/' + m[1], stamp + ' ' + kind + ' ' + id.slice(0, 4) + '.' + ext));
  let mini = '';
  if (t && t[2].length < 300000) {
    const mf = folderNamed_(folder, 'miniaturas').createFile(Utilities.newBlob(Utilities.base64Decode(t[2]), 'image/' + t[1], id + '.jpg'));
    mini = mf.getId();
  }
  return locked_(() => {
    if (read_('Fotos').some(f => f.id === id)) return { ok: true, repeated: true };
    const visible = typeof d.visible === 'boolean' ? d.visible : ['Antes', 'Después', 'Exterior', 'Interior'].indexOf(kind) >= 0;
    insert_('Fotos', { id: id, servicio: s0.id, incidencia: clean_(d.incidentId, 60), tipo: kind, visible: visible, archivo: file.getId(), mini: mini, por: u.id, fecha: iso_() });
    log_(u, s0.id, 'foto ' + kind);
    return { ok: true };
  });
}

function getPhoto_(d, u) {
  const book = d.year ? archiveBook_(Number(d.year), false) : null;
  const p = read_('Fotos', book || undefined).find(f => f.id === d.photoId);
  if (!p) fail_('Foto no encontrada.');
  const s = read_('Servicios', book || undefined).find(x => x.id === p.servicio);
  if (!s || !canService_(u, s, read_('Clientes'), read_('Tiempos', book || undefined))) fail_('Sin permiso.');
  if (u.rol === 'cliente' && !p.visible) fail_('Sin permiso.');
  const fid = d.size === 'mini' && p.mini ? p.mini : p.archivo;
  const b = DriveApp.getFileById(fid).getBlob();
  return { data: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) };
}
function photoVisible_(d, u) {
  if (u.rol !== 'admin' && u.rol !== 'trabajador' && u.rol !== 'subcontrata') fail_('Sin permiso.');
  return locked_(() => {
    const p = read_('Fotos').find(f => f.id === d.photoId);
    if (!p) fail_('Foto no encontrada.');
    loadService_(u, p.servicio);
    p.visible = !!d.visible;
    update_('Fotos', p);
    return { ok: true };
  });
}

/* ------------------------------------------------------------------ */
/* Histórico y búsqueda                                                */
/* ------------------------------------------------------------------ */

function archiveBook_(year, create) {
  const key = 'HIST_' + year;
  const id = props_().getProperty(key);
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  if (!create) return null;
  const ss = SpreadsheetApp.create('EM Operaciones · Histórico ' + year);
  DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(props_().getProperty('HISTORICO')));
  ARCHIVABLES.forEach((name, i) => {
    const sh = i === 0 ? ss.getSheets()[0] : ss.insertSheet();
    sh.setName(name);
    sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  props_().setProperty(key, ss.getId());
  return ss;
}

function history_(d, u) {
  const from = /^\d{4}-\d{2}-\d{2}$/.test(d.from) ? d.from : '2000-01-01';
  const to = /^\d{4}-\d{2}-\d{2}$/.test(d.to) ? d.to : '2999-12-31';
  const plate = norm_(d.plate), client = clean_(d.cliente, 60), worker = clean_(d.worker, 60);
  const clients = read_('Clientes');
  const books = [{ ss: null }];
  const y1 = Number(from.slice(0, 4)), y2 = Math.min(Number(to.slice(0, 4)), new Date().getFullYear());
  for (let y = Math.max(y1, 2026); y <= y2; y++) { const b = archiveBook_(y, false); if (b) books.push({ ss: b, year: y }); }
  const res = { services: [], times: [], incidents: [] };
  books.forEach(b => {
    const sv = read_('Servicios', b.ss), tm = read_('Tiempos', b.ss), ic = read_('Incidencias', b.ss);
    sv.forEach(s => {
      if (s.archivado) return;
      const dd = day_(s.creado);
      if (dd < from || dd > to) return;
      if (plate && norm_(s.matricula).indexOf(plate) < 0 && norm_(s.chasis).indexOf(plate) < 0) return;
      if (client && s.cliente !== client) return;
      if (worker && !participants_(tm, s.id)[worker]) return;
      if (d.status === 'open' && s.cerrado) return;
      if (d.status === 'closed' && !s.cerrado) return;
      if (!canService_(u, s, clients, tm)) return;
      s.year = b.year || null;
      res.services.push(s);
    });
    const ids = {}; res.services.forEach(s => ids[s.id] = 1);
    tm.forEach(t => { if (ids[t.servicio]) res.times.push(t); });
    ic.forEach(i => { if (ids[i.servicio]) res.incidents.push(i); });
  });
  if (res.services.length > 400) { res.services = res.services.slice(-400); res.truncated = true; }
  return res;
}

function archivedService_(d, u) {
  const b = archiveBook_(Number(d.year), false);
  if (!b) fail_('Histórico no encontrado.');
  const s = read_('Servicios', b).find(x => x.id === d.id);
  if (!s) fail_('Servicio no encontrado.');
  const tm = read_('Tiempos', b);
  if (!canService_(u, s, read_('Clientes'), tm)) fail_('Sin permiso.');
  return { service: s, times: tm.filter(t => t.servicio === s.id), incidents: read_('Incidencias', b).filter(i => i.servicio === s.id), photos: read_('Fotos', b).filter(f => f.servicio === s.id).map(f => ({ id: f.id, servicio: f.servicio, incidencia: f.incidencia, tipo: f.tipo, visible: !!f.visible, por: f.por, fecha: f.fecha, year: d.year })) };
}

/* ------------------------------------------------------------------ */
/* Jornada laboral (fichaje)                                           */
/* ------------------------------------------------------------------ */

function workRange_(d) {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d.from) || !/^\d{4}-\d{2}-\d{2}$/.test(d.to) || d.from > d.to) fail_('Selecciona un intervalo válido.');
}
function inRange_(j, d) { return j.dia <= d.to && day_(j.fin || iso_()) >= d.from; }

function workSnapshot_(d, u) {
  workRange_(d);
  const all = read_('Jornadas').filter(j => j.usuario === u.id);
  return { current: all.find(j => !j.fin) || null, list: all.filter(j => inRange_(j, d)), horas: Number(u.horas) || 0 };
}
function workPunch_(d, u) {
  if (u.rol === 'cliente') fail_('Sin permiso.');
  return locked_(() => {
    const now = iso_(), op = d.op;
    let j = read_('Jornadas').find(x => x.usuario === u.id && !x.fin);
    let isNew = false;
    if (op === 'in') {
      if (j) fail_('Ya tienes una jornada abierta.');
      j = { id: uid_(), usuario: u.id, dia: day_(now), inicio: now, fin: '', descansos: [], geo: [], auditoria: [] };
      isNew = true;
    } else {
      if (!j) fail_('Primero ficha la entrada.');
      const b = (j.descansos || []).find(x => !x.end);
      if (op === 'break') { if (b) fail_('Ya estás en descanso.'); j.descansos.push({ start: now, end: null }); }
      else if (op === 'resume') { if (!b) fail_('No estás en descanso.'); b.end = now; }
      else if (op === 'out') { if (b) b.end = now; j.fin = now; closeUserTimes_(u.id, now, null).length && refreshStatus_(read_('Servicios').map(s => s.id)); }
      else fail_('Acción no válida.');
    }
    if (op === 'in' || op === 'out') { j.geo = j.geo || []; j.geo.push({ id: uid_(), kind: op, at: now, status: 'pending' }); }
    if (isNew) insert_('Jornadas', j); else update_('Jornadas', j);
    return j;
  });
}
function workLocation_(d, u) {
  return locked_(() => {
    const j = read_('Jornadas').find(x => x.id === d.jornada && x.usuario === u.id);
    if (!j) fail_('Jornada no encontrada.');
    const e = (j.geo || []).find(x => x.id === d.event);
    if (!e || e.status !== 'pending') return j;
    const g = d.geo || {};
    const lat = Number(g.lat), lng = Number(g.lng), acc = Number(g.accuracy);
    if (g.status === 'ok' && isFinite(lat) && Math.abs(lat) <= 90 && isFinite(lng) && Math.abs(lng) <= 180 && isFinite(acc) && acc >= 0) {
      e.status = acc > 100 ? 'low_accuracy' : 'ok'; e.lat = lat; e.lng = lng; e.accuracy = acc;
    } else { e.status = 'unavailable'; e.reason = clean_(g.reason, 120) || 'Ubicación no disponible'; }
    update_('Jornadas', j);
    return j;
  });
}
function workList_(d, u) {
  admin_(u); workRange_(d);
  return read_('Jornadas').filter(j => (!d.user || j.usuario === d.user) && inRange_(j, d));
}
function workCorrect_(d, u) {
  admin_(u);
  return locked_(() => {
    const all = read_('Jornadas'), j = all.find(x => x.id === d.id), reason = clean_(d.reason, 300);
    if (!j || !reason) fail_('Indica el motivo de la corrección.');
    const a = new Date(d.start), b = new Date(d.end);
    if (!isFinite(+a) || !isFinite(+b) || +b <= +a || +b > Date.now()) fail_('Horas no válidas.');
    let last = +a;
    const breaks = (Array.isArray(d.breaks) ? d.breaks : []).map(x => {
      const s = new Date(x.start), e = new Date(x.end);
      if (!isFinite(+s) || !isFinite(+e) || +s < last || +e <= +s || +e > +b) fail_('Descansos no válidos o solapados.');
      last = +e; return { start: s.toISOString(), end: e.toISOString() };
    });
    if (all.some(x => x.id !== j.id && x.usuario === j.usuario && Date.parse(x.inicio) < +b && (!x.fin || Date.parse(x.fin) > +a))) fail_('La corrección se solapa con otra jornada.');
    insert_('Cambios', { id: uid_(), fecha: iso_(), usuario: u.id, servicio: 'jornada:' + j.id, motivo: reason, antes: { inicio: j.inicio, fin: j.fin, descansos: j.descansos }, despues: { inicio: a.toISOString(), fin: b.toISOString(), descansos: breaks } });
    j.inicio = a.toISOString(); j.fin = b.toISOString(); j.dia = day_(j.inicio); j.descansos = breaks;
    j.auditoria = (j.auditoria || []).concat([{ by: u.id, at: iso_(), reason: reason }]);
    update_('Jornadas', j);
    return j;
  });
}
function workAdd_(d, u) {
  admin_(u);
  return locked_(() => {
    const w = read_('Usuarios').find(x => x.id === d.user), a = new Date(d.start), b = new Date(d.end), reason = clean_(d.reason, 300);
    if (!w || !reason || !isFinite(+a) || !isFinite(+b) || +b <= +a || +b > Date.now()) fail_('Completa trabajador, horas y motivo.');
    if (read_('Jornadas').some(x => x.usuario === w.id && Date.parse(x.inicio) < +b && (!x.fin || Date.parse(x.fin) > +a))) fail_('Se solapa con otra jornada.');
    return insert_('Jornadas', { id: uid_(), usuario: w.id, dia: day_(a), inicio: a.toISOString(), fin: b.toISOString(), descansos: [], geo: [], auditoria: [{ by: u.id, at: iso_(), reason: reason, kind: 'alta manual' }] });
  });
}

/* ------------------------------------------------------------------ */
/* Albaranes por periodo (PDF en la carpeta del cliente)               */
/* ------------------------------------------------------------------ */

function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function dataUri_(fileId) { try { const b = DriveApp.getFileById(fileId).getBlob(); return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); } catch (e) { return ''; } }
function fmtDate_(t) { return t ? Utilities.formatDate(new Date(t), APP.zona, 'dd/MM/yyyy') : '—'; }

function receiptCreate_(d, u) {
  admin_(u); workRange_(d);
  const client = clientById_(read_('Clientes'), d.cliente);
  if (!client) fail_('Cliente no válido.');
  const h = history_({ from: '2000-01-01', to: '2999-12-31', cliente: client.id, status: 'closed' }, u);
  const services = h.services.filter(s => s.cerrado && day_(s.cerrado) >= d.from && day_(s.cerrado) <= d.to).sort((a, b) => Date.parse(a.cerrado) - Date.parse(b.cerrado));
  if (!services.length) fail_('No hay servicios entregados en ese periodo.');
  const users = read_('Usuarios'), name = id => (users.find(x => x.id === id) || {}).nombre || id;
  const fotos = read_('Fotos');
  const logo = dataUri_(APP.logoDriveId);
  const ref = 'ALB-' + d.from.replace(/-/g, '') + '-' + uid_().slice(0, 4).toUpperCase();
  const rows = services.map(s => {
    const team = Object.keys(participants_(h.times, s.id)).map(name).join(', ');
    const r = s.recibo || {};
    const firma = r.firma ? (fotos.find(f => f.id === r.firma) || {}).archivo : '';
    const sig = firma ? dataUri_(firma) : '';
    return '<tr><td>' + fmtDate_(s.creado) + '<br><span class="m">' + fmtDate_(s.cerrado) + '</span></td><td><b>' + esc_(s.matricula || '—') + '</b>' + (s.chasis ? '<br><span class="m">' + esc_(s.chasis) + '</span>' : '') + '</td><td>' + esc_([s.marca, s.modelo].filter(Boolean).join(' ') || s.vehiculo || '—') + '</td><td>' + esc_(s.tipo) + '<br><span class="m">' + esc_(team) + '</span></td><td>' + esc_(r.signer || 'Sin firma') + '<br><span class="m">' + esc_(r.conformity || '') + (r.observations ? ' · ' + esc_(r.observations) : '') + '</span>' + (sig ? '<br><img class="sig" src="' + sig + '">' : '') + '</td></tr>';
  }).join('');
  const html = '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;color:#193545;font-size:10px;margin:28px}' +
    '.hd{border-bottom:2px solid #ac812e;padding-bottom:10px;margin-bottom:14px}.hd img{height:58px;vertical-align:middle}' +
    '.hd .t{display:inline-block;vertical-align:middle;margin-left:12px}.hd h1{font-size:17px;margin:0;color:#102d48}.hd p{margin:2px 0;color:#526b76}' +
    '.meta{margin:0 0 12px;font-size:10.5px}.meta b{color:#102d48}' +
    'table{width:100%;border-collapse:collapse}th{background:#102d48;color:#fff;text-align:left;padding:6px;font-size:9.5px}' +
    'td{border-bottom:1px solid #d8e2e4;padding:6px;vertical-align:top}tr:nth-child(even) td{background:#f5f8f8}.m{color:#526b76;font-size:9px}' +
    '.sig{height:30px;margin-top:3px}.ft{margin-top:16px;color:#526b76;font-size:9px;border-top:1px solid #d8e2e4;padding-top:8px}' +
    '</style></head><body>' +
    '<div class="hd">' + (logo ? '<img src="' + logo + '">' : '') + '<div class="t"><h1>Albarán de servicios realizados</h1><p>Efecto Mariposa Clean &amp; Care</p></div></div>' +
    '<p class="meta"><b>Cliente:</b> ' + esc_(client.nombre) + ' &nbsp; · &nbsp; <b>Periodo:</b> ' + fmtDate_(d.from + 'T12:00:00Z') + ' – ' + fmtDate_(d.to + 'T12:00:00Z') + ' &nbsp; · &nbsp; <b>Vehículos:</b> ' + services.length + ' &nbsp; · &nbsp; <b>Ref.:</b> ' + ref + '</p>' +
    '<table><tr><th>Inicio / entrega</th><th>Matrícula / chasis</th><th>Vehículo</th><th>Servicio / equipo</th><th>Recepción y firma</th></tr>' + rows + '</table>' +
    '<p class="ft">Una fila por vehículo entregado. Documento sin importes económicos. Las firmas corresponden al albarán individual firmado en la entrega de cada vehículo.</p>' +
    '</body></html>';
  const title = 'Albarán ' + client.nombre + ' ' + d.from + ' a ' + d.to;
  const pdf = Utilities.newBlob(html, MimeType.HTML, title + '.html').getAs(MimeType.PDF).setName(title + '.pdf');
  const folder = folderNamed_(clientFolder_(client.id), 'Albaranes');
  const old = folder.getFilesByName(title + '.pdf');
  while (old.hasNext()) old.next().setTrashed(true);
  const file = folder.createFile(pdf);
  return locked_(() => {
    const rep = { id: ref, cliente: client.id, desde: d.from, hasta: d.to, n: services.length, fecha: iso_(), archivo: file.getId(), titulo: title, servicios: services.map(s => s.id), por: u.id };
    insert_('Albaranes', rep);
    return rep;
  });
}
function receiptList_(d, u) { admin_(u); return read_('Albaranes').slice(-60).reverse(); }
function receiptFile_(d, u) {
  admin_(u);
  const r = read_('Albaranes').find(x => x.id === d.id);
  if (!r) fail_('Albarán no encontrado.');
  return { name: r.titulo + '.pdf', data: Utilities.base64Encode(DriveApp.getFileById(r.archivo).getBlob().getBytes()) };
}

/* ------------------------------------------------------------------ */
/* Equipo y clientes                                                   */
/* ------------------------------------------------------------------ */

function saveUser_(d, u) {
  admin_(u);
  return locked_(() => {
    const users = read_('Usuarios');
    const nombre = clean_(d.nombre, 120);
    const rol = ROLES.indexOf(d.rol) >= 0 ? d.rol : 'trabajador';
    const horas = Number(d.horas) || 0;
    if (!nombre) fail_('Indica el nombre.');
    if (horas < 0 || horas > 60) fail_('Horas semanales no válidas.');
    const acceso = (Array.isArray(d.acceso) ? d.acceso : []).map(x => clean_(x, 60)).filter(Boolean);
    if (d.id) {
      const w = users.find(x => x.id === d.id);
      if (!w) fail_('Usuario no encontrado.');
      if (w.id === 'direccion' && (d.activo === false || rol !== 'admin')) fail_('La cuenta de dirección no se puede desactivar.');
      const deactivating = w.activo && d.activo === false;
      w.nombre = nombre; w.rol = rol; w.horas = horas; w.acceso = acceso; w.empresa = clean_(d.empresa, 120);
      if (typeof d.activo === 'boolean') w.activo = d.activo;
      if (deactivating) { w.tokenV = (Number(w.tokenV) || 1) + 1; const ch = closeUserTimes_(w.id, iso_(), null); refreshStatus_(ch); }
      update_('Usuarios', w);
      log_(u, '', 'editar usuario ' + w.id);
      return { id: w.id };
    }
    const pin = nuevoPin_(users);
    const w = { id: 'u-' + uid_().slice(0, 8), nombre: nombre, rol: rol, pin: pinHash_(pin), acceso: acceso, horas: horas, activo: true, tokenV: 1, empresa: clean_(d.empresa, 120), creado: iso_() };
    insert_('Usuarios', w);
    log_(u, '', 'alta usuario ' + w.id);
    return { id: w.id, pin: pin, nombre: nombre };
  });
}
function resetPin_(d, u) {
  admin_(u);
  return locked_(() => {
    const users = read_('Usuarios'), w = users.find(x => x.id === d.id && x.activo);
    if (!w || w.id === 'direccion') fail_('No se puede restablecer este PIN desde aquí.');
    const pin = nuevoPin_(users);
    w.pin = pinHash_(pin); w.tokenV = (Number(w.tokenV) || 1) + 1;
    update_('Usuarios', w);
    log_(u, '', 'nuevo PIN ' + w.id);
    return { pin: pin, nombre: w.nombre };
  });
}
function saveClient_(d, u) {
  admin_(u);
  return locked_(() => {
    const nombre = clean_(d.nombre, 120);
    if (!nombre) fail_('Indica el nombre del cliente.');
    const tipos = (Array.isArray(d.tipos) ? d.tipos : []).map(x => clean_(x, 60)).filter(Boolean);
    const c = d.id ? read_('Clientes').find(x => x.id === d.id) : { id: 'c-' + uid_().slice(0, 8), carpeta: '', creado: iso_() };
    if (!c) fail_('Cliente no encontrado.');
    c.nombre = nombre; c.tipo = d.tipo === 'particular' ? 'particular' : 'empresa';
    c.protocolo = d.protocolo === 'K2' ? 'K2' : 'general';
    c.tipos = tipos.length ? tipos : (c.protocolo === 'K2' ? TIPOS_K2 : TIPOS_GENERAL);
    c.contacto = clean_(d.contacto, 120); c.telefono = clean_(d.telefono, 40); c.email = clean_(d.email, 120); c.revisor = clean_(d.revisor, 80);
    c.activo = d.activo !== false;
    if (d.id) update_('Clientes', c); else insert_('Clientes', c);
    return { id: c.id };
  });
}

/* ------------------------------------------------------------------ */
/* Mantenimiento: copias y archivo                                     */
/* ------------------------------------------------------------------ */

function systemStatus_(d, u) {
  admin_(u);
  const p = props_().getProperties();
  const counts = {};
  ['Servicios', 'Tiempos', 'Incidencias', 'Fotos', 'Jornadas'].forEach(n => counts[n] = Math.max(0, sheet_(n).getLastRow() - 1));
  return { counts: counts, lastBackup: p.LAST_BACKUP || '', lastArchive: p.LAST_ARCHIVE || '', version: APP.version, storageUsed: DriveApp.getStorageUsed(), storageLimit: DriveApp.getStorageLimit() };
}

function copiaDiaria() {
  const folder = DriveApp.getFolderById(props_().getProperty('COPIAS'));
  DriveApp.getFileById(props_().getProperty('DB')).makeCopy('Copia ' + Utilities.formatDate(new Date(), APP.zona, 'yyyy-MM-dd HH.mm'), folder);
  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) files.push(it.next());
  files.sort((a, b) => b.getDateCreated() - a.getDateCreated()).slice(APP.copiasGuardadas).forEach(f => f.setTrashed(true));
  props_().setProperty('LAST_BACKUP', iso_());
}

function archivarMensual() {
  _ver = null; _ss = null;
  const lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    const limit = Date.now() - APP.diasArchivo * 864e5;
    const services = read_('Servicios');
    const move = services.filter(s => (s.cerrado && Date.parse(s.cerrado) < limit) || (s.archivado && Date.parse(s.archivado.at) < limit));
    const byYear = {};
    move.forEach(s => { const y = Number(day_(s.creado).slice(0, 4)); (byYear[y] = byYear[y] || {})[s.id] = 1; });
    Object.keys(byYear).forEach(y => {
      const ids = byYear[y], book = archiveBook_(y, true);
      moveRows_('Servicios', book, r => ids[r.id]);
      ['Tiempos', 'Incidencias', 'Fotos'].forEach(n => moveRows_(n, book, r => ids[r.servicio]));
      moveRows_('Cambios', book, r => ids[r.servicio]);
    });
    const jl = Date.now() - APP.diasJornadasArchivo * 864e5;
    const jy = {};
    read_('Jornadas').forEach(j => { if (j.fin && Date.parse(j.fin) < jl) jy[j.dia.slice(0, 4)] = 1; });
    Object.keys(jy).forEach(y => moveRows_('Jornadas', archiveBook_(Number(y), true), r => r.fin && Date.parse(r.fin) < jl && r.dia.slice(0, 4) === y));
    const al = Date.now() - 90 * 864e5;
    const ay = new Date().getFullYear();
    moveRows_('Actividad', archiveBook_(ay, true), r => Date.parse(r.fecha) < al);
    props_().setProperty('LAST_ARCHIVE', iso_());
  } finally { lock.releaseLock(); }
}

function moveRows_(name, book, pick) {
  const sh = sheet_(name), cols = SCHEMA[name], n = sh.getLastRow();
  if (n < 2) return;
  const values = sh.getRange(2, 1, n - 1, cols.length).getValues();
  const keep = [], moved = [];
  values.forEach(r => { if (r[0] === '') return; (pick(parseRow_(cols, r)) ? moved : keep).push(r); });
  if (!moved.length) return;
  const dest = book.getSheetByName(name);
  dest.getRange(dest.getLastRow() + 1, 1, moved.length, cols.length).setValues(moved);
  sh.getRange(2, 1, n - 1, cols.length).clearContent();
  if (keep.length) sh.getRange(2, 1, keep.length, cols.length).setValues(keep);
  bump_(name);
}
