/**
 * Efecto Mariposa · Área de clientes (fase 1)
 * Presupuesto en 1 minuto sin cuenta, «Mi solicitud» por enlace, cuentas con contraseña,
 * descuento de bienvenida y bandeja de solicitudes para dirección.
 */

/* ------------------------------------------------------------------ */
/* Tarifas (las mismas que el presupuestador de la web)                */
/* ------------------------------------------------------------------ */

const P_RATES = [[149,199,349,49,89],[159,219,379,59,109],[179,249,429,69,129],[169,229,399,69,129],[189,269,449,89,159],[189,269,449,89,159],[209,289,479,99,179],[219,309,509,109,189]];
const P_NAMES = ['Mini camper','Camper mediana','Gran camper','Caravana pequeña','Caravana grande','Autocaravana perfilada','Autocaravana capuchina','Autocaravana integral'];
const P_CARS = [['Turismo pequeño',[42.35,72.60,90.75,121.00]],['Turismo mediano',[54.45,90.75,108.90,145.20]],['Turismo grande / SUV',[66.55,108.90,133.10,175.45]]];
const P_CSRV = ['Interior básico','Interior + exterior básico','Interior intensivo','Intensivo + exterior básico'];
const P_CEXT = { tap: ['Tapicería completa', 96.80], mal: ['Maletero profundo', 24.20], pel: ['Eliminación de pelos', 30.25] };
const P_SEAT = 24.20;
const P_AGES = { 0: 'Hasta 5 años', 10: 'De 5 a 10 años', 25: 'Más de 10 años' };
const P_STATES = ['Habitual', 'Suciedad acumulada', 'Recuperación'];
const P_PLACES = ['Recinto de Alcalá de Henares', 'A domicilio', 'Base de San Martín de la Vega'];
const P_MIN_BIENVENIDA = 150;          // € IVA incluido, antes del descuento
const P_ESTADOS = ['Recibida', 'Presupuesto revisado', 'Aceptada', 'Programada', 'Hecha', 'Rechazada', 'Cancelada'];

const PORTAL_OPEN = { pRequest: 1, pView: 1, pPhoto: 1, pPhotoGet: 1, pMsg: 1, pAccept: 1, pRegister: 1, pLogin: 1, pForgot: 1, pMagic: 1, cMe: 1, cSave: 1 };
const PORTAL_ACTIONS = {
  pRequest: pRequest_, pView: pView_, pPhoto: pPhoto_, pPhotoGet: pPhotoGet_, pMsg: pMsg_, pAccept: pAccept_,
  pRegister: pRegister_, pLogin: pLogin_, pForgot: pForgot_, pMagic: pMagic_, cMe: cMe_, cSave: cSave_,
  solList: solList_, solGet: solGet_, solReview: solReview_, solMsg: solMsg_, solState: solState_, solPhoto: solPhoto_
};

function clientUrl_() { return APP.clienteUrl || (APP.appUrl + 'cliente.html'); }
function dd_(x) { return !x ? '' : String(x).length > 10 ? day_(x) : String(x); }
function r2_(n) { return Math.round(n * 100) / 100; }
function eurP_(n) { return r2_(n).toFixed(2).replace('.', ',') + ' €'; }

