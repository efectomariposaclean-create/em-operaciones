/**
 * Efecto Mariposa · Operaciones — CRM y administración (solo dirección)
 * Prospectos, clientes, presupuestos, facturas, contabilidad y agenda (Google Calendar).
 * Este archivo NO contiene datos de la empresa: los datos iniciales van en DatosCrm.gs (privado).
 */

const FASES = ['Nuevo', 'Contactado', 'Presupuesto enviado', 'Negociando', 'Ganado', 'Perdido', 'Archivado'];
const CAT_CONT = ['Combustible', 'Vehículo', 'Seguros', 'Seguridad Social', 'Productos', 'Material', 'Maquinaria', 'Herramientas', 'Software', 'Publicidad', 'Alquiler', 'Personal', 'Gestoría', 'Peajes y parking', 'Otros'];
const TIPO_CONT = ['Gasto', 'Impuesto', 'Excluido'];
const CANALES = ['Llamada', 'WhatsApp', 'Correo', 'Visita', 'Reunión', 'Nota'];

const CRM_ACTIONS = {
  crmSync: crmSync_,
  contactSave: contactSave_,
  contactNote: contactNote_,
  contactConvert: contactConvert_,
  clientCrm: clientCrm_,
  invoiceDraft: invoiceDraft_,
  invoiceSave: invoiceSave_,
  invoicePay: invoicePay_,
  docFile: docFile_,
  quoteSave: quoteSave_,
  quoteState: quoteState_,
  accSave: accSave_,
  agendaList: agendaList_,
  agendaSave: agendaSave_,
  agendaDelete: agendaDelete_,
  crmSettings: crmSettings_,
  profileSave: profileSave_
};

/* ------------------------------------------------------------------ */
/* Puesta en marcha (ejecutar una vez desde el editor)                 */
/* ------------------------------------------------------------------ */

/** Autoriza Calendar, carga los datos del CRM antiguo y programa la entrada automática de solicitudes de la web. */
function activarCrm() {
  _ver = null; _ss = null;
  if (props_().getProperty('SCHEMA_V') !== SCHEMA_V) migrate_();
  const cal = CalendarApp.getDefaultCalendar();
  console.log('Calendario conectado: ' + cal.getName());
  if (!props_().getProperty('CRM_SEEDED')) seedCrm_();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'importarSolicitudes').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('importarSolicitudes').timeBased().everyHours(1).create();
  importarSolicitudes();
  console.log('CRM activado. Prospectos: ' + read_('Contactos').length + ' · Facturas: ' + read_('Facturas').length + ' · Movimientos contables: ' + read_('Contabilidad').length);
}

