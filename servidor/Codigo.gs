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
  version: '3.1.0',
  appUrl: 'https://efectomariposaclean-create.github.io/em-operaciones/',
  diasEnlace: 15,          // días que el enlace del particular sigue activo tras la entrega
  zona: 'Europe/Madrid',
  diasArchivo: 60,        // servicios entregados hace más de X días pasan al histórico
  diasJornadasArchivo: 120,
  copiasGuardadas: 30,    // copias diarias que se conservan
  sesionDias: 30,
  logoDriveId: '19NRhA8ki8p5HPogdmMtAWarafkQAUu5I',
  marcaAguaDriveId: '1MmA9SLhIcpODuhz0m2JatGb2LZAYyyya'
};

const ROLES = ['admin', 'trabajador', 'subcontrata', 'cliente'];
const VEHICULOS = ['Autocaravana', 'Camper', 'Caravana', 'Coche', 'Furgoneta', 'Cabeza tractora', 'Camión', 'Autobús', 'Otro'];
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
  Clientes:   ['id', 'nombre', 'tipo', 'protocolo', 'tipos', 'contacto', 'telefono', 'email', 'revisor', 'carpeta', 'activo', 'creado', 'avisos', 'nif', 'direccion', 'ritmo', 'ultimo', 'crm', 'tarifa'],
  Usuarios:   ['id', 'nombre', 'rol', 'pin', 'acceso', 'horas', 'activo', 'tokenV', 'empresa', 'creado', 'email', 'telefono'],
  Servicios:  ['id', 'cliente', 'matricula', 'chasis', 'marca', 'modelo', 'vehiculo', 'tipo', 'estado', 'suciedad', 'alcance', 'exterior', 'extras', 'grupos', 'notas', 'fases', 'maquina', 'recibo', 'creadoPor', 'creado', 'actualizado', 'cerrado', 'archivado', 'carpeta', 'version', 'enlace', 'listo', 'avisos'],
  Tiempos:    ['id', 'servicio', 'usuario', 'tipo', 'inicio', 'fin', 'motivo'],
  Incidencias:['id', 'servicio', 'tipo', 'texto', 'bloqueante', 'por', 'fecha', 'resuelta', 'visible'],
  Fotos:      ['id', 'servicio', 'incidencia', 'tipo', 'visible', 'archivo', 'mini', 'por', 'fecha'],
  Jornadas:   ['id', 'usuario', 'dia', 'inicio', 'fin', 'descansos', 'geo', 'auditoria'],
  Albaranes:  ['id', 'cliente', 'desde', 'hasta', 'n', 'fecha', 'archivo', 'titulo', 'servicios', 'por', 'conformidad'],
  Cambios:    ['id', 'fecha', 'usuario', 'servicio', 'motivo', 'antes', 'despues'],
  Actividad:  ['id', 'fecha', 'usuario', 'servicio', 'accion'],
  Articulos:  ['id', 'codigo', 'tipo', 'grupo', 'nombre', 'marca', 'funcion', 'ubicacion', 'medida', 'nivel', 'cantidad', 'unidad', 'minimo', 'estado', 'precaucion', 'notas', 'compraEstado', 'compraPrioridad', 'compraCantidad', 'compraMotivo', 'proveedor', 'enlace', 'precio', 'foto', 'mini', 'activo', 'actualizado'],
  Movimientos:['id', 'fecha', 'articulo', 'tipo', 'cantidad', 'nivel', 'importe', 'categoria', 'concepto', 'servicio', 'usuario', 'nota'],
  Cargas:     ['id', 'nombre', 'base', 'segun', 'no', 'orden'],
  Ubicaciones:['id', 'ubicacion', 'seccion', 'material', 'regla'],
  Contactos:  ['id', 'nombre', 'tipo', 'contacto', 'telefono', 'email', 'vehiculo', 'ubicacion', 'fase', 'prioridad', 'proxAccion', 'proxFecha', 'origen', 'importe', 'notas', 'revisar', 'cliente', 'evento', 'carpeta', 'creado', 'actualizado', 'ref'],
  Facturas:   ['id', 'numero', 'fecha', 'cliente', 'datos', 'lineas', 'imponible', 'ivaPct', 'iva', 'retPct', 'ret', 'total', 'estado', 'cobros', 'vence', 'archivo', 'notas', 'servicios', 'origen', 'por', 'creado', 'anticipo'],
  Presupuestos:['id', 'numero', 'fecha', 'contacto', 'cliente', 'datos', 'lineas', 'imponible', 'ivaPct', 'iva', 'total', 'validez', 'estado', 'archivo', 'notas', 'por', 'creado'],
  Contabilidad:['id', 'fecha', 'tipo', 'categoria', 'concepto', 'proveedor', 'imponible', 'ivaPct', 'iva', 'total', 'deducible', 'ivaDed', 'metodo', 'justificante', 'notas', 'origen', 'ref', 'por', 'creado']
};
const NOCACHE = { Articulos: 1, Movimientos: 1, Cargas: 1, Ubicaciones: 1 };
const JSON_COLS = { tipos: 1, acceso: 1, extras: 1, grupos: 1, notas: 1, fases: 1, maquina: 1, recibo: 1, archivado: 1, resuelta: 1, descansos: 1, geo: 1, auditoria: 1, servicios: 1, antes: 1, despues: 1, avisos: 1, conformidad: 1, base: 1, segun: 1, no: 1, crm: 1, tarifa: 1, lineas: 1, cobros: 1, datos: 1, anticipo: 1 };
const SCHEMA_V = '5';
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
    HISTORICO: historico.getId(), SECRET: secret_(), PEPPER: secret_(), SCHEMA_V: SCHEMA_V
  });
  const now = iso_();
  insert_('Clientes', { id: 'k2', nombre: 'Caravaning K2', tipo: 'empresa', protocolo: 'K2', tipos: TIPOS_K2, contacto: '', telefono: '', email: '', revisor: 'Inma', carpeta: '', activo: true, creado: now, avisos: true });
  seedInventario_();
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
  _ver = null; _ss = null; _mail = [];
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'Petición no válida.' }); }
  try {
    const fn = ACTIONS[req.action] || (typeof CRM_ACTIONS !== 'undefined' ? CRM_ACTIONS[req.action] : null);
    if (!fn) throw Error('Acción desconocida.');
    if (versions_().SCHEMA_V !== SCHEMA_V) migrate_();
    const open = req.action === 'login' || req.action === 'public' || req.action === 'publicPhoto';
    const user = open ? null : session_(req.token);
    const data = fn(req.data || {}, user, req);
    flushMail_();
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
  systemStatus: systemStatus_,
  shareLink: shareLink_,
  receiptConfirm: receiptConfirm_,
  public: public_,
  publicPhoto: publicPhoto_,
  invSync: invSync_,
  invSave: invSave_,
  invMove: invMove_,
  invGasto: invGasto_,
  invPhoto: invPhoto_,
  invFoto: invFoto_,
  invCarga: invCarga_
};

