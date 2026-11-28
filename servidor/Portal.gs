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
const P_XT = { oz: ['Ozono', 49], pl: ['Recuperación e hidratación de plásticos exteriores', 59], fr: ['Frigorífico con exceso de suciedad', 24.20] };
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


/* Procedencia: de dónde llega cada persona (enlace etiquetado, lo que declara y colaborador). */
const P_CONOCIO = ['Google', 'Instagram', 'TikTok', 'Facebook', 'Recomendación', 'Caravaning K2', 'Colaborador', 'Folleto o QR', 'Ya soy cliente', 'Otros'];
function origen_(d) {
  const canal = String(d.origen || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40) || 'DIRECTO';
  const conocio = P_CONOCIO.indexOf(d.conocio) >= 0 ? d.conocio : '';
  const colab = clean_(d.colaborador, 80);
  const pagina = clean_(d.pagina, 60);
  const etiqueta = canal !== 'DIRECTO' && canal !== 'WEB' && canal !== 'APP' ? canal : (conocio || (canal === 'WEB' ? 'Web' : canal === 'APP' ? 'App' : 'Directo'));
  const texto = ['Canal: ' + canal, conocio && 'Nos conoció por: ' + conocio, colab && 'Colaborador: ' + colab, pagina && 'Página: ' + pagina].filter(Boolean).join(' · ');
  const cf = colab && typeof colabFind_ === 'function' ? colabFind_(colab) : null;
  return { canal: canal, conocio: conocio, colab: colab, colabId: cf ? cf.id : '', etiqueta: etiqueta, texto: texto + (cf ? ' (' + cf.nombre + ')' : '') };
}

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
    const seat = Number(s.seat) || 0, bed = Number(s.bed) || 0;
    const OLD = { 49: 'oz', 59: 'pl', 39: 'fr' };
    const xt = (Array.isArray(s.xt) ? s.xt : []).map(x => OLD[x] || String(x));
    if ([0, 39, 69, 129].indexOf(seat) < 0 || [0, 69, 99].indexOf(bed) < 0 || xt.some(x => !P_XT[x])) fail_('Selección no válida.');
    if (!inten) add({ 39: 'Tapicería: un asiento', 69: 'Tapicería: asientos de cabina', 129: 'Tapicería: cuatro plazas' }[seat] || '', seat);
    add({ 69: 'Colchón individual', 99: 'Colchón doble' }[bed] || '', bed);
    if (inten) L.push({ c: 'Ozono (incluido en la intensiva)', imp: 0 });
    xt.forEach(x => { if (x === 'oz' && inten) return; add(P_XT[x][0] + (x === 'pl' && a === 25 ? ' (a valorar con tus fotos: si no se puede recuperar, no se cobra)' : ''), P_XT[x][1]); });
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
    const accs = read_('Cuentas').filter(a => a.activo !== false), mails = emailsOf_(c);
    const acc = accs.find(a => a.cliente === c.id && a.tipo !== 'empresa') || accs.find(a => a.colab === c.id) || accs.find(a => a.tipo !== 'empresa' && mails.indexOf(a.email) >= 0) || null;
    const colab = c.colab && c.colab.activo ? c.id : '';
    if (acc) return Object.assign({}, acc, { cliente: acc.cliente || c.id, colab: acc.colab || colab, tipo: acc.tipo === 'empresa' ? 'particular' : (acc.tipo || 'particular'), bienvenida: 'x', preview: true });
    return { id: 'preview', tipo: colab && c.colab.solo ? 'colaborador' : 'particular', colab: colab, cliente: c.id, nombre: c.nombre, email: mails[0] || '', telefono: c.telefono || '', ofertas: false, bienvenida: 'x', preview: true };
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
function accOut_(a) { return { tipo: a.tipo || 'particular', colab: !!a.colab, nombre: a.nombre, email: a.email, telefono: a.telefono, ofertas: !!a.ofertas, bienvenida: !a.bienvenida && !a.cliente }; }
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
    const o = origen_(d);
    let contacto = sol ? sol.contacto : '';
    if (!cl && !contacto) {                  // cuenta sin solicitud: entra en el CRM como prospecto
      const cs = read_('Contactos');
      let c = cs.find(x => !x.cliente && ((tel && norm_(x.telefono) === norm_(tel)) || (x.email && String(x.email).toLowerCase() === mail)));
      const nota = note_(null, 'Ha creado su cuenta en el área de clientes.' + (d.ofertas ? ' Acepta recibir ofertas.' : '') + '\n' + o.texto, 'Nota');
      if (c) { c.notas = (c.notas || []).concat([nota]); c.actualizado = iso_(); update_('Contactos', c); }
      else {
        c = { id: 'p-' + uid_().slice(0, 8), nombre: nombre, tipo: 'Particular', contacto: '', telefono: tel, email: mail, vehiculo: '', ubicacion: '', fase: 'Nuevo', prioridad: 'B', proxAccion: 'Bienvenida: ofrecer presupuesto', proxFecha: shift_(day_(), 1), origen: o.etiqueta, colaborador: o.colabId, importe: '', notas: [nota], revisar: false, cliente: '', evento: '', carpeta: '', creado: iso_(), actualizado: iso_(), ref: 'cuenta' };
        insert_('Contactos', c);
      }
      contacto = c.id;
    }
    const a = { id: 'a-' + uid_().slice(0, 8), email: mail, nombre: nombre, telefono: tel, hash: pwHash_(pw, sal), sal: sal, tipo: 'particular', cliente: cl ? cl.id : '', contacto: contacto, rol: 'titular', ofertas: !!d.ofertas, bienvenida: '', tokenV: 1, activo: true, creado: iso_(), ultimo: iso_(), procedencia: o.texto };
    insert_('Cuentas', a);
    if (cl && fillFicha_(cl, a)) update_('Clientes', cl);
    read_('Solicitudes').filter(s => s.email === mail && !s.cuenta).forEach(s => {
      s.cuenta = a.id;
      if (s.vehiculoId) { const v = read_('Vehiculos').find(x => x.id === s.vehiculoId); if (v && !v.cuenta) { v.cuenta = a.id; update_('Vehiculos', v); } }
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
  if (a && !a.hash) fail_('Aún no has creado tu contraseña: usa el enlace de tu correo de invitación o pulsa «He olvidado la contraseña».');
  if (!a || pwHash_(String(d.password || ''), a.sal) !== a.hash) fail_('Correo o contraseña incorrectos.');
  return sessionOut_(a);
}
function pForgot_(d) {
  const email = clean_(d.email, 120).toLowerCase();
  throttle_('fgt:' + email, 3);
  const a = read_('Cuentas').find(x => x.email === email && x.activo !== false);
  if (a) pmail_(a.email, 'Tu enlace para entrar · Efecto Mariposa', 'Entra en tu área de cliente', ['Hola, ' + esc_(a.nombre) + ':', 'Pulsa el botón para entrar sin contraseña. Desde dentro puedes poner una nueva.', 'El enlace caduca en 2 horas.'], 'Entrar en mi área', clientUrl_() + (a.tipo === 'particular' && a.hash ? '#m=' : '#inv=') + ctoken_(a, 'm', 2 * 3600e3), 'Acceso');
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
    if (cambios.length && a.tipo !== 'empresa') {
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
    lugar: P_PLACES[Number(s.sel && s.sel.w)] || '', vehiculo: s.vehiculo, matricula: s.matricula || '', servicio: s.servicio || '',
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
  const info = ['Furgoneta', 'Cabeza tractora', 'Camión', 'Autobús', 'Flota de empresa', 'Coche de empresa'].indexOf(d.info) >= 0 ? d.info : '';
  const o = origen_(d), empresa = clean_(d.empresa, 120);
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
    const detalle = [p.resumen, 'Vehículo: ' + [veh, clean_(d.modelo, 80)].filter(Boolean).join(' · '), info ? '' : 'Lugar: ' + P_PLACES[Number(sel.w)] + (sel.rec ? ' (recogida)' : ''), info ? 'Precio a medida' : 'Precio calculado: ' + eurP_(bruto_(p.lineas)), empresa && 'Empresa: ' + empresa, clean_(d.notas, 600) && 'Notas: ' + clean_(d.notas, 600), o.texto].filter(Boolean).join('\n');
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
        c = { id: 'p-' + uid_().slice(0, 8), nombre: empresa || nombre, tipo: empresa ? 'Empresa' : 'Particular', contacto: empresa ? nombre : '', telefono: tel, email: email, vehiculo: veh, ubicacion: clean_(d.municipio, 80), fase: 'Nuevo', prioridad: 'A', proxAccion: 'Revisar solicitud ' + numero, proxFecha: day_(), origen: o.etiqueta, colaborador: o.colabId, importe: r2_(bruto_(p.lineas) / 1.21), notas: [nota], revisar: false, cliente: '', evento: '', carpeta: '', creado: iso_(), actualizado: iso_(), ref: 'app:' + numero };
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
    let vehId = '', vMat = String(d.matricula || '').toUpperCase().trim().slice(0, 20);
    if (!info) {
      const vSel = d.vehiculoId && acc ? read_('Vehiculos').find(x => x.id === d.vehiculoId && x.activo !== false && (x.cuenta === acc.id || (acc.cliente && x.cliente === acc.cliente))) : null;
      const v = vSel || vehAdd_({ cliente: cl ? cl.id : '', cuenta: acc ? acc.id : '', contacto: contacto, tipo: veh, modelo: clean_(d.modelo, 80), matricula: vMat });
      vehId = v.id; vMat = v.matricula || vMat;
    }
    const s = { vehiculoId: vehId, matricula: vMat, servicio: '', vale: vale, id: uid_(), numero: numero, fecha: iso_(), cuenta: acc ? acc.id : '', contacto: contacto, cliente: cl ? cl.id : '', nombre: nombre, telefono: tel, email: email,
      sel: sel, vehiculo: [veh, clean_(d.modelo, 80)].filter(Boolean).join(' · '), resumen: p.resumen, lineas: p.lineas, manual: 0, descuento: null, total: 0,
      estado: 'Recibida', fotos: [], chat: clean_(d.notas, 600) ? [{ at: iso_(), de: 'cliente', texto: clean_(d.notas, 600) }] : [], dia: '', propuesto: '', token: 't' + secret_(), revisado: '', notas: '', carpeta: '', ofertas: !!d.ofertas, actualizado: iso_(), procedencia: o.texto };
    recalc_(s, acc);
    insert_('Solicitudes', s);
    const link = clientUrl_() + '#s=' + s.token;
    pmail_(email, 'Hemos recibido tu solicitud ' + numero, 'Solicitud recibida, ' + esc_(nombre.split(' ')[0]), info ? ['Gracias por confiar en Efecto Mariposa.', 'Hemos recibido tu petición de información para <b>' + esc_(info) + '</b>. Te llamamos muy pronto para preparar un precio a medida.', 'Desde tu enlace puedes escribirnos y enviarnos fotos.'] : ['Gracias por confiar en Efecto Mariposa.', 'Tu presupuesto calculado: <b>' + eurP_(s.total) + '</b> (IVA incluido) para ' + esc_(p.resumen) + '.', 'Revisamos tus fotos y lo que has marcado. Si todo cuadra, te lo confirmamos; si no, te llamamos.', 'Desde tu enlace puedes añadir fotos, escribirnos y ver el estado.' + (!acc && bruto_(p.lineas) >= P_MIN_BIENVENIDA ? ' <b>Si creas tu cuenta, tienes un 10 % de descuento en este primer servicio.</b>' : '')], 'Ver mi solicitud', link, 'Solicitud ' + numero);
    pmail_(ownerMail_(), 'Nueva solicitud ' + numero + ' · ' + nombre, 'Nueva solicitud desde la app', ['<b>' + esc_(nombre) + '</b> · ' + esc_(tel) + ' · ' + esc_(email), esc_(detalle).replace(/\n/g, '<br>'), 'Total calculado: <b>' + eurP_(s.total) + '</b>', '<span style="color:#a8842f">' + esc_(o.texto) + '</span>'], 'Abrir EM Operaciones', APP.appUrl + '#/solicitudes', 'Nueva solicitud');
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
  o.id = s.id; o.telefono = s.telefono; o.email = s.email; o.contacto = s.contacto; o.cliente = s.cliente; o.sel = s.sel; o.manual = s.manual || 0; o.notas = s.notas; o.cuentaId = s.cuenta; o.vehiculoId = s.vehiculoId || ''; o.servicioId = s.servicio || ''; o.procedencia = s.procedencia || '';
  return o;
}
function solList_(d, u) {
  admin_(u);
  return read_('Solicitudes').sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 300).map(s => ({ id: s.id, numero: s.numero, fecha: s.fecha, nombre: s.nombre, resumen: s.resumen, estado: s.estado, total: s.total, fotos: (s.fotos || []).length, dia: dd_(s.dia), propuesto: dd_(s.propuesto), nuevo: (s.chat || []).length && s.chat[s.chat.length - 1].de === 'cliente', contacto: s.contacto || '', cliente: s.cliente || '', servicio: s.servicio || '' }));
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
  return locked_(() => {
    const cur = read_('Solicitudes').find(x => x.id === d.id);
    if (!cur) fail_('Solicitud no encontrada.');
    if (estado === 'Hecha') { solDoneCore_(cur, u); update_('Solicitudes', cur); return solAdmin_(cur); }
    cur.estado = estado; cur.actualizado = iso_();
    if (estado === 'Programada') {
      const dia = dayOk_(d.dia) || dd_(cur.propuesto);
      if (!dia) fail_('Indica el día.');
      cur.dia = dia;
      cur.chat = (cur.chat || []).concat([{ at: iso_(), de: 'sistema', texto: 'Servicio confirmado para el ' + dia.split('-').reverse().join('/') + '.' }]);
      cur.evento = calService_(cur.evento, dia, cur);
      pmail_(cur.email, 'Servicio confirmado · ' + dia.split('-').reverse().join('/'), 'Tu servicio está confirmado', ['Hola, ' + esc_(cur.nombre.split(' ')[0]) + ':', 'Te esperamos el <b>' + dia.split('-').reverse().join('/') + '</b> · ' + esc_(P_PLACES[Number(cur.sel && cur.sel.w)] || '') + '.', 'Total: <b>' + eurP_(cur.total) + '</b> (IVA incluido). El día antes te recordamos cómo dejarlo preparado.'], 'Ver mi solicitud', clientUrl_() + '#s=' + cur.token, 'Confirmado');
      if (cur.contacto) { const c = read_('Contactos').find(x => x.id === cur.contacto); if (c && ['Ganado', 'Perdido', 'Archivado'].indexOf(c.fase) < 0) { c.fase = 'Negociando'; c.proxAccion = 'Servicio programado ' + dia.split('-').reverse().join('/'); c.proxFecha = dia; c.actualizado = iso_(); update_('Contactos', c); } }
    }
    if ((estado === 'Rechazada' || estado === 'Cancelada') && cur.contacto) {
      const c = read_('Contactos').find(x => x.id === cur.contacto);
      if (c && !c.cliente) { c.notas = (c.notas || []).concat([note_(u, 'Solicitud ' + cur.numero + ' ' + estado.toLowerCase() + '.', 'Nota')]); c.actualizado = iso_(); update_('Contactos', c); }
    }
    update_('Solicitudes', cur);
    return solAdmin_(cur);
  });
}

/* ================================================================== */
/* Hilo único: solicitud → servicio → entrega → cliente                */
/* (estas funciones se llaman ya dentro de un bloqueo)                 */
/* ================================================================== */

/** Crea la ficha de cliente a partir del prospecto (sin marcarlo aún como ganado). */
function clientFromContact_(c, u) {
  const clients = read_('Clientes');
  let cl = clients.find(x => (c.telefono && norm_(x.telefono) === norm_(c.telefono)) || (c.email && emailsOf_(x).indexOf(String(c.email).toLowerCase()) >= 0));
  if (!cl) {
    const empresa = c.tipo && c.tipo !== 'Particular';
    cl = { colaborador: c.colaborador || '', colabDesde: c.colaborador ? day_() : '', id: 'c-' + uid_().slice(0, 8), nombre: c.nombre, tipo: empresa ? 'empresa' : 'particular', protocolo: 'general', tipos: TIPOS_GENERAL, contacto: c.contacto || c.nombre, telefono: c.telefono || '', email: c.email || '', revisor: '', carpeta: '', activo: true, creado: iso_(), avisos: true, nif: '', direccion: '', ritmo: '', ultimo: '', crm: { notas: (c.notas || []).concat([note_(u, 'Ficha creada desde el prospecto para su primer servicio.', 'Nota')]) }, tarifa: {} };
    insert_('Clientes', cl);
  }
  c.cliente = cl.id; c.actualizado = iso_();
  update_('Contactos', c);
  return cl.id;
}
/** Para empezar el servicio de una solicitud: devuelve el cliente (creando su ficha si hace falta). */
function solClient_(solId, u) {
  const s = read_('Solicitudes').find(x => x.id === solId);
  if (!s) fail_('Solicitud no encontrada.');
  if (!s.cliente) {
    const c = s.contacto ? read_('Contactos').find(x => x.id === s.contacto) : null;
    s.cliente = c ? (c.cliente || clientFromContact_(c, u)) : clientFromContact_({ nombre: s.nombre, telefono: s.telefono, email: s.email, tipo: 'Particular', notas: [] }, u);
    update_('Solicitudes', s);
  }
  if (s.cuenta) { const a = read_('Cuentas').find(x => x.id === s.cuenta); if (a && !a.cliente) { a.cliente = s.cliente; update_('Cuentas', a); } }
  if (s.vehiculoId) { const v = read_('Vehiculos').find(x => x.id === s.vehiculoId); if (v && !v.cliente) { v.cliente = s.cliente; update_('Vehiculos', v); } }
  return s.cliente;
}
function solLink_(solId, serviceId) {
  const s = read_('Solicitudes').find(x => x.id === solId);
  if (!s) return;
  s.servicio = serviceId; s.actualizado = iso_();
  s.chat = (s.chat || []).concat([{ at: iso_(), de: 'sistema', texto: '¡Empezamos! Ya puedes seguir tu servicio en directo desde tu área.' }]);
  update_('Solicitudes', s);
}
/** Cierre de la solicitud: vale, bienvenida, cuenta y prospecto → cliente. */
function solDoneCore_(cur, u) {
  if (!cur.cliente) {
    const c = cur.contacto ? read_('Contactos').find(x => x.id === cur.contacto) : null;
    cur.cliente = c ? (c.cliente || clientFromContact_(c, u)) : '';
  }
  cur.estado = 'Hecha'; cur.actualizado = iso_();
  if (cur.bono && cur.bono.id && !cur.bono.usado) {
    const m = read_('Monedero').find(x => x.id === cur.bono.id && x.tipo === 'bono');
    if (m && Number(m.usadas) < Number(m.visitas)) {
      m.usadas = Number(m.usadas || 0) + 1;
      m.movs = (m.movs || []).concat([{ at: iso_(), k: cur.bono.k, texto: 'Visita ' + m.usadas + ' de ' + m.visitas + ' · ' + cur.bono.srv + ' (' + cur.numero + ')' }]);
      update_('Monedero', m);
      cur.bono = Object.assign({}, cur.bono, { usado: true });
    }
  }
  if (cur.vale && cur.vale.codigo && !cur.vale.usado) {
    const vm = valeFind_(cur.vale.codigo);
    const imp = vm ? r2_(Math.min(Number(vm.saldo), cur.vale.imp || 0)) : 0;
    if (vm && imp > 0) { vm.saldo = r2_(Number(vm.saldo) - imp); vm.cliente = vm.cliente || cur.cliente; vm.movs = (vm.movs || []).concat([{ at: iso_(), texto: 'Usado en ' + cur.numero + ' (' + cur.nombre + ')', imp: -imp }]); update_('Monedero', vm); }
    cur.vale.imp = imp; cur.vale.usado = iso_();
  }
  if (cur.cuenta) {
    const a = read_('Cuentas').find(x => x.id === cur.cuenta);
    if (a) { if (cur.descuento && /Bienvenida/.test(cur.descuento.n) && !a.bienvenida) a.bienvenida = iso_(); if (!a.cliente) a.cliente = cur.cliente; update_('Cuentas', a); }
  }
  if (cur.contacto) {
    const c = read_('Contactos').find(x => x.id === cur.contacto);
    if (c && c.fase !== 'Ganado') { c.fase = 'Ganado'; c.cliente = c.cliente || cur.cliente; c.proxFecha = ''; c.notas = (c.notas || []).concat([note_(u && u.nombre ? u : null, 'Primer servicio entregado (' + cur.numero + '): ya es cliente.', 'Nota')]); c.actualizado = iso_(); c.evento = calFollow_(c.evento, '', '', c.nombre, ''); update_('Contactos', c); }
  }
}
/** Se llama al entregar un servicio (firma del equipo o del cliente). */
function solDelivered_(svc, u) {
  const s = read_('Solicitudes').find(x => x.servicio === svc.id && x.estado !== 'Hecha');
  if (!s) return;
  solDoneCore_(s, u);
  s.chat = (s.chat || []).concat([{ at: iso_(), de: 'sistema', texto: 'Servicio entregado. ¡Gracias por confiar en Efecto Mariposa!' }]);
  update_('Solicitudes', s);
}
/** Traduce lo que contrató el cliente al servicio de operaciones (tipo, extras, alcance). */
function solToService_(s) {
  const sel = s.sel || {}, coche = sel.tipo === 'coche';
  const inten = coche ? Number(sel.s) >= 2 : Number(sel.s) === 2;
  const ext = coche ? [1, 3].indexOf(Number(sel.s)) >= 0 : Number(sel.ex) > 0;
  const tipo = (ext ? 'Integral ' : 'Interior ') + (inten ? 'profundo' : 'completo');
  const xt = (Array.isArray(sel.xt) ? sel.xt : []).map(x => ({ 49: 'oz', 59: 'pl', 39: 'fr' }[x] || String(x)));
  const extras = [];
  if (!coche && (Number(sel.seat) || inten)) extras.push('Extracción tapicerías');
  if (coche && (sel.ex || []).indexOf('tap') >= 0) extras.push('Extracción tapicerías');
  if (Number(sel.bed)) extras.push('Colchones');
  if (inten || xt.indexOf('oz') >= 0) extras.push('Ozono');
  if (inten && !coche && Number(sel.v) >= 5) extras.push('Desmontaje autorizado');
  if (xt.indexOf('pl') >= 0) extras.push('Recuperación de plásticos');
  if (xt.indexOf('fr') >= 0) extras.push('Frigorífico con exceso de suciedad');
  const veh = coche ? 'Coche' : Number(sel.v) <= 2 ? 'Camper' : Number(sel.v) <= 4 ? 'Caravana' : 'Autocaravana';
  const v = s.vehiculoId ? read_('Vehiculos').find(x => x.id === s.vehiculoId) : null;
  return { tipo: tipo, extras: extras, exterior: ext, vehiculo: veh, suciedad: ['Normal', 'Elevado', 'Intensivo'][Number(sel.st) || 0],
    matricula: (v && v.matricula) || s.matricula || '', modelo: (v && v.modelo) || '',
    alcance: s.numero + ' · ' + s.resumen + (s.lineas || []).filter(l => !/^(Interior|Mantenimiento)/.test(l.c)).map(l => '\n· ' + l.c).join('') };
}
/** Servicios programados (aún sin empezar) para la pantalla de Servicio nuevo e Inicio. Sin precios. */
function programados_(u) {
  if (u.rol !== 'admin' && (u.acceso || []).indexOf(PARTICULARES) < 0) return [];
  const lim = shift_(day_(), 7);
  return read_('Solicitudes').filter(s => s.estado === 'Programada' && !s.servicio && dd_(s.dia) && dd_(s.dia) <= lim).sort((a, b) => dd_(a.dia).localeCompare(dd_(b.dia)))
    .map(s => Object.assign({ id: s.id, numero: s.numero, nombre: s.nombre, telefono: s.telefono, dia: dd_(s.dia), cliente: s.cliente || '', lugar: P_PLACES[Number(s.sel && s.sel.w)] || '' }, solToService_(s)));
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
    if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'tareasPortal')) ScriptApp.newTrigger('tareasPortal').timeBased().everyHours(1).create();
  } catch (e) { console.error('Trigger limpiarFotos: ' + e); }
}