/** Calcula las líneas del presupuesto (IVA incluido) a partir de lo que marca el cliente. */
function precio_(sel) {
  const s = sel || {}, L = [];
  const add = (c, imp) => { if (imp) L.push({ c: c, imp: r2_(imp) }); };
  let resumen = '';
  if (s.tipo === 'coche') {
    const car = P_CARS[s.v], srv = Number(s.s), seats = Number(s.seats) || 0, ex = Array.isArray(s.ex) ? s.ex : [];
    if (!car || [0, 1, 2, 3].indexOf(srv) < 0 || seats < 0 || seats > 5 || ex.some(k => !P_CEXT[k])) fail_('Selección no válida.');
    add(P_CSRV[srv] + ' · ' + car[0], car[1][srv]);
    if (seats && ex.indexOf('tap') < 0) add(seats + ' × asiento textil', seats * P_SEAT);
    ex.forEach(k => add(P_CEXT[k][0], P_CEXT[k][1]));
    resumen = 'Coche · ' + P_CSRV[srv];
  } else {
    const r = P_RATES[s.v], a = Number(s.a) || 0, st = Number(s.st) || 0, ext = Number(s.ex) || 0;
    let srv = Number(s.s);
    if (!r || [0, 10, 25].indexOf(a) < 0 || [0, 1, 2].indexOf(st) < 0 || [0, 1, 2].indexOf(srv) < 0 || [0, 1, 2].indexOf(ext) < 0) fail_('Selección no válida.');
    if (srv === 0 && !(s.habitual && st === 0)) srv = 1;   // mantenimiento solo para clientes habituales
    const inten = srv === 2;
    add(['Mantenimiento', 'Interior estándar', 'Interior intensivo'][srv] + ' · ' + P_NAMES[s.v], r[srv]);
    if (srv && a) add('Antigüedad ' + P_AGES[a].toLowerCase() + ' (+' + a + ' %)', r[srv] * a / 100);
    if (ext) add('Exterior ' + (ext === 1 ? 'básico' : 'intensivo'), r[ext + 2]);
    const seat = Number(s.seat) || 0, bed = Number(s.bed) || 0, xt = Array.isArray(s.xt) ? s.xt.map(Number) : [];
    if ([0, 39, 69, 129].indexOf(seat) < 0 || [0, 69, 99].indexOf(bed) < 0 || xt.some(x => [49, 59, 39].indexOf(x) < 0)) fail_('Selección no válida.');
    if (!inten) add({ 39: 'Tapicería: un asiento', 69: 'Tapicería: asientos de cabina', 129: 'Tapicería: cuatro plazas' }[seat] || '', seat);
    add({ 69: 'Colchón individual', 99: 'Colchón doble' }[bed] || '', bed);
    xt.forEach(x => add({ 49: 'Ozono', 59: 'Tratamiento de plásticos', 39: 'Frigorífico a fondo' }[x], inten && x === 39 ? 0 : x));
    if (Number(s.w) === 1) add('A domicilio (+10 %)', L.reduce((t, l) => t + l.imp, 0) * 0.1);
    resumen = P_NAMES[s.v] + ' · ' + ['Mantenimiento', 'Estándar', 'Intensiva'][srv] + (ext ? ' + exterior' : '');
  }
  if ([0, 1, 2].indexOf(Number(s.w)) < 0) fail_('Indica dónde hacemos el servicio.');
  if (Number(s.w) === 2 && s.rec) L.push({ c: 'Recogida del vehículo', imp: 0 });
  return { lineas: L, resumen: resumen };
}
function bruto_(lineas) { return r2_((lineas || []).reduce((t, l) => t + (Number(l.imp) || 0), 0)); }

/** Un solo descuento: el mejor de los que corresponden. Nunca se suman. */
function descuento_(sol, acc) {
  const bruto = bruto_(sol.lineas), opts = [];
  if (acc && !acc.bienvenida && !sol.cliente && bruto >= P_MIN_BIENVENIDA) opts.push({ n: 'Bienvenida app (1.er servicio)', pct: 10 });
  if (sol.sel && sol.sel.sm) opts.push({ n: 'Vehículo en San Martín de la Vega', pct: 5 });
  const man = Number(sol.manual) || 0;
  if ([5, 10, 15, 20].indexOf(man) >= 0) opts.push({ n: 'Descuento de cliente', pct: man });
  opts.sort((a, b) => b.pct - a.pct);
  const d = opts[0];
  return d ? { n: d.n, pct: d.pct, imp: r2_(bruto * d.pct / 100) } : null;
}
function recalc_(sol, acc) {
  sol.descuento = descuento_(sol, acc);
  sol.total = r2_(bruto_(sol.lineas) - (sol.descuento ? sol.descuento.imp : 0));
  return sol;
}

/* ------------------------------------------------------------------ */
/* Cuentas y sesiones de cliente                                       */
/* ------------------------------------------------------------------ */

