/* Efecto Mariposa · Área de clientes (presupuesto en 1 minuto, Mi solicitud, cuenta) */
(function () {
'use strict';
const CFG = window.EM_CONFIG || {};
const APP = document.getElementById('app');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const eur = n => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
const LS = { get: (k, d) => { try { const v = localStorage.getItem('emc:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('emc:' + k, JSON.stringify(v)); } catch (e) {} }, del: k => { try { localStorage.removeItem('emc:' + k); } catch (e) {} } };
const device = LS.get('device') || (() => { const d = 'c' + Math.random().toString(36).slice(2) + Date.now().toString(36); LS.set('device', d); return d; })();
const S = { token: LS.get('token', ''), cuenta: LS.get('cuenta', null), q: LS.get('q', null), me: null };
const LOGO = 'icons/logo-header.png';

async function api(action, data) {
  if (!CFG.API_URL) throw Error('La app aún no está conectada.');
  const r = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, data: data || {}, token: S.token }), redirect: 'follow' });
  const j = await r.json();
  if (!j.ok) { if (j.auth) { logout(true); } throw Error(j.auth ? 'Tu sesión ha caducado. Entra de nuevo.' : j.error); }
  return j.data;
}
function toast(m, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }
function setSession(r) { S.preview = false; S.token = r.token; S.cuenta = r.cuenta; LS.set('token', r.token); LS.set('cuenta', r.cuenta); }
function logout(silent) { S.me = null; S.token = ''; S.cuenta = null; LS.del('token'); LS.del('cuenta'); if (!silent) go(''); }
function go(h) { if (location.hash === '#' + h || (!h && !location.hash)) route(); else location.hash = h; }
function top(title, sub, back) { return '<div class="top">' + (back != null ? '<a class="ib" href="#' + back + '" aria-label="Volver">‹</a>' : '<img src="' + LOGO + '" alt="Efecto Mariposa">') + '<div class="tt"><small>' + esc(sub || '') + '</small><b>' + esc(title) + '</b></div>' + (S.token && back == null ? '<a class="ib" href="#area" aria-label="Mi área">👤</a>' : '') + '</div>'; }
function busy(btn, on, txt) { if (!btn) return; if (on) { btn._t = btn.innerHTML; btn.disabled = true; btn.innerHTML = txt || 'Un momento…'; } else { btn.disabled = false; btn.innerHTML = btn._t; } }
const fday = d => d ? d.split('-').reverse().join('/') : '';
const tomorrow = () => { const d = new Date(Date.now() + 864e5); return d.toISOString().slice(0, 10); };

/* ---------------- Tarifas (mismas que el servidor) ---------------- */
const RATES = [[149,199,349,49,89],[159,219,379,59,109],[179,249,429,69,129],[169,229,399,69,129],[189,269,449,89,159],[189,269,449,89,159],[209,289,479,99,179],[219,309,509,109,189]];
const NAMES = ['Mini camper','Camper mediana','Gran camper','Caravana pequeña','Caravana grande','Autocaravana perfilada','Autocaravana capuchina','Autocaravana integral'];
const CARS = [['Turismo pequeño',[42.35,72.60,90.75,121.00]],['Turismo mediano',[54.45,90.75,108.90,145.20]],['Turismo grande / SUV',[66.55,108.90,133.10,175.45]]];
const CSRV = [['Interior básico','Aspirado, salpicadero, plásticos interiores y cristales'],['Interior + exterior básico','Lo anterior y lavado exterior a presión con secado'],['Interior intensivo','Interior a fondo con detalle: movemos y abatimos asientos (sin desmontarlos)'],['Intensivo + exterior básico','Interior intensivo y lavado exterior']];
const CEXT = [['tap','Tapicería completa',96.80],['mal','Maletero profundo',24.20],['pel','Eliminación de pelos',30.25]];
const MIN_BIEN = 150;
const BONOS = { Escapadas: 7, Temporadas: 10, 'Siempre a punto': 12 };
const BCOMPO = { estandar: { Escapadas: [[1, 2]], Temporadas: [[1, 4]], 'Siempre a punto': [[1, 2], [0, 4]] }, intensiva: { Escapadas: [[2, 2]], Temporadas: [[2, 2], [1, 2]], 'Siempre a punto': [[2, 2], [0, 4]] } };
const BSRV = ['Mantenimiento', 'Limpieza estándar', 'Limpieza intensiva'];
const BQ = { v: 5, a: 0, base: 'estandar', bono: 'Temporadas' };
function bonoCalc(v, a, base, bono) {
  const r = RATES[v]; let bruto = 0;
  const comp = BCOMPO[base][bono].map(c => { const u = Math.round(r[c[0]] * (c[0] ? 1 + a / 100 : 1) * 100) / 100; bruto += u * c[1]; return { n: c[1], srv: BSRV[c[0]] }; });
  bruto = Math.round(bruto * 100) / 100;
  return { comp: comp, visitas: comp.reduce((t, c) => t + c.n, 0), bruto: bruto, pct: BONOS[bono], total: Math.round(bruto * (1 - BONOS[bono] / 100) * 100) / 100 };
}
const XT = [['oz', 'Ozono', 'Elimina olores (tabaco, humedad, mascotas) y desinfecta. Ya va incluido en la intensiva.', 49], ['pl', 'Recuperación e hidratación de plásticos', 'Devuelve el color a los plásticos exteriores castigados por el sol.', 59], ['fr', 'Frigorífico con exceso de suciedad', 'Solo si hay grasa acumulada, el congelador huele mal o la nevera se puede desmontar (caravanas). La limpieza normal ya va incluida.', 24.20]];
const XTP = { oz: 49, pl: 59, fr: 24.20, 49: 49, 59: 59, 39: 24.20 };
const OTHER = ['Furgoneta','Cabeza tractora','Camión','Autobús'];

function habitual() { return !!(S.token && S.cuenta && S.cuenta.bienvenida === false); }
function defQ() { return { tipo: 'auto', v: 5, a: 0, st: 0, s: 1, ex: 0, seat: 0, bed: 0, xt: [], w: 2, rec: false, sm: false, cv: 1, cs: 1, seats: 0, cx: [] }; }
function calc(q) {
  let t = 0;
  if (q.tipo === 'coche') {
    t = CARS[q.cv][1][q.cs] + (q.cx.indexOf('tap') >= 0 ? 0 : q.seats * 24.20) + CEXT.reduce((s, x) => s + (q.cx.indexOf(x[0]) >= 0 ? x[2] : 0), 0);
  } else {
    const r = RATES[q.v], inten = q.s === 2;
    t = r[q.s] * (q.s ? 1 + q.a / 100 : 1) + (q.ex ? r[q.ex + 2] : 0) + (inten ? 0 : q.seat) + q.bed + q.xt.reduce((s, k) => s + (inten && (k === 'oz' || k === 49) ? 0 : XTP[k] || 0), 0);
    if (q.w === 1) t *= 1.1;
  }
  t = Math.round(t * 100) / 100;
  const acc = !!S.token, bien = (!acc || (S.cuenta && S.cuenta.bienvenida)) && t >= MIN_BIEN;
  const pct = acc && bien ? 10 : q.sm ? 5 : 0;          // sin cuenta, el 10 % solo se enseña como ventaja
  return { bruto: t, pct: pct, desc: Math.round(t * pct) / 100, bien: bien, conCuenta: !acc && bien ? Math.round(t * 90) / 100 : 0 };
}
function selOf(q) {
  if (q.tipo === 'coche') return { tipo: 'coche', v: q.cv, s: q.cs, seats: q.cx.indexOf('tap') >= 0 ? 0 : q.seats, ex: q.cx.slice(), w: q.w, rec: q.w === 2 && q.rec, sm: q.sm };
  return { tipo: 'auto', v: q.v, a: q.a, st: q.st, s: q.s, ex: q.ex, seat: q.s === 2 ? 0 : q.seat, bed: q.bed, xt: q.xt.map(k => ({ 49: 'oz', 59: 'pl', 39: 'fr' }[k] || k)).filter(k => !(q.s === 2 && k === 'oz')), w: q.w, rec: q.w === 2 && q.rec, sm: q.sm };
}

/* ---------------- Inicio ---------------- */
function viewHome() {
  APP.innerHTML = '<div class="hero"><div class="lg"><img src="' + LOGO + '" alt="Efecto Mariposa"></div><h1>Tu área de cliente</h1><p>Presupuesto al momento, seguimiento de tu vehículo y tus documentos siempre a mano.</p></div>' +
    '<div class="pad lift">' +
    '<div class="card"><h2 style="font-size:17px;color:var(--navy)">¿Qué necesita tu vehículo?</h2><p class="small muted" style="margin:3px 0 12px">Elige y te damos el precio en 1 minuto, sin crear cuenta.</p>' +
    '<div class="chips">' + ['Autocaravana', 'Camper', 'Caravana', 'Coche'].concat(OTHER).map(n => '<button class="chip" data-v="' + esc(n) + '">' + esc(n) + '</button>').join('') + '</div>' +
    '<div id="other" hidden style="margin-top:12px"></div></div>' +
    (S.token ? '<a class="btn navy" href="#area">Ir a mi área</a>' : '<div class="grid2"><a class="btn ghost" href="#entrar">Entrar</a><a class="btn ghost" href="#registro">Crear cuenta</a></div><p class="note">Crea tu cuenta y llévate un <b>10 % en tu primer servicio</b> (desde 150 €).</p>') +
    '<a class="note info" style="text-decoration:none;display:block" href="./"><b>¿Empresa o flota?</b> Entra con tu PIN en el portal de empresas ›</a>' +
    '</div>';
  $$('[data-v]').forEach(b => b.onclick = () => {
    const n = b.dataset.v;
    if (OTHER.indexOf(n) >= 0) {
      const o = $('#other'); o.hidden = false;
      o.innerHTML = '<p class="note info">Para <b>' + esc(n) + '</b> preparamos un precio a medida. Déjanos tus datos y te llamamos.</p><a class="btn navy" style="margin-top:8px" href="#info=' + encodeURIComponent(n) + '">Solicitar información</a>';
      return;
    }
    const q = defQ();
    if (n === 'Coche') q.tipo = 'coche'; else q.v = n === 'Camper' ? 1 : n === 'Caravana' ? 3 : 5;
    S.q = q; LS.set('q', q); go('presupuesto');
  });
}

/* ---------------- Presupuesto en 1 minuto ---------------- */
function viewQuote() {
  const q = S.q || (S.q = defQ());
  const save = () => { LS.set('q', q); draw(); };
  function draw() {
    const auto = q.tipo !== 'coche', C = calc(q);
    let h = '<div class="seg"><button data-tipo="auto" class="' + (auto ? 'on' : '') + '">Autocaravana · camper · caravana</button><button data-tipo="coche" class="' + (!auto ? 'on' : '') + '">Coche</button></div>';
    const chip = (k, val, label, price, on, dis) => '<button class="chip' + (on ? ' on' : '') + '" data-k="' + k + '" data-val="' + esc(JSON.stringify(val)) + '"' + (dis ? ' disabled' : '') + '>' + esc(label) + (price ? '<i>' + esc(price) + '</i>' : '') + '</button>';
    const xopt = (val, title, sub, price, on, dis) => '<button class="opt chk' + (on ? ' on' : '') + '" data-k="xt" data-val="' + esc(JSON.stringify(val)) + '"' + (dis ? ' disabled' : '') + '><span class="dot">' + (on ? '✓' : '') + '</span><span class="t"><b>' + esc(title) + '</b><span>' + esc(sub) + '</span></span><span class="p">' + esc(price) + '</span></button>';
    const opt = (k, val, title, sub, price, on, dis) => '<button class="opt' + (on ? ' on' : '') + '" data-k="' + k + '" data-val="' + esc(JSON.stringify(val)) + '"' + (dis ? ' disabled' : '') + '><span class="dot"></span><span class="t"><b>' + esc(title) + '</b><span>' + esc(sub) + '</span></span><span class="p">' + esc(price || '') + '</span></button>';
    if (auto) {
      const r = RATES[q.v], inten = q.s === 2;
      h += '<div class="h">Tu vehículo</div><div class="chips">' + NAMES.map((n, i) => chip('v', i, n, '', q.v === i)).join('') + '</div>';
      h += '<div class="h">Antigüedad</div><div class="chips">' + [[0, 'Hasta 5 años'], [10, 'De 5 a 10'], [25, 'Más de 10']].map(x => chip('a', x[0], x[1], '', q.a === x[0])).join('') + '</div>';
      h += '<div class="h">¿Cómo está por dentro?<small>Sé sincero: lo comprobamos con tus fotos y así no hay sorpresas.</small></div><div class="chips">' + ['Habitual', 'Suciedad acumulada', 'Recuperación'].map((n, i) => chip('st', i, n, '', q.st === i)).join('') + '</div>';
      h += '<div class="h">Limpieza interior</div>' + opt('s', 0, 'Mantenimiento', habitual() ? 'Para mantenerla al día entre limpiezas' : 'Para clientes habituales, tras tu primera limpieza', eur(r[0]), q.s === 0, !habitual() || q.st !== 0) +
        opt('s', 1, 'Estándar', 'Salón, cocina, baño, dormitorio, suelos y cristales por dentro. Limpieza normal del frigorífico incluida.', eur(r[1] * (1 + q.a / 100)), q.s === 1) +
        opt('s', 2, 'Intensiva', 'Todo lo de la estándar más a fondo: tapicerías, ozono y desmontaje de asientos cuando es posible y seguro (en caravanas, lo que se puede mover).', eur(r[2] * (1 + q.a / 100)), q.s === 2);
      h += '<div class="h">Exterior</div>' + opt('ex', 0, 'Sin exterior', 'Solo interior', '', q.ex === 0) +
        opt('ex', 1, 'Exterior básico', 'Lavado a presión de carrocería, cristales y llantas, y buen secado de todo el vehículo, techo incluido.', eur(r[3]), q.ex === 1) +
        opt('ex', 2, 'Exterior intensivo', 'Lo del básico con más detalle: exceso de mosquitos del frontal, chorretones negros, juntas, marcos y bordes de ventanas y puertas, y techo con placas solares, con cuidado de siliconas y cierres. Siempre limpieza, no reparación.', eur(r[4]), q.ex === 2);
      h += '<div class="h">Tapicerías' + (inten ? '<small>Incluidas en la intensiva</small>' : '') + '</div>' + (inten ? '' : '<div class="chips">' + [[0, 'Ninguna'], [39, 'Un asiento'], [69, 'Asientos de cabina'], [129, 'Cuatro plazas']].map(x => chip('seat', x[0], x[1], x[0] ? eur(x[0]) : '', q.seat === x[0])).join('') + '</div>');
      h += '<div class="h">Colchones</div><div class="chips">' + [[0, 'Ninguno'], [69, 'Individual'], [99, 'Doble']].map(x => chip('bed', x[0], x[1], x[0] ? eur(x[0]) : '', q.bed === x[0])).join('') + '</div>';
      h += '<div class="h">Extras<small>Solo si los necesitas. Cada uno te dice cuándo tiene sentido.</small></div>' +
        XT.map(x => { const inc = inten && x[0] === 'oz', on = q.xt.indexOf(x[0]) >= 0 || inc; return xopt(x[0], x[1], x[0] === 'pl' && q.a === 25 ? x[2] + ' Tu vehículo tiene más de 10 años: lo valoramos con tus fotos y, si no se puede recuperar, no te lo cobramos.' : x[2], inc ? 'Incluido' : eur(x[3]), on, inc); }).join('');
    } else {
      const car = CARS[q.cv], tap = q.cx.indexOf('tap') >= 0;
      h += '<div class="h">Tamaño del coche</div><div class="chips">' + CARS.map((c, i) => chip('cv', i, c[0], '', q.cv === i)).join('') + '</div>';
      h += '<div class="h">Servicio</div>' + CSRV.map((x, i) => opt('cs', i, x[0], x[1], eur(car[1][i]), q.cs === i)).join('');
      h += '<div class="h">Asientos textiles<small>' + (tap ? 'Incluidos en la tapicería completa' : '24,20 € por asiento') + '</small></div>' + (tap ? '' : '<div class="chips">' + [0, 1, 2, 3, 4, 5].map(n => chip('seats', n, n ? n + (n > 1 ? ' asientos' : ' asiento') : 'Ninguno', '', q.seats === n)).join('') + '</div>');
      h += '<div class="h">Extras</div><div class="chips">' + CEXT.map(x => chip('cx', x[0], (q.cx.indexOf(x[0]) >= 0 ? '✓ ' : '+ ') + x[1], eur(x[2]), q.cx.indexOf(x[0]) >= 0)).join('') + '</div>';
    }
    h += '<div class="h">¿Dónde lo hacemos?</div>' +
      opt('w', 2, 'En nuestra base · San Martín de la Vega', q.rec ? 'Te lo recogemos (a 10-15 min: Valdemoro, Pinto, Ciempozuelos…). Vuelves tú a por él.' : 'Nos lo traes tú, o pide que te lo recojamos.', q.w === 2 && q.rec ? 'Recogida gratis' : '', q.w === 2) +
      (q.w === 2 ? '<div class="chips">' + chip('rec', false, 'Lo llevo yo', '', !q.rec) + chip('rec', true, 'Recogedlo vosotros', '', q.rec) + '</div>' : '') +
      opt('w', 0, 'Recinto de Alcalá de Henares', 'Nos vemos en el recinto el día acordado', '', q.w === 0) +
      opt('w', 1, 'A domicilio', 'Casa, parcela o nave. Si no hay agua o luz, llevamos generador y depósito (puede llevar suplemento).', auto ? '+10 %' : 'Sin recargo', q.w === 1) +
      '<div class="chips" style="margin-top:4px">' + chip('sm', !q.sm, (q.sm ? '✓ ' : '+ ') + 'Mi vehículo está en San Martín de la Vega', '', q.sm) + '</div>' +
      '<p class="note warn" style="margin-top:8px">¿Varias limpiezas al año? Con un <b>bono</b> ahorras hasta un 12 % (Escapadas, Temporadas, Siempre a punto). Pregúntanos al enviar.</p>';
    const dtxt = C.conCuenta ? 'Con tu cuenta (−10 % en el 1.er servicio)' : C.pct === 10 ? 'Bienvenida: −10 % en tu primer servicio' : C.pct === 5 ? 'Vehículos en San Martín de la Vega −5 %' : 'Desde 150 €: −10 % al crear tu cuenta';
    const damt = C.conCuenta ? eur(C.conCuenta) : C.pct ? '−' + eur(C.desc) : '';
    APP.innerHTML = top('Tu presupuesto en 1 minuto', 'Paso 1 de 3 · sin cuenta', '') + '<div class="pad">' + h + '</div>' +
      '<div class="bar"><div class="in2"><div class="dsc' + (C.pct || C.conCuenta ? ' on' : '') + '"><span>' + esc(dtxt) + '</span><b>' + damt + '</b></div><div class="row"><div class="tot"><small>Total IVA incluido</small><b>' + eur(C.bruto - C.desc) + '</b></div><a class="btn" href="#datos">Continuar</a></div><div class="small muted" style="font-size:10.5px;margin-top:3px">Lo revisamos con tus fotos y te llamamos si algo no cuadra.</div></div></div>';
    $$('[data-tipo]').forEach(b => b.onclick = () => { q.tipo = b.dataset.tipo; save(); });
    $$('[data-k]').forEach(b => b.onclick = () => {
      const k = b.dataset.k, val = JSON.parse(b.dataset.val);
      if (k === 'xt' || k === 'cx') { const a = q[k], i = a.indexOf(val); if (i >= 0) a.splice(i, 1); else a.push(val); if (k === 'cx' && val === 'tap') q.seats = 0; }
      else if (k === 'st') { q.st = val; if (val && q.s === 0) q.s = 1; }
      else if (k === 'w') { q.w = val; if (val !== 2) q.rec = false; }
      else q[k] = val;
      const y = window.scrollY; save(); window.scrollTo(0, y);
    });
  }
  draw();
}

/* ---------------- Datos de contacto ---------------- */
function viewData() {
  const q = S.q; if (!q) return go('');
  const C = calc(q), a = S.cuenta || {}, d = LS.get('datos', {});
  APP.innerHTML = top('Tus datos', 'Paso 2 de 3', 'presupuesto') + '<div class="pad">' +
    '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><span class="small muted">Tu presupuesto</span><b style="font-size:18px;color:var(--navy)">' + eur(C.bruto - C.desc) + '</b></div>' + (C.pct ? '<div class="small" style="color:var(--green);text-align:right">Incluye −' + C.pct + ' %</div>' : '') + (C.conCuenta ? '<div class="small" style="color:var(--green);text-align:right">Con tu cuenta: ' + eur(C.conCuenta) + ' (te la ofrecemos al enviar)</div>' : '') + '</div>' +
    '<div class="card" style="display:flex;flex-direction:column;gap:10px">' +
    '<label class="f">Nombre y apellidos<input class="in" id="nombre" autocomplete="name" value="' + esc(a.nombre || d.nombre || '') + '"></label>' +
    '<label class="f">Teléfono<input class="in" id="tel" type="tel" autocomplete="tel" value="' + esc(a.telefono || d.telefono || '') + '"></label>' +
    '<label class="f">Correo · ahí te llega tu enlace<input class="in" id="email" type="email" autocomplete="email" value="' + esc(a.email || d.email || '') + '"' + (a.email ? ' readonly' : '') + '></label>' +
    '<label class="f">Municipio<input class="in" id="muni" value="' + esc(d.municipio || '') + '" placeholder="San Martín de la Vega"></label>' +
    '<label class="f">Marca y modelo (opcional)<input class="in" id="modelo" placeholder="Adria Coral 670"></label>' +
    '<label class="f">¿Tienes un vale regalo? (opcional)<div style="display:flex;gap:8px;margin-top:5px"><input class="in" id="vale" placeholder="VR2026001" style="margin:0;text-transform:uppercase" value="' + esc(LS.get('vale', '')) + '"><button type="button" class="btn sm ghost" id="valeb">Comprobar</button></div></label><div id="valei" class="small" style="color:var(--green)"></div>' +
    '<label class="f">¿Algo que debamos saber?<textarea class="in" id="notas" placeholder="Manchas, olor a humedad, pelo de perro…"></textarea></label>' +
    '<label class="ck"><input type="checkbox" id="priv"> <span>He leído y acepto la política de privacidad. Usamos tus datos solo para gestionar tu presupuesto y tus servicios.</span></label>' +
    (S.token ? '' : '<label class="ck"><input type="checkbox" id="ofer"> <span>Quiero recibir ofertas exclusivas para clientes por correo.</span></label>') +
    '</div>' +
    '<div class="card"><details><summary>Cómo dejarlo preparado el día del servicio</summary><ul class="prep">' + (q.tipo === 'coche' ? ['Maletero y guantera vacíos', 'Sillitas de niño retiradas', 'Objetos de valor fuera', 'Llaves disponibles a la hora acordada'] : ['Depósitos de aguas grises y negras vaciados', 'Ropa, comida y objetos personales fuera', 'Nevera vacía y desconectada', '1,5 m libres alrededor y toldo recogido']).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul><p class="note" style="margin-top:6px">¿Sin agua ni luz? No pasa nada: llevamos generador y depósito propios. Según el servicio puede llevar un pequeño suplemento; te lo confirmamos antes.</p></details></div>' +
    '</div><div class="bar"><div class="in2"><button class="btn" id="send">Enviar y añadir fotos</button></div></div>';
  $('#valeb').onclick = async () => { const c = $('#vale').value.trim(); if (!c) return; try { const r = await api('pVale', { codigo: c, email: $('#email').value.trim(), device: device }); $('#valei').style.color = 'var(--green)'; $('#valei').textContent = '✓ Vale ' + r.codigo + ' · saldo ' + eur(r.saldo) + ' · válido hasta el ' + fday(r.caduca) + '. Se descuenta del total.'; } catch (e) { $('#valei').style.color = 'var(--bad)'; $('#valei').textContent = e.message; } };
  $('#send').onclick = async () => {
    const v = id => $('#' + id) ? $('#' + id).value.trim() : '';
    const body = { nombre: v('nombre'), telefono: v('tel'), email: v('email'), municipio: v('muni'), modelo: v('modelo'), notas: v('notas'), privacidad: $('#priv').checked, ofertas: !!($('#ofer') && $('#ofer').checked), sel: selOf(q), device: device, vale: v('vale').toUpperCase() };
    LS.set('vale', '');
    if (!body.privacidad) return toast('Marca la casilla de privacidad para continuar.', true);
    LS.set('datos', { nombre: body.nombre, telefono: body.telefono, email: body.email, municipio: body.municipio });
    const b = $('#send'); busy(b, true, 'Enviando…');
    try {
      const r = await api('pRequest', body);
      LS.set('ultima', r.t); LS.del('q'); S.q = null;
      go('fotos=' + r.t);
    } catch (e) { busy(b, false); toast(e.message, true); }
  };
}

/* ---------------- Fotos ---------------- */
const SLOTS = { auto: [['Exterior', 'De frente o lateral'], ['Salón', 'Asientos y suelo'], ['Cocina', 'Encimera y fogones'], ['Baño', 'Plato y sanitario'], ['Dormitorio', 'Colchones'], ['Manchas', 'Lo que más te preocupa']], coche: [['Interior delantero', 'Asientos y salpicadero'], ['Interior trasero', 'Asientos y alfombrillas'], ['Maletero', 'Abierto'], ['Exterior', 'Un lateral completo']] };
function compress(file, max, q) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}
function pick(cb) { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => i.files[0] && cb(i.files[0]); i.click(); }
async function upload(t, slot, file) {
  const data = await compress(file, 1600, 0.8), thumb = await compress(file, 360, 0.7);
  await api('pPhoto', { t: t, slot: slot, data: data, thumb: thumb, photoId: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) });
  return thumb;
}
async function viewPhotos(t) {
  APP.innerHTML = top('Fotos de tu vehículo', 'Paso 3 de 3', null) + '<div class="spin"></div>';
  let s; try { s = await api('pView', { t: t }); } catch (e) { return viewError(e.message); }
  const kind = /^Coche|Turismo/.test(s.resumen) ? 'coche' : 'auto', F = SLOTS[kind], got = {};
  (s.fotos || []).forEach(f => { got[f.slot] = got[f.slot] || 'old'; });
  function draw() {
    const n = F.filter(x => got[x[0]]).length;
    APP.innerHTML = top('Fotos de tu vehículo', 'Paso 3 de 3 · ' + s.numero, null) + '<div class="pad">' +
      '<p class="small" style="color:#33515c">Ninguna es obligatoria, pero con fotos el presupuesto sale exacto y no hay sorpresas. Pulsa cada hueco.</p>' +
      '<div class="grid2">' + F.map(x => { const g = got[x[0]]; return '<button class="slot' + (g ? ' done' : '') + '" data-slot="' + esc(x[0]) + '">' + (g && g !== 'old' && g !== 'up' ? '<img src="' + g + '" alt="">' : '') + (g === 'up' ? '<b>Subiendo…</b>' : '<b>' + esc(x[0]) + '</b><span>' + (g ? 'Foto añadida' : esc(x[1])) + '</span>') + (g && g !== 'up' ? '<span class="ok">✓</span>' : '') + '</button>'; }).join('') + '</div>' +
      '<button class="btn ghost" id="more">+ Otra foto</button></div>' +
      '<div class="bar"><div class="in2"><a class="btn" href="#s=' + esc(t) + '">' + (n ? 'Listo, ver mi solicitud' : 'Seguir sin fotos') + '</a></div></div>';
    $$('[data-slot]').forEach(b => b.onclick = () => pick(async f => { const k = b.dataset.slot; got[k] = 'up'; draw(); try { got[k] = await upload(t, k, f); } catch (e) { delete got[k]; toast(e.message, true); } draw(); }));
    $('#more').onclick = () => pick(async f => { toast('Subiendo foto…'); try { await upload(t, 'Otra', f); toast('Foto añadida'); } catch (e) { toast(e.message, true); } });
  }
  draw();
}