function fillFicha_(c, a) {
  const add = [];
  if (!c.telefono && a.telefono) { c.telefono = a.telefono; add.push('teléfono ' + a.telefono); }
  if (!emailsOf_(c).length && a.email) { c.email = a.email; add.push('correo ' + a.email); }
  if (!add.length) return false;
  c.crm = c.crm || {};
  c.crm.notas = (c.crm.notas || []).concat([note_(null, 'Ha creado su cuenta en el área de clientes. Se añade a la ficha: ' + add.join(' y ') + '.', 'Nota')]);
  return true;
}
function accClient_(a) {
  if (a.cliente) return a.cliente;
  const cl = read_('Clientes').find(c => c.tipo === 'particular' && ((a.telefono && norm_(c.telefono) === norm_(a.telefono)) || emailsOf_(c).indexOf(a.email) >= 0));
  if (!cl) return '';
  locked_(() => { const x = read_('Cuentas').find(y => y.id === a.id); if (x && !x.cliente) { x.cliente = cl.id; update_('Cuentas', x); } const c = read_('Clientes').find(y => y.id === cl.id); if (c && fillFicha_(c, a)) update_('Clientes', c); });
  a.cliente = cl.id;
  return cl.id;
}
function linkOk_(s) { return !s.cerrado || Date.now() <= Date.parse(linkExpires_(s)); }
function walletOut_(m) {
  const tot = Number(m.total) || 0, pag = Number(m.pagado) || 0, rest = Math.max(1, (Number(m.visitas) || 0) - (Number(m.usadas) || 0));
  return { estado: m.tipo === 'regalo' ? valeEstado_(m) : bonoEstado_(m), total: tot, pagado: pag, ref: m.ref || '', matricula: m.matricula || '', comp: m.comp || null, porVisita: tot ? r2_(Math.max(0, tot - pag) / rest) : 0, usuario: m.usuario || '', id: m.id, tipo: m.tipo, nombre: m.nombre, codigo: m.tipo === 'regalo' ? m.codigo : '', visitas: Number(m.visitas) || 0, usadas: Number(m.usadas) || 0, saldo: Number(m.saldo) || 0, inicial: Number(m.inicial) || 0, caduca: dd_(m.caduca), para: m.para || '', de: m.de || '',
    movs: (m.movs || []).slice(-10).map(x => ({ at: x.at, texto: x.texto, imp: x.imp || 0 })),
    lineas: m.tipo === 'bono' ? bonoLineas_(m) : [], matriculas: String(m.matricula || '').split(' / ').filter(Boolean) };
}