function pwHash_(pw, sal) {
  let h = sal + ':' + pw;
  const pep = props_().getProperty('PEPPER');
  for (let i = 0; i < 200; i++) h = hex_(Utilities.computeHmacSha256Signature(h, pep));
  return 'h' + h;
}
function ctoken_(a, kind, ms) {
  const body = Utilities.base64EncodeWebSafe(JSON.stringify({ c: a.id, v: Number(a.tokenV) || 1, k: kind, e: Date.now() + ms })).replace(/=+$/, '');
  return body + '.' + sign_('c:' + body);
}
function cparse_(token, kind) {
  if (typeof token !== 'string' || token.indexOf('.') < 0) fail_('SESION');
  const parts = token.split('.');
  if (sign_('c:' + parts[0]) !== parts[1]) fail_('SESION');
  let p;
  try { p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString()); } catch (e) { fail_('SESION'); }
  if (!p || p.k !== kind || p.e < Date.now()) fail_(kind === 'm' ? 'El enlace ha caducado. Pide otro.' : 'SESION');
  const a = read_('Cuentas').find(x => x.id === p.c);
  if (!a || a.activo === false || (Number(a.tokenV) || 1) !== p.v) fail_(kind === 'm' ? 'Este enlace ya no es válido.' : 'SESION');
  return a;
}
function csession_(req) { return cparse_(req && req.token, 's'); }
function sessionOut_(a) { return { token: ctoken_(a, 's', APP.sesionDias * 864e5), cuenta: accOut_(a) }; }
function accOut_(a) { return { nombre: a.nombre, email: a.email, telefono: a.telefono, ofertas: !!a.ofertas, bienvenida: !a.bienvenida && !a.cliente }; }
function mailOk_(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
function throttle_(key, max) {
  const c = CacheService.getScriptCache(), k = 'pt:' + key, n = Number(c.get(k) || 0);
  if (n >= max) fail_('Demasiados intentos. Espera unos minutos.');
  c.put(k, String(n + 1), 900);
}
function ownerMail_() { try { return emisor_().email || Session.getEffectiveUser().getEmail(); } catch (e) { return ''; } }
function pmail_(to, subject, title, lines, button, link, badge) {
  if (!to) return;
  _mail.push({ raw: true, to: to, subject: subject, html: mailHtml_(title, lines, button, link, 'Efecto Mariposa Clean &amp; Care · Comunidad de Madrid · 614 065 526', badge) });
}

function pRegister_(d) {
  throttle_('reg:' + clean_(d.device, 64), 6);
  const email = clean_(d.email, 120).toLowerCase(), pw = String(d.password || '');
  if (pw.length < 8) fail_('La contraseña debe tener al menos 8 caracteres.');
  return locked_(() => {
    const accs = read_('Cuentas');
    let sol = null;
    if (d.t) { sol = read_('Solicitudes').find(s => s.token === d.t); if (!sol) fail_('Solicitud no encontrada.'); }
    const mail = sol ? sol.email : email;
    if (!mailOk_(mail)) fail_('Escribe un correo válido.');
    if (accs.some(a => a.email === mail)) fail_('Ya hay una cuenta con ese correo. Entra con tu contraseña o pide un enlace.');
    const nombre = sol ? sol.nombre : clean_(d.nombre, 80), tel = sol ? sol.telefono : clean_(d.telefono, 30);
    if (!nombre) fail_('Escribe tu nombre.');
    const sal = 's' + secret_().slice(0, 16);
    const clients = read_('Clientes');
    const cl = clients.find(c => c.tipo === 'particular' && ((tel && norm_(c.telefono) === norm_(tel)) || emailsOf_(c).indexOf(mail) >= 0));
    const a = { id: 'a-' + uid_().slice(0, 8), email: mail, nombre: nombre, telefono: tel, hash: pwHash_(pw, sal), sal: sal, tipo: 'particular', cliente: cl ? cl.id : '', contacto: sol ? sol.contacto : '', rol: 'titular', ofertas: !!d.ofertas, bienvenida: '', tokenV: 1, activo: true, creado: iso_(), ultimo: iso_() };
    insert_('Cuentas', a);
    read_('Solicitudes').filter(s => s.email === mail && !s.cuenta).forEach(s => {
      s.cuenta = a.id;
      if (['Recibida', 'Presupuesto revisado'].indexOf(s.estado) >= 0) recalc_(s, a);
      s.actualizado = iso_();
      update_('Solicitudes', s);
    });
    return sessionOut_(a);
  });
}
function pLogin_(d) {
  const email = clean_(d.email, 120).toLowerCase();
  throttle_('log:' + clean_(d.device, 64), 8);
  throttle_('logm:' + email, 8);
  const a = read_('Cuentas').find(x => x.email === email && x.activo !== false);
  if (!a || pwHash_(String(d.password || ''), a.sal) !== a.hash) fail_('Correo o contraseña incorrectos.');
  return sessionOut_(a);
}
function pForgot_(d) {
  const email = clean_(d.email, 120).toLowerCase();
  throttle_('fgt:' + email, 3);
  const a = read_('Cuentas').find(x => x.email === email && x.activo !== false);
  if (a) pmail_(a.email, 'Tu enlace para entrar · Efecto Mariposa', 'Entra en tu área de cliente', ['Hola, ' + esc_(a.nombre) + ':', 'Pulsa el botón para entrar sin contraseña. Desde dentro puedes poner una nueva.', 'El enlace caduca en 2 horas.'], 'Entrar en mi área', clientUrl_() + '#m=' + ctoken_(a, 'm', 2 * 3600e3), 'Acceso');
  return { ok: true };
}
function pMagic_(d) {
  const a = cparse_(d.m, 'm');
  return locked_(() => {
    if (d.password) {
      if (String(d.password).length < 8) fail_('La contraseña debe tener al menos 8 caracteres.');
      a.sal = 's' + secret_().slice(0, 16); a.hash = pwHash_(String(d.password), a.sal);
      a.tokenV = (Number(a.tokenV) || 1) + 1;
    }
    a.ultimo = iso_();
    update_('Cuentas', a);
    return sessionOut_(a);
  });
}
function cMe_(d, u, req) {
  const a = csession_(req);
  const sols = read_('Solicitudes').filter(s => s.cuenta === a.id || s.email === a.email).sort((x, y) => String(y.fecha).localeCompare(String(x.fecha)));
  return { cuenta: accOut_(a), solicitudes: sols.map(s => ({ t: s.token, numero: s.numero, fecha: s.fecha, resumen: s.resumen, estado: s.estado, total: s.total, dia: dd_(s.dia) })) };
}
function cSave_(d, u, req) {
  const a = csession_(req);
  return locked_(() => {
    if (d.ofertas !== undefined) a.ofertas = !!d.ofertas;
    if (d.telefono !== undefined) a.telefono = clean_(d.telefono, 30);
    if (d.nombre) a.nombre = clean_(d.nombre, 80);
    if (d.password) {
      if (pwHash_(String(d.actual || ''), a.sal) !== a.hash) fail_('La contraseña actual no es correcta.');
      if (String(d.password).length < 8) fail_('La contraseña debe tener al menos 8 caracteres.');
      a.sal = 's' + secret_().slice(0, 16); a.hash = pwHash_(String(d.password), a.sal);
    }
    update_('Cuentas', a);
    return { cuenta: accOut_(a) };
  });
}

/* ------------------------------------------------------------------ */
/* Solicitudes (lado cliente)                                          */
/* ------------------------------------------------------------------ */

function solByToken_(t) {
  const s = read_('Solicitudes').find(x => x.token && x.token === String(t || ''));
  if (!s) fail_('No encontramos esta solicitud. Revisa el enlace del correo.');
  return s;
}
function solOut_(s, acc) {
  const bruto = bruto_(s.lineas);
  return {
    t: s.token, numero: s.numero, fecha: s.fecha, estado: s.estado, resumen: s.resumen, nombre: s.nombre,
    lineas: s.lineas, bruto: bruto, descuento: s.descuento, total: s.total, revisado: s.revisado, dia: dd_(s.dia), propuesto: dd_(s.propuesto),
    lugar: P_PLACES[Number(s.sel && s.sel.w)] || '', vehiculo: s.vehiculo,
    fotos: (s.fotos || []).map(f => ({ id: f.id, slot: f.slot })),
    chat: (s.chat || []).map(m => ({ at: m.at, de: m.de, texto: m.texto })),
    cuenta: !!(s.cuenta || acc),
    bienvenida: !s.cuenta && !s.cliente && bruto >= P_MIN_BIENVENIDA ? r2_(bruto * 0.1) : 0
  };
}
function pRequest_(d) {
  const dev = clean_(d.device, 64);
  throttle_('req:' + dev, 5);
  throttle_('req:all', 120);
  const nombre = clean_(d.nombre, 80), tel = clean_(d.telefono, 30), email = clean_(d.email, 120).toLowerCase();
  if (!nombre) fail_('Escribe tu nombre.');
  if (norm_(tel).length < 9) fail_('Escribe un teléfono válido.');
  if (!mailOk_(email)) fail_('Escribe un correo válido: ahí te llega el enlace.');
  if (!d.privacidad) fail_('Acepta la política de privacidad para continuar.');
  const info = ['Furgoneta', 'Cabeza tractora', 'Camión', 'Autobús'].indexOf(d.info) >= 0 ? d.info : '';
  const sel = info ? { w: 2 } : (d.sel || {});
  const p = info ? { lineas: [{ c: 'Precio a medida · ' + info, imp: 0 }], resumen: 'Información · ' + info } : precio_(sel);
  const veh = info || (sel.tipo === 'coche' ? P_CARS[sel.v][0] : P_NAMES[sel.v]);
  return locked_(() => {
    const all = read_('Solicitudes'), year = new Date().getFullYear();
    let max = 0;
    all.forEach(s => { const m = String(s.numero || '').match(/^S(\d{4})-(\d+)$/); if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2])); });
    const numero = 'S' + year + '-' + ('00' + (max + 1)).slice(-3);
    const acc = read_('Cuentas').find(a => a.email === email && a.activo !== false) || null;
    const clients = read_('Clientes');
    const cl = clients.find(c => (norm_(tel) && norm_(c.telefono) === norm_(tel)) || emailsOf_(c).indexOf(email) >= 0);
    const detalle = [p.resumen, 'Vehículo: ' + [veh, clean_(d.modelo, 80)].filter(Boolean).join(' · '), info ? '' : 'Lugar: ' + P_PLACES[Number(sel.w)] + (sel.rec ? ' (recogida)' : ''), info ? 'Precio a medida' : 'Precio calculado: ' + eurP_(bruto_(p.lineas)), clean_(d.notas, 600) && 'Notas: ' + clean_(d.notas, 600)].filter(Boolean).join('\n');
    let contacto = '';
    if (cl) {
      cl.crm = cl.crm || {};
      cl.crm.notas = (cl.crm.notas || []).concat([note_(null, 'Nueva solicitud ' + numero + ' desde la app.\n' + detalle, 'Nota')]);
      cl.crm.proxFecha = day_(); cl.crm.proxAccion = 'Revisar solicitud ' + numero;
      update_('Clientes', cl);
    } else {
      const cs = read_('Contactos');
      let c = cs.find(x => !x.cliente && ((norm_(tel) && norm_(x.telefono) === norm_(tel)) || (x.email && String(x.email).toLowerCase() === email)));
      const nota = note_(null, 'Solicitud ' + numero + ' desde la app.\n' + detalle, 'Nota');
      if (c) {
        c.notas = (c.notas || []).concat([nota]);
        if (['Perdido', 'Archivado', 'Ganado'].indexOf(c.fase) >= 0 || !c.fase) c.fase = 'Nuevo';
        c.importe = r2_(bruto_(p.lineas) / 1.21); c.proxAccion = 'Revisar solicitud ' + numero; c.proxFecha = day_(); c.revisar = false; c.actualizado = iso_();
        c.evento = calFollow_(c.evento, c.proxFecha, c.proxAccion, c.nombre, c.telefono);
        update_('Contactos', c);
      } else {
        c = { id: 'p-' + uid_().slice(0, 8), nombre: nombre, tipo: 'Particular', contacto: '', telefono: tel, email: email, vehiculo: veh, ubicacion: clean_(d.municipio, 80), fase: 'Nuevo', prioridad: 'A', proxAccion: 'Revisar solicitud ' + numero, proxFecha: day_(), origen: 'App', importe: r2_(bruto_(p.lineas) / 1.21), notas: [nota], revisar: false, cliente: '', evento: '', carpeta: '', creado: iso_(), actualizado: iso_(), ref: 'app:' + numero };
        c.evento = calFollow_('', c.proxFecha, c.proxAccion, c.nombre, c.telefono);
        insert_('Contactos', c);
      }
      contacto = c.id;
    }
    const s = { id: uid_(), numero: numero, fecha: iso_(), cuenta: acc ? acc.id : '', contacto: contacto, cliente: cl ? cl.id : '', nombre: nombre, telefono: tel, email: email,
      sel: sel, vehiculo: [veh, clean_(d.modelo, 80)].filter(Boolean).join(' · '), resumen: p.resumen, lineas: p.lineas, manual: 0, descuento: null, total: 0,
      estado: 'Recibida', fotos: [], chat: clean_(d.notas, 600) ? [{ at: iso_(), de: 'cliente', texto: clean_(d.notas, 600) }] : [], dia: '', propuesto: '', token: 't' + secret_(), revisado: '', notas: '', carpeta: '', ofertas: !!d.ofertas, actualizado: iso_() };
    recalc_(s, acc);
    insert_('Solicitudes', s);
    const link = clientUrl_() + '#s=' + s.token;
    pmail_(email, 'Hemos recibido tu solicitud ' + numero, 'Solicitud recibida, ' + esc_(nombre.split(' ')[0]), info ? ['Gracias por confiar en Efecto Mariposa.', 'Hemos recibido tu petición de información para <b>' + esc_(info) + '</b>. Te llamamos muy pronto para preparar un precio a medida.', 'Desde tu enlace puedes escribirnos y enviarnos fotos.'] : ['Gracias por confiar en Efecto Mariposa.', 'Tu presupuesto calculado: <b>' + eurP_(s.total) + '</b> (IVA incluido) para ' + esc_(p.resumen) + '.', 'Revisamos tus fotos y lo que has marcado. Si todo cuadra, te lo confirmamos; si no, te llamamos.', 'Desde tu enlace puedes añadir fotos, escribirnos y ver el estado.' + (!acc && bruto_(p.lineas) >= P_MIN_BIENVENIDA ? ' <b>Si creas tu cuenta, tienes un 10 % de descuento en este primer servicio.</b>' : '')], 'Ver mi solicitud', link, 'Solicitud ' + numero);
    pmail_(ownerMail_(), 'Nueva solicitud ' + numero + ' · ' + nombre, 'Nueva solicitud desde la app', ['<b>' + esc_(nombre) + '</b> · ' + esc_(tel) + ' · ' + esc_(email), esc_(detalle).replace(/\n/g, '<br>'), 'Total calculado: <b>' + eurP_(s.total) + '</b>'], 'Abrir EM Operaciones', APP.appUrl + '#/solicitudes', 'Nueva solicitud');
    return { t: s.token, numero: numero };
  });
}
function pView_(d, u, req) {
  const s = solByToken_(d.t);
  let acc = null;
  if (req && req.token) { try { acc = csession_(req); } catch (e) {} }
  return solOut_(s, acc);
}
function solFolder_(s) {
  if (s.carpeta) { try { return DriveApp.getFolderById(s.carpeta); } catch (e) {} }
  let parent;
  if (s.cliente) parent = clientFolder_(s.cliente);
  else {
    const c = read_('Contactos').find(x => x.id === s.contacto);
    parent = c ? prospectFolder_(c) : folderNamed_(folderNamed_(rootClientes_(), 'Prospectos'), 'Sin asignar');
    if (c && c.carpeta) { try { update_('Contactos', c); } catch (e) {} }
  }
  const f = folderNamed_(parent, 'Solicitud ' + s.numero);
  s.carpeta = f.getId();
  return f;
}
function pPhoto_(d) {
  throttle_('ph:' + clean_(d.t, 80), 40);
  const s0 = solByToken_(d.t);
  if (['Hecha', 'Rechazada', 'Cancelada'].indexOf(s0.estado) >= 0) fail_('Esta solicitud ya está cerrada.');
  if ((s0.fotos || []).length >= 20) fail_('Ya hay 20 fotos. Si necesitas más, escríbenos.');
  const m = String(d.data || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  const t = String(d.thumb || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > 6000000) fail_('Imagen no válida o demasiado grande.');
  const id = safeId_(d.photoId), slot = clean_(d.slot, 40) || 'Foto';
  if ((s0.fotos || []).some(f => f.id === id)) return { ok: true };
  if (!s0.carpeta) locked_(() => { const s = solByToken_(d.t); if (!s.carpeta) { solFolder_(s); update_('Solicitudes', s); } s0.carpeta = s.carpeta; });
  const folder = DriveApp.getFolderById(s0.carpeta);
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), 'image/' + m[1], slot + ' ' + id.slice(0, 4) + '.jpg'));
  let mini = '';
  if (t && t[2].length < 300000) mini = folderNamed_(folder, 'miniaturas').createFile(Utilities.newBlob(Utilities.base64Decode(t[2]), 'image/' + t[1], id + '.jpg')).getId();
  return locked_(() => {
    const s = solByToken_(d.t);
    if ((s.fotos || []).some(f => f.id === id)) return { ok: true };
    s.fotos = (s.fotos || []).concat([{ id: id, slot: slot, archivo: file.getId(), mini: mini, at: iso_() }]);
    s.actualizado = iso_();
    update_('Solicitudes', s);
    return { ok: true, n: s.fotos.length };
  });
}
function photoData_(s, id) {
  const f = (s.fotos || []).find(x => x.id === id);
  if (!f) fail_('Foto no encontrada.');
  return { data: dataUri_(f.mini || f.archivo) };
}
function pPhotoGet_(d) { return photoData_(solByToken_(d.t), clean_(d.id, 60)); }
function pMsg_(d) {
  throttle_('msg:' + clean_(d.t, 80), 30);
  const texto = clean_(d.texto, 1000);
  if (!texto) fail_('Escribe el mensaje.');
  return locked_(() => {
    const s = solByToken_(d.t);
    if ((s.chat || []).length >= 200) fail_('Conversación completa. Llámanos al 614 065 526.');
    s.chat = (s.chat || []).concat([{ at: iso_(), de: 'cliente', texto: texto }]);
    s.actualizado = iso_();
    update_('Solicitudes', s);
    pmail_(ownerMail_(), 'Mensaje de ' + s.nombre + ' · ' + s.numero, 'Nuevo mensaje en ' + esc_(s.numero), ['<b>' + esc_(s.nombre) + '</b> escribe:', esc_(texto)], 'Abrir la solicitud', APP.appUrl + '#/solicitud/' + s.id, 'Mensaje');
    return solOut_(s);
  });
}
function pAccept_(d) {
  const dia = dayOk_(d.dia);
  if (!dia || dia <= day_()) fail_('Elige un día a partir de mañana.');
  return locked_(() => {
    const s = solByToken_(d.t);
    if (s.estado !== 'Presupuesto revisado') fail_('Primero revisamos tu presupuesto. Te avisamos por correo.');
    s.estado = 'Aceptada'; s.propuesto = dia; s.actualizado = iso_();
    s.chat = (s.chat || []).concat([{ at: iso_(), de: 'sistema', texto: 'Presupuesto aceptado. Día propuesto: ' + dia.split('-').reverse().join('/') + (d.franja ? ' (' + clean_(d.franja, 20) + ')' : '') + '.' }]);
    update_('Solicitudes', s);
    if (s.contacto) {
      const c = read_('Contactos').find(x => x.id === s.contacto);
      if (c) { c.fase = 'Negociando'; c.proxAccion = 'Confirmar día ' + s.numero; c.proxFecha = day_(); c.notas = (c.notas || []).concat([note_(null, 'Acepta el presupuesto ' + s.numero + ' (' + eurP_(s.total) + '). Propone el ' + dia + '.', 'Nota')]); c.actualizado = iso_(); c.evento = calFollow_(c.evento, c.proxFecha, c.proxAccion, c.nombre, c.telefono); update_('Contactos', c); }
    }
    pmail_(ownerMail_(), '✔ ' + s.nombre + ' acepta ' + s.numero, 'Presupuesto aceptado', ['<b>' + esc_(s.nombre) + '</b> acepta ' + esc_(s.numero) + ' por <b>' + eurP_(s.total) + '</b>.', 'Día propuesto: <b>' + dia.split('-').reverse().join('/') + '</b>' + (d.franja ? ' · ' + esc_(d.franja) : '') + '. Confírmalo desde la app.'], 'Confirmar día', APP.appUrl + '#/solicitud/' + s.id, 'Aceptado');
    return solOut_(s);
  });
}