/* ---------------- Mi solicitud ---------------- */
const STEPS = [['Recibida', 'Revisamos tus fotos y lo que has marcado'], ['Presupuesto revisado', 'Lo aceptas con un toque y propones día'], ['Aceptada', 'Te confirmamos el día'], ['Programada', 'Te esperamos el día acordado'], ['Hecha', '¡Gracias por confiar en nosotros!']];
async function viewSol(t) {
  APP.innerHTML = top('Mi solicitud', 'Cargando…', S.token ? 'area' : '') + '<div class="spin"></div>';
  let s; try { s = await api('pView', { t: t }); } catch (e) { return viewError(e.message); }
  LS.set('ultima', t);
  const idx = STEPS.findIndex(x => x[0] === s.estado), closed = ['Rechazada', 'Cancelada'].indexOf(s.estado) >= 0;
  const chipCls = s.estado === 'Hecha' || s.estado === 'Programada' ? 'ok' : closed ? 'bad' : '';
  const lines = s.lineas.map(l => '<div><span>' + esc(l.c) + '</span><b>' + (l.imp ? eur(l.imp) : 'Gratis') + '</b></div>').join('') +
    (s.descuento ? '<div class="d"><span>' + esc(s.descuento.n) + ' (−' + s.descuento.pct + ' %)</span><b>−' + eur(s.descuento.imp) + '</b></div>' : '') +
    '<div class="small muted" style="border:0"><span>Base + IVA 21 %</span><span>' + eur(s.total / 1.21) + ' + ' + eur(s.total - s.total / 1.21) + '</span></div>' +
    '<div class="tt"><span>Total</span><b>' + eur(s.total) + '</b></div>' +
    (s.vale && s.vale.imp ? '<div class="d" style="border:0;margin-top:6px"><span>🎁 Vale regalo ' + esc(s.vale.codigo) + '</span><b>−' + eur(s.vale.imp) + '</b></div><div style="border:0"><span><b>A pagar</b></span><b style="font-size:17px">' + eur(s.pagar) + '</b></div>' : '');
  let h = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b style="color:var(--navy)">' + esc(s.resumen) + '</b><div class="small muted">' + esc(s.vehiculo) + ' · ' + esc(s.lugar) + '</div></div><span class="st ' + chipCls + '">' + esc(s.estado) + '</span></div>' +
    (closed ? '' : '<div class="steps" style="margin-top:10px">' + STEPS.map((x, i) => '<div class="s ' + (i < idx || s.estado === 'Hecha' ? 'done' : i === idx ? 'now' : '') + '"><span class="k">' + (i < idx || s.estado === 'Hecha' ? '✓' : i + 1) + '</span><div><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div></div>').join('') + '</div>') + '</div>';
  h += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="color:var(--navy)">' + (s.revisado ? 'Presupuesto revisado' : 'Presupuesto calculado') + '</b><span class="small muted">' + esc(s.numero) + '</span></div><div class="lines">' + lines + '</div>' +
    '<p class="small muted" style="margin-top:8px">' + (s.revisado ? 'Revisado por Enrique. El descuento no se acumula con otras ofertas.' : 'Pendiente de revisión: lo confirmamos al ver tus fotos.') + '</p></div>';
  if (!s.cuenta && s.bienvenida > 0 && !closed) h += '<div class="promo"><div class="badge">−10 %</div><h3>Crea tu cuenta y ahorra ' + eur(s.bienvenida) + '</h3><p>Ya tenemos tus datos: solo elige una contraseña. −10 % en tu primer servicio desde 150 €. No acumulable con otras ofertas.</p><input class="in" id="pw" type="password" autocomplete="new-password" placeholder="Contraseña (mín. 8 caracteres)"><label class="ck" style="color:#c9d6dc;margin-top:8px"><input type="checkbox" id="of"> <span>Quiero ofertas exclusivas por correo</span></label><button class="btn" id="reg" style="margin-top:8px">Crear mi cuenta</button></div>';
  if (s.estado === 'Presupuesto revisado') h += '<div class="card"><b style="color:var(--navy)">¿Te parece bien? Acéptalo y propón día</b><div class="grid2" style="margin-top:8px"><label class="f">Día<input class="in" type="date" id="dia" min="' + tomorrow() + '"></label><label class="f">Franja<select class="in" id="fr"><option>Mañana</option><option>Tarde</option><option>Me da igual</option></select></label></div><button class="btn" id="acc" style="margin-top:10px">Aceptar presupuesto</button></div>';
  if (s.estado === 'Aceptada') h += '<p class="note">Has propuesto el <b>' + fday(s.propuesto) + '</b>. Te confirmamos el día muy pronto.</p>';
  if (s.estado === 'Programada') h += '<p class="note"><b>Servicio confirmado: ' + fday(s.dia) + '.</b> El día antes te recordamos cómo dejarlo preparado.</p>';
  h += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><b style="color:var(--navy)">Tus fotos</b>' + (closed || s.estado === 'Hecha' ? '' : '<a class="btn sm ghost" href="#fotos=' + esc(t) + '">+ Añadir</a>') + '</div>' +
    (s.fotos.length ? '<div class="grid2" style="margin-top:8px">' + s.fotos.map(f => '<div class="slot done" data-ph="' + esc(f.id) + '"><b>' + esc(f.slot) + '</b></div>').join('') + '</div>' : '<p class="small muted" style="margin-top:6px">Aún no has enviado fotos.</p>') + '</div>';
  h += '<div class="card"><b style="color:var(--navy)">Escríbenos</b><div class="chat" id="chat" style="margin-top:8px">' + (s.chat.length ? s.chat.map(m => '<div class="msg ' + (m.de === 'cliente' ? 'c' : m.de === 'sistema' ? 's' : 'e') + '">' + esc(m.texto) + '<small>' + (m.de === 'enrique' ? 'Enrique · ' : '') + new Date(m.at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</small></div>').join('') : '<p class="small muted">¿Alguna duda? Escríbenos aquí y te respondemos.</p>') + '</div>' +
    (closed ? '' : '<div style="display:flex;gap:8px;margin-top:8px"><input class="in" id="txt" placeholder="Escribe un mensaje" style="margin:0"><button class="btn sm" id="snd">Enviar</button></div>') + '</div>';
  h += '<p class="small muted center">¿Prefieres hablar? Llámanos al <a href="tel:614065526">614 065 526</a></p>';
  APP.innerHTML = top('Mi solicitud ' + s.numero, 'Hola, ' + s.nombre.split(' ')[0], S.token ? 'area' : '') + '<div class="pad">' + h + '</div>';
  const ch = $('#chat'); if (ch) ch.scrollTop = ch.scrollHeight;
  $$('[data-ph]').forEach(async el => { try { const r = await api('pPhotoGet', { t: t, id: el.dataset.ph }); if (r.data) { const i = document.createElement('img'); i.src = r.data; el.appendChild(i); } } catch (e) {} });
  if ($('#reg')) $('#reg').onclick = async () => { const b = $('#reg'); busy(b, true); try { setSession(await api('pRegister', { t: t, password: $('#pw').value, ofertas: $('#of').checked, device: device })); toast('¡Cuenta creada! Descuento aplicado.'); viewSol(t); } catch (e) { busy(b, false); toast(e.message, true); } };
  if ($('#acc')) $('#acc').onclick = async () => { const dia = $('#dia').value; if (!dia) return toast('Elige un día.', true); const b = $('#acc'); busy(b, true); try { await api('pAccept', { t: t, dia: dia, franja: $('#fr').value }); toast('¡Aceptado! Te confirmamos el día.'); viewSol(t); } catch (e) { busy(b, false); toast(e.message, true); } };
  if ($('#snd')) { const send = async () => { const v = $('#txt').value.trim(); if (!v) return; const b = $('#snd'); busy(b, true, '…'); try { await api('pMsg', { t: t, texto: v }); viewSol(t); } catch (e) { busy(b, false); toast(e.message, true); } }; $('#snd').onclick = send; $('#txt').onkeydown = e => { if (e.key === 'Enter') send(); }; }
}

/* ---------------- Solicitar información (furgonetas, camiones…) ---------------- */
function viewInfo(tipo) {
  APP.innerHTML = top('Solicitar información', tipo, '') + '<div class="pad"><div class="card" style="display:flex;flex-direction:column;gap:10px"><p class="small" style="color:#33515c">Para <b>' + esc(tipo) + '</b> preparamos un precio a medida. Déjanos tus datos y te llamamos.</p>' +
    '<label class="f">Nombre o empresa<input class="in" id="n"></label><label class="f">Teléfono<input class="in" id="t" type="tel"></label><label class="f">Correo<input class="in" id="e" type="email"></label><label class="f">¿Cuántos vehículos y qué necesitas?<textarea class="in" id="x"></textarea></label>' +
    '<label class="ck"><input type="checkbox" id="p"> <span>Acepto la política de privacidad.</span></label><button class="btn navy" id="go">Enviar</button></div></div>';
  $('#go').onclick = async () => {
    if (!$('#p').checked) return toast('Marca la casilla de privacidad.', true);
    const b = $('#go'); busy(b, true);
    try { const r = await api('pRequest', { nombre: $('#n').value, telefono: $('#t').value, email: $('#e').value, privacidad: true, device: device, notas: $('#x').value, info: tipo }); go('s=' + r.t); }
    catch (e) { busy(b, false); toast(e.message, true); }
  };
}

/* ---------------- Cuenta ---------------- */
function viewLogin(mode) {
  const reg = mode === 'registro', fg = mode === 'olvido';
  APP.innerHTML = '<div class="hero" style="padding-bottom:48px"><div class="lg"><img src="' + LOGO + '" alt="Efecto Mariposa"></div><h1>' + (reg ? 'Crea tu cuenta' : fg ? 'Entrar sin contraseña' : 'Entra en tu área') + '</h1></div><div class="pad lift"><div class="card" style="display:flex;flex-direction:column;gap:10px">' +
    (reg ? '<label class="f">Nombre y apellidos<input class="in" id="nombre" autocomplete="name"></label><label class="f">Teléfono<input class="in" id="tel" type="tel"></label>' : '') +
    '<label class="f">Correo<input class="in" id="email" type="email" autocomplete="email"></label>' +
    (fg ? '' : '<label class="f">Contraseña<input class="in" id="pw" type="password" autocomplete="' + (reg ? 'new-password' : 'current-password') + '"></label>') +
    (reg ? '<label class="ck"><input type="checkbox" id="priv"> <span>Acepto la política de privacidad.</span></label><label class="ck"><input type="checkbox" id="ofer"> <span>Quiero recibir ofertas exclusivas por correo.</span></label><p class="note"><b>−10 % en tu primer servicio</b> desde 150 €.</p>' : '') +
    '<button class="btn" id="go">' + (reg ? 'Crear mi cuenta' : fg ? 'Enviarme el enlace' : 'Entrar') + '</button>' +
    (reg || fg ? '<a class="small center" href="#entrar">Ya tengo cuenta</a>' : '<a class="small center" href="#olvido">He olvidado la contraseña</a><a class="small center" href="#registro">Crear cuenta</a>') +
    '</div><a class="small center" href="#">‹ Volver</a></div>';
  $('#go').onclick = async () => {
    const b = $('#go'), v = id => ($('#' + id) || {}).value || '';
    busy(b, true);
    try {
      if (fg) { await api('pForgot', { email: v('email') }); busy(b, false); toast('Si el correo tiene cuenta, te llega un enlace en un minuto.'); return; }
      if (reg && !$('#priv').checked) { busy(b, false); return toast('Acepta la política de privacidad.', true); }
      setSession(await api(reg ? 'pRegister' : 'pLogin', { email: v('email'), password: v('pw'), nombre: v('nombre'), telefono: v('tel'), ofertas: reg && $('#ofer').checked, device: device }));
      go('area');
    } catch (e) { busy(b, false); toast(e.message, true); }
  };
}
async function viewMagic(m) {
  APP.innerHTML = '<div class="spin"></div>';
  try { setSession(await api('pMagic', { m: m })); history.replaceState(null, '', location.pathname + '#area'); toast('Has entrado. Puedes poner una contraseña nueva en «Mi cuenta».'); route(); }
  catch (e) { viewError(e.message); }
}
async function viewArea(tab, cached) {
  if (!S.token) return go('entrar');
  tab = tab || LS.get('tab', 'inicio'); if (!S.preview) LS.set('tab', tab);
  if (!S.me) APP.innerHTML = top('Mi área', 'Efecto Mariposa', null) + '<div class="spin"></div>';
  if (!(cached && S.me)) { try { S.me = await api('cMe', {}); } catch (e) { if (!S.me) return viewError(e.message); } }
  const me = S.me;
  S.cuenta = me.cuenta; LS.set('cuenta', me.cuenta);
  const chip = e => '<span class="st ' + (e === 'Hecha' || e === 'Programada' || e === 'Entregado' || e === 'Listo' ? 'ok' : /Rechaz|Cancel/.test(e) ? 'bad' : '') + '">' + esc(e) + '</span>';
  const fd = d => d ? new Date(d.length === 10 ? d + 'T12:00:00Z' : d).toLocaleDateString('es-ES') : '';
  const TABS = [['inicio', 'Inicio'], ['docs', 'Documentos'], ['monedero', 'Monedero'], ['cuenta', 'Cuenta']];
  let h = '';
  if (tab === 'inicio') {
    const act = me.servicios.filter(x => !x.cerrado);
    h = '<a class="btn" href="#nuevo">Pedir presupuesto</a>' +
      (me.cuenta.bienvenida ? '<p class="note">Tienes un <b>−10 %</b> en tu primer servicio (desde 150 €).</p>' : '') +
      me.ofertas.map(o => '<div class="promo" style="background:linear-gradient(135deg,#ac812e,#c99a3f)"><h3>' + esc(o.titulo) + (o.pct ? ' · −' + o.pct + ' %' : '') + '</h3><p style="color:#fff;opacity:.92">' + esc(o.texto) + (o.hasta ? ' Hasta el ' + fd(o.hasta) + '.' : '') + ' No acumulable.</p><a class="btn sm ghost" href="#nuevo">Reservar con la oferta</a></div>').join('') +
      (act.length ? '<div class="card"><b style="color:var(--navy)">Ahora mismo</b>' + act.map(x => '<a class="li" href="' + esc(x.link) + '"><div class="g"><b>' + esc(x.matricula + ' · ' + x.tipo) + '</b><span>' + esc(x.vehiculo) + (x.aviso ? ' · ⚠️ tienes un aviso' : '') + '</span></div>' + chip(x.etapa === 'Listo' ? 'Listo' : x.etapa) + '</a>').join('') + '<p class="small muted" style="margin-top:6px">Toca para ver el seguimiento en directo, las fotos y firmar el albarán.</p></div>' : '') +
      '<div class="card"><b style="color:var(--navy)">Mis solicitudes</b>' + (me.solicitudes.length ? me.solicitudes.map(x => '<a class="li" href="#s=' + esc(x.t) + '"><div class="g"><b>' + esc(x.resumen) + '</b><span>' + esc(x.numero) + ' · ' + fd(x.fecha) + (x.dia ? ' · día ' + fday(x.dia) : '') + (x.total ? ' · ' + eur(x.total) : '') + '</span></div>' + chip(x.estado) + '</a>').join('') : '<p class="small muted" style="margin-top:6px">Aún no tienes solicitudes.</p>') + '</div>' +
      '<div class="card"><b style="color:var(--navy)">Historial de servicios</b>' + (me.servicios.filter(x => x.cerrado).length ? me.servicios.filter(x => x.cerrado).map(x => '<' + (x.link ? 'a href="' + esc(x.link) + '"' : 'div') + ' class="li"><div class="g"><b>' + esc(fd(x.cerrado) + ' · ' + x.tipo) + '</b><span>' + esc(x.matricula + ' · ' + x.vehiculo) + (x.albaran ? ' · albarán ' + x.albaran : '') + (x.link ? ' · fotos hasta el ' + fd(x.fotosHasta) : '') + '</span></div>' + chip('Entregado') + '</' + (x.link ? 'a' : 'div') + '>').join('') : '<p class="small muted" style="margin-top:6px">Aquí verás cada servicio con sus fotos (30 días) y su albarán.</p>') + '</div>';
  } else if (tab === 'docs') {
    const alb = me.servicios.filter(x => x.albaran);
    h = '<div class="card"><b style="color:var(--navy)">Facturas</b>' + (me.facturas.length ? me.facturas.map(f => '<div class="li" data-file="factura" data-id="' + esc(f.id) + '"><div class="g"><b>Factura ' + esc(f.numero) + '</b><span>' + fd(f.fecha) + ' · ' + eur(f.total) + '</span></div>' + '<span class="st ' + (/Pagad|Cobrad/.test(f.estado) ? 'ok' : '') + '">' + esc(f.estado) + '</span>' + '<span class="ib" style="width:34px;height:34px">⬇</span></div>').join('') : '<p class="small muted" style="margin-top:6px">Aún no tienes facturas.</p>') + '</div>' +
      '<div class="card"><b style="color:var(--navy)">Albaranes de entrega</b>' + (alb.length ? alb.map(x => '<div class="li" data-file="albaran" data-id="' + esc(x.id) + '"><div class="g"><b>Albarán ' + esc(x.albaran) + '</b><span>' + fd(x.cerrado) + ' · ' + esc(x.matricula) + '</span></div><span class="ib" style="width:34px;height:34px">⬇</span></div>').join('') : '<p class="small muted" style="margin-top:6px">Aquí tendrás el albarán firmado de cada servicio.</p>') + '</div>' +
      '<p class="small muted center">Las fotos de cada servicio se guardan 30 días. El servicio, el albarán y la factura quedan siempre aquí.</p>';
  } else if (tab === 'monedero') {
    const bonos = me.monedero.filter(m => m.tipo === 'bono'), gifts = me.monedero.filter(m => m.tipo === 'regalo');
    const pi = me.pago;
    const bonoCard = m => {
      const pend = m.estado === 'Pendiente de pago', off = m.estado === 'Gastado' || m.estado === 'Caducado' || m.estado === 'Anulado';
      const pctPag = m.total ? Math.min(100, Math.round(m.pagado / m.total * 100)) : 0;
      return '<div class="wcard bono' + (off ? ' off' : '') + '"><div class="wtop"><span>BONO ' + esc(m.ref || '') + '</span><span class="wst">' + esc(m.estado) + '</span></div>' +
        '<div class="wname">' + esc(m.nombre) + ' · ' + m.visitas + ' visitas</div><div class="wsub">' + esc([m.comp && m.comp.vehiculo, m.matricula].filter(Boolean).join(' · ')) + (m.caduca ? ' · hasta el ' + fd(m.caduca) : '') + '</div>' +
        '<div class="wvis">' + Array.from({ length: m.visitas }, (_, i) => '<span class="' + (i < m.usadas ? 'on' : '') + '">' + (i < m.usadas ? '✓' : i + 1) + '</span>').join('') + '</div>' +
        (m.comp ? '<div class="wsub">' + m.comp.comp.map(c => c.n + ' × ' + c.srv.toLowerCase()).join(' + ') + '</div>' : '') +
        (m.total ? '<div class="wbar"><i style="width:' + pctPag + '%"></i></div><div class="wsub">Pagado ' + eur(m.pagado) + ' de ' + eur(m.total) + (!pend && m.pagado < m.total ? ' · ' + eur(m.porVisita) + ' en cada visita' : '') + '</div>' : '') +
        (pend && pi ? '<div class="wpay"><b>Para activarlo, paga ' + eur(m.total / 2) + '</b><br>Bizum: <b>' + esc(pi.bizum) + '</b>' + (pi.iban ? '<br>Transferencia: <b>' + esc(pi.iban) + '</b><br>' + esc(pi.titular) : '') + '<br>Concepto: <b>' + esc(m.ref) + '</b><button class="btn sm" data-paid="' + esc(m.id) + '" style="margin-top:8px;width:100%">Ya lo he pagado</button></div>' : '') + '</div>';
    };
    h = bonos.map(bonoCard).join('') +
      gifts.map(m => '<div class="wcard gift' + (m.estado === 'Usado' || m.estado === 'Caducado' ? ' off' : '') + '"><div class="wtop"><span>🎁 VALE REGALO</span><span class="wst">' + esc(m.estado === 'Asignado' ? 'Tuyo' : m.estado) + '</span></div><div class="wamt">' + eur(m.saldo) + '</div><div class="wcode">' + esc(m.codigo) + '</div><div class="wsub">' + (m.de ? 'De ' + esc(m.de) + ' · ' : '') + 'de ' + eur(m.inicial) + (m.caduca ? ' · válido hasta el ' + fd(m.caduca) : '') + '</div>' + (m.estado === 'Usado' ? '<div class="stamp">USADO</div>' : '') + '</div>').join('') +
      '<div class="card"><b style="color:var(--navy)">¿Tienes un vale regalo?</b><p class="small muted" style="margin-top:2px">Guárdalo aquí para no perderlo. Se descuenta del total cuando pidas tu servicio.</p><div style="display:flex;gap:8px;margin-top:8px"><input class="in" id="gc" placeholder="VR2026001" style="margin:0;text-transform:uppercase"><button class="btn sm" id="gcb">Añadir</button></div></div>' +
      '<div class="card" id="bcalc"><b style="color:var(--navy);font-size:16px">Calcula tu bono</b><p class="small muted" style="margin:3px 0 8px">Varias limpiezas al año para tu vehículo, con descuento. Pagas el 50 % para activarlo y el resto poco a poco en cada visita.</p>' +
      '<label class="f">Tu vehículo<select class="in" id="bv">' + NAMES.map((n, i) => '<option value="' + i + '"' + (i === BQ.v ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
      '<div class="h">Antigüedad</div><div class="seg" id="ba">' + [[0, 'Hasta 5 años'], [10, '5 a 10'], [25, 'Más de 10']].map(x => '<button data-ba="' + x[0] + '" class="' + (BQ.a === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
      '<div class="h">Tipo de limpieza</div><div class="seg">' + [['estandar', 'Estándar'], ['intensiva', 'Intensiva']].map(x => '<button data-bb="' + x[0] + '" class="' + (BQ.base === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
      '<div class="h">Bono</div>' + Object.keys(BONOS).map(k => { const c = bonoCalc(BQ.v, BQ.a, BQ.base, k); return '<button class="opt' + (BQ.bono === k ? ' on' : '') + '" data-bk="' + esc(k) + '"><span class="dot"></span><span class="t"><b>' + esc(k) + ' · ' + c.visitas + ' visitas · −' + c.pct + ' %</b><span>' + esc(c.comp.map(x => x.n + ' × ' + x.srv.toLowerCase()).join(' + ')) + '</span></span><span class="p">' + eur(c.total) + '</span></button>'; }).join('') +
      (() => { const c = bonoCalc(BQ.v, BQ.a, BQ.base, BQ.bono); return '<div class="lines" style="margin-top:8px"><div><span>Precio sin bono</span><b style="text-decoration:line-through;color:var(--muted)">' + eur(c.bruto) + '</b></div><div class="d"><span>Te ahorras (−' + c.pct + ' %)</span><b>' + eur(c.bruto - c.total) + '</b></div><div class="tt"><span>Tu bono</span><b>' + eur(c.total) + '</b></div><div style="border:0"><span>Para activarlo (50 %)</span><b>' + eur(c.total / 2) + '</b></div></div>'; })() +
      '<label class="f" style="margin-top:8px">Matrícula del vehículo<input class="in" id="bm" placeholder="1234 ABC" style="text-transform:uppercase"></label>' +
      '<details style="margin-top:8px"><summary>Condiciones del bono</summary><ul class="prep"><li>Va unido a <b>un vehículo</b> (su matrícula) y a ti. No se puede usar en otro vehículo ni pasar a otra persona.</li><li>Pagas el <b>50 % para activarlo</b> y el resto repartido en cada visita.</li><li>Es válido <b>12 meses</b> desde que se activa. Si al final te queda alguna visita, escríbenos y buscamos una solución. <b>No se devuelve el dinero.</b></li><li>El precio es para el vehículo en <b>estado habitual</b>. Si en la primera visita necesita una limpieza de recuperación, te avisamos del suplemento antes de empezar.</li><li>No se suma al −10 % de bienvenida ni a otras ofertas: el bono ya tiene su descuento.</li></ul></details>' +
      '<label class="ck" style="margin-top:8px"><input type="checkbox" id="bok"> <span>He leído y acepto las condiciones del bono.</span></label>' +
      '<button class="btn" id="bgo" style="margin-top:10px">Lo quiero</button></div>';
  } else {
    h = '<div class="card" style="display:flex;flex-direction:column;gap:10px"><b style="color:var(--navy)">Mis datos</b>' +
      '<label class="f">Nombre y apellidos<input class="in" id="dn" value="' + esc(me.cuenta.nombre) + '"></label>' +
      '<label class="f">Teléfono<input class="in" id="dt" type="tel" value="' + esc(me.cuenta.telefono || '') + '"></label>' +
      '<label class="f">Correo (con él entras)<input class="in" id="de" type="email" value="' + esc(me.cuenta.email) + '"></label>' +
      '<button class="btn sm" id="dsv">Guardar mis datos</button><p class="small muted" style="margin-top:-4px">Se actualizan también en nuestra ficha, para avisarte siempre donde toca.</p></div>' +
      '<div class="card" style="display:flex;flex-direction:column;gap:10px"><b style="color:var(--navy)">Preferencias</b>' +
      '<label class="ck"><input type="checkbox" id="of"' + (me.cuenta.ofertas ? ' checked' : '') + '> <span>Recibir ofertas exclusivas por correo</span></label>' +
      '<details><summary>Cambiar contraseña</summary><label class="f" style="margin-top:8px">Actual<input class="in" type="password" id="pa"></label><label class="f" style="margin-top:8px">Nueva<input class="in" type="password" id="pn" autocomplete="new-password"></label><button class="btn sm" id="pwb" style="margin-top:8px">Guardar</button></details>' +
      '<button class="btn ghost" id="out">Cerrar sesión</button></div><p class="small muted center">¿Dudas? Llámanos al <a href="tel:614065526">614 065 526</a></p>';
  }
  APP.innerHTML = top('Hola, ' + me.cuenta.nombre.split(' ')[0], S.preview ? 'Vista de dirección · solo lectura' : 'Mi área', null) + '<div class="pad">' + (S.preview ? '<p class="note warn">👁️ Estás viendo el área tal como la ve este cliente. No se puede cambiar nada.</p>' : '') + '<div class="seg">' + TABS.map(t => '<button data-tab="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>' + h + '</div>';
  $$('[data-tab]').forEach(b => b.onclick = () => viewArea(b.dataset.tab));
  $$('[data-file]').forEach(el => el.onclick = async () => { toast('Preparando el PDF…'); try { const x = await api('cFile', { kind: el.dataset.file, id: el.dataset.id }); const a = document.createElement('a'); a.href = x.data; a.download = x.name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { toast(e.message, true); } });
  const redraw = () => { const y = window.scrollY; viewArea('monedero', true).then(() => window.scrollTo(0, y)); };
  if ($('#bv')) $('#bv').onchange = e => { BQ.v = Number(e.target.value); redraw(); };
  $$('[data-ba]').forEach(b => b.onclick = () => { BQ.a = Number(b.dataset.ba); redraw(); });
  $$('[data-bb]').forEach(b => b.onclick = () => { BQ.base = b.dataset.bb; redraw(); });
  $$('[data-bk]').forEach(b => b.onclick = () => { BQ.bono = b.dataset.bk; redraw(); });
  if ($('#bgo')) $('#bgo').onclick = async () => { const b = $('#bgo'); if (!$('#bok').checked) return toast('Acepta las condiciones del bono.', true); busy(b, true); try { await api('cBonoPedir', { v: BQ.v, a: BQ.a, base: BQ.base, bono: BQ.bono, matricula: $('#bm').value, acepto: true }); toast('¡Bono reservado! Te hemos enviado los datos de pago.'); S.me = null; window.scrollTo(0, 0); viewArea('monedero'); } catch (e) { busy(b, false); toast(e.message, true); } };
  $$('[data-paid]').forEach(b => b.onclick = async () => { busy(b, true); try { await api('cBonoAviso', { id: b.dataset.paid, como: 'Bizum/transferencia' }); toast('¡Gracias! Lo comprobamos y te avisamos al activarlo.'); busy(b, false); b.textContent = 'Aviso enviado ✓'; b.disabled = true; } catch (e) { busy(b, false); toast(e.message, true); } });
  if ($('#gcb')) $('#gcb').onclick = async () => { try { await api('cCanjear', { codigo: $('#gc').value }); toast('¡Vale añadido!'); viewArea('monedero'); } catch (e) { toast(e.message, true); } };
  if ($('#of')) $('#of').onchange = async e => { try { await api('cSave', { ofertas: e.target.checked }); toast('Guardado'); } catch (x) { toast(x.message, true); } };
  if ($('#dsv')) $('#dsv').onclick = async () => { try { const r = await api('cSave', { nombre: $('#dn').value.trim(), telefono: $('#dt').value.trim(), email: $('#de').value.trim() }); S.cuenta = r.cuenta; LS.set('cuenta', r.cuenta); toast('Datos guardados'); S.me = null; viewArea('cuenta'); } catch (x) { toast(x.message, true); } };
  if ($('#pwb')) $('#pwb').onclick = async () => { try { await api('cSave', { actual: $('#pa').value, password: $('#pn').value }); toast('Contraseña cambiada'); } catch (x) { toast(x.message, true); } };
  if ($('#out')) $('#out').onclick = () => { S.me = null; logout(); };
}
function viewError(m) { APP.innerHTML = top('Efecto Mariposa', '', '') + '<div class="pad"><div class="card center"><p style="color:var(--bad)">' + esc(m) + '</p><a class="btn ghost" style="margin-top:12px" href="#">Ir al inicio</a></div></div>'; }

function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  window.scrollTo(0, 0);
  if (h.indexOf('s=') === 0) return viewSol(h.slice(2));
  if (h.indexOf('fotos=') === 0) return viewPhotos(h.slice(6));
  if (h.indexOf('m=') === 0) return viewMagic(h.slice(2));
  if (h.indexOf('ver=') === 0) { S.preview = true; S.token = h.slice(4); S.me = null; history.replaceState(null, '', location.pathname + '#area'); return viewArea('inicio'); }
  if (h.indexOf('info=') === 0) return viewInfo(h.slice(5));
  if (h === 'presupuesto') return viewQuote();
  if (h === 'nuevo') { S.q = S.q || defQ(); return go('presupuesto'); }
  if (h === 'datos') return viewData();
  if (h === 'entrar' || h === 'registro' || h === 'olvido') return viewLogin(h);
  if (h === 'area') return viewArea();
  return S.token ? viewArea() : viewHome();
}
window.addEventListener('hashchange', route);
route();
})();