/* ------------------------------------------------------------------ */
/* Usar el bono desde el área de cliente                               */
/* ------------------------------------------------------------------ */
const SOL_ABIERTA_ = s => ['Hecha', 'Rechazada', 'Cancelada'].indexOf(s.estado) < 0;
/** Servicios del bono con lo que queda de cada uno (descontando las visitas ya pedidas y sin hacer). */
function bonoLineas_(m, sols) {
  const comp = m.comp && Array.isArray(m.comp.comp) ? m.comp.comp : null;
  const coche = !!(m.comp && m.comp.tipo === 'coche');
  const base = comp ? comp.map((c, k) => ({ k: k, srv: c.srv, n: Number(c.n) || 0, code: coche ? P_CSRV.indexOf(c.srv) : SRV_N.indexOf(c.srv) }))
    : [{ k: 0, srv: 'Visita del bono', n: Number(m.visitas) || 0, code: -1 }];
  sols = sols || read_('Solicitudes');
  const pedidas = sols.filter(x => x.bono && x.bono.id === m.id && SOL_ABIERTA_(x) && !x.bono.usado);
  const hechas = (m.movs || []).filter(x => x.k != null);
  let libres = Math.max(0, (Number(m.visitas) || 0) - (Number(m.usadas) || 0) - pedidas.length);
  return base.map(l => {
    const usadas = hechas.filter(x => Number(x.k) === l.k).length, enCurso = pedidas.filter(x => Number(x.bono.k) === l.k).length;
    const quedan = Math.max(0, Math.min(l.n - usadas - enCurso, libres));
    return { k: l.k, srv: l.srv, n: l.n, usadas: usadas, enCurso: enCurso, quedan: quedan };
  });
}
function cBonoUsar_(d, u, req) {
  const a = csession_(req);
  noPreview_(a);
  throttle_('bonous:' + a.id, 6);
  return locked_(() => {
    const m = read_('Monedero').find(x => x.id === d.id && x.tipo === 'bono' && x.activo !== false && (x.cuenta === a.id || x.usuario === a.email));
    if (!m) fail_('Bono no encontrado.');
    const est = bonoEstado_(m);
    if (est === 'Pendiente de pago') fail_('Tu bono se activa en cuanto recibamos el primer pago. Te avisamos por correo.');
    if (est !== 'Activo') fail_('Este bono está ' + est.toLowerCase() + '.');
    const sols = read_('Solicitudes');
    const l = bonoLineas_(m, sols).find(x => x.k === Number(d.k));
    if (!l) fail_('Elige qué servicio quieres.');
    if (!(l.quedan > 0)) fail_('Ya no te quedan visitas de ese servicio.');
    const w = [0, 1, 2].indexOf(Number(d.w)) >= 0 ? Number(d.w) : 2;
    const mats = String(m.matricula || '').split(' / ').filter(Boolean);
    const mat = mats.indexOf(String(d.matricula || '').toUpperCase()) >= 0 ? String(d.matricula).toUpperCase() : mats[0] || '';
    const dia = dayOk_(d.dia) || '';
    if (dia && dia < day_()) fail_('Elige una fecha a partir de hoy.');
    const comp = m.comp || {}, coche = comp.tipo === 'coche';
    const vIdx = coche ? P_CARS.findIndex(c => c[0] === comp.vehiculo) : P_NAMES.indexOf(comp.vehiculo);
    const sel = coche ? { tipo: 'coche', v: Math.max(0, vIdx), s: Math.max(0, l.code), seats: 0, ex: [], w: w } : { tipo: 'auto', v: vIdx >= 0 ? vIdx : 5, a: Number(comp.antiguedad) || 0, st: 0, s: l.code >= 0 ? l.code : 1, ex: 0, seat: 0, bed: 0, xt: [], w: w };
    const rest = Math.max(1, (Number(m.visitas) || 0) - (Number(m.usadas) || 0));
    const cobro = m.total ? r2_(Math.max(0, Number(m.total) - Number(m.pagado || 0)) / rest) : 0;
    const year = new Date().getFullYear();
    let max = 0;
    sols.forEach(x => { const q = String(x.numero || '').match(/^S(\d{4})-(\d+)$/); if (q && Number(q[1]) === year) max = Math.max(max, Number(q[2])); });
    const numero = 'S' + year + '-' + ('00' + (max + 1)).slice(-3);
    const cid = accClient_(a);
    const veh = comp.vehiculo || 'Vehículo del bono';
    const v = read_('Vehiculos').find(x => x.activo !== false && mat && String(x.matricula).toUpperCase() === mat && (x.cuenta === a.id || (cid && x.cliente === cid)));
    const visita = (Number(m.usadas) || 0) + bonoLineas_(m, sols).reduce((t, x) => t + x.enCurso, 0) + 1;
    const notas = clean_(d.notas, 600);
    const resumen = 'Bono ' + m.ref + ' · ' + l.srv;
    const lineas = [{ c: l.srv + ' · ' + veh + ' (bono ' + m.ref + ', visita ' + visita + ' de ' + m.visitas + ')', imp: 0 }].concat(cobro ? [{ c: 'Parte del bono que se paga en esta visita', imp: cobro }] : []);
    const s = { id: uid_(), numero: numero, fecha: iso_(), cuenta: a.id, contacto: '', cliente: cid || '', nombre: a.nombre, telefono: a.telefono || '', email: a.email,
      sel: sel, vehiculo: veh, resumen: resumen, lineas: lineas, manual: 0, descuento: null, total: cobro, estado: dia ? 'Aceptada' : 'Aceptada',
      fotos: [], chat: [{ at: iso_(), de: 'sistema', texto: 'Visita pedida con el bono ' + m.ref + ': ' + l.srv + (dia ? ' · día preferido ' + dia.split('-').reverse().join('/') : '') + '.' }].concat(notas ? [{ at: iso_(), de: 'cliente', texto: notas }] : []),
      dia: '', propuesto: dia, token: 't' + secret_(), revisado: iso_(), notas: '', carpeta: '', ofertas: false, evento: '', actualizado: iso_(), vale: null, procedencia: 'Bono ' + m.ref,
      vehiculoId: v ? v.id : '', matricula: mat, servicio: '', bono: { id: m.id, ref: m.ref, k: l.k, srv: l.srv, cobro: cobro, usado: false } };
    insert_('Solicitudes', s);
    m.movs = (m.movs || []).concat([{ at: iso_(), texto: 'Visita pedida desde el área: ' + l.srv + ' (' + numero + ')' }]);
    update_('Monedero', m);
    if (cid) { const cl = read_('Clientes').find(x => x.id === cid); if (cl) { cl.crm = cl.crm || {}; cl.crm.proxFecha = day_(); cl.crm.proxAccion = 'Programar visita del bono ' + m.ref + ' (' + numero + ')'; update_('Clientes', cl); } }
    const link = clientUrl_() + '#s=' + s.token;
    pmail_(a.email, 'Visita de tu bono · ' + numero, 'Hemos recibido tu visita', ['Hola, ' + esc_(String(a.nombre).split(' ')[0]) + ':', 'Has pedido <b>' + esc_(l.srv) + '</b> con tu bono <b>' + esc_(m.ref) + '</b> para ' + esc_([veh, mat].filter(Boolean).join(' · ')) + '.', dia ? 'Nos dices que te viene bien el <b>' + dia.split('-').reverse().join('/') + '</b>. Te confirmamos el día enseguida.' : 'Te escribimos enseguida para cerrar el día.', cobro ? 'En esta visita se paga la parte del bono que corresponde: <b>' + eurP_(cobro) + '</b>.' : 'Esta visita ya está pagada con tu bono.'], 'Ver mi visita', link, 'Visita con bono');
    pmail_(ownerMail_(), '🎟️ Visita con bono · ' + a.nombre + ' · ' + numero, 'Visita pedida con bono', ['<b>' + esc_(a.nombre) + '</b> (' + esc_(a.telefono || a.email) + ') pide <b>' + esc_(l.srv) + '</b> con el bono <b>' + esc_(m.ref) + '</b>.', esc_([veh, mat, P_PLACES[w]].filter(Boolean).join(' · ')), dia ? 'Día preferido: <b>' + dia.split('-').reverse().join('/') + '</b>' : 'Sin día preferido.', cobro ? 'A cobrar en la visita: <b>' + eurP_(cobro) + '</b> (parte pendiente del bono).' : 'Visita ya pagada.', notas ? 'Notas: ' + esc_(notas) : ''].filter(Boolean), 'Programarla', APP.appUrl + '#/solicitud/' + s.id, 'Visita con bono');
    return { t: s.token, numero: numero };
  });
}
Object.assign(PORTAL_OPEN, { cBonoUsar: 1 });
Object.assign(PORTAL_ACTIONS, { cBonoUsar: cBonoUsar_ });
function ofertasActivas_() {
  const hoy = day_();
  return read_('Ofertas').filter(o => o.activa !== false && (!o.hasta || dd_(o.hasta) >= hoy)).map(o => ({ id: o.id, titulo: o.titulo, texto: o.texto, pct: Number(o.pct) || 0, hasta: dd_(o.hasta) }));
}