/** Añade a las hojas las columnas nuevas de cada versión (no borra nada). */
function migrate_() {
  const l = LockService.getScriptLock();
  l.waitLock(20000);
  try {
    if (props_().getProperty('SCHEMA_V') === SCHEMA_V) return;
    Object.keys(SCHEMA).forEach(name => {
      let sh = sheet_(name);
      const cols = SCHEMA[name];
      if (!sh) {
        sh = ss_().insertSheet(name);
        sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
        sh.setFrozenRows(1);
      } else {
        const have = sh.getLastColumn ? sh.getLastColumn() : cols.length;
        if (have < cols.length) sh.getRange(1, have + 1, 1, cols.length - have).setValues([cols.slice(have)]).setFontWeight('bold');
      }
      bump_(name);
    });
    if (!props_().getProperty('INV_SEEDED') && sheet_('Articulos').getLastRow() < 2) seedInventario_();
    if (typeof crmMigrate_ === 'function') crmMigrate_();
    props_().setProperty('SCHEMA_V', SCHEMA_V);
    if (_ver) _ver.SCHEMA_V = SCHEMA_V;
  } finally { l.releaseLock(); }
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function props_() { return PropertiesService.getScriptProperties(); }
function iso_(d) { return (d || new Date()).toISOString(); }
function day_(t) { return Utilities.formatDate(t == null ? new Date() : new Date(t), APP.zona, 'yyyy-MM-dd'); }
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
  if (!ss && NOCACHE[name]) return readSheet_(sheet_(name), cols);
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
  if (u.rol === 'cliente') return !s.archivado;
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
  if (u.rol === 'cliente') return clientSync_(u);
  const clients = read_('Clientes'), users = read_('Usuarios'), times = read_('Tiempos');
  const limit = Date.now() - (u.rol === 'admin' ? 45 : 30) * 864e5;
  const services = read_('Servicios').filter(s => !s.archivado && (!s.cerrado || Date.parse(s.cerrado) >= limit) && canService_(u, s, clients, times));
  const ids = {};
  services.forEach(s => ids[s.id] = 1);
  const visibleClients = clients.filter(c => c.activo !== false && canClient_(u, c));
  return {
    me: { id: u.id, nombre: u.nombre, rol: u.rol, horas: Number(u.horas) || 0, acceso: u.acceso, email: u.email || '', telefono: u.telefono || '' },
    config: { extras: EXTRAS, tiposGeneral: TIPOS_GENERAL, tiposFoto: TIPOS_FOTO, tiposIncidencia: TIPOS_INCIDENCIA, vehiculos: VEHICULOS, version: APP.version },
    clients: visibleClients.map(c => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, protocolo: c.protocolo, tipos: c.tipos || TIPOS_GENERAL, revisor: c.revisor, contacto: u.rol === 'admin' ? c.contacto : '', telefono: u.rol === 'admin' ? c.telefono : '', email: u.rol === 'admin' ? c.email : '', avisos: c.avisos !== false, activo: c.activo !== false })),
    team: users.filter(x => x.activo || u.rol === 'admin').map(publicUser_),
    users: u.rol === 'admin' ? users.map(x => ({ id: x.id, nombre: x.nombre, rol: x.rol, acceso: x.acceso || [], horas: Number(x.horas) || 0, activo: !!x.activo, empresa: x.empresa || '' })) : [],
    services: services,
    times: times.filter(t => ids[t.servicio]),
    incidents: read_('Incidencias').filter(i => ids[i.servicio]).map(i => { i.visible = i.visible !== false; return i; }),
    photos: read_('Fotos').filter(f => ids[f.servicio]).map(f => ({ id: f.id, servicio: f.servicio, incidencia: f.incidencia, tipo: f.tipo, visible: !!f.visible, por: f.por, fecha: f.fecha })),
    now: iso_()
  };
}

/* ------------------------------------------------------------------ */
/* Vista del cliente: solo lo que puede ver, sin datos internos        */
/* ------------------------------------------------------------------ */

function etapa_(s) {
  if (s.cerrado) return 'Entregado';
  const g = s.grupos || [];
  const done = x => x.tasks.every(t => t.state !== 'pending' || t.label === 'Albarán firmado');
  const work = g.filter(x => x.name !== 'Entrega');
  if (work.length && work.every(done)) return 'Listo';
  const pre = work.filter(x => x.name !== 'Calidad');
  if (pre.length && pre.every(done)) return 'Calidad';
  if (g.some(x => x.name !== 'Recepción' && x.tasks.some(t => t.state === 'done'))) return 'Limpieza';
  return 'Recibido';
}
function clientService_(s, incidents) {
  let d = 0, n = 0;
  (s.grupos || []).forEach(g => g.tasks.forEach(t => { n++; if (t.state !== 'pending') d++; }));
  const r = s.recibo;
  return {
    id: s.id, cliente: s.cliente, matricula: s.matricula, chasis: s.chasis, marca: s.marca, modelo: s.modelo, vehiculo: s.vehiculo, tipo: s.tipo,
    etapa: etapa_(s), aviso: (incidents || []).some(i => i.servicio === s.id && !i.resuelta),
    creado: s.creado, listo: s.listo || '', cerrado: s.cerrado || '', progreso: [d, n],
    recibo: r ? { numero: r.numero, signer: r.signer, role: r.role, conformity: r.conformity, observations: r.observations, at: r.at, firma: r.firma } : null
  };
}
function clientIncident_(i) { return { id: i.id, servicio: i.servicio, tipo: i.tipo, texto: i.texto, bloqueante: !!i.bloqueante, fecha: i.fecha, resuelta: i.resuelta ? { text: i.resuelta.text, at: i.resuelta.at } : null }; }
function clientPhoto_(f) { return { id: f.id, servicio: f.servicio, incidencia: f.incidencia, tipo: f.tipo, fecha: f.fecha, visible: true }; }