function crmMigrate_() {
  // Lleva a contabilidad los gastos del almacén registrados antes de esta versión.
  const done = {};
  read_('Contabilidad').forEach(c => { if (c.ref) done[c.ref] = 1; });
  const movs = read_('Movimientos').filter(m => m.importe && (m.tipo === 'gasto' || m.tipo === 'entrada') && !done[m.id]);
  if (movs.length) insertMany_('Contabilidad', movs.map(m => accFromMov_(m)));
  if (!props_().getProperty('CRM_SEEDED') && typeof SEED_CRM !== 'undefined' && sheet_('Facturas').getLastRow() < 2) seedCrm_();
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function money_(n) { return Math.round((Number(String(n == null ? '' : n).replace(',', '.')) || 0) * 100) / 100; }
function eur_(n) {
  const v = money_(n), neg = v < 0, p = Math.abs(v).toFixed(2).split('.');
  return (neg ? '-' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1] + ' €';
}
function dayOk_(x) { return /^\d{4}-\d{2}-\d{2}$/.test(String(x || '')) ? String(x) : ''; }
function jprop_(k, def) { try { return JSON.parse(props_().getProperty(k) || '') || def; } catch (e) { return def; } }
function emisor_() { return jprop_('EMISOR', { nombre: 'Efecto Mariposa Clean & Care', titular: '', nif: '', direccion: '', telefono: '', email: '', web: '', iban: '', pago: 'Transferencia bancaria', condiciones: '' }); }
function objetivos_() { return jprop_('OBJETIVOS', { anual: 0, mensual: 0, servicios: 0, clientes: 0 }); }
function note_(u, texto, canal) { return { at: iso_(), by: u ? u.nombre : 'Sistema', canal: CANALES.indexOf(canal) >= 0 ? canal : 'Nota', texto: clean_(texto, 1500) }; }
function rootClientes_() { return DriveApp.getFolderById(props_().getProperty('CLIENTES')); }
function prospectFolder_(c) {
  if (c.carpeta) { try { return DriveApp.getFolderById(c.carpeta); } catch (e) {} }
  const f = folderNamed_(folderNamed_(rootClientes_(), 'Prospectos'), clean_(c.nombre, 80) || c.id);
  c.carpeta = f.getId();
  return f;
}
function facturasFolder_() {
  const id = props_().getProperty('FACTURAS');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = folderNamed_(DriveApp.getFolderById(props_().getProperty('ROOT')), 'Facturas');
  props_().setProperty('FACTURAS', f.getId());
  return f;
}
function saveDoc_(folder, name, blob, oldId) {
  if (oldId) { try { DriveApp.getFileById(oldId).setTrashed(true); } catch (e) {} }
  const old = folder.getFilesByName(name);
  while (old.hasNext()) old.next().setTrashed(true);
  return folder.createFile(blob.setName(name));
}

/* ------------------------------------------------------------------ */
/* Documentos con marca de agua (facturas, presupuestos, albaranes)    */
/* ------------------------------------------------------------------ */

/**
 * o: { tipo, numero, fecha, meta:[[k,v]], para:{nombre,nif,direccion,contacto}, cols:[...], filas:[[...]], totales:[[k,v,fuerte]],
 *      bloques:[html], pie, color }
 */
function docHtml_(o) {
  const e = emisor_();
  const logo = dataUri_(APP.logoDriveId), wm = dataUri_(APP.marcaAguaDriveId) || logo;
  const navy = '#102d48', gold = '#ac812e';
  const para = o.para || {};
  const css = '@page{size:A4;margin:0}body{margin:0;font-family:Helvetica,Arial,sans-serif;color:#1d3340;font-size:10px}' +
    '.pg{position:relative;padding:34px 38px 30px;min-height:1050px}' +
    '.wm{position:absolute;left:50%;top:46%;width:430px;margin-left:-215px;margin-top:-215px;opacity:.06}' +
    '.top{width:100%;border-collapse:collapse}.top td{vertical-align:top;padding:0}.logo{height:62px}' +
    '.em{text-align:right;font-size:9px;line-height:1.55;color:#4d6470}.em b{font-size:11px;color:' + navy + ';letter-spacing:.3px}' +
    '.bar{height:3px;background:' + gold + ';margin:14px 0 16px;border-radius:2px}' +
    '.hd{width:100%;border-collapse:collapse;margin-bottom:16px}.hd td{vertical-align:top;padding:0}' +
    '.tt{font-size:22px;font-weight:bold;color:' + navy + ';letter-spacing:1px}.no{font-size:11px;color:' + gold + ';font-weight:bold;margin-top:2px}' +
    '.mt{margin-top:8px;font-size:9.5px;line-height:1.6;color:#4d6470}.mt b{color:' + navy + '}' +
    '.to{border:1px solid #dfe7ea;border-left:3px solid ' + gold + ';border-radius:4px;padding:9px 12px;font-size:9.5px;line-height:1.55;width:250px}' +
    '.to small{display:block;color:' + gold + ';font-weight:bold;letter-spacing:1px;font-size:8px;margin-bottom:2px}.to b{font-size:11px;color:' + navy + '}' +
    'table.l{width:100%;border-collapse:collapse;margin-top:4px}table.l th{background:' + navy + ';color:#fff;text-align:left;padding:7px 8px;font-size:8.5px;letter-spacing:.4px;text-transform:uppercase}' +
    'table.l td{padding:7px 8px;border-bottom:1px solid #e6edef;vertical-align:top;font-size:9.5px}table.l tr:nth-child(even) td{background:#f7fafa}.r{text-align:right;white-space:nowrap}.m{color:#6b8089;font-size:8.5px}' +
    '.tot{width:260px;margin:14px 0 0 auto;border-collapse:collapse}.tot td{padding:5px 8px;font-size:10px}.tot tr.b td{background:' + navy + ';color:#fff;font-size:12px;font-weight:bold}' +
    '.bx{margin-top:16px;border:1px solid #dfe7ea;border-radius:4px;padding:10px 12px;font-size:9.5px;line-height:1.6}.bx b{color:' + navy + '}' +
    '.ok{border-color:#b9d9c7;background:#f1f9f4}.wa{border-color:#ecd9a8;background:#fdf9ee}.sig{height:34px;margin-top:3px}.csig{height:50px;margin-top:6px}' +
    '.ft{position:absolute;left:38px;right:38px;bottom:22px;border-top:1px solid #e6edef;padding-top:7px;font-size:8px;color:#7d9099;text-align:center}';
  const meta = (o.meta || []).filter(x => x[1]).map(x => '<b>' + esc_(x[0]) + ':</b> ' + esc_(x[1])).join('<br>');
  const head = '<table class="top"><tr><td>' + (logo ? '<img class="logo" src="' + logo + '">' : '<b style="font-size:16px;color:' + navy + '">Efecto Mariposa</b>') + '</td>' +
    '<td class="em"><b>' + esc_(e.nombre || 'Efecto Mariposa Clean & Care') + '</b><br>' + [e.titular && esc_(e.titular) + (e.nif ? ' · NIF ' + esc_(e.nif) : ''), esc_(e.direccion), [e.telefono && 'Tel. ' + esc_(e.telefono), esc_(e.email)].filter(Boolean).join(' · '), esc_(e.web)].filter(Boolean).join('<br>') + '</td></tr></table><div class="bar"></div>' +
    '<table class="hd"><tr><td><div class="tt">' + esc_(o.tipo) + '</div>' + (o.numero ? '<div class="no">N.º ' + esc_(o.numero) + '</div>' : '') + '<div class="mt">' + meta + '</div></td>' +
    '<td style="text-align:right"><div class="to" style="margin-left:auto;text-align:left"><small>' + esc_(o.paraTitulo || 'CLIENTE') + '</small><b>' + esc_(para.nombre || '') + '</b>' + (para.nif ? '<br>NIF/CIF ' + esc_(para.nif) : '') + (para.direccion ? '<br>' + esc_(para.direccion) : '') + (para.contacto ? '<br>' + esc_(para.contacto) : '') + '</div></td></tr></table>';
  const table = '<table class="l"><tr>' + o.cols.map((c, i) => '<th' + (o.right && o.right.indexOf(i) >= 0 ? ' class="r"' : '') + '>' + esc_(c) + '</th>').join('') + '</tr>' +
    o.filas.map(f => '<tr>' + f.map((v, i) => '<td' + (o.right && o.right.indexOf(i) >= 0 ? ' class="r"' : '') + '>' + v + '</td>').join('') + '</tr>').join('') + '</table>';
  const tot = o.totales && o.totales.length ? '<table class="tot">' + o.totales.map(t => '<tr class="' + (t[2] ? 'b' : '') + '"><td>' + esc_(t[0]) + '</td><td class="r">' + esc_(t[1]) + '</td></tr>').join('') + '</table>' : '';
  return '<html><head><meta charset="utf-8"><style>' + css + '</style></head><body><div class="pg">' + (wm ? '<img class="wm" src="' + wm + '">' : '') +
    head + table + tot + (o.bloques || []).join('') + '<div class="ft">' + esc_(o.pie || [e.nombre, e.web, e.email].filter(Boolean).join(' · ')) + '</div></div></body></html>';
}
function pdf_(html, name) { return Utilities.newBlob(html, MimeType.HTML, name + '.html').getAs(MimeType.PDF).setName(name + '.pdf'); }

/* ------------------------------------------------------------------ */
/* Sincronización del CRM                                              */
/* ------------------------------------------------------------------ */

function median_(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
function clientRhythm_(clients, services) {
  const byC = {};
  services.forEach(s => { (byC[s.cliente] = byC[s.cliente] || {})[day_(s.creado)] = 1; });
  const today = Date.parse(day_() + 'T12:00:00Z');
  const changed = [];
  const out = clients.map(c => {
    const days = Object.keys(byC[c.id] || {}).sort();
    const last = days.length ? days[days.length - 1] : '';
    if (last && (!c.ultimo || last > String(c.ultimo).slice(0, 10))) { c.ultimo = last; changed.push(c); }
    const ultimo = last > String(c.ultimo || '').slice(0, 10) ? last : String(c.ultimo || '').slice(0, 10);
    const recent = days.filter(d => Date.parse(d + 'T12:00:00Z') >= today - 120 * 864e5);
    const gaps = [];
    for (let i = 1; i < recent.length; i++) gaps.push((Date.parse(recent[i] + 'T12:00:00Z') - Date.parse(recent[i - 1] + 'T12:00:00Z')) / 864e5);
    const auto = gaps.length >= 2 ? Math.max(1, Math.round(median_(gaps))) : 0;
    const ritmo = Number(c.ritmo) > 0 ? Number(c.ritmo) : (auto || 30);
    const dias = ultimo ? Math.round((today - Date.parse(ultimo + 'T12:00:00Z')) / 864e5) : null;
    let estado = 'Sin servicios';
    if (dias != null) estado = dias > Math.max(ritmo * 2, ritmo + 7) ? 'Se enfría' : dias > Math.max(ritmo * 1.3, ritmo + 3) ? 'Preguntar' : 'Normal';
    return { id: c.id, ultimo: ultimo, ritmo: ritmo, ritmoAuto: auto, ritmoManual: Number(c.ritmo) > 0, dias: dias, estado: estado, n90: days.filter(d => Date.parse(d + 'T12:00:00Z') >= today - 90 * 864e5).length };
  });
  changed.forEach(c => { try { update_('Clientes', c); } catch (e) {} });
  return out;
}

function crmSync_(d, u) {
  admin_(u);
  const year = Number(day_().slice(0, 4));
  const from = (year - 1) + '-01-01';
  const clients = read_('Clientes');
  const services = read_('Servicios');
  const rh = clientRhythm_(clients, services);
  const info = {};
  rh.forEach(r => info[r.id] = r);
  return {
    contactos: read_('Contactos'),
    clientes: clients.map(c => Object.assign({ id: c.id, nombre: c.nombre, tipo: c.tipo, contacto: c.contacto, telefono: c.telefono, email: c.email, nif: c.nif || '', direccion: c.direccion || '', activo: c.activo !== false, crm: c.crm || {}, tarifa: c.tarifa || {} }, info[c.id] || {})),
    facturas: read_('Facturas').filter(f => String(f.fecha) >= from),
    presupuestos: read_('Presupuestos').filter(p => String(p.fecha) >= from),
    contabilidad: read_('Contabilidad').filter(m => String(m.fecha).slice(0, 10) >= from),
    objetivos: objetivos_(),
    emisor: emisor_(),
    fases: FASES, categorias: CAT_CONT, canales: CANALES, vehiculos: VEHICULOS,
    hoy: day_()
  };
}

/* ------------------------------------------------------------------ */
/* Prospectos (aún no han hecho ningún servicio)                       */
/* ------------------------------------------------------------------ */

function contactSave_(d, u) {
  admin_(u);
  return locked_(() => {
    const all = read_('Contactos');
    let c = d.id ? all.find(x => x.id === d.id) : null;
    if (d.id && !c) fail_('Prospecto no encontrado.');
    const isNew = !c;
    if (isNew) c = { id: 'p-' + uid_().slice(0, 8), notas: [], revisar: false, cliente: '', evento: '', carpeta: '', creado: iso_(), origen: 'Manual', ref: '' };
    ['nombre', 'tipo', 'contacto', 'telefono', 'email', 'vehiculo', 'ubicacion', 'prioridad', 'proxAccion', 'origen'].forEach(k => { if (d[k] !== undefined) c[k] = clean_(d[k], 200); });
    if (!clean_(c.nombre)) fail_('Indica el nombre.');
    if (d.fase !== undefined) c.fase = FASES.indexOf(d.fase) >= 0 ? d.fase : 'Nuevo';
    if (!c.fase) c.fase = 'Nuevo';
    if (d.importe !== undefined) c.importe = d.importe === '' ? '' : money_(d.importe);
    if (d.proxFecha !== undefined) c.proxFecha = dayOk_(d.proxFecha);
    if (d.revisar !== undefined) c.revisar = !!d.revisar;
    if (d.nota) c.notas = (c.notas || []).concat([note_(u, d.nota, d.canal)]);
    if (['Perdido', 'Archivado', 'Ganado'].indexOf(c.fase) >= 0) { c.proxFecha = d.proxFecha ? c.proxFecha : ''; }
    c.actualizado = iso_();
    c.evento = calFollow_(c.evento, c.proxFecha, c.proxAccion, c.nombre, c.telefono);
    if (isNew) insert_('Contactos', c); else update_('Contactos', c);
    return c;
  });
}
function contactNote_(d, u) {
  admin_(u);
  return locked_(() => {
    const c = read_('Contactos').find(x => x.id === d.id);
    if (!c) fail_('Prospecto no encontrado.');
    if (!clean_(d.texto)) fail_('Escribe la nota.');
    c.notas = (c.notas || []).concat([note_(u, d.texto, d.canal)]);
    if (c.fase === 'Nuevo' && ['Llamada', 'WhatsApp', 'Correo', 'Visita', 'Reunión'].indexOf(d.canal) >= 0) c.fase = 'Contactado';
    c.revisar = false;
    if (d.proxFecha !== undefined) { c.proxFecha = dayOk_(d.proxFecha); c.proxAccion = clean_(d.proxAccion, 200); }
    c.actualizado = iso_();
    c.evento = calFollow_(c.evento, c.proxFecha, c.proxAccion, c.nombre, c.telefono);
    update_('Contactos', c);
    return c;
  });
}
/** Convierte un prospecto en cliente (al hacer su primer servicio o al aceptar). */
function contactConvert_(d, u) {
  admin_(u);
  return locked_(() => {
    const c = read_('Contactos').find(x => x.id === d.id);
    if (!c) fail_('Prospecto no encontrado.');
    if (c.cliente) return { cliente: c.cliente };
    const clients = read_('Clientes');
    let cl = clients.find(x => norm_(x.nombre) === norm_(c.nombre));
    if (!cl) {
      const empresa = c.tipo !== 'Particular';
      cl = { id: 'c-' + uid_().slice(0, 8), nombre: c.nombre, tipo: empresa ? 'empresa' : 'particular', protocolo: 'general', tipos: TIPOS_GENERAL, contacto: c.contacto || '', telefono: c.telefono || '', email: c.email || '', revisor: '', carpeta: '', activo: true, creado: iso_(), avisos: true, nif: '', direccion: '', ritmo: '', ultimo: '', crm: { notas: (c.notas || []).concat([note_(u, 'Convertido en cliente desde prospecto.', 'Nota')]) }, tarifa: {} };
      insert_('Clientes', cl);
    }
    c.cliente = cl.id; c.fase = 'Ganado'; c.proxFecha = ''; c.actualizado = iso_();
    c.evento = calFollow_(c.evento, '', '', c.nombre, '');
    update_('Contactos', c);
    read_('Presupuestos').filter(p => p.contacto === c.id && !p.cliente).forEach(p => { p.cliente = cl.id; update_('Presupuestos', p); });
    log_(u, '', 'prospecto a cliente ' + cl.id);
    return { cliente: cl.id };
  });
}

/* ------------------------------------------------------------------ */
/* Seguimiento de clientes                                             */
/* ------------------------------------------------------------------ */

function clientCrm_(d, u) {
  admin_(u);
  return locked_(() => {
    const c = read_('Clientes').find(x => x.id === d.id);
    if (!c) fail_('Cliente no encontrado.');
    const crm = c.crm || {};
    crm.notas = crm.notas || [];
    if (d.nota) crm.notas.push(note_(u, d.nota, d.canal));
    if (d.proxFecha !== undefined) { crm.proxFecha = dayOk_(d.proxFecha); crm.proxAccion = clean_(d.proxAccion, 200); }
    if (d.nif !== undefined) c.nif = upper_(d.nif, 20);
    if (d.direccion !== undefined) c.direccion = clean_(d.direccion, 200);
    if (d.ritmo !== undefined) c.ritmo = Number(d.ritmo) > 0 ? Math.min(365, Math.round(Number(d.ritmo))) : '';
    if (d.tarifa && typeof d.tarifa === 'object') {
      const t = {};
      Object.keys(d.tarifa).slice(0, 30).forEach(k => { const v = money_(d.tarifa[k]); if (v > 0) t[clean_(k, 60)] = v; });
      c.tarifa = t;
    }
    crm.evento = calFollow_(crm.evento, crm.proxFecha, crm.proxAccion, c.nombre, c.telefono);
    c.crm = crm;
    update_('Clientes', c);
    return { ok: true };
  });
}

/* ------------------------------------------------------------------ */
/* Facturas: numeración correlativa, PDF con marca de agua y cobros    */
/* ------------------------------------------------------------------ */

function nextNumber_(list, year) {
  let max = 0;
  list.forEach(f => { const m = String(f.numero || '').match(/^(\d{4})-(\d+)$/); if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2])); });
  return year + '-' + ('00' + (max + 1)).slice(-3);
}
function lines_(raw) {
  const ls = (Array.isArray(raw) ? raw : []).slice(0, 200).map(l => ({ fecha: dayOk_(l.fecha), ref: clean_(l.ref, 60), concepto: clean_(l.concepto, 300), cantidad: Number(l.cantidad) > 0 ? Number(l.cantidad) : 1, precio: money_(l.precio), servicio: clean_(l.servicio, 60) })).filter(l => l.concepto);
  if (!ls.length) fail_('Añade al menos un concepto.');
  return ls;
}
function totals_(lineas, ivaPct, retPct) {
  const base = money_(lineas.reduce((n, l) => n + l.cantidad * l.precio, 0));
  const iva = money_(base * ivaPct / 100), ret = money_(base * retPct / 100);
  return { imponible: base, iva: iva, ret: ret, total: money_(base + iva - ret) };
}
function partyOf_(clientId, contactId) {
  if (clientId) {
    const c = read_('Clientes').find(x => x.id === clientId);
    if (!c) fail_('Cliente no encontrado.');
    return { c: c, datos: { nombre: c.nombre, nif: c.nif || '', direccion: c.direccion || '', contacto: [c.contacto, c.telefono, c.email].filter(Boolean).join(' · ') } };
  }
  const p = read_('Contactos').find(x => x.id === contactId);
  if (!p) fail_('Prospecto no encontrado.');
  return { p: p, datos: { nombre: p.nombre, nif: '', direccion: p.ubicacion || '', contacto: [p.contacto, p.telefono, p.email].filter(Boolean).join(' · ') } };
}

