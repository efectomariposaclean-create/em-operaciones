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
  if (sol.vale && sol.vale.codigo) {
    const m = valeFind_(sol.vale.codigo);
    const saldo = m && m.activo !== false ? Number(m.saldo) : 0;
    sol.vale.imp = r2_(Math.min(Math.max(saldo, sol.vale.usado ? sol.vale.imp : 0), sol.total));
  }
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
function csession_(req) {
  const t = req && req.token;
  if (typeof t === 'string' && t.indexOf('v.') === 0) {   // «Ver como este cliente» (solo lectura, dirección)
    const parts = t.slice(2).split('.');
    if (parts.length !== 2 || sign_('v:' + parts[0]) !== parts[1]) fail_('SESION');
    let p; try { p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString()); } catch (e) { fail_('SESION'); }
    if (!p || p.e < Date.now()) fail_('SESION');
    const c = clientById_(read_('Clientes'), p.c);
    if (!c) fail_('SESION');
    const acc = read_('Cuentas').find(a => a.cliente === c.id);
    return { id: acc ? acc.id : 'preview', cliente: c.id, nombre: c.nombre, email: acc ? acc.email : (emailsOf_(c)[0] || ''), telefono: c.telefono || '', ofertas: acc ? acc.ofertas : false, bienvenida: 'x', preview: true };
  }
  return cparse_(t, 's');
}
function noPreview_(a) { if (a.preview) fail_('Estás viendo el área como el cliente: es solo de lectura.'); }
function clientPreview_(d, u) {
  admin_(u);
  const c = clientById_(read_('Clientes'), d.cliente);
  if (!c) fail_('Cliente no encontrado.');
  const body = Utilities.base64EncodeWebSafe(JSON.stringify({ c: c.id, e: Date.now() + 30 * 60e3 })).replace(/=+$/, '');
  return { url: clientUrl_() + '#ver=v.' + body + '.' + sign_('v:' + body) };
}
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
function cSave_(d, u, req) {
  const a = csession_(req);
  noPreview_(a);
  return locked_(() => {
    if (d.ofertas !== undefined) a.ofertas = !!d.ofertas;
    const antes = { telefono: a.telefono, email: a.email, nombre: a.nombre };
    if (d.telefono !== undefined) { const t = clean_(d.telefono, 30); if (norm_(t).length < 9) fail_('Escribe un teléfono válido.'); a.telefono = t; }
    if (d.nombre) a.nombre = clean_(d.nombre, 80);
    if (d.email !== undefined) {
      const e = clean_(d.email, 120).toLowerCase();
      if (!mailOk_(e)) fail_('Escribe un correo válido.');
      if (e !== a.email && read_('Cuentas').some(x => x.id !== a.id && x.email === e)) fail_('Ya hay otra cuenta con ese correo.');
      a.email = e;
    }
    // si es cliente, sus datos de contacto se actualizan también en su ficha
    const cambios = ['telefono', 'email', 'nombre'].filter(k => antes[k] !== a[k]);
    if (cambios.length) {
      if (!a.cliente) accClient_(a);
      const c = a.cliente ? read_('Clientes').find(x => x.id === a.cliente) : null;
      if (c) {
        const txt = cambios.map(k => ({ telefono: 'teléfono', email: 'correo', nombre: 'nombre' }[k] + ': ' + (antes[k] || '—') + ' → ' + a[k])).join(' · ');
        if (cambios.indexOf('telefono') >= 0) c.telefono = a.telefono;
        if (cambios.indexOf('email') >= 0) c.email = [a.email].concat(emailsOf_(c).filter(x => x !== antes.email && x !== a.email)).join(', ');
        c.crm = c.crm || {};
        c.crm.notas = (c.crm.notas || []).concat([note_(null, 'El cliente ha cambiado sus datos desde su área: ' + txt, 'Nota')]);
        update_('Clientes', c);
      }
    }
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
    lineas: s.lineas, bruto: bruto, descuento: s.descuento, total: s.total, vale: s.vale && s.vale.codigo ? { codigo: s.vale.codigo, imp: s.vale.imp } : null, pagar: r2_(s.total - (s.vale && s.vale.imp || 0)), revisado: s.revisado, dia: dd_(s.dia), propuesto: dd_(s.propuesto),
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
  if (!info) sel.habitual = read_('Clientes').some(c => (norm_(tel) && norm_(c.telefono) === norm_(tel)) || emailsOf_(c).indexOf(email) >= 0);   // mantenimiento solo para clientes habituales
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
    let vale = null;
    if (d.vale) {
      const vm = valeFind_(d.vale);
      valeCheck_(vm, email);
      vale = { codigo: vm.codigo, imp: 0 };
      if (!vm.usuario) { vm.usuario = email; vm.movs = (vm.movs || []).concat([{ at: iso_(), texto: 'Indicado en la solicitud ' + numero + ' por ' + nombre }]); if (acc) vm.cuenta = acc.id; update_('Monedero', vm); }
    }
    const s = { vale: vale, id: uid_(), numero: numero, fecha: iso_(), cuenta: acc ? acc.id : '', contacto: contacto, cliente: cl ? cl.id : '', nombre: nombre, telefono: tel, email: email,
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
    if (estado === 'Hecha' && cur.vale && cur.vale.codigo && !cur.vale.usado) {
      const vm = valeFind_(cur.vale.codigo);
      const imp = vm ? r2_(Math.min(Number(vm.saldo), cur.vale.imp || 0)) : 0;
      if (vm && imp > 0) { vm.saldo = r2_(Number(vm.saldo) - imp); vm.cliente = vm.cliente || cur.cliente; vm.movs = (vm.movs || []).concat([{ at: iso_(), texto: 'Usado en ' + cur.numero + ' (' + cur.nombre + ')', imp: -imp }]); update_('Monedero', vm); }
      cur.vale.imp = imp; cur.vale.usado = iso_();
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

/* ================================================================== */
/* Fase 2 · Área del cliente completa                                  */
/* Servicios, documentos, incidencias con respuesta, firma, monedero   */
/* ================================================================== */

const RET_DIAS = { particular: 30, empresa: 90 };   // días que se guardan las fotos tras la entrega
const PERMISOS = ['responsable', 'coordinador', 'ver'];
function permiso_(u) { return PERMISOS.indexOf(u && u.permiso) >= 0 ? u.permiso : 'coordinador'; }

Object.assign(PORTAL_OPEN, { pIncReply: 1, pSign: 1, cFile: 1, cCanjear: 1, pVale: 1 });
Object.assign(PORTAL_ACTIONS, {
  pIncReply: pIncReply_, pSign: pSign_, cFile: cFile_, cCanjear: cCanjear_,
  clientPreview: clientPreview_, pVale: pVale_,
  cliIncReply: cliIncReply_, cliSign: cliSign_, cliFacturas: cliFacturas_, cliFile: cliFile_, cliPedir: cliPedir_,
  walletList: walletList_, walletSave: walletSave_, walletUse: walletUse_, offerSave: offerSave_, offerSend: offerSend_
});

function portalMigrate_() {
  try {
    if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'limpiarFotos')) ScriptApp.newTrigger('limpiarFotos').timeBased().everyDays(1).atHour(4).create();
  } catch (e) { console.error('Trigger limpiarFotos: ' + e); }
}

function accClient_(a) {
  if (a.cliente) return a.cliente;
  const cl = read_('Clientes').find(c => c.tipo === 'particular' && ((a.telefono && norm_(c.telefono) === norm_(a.telefono)) || emailsOf_(c).indexOf(a.email) >= 0));
  if (!cl) return '';
  locked_(() => { const x = read_('Cuentas').find(y => y.id === a.id); if (x && !x.cliente) { x.cliente = cl.id; update_('Cuentas', x); } });
  a.cliente = cl.id;
  return cl.id;
}
function linkOk_(s) { return !s.cerrado || Date.now() <= Date.parse(linkExpires_(s)); }
function walletOut_(m) {
  return { estado: m.tipo === 'regalo' ? valeEstado_(m) : (Number(m.usadas) >= Number(m.visitas) ? 'Gastado' : 'Activo'), usuario: m.usuario || '', id: m.id, tipo: m.tipo, nombre: m.nombre, codigo: m.tipo === 'regalo' ? m.codigo : '', visitas: Number(m.visitas) || 0, usadas: Number(m.usadas) || 0, saldo: Number(m.saldo) || 0, inicial: Number(m.inicial) || 0, caduca: dd_(m.caduca), para: m.para || '', de: m.de || '',
    movs: (m.movs || []).slice(-10).map(x => ({ at: x.at, texto: x.texto, imp: x.imp || 0 })) };
}
function ofertasActivas_() {
  const hoy = day_();
  return read_('Ofertas').filter(o => o.activa !== false && (!o.hasta || dd_(o.hasta) >= hoy)).map(o => ({ id: o.id, titulo: o.titulo, texto: o.texto, pct: Number(o.pct) || 0, hasta: dd_(o.hasta) }));
}

// cMe_ completo: sustituye al de la fase 1
function cMe_(d, u, req) {
  const a = csession_(req);
  const cid = accClient_(a);
  const sols = read_('Solicitudes').filter(s => s.cuenta === a.id || s.email === a.email).sort((x, y) => String(y.fecha).localeCompare(String(x.fecha)));
  const servs = cid ? read_('Servicios').filter(s => s.cliente === cid && !s.archivado).sort((x, y) => String(y.creado).localeCompare(String(x.creado))).slice(0, 60) : [];
  const inc = cid ? read_('Incidencias').filter(i => i.visible !== false) : [];
  const facturas = cid ? read_('Facturas').filter(f => f.cliente === cid && f.archivo && f.estado !== 'Anulada').sort((x, y) => String(y.fecha).localeCompare(String(x.fecha))) : [];
  const wallet = read_('Monedero').filter(m => m.activo !== false && ((cid && m.cliente === cid) || m.cuenta === a.id || (m.usuario && m.usuario === a.email)));
  return {
    cuenta: accOut_(a),
    solicitudes: sols.map(s => ({ t: s.token, numero: s.numero, fecha: s.fecha, resumen: s.resumen, estado: s.estado, total: s.total, dia: dd_(s.dia) })),
    servicios: servs.map(s => {
      const o = clientService_(s, inc);
      return { id: s.id, matricula: o.matricula || o.chasis, vehiculo: [o.vehiculo, o.marca, o.modelo].filter(Boolean).join(' · '), tipo: o.tipo, etapa: o.etapa, aviso: o.aviso, creado: o.creado, cerrado: o.cerrado, albaran: o.recibo ? o.recibo.numero : '', link: linkOk_(s) && s.enlace ? linkOf_(s) : '', fotosHasta: s.cerrado ? new Date(Date.parse(s.cerrado) + RET_DIAS.particular * 864e5).toISOString() : '' };
    }),
    facturas: facturas.map(f => ({ id: f.id, numero: f.numero, fecha: dd_(f.fecha), total: Number(f.total) || 0, estado: f.estado })),
    monedero: wallet.map(walletOut_),
    ofertas: ofertasActivas_()
  };
}
function pdfOut_(name, blob) { return { name: name, data: 'data:application/pdf;base64,' + Utilities.base64Encode(blob.getBytes()) }; }
function serviceReceiptPdf_(s) {
  const client = clientById_(read_('Clientes'), s.cliente) || { nombre: '' };
  const r = s.recibo || {};
  const fotos = read_('Fotos'), fs = r.firma ? fotos.find(f => f.id === r.firma) : null;
  const data = receiptServices_(s.cliente, '2000-01-01', '2999-12-31', [s.id]);
  if (!data.services.length) data.services = [s];
  const conf = { conformity: r.conformity, signer: r.signer, at: r.at || s.cerrado, canal: 'Firmado en la entrega', observations: r.observations };
  return receiptPdf_(client, day_(s.creado), day_(s.cerrado), r.numero, data, conf, fs ? dataUri_(fs.archivo) : '');
}
function cFile_(d, u, req) {
  const a = csession_(req), cid = accClient_(a);
  if (!cid) fail_('Documento no encontrado.');
  if (d.kind === 'factura') {
    const f = read_('Facturas').find(x => x.id === d.id && x.cliente === cid && x.archivo);
    if (!f) fail_('Factura no encontrada.');
    return pdfOut_('Factura ' + f.numero + '.pdf', DriveApp.getFileById(f.archivo).getBlob());
  }
  const s = read_('Servicios').find(x => x.id === d.id && x.cliente === cid && x.recibo);
  if (!s) fail_('Albarán no encontrado.');
  const pdf = serviceReceiptPdf_(s);
  return pdfOut_('Albarán ' + s.recibo.numero + '.pdf', pdf.blob);
}
function cCanjear_(d, u, req) {
  const a = csession_(req);
  noPreview_(a);
  throttle_('gift:' + a.id, 8);
  const code = String(d.codigo || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return locked_(() => {
    const m = valeFind_(code);
    valeCheck_(m, a.email);
    if (m.cuenta && m.cuenta !== a.id) fail_('Este vale ya está en otra cuenta.');
    m.cuenta = a.id; m.usuario = a.email; if (!m.cliente && a.cliente) m.cliente = a.cliente;
    m.movs = (m.movs || []).concat([{ at: iso_(), texto: 'Añadida a la cuenta de ' + a.nombre }]);
    update_('Monedero', m);
    return walletOut_(m);
  });
}

/* Respuesta del cliente a una incidencia ("lo sabía", "visto"…) y marcar como revisada */
function incReply_(s, d, who) {
  const texto = clean_(d.texto, 600);
  if (!texto && !d.revisada) fail_('Escribe tu respuesta.');
  return locked_(() => {
    const i = read_('Incidencias').find(x => x.id === d.incidencia && x.servicio === s.id && x.visible !== false);
    if (!i) fail_('Incidencia no encontrada.');
    i.respuestas = (i.respuestas || []).concat(texto ? [{ at: iso_(), de: who, texto: texto }] : []).slice(-30);
    if (d.revisada && !i.revisada) i.revisada = iso_();
    update_('Incidencias', i);
    pmail_(ownerMail_(), 'Respuesta a incidencia · ' + (s.matricula || s.chasis), 'El cliente ha respondido', ['<b>' + esc_(who) + '</b> sobre «' + esc_(i.tipo) + '» en ' + esc_(s.matricula || s.chasis) + ':', texto ? esc_(texto) : '', i.revisada ? 'Marcada como <b>revisada</b> por el cliente.' : ''].filter(Boolean), 'Abrir el servicio', APP.appUrl + '#/servicio/' + s.id, 'Incidencia');
    return clientIncident_(i);
  });
}
function pIncReply_(d) {
  throttle_('incr:' + clean_(d.t, 64), 30);
  const s = publicService_(d.t);
  const c = clientById_(read_('Clientes'), s.cliente) || {};
  return incReply_(s, d, c.nombre || 'Cliente');
}
function cliIncReply_(d, u) {
  if (u.rol !== 'cliente' || permiso_(u) === 'ver') fail_('Sin permiso.');
  const s = loadService_(u, d.servicio);
  return incReply_(s, d, u.nombre);
}

/* Firma del albarán desde el móvil del cliente (también en el móvil del equipo, como siempre) */
function signByClient_(sid, d, who) {
  const r = d.receipt || {};
  const at = iso_();
  return locked_(() => {
    const s = read_('Servicios').find(x => x.id === sid);
    if (!s || s.archivado) fail_('Servicio no encontrado.');
    if (s.cerrado) fail_('Este servicio ya está entregado y firmado.');
    if (etapa_(s) !== 'Listo') fail_('Todavía estamos trabajando en tu vehículo. Podrás firmar cuando esté listo.');
    closeService_(s, { id: who.id, rol: 'cliente', nombre: who.nombre }, { receipt: r }, at, true);
    s.actualizado = at; s.version = (Number(s.version) || 0) + 1;
    s.recibo.canal = who.canal;
    notify_('entregado', s);
    update_('Servicios', s);
    log_({ id: who.id }, s.id, 'firma del cliente (' + who.canal + ')');
    return { ok: true, numero: s.recibo.numero };
  });
}
function pSign_(d) {
  throttle_('sign:' + clean_(d.t, 64), 10);
  const s = publicService_(d.t);
  return signByClient_(s.id, d, { id: 'cliente', nombre: 'Cliente', canal: 'Firmado desde el móvil del cliente' });
}
function cliSign_(d, u) {
  if (u.rol !== 'cliente' || permiso_(u) === 'ver') fail_('Sin permiso.');
  const s = loadService_(u, d.servicio);
  return signByClient_(s.id, d, { id: u.id, nombre: u.nombre, canal: 'Firmado desde el portal de empresa' });
}

/* ================================================================== */
/* Fase 3 · Empresas y flotas: permisos, facturas y pedir servicio     */
/* ================================================================== */

function cliFacturas_(d, u) {
  if (u.rol !== 'cliente' || permiso_(u) !== 'responsable') fail_('Solo el responsable de la cuenta ve las facturas.');
  const acc = u.acceso || [];
  return read_('Facturas').filter(f => acc.indexOf(f.cliente) >= 0 && f.archivo && f.estado !== 'Anulada').sort((x, y) => String(y.fecha).localeCompare(String(x.fecha)))
    .map(f => ({ id: f.id, numero: f.numero, fecha: dd_(f.fecha), total: Number(f.total) || 0, estado: f.estado, vence: dd_(f.vence) }));
}
function cliFile_(d, u) {
  if (u.rol !== 'cliente' || permiso_(u) !== 'responsable') fail_('Sin permiso.');
  const f = read_('Facturas').find(x => x.id === d.id && (u.acceso || []).indexOf(x.cliente) >= 0 && x.archivo);
  if (!f) fail_('Factura no encontrada.');
  return pdfOut_('Factura ' + f.numero + '.pdf', DriveApp.getFileById(f.archivo).getBlob());
}
function cliPedir_(d, u) {
  if (u.rol !== 'cliente' || permiso_(u) === 'ver') fail_('Sin permiso.');
  const c = clientById_(read_('Clientes'), (u.acceso || [])[0]);
  if (!c) fail_('Cliente no encontrado.');
  const veh = clean_(d.vehiculos, 1000), tipo = clean_(d.tipo, 80) || 'Limpieza', dia = dayOk_(d.dia);
  if (!veh) fail_('Indica los vehículos (matrículas).');
  const n = veh.split(/[\n,;]+/).map(x => x.trim()).filter(Boolean).length;
  return locked_(() => {
    const all = read_('Solicitudes'), year = new Date().getFullYear();
    let max = 0;
    all.forEach(s => { const m = String(s.numero || '').match(/^S(\d{4})-(\d+)$/); if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2])); });
    const s = { id: uid_(), numero: 'S' + year + '-' + ('00' + (max + 1)).slice(-3), fecha: iso_(), cuenta: '', contacto: '', cliente: c.id, nombre: c.nombre + ' · ' + u.nombre, telefono: c.telefono || '', email: emailsOf_(c)[0] || '',
      sel: { empresa: true }, vehiculo: n + (n > 1 ? ' vehículos' : ' vehículo'), resumen: 'Empresa · ' + tipo, lineas: [{ c: tipo + ' · ' + n + (n > 1 ? ' vehículos' : ' vehículo') + ' · tarifa pactada', imp: 0 }], manual: 0, descuento: null, total: 0,
      estado: 'Recibida', fotos: [], chat: [{ at: iso_(), de: 'cliente', texto: 'Vehículos: ' + veh + (clean_(d.notas, 600) ? '\n' + clean_(d.notas, 600) : '') }], dia: '', propuesto: dia || '', token: 't' + secret_(), revisado: '', notas: '', carpeta: '', ofertas: false, evento: '', actualizado: iso_() };
    insert_('Solicitudes', s);
    pmail_(ownerMail_(), 'Pedido de ' + c.nombre + ' · ' + s.numero, 'Nuevo pedido de empresa', ['<b>' + esc_(u.nombre) + '</b> (' + esc_(c.nombre) + ') pide: <b>' + esc_(tipo) + '</b>', 'Vehículos: ' + esc_(veh), dia ? 'Fecha deseada: <b>' + dia.split('-').reverse().join('/') + '</b>' : '', clean_(d.notas, 600) ? esc_(clean_(d.notas, 600)) : ''].filter(Boolean), 'Abrir la solicitud', APP.appUrl + '#/solicitud/' + s.id, 'Empresa');
    return { numero: s.numero };
  });
}

/* ================================================================== */
/* Monedero (bonos y tarjetas regalo) y ofertas exclusivas             */
/* ================================================================== */

const BONOS_P = { Escapadas: [2, 7], Temporadas: [4, 10], 'Siempre a punto': [6, 12] };
function walletList_(d, u) {
  admin_(u);
  const clients = read_('Clientes'), accs = read_('Cuentas');
  return {
    items: read_('Monedero').filter(m => m.activo !== false).map(m => Object.assign(walletOut_(m), { cliente: m.cliente, clienteNombre: (clientById_(clients, m.cliente) || {}).nombre || '', cuenta: m.cuenta, cuentaNombre: (accs.find(a => a.id === m.cuenta) || {}).nombre || '', email: m.email || '', codigo: m.codigo || '', creado: m.creado })),
    ofertas: read_('Ofertas').map(o => ({ id: o.id, titulo: o.titulo, texto: o.texto, pct: Number(o.pct) || 0, hasta: dd_(o.hasta), activa: o.activa !== false, enviada: o.enviada || '', n: Number(o.n) || 0 })),
    suscritos: accs.filter(a => a.ofertas && a.activo !== false).length,
    cupo: (() => { try { return MailApp.getRemainingDailyQuota(); } catch (e) { return 0; } })()
  };
}
function giftCode_(all) {
  const y = new Date().getFullYear();
  let max = 0;
  all.forEach(m => { const x = String(m.codigo || '').match(/^VR(\d{4})(\d{3,})$/); if (x && Number(x[1]) === y) max = Math.max(max, Number(x[2])); });
  return 'VR' + y + ('00' + (max + 1)).slice(-3);
}
function valeEstado_(m) {
  if (m.activo === false) return 'Anulado';
  if (Number(m.saldo) <= 0.004) return 'Usado';
  if (m.caduca && dd_(m.caduca) < day_()) return 'Caducado';
  return m.cuenta || m.cliente || m.usuario ? 'Asignado' : 'Sin usar';
}
function valeFind_(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return code ? read_('Monedero').find(x => x.tipo === 'regalo' && String(x.codigo).toUpperCase() === code) : null;
}
function valeCheck_(m, email) {
  if (!m || m.activo === false) fail_('Este código de vale no existe. Revísalo.');
  if (Number(m.saldo) <= 0.004) fail_('Este vale ya está usado.');
  if (m.caduca && dd_(m.caduca) < day_()) fail_('Este vale caducó el ' + dd_(m.caduca).split('-').reverse().join('/') + '.');
  if (email && m.usuario && m.usuario !== email) fail_('Este vale ya lo está usando otra persona.');
}
/** Comprueba un vale desde el presupuesto (sin cuenta). */
function pVale_(d) {
  throttle_('vale:' + clean_(d.device, 64), 15);
  const m = valeFind_(d.codigo);
  valeCheck_(m, clean_(d.email, 120).toLowerCase());
  return { codigo: m.codigo, saldo: Number(m.saldo), caduca: dd_(m.caduca) };
}
function walletSave_(d, u) {
  admin_(u);
  return locked_(() => {
    const all = read_('Monedero');
    if (d.id) {
      const m = all.find(x => x.id === d.id);
      if (!m) fail_('No encontrado.');
      if (d.activo === false) m.activo = false;
      if (d.caduca !== undefined) m.caduca = dayOk_(d.caduca) || '';
      if (d.notas !== undefined) m.notas = clean_(d.notas, 500);
      update_('Monedero', m);
      return walletOut_(m);
    }
    const tipo = d.tipo === 'regalo' ? 'regalo' : 'bono';
    const m = { id: 'w-' + uid_().slice(0, 8), tipo: tipo, cliente: clean_(d.cliente, 60), cuenta: '', nombre: '', codigo: '', visitas: 0, usadas: 0, saldo: 0, inicial: 0, caduca: dayOk_(d.caduca) || '', para: clean_(d.para, 120), de: clean_(d.de, 120), email: clean_(d.email, 120).toLowerCase(), notas: clean_(d.notas, 500), movs: [], creado: iso_(), activo: true };
    if (tipo === 'bono') {
      if (!clientById_(read_('Clientes'), m.cliente)) fail_('Elige el cliente del bono.');
      m.nombre = clean_(d.nombre, 60) || 'Bono';
      m.visitas = Math.max(1, Math.min(24, Number(d.visitas) || (BONOS_P[m.nombre] || [4])[0]));
      m.movs = [{ at: iso_(), texto: 'Bono ' + m.nombre + ' de ' + m.visitas + ' visitas' }];
    } else {
      const imp = money_(d.saldo);
      if (!(imp > 0)) fail_('Indica el importe de la tarjeta.');
      let code = String(d.codigo || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (code && all.some(x => String(x.codigo).toUpperCase() === code)) fail_('Ya existe un vale con el código ' + code + '.');
      if (!code) code = giftCode_(all);
      if (!m.caduca) { const c = new Date(); c.setFullYear(c.getFullYear() + 1); m.caduca = Utilities.formatDate(c, APP.zona, 'yyyy-MM-dd'); }
      if (m.cliente && !clientById_(read_('Clientes'), m.cliente)) m.cliente = '';
      m.codigo = code; m.saldo = imp; m.inicial = imp; m.nombre = 'Vale regalo';
      m.movs = [{ at: iso_(), texto: 'Vale regalo de ' + eurP_(imp) + (m.de ? ' · de ' + m.de : '') + (m.para ? ' · para ' + m.para : ''), imp: imp }];
      if (m.email && mailOk_(m.email)) pmail_(m.email, '🎁 Tienes un vale regalo de Efecto Mariposa', '¡Te han regalado una limpieza!', [(m.para ? 'Hola, ' + esc_(m.para) + ':' : 'Hola:'), (m.de ? esc_(m.de) + ' te regala' : 'Tienes') + ' un vale de <b>' + eurP_(imp) + '</b> para la limpieza de tu autocaravana, camper, caravana o coche.', 'Tu código: <b style="font-size:20px;letter-spacing:2px">' + code + '</b>', 'Escríbelo al pedir tu presupuesto o guárdalo en tu área de cliente (Monedero) para no perderlo. Válido hasta el ' + m.caduca.split('-').reverse().join('/') + '.'], 'Usar mi vale', clientUrl_(), 'Vale regalo');
    }
    insert_('Monedero', m);
    return Object.assign(walletOut_(m), { codigo: m.codigo });
  });
}
/** Gastar una visita del bono o descontar saldo de la tarjeta. */
function walletUse_(d, u) {
  admin_(u);
  return locked_(() => {
    const m = read_('Monedero').find(x => x.id === d.id && x.activo !== false);
    if (!m) fail_('No encontrado.');
    const nota = clean_(d.nota, 200);
    if (m.tipo === 'bono') {
      if (Number(m.usadas) >= Number(m.visitas)) fail_('El bono ya no tiene visitas.');
      m.usadas = Number(m.usadas || 0) + 1;
      m.movs = (m.movs || []).concat([{ at: iso_(), texto: 'Visita ' + m.usadas + ' de ' + m.visitas + (nota ? ' · ' + nota : '') }]);
    } else {
      const imp = money_(d.importe);
      if (!(imp > 0) || imp > Number(m.saldo) + 0.001) fail_('Importe no válido (saldo ' + eurP_(Number(m.saldo)) + ').');
      m.saldo = r2_(Number(m.saldo) - imp);
      m.movs = (m.movs || []).concat([{ at: iso_(), texto: 'Usado en servicio' + (nota ? ' · ' + nota : ''), imp: -imp }]);
    }
    update_('Monedero', m);
    return walletOut_(m);
  });
}
function offerSave_(d, u) {
  admin_(u);
  return locked_(() => {
    const all = read_('Ofertas');
    let o = d.id ? all.find(x => x.id === d.id) : null;
    const titulo = clean_(d.titulo, 120);
    if (!titulo) fail_('Pon un título a la oferta.');
    const v = { titulo: titulo, texto: clean_(d.texto, 1000), pct: Math.max(0, Math.min(50, Number(d.pct) || 0)), hasta: dayOk_(d.hasta) || '', activa: d.activa !== false };
    if (o) { Object.assign(o, v); update_('Ofertas', o); }
    else { o = Object.assign({ id: 'o-' + uid_().slice(0, 8), enviada: '', n: 0, creado: iso_() }, v); insert_('Ofertas', o); }
    return { id: o.id };
  });
}
/** Envía la oferta por correo solo a quien aceptó recibir ofertas (y respeta el cupo diario de Gmail). */
function offerSend_(d, u) {
  admin_(u);
  const o = read_('Ofertas').find(x => x.id === d.id);
  if (!o) fail_('Oferta no encontrada.');
  const to = read_('Cuentas').filter(a => a.ofertas && a.activo !== false && mailOk_(a.email));
  let cupo = 0; try { cupo = MailApp.getRemainingDailyQuota(); } catch (e) {}
  const lote = to.slice(0, Math.max(0, cupo - 5));
  lote.forEach(a => pmail_(a.email, '⭐ ' + o.titulo, esc_(o.titulo), ['Hola, ' + esc_(String(a.nombre).split(' ')[0]) + ':', esc_(o.texto || '').replace(/\n/g, '<br>'), o.pct ? 'Descuento exclusivo: <b>−' + o.pct + ' %</b> (no acumulable).' : '', o.hasta ? 'Válida hasta el <b>' + dd_(o.hasta).split('-').reverse().join('/') + '</b>.' : '', '<span style="font-size:12px;color:#8a9ba4">Recibes este correo porque aceptaste recibir ofertas para clientes. Puedes darte de baja en «Mi cuenta».</span>'].filter(Boolean), 'Reservar con la oferta', clientUrl_(), 'Solo para clientes'));
  locked_(() => { const x = read_('Ofertas').find(y => y.id === o.id); x.enviada = iso_(); x.n = (Number(x.n) || 0) + lote.length; update_('Ofertas', x); });
  return { enviados: lote.length, pendientes: to.length - lote.length };
}

/* ================================================================== */
/* Borrado automático de fotos (se ejecuta solo cada noche)            */
/* Particulares 30 días, empresas 3 meses. Queda el registro, la firma, */
/* el albarán y la factura. Las fotos van a la papelera de Drive.      */
/* ================================================================== */

function limpiarFotos() {
  const now = Date.now(), clients = read_('Clientes'), byId = {};
  clients.forEach(c => byId[c.id] = c);
  const old = {};
  read_('Servicios').forEach(s => {
    if (!s.cerrado) return;
    const dias = byId[s.cliente] && byId[s.cliente].tipo === 'empresa' ? RET_DIAS.empresa : RET_DIAS.particular;
    if (now - Date.parse(s.cerrado) > dias * 864e5) old[s.id] = 1;
  });
  let n = 0;
  const trash = id => { if (!id) return; try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} };
  read_('Fotos').filter(f => old[f.servicio] && f.tipo !== 'Firma' && f.archivo).slice(0, 250).forEach(f => {
    trash(f.archivo); trash(f.mini);
    locked_(() => { const x = read_('Fotos').find(y => y.id === f.id); if (x) { x.archivo = ''; x.mini = ''; x.visible = false; update_('Fotos', x); } });
    n++;
  });
  read_('Solicitudes').filter(s => ['Hecha', 'Rechazada', 'Cancelada'].indexOf(s.estado) >= 0 && (s.fotos || []).length && now - Date.parse(s.actualizado || s.fecha) > RET_DIAS.particular * 864e5).slice(0, 40).forEach(s => {
    (s.fotos || []).forEach(f => { trash(f.archivo); trash(f.mini); n++; });
    locked_(() => { const x = read_('Solicitudes').find(y => y.id === s.id); x.fotos = []; x.chat = (x.chat || []).concat([{ at: iso_(), de: 'sistema', texto: 'Fotos borradas automáticamente (' + RET_DIAS.particular + ' días).' }]); update_('Solicitudes', x); });
  });
  console.log('Fotos borradas: ' + n);
  return n;
}
