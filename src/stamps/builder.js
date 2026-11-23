// Stamp Builder: design stamp, sheet and form families, and set My details.
// A modal window of the extension's own; the host draws everything else.
//
// A sheet is made from a blank title-block PDF: open it in the app, then
// New › Sheet from the open page. White turns see-through; drag boxes onto
// the picture where the values go.

import { nieuwId, sleutelVan, geldig, AUTO, SOORTEN, LAYOUTS, GROEPEN, groepVan, STANDAARD } from './families.js';
import { opmaak } from './render.js';
import { laadProfiel, bewaarProfiel, PROFIEL_VELDEN, inktPlaatje } from './profile.js';

const kopie = (x) => JSON.parse(JSON.stringify(x));
const MAATEN = { l: 'Large', m: 'Medium', s: 'Small' };
const PAPIER = { A4P: [595.28, 841.89], A4L: [841.89, 595.28], A3L: [1190.55, 841.89], A3P: [841.89, 1190.55], A1L: [2383.94, 1683.78] };

function maak(tag, stijl = '', tekst = '') {
  const el = document.createElement(tag);
  if (stijl) el.style.cssText = stijl;
  if (tekst) el.textContent = tekst;
  return el;
}

const KNOP = 'font:inherit;padding:4px 10px;cursor:pointer;border:1px solid var(--theme-app-menu-sidebar-border,#999);background:var(--theme-app-menu-bg,#fff);color:inherit;';
const INVOER = 'font:inherit;padding:3px 5px;border:1px solid var(--theme-app-menu-sidebar-border,#999);background:var(--theme-app-menu-bg,#fff);color:inherit;min-width:0;';
const SELECT = INVOER + 'appearance:none;-webkit-appearance:none;padding-right:16px;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 9px) 55%,calc(100% - 5px) 55%;background-size:4px 4px;background-repeat:no-repeat;';

function kiesBestand(accept) {
  return new Promise((ok) => {
    const inp = maak('input'); inp.type = 'file'; inp.accept = accept;
    inp.addEventListener('change', () => ok(inp.files[0] || null));
    inp.click();
  });
}

/**
 * @param {object[]} families current families
 * @param {object} api the host API (for "sheet from the open page")
 * @param {(families: object[], changed: object[]) => void} opslaan
 */