// cMe_ completo: sustituye al de la fase 1
function cMe_(d, u, req) {
  const a = csession_(req);
  if (a.tipo === 'empresa' || a.tipo === 'colaborador') {
    const c = a.cliente ? clientById_(read_('Clientes'), a.cliente) : null;
    return { cuenta: accOut_(a), empresa: c ? c.nombre : '', portal: a.tipo === 'empresa' && !!a.usuario, solicitudes: [], servicios: [], facturas: [], monedero: [], vehiculos: [], ofertas: [] };
  }
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
    vehiculos: read_('Vehiculos').filter(v => v.activo !== false && (v.cuenta === a.id || (cid && v.cliente === cid))).map(vehOut_),
    monedero: wallet.map(walletOut_),
    pago: wallet.some(m => m.tipo === 'bono' && m.estado === 'Pendiente de pago') ? pagoInfo_() : null,
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
    solDelivered_(s, null);
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
      m.estado = 'Activo'; m.total = money_(d.total) || 0; m.matricula = clean_(d.matricula, 20).toUpperCase();
      if (!m.caduca) { const c = new Date(); c.setFullYear(c.getFullYear() + 1); m.caduca = Utilities.formatDate(c, APP.zona, 'yyyy-MM-dd'); }
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
      if (m.estado === 'Pendiente de pago') fail_('Este bono aún no está activo: falta registrar el primer pago.');
      if (Number(m.usadas) >= Number(m.visitas)) fail_('El bono ya no tiene visitas.');
      m.usadas = Number(m.usadas || 0) + 1;
      m.movs = (m.movs || []).concat([Object.assign({ at: iso_(), texto: 'Visita ' + m.usadas + ' de ' + m.visitas + (d.k != null && m.comp && m.comp.comp && m.comp.comp[Number(d.k)] ? ' · ' + m.comp.comp[Number(d.k)].srv : '') + (nota ? ' · ' + nota : '') }, d.k != null && d.k !== '' ? { k: Number(d.k) } : {})]);
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

/* ================================================================== */
/* Bonos desde el área del cliente: calcular, pedir, pagar y activar   */
/* El bono solo se activa cuando dirección confirma el primer pago.    */
/* ================================================================== */

const BONO_COMPO = {
  estandar:  { Escapadas: [[1, 2]], Temporadas: [[1, 4]], 'Siempre a punto': [[1, 2], [0, 4]] },
  intensiva: { Escapadas: [[2, 2]], Temporadas: [[2, 2], [1, 2]], 'Siempre a punto': [[2, 2], [0, 4]] }
};
const BONO_DTO = { Escapadas: 7, Temporadas: 10, 'Siempre a punto': 12 };
const SRV_N = ['Mantenimiento', 'Limpieza estándar', 'Limpieza intensiva'];
Object.assign(PORTAL_OPEN, { cBonoPedir: 1, cBonoAviso: 1, cVehSave: 1 });
Object.assign(PORTAL_ACTIONS, { cVehSave: cVehSave_, vehSave: vehSave_, vehList: vehList_, atender: atender_ });
Object.assign(PORTAL_ACTIONS, { cBonoPedir: cBonoPedir_, cBonoAviso: cBonoAviso_, walletPago: walletPago_ });

const BONO_COMPO_COCHE = {
  estandar:  { Escapadas: [[1, 2]], Temporadas: [[1, 4]], 'Siempre a punto': [[1, 2], [0, 4]] },
  intensiva: { Escapadas: [[3, 2]], Temporadas: [[3, 2], [1, 2]], 'Siempre a punto': [[3, 2], [0, 4]] }
};
function bonoCalc_(d) {
  if (d.tipo === 'coche') {
    const car = P_CARS[Number(d.cv)], base = d.base === 'intensiva' ? 'intensiva' : 'estandar', comp = BONO_COMPO_COCHE[base][d.bono];
    if (!car || !comp) fail_('Selección no válida.');
    let bruto = 0;
    const lineas = comp.map(c => { const unit = car[1][c[0]]; bruto += unit * c[1]; return { n: c[1], srv: P_CSRV[c[0]], unit: unit }; });
    bruto = r2_(bruto);
    const pct = BONO_DTO[d.bono], total = r2_(bruto * (1 - pct / 100));
    return { tipo: 'coche', vehiculo: car[0], antiguedad: 0, base: base, bono: d.bono, visitas: comp.reduce((t, c) => t + c[1], 0), comp: lineas, bruto: bruto, pct: pct, total: total, primero: r2_(total / 2) };
  }
  const r = P_RATES[Number(d.v)], a = Number(d.a) || 0, base = d.base === 'intensiva' ? 'intensiva' : 'estandar', comp = BONO_COMPO[base][d.bono];
  if (!r || !comp || [0, 10, 25].indexOf(a) < 0) fail_('Selección no válida.');
  let bruto = 0;
  const lineas = comp.map(c => { const unit = r2_(r[c[0]] * (c[0] ? 1 + a / 100 : 1)); bruto += unit * c[1]; return { n: c[1], srv: SRV_N[c[0]], unit: unit }; });
  bruto = r2_(bruto);
  const pct = BONO_DTO[d.bono], total = r2_(bruto * (1 - pct / 100));
  return { vehiculo: P_NAMES[Number(d.v)], antiguedad: a, base: base, bono: d.bono, visitas: comp.reduce((t, c) => t + c[1], 0), comp: lineas, bruto: bruto, pct: pct, total: total, primero: r2_(total / 2) };
}
function bonoEstado_(m) {
  if (m.activo === false) return 'Anulado';
  if (m.estado === 'Pendiente de pago') return 'Pendiente de pago';
  if (Number(m.usadas) >= Number(m.visitas)) return 'Gastado';
  if (m.caduca && dd_(m.caduca) < day_()) return 'Caducado';
  return 'Activo';
}
function pagoInfo_() {
  const e = emisor_();
  return { bizum: typeof BIZUM_PAGO !== 'undefined' ? BIZUM_PAGO : '', iban: e.iban || '', titular: e.titular || e.nombre || 'Efecto Mariposa' };
}
function cBonoPedir_(d, u, req) {
  const a = csession_(req);
  noPreview_(a);
  throttle_('bono:' + a.id, 6);
  if (!d.acepto) fail_('Acepta las condiciones del bono para continuar.');
  const calc = bonoCalc_(d), mat1 = clean_(d.matricula, 20).toUpperCase(), mat2 = calc.tipo === 'coche' ? clean_(d.matricula2, 20).toUpperCase() : '';
  if (!mat1) fail_('Escribe la matrícula: el bono va unido a ese vehículo.');
  const mat = mat2 && mat2 !== mat1 ? mat1 + ' / ' + mat2 : mat1;
  const cid = accClient_(a);
  return locked_(() => {
    const all = read_('Monedero'), y = new Date().getFullYear();
    let max = 0;
    all.forEach(m => { const x = String(m.ref || '').match(/^B(\d{4})-(\d+)$/); if (x && Number(x[1]) === y) max = Math.max(max, Number(x[2])); });
    const ref = 'B' + y + '-' + ('00' + (max + 1)).slice(-3);
    const m = { id: 'w-' + uid_().slice(0, 8), tipo: 'bono', cliente: cid, cuenta: a.id, nombre: calc.bono, codigo: '', visitas: calc.visitas, usadas: 0, saldo: 0, inicial: 0, caduca: '', para: '', de: '', email: a.email, notas: clean_(d.modelo, 80), creado: iso_(), activo: true, usuario: a.email,
      total: calc.total, pagado: 0, ref: ref, matricula: mat, comp: calc, estado: 'Pendiente de pago',
      movs: [{ at: iso_(), texto: 'Pedido desde el área de cliente: ' + calc.bono + ' (' + (calc.base === 'intensiva' ? 'intensivo' : 'estándar') + ') · ' + calc.vehiculo + ' ' + mat + ' · ' + eurP_(calc.total) }] };
    insert_('Monedero', m);
    const pi = pagoInfo_();
    pmail_(a.email, 'Tu bono ' + calc.bono + ' · ' + ref, 'Tu bono está reservado', ['Hola, ' + esc_(String(a.nombre).split(' ')[0]) + ':', 'Has pedido el bono <b>' + esc_(calc.bono) + '</b> para tu ' + esc_(calc.vehiculo) + ' (' + esc_(mat) + '): ' + calc.visitas + ' visitas por <b>' + eurP_(calc.total) + '</b>.', 'Para activarlo, paga el primer 50 %: <b>' + eurP_(calc.primero) + '</b>', 'Bizum: <b>' + esc_(pi.bizum) + '</b>' + (pi.iban ? '<br>Transferencia: <b>' + esc_(pi.iban) + '</b> · ' + esc_(pi.titular) : '') + '<br>Concepto: <b>' + ref + '</b>', 'En cuanto lo recibamos, lo activamos y te avisamos. El resto lo pagas poco a poco en cada visita.'], 'Ver mi monedero', clientUrl_() + '#area', 'Bono ' + ref);
    pmail_(ownerMail_(), 'Nuevo bono pedido · ' + a.nombre + ' · ' + ref, 'Bono pedido desde la app', ['<b>' + esc_(a.nombre) + '</b> (' + esc_(a.telefono || a.email) + ') pide <b>' + esc_(calc.bono) + '</b> ' + (calc.base === 'intensiva' ? 'intensivo' : 'estándar') + ' para ' + esc_(calc.vehiculo) + ' ' + esc_(mat) + '.', 'Total ' + eurP_(calc.total) + ' · primer pago ' + eurP_(calc.primero) + ' · concepto ' + ref + '.', 'Cuando te llegue el pago, regístralo en Más → Bonos y ofertas y se activa solo.'], 'Abrir Bonos y ofertas', APP.appUrl + '#/monedero', 'Bono');
    return walletOut_(m);
  });
}
function cBonoAviso_(d, u, req) {
  const a = csession_(req);
  noPreview_(a);
  throttle_('bonoav:' + a.id, 5);
  return locked_(() => {
    const m = read_('Monedero').find(x => x.id === d.id && x.cuenta === a.id && x.tipo === 'bono');
    if (!m) fail_('Bono no encontrado.');
    m.movs = (m.movs || []).concat([{ at: iso_(), texto: 'El cliente avisa de que ha pagado (' + (clean_(d.como, 20) || 'Bizum/transferencia') + ')' }]);
    update_('Monedero', m);
    pmail_(ownerMail_(), '💶 ' + a.nombre + ' dice que ha pagado el bono ' + m.ref, 'Aviso de pago de bono', ['<b>' + esc_(a.nombre) + '</b> avisa de que ha pagado el bono <b>' + esc_(m.ref) + '</b> (' + esc_(clean_(d.como, 20) || 'Bizum/transferencia') + ').', 'Comprueba que te ha llegado y regístralo para activarlo.'], 'Registrar el pago', APP.appUrl + '#/monedero', 'Pago');
    return walletOut_(m);
  });
}
/** Dirección registra un pago del bono. Con el primer 50 % se activa y empieza a contar el año. */
function walletPago_(d, u) {
  admin_(u);
  return locked_(() => {
    const m = read_('Monedero').find(x => x.id === d.id && x.tipo === 'bono');
    if (!m) fail_('Bono no encontrado.');
    const imp = money_(d.importe);
    if (!(imp > 0)) fail_('Indica el importe recibido.');
    m.pagado = r2_((Number(m.pagado) || 0) + imp);
    m.movs = (m.movs || []).concat([{ at: iso_(), texto: 'Pago recibido (' + (clean_(d.metodo, 20) || 'Bizum') + ')' + (clean_(d.nota, 120) ? ' · ' + clean_(d.nota, 120) : ''), imp: imp }]);
    if (m.estado === 'Pendiente de pago' && m.pagado + 0.01 >= r2_(Number(m.total) / 2)) {
      m.estado = 'Activo';
      const c = new Date(); c.setFullYear(c.getFullYear() + 1); m.caduca = Utilities.formatDate(c, APP.zona, 'yyyy-MM-dd');
      m.movs.push({ at: iso_(), texto: 'Bono activado · válido hasta ' + m.caduca.split('-').reverse().join('/') });
      pmail_(m.email, '✅ Tu bono ' + m.nombre + ' está activado', 'Tu bono ya está activo', ['Hemos recibido tu pago de ' + eurP_(imp) + '. ¡Gracias!', 'Tu bono <b>' + esc_(m.nombre) + '</b> (' + esc_(m.ref) + ') para ' + esc_(m.matricula) + ' ya está activo: ' + m.visitas + ' visitas, válido hasta el <b>' + m.caduca.split('-').reverse().join('/') + '</b>.', 'Pide cada visita desde tu área de cliente o escríbenos.'], 'Ver mi monedero', clientUrl_() + '#area', 'Bono activo');
    }
    update_('Monedero', m);
    return walletOut_(m);
  });
}


/* ================================================================== */
/* Vehículos de cada cliente                                           */
/* ================================================================== */

function vehOut_(v) { return { id: v.id, tipo: v.tipo, modelo: v.modelo || '', matricula: v.matricula || '', cliente: v.cliente || '' }; }
function vehAdd_(o) {
  const all = read_('Vehiculos'), mat = String(o.matricula || '').toUpperCase().replace(/\s+/g, ' ').trim();
  let v = mat ? all.find(x => x.activo !== false && norm_(x.matricula) === norm_(mat) && ((o.cliente && x.cliente === o.cliente) || (o.cuenta && x.cuenta === o.cuenta))) : null;
  if (v) { ['cliente', 'cuenta', 'contacto'].forEach(k => { if (!v[k] && o[k]) v[k] = o[k]; }); if (o.modelo && !v.modelo) v.modelo = o.modelo; update_('Vehiculos', v); return v; }
  v = { id: 'v-' + uid_().slice(0, 8), cliente: o.cliente || '', cuenta: o.cuenta || '', contacto: o.contacto || '', tipo: clean_(o.tipo, 60), modelo: clean_(o.modelo, 80), matricula: mat, notas: '', creado: iso_(), activo: true };
  insert_('Vehiculos', v);
  return v;
}
function cVehSave_(d, u, req) {
  const a = csession_(req);
  noPreview_(a);
  const cid = accClient_(a);
  return locked_(() => {
    if (d.id) {
      const v = read_('Vehiculos').find(x => x.id === d.id && (x.cuenta === a.id || (cid && x.cliente === cid)));
      if (!v) fail_('Vehículo no encontrado.');
      if (d.borrar) v.activo = false;
      else { if (d.modelo !== undefined) v.modelo = clean_(d.modelo, 80); if (d.matricula !== undefined) v.matricula = String(d.matricula || '').toUpperCase().trim(); if (d.tipo) v.tipo = clean_(d.tipo, 60); }
      update_('Vehiculos', v);
      return vehOut_(v);
    }
    if (!clean_(d.tipo, 60)) fail_('Elige el tipo de vehículo.');
    return vehOut_(vehAdd_({ cliente: cid, cuenta: a.id, tipo: d.tipo, modelo: d.modelo, matricula: d.matricula }));
  });
}
function vehList_(d, u) {
  admin_(u);
  return read_('Vehiculos').filter(v => v.activo !== false && ((d.cliente && v.cliente === d.cliente) || (d.contacto && v.contacto === d.contacto))).map(vehOut_);
}
function vehSave_(d, u) {
  admin_(u);
  return locked_(() => {
    if (d.id) {
      const v = read_('Vehiculos').find(x => x.id === d.id);
      if (!v) fail_('Vehículo no encontrado.');
      if (d.borrar) v.activo = false;
      else { ['modelo', 'tipo'].forEach(k => { if (d[k] !== undefined) v[k] = clean_(d[k], 80); }); if (d.matricula !== undefined) v.matricula = String(d.matricula || '').toUpperCase().trim(); }
      update_('Vehiculos', v);
      return vehOut_(v);
    }
    return vehOut_(vehAdd_({ cliente: clean_(d.cliente, 60), contacto: clean_(d.contacto, 60), tipo: d.tipo, modelo: d.modelo, matricula: d.matricula }));
  });
}

/* ================================================================== */
/* Para atender hoy (Inicio de dirección)                              */
/* ================================================================== */

function atender_(d, u) {
  admin_(u);
  const sols = read_('Solicitudes'), accs = read_('Cuentas'), cs = read_('Contactos'), hoy = day_(), now = Date.now();
  const mini = s => ({ id: s.id, numero: s.numero, nombre: s.nombre, resumen: s.resumen, total: s.total, propuesto: dd_(s.propuesto), dia: dd_(s.dia), fecha: s.fecha });
  const conSol = {}; sols.forEach(s => { if (s.cuenta) conSol[s.cuenta] = 1; if (s.email) conSol[s.email] = 1; });
  const sinSol = accs.filter(a => a.activo !== false && !a.cliente && !conSol[a.id] && !conSol[a.email] && now - Date.parse(a.creado) > 864e5 && now - Date.parse(a.creado) < 14 * 864e5)
    .map(a => { const c = cs.find(x => x.id === a.contacto); return { cuenta: a.id, nombre: a.nombre, telefono: a.telefono, email: a.email, contacto: a.contacto || '', creado: a.creado, ayuda: a.ayuda || '', cerrado: c && ['Perdido', 'Archivado', 'Ganado'].indexOf(c.fase) >= 0 }; }).filter(x => !x.cerrado);
  return {
    aceptadas: sols.filter(s => s.estado === 'Aceptada').map(mini),
    nuevas: sols.filter(s => s.estado === 'Recibida').map(mini),
    mensajes: sols.filter(s => ['Hecha', 'Rechazada', 'Cancelada'].indexOf(s.estado) < 0 && (s.chat || []).length && s.chat[s.chat.length - 1].de === 'cliente').map(mini),
    programadas: sols.filter(s => s.estado === 'Programada' && !s.servicio && dd_(s.dia) && dd_(s.dia) <= shift_(hoy, 1)).map(mini),
    bonos: read_('Monedero').filter(m => m.tipo === 'bono' && m.activo !== false && m.estado === 'Pendiente de pago').map(m => ({ id: m.id, ref: m.ref, nombre: m.nombre, total: Number(m.total) || 0, email: m.email })),
    sinSolicitud: sinSol,
    nuevosHoy: cs.filter(c => day_(c.creado) === hoy && !c.cliente).map(c => ({ id: c.id, nombre: c.nombre, origen: c.origen, telefono: c.telefono }))
  };
}

/* ================================================================== */
/* Tareas automáticas cada hora: ayuda a quien creó cuenta y no pidió  */
/* presupuesto (un único correo, a las 24 horas)                        */
/* ================================================================== */

function tareasPortal() {
  const now = Date.now();
  const sols = read_('Solicitudes'), con = {};
  sols.forEach(s => { if (s.cuenta) con[s.cuenta] = 1; if (s.email) con[s.email] = 1; });
  const objetivo = read_('Cuentas').filter(a => a.activo !== false && !a.ayuda && !a.cliente && !con[a.id] && !con[a.email] && now - Date.parse(a.creado) > 864e5 && now - Date.parse(a.creado) < 7 * 864e5);
  objetivo.slice(0, 30).forEach(a => {
    pmail_(a.email, '¿Te ayudamos con tu presupuesto?', '¿Te echamos una mano?', ['Hola, ' + esc_(String(a.nombre).split(' ')[0]) + ':', 'Ayer creaste tu cuenta en Efecto Mariposa, ¡gracias! Vemos que aún no has pedido tu presupuesto.', 'Si tienes alguna duda o algo no te ha funcionado, respóndenos a este correo o llámanos al <b>614 065 526</b> y te ayudamos encantados.', 'Recuerda: tienes un <b>−10 % en tu primer servicio</b> (desde 150 €).'], 'Pedir mi presupuesto', clientUrl_() + '#nuevo', 'Te ayudamos');
    locked_(() => {
      const x = read_('Cuentas').find(y => y.id === a.id); if (!x || x.ayuda) return;
      x.ayuda = iso_(); update_('Cuentas', x);
      const c = x.contacto ? read_('Contactos').find(y => y.id === x.contacto) : null;
      if (c && ['Perdido', 'Archivado', 'Ganado'].indexOf(c.fase) < 0) { c.proxAccion = 'Llamar: creó cuenta y no ha pedido presupuesto'; c.proxFecha = day_(); c.notas = (c.notas || []).concat([note_(null, 'Enviado correo automático de ayuda (24 h sin pedir presupuesto).', 'Correo')]); c.actualizado = iso_(); c.evento = calFollow_(c.evento, c.proxFecha, c.proxAccion, c.nombre, c.telefono); update_('Contactos', c); }
    });
  });
  flushMail_();
  return objetivo.length;
}

/* ================================================================== */
/* Una sola puerta: empresas y colaboradores entran con correo y       */
/* contraseña en el área de clientes (el PIN queda solo para el equipo) */
/* ================================================================== */

Object.assign(PORTAL_OPEN, { cPortal: 1, cColab: 1 });
Object.assign(PORTAL_ACTIONS, { cPortal: cPortal_, cColab: cColab_, invitar: invitar_, colabSave: colabSave_, clientColab: clientColab_, colabInfo: colabInfo_, colabLiquidar: colabLiquidar_, clientDelete: clientDelete_ });

/** Crea (o actualiza) la cuenta de acceso de una persona de empresa o de un colaborador y le envía la invitación. */
function inviteAccount_(o) {
  const email = String(o.email || '').trim().toLowerCase();
  if (!mailOk_(email)) fail_('Pon un correo válido para enviarle el acceso.');
  const accs = read_('Cuentas');
  let a = accs.find(x => x.email === email);
  if (a && a.tipo === 'particular' && a.cliente && o.tipo === 'empresa') fail_('Ese correo ya es de un cliente particular. Usa otro correo para el acceso de empresa.');
  if (!a) {
    a = { id: 'a-' + uid_().slice(0, 8), email: email, nombre: o.nombre, telefono: o.telefono || '', hash: '', sal: '', tipo: o.tipo, cliente: o.cliente || '', contacto: '', rol: o.permiso || '', ofertas: false, bienvenida: 'x', tokenV: 1, activo: true, creado: iso_(), ultimo: '', procedencia: 'Invitación de dirección', ayuda: 'x', usuario: o.usuario || '', colab: o.colab || '' };
    insert_('Cuentas', a);
  } else {
    if (o.tipo === 'empresa') { a.tipo = 'empresa'; a.usuario = o.usuario || a.usuario; a.cliente = o.cliente || a.cliente; a.rol = o.permiso || a.rol; }
    if (o.colab) a.colab = o.colab;   // si ya era particular o empresa, sigue siéndolo y además ve su pestaña de colaborador
    a.activo = true;
    update_('Cuentas', a);
  }
  if (a.hash && o.tipo === 'colaborador') {   // ya tiene contraseña: solo le avisamos de la nueva pestaña
    pmail_(email, 'Ya eres colaborador de Efecto Mariposa', 'Tienes tu área de colaborador', ['Hola, ' + esc_(String(o.nombre || a.nombre).split(' ')[0]) + ':', 'Desde ahora, en tu área de cliente verás la pestaña <b>Colaborador</b> con tu enlace, tu QR, tus comisiones y tus objetivos.', 'Entra con tu correo y tu contraseña de siempre.'], 'Entrar en mi área', clientUrl_() + '#area', 'Colaborador');
    return a;
  }
  const quien = o.tipo === 'empresa' ? 'el portal de ' + esc_(o.empresa || 'tu empresa') : 'tu área de colaborador';
  pmail_(email, 'Tu acceso a Efecto Mariposa', 'Te damos acceso a ' + quien, ['Hola, ' + esc_(String(o.nombre).split(' ')[0]) + ':',
    o.tipo === 'empresa' ? 'Desde ahora entras con tu correo y una contraseña. Verás vuestros vehículos en directo, fotos, incidencias, albaranes' + (o.permiso === 'responsable' ? ', facturas y vuestra tarifa' : '') + ', y podrás pedir servicios.' : 'Verás los clientes que nos has recomendado, tus comisiones, tus objetivos y tu enlace para compartir.',
    'Pulsa el botón para crear tu contraseña. El enlace caduca en 7 días; si caduca, pide otro desde «He olvidado la contraseña».'], 'Crear mi contraseña', clientUrl_() + '#inv=' + ctoken_(a, 'm', 7 * 864e5), 'Acceso');
  return a;
}
function invitar_(d, u) {
  admin_(u);
  return locked_(() => {
    if (d.usuario) {
      const w = read_('Usuarios').find(x => x.id === d.usuario && x.rol === 'cliente');
      if (!w) fail_('Persona no encontrada.');
      if (d.email) { w.email = clean_(d.email, 120).toLowerCase(); update_('Usuarios', w); }
      const c = clientById_(read_('Clientes'), (w.acceso || [])[0]) || {};
      inviteAccount_({ email: w.email, nombre: w.nombre, telefono: w.telefono, tipo: 'empresa', usuario: w.id, cliente: c.id || '', empresa: c.nombre, permiso: permiso_(w) });
      return { ok: true, email: w.email };
    }
    const c = read_('Clientes').find(x => x.id === d.cliente);
    if (!c || !c.colab || !c.colab.activo) fail_('Primero activa el colaborador.');
    const email = clean_(d.email, 120).toLowerCase() || emailsOf_(c)[0];
    inviteAccount_({ email: email, nombre: c.contacto || c.nombre, telefono: c.telefono, tipo: 'colaborador', colab: c.id });
    c.colab.acceso = email; update_('Clientes', c);
    return { ok: true, email: email };
  });
}
/** Abre el portal de empresa desde el área de clientes (sesión del portal, sin PIN). */
function cPortal_(d, u, req) {
  const a = csession_(req);
  if (a.tipo !== 'empresa' || !a.usuario) fail_('Esta cuenta no tiene portal de empresa.');
  const w = read_('Usuarios').find(x => x.id === a.usuario && x.activo);
  if (!w) fail_('Tu acceso de empresa está desactivado. Habla con Efecto Mariposa.');
  return { url: APP.appUrl + '#tk=' + token_(w) };
}

/* ------------------------------------------------------------------ */
/* Colaboradores: acuerdo, clientes traídos, comisiones y objetivos    */
/* ------------------------------------------------------------------ */

function colabFind_(txt) {
  const t = String(txt || '').trim();
  if (!t) return null;
  const up = t.toUpperCase().replace(/[^A-Z0-9]/g, ''), n = norm_(t);
  return read_('Clientes').find(c => c.colab && c.colab.activo && (String(c.colab.codigo || '').toUpperCase() === up || norm_(c.nombre) === n)) || null;
}
function colabCode_(nombre, all) {
  const base = String(nombre || 'COLAB').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'COLAB';
  let code = base, i = 2;
  while (all.some(c => c.colab && String(c.colab.codigo).toUpperCase() === code)) code = base + (i++);
  return code;
}
/** Dirección activa o ajusta el acuerdo de colaboración de una ficha (empresa, particular o solo colaborador). */
function colabSave_(d, u) {
  admin_(u);
  return locked_(() => {
    let c = d.id ? read_('Clientes').find(x => x.id === d.id) : null;
    if (!c && d.nuevo) {
      const nombre = clean_(d.nombre, 120);
      if (!nombre) fail_('Indica el nombre del colaborador.');
      c = { id: 'c-' + uid_().slice(0, 8), nombre: nombre, tipo: 'empresa', protocolo: 'general', tipos: TIPOS_GENERAL, contacto: clean_(d.contacto, 120), telefono: clean_(d.telefono, 40), email: clean_(d.email, 200), revisor: '', carpeta: '', activo: true, creado: iso_(), avisos: false, nif: upper_(d.nif, 20), direccion: '', ritmo: '', ultimo: '', crm: { notas: [] }, tarifa: {}, colab: null, colaborador: '', colabDesde: '' };
      insert_('Clientes', c);
    }
    if (!c) fail_('Ficha no encontrada.');
    const all = read_('Clientes');
    const prev = c.colab || {};
    const objetivos = Array.isArray(d.objetivos) ? d.objetivos.slice(0, 8).map(o => ({ titulo: clean_(o.titulo, 80), desde: dayOk_(o.desde) || '', hasta: dayOk_(o.hasta) || '', clientes: Math.max(0, Math.round(Number(o.clientes) || 0)), facturacion: money_(o.facturacion) || 0, premio: clean_(o.premio, 120) })).filter(o => o.titulo || o.clientes || o.facturacion) : (prev.objetivos || []);
    c.colab = { activo: d.activo !== false, pct: Math.max(0, Math.min(50, Number(String(d.pct === undefined ? prev.pct : d.pct).replace(',', '.')) || 0)), meses: 12, codigo: prev.codigo || colabCode_(c.nombre, all.filter(x => x.id !== c.id)), solo: d.solo !== undefined ? !!d.solo : !!prev.solo || !!d.nuevo, objetivos: objetivos, acceso: prev.acceso || '', desde: prev.desde || day_() };
    update_('Clientes', c);
    return { id: c.id, colab: c.colab, enlace: clientUrl_() + '?col=' + c.colab.codigo };
  });
}
/** Asocia (o quita) el colaborador que trajo a un cliente. */
function clientColab_(d, u) {
  admin_(u);
  return locked_(() => {
    const c = read_('Clientes').find(x => x.id === d.id);
    if (!c) fail_('Cliente no encontrado.');
    if (d.colaborador) {
      const k = read_('Clientes').find(x => x.id === d.colaborador && x.colab && x.colab.activo);
      if (!k) fail_('Colaborador no encontrado.');
      if (k.id === c.id) fail_('Un colaborador no puede traerse a sí mismo.');
      c.colaborador = k.id; c.colabDesde = dayOk_(d.desde) || c.colabDesde || day_();
    } else { c.colaborador = ''; c.colabDesde = ''; }
    update_('Clientes', c);
    return { colaborador: c.colaborador, colabDesde: dd_(c.colabDesde) };
  });
}
/** Al cobrar del todo una factura de un cliente traído, se apunta la comisión (12 meses desde que llegó). */
function comisionFactura_(f) {
  const all = read_('Comisiones'), prev = all.find(x => x.factura === f.id);
  if (f.estado !== 'Cobrada') {
    if (prev && prev.estado === 'Pendiente') { const sh = sheet_('Comisiones'); sh.deleteRow(findRow_(sh, prev.id)); bump_('Comisiones'); }
    return;
  }
  if (prev) return;
  const c = read_('Clientes').find(x => x.id === f.cliente);
  if (!c || !c.colaborador) return;
  const k = read_('Clientes').find(x => x.id === c.colaborador);
  if (!k || !k.colab || !k.colab.activo || !(Number(k.colab.pct) > 0)) return;
  const desde = dd_(c.colabDesde) || day_(c.creado), fecha = dd_(f.fecha);
  const lim = new Date(desde + 'T12:00:00Z'); lim.setUTCMonth(lim.getUTCMonth() + (Number(k.colab.meses) || 12));
  if (fecha < desde || fecha > lim.toISOString().slice(0, 10)) return;
  const base = money_(f.imponible), pct = Number(k.colab.pct);
  insert_('Comisiones', { id: 'k-' + uid_().slice(0, 8), colaborador: k.id, cliente: c.id, factura: f.id, numero: f.numero, fecha: fecha, base: base, pct: pct, importe: r2_(base * pct / 100), estado: 'Pendiente', liquidacion: '', creado: iso_() });
}
function inicial_(n) { const p = String(n || '').trim().split(/\s+/); return p[0] + (p[1] ? ' ' + p[1][0] + '.' : ''); }
/** Resumen del colaborador. privado=true para su área (sin datos personales de los clientes). */
function colabData_(k, privado) {
  const clients = read_('Clientes').filter(c => c.colaborador === k.id);
  const fs = read_('Facturas').filter(f => f.estado !== 'Anulada');
  const kom = read_('Comisiones').filter(x => x.colaborador === k.id).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  const hoy = day_(), ano = hoy.slice(0, 4), mes = hoy.slice(0, 7);
  const sum = l => r2_(l.reduce((t, x) => t + Number(x.importe || 0), 0));
  const fac = (cid, desde, hasta) => fs.filter(f => f.cliente === cid && (!desde || dd_(f.fecha) >= desde) && (!hasta || dd_(f.fecha) <= hasta)).reduce((t, f) => t + money_(f.imponible), 0);
  const objetivos = (k.colab.objetivos || []).map(o => {
    const n = clients.filter(c => (!o.desde || dd_(c.colabDesde) >= o.desde) && (!o.hasta || dd_(c.colabDesde) <= o.hasta)).length;
    const f = r2_(clients.reduce((t, c) => t + fac(c.id, o.desde, o.hasta), 0));
    return Object.assign({}, o, { llevaClientes: n, llevaFacturacion: f });
  });
  return {
    id: k.id, nombre: k.nombre, pct: k.colab.pct, meses: k.colab.meses || 12, codigo: k.colab.codigo, solo: !!k.colab.solo, acceso: k.colab.acceso || '',
    enlace: clientUrl_() + '?col=' + k.colab.codigo,
    clientes: clients.map(c => ({ id: privado ? '' : c.id, nombre: privado ? inicial_(c.nombre) : c.nombre, desde: dd_(c.colabDesde), facturado: r2_(fac(c.id, dd_(c.colabDesde))), servicios: fs.filter(f => f.cliente === c.id).length })),
    comisiones: kom.map(x => ({ id: x.id, fecha: dd_(x.fecha), numero: privado ? '' : x.numero, cliente: (() => { const c = clients.find(y => y.id === x.cliente); return c ? (privado ? inicial_(c.nombre) : c.nombre) : ''; })(), base: Number(x.base), pct: Number(x.pct), importe: Number(x.importe), estado: x.estado, liquidacion: x.liquidacion })),
    pendiente: sum(kom.filter(x => x.estado === 'Pendiente')), mes: sum(kom.filter(x => String(x.fecha).slice(0, 7) === mes)), ano: sum(kom.filter(x => String(x.fecha).slice(0, 4) === ano)), pagado: sum(kom.filter(x => x.estado === 'Liquidada')),
    objetivos: objetivos
  };
}
function colabInfo_(d, u) {
  admin_(u);
  const all = read_('Clientes');
  if (d.id) { const k = all.find(x => x.id === d.id && x.colab); if (!k) fail_('No es colaborador.'); return colabData_(k, false); }
  return all.filter(x => x.colab && x.colab.activo).map(k => { const x = colabData_(k, false); return { id: x.id, nombre: x.nombre, pct: x.pct, codigo: x.codigo, solo: x.solo, clientes: x.clientes.length, pendiente: x.pendiente, ano: x.ano }; });
}
function cColab_(d, u, req) {
  const a = csession_(req);
  if (!a.colab) fail_('Esta cuenta no es de colaborador.');
  const k = read_('Clientes').find(x => x.id === a.colab && x.colab && x.colab.activo);
  if (!k) fail_('Tu colaboración no está activa. Habla con Efecto Mariposa.');
  return colabData_(k, true);
}
/** Liquidación mensual: marca como pagadas las comisiones pendientes y genera el resumen en PDF. */
function colabLiquidar_(d, u) {
  admin_(u);
  return locked_(() => {
    const k = read_('Clientes').find(x => x.id === d.id && x.colab);
    if (!k) fail_('Colaborador no encontrado.');
    const hasta = dayOk_(d.hasta) || day_();
    const pend = read_('Comisiones').filter(x => x.colaborador === k.id && x.estado === 'Pendiente' && dd_(x.fecha) <= hasta);
    if (!pend.length) fail_('No hay comisiones pendientes hasta esa fecha.');
    const ref = 'L' + hasta.slice(0, 7).replace('-', '') + '-' + k.colab.codigo;
    const total = r2_(pend.reduce((t, x) => t + Number(x.importe), 0));
    const clients = read_('Clientes');
    let archivo = '';
    try {
      const html = docHtml_({ tipo: 'LIQUIDACIÓN DE COMISIONES', numero: ref, fecha: hasta, meta: [['Fecha', hasta.split('-').reverse().join('/')], ['Comisión', k.colab.pct + ' % sobre base imponible cobrada'], ['Periodo', 'hasta ' + hasta.split('-').reverse().join('/')]], para: { nombre: k.nombre, nif: k.nif, direccion: k.direccion, contacto: k.contacto }, paraTitulo: 'COLABORADOR',
        cols: ['Fecha', 'Factura', 'Cliente', 'Base', '%', 'Comisión'], right: [3, 4, 5],
        filas: pend.map(x => [esc_(dd_(x.fecha).split('-').reverse().join('/')), esc_(x.numero), esc_(inicial_((clientById_(clients, x.cliente) || {}).nombre)), eurP_(Number(x.base)), x.pct + ' %', eurP_(Number(x.importe))]),
        totales: [['Total a liquidar', eurP_(total), true]],
        bloques: ['<div class="bx wa"><b>Para cobrarlo:</b> envíanos tu factura por <b>' + eurP_(total) + '</b> (más los impuestos que te correspondan) con la referencia <b>' + ref + '</b>.</div>'] });
      const folder = folderNamed_(folderNamed_(rootClientes_(), 'Colaboradores'), k.nombre);
      archivo = saveDoc_(folder, 'Liquidación ' + ref + '.pdf', pdf_(html, 'Liquidación ' + ref)).getId();
    } catch (e) { console.error('PDF liquidación: ' + e); }
    pend.forEach(x => { x.estado = 'Liquidada'; x.liquidacion = ref; update_('Comisiones', x); });
    const to = k.colab.acceso || emailsOf_(k)[0];
    if (to) pmail_(to, 'Liquidación de comisiones ' + ref, 'Tu liquidación está lista', ['Hola:', 'Hemos cerrado tus comisiones hasta el ' + hasta.split('-').reverse().join('/') + ': <b>' + eurP_(total) + '</b> (' + pend.length + (pend.length > 1 ? ' facturas' : ' factura') + ').', 'Envíanos tu factura con la referencia <b>' + ref + '</b> y te la pagamos. Tienes el detalle en tu área de colaborador.'], 'Ver mi área', clientUrl_() + '#area', 'Comisiones');
    return { ref: ref, total: total, n: pend.length, archivo: archivo };
  });
}

/* ------------------------------------------------------------------ */
/* Borrar clientes de prueba                                           */
/* ------------------------------------------------------------------ */

function clientDelete_(d, u) {
  admin_(u);
  return locked_(() => {
    const c = read_('Clientes').find(x => x.id === d.id);
    if (!c) fail_('Cliente no encontrado.');
    if (read_('Facturas').some(f => f.cliente === c.id && f.estado !== 'Anulada')) fail_('Tiene facturas: por ley no se puede borrar. Puedes desactivarlo en «Datos».');
    if (read_('Servicios').some(s => s.cliente === c.id)) { c.activo = false; update_('Clientes', c); return { desactivado: true }; }
    const sh = sheet_('Clientes'); sh.deleteRow(findRow_(sh, c.id)); bump_('Clientes');
    read_('Cuentas').filter(a => a.cliente === c.id).forEach(a => { a.cliente = ''; update_('Cuentas', a); });
    read_('Contactos').filter(x => x.cliente === c.id).forEach(x => { x.cliente = ''; update_('Contactos', x); });
    return { borrado: true };
  });
}

/* ------------------------------------------------------------------ */
/* Presupuestos abiertos: se cierran solos cuando ya hay servicio o    */
/* factura posterior del mismo cliente                                  */
/* ------------------------------------------------------------------ */

function quotesAuto_() {
  const qs = read_('Presupuestos').filter(p => p.estado === 'Enviado');
  if (!qs.length) return;
  const cs = read_('Contactos'), fs = read_('Facturas'), sv = read_('Servicios');
  const cerrar = qs.filter(p => {
    const cid = p.cliente || ((cs.find(c => c.id === p.contacto) || {}).cliente) || '';
    if (!cid) return false;
    const d = dd_(p.fecha);
    return fs.some(f => f.cliente === cid && f.estado !== 'Anulada' && dd_(f.fecha) >= d) || sv.some(s => s.cliente === cid && day_(s.creado) >= d);
  });
  if (!cerrar.length) return;
  locked_(() => { read_('Presupuestos').filter(p => cerrar.some(x => x.id === p.id) && p.estado === 'Enviado').forEach(p => { p.estado = 'Aceptado'; update_('Presupuestos', p); }); });
}