function clientSync_(u) {
  const clients = read_('Clientes').filter(c => canClient_(u, c));
  const ids = {};
  clients.forEach(c => ids[c.id] = 1);
  const limit = Date.now() - 120 * 864e5;
  const raw = read_('Servicios').filter(s => ids[s.cliente] && !s.archivado && (!s.cerrado || Date.parse(s.cerrado) >= limit));
  const sid = {};
  raw.forEach(s => sid[s.id] = 1);
  const inc = read_('Incidencias').filter(i => sid[i.servicio] && i.visible !== false);
  return {
    me: { id: u.id, nombre: u.nombre, rol: 'cliente', acceso: u.acceso },
    config: { version: APP.version, tiposFoto: TIPOS_FOTO, tiposIncidencia: TIPOS_INCIDENCIA, extras: [], tiposGeneral: [] },
    clients: clients.map(c => ({ id: c.id, nombre: c.nombre, tipo: c.tipo })),
    team: [], users: [], times: [],
    services: raw.map(s => clientService_(s, inc)),
    incidents: inc.map(clientIncident_),
    photos: read_('Fotos').filter(f => sid[f.servicio] && f.visible).map(clientPhoto_),
    now: iso_()
  };
}

/* ------------------------------------------------------------------ */
/* Enlace privado de seguimiento (particulares)                        */
/* ------------------------------------------------------------------ */

function linkOf_(s) { return APP.appUrl + '?v=' + s.enlace; }
function linkExpires_(s) { return s.cerrado ? new Date(Date.parse(s.cerrado) + APP.diasEnlace * 864e5).toISOString() : ''; }
function publicService_(t) {
  if (typeof t !== 'string' || !/^[a-f0-9]{24,64}$/.test(t)) fail_('Enlace no válido.');
  const s = read_('Servicios').find(x => x.enlace === t && !x.archivado);
  if (!s) fail_('Este enlace no existe o ya no está disponible.');
  if (s.cerrado && Date.now() > Date.parse(linkExpires_(s))) fail_('Este enlace de seguimiento ha caducado. Si necesitas las fotos o el albarán, pídeselos a Efecto Mariposa.');
  return s;
}
function public_(d) {
  const s = publicService_(d.t);
  const inc = read_('Incidencias').filter(i => i.servicio === s.id && i.visible !== false);
  const c = clientById_(read_('Clientes'), s.cliente) || {};
  return {
    client: { id: c.id, nombre: c.nombre, tipo: c.tipo },
    service: clientService_(s, inc),
    incidents: inc.map(clientIncident_),
    photos: read_('Fotos').filter(f => f.servicio === s.id && f.visible).map(clientPhoto_),
    expires: linkExpires_(s)
  };
}
function publicPhoto_(d) {
  const s = publicService_(d.t);
  const p = read_('Fotos').find(f => f.id === d.photoId && f.servicio === s.id && f.visible);
  if (!p) fail_('Foto no disponible.');
  const b = DriveApp.getFileById(d.size === 'mini' && p.mini ? p.mini : p.archivo).getBlob();
  return { data: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) };
}
function shareLink_(d, u) {
  if (u.rol === 'cliente') fail_('Sin permiso.');
  return locked_(() => {
    const s = loadService_(u, d.id);
    if (!s.enlace) { s.enlace = secret_().slice(0, 32); update_('Servicios', s); }
    const c = clientById_(read_('Clientes'), s.cliente) || {};
    return { url: linkOf_(s), expires: linkExpires_(s), email: c.email || '', telefono: c.telefono || '', cliente: c.nombre || '' };
  });
}

/* ------------------------------------------------------------------ */
/* Avisos por correo                                                   */
/* ------------------------------------------------------------------ */