export function openBouwer(families, api, opslaan) {
  let lijst = kopie(families);
  const oorspronkelijk = JSON.stringify(families);
  let gekozen = lijst[0]?.id || null;   // family id, or 'profiel'
  let gekozenVeld = null;               // key of the field selected in the sheet editor
  let profiel = laadProfiel();
  let profielGewijzigd = false;

  const achter = maak('div', 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:3000;display:flex;align-items:center;justify-content:center;');
  const venster = maak('div', 'width:min(1100px,96vw);height:min(760px,92vh);display:flex;flex-direction:column;background:var(--theme-app-menu-bg,#fff);color:var(--theme-app-menu-text,#222);border:1px solid var(--theme-app-menu-sidebar-border,#888);box-shadow:0 8px 30px rgba(0,0,0,.35);font-size:12px;');
  const kop = maak('div', 'padding:10px 14px;font-size:14px;font-weight:bold;border-bottom:1px solid var(--theme-app-menu-divider,#ddd);', 'Seed43 Stamp Builder');
  const midden = maak('div', 'flex:1;display:flex;min-height:0;');
  const links = maak('div', 'width:230px;border-right:1px solid var(--theme-app-menu-divider,#ddd);display:flex;flex-direction:column;');
  const lijstEl = maak('div', 'flex:1;overflow:auto;');
  const linksKnoppen = maak('div', 'display:flex;flex-wrap:wrap;gap:4px;padding:6px;border-top:1px solid var(--theme-app-menu-divider,#ddd);');
  const rechts = maak('div', 'flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px;');
  const voet = maak('div', 'display:flex;justify-content:flex-end;gap:6px;padding:8px 12px;border-top:1px solid var(--theme-app-menu-divider,#ddd);');
  links.append(lijstEl, linksKnoppen);
  midden.append(links, rechts);
  venster.append(kop, midden, voet);
  achter.appendChild(venster);

  const fam = () => lijst.find((f) => f.id === gekozen);
  const sluit = () => achter.remove();

  function knop(tekst, actie, extra = '') {
    const b = maak('button', KNOP + extra, tekst);
    b.addEventListener('click', async (e) => { e.preventDefault(); try { await actie(); } catch (err) { alert(err.message || err); } });
    return b;
  }
  function invoer(waarde, bij, extra = '', type = 'text') {
    const i = maak('input', INVOER + extra); i.type = type; i.value = waarde ?? '';
    i.addEventListener('change', () => bij(i.value));
    return i;
  }
  function keuzelijst(opties, waarde, bij, extra = '') {
    const s = maak('select', SELECT + extra);
    for (const [k, t] of Object.entries(opties)) { const o = maak('option', '', t); o.value = k; s.appendChild(o); }
    s.value = waarde;
    s.addEventListener('change', () => bij(s.value));
    return s;
  }

  // ── left: the families, grouped ─────────────────────────────────────
  function tekenLijst() {
    lijstEl.innerHTML = '';
    const p = maak('div', `padding:8px 10px;cursor:pointer;border-left:3px solid #888;${gekozen === 'profiel' ? 'background:var(--theme-app-menu-item-hover,#eef);font-weight:bold;' : ''}`, 'My details');
    p.title = 'Your name, initials, company, CPEng number and signature, used to fill stamps';
    p.addEventListener('click', () => { gekozen = 'profiel'; tekenAlles(); });
    lijstEl.appendChild(p);
    for (const [g, titel] of Object.entries(GROEPEN)) {
      const inGroep = lijst.filter((f) => groepVan(f) === g);
      if (!inGroep.length) continue;
      lijstEl.appendChild(maak('div', 'padding:8px 10px 2px;font-weight:bold;opacity:.65;font-size:11px;', titel.toUpperCase()));
      for (const f of inGroep) {
        const r = maak('div', `padding:6px 10px;cursor:pointer;border-left:3px solid ${f.color || '#c0392b'};${f.id === gekozen ? 'background:var(--theme-app-menu-item-hover,#eef);font-weight:bold;' : ''}`, f.name);
        r.addEventListener('click', () => { gekozen = f.id; gekozenVeld = null; tekenAlles(); });
        lijstEl.appendChild(r);
      }
    }
  }

  // ── preview ─────────────────────────────────────────────────────────
  function voorbeeldWaarden(f) {
    const values = {};
    for (const v of f.fields) {
      if (v.kind === 'auto') continue;
      if (v.kind === 'profile') values[v.key] = profiel[v.from] || (PROFIEL_VELDEN[v.from] || v.label);
      else if (v.kind === 'signature') values[v.key] = profiel.signature || '';
      else values[v.key] = v.value || (v.kind === 'choice' ? v.options?.[0] : v.kind === 'check' ? '' : (f.layout === 'placed' ? '' : ''));
    }
    return values;
  }

  function voorbeeld(f) {
    const stamp = { family: f, values: voorbeeldWaarden(f), placed: new Date().toISOString() };
    const o = opmaak(stamp, { page: 1 }, { fileName: 'Drawing.pdf', pages: 4 });
    const max = 520;
    const s = Math.min(2, max / Math.max(o.w, 1));
    const c = maak('canvas', 'align-self:flex-start;border:1px dashed var(--theme-app-menu-divider,#ccc);background:#fff;');
    const px = window.devicePixelRatio || 1;
    c.width = (o.w * s + 20) * px; c.height = (o.h * s + 20) * px;
    c.style.width = `${o.w * s + 20}px`; c.style.height = `${o.h * s + 20}px`;
    const ctx = c.getContext('2d');
    ctx.scale(px, px); ctx.translate(10, 10); ctx.scale(s, s);
    ctx.textBaseline = 'middle';
    o.teken(ctx);
    return c;
  }

  // ── placed layout: drag boxes onto the sheet ───────────────────────
  function bladEditor(f) {
    const W = f.width || 595, H = f.height || 842;
    const maxB = Math.min(760, rechts.clientWidth - 40 || 700);
    const s = Math.min(maxB / W, 640 / H);
    const px = window.devicePixelRatio || 1;
    const c = maak('canvas', 'align-self:flex-start;border:1px solid var(--theme-app-menu-divider,#ccc);background:#fff;cursor:crosshair;touch-action:none;');
    c.width = W * s * px; c.height = H * s * px;
    c.style.width = `${W * s}px`; c.style.height = `${H * s}px`;
    const ctx = c.getContext('2d');
    let sleep = null;   // { soort: 'nieuw'|'schuif'|'maat', veld, x0, y0, oud }
    const teken = () => {
      ctx.setTransform(px, 0, 0, px, 0, 0);
      ctx.clearRect(0, 0, W * s, H * s);
      ctx.save(); ctx.scale(s, s); ctx.textBaseline = 'middle';
      opmaak({ family: f, values: voorbeeldWaarden(f), placed: new Date().toISOString() }, { page: 1 }, { fileName: 'Drawing.pdf', pages: 4 }).teken(ctx);
      for (const v of f.fields) {
        if (v.x == null) continue;
        const aan = v.key === gekozenVeld;
        ctx.fillStyle = aan ? 'rgba(0,120,215,.18)' : 'rgba(0,120,215,.07)';
        ctx.fillRect(v.x, v.y, v.w, v.h);
        ctx.strokeStyle = aan ? '#0078d7' : 'rgba(0,120,215,.55)'; ctx.lineWidth = (aan ? 1.6 : 0.8) / s;
        ctx.strokeRect(v.x, v.y, v.w, v.h);
        if (aan) { ctx.fillStyle = '#0078d7'; ctx.fillRect(v.x + v.w - 4 / s, v.y + v.h - 4 / s, 8 / s, 8 / s); }
      }
      if (sleep?.soort === 'nieuw' && sleep.rect) {
        ctx.setLineDash([4 / s, 3 / s]); ctx.strokeStyle = '#0078d7'; ctx.lineWidth = 1 / s;
        ctx.strokeRect(sleep.rect.x, sleep.rect.y, sleep.rect.w, sleep.rect.h);
      }
      ctx.restore();
    };
    const punt = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s }; };
    const opVeld = (p) => [...f.fields].reverse().find((v) => v.x != null && p.x >= v.x && p.x <= v.x + v.w && p.y >= v.y && p.y <= v.y + v.h);
    c.addEventListener('pointerdown', (e) => {
      const p = punt(e);
      c.setPointerCapture(e.pointerId);
      const g = f.fields.find((v) => v.key === gekozenVeld && v.x != null);
      if (g && Math.abs(p.x - (g.x + g.w)) < 7 / s && Math.abs(p.y - (g.y + g.h)) < 7 / s) { sleep = { soort: 'maat', veld: g, x0: p.x, y0: p.y, oud: { ...g } }; return; }
      const v = opVeld(p);
      if (v) { gekozenVeld = v.key; sleep = { soort: 'schuif', veld: v, x0: p.x, y0: p.y, oud: { ...v } }; teken(); tekenVelden(); return; }
      sleep = { soort: 'nieuw', x0: p.x, y0: p.y, rect: null };
    });
    c.addEventListener('pointermove', (e) => {
      const p = punt(e);
      if (!sleep) {
        const g = f.fields.find((v) => v.key === gekozenVeld && v.x != null);
        c.style.cursor = g && Math.abs(p.x - (g.x + g.w)) < 7 / s && Math.abs(p.y - (g.y + g.h)) < 7 / s ? 'nwse-resize' : opVeld(p) ? 'move' : 'crosshair';
        return;
      }
      const dx = p.x - sleep.x0, dy = p.y - sleep.y0;
      if (sleep.soort === 'nieuw') sleep.rect = { x: Math.min(p.x, sleep.x0), y: Math.min(p.y, sleep.y0), w: Math.abs(dx), h: Math.abs(dy) };
      else if (sleep.soort === 'schuif') { sleep.veld.x = Math.round(sleep.oud.x + dx); sleep.veld.y = Math.round(sleep.oud.y + dy); }
      else { sleep.veld.w = Math.max(8, Math.round(sleep.oud.w + dx)); sleep.veld.h = Math.max(6, Math.round(sleep.oud.h + dy)); }
      teken();
    });
    c.addEventListener('pointerup', () => {
      if (sleep?.soort === 'nieuw' && sleep.rect && sleep.rect.w > 6 && sleep.rect.h > 5) {
        const label = 'Field';
        const r = sleep.rect;
        const v = { key: sleutelVan(label, f.fields.map((x) => x.key)), label, kind: 'text', value: '', x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) };
        f.fields.push(v);
        gekozenVeld = v.key;
        sleep = null;
        tekenAlles();
        rechts.querySelector(`[data-veld="${v.key}"] input`)?.focus();
        return;
      }
      const was = sleep; sleep = null;
      if (was) tekenVelden();
      teken();
    });
    teken();
    return c;
  }

  // ── parameters ──────────────────────────────────────────────────────
  let veldenDoos = null;
  function tekenVelden() {
    const f = fam();
    if (!veldenDoos || !f) return;
    veldenDoos.replaceChildren();
    f.fields.forEach((v, i) => veldenDoos.appendChild(veldRij(f, v, i)));
  }

  function veldRij(f, v, i) {
    const placed = f.layout === 'placed';
    const r = maak('div', `display:grid;grid-template-columns:1.3fr 1fr 1.6fr auto;gap:6px;align-items:center;padding:3px;${v.key === gekozenVeld ? 'background:rgba(0,120,215,.1);' : ''}`);
    r.dataset.veld = v.key;
    if (placed) r.addEventListener('click', (e) => { if (gekozenVeld !== v.key && e.target.tagName !== 'INPUT') { gekozenVeld = v.key; tekenAlles(); } });
    const label = invoer(v.label, (w) => { v.label = w.trim() || 'Parameter'; tekenAlles(); });
    label.placeholder = 'Parameter name';
    label.addEventListener('focus', () => { if (placed && gekozenVeld !== v.key) { gekozenVeld = v.key; } });
    const soort = keuzelijst(SOORTEN, v.kind, (w) => {
      v.kind = w;
      if ((w === 'choice' || w === 'check') && !v.options?.length) v.options = ['Option 1', 'Option 2'];
      if (w === 'auto' && !v.auto) v.auto = 'page';
      if (w === 'profile' && !v.from) v.from = 'name';
      tekenAlles();
    });
    let detail;
    if (v.kind === 'choice' || v.kind === 'check') {
      detail = invoer((v.options || []).join(', '), (w) => { v.options = w.split(',').map((x) => x.trim()).filter(Boolean); v.value = v.kind === 'choice' ? v.options[0] || '' : ''; tekenAlles(); });
      detail.title = 'Choices, separated by commas';
    } else if (v.kind === 'auto') {
      detail = keuzelijst(AUTO, v.auto || 'page', (w) => { v.auto = w; tekenAlles(); });
    } else if (v.kind === 'profile') {
      detail = keuzelijst(PROFIEL_VELDEN, v.from || 'name', (w) => { v.from = w; tekenAlles(); });
    } else if (v.kind === 'signature') {
      detail = maak('span', 'opacity:.7', 'From My details');
    } else {
      detail = invoer(v.value, (w) => { v.value = w; tekenAlles(); }, '', v.kind === 'date' ? 'date' : 'text');
      detail.placeholder = 'Default value';
    }
    const acties = maak('div', 'display:flex;gap:2px;');
    acties.append(
      knop('↑', () => { if (i > 0) { [f.fields[i - 1], f.fields[i]] = [f.fields[i], f.fields[i - 1]]; tekenAlles(); } }),
      knop('↓', () => { if (i < f.fields.length - 1) { [f.fields[i + 1], f.fields[i]] = [f.fields[i], f.fields[i + 1]]; tekenAlles(); } }),
      knop('×', () => { f.fields.splice(i, 1); if (gekozenVeld === v.key) gekozenVeld = null; tekenAlles(); }),
    );
    r.append(label, soort, detail, acties);
    // Options under the row.
    const opties = maak('div', 'grid-column:1 / -1;display:flex;gap:12px;flex-wrap:wrap;padding-left:4px;opacity:.85;');
    const vink = (tekst, titel, aan, bij) => {
      const l = maak('label', 'display:flex;gap:4px;align-items:center;'); l.title = titel;
      const c = maak('input'); c.type = 'checkbox'; c.checked = !!aan;
      c.addEventListener('change', () => { bij(c.checked); tekenAlles(); });
      l.append(c, tekst); return l;
    };
    if (v.kind !== 'auto') opties.appendChild(vink(groepVan(f) === 'stamp' ? 'Per stamp' : 'Per sheet', 'Each stamp or sheet keeps its own value, instead of sharing one value across the file', v.perStamp, (w) => { v.perStamp = w; }));
    if (!placed) opties.appendChild(vink('Hidden', 'Not shown as a row; still usable as {Parameter} in a line', v.hidden, (w) => { v.hidden = w; }));
    if (v.kind === 'date') opties.appendChild(vink('Empty until set', 'Otherwise it shows the date the stamp was placed', v.blank, (w) => { v.blank = w; }));
    if (placed) {
      opties.appendChild(vink('Several lines', 'Wrap the text over more than one line', v.multi, (w) => { v.multi = w; }));
      opties.appendChild(vink('Bold', '', v.bold, (w) => { v.bold = w; }));
      opties.appendChild(keuzelijst({ left: 'Left', center: 'Centre', right: 'Right' }, v.align || 'left', (w) => { v.align = w; tekenAlles(); }, 'width:80px;'));
      const grootte = invoer(v.size || '', (w) => { v.size = Number(w) || undefined; tekenAlles(); }, 'width:56px;', 'number');
      grootte.placeholder = 'auto'; grootte.title = 'Text size (pt); empty fits the box';
      opties.append(maak('span', '', 'Size'), grootte);
      if (v.x == null) opties.appendChild(maak('span', 'color:#c0392b', 'Not on the sheet: drag a box for it'));
    }
    r.appendChild(opties);
    return r;
  }

  // ── lines (banner, diagonal, table) ─────────────────────────────────
  function regelsEditor(f) {
    const doos = maak('div', 'display:flex;flex-direction:column;gap:4px;max-width:640px;');
    f.lines = f.lines || [];
    f.lines.forEach((r, i) => {
      const rij = maak('div', 'display:grid;grid-template-columns:1fr 90px auto auto auto;gap:6px;align-items:center;');
      const t = invoer(r.text, (w) => { r.text = w; tekenAlles(); });
      t.placeholder = 'Text, with {Parameter} for a value';
      const vet = maak('label', 'display:flex;gap:3px;align-items:center;');
      const c = maak('input'); c.type = 'checkbox'; c.checked = !!r.bold;
      c.addEventListener('change', () => { r.bold = c.checked; tekenAlles(); });
      vet.append(c, 'Bold');
      const wanneer = r.when ? maak('span', 'opacity:.7;font-size:11px;', `only when ${r.when.key} is ${r.when.in.length} values`) : maak('span');
      rij.append(t, keuzelijst(MAATEN, r.size || 's', (w) => { r.size = w; tekenAlles(); }), vet, wanneer,
        knop('×', () => { f.lines.splice(i, 1); tekenAlles(); }));
      doos.appendChild(rij);
    });
    doos.appendChild(knop('+ Add line', () => { f.lines.push({ text: '', size: 's' }); tekenAlles(); }, 'align-self:flex-start;'));
    return doos;
  }

  // ── backgrounds ─────────────────────────────────────────────────────
  async function achtergrondVanPagina(f) {
    const page = api?.getCurrentPage?.() || 1;
    const info = await api?.getPageInfo?.(page);
    if (!info?.width) throw new Error('Open the blank title-block PDF in Open PDF Studio first, on the page you want.');
    const s = Math.min(2048 / info.width, 2048 / info.height, Math.sqrt(3.9e6 / (info.width * info.height))) * 0.99;
    const tegel = await api.renderPageTile(page, { x: 0, y: 0, width: info.width, height: info.height }, { scale: s });
    const ink = await inktPlaatje(tegel.blob, { max: 2048, bijsnijden: false });
    f.background = ink.url;
    f.width = Math.round(info.width * 100) / 100;
    f.height = Math.round(info.height * 100) / 100;
  }
  async function achtergrondVanPlaatje(f) {
    const b = await kiesBestand('image/png,image/jpeg,image/webp');
    if (!b) return false;
    const ink = await inktPlaatje(b, { max: 2048, bijsnijden: false });
    f.background = ink.url;
    if (!f.width || !f.height || f.layout !== 'placed') { f.width = Math.round(ink.width * 0.36); f.height = Math.round(ink.height * 0.36); }
    else f.height = Math.round(f.width * ink.height / ink.width);
    return true;
  }

  // ── right ───────────────────────────────────────────────────────────
  function tekenProfiel() {
    rechts.appendChild(maak('div', 'font-weight:bold;font-size:13px;', 'My details'));
    rechts.appendChild(maak('div', 'opacity:.75;max-width:620px;', 'Kept on this computer only, never in an exported stamp file. Stamps fill their "From my details" and signature parameters from here when you place them.'));
    const raster = maak('div', 'display:grid;grid-template-columns:110px 1fr;gap:6px 10px;align-items:center;max-width:520px;');
    for (const [k, t] of Object.entries(PROFIEL_VELDEN)) {
      raster.append(maak('span', 'opacity:.8', t), invoer(profiel[k], (w) => { profiel[k] = w.trim(); profielGewijzigd = true; }));
    }
    rechts.appendChild(raster);
    rechts.appendChild(maak('div', 'font-weight:bold;margin-top:8px;', 'Signature'));
    rechts.appendChild(maak('div', 'opacity:.75;max-width:620px;', 'A scan or photo of your signature on white paper. White turns see-through and it is cropped to the ink.'));
    const vak = maak('div', 'width:260px;height:90px;border:1px dashed #aaa;background:#fff;display:flex;align-items:center;justify-content:center;');
    if (profiel.signature) { const i = maak('img', 'max-width:250px;max-height:84px;'); i.src = profiel.signature; vak.appendChild(i); } else vak.appendChild(maak('span', 'color:#888', 'No signature'));
    rechts.appendChild(vak);
    rechts.appendChild(maak('div', 'display:flex;gap:6px;')).append(
      knop('Choose picture…', async () => {
        const b = await kiesBestand('image/png,image/jpeg,image/webp');
        if (!b) return;
        profiel.signature = (await inktPlaatje(b, { max: 700 })).url; profielGewijzigd = true; tekenAlles();
      }),
      knop('Remove', () => { delete profiel.signature; profielGewijzigd = true; tekenAlles(); }),
    );
  }

  function tekenRechts() {
    rechts.innerHTML = '';
    veldenDoos = null;
    if (gekozen === 'profiel') { tekenProfiel(); return; }
    const f = fam();
    if (!f) { rechts.appendChild(maak('div', 'opacity:.7', 'Nothing chosen. Click New to make a stamp or a sheet.')); return; }
    const layout = f.layout || 'table';
    const raster = maak('div', 'display:grid;grid-template-columns:110px 1fr;gap:6px 10px;align-items:center;max-width:620px;');
    const veld = (naam, el) => { raster.append(maak('span', 'opacity:.8', naam), el); };
    veld('Name', invoer(f.name, (w) => { f.name = w.trim() || 'Stamp'; tekenAlles(); }));
    veld('Group', keuzelijst(GROEPEN, groepVan(f), (w) => {
      f.group = w;
      if (w !== 'stamp' && f.layout !== 'placed') { f.layout = 'placed'; f.width = f.width > 400 ? f.width : PAPIER.A3L[0]; f.height = f.height > 300 ? f.height : PAPIER.A3L[1]; }
      tekenAlles();
    }));
    if (groepVan(f) === 'stamp') {
      veld('Layout', keuzelijst(LAYOUTS, layout, (w) => {
        f.layout = w;
        if (w === 'placed') { f.width = f.width || 200; f.height = f.height || 100; }
        if ((w === 'banner' || w === 'diagonal') && !f.lines?.length) f.lines = [{ text: f.title || f.name, size: 'l', bold: true }];
        tekenAlles();
      }));
    }
    if (layout === 'table') veld('Title on stamp', invoer(f.title, (w) => { f.title = w; tekenAlles(); }));
    const kleur = maak('input', 'width:60px;height:24px;padding:0;'); kleur.type = 'color';
    const huidig = layout === 'placed' ? f.ink || '#1f2328' : f.color || '#c0392b';
    kleur.value = /^#[0-9a-f]{6}$/i.test(huidig) ? huidig : '#c0392b';
    kleur.addEventListener('change', () => { if (layout === 'placed') f.ink = kleur.value; else f.color = kleur.value; delete f.colorBy; tekenAlles(); });
    veld(layout === 'placed' ? 'Text colour' : 'Colour', kleur);
    if (f.colorBy) raster.append(maak('span'), maak('span', 'opacity:.7;font-size:11px;', `The colour follows "${f.colorBy.key}". Picking a colour here turns that off.`));
    if (layout === 'table' || layout === 'diagonal' || layout === 'banner') {
      veld('Width (pt)', invoer(f.width || (layout === 'banner' ? '' : 180), (w) => {
        f.width = Math.max(0, Math.min(1200, Number(w) || 0)); f.autoWidth = !f.width; tekenAlles();
      }, 'width:90px;', 'number'));
    }
    if (layout === 'placed') {
      const maat = maak('div', 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;');
      maat.append(
        invoer(f.width, (w) => { f.width = Math.max(20, Number(w) || 595); tekenAlles(); }, 'width:80px;', 'number'), '×',
        invoer(f.height, (w) => { f.height = Math.max(20, Number(w) || 842); tekenAlles(); }, 'width:80px;', 'number'), 'pt',
        keuzelijst({ '': 'Paper size…', A4P: 'A4 portrait', A4L: 'A4 landscape', A3L: 'A3 landscape', A3P: 'A3 portrait', A1L: 'A1 landscape' }, '', (w) => { if (PAPIER[w]) { [f.width, f.height] = PAPIER[w]; tekenAlles(); } }),
      );
      veld('Size', maat);
      const bg = maak('div', 'display:flex;gap:6px;flex-wrap:wrap;');
      bg.append(
        knop('From the open page', async () => { await achtergrondVanPagina(f); tekenAlles(); }),
        knop('From a picture…', async () => { if (await achtergrondVanPlaatje(f)) tekenAlles(); }),
        ...(f.background ? [knop('Remove', () => { delete f.background; tekenAlles(); })] : []),
      );
      veld('Background', bg);
      if (groepVan(f) !== 'stamp') {
        const hit = maak('label', 'display:flex;gap:4px;align-items:center;');
        const c = maak('input'); c.type = 'checkbox'; c.checked = !!f.hit;
        c.addEventListener('change', () => {
          if (c.checked) {
            const b = f.fields.filter((v) => v.x != null);
            if (!b.length) { f.hit = { x: f.width * 0.6, y: f.height * 0.75, w: f.width * 0.4, h: f.height * 0.25 }; } else {
              const x = Math.min(...b.map((v) => v.x)), y = Math.min(...b.map((v) => v.y));
              f.hit = { x, y, w: Math.max(...b.map((v) => v.x + v.w)) - x, h: Math.max(...b.map((v) => v.y + v.h)) - y };
            }
          } else delete f.hit;
          tekenAlles();
        });
        hit.append(c, 'Select only by its boxes (so clicks on the drawing go through)');
        veld('Selecting', hit);
      }
    }
    rechts.appendChild(raster);

    if (layout !== 'placed') {
      rechts.appendChild(maak('div', 'font-weight:bold;margin-top:6px;', layout === 'table' ? 'Lines under the title' : 'Lines'));
      rechts.appendChild(maak('div', 'opacity:.7', 'Use {Parameter name} to show a value. A line whose values are all empty is left out.'));
      rechts.appendChild(regelsEditor(f));
    }
    if (layout === 'table') {
      rechts.appendChild(maak('div', 'font-weight:bold;margin-top:6px;', 'Note at the bottom'));
      const n = maak('textarea', INVOER + 'max-width:620px;height:52px;resize:vertical;');
      n.value = f.note || '';
      n.addEventListener('change', () => { f.note = n.value.trim(); tekenAlles(); });
      rechts.appendChild(n);
    }

    if (layout === 'placed') {
      rechts.appendChild(maak('div', 'font-weight:bold;margin-top:6px;', 'Sheet'));
      rechts.appendChild(maak('div', 'opacity:.7', 'Drag on the sheet to add a box for a value. Click a box to pick it, drag it to move it, drag its corner to resize it.'));
      rechts.appendChild(bladEditor(f));
    }

    rechts.appendChild(maak('div', 'font-weight:bold;margin-top:6px;', 'Parameters'));
    rechts.appendChild(maak('div', 'opacity:.7', 'Values are shared by every stamp or sheet of this family in a file, unless marked per stamp or per sheet.'));
    veldenDoos = maak('div', 'display:flex;flex-direction:column;gap:2px;max-width:860px;');
    rechts.appendChild(veldenDoos);
    tekenVelden();
    rechts.appendChild(knop('+ Add parameter', () => {
      const label = 'Parameter';
      f.fields.push({ key: sleutelVan(label, f.fields.map((x) => x.key)), label, kind: 'text', value: '' });
      tekenAlles();
    }, 'align-self:flex-start;'));
    if (layout !== 'placed') {
      rechts.appendChild(maak('div', 'font-weight:bold;margin-top:6px;', 'Preview'));
      rechts.appendChild(voorbeeld(f));
    }
  }

  function tekenAlles() {
    const y = rechts.scrollTop;
    tekenLijst(); tekenRechts();
    rechts.scrollTop = y;
  }

  // ── buttons ─────────────────────────────────────────────────────────
  const nieuwMenu = keuzelijst({
    '': 'New…', stamp: 'Stamp (table)', banner: 'Stamp (banner)', picture: 'Stamp from a picture…',
    page: 'Sheet from the open page', sheet: 'Blank sheet (A3)', form: 'Blank form (A4)',
  }, '', async (w) => {
    nieuwMenu.value = '';
    let f = null;
    if (w === 'stamp') f = { id: nieuwId(), name: 'New stamp', title: 'STAMP', color: '#2c6fbb', width: 180, fields: [{ key: 'note', label: 'Note', kind: 'text', value: '' }] };
    if (w === 'banner') f = { id: nieuwId(), name: 'New banner', layout: 'banner', color: '#2c6fbb', lines: [{ text: 'STAMP', size: 'l', bold: true }, { text: '{date}', size: 's' }], fields: [{ key: 'date', label: 'Date', kind: 'date', value: '' }] };
    if (w === 'picture') {
      f = { id: nieuwId(), name: 'Picture stamp', layout: 'placed', color: '#1f2328', width: 200, height: 100, fields: [] };
      try { if (!(await achtergrondVanPlaatje(f))) return; } catch (e) { alert(e.message || e); return; }
    }
    if (w === 'page') {
      f = { id: nieuwId(), name: 'My sheet', group: 'sheet', layout: 'placed', color: '#1f2328', fields: [] };
      try { await achtergrondVanPagina(f); } catch (e) { alert(e.message || e); return; }
    }
    if (w === 'sheet') f = { id: nieuwId(), name: 'New sheet', group: 'sheet', layout: 'placed', color: '#1f2328', width: PAPIER.A3L[0], height: PAPIER.A3L[1], frame: [{ t: 'rect', x: 25, y: 15, w: PAPIER.A3L[0] - 40, h: PAPIER.A3L[1] - 30, lw: 1.2 }], fields: [] };
    if (w === 'form') f = { id: nieuwId(), name: 'New form', group: 'form', layout: 'placed', color: '#1f2328', width: PAPIER.A4P[0], height: PAPIER.A4P[1], frame: [], fields: [] };
    if (!f) return;
    lijst.push(f); gekozen = f.id; gekozenVeld = null; tekenAlles();
  }, 'width:100%;');
  linksKnoppen.append(
    nieuwMenu,
    knop('Duplicate', () => {
      const f = fam(); if (!f) return;
      const d = { ...kopie(f), id: nieuwId(), name: `${f.name} copy`, builtin: false };
      lijst.push(d); gekozen = d.id; tekenAlles();
    }),
    knop('Delete', () => {
      const f = fam(); if (!f) return;
      if (!confirm(`Delete "${f.name}"? Stamps and sheets already placed keep showing.`)) return;
      lijst = lijst.filter((x) => x.id !== f.id); gekozen = lijst[0]?.id || null; tekenAlles();
    }),
    knop('Reset', () => {
      const f = fam();
      const std = f && STANDAARD.find((x) => x.id === f.id);
      if (std) {
        if (!confirm(`Put "${f.name}" back the way Seed43 ships it?`)) return;
        lijst[lijst.indexOf(f)] = kopie(std);
      } else {
        const ontbreekt = STANDAARD.filter((x) => !lijst.some((y) => y.id === x.id));
        if (!ontbreekt.length) { alert('Every built-in stamp, sheet and form is already in the list.'); return; }
        if (!confirm(`Add back ${ontbreekt.length} built-in stamps, sheets or forms that were deleted?`)) return;
        lijst.push(...kopie(ontbreekt));
      }
      tekenAlles();
    }),
    knop('Export', () => {
      const f = fam();
      const welke = f && confirm(`Export only "${f.name}"?\n\nOK: just this one. Cancel: everything.`) ? [f] : lijst;
      const blob = new Blob([JSON.stringify({ seed43StampFamilies: 1, families: welke }, null, 2)], { type: 'application/json' });
      const a = maak('a'); a.href = URL.createObjectURL(blob);
      a.download = welke.length === 1 ? `${welke[0].name.replace(/[\\/:*?"<>|]/g, '_')}.seed43stamps` : 'seed43-stamps.seed43stamps';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }),
    knop('Import', async () => {
      const b = await kiesBestand('.seed43stamps,.json,application/json');
      if (!b) return;
      try {
        const data = JSON.parse(await b.text());
        const nieuw = (Array.isArray(data) ? data : data.families || []).filter(geldig);
        if (!nieuw.length) throw new Error('No stamp families in that file.');
        for (const f of nieuw) {
          const i = lijst.findIndex((x) => x.id === f.id);
          if (i >= 0) lijst[i] = f; else lijst.push(f);
        }
        gekozen = nieuw[0].id; tekenAlles();
      } catch (e) { alert(`Could not import: ${e.message || e}`); }
    }),
  );

  voet.append(
    knop('Cancel', sluit),
    knop('Save', () => {
      if (profielGewijzigd) bewaarProfiel(profiel);
      const oud = JSON.parse(oorspronkelijk);
      const gewijzigd = lijst.filter((f) => JSON.stringify(f) !== JSON.stringify(oud.find((o) => o.id === f.id)));
      sluit();
      opslaan(lijst, gewijzigd);
    }, 'background:var(--theme-accent,#0078d7);border-color:var(--theme-accent,#0078d7);color:#fff;'),
  );
  achter.addEventListener('mousedown', (e) => { if (e.target === achter) sluit(); });
  document.body.appendChild(achter);
  tekenAlles();
}