/** Servicios entregados de un cliente en un periodo, para rellenar la factura. */
function invoiceDraft_(d, u) {
  admin_(u);
  const c = read_('Clientes').find(x => x.id === d.cliente);
  if (!c) fail_('Cliente no encontrado.');
  const from = dayOk_(d.from), to = dayOk_(d.to);
  if (!from || !to) fail_('Indica el periodo.');
  const billed = {};
  read_('Facturas').forEach(f => (f.servicios || []).forEach(id => billed[id] = f.numero));
  const tarifa = c.tarifa || {};
  const list = read_('Servicios').filter(s => s.cliente === c.id && s.cerrado && day_(s.cerrado) >= from && day_(s.cerrado) <= to)
    .sort((a, b) => Date.parse(a.cerrado) - Date.parse(b.cerrado));
  return {
    datos: { nombre: c.nombre, nif: c.nif || '', direccion: c.direccion || '' },
    lineas: list.map(s => ({ fecha: day_(s.cerrado), ref: s.matricula || s.chasis, concepto: 'Limpieza ' + String(s.tipo || '').toLowerCase() + (s.vehiculo ? ' · ' + s.vehiculo.toLowerCase() : ''), cantidad: 1, precio: tarifa[s.tipo] || '', servicio: s.id, facturado: billed[s.id] || '' }))
  };
}
function invoicePdf_(f) {
  const e = emisor_();
  const filas = f.lineas.map(l => [l.fecha ? fmtDate_(l.fecha + 'T12:00:00Z') : '', '<b>' + esc_(l.ref || '') + '</b>', esc_(l.concepto), String(l.cantidad).replace('.', ','), eur_(l.precio), eur_(l.cantidad * l.precio)]);
  const tot = [['Base imponible', eur_(f.imponible)], ['IVA ' + f.ivaPct + ' %', eur_(f.iva)]];
  if (Number(f.retPct)) tot.push(['Retención IRPF ' + f.retPct + ' %', '-' + eur_(f.ret)]);
  tot.push(['TOTAL FACTURA', eur_(f.total), true]);
  const pago = '<div class="bx"><b>Forma de pago:</b> ' + esc_(e.pago || 'Transferencia bancaria') + (e.iban ? ' &nbsp;·&nbsp; <b>IBAN</b> ' + esc_(e.iban) : '') +
    (f.vence ? '<br><b>Vencimiento:</b> ' + fmtDate_(f.vence + 'T12:00:00Z') : '') + (e.condiciones ? '<br><b>Condiciones:</b> ' + esc_(e.condiciones) : '') +
    (Number(f.retPct) ? '' : '<br>Factura emitida sin retención de IRPF.') + (f.notas ? '<br>' + esc_(f.notas) : '') + '</div>';
  return pdf_(docHtml_({ tipo: 'FACTURA', numero: f.numero, meta: [['Fecha de emisión', fmtDate_(f.fecha + 'T12:00:00Z')]], para: f.datos, cols: ['Fecha', 'Matrícula / ref.', 'Concepto', 'Ud.', 'Precio', 'Importe'], right: [3, 4, 5], filas: filas, totales: tot, bloques: [pago] }), 'Factura ' + f.numero + ' - ' + clean_(f.datos.nombre, 60).replace(/[\\/:*?"<>|]/g, '') + ' - ' + f.fecha.split('-').reverse().join('-'));
}
function invoiceSave_(d, u) {
  admin_(u);
  const lineas = lines_(d.lineas);
  const ivaPct = d.ivaPct === '' || d.ivaPct == null ? 21 : Math.max(0, Math.min(30, Number(d.ivaPct) || 0));
  const retPct = Math.max(0, Math.min(25, Number(d.retPct) || 0));
  const fecha = dayOk_(d.fecha) || day_();
  const party = partyOf_(d.cliente, '');
  const datos = Object.assign(party.datos, d.datos && typeof d.datos === 'object' ? { nombre: clean_(d.datos.nombre, 160) || party.datos.nombre, nif: upper_(d.datos.nif, 20), direccion: clean_(d.datos.direccion, 200) } : {});
  const f = locked_(() => {
    const all = read_('Facturas');
    let f = d.id ? all.find(x => x.id === d.id) : null;
    if (d.id && !f) fail_('Factura no encontrada.');
    if (f && f.estado === 'Anulada') fail_('La factura está anulada.');
    if (!f) {
      const year = Number(fecha.slice(0, 4));
      const last = all.filter(x => String(x.numero).indexOf(year + '-') === 0).sort((a, b) => String(b.numero).localeCompare(String(a.numero)))[0];
      if (last && String(last.fecha) > fecha) fail_('La fecha no puede ser anterior a la de la última factura (' + last.numero + ', ' + fmtDate_(last.fecha + 'T12:00:00Z') + ').');
      f = { id: 'f-' + uid_().slice(0, 8), numero: nextNumber_(all, year), estado: 'Pendiente', cobros: [], archivo: '', origen: 'App', por: u.nombre, creado: iso_() };
    }
    Object.assign(f, totals_(lineas, ivaPct, retPct), { fecha: f.origen === 'App' && d.id ? f.fecha : fecha, cliente: party.c.id, datos: datos, lineas: lineas, ivaPct: ivaPct, retPct: retPct, vence: dayOk_(d.vence), notas: clean_(d.notas, 600), servicios: lineas.map(l => l.servicio).filter(Boolean) });
    if (d.id) update_('Facturas', f); else insert_('Facturas', f);
    return f;
  });
  const pdf = invoicePdf_(f);
  const file = saveDoc_(facturasFolder_(), pdf.getName(), pdf, f.archivo);
  try { if (!f.archivo) folderNamed_(clientFolder_(party.c.id), 'Facturas').createShortcut(file.getId()); } catch (e) {}
  f.archivo = file.getId();
  locked_(() => update_('Facturas', f));
  log_(u, '', (d.id ? 'editar' : 'emitir') + ' factura ' + f.numero);
  return f;
}
function invoicePay_(d, u) {
  admin_(u);
  return locked_(() => {
    const f = read_('Facturas').find(x => x.id === d.id);
    if (!f) fail_('Factura no encontrada.');
    if (d.anular) { f.estado = 'Anulada'; f.notas = clean_((f.notas ? f.notas + ' · ' : '') + 'Anulada: ' + clean_(d.motivo, 200), 600); }
    else if (d.deshacer) { f.cobros = []; f.estado = 'Pendiente'; }
    else {
      const imp = money_(d.importe) || money_(f.total - (f.cobros || []).reduce((n, c) => n + money_(c.importe), 0));
      if (!(imp > 0)) fail_('Indica el importe cobrado.');
      f.cobros = (f.cobros || []).concat([{ fecha: dayOk_(d.fecha) || day_(), importe: imp, metodo: clean_(d.metodo, 40) || 'Transferencia', por: u.nombre }]);
      const paid = money_(f.cobros.reduce((n, c) => n + money_(c.importe), 0));
      f.estado = paid >= money_(f.total) - 0.01 ? 'Cobrada' : 'Parcial';
    }
    update_('Facturas', f);
    return f;
  });
}
function docFile_(d, u) {
  admin_(u);
  const t = d.tipo === 'presupuesto' ? 'Presupuestos' : 'Facturas';
  const f = read_(t).find(x => x.id === d.id);
  if (!f || !f.archivo) fail_('Documento no encontrado.');
  const file = DriveApp.getFileById(f.archivo);
  return { name: file.getName(), data: Utilities.base64Encode(file.getBlob().getBytes()), url: file.getUrl() };
}

/* ------------------------------------------------------------------ */
/* Presupuestos                                                        */
/* ------------------------------------------------------------------ */

function quoteSave_(d, u) {
  admin_(u);
  const lineas = lines_(d.lineas);
  const ivaPct = d.ivaPct === '' || d.ivaPct == null ? 21 : Math.max(0, Math.min(30, Number(d.ivaPct) || 0));
  const party = partyOf_(d.cliente, d.contacto);
  const p = locked_(() => {
    const all = read_('Presupuestos');
    let p = d.id ? all.find(x => x.id === d.id) : null;
    if (d.id && !p) fail_('Presupuesto no encontrado.');
    if (!p) {
      const y = Number(day_().slice(0, 4));
      let max = 0;
      all.forEach(x => { const m = String(x.numero).match(/^P(\d{4})-(\d+)$/); if (m && Number(m[1]) === y) max = Math.max(max, Number(m[2])); });
      p = { id: 'q-' + uid_().slice(0, 8), numero: 'P' + y + '-' + ('00' + (max + 1)).slice(-3), estado: 'Enviado', archivo: '', por: u.nombre, creado: iso_() };
    }
    const t = totals_(lineas, ivaPct, 0);
    Object.assign(p, { fecha: dayOk_(d.fecha) || day_(), contacto: party.p ? party.p.id : (d.contacto || ''), cliente: party.c ? party.c.id : '', datos: party.datos, lineas: lineas, imponible: t.imponible, ivaPct: ivaPct, iva: t.iva, total: t.total, validez: Math.max(1, Number(d.validez) || 30), notas: clean_(d.notas, 1500) });
    if (d.id) update_('Presupuestos', p); else insert_('Presupuestos', p);
    return p;
  });
  const filas = p.lineas.map(l => [esc_(l.concepto) + (l.ref ? '<br><span class="m">' + esc_(l.ref) + '</span>' : ''), String(l.cantidad).replace('.', ','), eur_(l.precio), eur_(l.cantidad * l.precio), eur_(l.cantidad * l.precio * (1 + p.ivaPct / 100))]);
  const blocks = ['<div class="bx"><b>Validez:</b> ' + p.validez + ' días desde la fecha del presupuesto. El precio se confirma antes de empezar y nunca hacemos trabajos extra sin tu autorización.' + (p.notas ? '<br>' + esc_(p.notas).replace(/\n/g, '<br>') : '') + '</div>'];
  const name = 'Presupuesto ' + p.numero + ' - ' + clean_(p.datos.nombre, 60).replace(/[\\/:*?"<>|]/g, '');
  const blob = pdf_(docHtml_({ tipo: 'PRESUPUESTO', numero: p.numero, meta: [['Fecha', fmtDate_(p.fecha + 'T12:00:00Z')], ['Válido hasta', fmtDate_(new Date(Date.parse(p.fecha + 'T12:00:00Z') + p.validez * 864e5))]], para: p.datos, cols: ['Servicio', 'Ud.', 'Precio', 'Base', 'Con IVA'], right: [1, 2, 3, 4], filas: filas, totales: [['Base imponible', eur_(p.imponible)], ['IVA ' + p.ivaPct + ' %', eur_(p.iva)], ['TOTAL', eur_(p.total), true]], bloques: blocks }), name);
  const folder = party.c ? folderNamed_(clientFolder_(party.c.id), 'Presupuestos') : folderNamed_(prospectFolder_(party.p), 'Presupuestos');
  const file = saveDoc_(folder, blob.getName(), blob, p.archivo);
  p.archivo = file.getId();
  locked_(() => {
    update_('Presupuestos', p);
    if (party.p) {
      const c = read_('Contactos').find(x => x.id === party.p.id);
      c.carpeta = party.p.carpeta || c.carpeta;
      if (['Nuevo', 'Contactado'].indexOf(c.fase) >= 0) c.fase = 'Presupuesto enviado';
      c.importe = p.total;
      c.notas = (c.notas || []).concat([note_(u, 'Presupuesto ' + p.numero + ' por ' + eur_(p.total) + '.', 'Nota')]);
      c.actualizado = iso_();
      update_('Contactos', c);
    }
  });
  return p;
}
function quoteState_(d, u) {
  admin_(u);
  return locked_(() => {
    const p = read_('Presupuestos').find(x => x.id === d.id);
    if (!p) fail_('Presupuesto no encontrado.');
    if (['Enviado', 'Aceptado', 'Rechazado'].indexOf(d.estado) < 0) fail_('Estado no válido.');
    p.estado = d.estado;
    update_('Presupuestos', p);
    if (p.contacto) {
      const c = read_('Contactos').find(x => x.id === p.contacto);
      if (c && !c.cliente) { c.fase = d.estado === 'Aceptado' ? 'Negociando' : d.estado === 'Rechazado' ? 'Perdido' : c.fase; c.actualizado = iso_(); update_('Contactos', c); }
    }
    return p;
  });
}

/* ------------------------------------------------------------------ */
/* Contabilidad: gastos, impuestos y trimestres                        */
/* ------------------------------------------------------------------ */

function accFromMov_(m) {
  const total = money_(m.importe), base = money_(total / 1.21);
  const cat = { Productos: 'Productos', Material: 'Material', Maquinaria: 'Maquinaria', Combustible: 'Combustible', Herramientas: 'Herramientas', 'Vehículo': 'Vehículo' }[m.categoria] || 'Otros';
  return { id: 'g-' + uid_().slice(0, 8), fecha: String(m.fecha).slice(0, 10), tipo: 'Gasto', categoria: cat, concepto: m.concepto || 'Compra almacén', proveedor: '', imponible: base, ivaPct: 21, iva: money_(total - base), total: total, deducible: 'Pendiente', ivaDed: 100, metodo: '', justificante: '', notas: 'Registrado desde el almacén. Revisa el IVA con el ticket o la factura.', origen: 'Almacén', ref: m.id, por: 'Almacén', creado: iso_() };
}
function accMirror_(mv, u) { try { insert_('Contabilidad', accFromMov_(mv)); } catch (e) { console.error(e); } }
function accUnmirror_(movId) {
  const r = read_('Contabilidad').find(x => x.ref === movId);
  if (r) { r.tipo = 'Anulado'; update_('Contabilidad', r); }
}
function accSave_(d, u) {
  admin_(u);
  return locked_(() => {
    const all = read_('Contabilidad');
    let m = d.id ? all.find(x => x.id === d.id) : null;
    if (d.id && !m) fail_('Movimiento no encontrado.');
    if (d.borrar) { m.tipo = 'Anulado'; update_('Contabilidad', m); return m; }
    if (!m) m = { id: 'g-' + uid_().slice(0, 8), origen: 'Manual', ref: '', por: u.nombre, creado: iso_() };
    const fecha = dayOk_(d.fecha);
    const concepto = clean_(d.concepto, 200);
    if (!fecha || !concepto) fail_('Indica fecha y concepto.');
    const total = money_(d.total);
    if (!(total > 0)) fail_('Indica el importe total.');
    const ivaPct = Math.max(0, Math.min(30, Number(d.ivaPct) || 0));
    const base = d.imponible !== '' && d.imponible != null && money_(d.imponible) > 0 ? money_(d.imponible) : money_(total / (1 + ivaPct / 100));
    Object.assign(m, { fecha: fecha, tipo: TIPO_CONT.indexOf(d.tipo) >= 0 ? d.tipo : 'Gasto', categoria: clean_(d.categoria, 60) || 'Otros', concepto: concepto, proveedor: clean_(d.proveedor, 120), imponible: base, ivaPct: ivaPct, iva: money_(total - base), total: total, deducible: ['Sí', 'No', 'Pendiente'].indexOf(d.deducible) >= 0 ? d.deducible : 'Pendiente', ivaDed: [0, 50, 100].indexOf(Number(d.ivaDed)) >= 0 ? Number(d.ivaDed) : 100, metodo: clean_(d.metodo, 40), justificante: clean_(d.justificante, 300), notas: clean_(d.notas, 1500) });
    if (d.id) update_('Contabilidad', m); else insert_('Contabilidad', m);
    return m;
  });
}

/* ------------------------------------------------------------------ */
/* Agenda: Google Calendar                                             */
/* ------------------------------------------------------------------ */

function cal_() { try { return CalendarApp.getDefaultCalendar(); } catch (e) { return null; } }
function calFollow_(eventId, fecha, accion, nombre, tel) {
  const cal = cal_();
  if (!cal) return eventId || '';
  try {
    let ev = eventId ? cal.getEventById(eventId) : null;
    if (!fecha) { if (ev) ev.deleteEvent(); return ''; }
    const title = 'Seguimiento · ' + nombre + (accion ? ': ' + accion : '');
    const day = new Date(fecha + 'T12:00:00Z');
    const desc = 'Creado desde EM Operaciones.' + (tel ? '\nTeléfono: ' + tel : '');
    if (ev) { ev.setTitle(title); ev.setAllDayDate(day); ev.setDescription(desc); return ev.getId(); }
    ev = cal.createAllDayEvent(title, day, { description: desc });
    try { ev.setColor(CalendarApp.EventColor.YELLOW); } catch (e) {}
    return ev.getId();
  } catch (e) { console.error(e); return eventId || ''; }
}
function agendaList_(d, u) {
  admin_(u);
  const cal = cal_();
  if (!cal) return { ok: false, eventos: [] };
  const from = dayOk_(d.from) || day_(), to = dayOk_(d.to) || from;
  const evs = cal.getEvents(new Date(from + 'T00:00:00'), new Date(shift_(to, 1) + 'T00:00:00'));
  return { ok: true, eventos: evs.slice(0, 300).map(e => ({ id: e.getId(), titulo: e.getTitle(), inicio: e.getStartTime().toISOString(), fin: e.getEndTime().toISOString(), todoDia: e.isAllDayEvent(), lugar: e.getLocation(), notas: clean_(e.getDescription(), 600) })) };
}
function shift_(day, n) { const x = new Date(day + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
function agendaSave_(d, u) {
  admin_(u);
  const cal = cal_();
  if (!cal) fail_('Calendar no está autorizado. Ejecuta activarCrm() desde el editor.');
  const titulo = clean_(d.titulo, 200), fecha = dayOk_(d.fecha);
  if (!titulo || !fecha) fail_('Indica título y fecha.');
  let ev = d.id ? cal.getEventById(d.id) : null;
  const hm = x => /^\d{2}:\d{2}$/.test(x || '') ? x : '';
  const ini = hm(d.inicio), fin = hm(d.fin) || ini;
  const opts = { description: clean_(d.notas, 1500), location: clean_(d.lugar, 200) };
  if (ev) ev.deleteEvent();
  if (ini) {
    const a = Utilities.parseDate(fecha + ' ' + ini, APP.zona, 'yyyy-MM-dd HH:mm');
    let b = Utilities.parseDate(fecha + ' ' + fin, APP.zona, 'yyyy-MM-dd HH:mm');
    if (b <= a) b = new Date(a.getTime() + 3600e3);
    ev = cal.createEvent(titulo, a, b, opts);
  } else ev = cal.createAllDayEvent(titulo, new Date(fecha + 'T12:00:00Z'), opts);
  return { id: ev.getId() };
}
function agendaDelete_(d, u) {
  admin_(u);
  const cal = cal_();
  const ev = cal && d.id ? cal.getEventById(d.id) : null;
  if (ev) ev.deleteEvent();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Ajustes y perfil                                                    */
/* ------------------------------------------------------------------ */

function crmSettings_(d, u) {
  admin_(u);
  if (d.objetivos) {
    const o = {};
    ['anual', 'mensual', 'servicios', 'clientes'].forEach(k => o[k] = Math.max(0, Number(d.objetivos[k]) || 0));
    props_().setProperty('OBJETIVOS', JSON.stringify(o));
  }
  if (d.emisor) {
    const e = {};
    ['nombre', 'titular', 'nif', 'direccion', 'telefono', 'email', 'web', 'iban', 'pago', 'condiciones'].forEach(k => e[k] = clean_(d.emisor[k], 300));
    props_().setProperty('EMISOR', JSON.stringify(e));
  }
  return { objetivos: objetivos_(), emisor: emisor_() };
}
function profileSave_(d, u) {
  if (u.rol === 'cliente') fail_('Sin permiso.');
  return locked_(() => {
    const me = read_('Usuarios').find(x => x.id === u.id);
    const email = clean_(d.email, 120);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail_('El correo no es válido.');
    me.email = email; me.telefono = clean_(d.telefono, 40);
    update_('Usuarios', me);
    return { email: me.email, telefono: me.telefono };
  });
}

/* ------------------------------------------------------------------ */
/* Solicitudes de presupuesto de la web → prospectos (cada hora)       */
/* ------------------------------------------------------------------ */

function importarSolicitudes() {
  _ver = null; _ss = null;
  const id = props_().getProperty('SOLICITUDES');
  if (!id) return;
  let rows;
  try { rows = SpreadsheetApp.openById(id).getSheets()[0].getDataRange().getValues(); } catch (e) { console.error(e); return; }
  if (rows.length < 2) return;
  const h = rows[0].map(x => norm_(x));
  const col = k => h.findIndex(x => x.indexOf(norm_(k)) >= 0);
  const ix = { t: 0, nombre: col('NOMBRE'), tel: col('TELEFONO'), email: col('CORREO'), muni: col('MUNICIPIO'), tipo: col('TIPODEVEHICULO'), marca: col('MARCA'), modelo: col('MODELO'), largo: col('LONGITUD'), estado: col('ESTADOACTUAL'), servicio: col('QUESERVICIO'), cuando: col('CUANDO'), problema: col('PROLEMA') >= 0 ? col('PROLEMA') : col('PROBLEMA'), fotos: col('FOTOGRAFIAS'), pref: col('CONTACTEMOS') };
  const last = props_().getProperty('SOL_LAST') || '';
  const v = (r, k) => ix[k] >= 0 ? String(r[ix[k]] == null ? '' : r[ix[k]]).trim() : '';
  const isDate = x => Object.prototype.toString.call(x) === '[object Date]' && !isNaN(x);
  const nuevos = rows.slice(1).filter(r => isDate(r[0]) && r[0].toISOString() > last);
  if (!nuevos.length) return;
  locked_(() => {
    const contactos = read_('Contactos'), clients = read_('Clientes');
    let max = last;
    nuevos.forEach(r => {
      const t = r[0].toISOString();
      if (t > max) max = t;
      const ref = 'web:' + t;
      if (contactos.some(c => c.ref === ref)) return;
      const nombre = v(r, 'nombre') || 'Solicitud web';
      const tel = v(r, 'tel'), email = v(r, 'email');
      const detalle = ['Vehículo: ' + [v(r, 'tipo'), v(r, 'marca'), v(r, 'modelo'), v(r, 'largo')].filter(Boolean).join(' · '), 'Estado: ' + v(r, 'estado'), 'Servicio: ' + v(r, 'servicio'), 'Cuándo: ' + v(r, 'cuando'), v(r, 'problema') && 'Observaciones: ' + v(r, 'problema'), v(r, 'fotos') && 'Fotos: ' + v(r, 'fotos'), v(r, 'pref') && 'Prefiere: ' + v(r, 'pref')].filter(Boolean).join('\n');
      const cl = clients.find(c => (tel && norm_(c.telefono) === norm_(tel)) || (email && String(c.email || '').toLowerCase().indexOf(email.toLowerCase()) >= 0));
      if (cl) {
        cl.crm = cl.crm || {}; cl.crm.notas = (cl.crm.notas || []).concat([note_(null, 'Nueva solicitud de presupuesto desde la web.\n' + detalle, 'Nota')]);
        cl.crm.proxFecha = shift_(day_(), 1); cl.crm.proxAccion = 'Responder solicitud web';
        update_('Clientes', cl);
        return;
      }
      const c = { id: 'p-' + uid_().slice(0, 8), nombre: nombre, tipo: /\b(S\.?L|S\.?A|SLU|COOP)\b/i.test(nombre) ? 'Empresa' : 'Particular', contacto: '', telefono: tel, email: email, vehiculo: v(r, 'tipo'), ubicacion: v(r, 'muni'), fase: 'Nuevo', prioridad: 'A', proxAccion: 'Enviar presupuesto', proxFecha: shift_(day_(), 1), origen: 'Web', importe: '', notas: [note_(null, 'Solicitud recibida desde la web.\n' + detalle, 'Nota')], revisar: false, cliente: '', evento: '', carpeta: '', creado: t, actualizado: iso_(), ref: ref };
      c.evento = calFollow_('', c.proxFecha, c.proxAccion, c.nombre, c.telefono);
      insert_('Contactos', c);
      contactos.push(c);
    });
    props_().setProperty('SOL_LAST', max);
  });
}

/* ------------------------------------------------------------------ */
/* Carga inicial desde el CRM antiguo (datos en DatosCrm.gs, privado)  */
/* ------------------------------------------------------------------ */

function seedCrm_() {
  if (typeof SEED_CRM === 'undefined') { console.log('Falta el archivo DatosCrm.gs con tus datos.'); return; }
  const S0 = SEED_CRM, now = iso_(), p = props_();
  if (S0.emisor && !p.getProperty('EMISOR')) p.setProperty('EMISOR', JSON.stringify(S0.emisor));
  if (S0.objetivos && !p.getProperty('OBJETIVOS')) p.setProperty('OBJETIVOS', JSON.stringify(S0.objetivos));
  if (S0.facturasCarpeta && !p.getProperty('FACTURAS')) p.setProperty('FACTURAS', S0.facturasCarpeta);
  if (S0.solicitudes && !p.getProperty('SOLICITUDES')) { p.setProperty('SOLICITUDES', S0.solicitudes); p.setProperty('SOL_LAST', S0.solicitudesDesde || now); }
  // Clientes: se casan con los que ya existen por NIF o nombre.
  const clients = read_('Clientes'), map = {};
  S0.clientes.forEach(sc => {
    let c = clients.find(x => (sc.nif && norm_(x.nif) === norm_(sc.nif)) || norm_(x.nombre) === norm_(sc.nombre) || (norm_(sc.nombre).indexOf(norm_(x.nombre)) === 0 && norm_(x.nombre).length > 5) || (sc.alias && norm_(x.nombre) === norm_(sc.alias)));
    if (c) {
      c.nif = c.nif || sc.nif || ''; c.direccion = c.direccion || sc.direccion || '';
      c.telefono = c.telefono || sc.telefono || ''; c.email = c.email || sc.email || '';
      c.crm = c.crm || {}; if (sc.notas) c.crm.notas = (c.crm.notas || []).concat([{ at: now, by: 'CRM anterior', canal: 'Nota', texto: sc.notas }]);
      c.tarifa = (c.tarifa && Object.keys(c.tarifa).length) ? c.tarifa : (sc.tarifa || {});
      update_('Clientes', c);
    } else {
      c = { id: 'c-' + uid_().slice(0, 8), nombre: sc.nombre, tipo: sc.tipo, protocolo: 'general', tipos: TIPOS_GENERAL, contacto: sc.contacto || '', telefono: sc.telefono || '', email: sc.email || '', revisor: '', carpeta: '', activo: true, creado: now, avisos: false, nif: sc.nif || '', direccion: sc.direccion || '', ritmo: '', ultimo: '', crm: { notas: sc.notas ? [{ at: now, by: 'CRM anterior', canal: 'Nota', texto: sc.notas }] : [] }, tarifa: sc.tarifa || {} };
      insert_('Clientes', c); clients.push(c);
    }
    if (sc.seg) {
      c.crm = c.crm || {}; c.crm.notas = (c.crm.notas || []).concat(sc.seg.nota ? [{ at: now, by: 'CRM anterior', canal: 'Nota', texto: sc.seg.nota }] : []);
      c.crm.proxFecha = sc.seg.proxFecha; c.crm.proxAccion = sc.seg.proxAccion;
      if (sc.seg.proxFecha >= day_()) c.crm.evento = calFollow_('', sc.seg.proxFecha, sc.seg.proxAccion, c.nombre, c.telefono);
      update_('Clientes', c);
    }
    map[sc.ref] = c.id;
  });
  // Servicios realizados (sin precios para el cliente).
  const have = {};
  read_('Servicios').forEach(s => have[s.id] = 1);
  insertMany_('Servicios', S0.servicios.filter(s => !have['h-' + s.ref] && map[s.cliente]).map(s => {
    const at = s.fecha + 'T10:00:00.000Z';
    return { id: 'h-' + s.ref, cliente: map[s.cliente], matricula: s.matricula || '', chasis: s.matricula ? '' : (s.ref2 || 'SIN MATRÍCULA'), marca: '', modelo: '', vehiculo: s.vehiculo || '', tipo: s.tipo, estado: 'Entregado', suciedad: 'Normal', alcance: s.concepto || '', exterior: false, extras: [], grupos: [], notas: [], fases: {}, maquina: null, recibo: null, creadoPor: 'importado', creado: at, actualizado: at, cerrado: at, archivado: null, carpeta: '', version: 1, enlace: secret_().slice(0, 32), listo: at, avisos: [] };
  }));
  insertMany_('Facturas', S0.facturas.map(f => Object.assign({}, f, { id: 'f-' + f.numero, cliente: map[f.cliente] || '', servicios: (f.servicios || []).map(x => 'h-' + x), origen: 'Importada', por: 'CRM anterior', creado: now })));
  insertMany_('Contabilidad', S0.contabilidad.map((m, i) => Object.assign({ id: 'g-imp' + i, origen: 'CRM anterior', ref: '', por: 'CRM anterior', creado: now }, m)));
  insertMany_('Contactos', S0.contactos.map((c, i) => Object.assign({ id: 'p-imp' + ('00' + i).slice(-3), cliente: '', evento: '', carpeta: '', creado: c.creado || now, actualizado: now, ref: 'crm:' + i }, c)));
  insertMany_('Presupuestos', (S0.presupuestos || []).map((q, i) => Object.assign({ id: 'q-imp' + i, cliente: '', por: 'Enrique', creado: now }, q, { contacto: q.contacto ? 'p-imp' + ('00' + q.contacto).slice(-3) : '' })));
  // Seguimientos con fecha a Google Calendar.
  const cal = cal_();
  if (cal) read_('Contactos').filter(c => c.proxFecha && c.proxFecha >= day_() && !c.evento && ['Perdido', 'Archivado', 'Ganado'].indexOf(c.fase) < 0).forEach(c => { c.evento = calFollow_('', c.proxFecha, c.proxAccion, c.nombre, c.telefono); update_('Contactos', c); });
  p.setProperty('CRM_SEEDED', now);
  console.log('Datos del CRM anterior cargados.');
}