let _mail = [];
function emailsOf_(c) { return String(c && c.email || '').split(/[\s,;]+/).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)).slice(0, 5); }
function notify_(kind, s, extra) {
  const c = clientById_(read_('Clientes'), s.cliente);
  if (!c || c.avisos === false) return;
  const to = emailsOf_(c);
  if (!to.length) return;
  s.avisos = s.avisos || [];
  const key = kind + (extra && extra.key ? ':' + extra.key : '');
  if (s.avisos.some(a => a.k === key)) return;
  s.avisos.push({ k: key, at: iso_() });
  _mail.push({ kind: kind, to: to, client: c, s: JSON.parse(JSON.stringify(s)), extra: extra || {} });
}
function flushMail_() {
  const list = _mail; _mail = [];
  list.forEach(m => { try { sendMail_(m); } catch (e) { console.error('Correo no enviado: ' + e); } });
}
function mailHtml_(title, lines, button, link, foot, badge) {
  const W = 'background-color:#ffffff;background-image:linear-gradient(#ffffff,#ffffff);';
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">' +
    '<style>:root{color-scheme:light only;supported-color-schemes:light only}</style></head>' +
    '<body style="margin:0;padding:0;' + W + '">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="' + W + '"><tr><td align="center" style="padding:20px 10px;' + W + '">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;' + W + 'border:1px solid #e2e8eb;border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#16303f">' +
    '<tr><td style="padding:0;' + W + '"><img src="' + APP.appUrl + 'icons/email-banner.png" width="560" alt="Efecto Mariposa · Clean &amp; Care" style="display:block;width:100%;max-width:560px;height:auto;border:0"></td></tr>' +
    '<tr><td style="padding:26px 28px 8px;' + W + '">' +
    (badge ? '<span style="display:inline-block;background-color:#e6f2ec;color:#16573e;font-size:12px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;padding:5px 11px;border-radius:20px;margin-bottom:12px">' + badge + '</span>' : '') +
    '<h1 style="font-size:22px;line-height:1.3;margin:0 0 14px;color:#102d48">' + title + '</h1>' +
    lines.map(l => '<p style="margin:0 0 11px;font-size:15px;line-height:1.6;color:#16303f">' + l + '</p>').join('') +
    (link ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 10px"><tr><td style="background-color:#176447;border-radius:10px"><a href="' + link + '" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px">' + button + '</a></td></tr></table>' : '') +
    '</td></tr>' +
    '<tr><td style="padding:16px 28px 22px;' + W + 'border-top:1px solid #eef2f4;color:#5f7480;font-size:12.5px;line-height:1.55">' + (foot || 'Recibes este aviso porque Efecto Mariposa está trabajando en tu vehículo.') +
    '<br><span style="color:#8a9ba4">Efecto Mariposa Clean &amp; Care · Comunidad de Madrid</span></td></tr>' +
    '</table></td></tr></table></body></html>';
}
function sendMail_(m) {
  const s = m.s, c = m.client, plate = esc_(s.matricula || s.chasis);
  const particular = c.tipo === 'particular';
  const link = particular ? linkOf_(s) : APP.appUrl;
  const btn = particular ? 'Ver el seguimiento' : 'Abrir mi portal';
  const foot = particular ? 'Enlace privado: no lo compartas. Estará disponible hasta ' + APP.diasEnlace + ' días después de la entrega.' : 'Entra con tu PIN personal en el portal de clientes de Efecto Mariposa.';
  let subject, html;
  if (m.kind === 'listo') {
    subject = 'Tu vehículo ' + (s.matricula || s.chasis) + ' está listo';
    html = mailHtml_('Tu vehículo ' + plate + ' está listo', ['Hola, ' + esc_(c.nombre) + ':', 'Hemos terminado la limpieza de <b>' + plate + '</b> (' + esc_(s.tipo) + ') y ha superado nuestro control de calidad.', 'Ya puedes ver las fotos del resultado.'], btn, link, foot, 'Listo para entrega');
  } else if (m.kind === 'incidencia') {
    subject = 'Aviso sobre tu vehículo ' + (s.matricula || s.chasis);
    html = mailHtml_('Aviso sobre tu vehículo ' + plate, ['Hola, ' + esc_(c.nombre) + ':', 'Durante el servicio de <b>' + plate + '</b> hemos registrado lo siguiente:', '<b>' + esc_(m.extra.tipo) + '.</b> ' + esc_(m.extra.texto), 'Puedes ver los detalles y las fotos en tu enlace. Si tienes cualquier duda, responde a este correo.'], btn, link, foot, 'Incidencia');
  } else if (m.kind === 'entregado') {
    const r = s.recibo || {};
    subject = 'Entrega confirmada · ' + (s.matricula || s.chasis);
    html = mailHtml_('Entrega confirmada · ' + plate, ['Hola, ' + esc_(c.nombre) + ':', 'El vehículo <b>' + plate + '</b> se ha entregado el ' + fmtDate_(s.cerrado) + '.', 'Albarán <b>' + esc_(r.numero) + '</b> · recibido por ' + esc_(r.signer) + ' · ' + esc_(r.conformity) + '.', 'Gracias por confiar en Efecto Mariposa.'], btn, link, foot, 'Entregado');
  } else if (m.kind === 'albaran') {
    subject = 'Albarán pendiente de conformidad · ' + m.extra.periodo;
    html = mailHtml_('Albarán del periodo ' + esc_(m.extra.periodo), ['Hola, ' + esc_(c.nombre) + ':', 'Ya tienes disponible el albarán con los <b>' + m.extra.n + ' vehículos</b> entregados en este periodo.', 'Puedes revisarlo, descargarlo y dar tu conformidad desde el portal.'], 'Revisar y dar conformidad', APP.appUrl, 'Entra con tu PIN personal en el portal de clientes de Efecto Mariposa.', 'Albarán');
  } else return;
  MailApp.sendEmail({ to: m.to.join(','), subject: subject, htmlBody: html, name: 'Efecto Mariposa' });
}

/** Ejecútalo una vez desde el editor para dar permiso de envío de correos (te llega una prueba). */
function autorizarCorreo() {
  const me = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({ to: me, subject: 'Prueba de avisos · EM Operaciones', name: 'Efecto Mariposa', htmlBody: mailHtml_('Así verán tus clientes los avisos', ['Este es un correo de prueba.', 'Cuando un vehículo esté listo, tenga una incidencia o se entregue, el cliente recibirá un aviso como este.'], 'Abrir la app', APP.appUrl, '', 'Prueba') });
  console.log('Correo de prueba enviado a ' + me + '. Quedan ' + MailApp.getRemainingDailyQuota() + ' envíos hoy.');
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
        client = { id: 'c-' + uid_().slice(0, 8), nombre: nombre, tipo: 'particular', protocolo: 'general', tipos: TIPOS_GENERAL, contacto: nombre, telefono: clean_(d.newClient.telefono, 40), email: clean_(d.newClient.email, 120), revisor: '', carpeta: '', activo: true, creado: iso_(), avisos: true };
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
      maquina: null, recibo: null, creadoPor: u.id, creado: at, actualizado: at, cerrado: '', archivado: null, carpeta: '', version: 1,
      enlace: secret_().slice(0, 32), listo: '', avisos: []
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
          const inc = { id: iid, servicio: s.id, tipo: TIPOS_INCIDENCIA.indexOf(x.type) >= 0 ? x.type : 'Otra incidencia', texto: text, bloqueante: !!x.blocking, por: u.id, fecha: at, resuelta: null, visible: x.visible !== false };
          insert_('Incidencias', inc);
          if (inc.visible) notify_('incidencia', s, { key: iid, tipo: inc.tipo, texto: inc.texto });
        }
        break;
      }
      case 'incidentVisible': {
        const i = read_('Incidencias').find(v => v.id === x.incidentId && v.servicio === s.id);
        if (!i) fail_('Incidencia no encontrada.');
        i.visible = !!x.visible;
        update_('Incidencias', i);
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
    if (!s.cerrado && !s.listo && etapa_(s) === 'Listo') { s.listo = at; notify_('listo', s); }
    if (op === 'close') notify_('entregado', s);
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
  if (u.rol === 'cliente') {
    const inc = res.incidents.filter(i => i.visible !== false);
    res.services = res.services.map(s => { const o = clientService_(s, inc); o.year = s.year; return o; });
    res.incidents = inc.map(clientIncident_); res.times = [];
  }
  return res;
}