/* ------------------------------------------------------------------ */
/* Bandeja de solicitudes (dirección)                                  */
/* ------------------------------------------------------------------ */

function solAdmin_(s) {
  const o = solOut_(s);
  o.id = s.id; o.telefono = s.telefono; o.email = s.email; o.contacto = s.contacto; o.cliente = s.cliente; o.sel = s.sel; o.manual = s.manual || 0; o.notas = s.notas; o.cuentaId = s.cuenta;
  return o;
}
function solList_(d, u) {
  admin_(u);
  return read_('Solicitudes').sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 300).map(s => ({ id: s.id, numero: s.numero, fecha: s.fecha, nombre: s.nombre, resumen: s.resumen, estado: s.estado, total: s.total, fotos: (s.fotos || []).length, dia: dd_(s.dia), propuesto: dd_(s.propuesto), nuevo: (s.chat || []).length && s.chat[s.chat.length - 1].de === 'cliente' }));
}
function solGet_(d, u) {
  admin_(u);
  const s = read_('Solicitudes').find(x => x.id === d.id);
  if (!s) fail_('Solicitud no encontrada.');
  return solAdmin_(s);
}
function solPhoto_(d, u) {
  admin_(u);
  const s = read_('Solicitudes').find(x => x.id === d.id);
  if (!s) fail_('Solicitud no encontrada.');
  const f = (s.fotos || []).find(x => x.id === d.foto);
  if (!f) fail_('Foto no encontrada.');
  return { data: dataUri_(d.grande ? f.archivo : (f.mini || f.archivo)) };
}
/** Enrique revisa: ajusta líneas y descuento manual, y envía el presupuesto revisado. */
function solReview_(d, u) {
  admin_(u);
  return locked_(() => {
    const s = read_('Solicitudes').find(x => x.id === d.id);
    if (!s) fail_('Solicitud no encontrada.');
    if (Array.isArray(d.lineas)) {
      const L = d.lineas.map(l => ({ c: clean_(l.c, 120), imp: money_(l.imp) })).filter(l => l.c);
      if (!L.length) fail_('El presupuesto necesita al menos una línea.');
      s.lineas = L;
    }
    if (d.manual !== undefined) s.manual = [0, 5, 10, 15, 20].indexOf(Number(d.manual)) >= 0 ? Number(d.manual) : 0;
    const acc = s.cuenta ? read_('Cuentas').find(a => a.id === s.cuenta) : null;
    recalc_(s, acc);
    if (d.notas !== undefined) s.notas = clean_(d.notas, 1000);
    if (d.enviar) {
      s.estado = 'Presupuesto revisado'; s.revisado = iso_();
      if (d.mensaje) s.chat = (s.chat || []).concat([{ at: iso_(), de: 'enrique', texto: clean_(d.mensaje, 1000) }]);
      s.chat = (s.chat || []).concat([{ at: iso_(), de: 'sistema', texto: 'Presupuesto revisado: ' + eurP_(s.total) + ' IVA incluido.' }]);
      pmail_(s.email, 'Tu presupuesto revisado · ' + s.numero, 'Tu presupuesto está listo', ['Hola, ' + esc_(s.nombre.split(' ')[0]) + ':', 'Hemos revisado tus fotos y tu solicitud. Total: <b>' + eurP_(s.total) + '</b> (IVA incluido).', d.mensaje ? esc_(clean_(d.mensaje, 1000)) : '', 'Si te parece bien, acéptalo con un toque y elige el día que mejor te venga.'].filter(Boolean), 'Ver y aceptar', clientUrl_() + '#s=' + s.token, 'Presupuesto revisado');
      if (s.contacto) {
        const c = read_('Contactos').find(x => x.id === s.contacto);
        if (c) { c.fase = 'Presupuesto enviado'; c.importe = r2_(s.total / 1.21); c.proxAccion = 'Seguimiento ' + s.numero; c.proxFecha = shift_(day_(), 3); c.notas = (c.notas || []).concat([note_(u, 'Presupuesto revisado enviado: ' + eurP_(s.total) + '.', 'Correo')]); c.actualizado = iso_(); c.evento = calFollow_(c.evento, c.proxFecha, c.proxAccion, c.nombre, c.telefono); update_('Contactos', c); }
      }
    }
    s.actualizado = iso_();
    update_('Solicitudes', s);
    return solAdmin_(s);
  });
}
function solMsg_(d, u) {
  admin_(u);
  const texto = clean_(d.texto, 1000);
  if (!texto) fail_('Escribe el mensaje.');
  return locked_(() => {
    const s = read_('Solicitudes').find(x => x.id === d.id);
    if (!s) fail_('Solicitud no encontrada.');
    s.chat = (s.chat || []).concat([{ at: iso_(), de: 'enrique', texto: texto }]);
    s.actualizado = iso_();
    update_('Solicitudes', s);
    pmail_(s.email, 'Mensaje de Efecto Mariposa · ' + s.numero, 'Tienes un mensaje', ['Hola, ' + esc_(s.nombre.split(' ')[0]) + ':', esc_(texto)], 'Ver y responder', clientUrl_() + '#s=' + s.token, s.numero);
    return solAdmin_(s);
  });
}
/** Programar (con día), marcar hecha (pasa a cliente) o rechazar/cancelar. */
function solState_(d, u) {
  admin_(u);
  const estado = String(d.estado || '');
  if (P_ESTADOS.indexOf(estado) < 0) fail_('Estado no válido.');
  let s = read_('Solicitudes').find(x => x.id === d.id);
  if (!s) fail_('Solicitud no encontrada.');
  if (estado === 'Hecha' && !s.cliente && s.contacto) {
    const r = contactConvert_({ id: s.contacto }, u);
    s = read_('Solicitudes').find(x => x.id === d.id); s.cliente = r.cliente;
  }
  return locked_(() => {
    const cur = read_('Solicitudes').find(x => x.id === d.id);
    cur.cliente = s.cliente || cur.cliente;
    cur.estado = estado; cur.actualizado = iso_();
    if (estado === 'Programada') {
      const dia = dayOk_(d.dia) || dd_(cur.propuesto);
      if (!dia) fail_('Indica el día.');
      cur.dia = dia;
      cur.chat = (cur.chat || []).concat([{ at: iso_(), de: 'sistema', texto: 'Servicio confirmado para el ' + dia.split('-').reverse().join('/') + '.' }]);
      cur.evento = calService_(cur.evento, dia, cur);
      pmail_(cur.email, 'Servicio confirmado · ' + dia.split('-').reverse().join('/'), 'Tu servicio está confirmado', ['Hola, ' + esc_(cur.nombre.split(' ')[0]) + ':', 'Te esperamos el <b>' + dia.split('-').reverse().join('/') + '</b> · ' + esc_(P_PLACES[Number(cur.sel && cur.sel.w)] || '') + '.', 'Total: <b>' + eurP_(cur.total) + '</b> (IVA incluido). El día antes te recordamos cómo dejarlo preparado.'], 'Ver mi solicitud', clientUrl_() + '#s=' + cur.token, 'Confirmado');
    }
    if (estado === 'Hecha' && cur.cuenta && cur.descuento && /Bienvenida/.test(cur.descuento.n)) {
      const a = read_('Cuentas').find(x => x.id === cur.cuenta);
      if (a && !a.bienvenida) { a.bienvenida = iso_(); a.cliente = cur.cliente || a.cliente; update_('Cuentas', a); }
    } else if (estado === 'Hecha' && cur.cuenta) {
      const a = read_('Cuentas').find(x => x.id === cur.cuenta);
      if (a && !a.cliente) { a.cliente = cur.cliente; update_('Cuentas', a); }
    }
    if ((estado === 'Rechazada' || estado === 'Cancelada') && cur.contacto) {
      const c = read_('Contactos').find(x => x.id === cur.contacto);
      if (c && !c.cliente) { c.notas = (c.notas || []).concat([note_(u, 'Solicitud ' + cur.numero + ' ' + estado.toLowerCase() + '.', 'Nota')]); c.actualizado = iso_(); update_('Contactos', c); }
    }
    update_('Solicitudes', cur);
    return solAdmin_(cur);
  });
}
function calService_(eventId, dia, s) {
  const cal = cal_();
  if (!cal) return eventId || '';
  try {
    let ev = eventId ? cal.getEventById(eventId) : null;
    const title = 'Servicio · ' + s.nombre + ' · ' + s.resumen, day = new Date(dia + 'T12:00:00Z');
    const desc = s.numero + ' · ' + eurP_(s.total) + '\nTeléfono: ' + s.telefono + '\nLugar: ' + (P_PLACES[Number(s.sel && s.sel.w)] || '');
    if (ev) { ev.setTitle(title); ev.setAllDayDate(day); ev.setDescription(desc); return ev.getId(); }
    ev = cal.createAllDayEvent(title, day, { description: desc });
    try { ev.setColor(CalendarApp.EventColor.GREEN); } catch (e) {}
    return ev.getId();
  } catch (e) { console.error(e); return eventId || ''; }
}