function archivedService_(d, u) {
  const b = archiveBook_(Number(d.year), false);
  if (!b) fail_('Histórico no encontrado.');
  const s = read_('Servicios', b).find(x => x.id === d.id);
  if (!s) fail_('Servicio no encontrado.');
  const tm = read_('Tiempos', b);
  if (!canService_(u, s, read_('Clientes'), tm)) fail_('Sin permiso.');
  if (u.rol === 'cliente') {
    const inc = read_('Incidencias', b).filter(i => i.servicio === s.id && i.visible !== false);
    return { service: clientService_(s, inc), times: [], incidents: inc.map(clientIncident_), photos: read_('Fotos', b).filter(f => f.servicio === s.id && f.visible).map(clientPhoto_) };
  }
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

const SYSTEM_ = { id: 'sistema', rol: 'admin', acceso: [] };
function receiptServices_(clientId, from, to, ids) {
  const h = history_({ from: '2000-01-01', to: '2999-12-31', cliente: clientId, status: 'closed' }, SYSTEM_);
  let list = h.services.filter(s => s.cerrado && day_(s.cerrado) >= from && day_(s.cerrado) <= to);
  if (ids) { const want = {}; ids.forEach(x => want[typeof x === 'string' ? x : x.id] = 1); list = h.services.filter(s => want[s.id]); }
  return { services: list.sort((a, b) => Date.parse(a.cerrado) - Date.parse(b.cerrado)), times: h.times };
}
function receiptPdf_(client, from, to, ref, data, conf, confSig) {
  const users = read_('Usuarios'), name = id => (users.find(x => x.id === id) || {}).nombre || id;
  const fotos = read_('Fotos');
  const filas = data.services.map(s => {
    const team = Object.keys(participants_(data.times, s.id)).map(name).join(', ');
    const r = s.recibo || {};
    const firma = r.firma ? (fotos.find(f => f.id === r.firma) || {}).archivo : '';
    const sig = firma ? dataUri_(firma) : '';
    return [fmtDate_(s.creado) + '<br><span class="m">Entrega ' + fmtDate_(s.cerrado) + '</span>',
      '<b>' + esc_(s.matricula || '—') + '</b>' + (s.chasis ? '<br><span class="m">' + esc_(s.chasis) + '</span>' : ''),
      esc_([s.vehiculo, s.marca, s.modelo].filter(Boolean).join(' · ') || '—'),
      esc_(s.tipo) + (team ? '<br><span class="m">' + esc_(team) + '</span>' : ''),
      esc_(r.signer || 'Sin firma') + '<br><span class="m">' + esc_(r.conformity || '') + (r.observations ? ' · ' + esc_(r.observations) : '') + '</span>' + (sig ? '<br><img class="sig" src="' + sig + '">' : '')];
  });
  const confHtml = conf
    ? '<div class="bx ok"><b>Conformidad del cliente:</b> ' + esc_(conf.conformity) + ' · ' + esc_(conf.signer) + ' · ' + Utilities.formatDate(new Date(conf.at), APP.zona, 'dd/MM/yyyy HH:mm') + ' · ' + esc_(conf.canal) + (conf.observations ? '<br><b>Observaciones:</b> ' + esc_(conf.observations) : '') + (confSig ? '<br><img class="csig" src="' + confSig + '">' : '') + '</div>'
    : '<div class="bx wa"><b>Pendiente de conformidad del cliente.</b> Puede confirmarse desde el portal del cliente o firmando en persona.</div>';
  const html = docHtml_({ tipo: 'ALBARÁN', numero: ref, meta: [['Periodo', fmtDate_(from + 'T12:00:00Z') + ' – ' + fmtDate_(to + 'T12:00:00Z')], ['Vehículos entregados', String(data.services.length)], ['Emitido', fmtDate_(iso_())]],
    para: { nombre: client.nombre, nif: client.nif || '', direccion: client.direccion || '' },
    cols: ['Recepción', 'Matrícula / chasis', 'Vehículo', 'Servicio · equipo', 'Recibido y firma'], filas: filas,
    bloques: [confHtml, '<p class="m" style="margin-top:10px">Una fila por vehículo entregado. Documento sin importes económicos. Las firmas corresponden al albarán individual firmado en la entrega de cada vehículo.</p>'] });
  const title = 'Albarán ' + client.nombre + ' ' + from + ' a ' + to;
  return { title: title, blob: Utilities.newBlob(html, MimeType.HTML, title + '.html').getAs(MimeType.PDF).setName(title + '.pdf') };
}
function saveReceiptFile_(client, pdf, oldId) {
  const folder = folderNamed_(clientFolder_(client.id), 'Albaranes');
  if (oldId) { try { DriveApp.getFileById(oldId).setTrashed(true); } catch (e) {} }
  const old = folder.getFilesByName(pdf.title + '.pdf');
  while (old.hasNext()) old.next().setTrashed(true);
  return folder.createFile(pdf.blob);
}

function receiptCreate_(d, u) {
  admin_(u); workRange_(d);
  const client = clientById_(read_('Clientes'), d.cliente);
  if (!client) fail_('Cliente no válido.');
  const data = receiptServices_(client.id, d.from, d.to);
  if (!data.services.length) fail_('No hay servicios entregados en ese periodo.');
  const ref = 'ALB-' + d.from.replace(/-/g, '') + '-' + uid_().slice(0, 4).toUpperCase();
  const pdf = receiptPdf_(client, d.from, d.to, ref, data, null, '');
  const file = saveReceiptFile_(client, pdf, '');
  const rep = locked_(() => {
    const r = { id: ref, cliente: client.id, desde: d.from, hasta: d.to, n: data.services.length, fecha: iso_(), archivo: file.getId(), titulo: pdf.title,
      servicios: data.services.map(s => ({ id: s.id, matricula: s.matricula || s.chasis, tipo: s.tipo, cerrado: s.cerrado })), por: u.id, conformidad: null };
    insert_('Albaranes', r);
    return r;
  });
  const to = emailsOf_(client);
  if (client.avisos !== false && to.length) _mail.push({ kind: 'albaran', to: to, client: client, s: {}, extra: { periodo: fmtDate_(d.from + 'T12:00:00Z') + ' – ' + fmtDate_(d.to + 'T12:00:00Z'), n: data.services.length } });
  return rep;
}
function receiptAccess_(u, r) {
  if (u.rol === 'admin') return true;
  return canClient_(u, clientById_(read_('Clientes'), r.cliente));
}
function receiptList_(d, u) {
  const all = read_('Albaranes').filter(r => receiptAccess_(u, r));
  return all.slice(-80).reverse().map(r => { const o = Object.assign({}, r); if (o.conformidad) delete o.conformidad.firma; return o; });
}
function receiptFile_(d, u) {
  const r = read_('Albaranes').find(x => x.id === d.id);
  if (!r || !receiptAccess_(u, r)) fail_('Albarán no encontrado.');
  return { name: r.titulo + '.pdf', data: Utilities.base64Encode(DriveApp.getFileById(r.archivo).getBlob().getBytes()) };
}
function receiptConfirm_(d, u) {
  const r0 = read_('Albaranes').find(x => x.id === d.id);
  if (!r0 || !receiptAccess_(u, r0)) fail_('Albarán no encontrado.');
  if (r0.conformidad) fail_('Este albarán ya tiene la conformidad registrada.');
  if (['Conforme', 'Con observaciones'].indexOf(d.conformity) < 0) fail_('Indica si das la conformidad.');
  const obs = clean_(d.observations, 1500);
  if (d.conformity === 'Con observaciones' && !obs) fail_('Escribe las observaciones.');
  const client = clientById_(read_('Clientes'), r0.cliente);
  const conf = { conformity: d.conformity, observations: obs, at: iso_(), by: u.id };
  let sig = '';
  if (u.rol === 'cliente') {
    conf.signer = u.nombre; conf.canal = 'Confirmado desde el portal del cliente';
  } else {
    conf.signer = clean_(d.signer, 120);
    if (!conf.signer) fail_('Indica el nombre de quien firma.');
    if (typeof d.signature !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d.signature) || d.signature.length < 500 || d.signature.length > 1500000) fail_('Falta la firma.');
    sig = d.signature;
    conf.canal = 'Firmado en persona';
    const f = folderNamed_(folderNamed_(clientFolder_(client.id), 'Albaranes'), 'Firmas').createFile(Utilities.newBlob(Utilities.base64Decode(sig.split(',')[1]), 'image/png', r0.id + ' firma.png'));
    conf.firma = f.getId();
  }
  const data = receiptServices_(client.id, r0.desde, r0.hasta, r0.servicios || []);
  const pdf = receiptPdf_(client, r0.desde, r0.hasta, r0.id, data, conf, sig);
  const file = saveReceiptFile_(client, pdf, r0.archivo);
  return locked_(() => {
    const r = read_('Albaranes').find(x => x.id === d.id);
    if (r.conformidad) { file.setTrashed(true); fail_('Este albarán ya tiene la conformidad registrada.'); }
    r.conformidad = conf; r.archivo = file.getId();
    update_('Albaranes', r);
    log_(u, '', 'conformidad ' + r.id);
    return { ok: true };
  });
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
    let acceso = (Array.isArray(d.acceso) ? d.acceso : []).map(x => clean_(x, 60)).filter(Boolean);
    if (rol === 'cliente') { acceso = acceso.filter(x => x !== PARTICULARES).slice(0, 1); if (!acceso.length) fail_('Elige el cliente al que pertenece.'); }
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
    c.avisos = d.avisos !== false;
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

/* ------------------------------------------------------------------ */
/* Almacén: productos, material, maquinaria, compras y gastos          */
/* ------------------------------------------------------------------ */

const NIVELES = ['lleno', 'medio', 'poco', 'agotado'];
const CAT_GASTO = ['Productos', 'Material', 'Maquinaria', 'Combustible', 'Herramientas', 'Vehículo', 'Otros'];
function insertMany_(name, objs) {
  if (!objs.length) return;
  const sh = sheet_(name), cols = SCHEMA[name];
  sh.getRange(sh.getLastRow() + 1, 1, objs.length, cols.length).setValues(objs.map(o => rowOf_(cols, o)));
  bump_(name);
}
function seedData_() { return typeof SEED_INVENTARIO !== 'undefined' ? SEED_INVENTARIO : null; }
/** Carga tu inventario inicial (archivo privado Inventario.gs). Ejecútalo una vez desde el editor si el almacén aparece vacío. */
function cargarInventarioInicial() {
  _ver = null; _ss = null;
  if (read_('Articulos').length) { console.log('El almacén ya tiene artículos. No se ha cambiado nada.'); return; }
  if (!seedData_()) { console.log('Falta el archivo Inventario.gs con tus datos.'); return; }
  seedInventario_();
  console.log('Inventario cargado: ' + read_('Articulos').length + ' artículos.');
}
function seedInventario_() {
  const seed = seedData_(), now = iso_(), ids = {};
  if (!seed) return;
  insertMany_('Articulos', seed.articulos.map(a => { const id = 'a-' + a.codigo.toLowerCase(); ids[a.codigo] = id; return Object.assign({ id: id, precio: '', foto: '', mini: '', activo: true, actualizado: now }, a); }));
  insertMany_('Movimientos', seed.movimientos.map(m => ({ id: uid_(), fecha: m.fecha, articulo: ids[m.codigo] || '', tipo: 'entrada', cantidad: m.cantidad, nivel: '', importe: m.importe, categoria: '', concepto: '', servicio: '', usuario: 'direccion', nota: m.nota })));
  insertMany_('Cargas', seed.cargas.map((c, i) => ({ id: 'cg-' + (i + 1), nombre: c.nombre, base: c.base, segun: c.segun, no: c.no, orden: i + 1 })));
  insertMany_('Ubicaciones', seed.ubicaciones.map((x, i) => Object.assign({ id: 'ub-' + (i + 1) }, x)));
  props_().setProperty('INV_SEEDED', now);
}
function staff_(u) { if (u.rol === 'cliente') fail_('Sin permiso.'); }
function low_(a) {
  if (a.medida === 'nivel') return a.nivel === 'poco' || a.nivel === 'agotado';
  if (a.cantidad === '' || a.cantidad == null) return false;
  if (Number(a.cantidad) <= 0) return true;
  return a.minimo !== '' && a.minimo != null && Number(a.cantidad) <= Number(a.minimo);
}
function cleanArt_(a, admin) {
  const o = Object.assign({}, a);
  o.bajo = low_(a);
  if (!admin) { delete o.precio; delete o.enlace; delete o.proveedor; }
  return o;
}
function invSync_(d, u) {
  staff_(u);
  const admin = u.rol === 'admin';
  const movs = read_('Movimientos');
  const limit = Date.now() - 400 * 864e5;
  return {
    articulos: read_('Articulos').filter(a => a.activo !== false && a.activo !== 'false').map(a => cleanArt_(a, admin)),
    cargas: read_('Cargas').sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0)),
    ubicaciones: read_('Ubicaciones'),
    movimientos: (admin ? movs.filter(m => Date.parse(m.fecha) >= limit) : movs.filter(m => m.usuario === u.id && m.tipo !== 'gasto').slice(-60)).map(m => admin ? m : Object.assign({}, m, { importe: '' })),
    categorias: CAT_GASTO
  };
}
function invSave_(d, u) {
  admin_(u);
  return locked_(() => {
    const all = read_('Articulos');
    let a = d.id ? all.find(x => x.id === d.id) : null;
    if (d.id && !a) fail_('Artículo no encontrado.');
    const nombre = clean_(d.nombre, 120);
    if (!nombre) fail_('Indica el nombre.');
    const isNew = !a;
    if (isNew) a = { id: 'a-' + uid_().slice(0, 8), codigo: '', foto: '', mini: '', activo: true, compraEstado: '', compraPrioridad: '', compraCantidad: '', compraMotivo: '', precio: '' };
    a.nombre = nombre;
    a.tipo = ['producto', 'material', 'maquina', 'consumible'].indexOf(d.tipo) >= 0 ? d.tipo : 'material';
    ['grupo', 'marca', 'funcion', 'ubicacion', 'unidad', 'estado', 'precaucion', 'notas', 'proveedor', 'enlace', 'codigo'].forEach(k => { if (d[k] !== undefined) a[k] = clean_(d[k], k === 'enlace' ? 500 : 300); });
    a.medida = d.medida === 'nivel' ? 'nivel' : 'cantidad';
    if (a.medida === 'nivel') { a.nivel = NIVELES.indexOf(d.nivel) >= 0 ? d.nivel : (a.nivel || ''); a.cantidad = ''; }
    else a.cantidad = d.cantidad === '' || d.cantidad == null ? '' : Math.max(0, Number(d.cantidad) || 0);
    a.minimo = d.minimo === '' || d.minimo == null ? '' : Math.max(0, Number(d.minimo) || 0);
    if (d.activo === false) a.activo = false;
    a.actualizado = iso_();
    if (isNew) insert_('Articulos', a); else update_('Articulos', a);
    return cleanArt_(a, true);
  });
}
function invMove_(d, u) {
  staff_(u);
  const admin = u.rol === 'admin';
  return locked_(() => {
    const a = read_('Articulos').find(x => x.id === d.id);
    if (!a) fail_('Artículo no encontrado.');
    const t = d.tipo, at = iso_(), mv = { id: uid_(), fecha: at, articulo: a.id, tipo: t, cantidad: '', nivel: '', importe: '', categoria: '', concepto: '', servicio: clean_(d.servicio, 60), usuario: u.id, nota: clean_(d.nota, 300) };
    const n = Number(d.cantidad);
    if (t === 'consumo') {
      if (a.medida === 'nivel') { if (NIVELES.indexOf(d.nivel) < 0) fail_('Indica cómo queda el producto.'); a.nivel = d.nivel; mv.nivel = d.nivel; }
      else { if (!(n > 0)) fail_('Indica la cantidad usada.'); a.cantidad = Math.max(0, (Number(a.cantidad) || 0) - n); mv.cantidad = n; }
      if (low_(a) && !a.compraEstado) { a.compraEstado = 'pendiente'; a.compraMotivo = 'Stock bajo'; a.compraPrioridad = a.compraPrioridad || 'Alta'; }
    } else if (t === 'aviso' && a.tipo === 'maquina') {
      a.estado = 'En revisión';
      a.notas = clean_(('Aviso de ' + u.nombre + ' (' + day_(at) + '): ' + mv.nota + '. ' + (a.notas || '')), 300);
    } else if (t === 'aviso') {
      if (a.compraEstado !== 'pedido') { a.compraEstado = 'pendiente'; a.compraMotivo = 'Aviso de ' + u.nombre + (mv.nota ? ': ' + mv.nota : ''); a.compraPrioridad = a.compraPrioridad || 'Alta'; }
      if (a.medida === 'nivel' && (a.nivel === 'lleno' || a.nivel === 'medio' || !a.nivel)) a.nivel = 'poco';
    } else {
      if (!admin) fail_('Solo dirección.');
      if (t === 'entrada') {
        if (a.medida === 'nivel') { a.nivel = NIVELES.indexOf(d.nivel) >= 0 ? d.nivel : 'lleno'; mv.nivel = a.nivel; mv.cantidad = n > 0 ? n : ''; }
        else { if (!(n > 0)) fail_('Indica la cantidad recibida.'); a.cantidad = (Number(a.cantidad) || 0) + n; mv.cantidad = n; }
        const imp = Number(String(d.importe || '').replace(',', '.'));
        if (imp > 0) { mv.importe = Math.round(imp * 100) / 100; mv.categoria = a.tipo === 'producto' ? 'Productos' : a.tipo === 'maquina' ? 'Maquinaria' : 'Material'; mv.concepto = a.nombre; if (n > 0) a.precio = Math.round(imp / n * 100) / 100; }
        a.compraEstado = ''; a.compraMotivo = ''; a.compraCantidad = ''; a.compraPrioridad = '';
      } else if (t === 'ajuste') {
        if (a.medida === 'nivel') { if (NIVELES.indexOf(d.nivel) < 0) fail_('Indica el nivel.'); a.nivel = d.nivel; mv.nivel = d.nivel; }
        else { if (!(n >= 0)) fail_('Indica la cantidad real.'); a.cantidad = n; mv.cantidad = n; }
      } else if (t === 'compra') {
        a.compraEstado = 'pendiente'; a.compraPrioridad = clean_(d.prioridad, 30) || 'Alta'; a.compraCantidad = clean_(d.cantidadTxt, 60); a.compraMotivo = clean_(d.motivo, 200);
      } else if (t === 'pedido') {
        a.compraEstado = 'pedido';
      } else if (t === 'quitar') {
        a.compraEstado = ''; a.compraMotivo = ''; a.compraCantidad = ''; a.compraPrioridad = '';
      } else if (t === 'estado') {
        a.estado = clean_(d.estado, 40);
      } else fail_('Acción no válida.');
    }
    a.actualizado = at;
    update_('Articulos', a);
    if (['consumo', 'aviso', 'entrada', 'ajuste'].indexOf(t) >= 0) insert_('Movimientos', mv);
    if (mv.importe && typeof accMirror_ === 'function') accMirror_(mv, u);
    return cleanArt_(a, admin);
  });
}
function invGasto_(d, u) {
  admin_(u);
  return locked_(() => {
    if (d.borrar) {
      const m = read_('Movimientos').find(x => x.id === d.borrar && x.tipo === 'gasto');
      if (!m) fail_('Gasto no encontrado.');
      m.tipo = 'gasto-anulado'; update_('Movimientos', m);
      if (typeof accUnmirror_ === 'function') accUnmirror_(m.id);
      return { ok: true };
    }
    const imp = Number(String(d.importe || '').replace(',', '.'));
    const concepto = clean_(d.concepto, 160);
    if (!concepto || !(imp > 0)) fail_('Indica concepto e importe.');
    const f = /^\d{4}-\d{2}-\d{2}$/.test(d.fecha) ? new Date(d.fecha + 'T12:00:00Z').toISOString() : iso_();
    const mv = insert_('Movimientos', { id: uid_(), fecha: f, articulo: '', tipo: 'gasto', cantidad: '', nivel: '', importe: Math.round(imp * 100) / 100, categoria: CAT_GASTO.indexOf(d.categoria) >= 0 ? d.categoria : 'Otros', concepto: concepto, servicio: '', usuario: u.id, nota: clean_(d.nota, 300) });
    if (typeof accMirror_ === 'function') accMirror_(mv, u);
    return mv;
  });
}
function invPhoto_(d, u) {
  staff_(u);
  const m = String(d.data || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  const t = String(d.thumb || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > 6000000) fail_('Imagen no válida.');
  const folder = folderNamed_(DriveApp.getFolderById(props_().getProperty('ROOT')), 'Almacén');
  const a0 = read_('Articulos').find(x => x.id === d.id);
  if (!a0) fail_('Artículo no encontrado.');
  const f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), 'image/' + m[1], (a0.codigo || a0.id) + ' ' + a0.nombre + '.jpg'));
  const mf = t ? folderNamed_(folder, 'miniaturas').createFile(Utilities.newBlob(Utilities.base64Decode(t[2]), 'image/' + t[1], a0.id + '.jpg')) : null;
  return locked_(() => {
    const a = read_('Articulos').find(x => x.id === d.id);
    a.foto = f.getId(); a.mini = mf ? mf.getId() : ''; a.actualizado = iso_();
    update_('Articulos', a);
    return cleanArt_(a, u.rol === 'admin');
  });
}
function invFoto_(d, u) {
  staff_(u);
  const a = read_('Articulos').find(x => x.id === d.id);
  if (!a || !a.foto) fail_('Sin foto.');
  const b = DriveApp.getFileById(d.size === 'mini' && a.mini ? a.mini : a.foto).getBlob();
  return { data: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) };
}
function invCarga_(d, u) {
  admin_(u);
  return locked_(() => {
    const list = v => (Array.isArray(v) ? v : String(v || '').split('\n')).map(x => clean_(x, 160)).filter(Boolean).slice(0, 60);
    const all = read_('Cargas');
    let c = d.id ? all.find(x => x.id === d.id) : null;
    if (d.borrar) { if (!c) fail_('No encontrada.'); const sh = sheet_('Cargas'); sh.deleteRow(findRow_(sh, c.id)); bump_('Cargas'); return { ok: true }; }
    const nombre = clean_(d.nombre, 80);
    if (!nombre) fail_('Indica el nombre.');
    const isNew = !c;
    if (isNew) c = { id: 'cg-' + uid_().slice(0, 6), orden: all.length + 1 };
    c.nombre = nombre; c.base = list(d.base); c.segun = list(d.segun); c.no = list(d.no);
    if (isNew) insert_('Cargas', c); else update_('Cargas', c);
    return c;
  });
}

