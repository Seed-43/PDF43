// Library elements on the sheet: steel sections (to-scale outline) and bolt
// groups (plate, bolts and the edge / pitch checks from the library).

import { laadBibliotheek, categorie } from './store.js';
import { sectieMaat, tekenSectie, boutMaat, tekenBoutGroep, boutGroep } from './draw.js';

export const SECTIE = 'seed43Section';
export const BOUTEN = 'seed43BoltGroup';

const kopie = (x) => JSON.parse(JSON.stringify(x));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PER_MM = { mm: 1, cm: 0.1, m: 0.001, in: 1 / 25.4, inch: 1 / 25.4, ft: 1 / 304.8 };
const PT_PER_PAPER_MM = 72 / 25.4;

/** Page points per real millimetre at (x, y): the sheet's scale, else 1:denom. */
export function puntenPerMm(api, page, x, y, denom = 10) {
  try {
    const s = api.getScaleAt?.(page, x, y);
    const f = s && PER_MM[String(s.unit || '').toLowerCase()];
    if (s && f && s.pixelsPerUnit > 0) return { ptsPerMm: s.pixelsPerUnit * f, scaleText: 'sheet scale' };
  } catch {}
  return { ptsPerMm: PT_PER_PAPER_MM / denom, scaleText: `1:${denom}` };
}

function plaatsingsType(api, soort) {
  const maat = soort === SECTIE ? sectieMaat : boutMaat;
  return {
    drawMode: 'click',
    cursor: 'copy',
    create(x, y, _x2, _y2, _e, state) {
      const keuze = state?.toolOverrides?.seed43Element;
      if (!keuze?.item) return null;
      const schaal = puntenPerMm(api, state.currentPage || 1, x, y);
      const element = soort === SECTIE
        ? { category: keuze.category, shape: keuze.shape, item: kopie(keuze.item), rotation: 0, label: true, ...schaal }
        : { bolt: kopie(keuze.item), rows: 2, cols: 2, pitch: 70, gauge: 70, edgeX: 35, edgeY: 35, rotation: 0, plate: true, ...schaal };
      const m = maat(element);
      return { type: soort, x: x - m.w / 2, y: y - m.h / 2, width: m.w, height: m.h, element, subject: element.item?.name || element.bolt?.name || '' };
    },
    render(ctx, ann) { (soort === SECTIE ? tekenSectie : tekenBoutGroep)(ctx, ann); },
    getBounds(ann) {
      const m = ann.element ? maat(ann.element) : { w: ann.width || 0, h: ann.height || 0 };
      return { x: ann.x, y: ann.y, width: m.w, height: m.h };
    },
    hitTest(px, py, ann, tol = 2) {
      const b = this.getBounds(ann);
      return px >= b.x - tol && px <= b.x + b.width + tol && py >= b.y - tol && py <= b.y + b.height + tol;
    },
  };
}

// ── Properties panels ──────────────────────────────────────────────────────

const RIJ = 'display:grid;grid-template-columns:90px 1fr;gap:4px;align-items:center;';
const INVOER = 'font:inherit;padding:2px 4px;min-width:0;';

function kop(el, tekst, sub, kleur) {
  const k = document.createElement('div');
  k.innerHTML = `<div style="font-weight:bold;font-size:13px;color:${kleur}">${esc(tekst)}</div><div style="opacity:.7">${esc(sub)}</div>`;
  el.appendChild(k);
}

function veld(el, label, invoer) {
  const r = document.createElement('label');
  r.style.cssText = RIJ;
  const l = document.createElement('span'); l.textContent = label; l.style.opacity = '0.8';
  r.append(l, invoer);
  el.appendChild(r);
  return invoer;
}

function getal(waarde, wijzig, stap = 1) {
  const i = document.createElement('input');
  i.type = 'number'; i.step = String(stap); i.value = waarde; i.style.cssText = INVOER;
  i.addEventListener('change', () => wijzig(Number(i.value)));
  return i;
}

function keuze(opties, waarde, wijzig) {
  const s = document.createElement('select');
  s.style.cssText = INVOER;
  for (const [v, t] of opties) { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); }
  s.value = String(waarde);
  s.addEventListener('change', () => wijzig(s.value));
  return s;
}

/** Change the element, keeping its centre where it is. */
function werkBij(ann, update, maat, wijzig) {
  const oud = maat(ann.element);
  const cx = ann.x + oud.w / 2, cy = ann.y + oud.h / 2;
  const element = kopie(ann.element);
  wijzig(element);
  const m = maat(element);
  update('element', element);
  update('x', cx - m.w / 2); update('y', cy - m.h / 2);
  update('width', m.w); update('height', m.h);
}

function schaalVeld(el, ann, update, maat) {
  const huidig = Math.round(PT_PER_PAPER_MM / (ann.element.ptsPerMm || 1));
  const i = getal(huidig, (n) => {
    if (!(n > 0)) return;
    werkBij(ann, update, maat, (e) => { e.ptsPerMm = PT_PER_PAPER_MM / n; e.scaleText = `1:${n}`; });
  });
  veld(el, 'Scale 1:', i);
}

function sectiePaneel() {
  return (ann, update) => {
    if (!ann) return document.createElement('div');   // the host calls this on deselect too
    const e = ann.element;
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;gap:5px;padding:8px;font-size:12px;border-top:2px solid #1d4ed8;';
    if (!e) return el;
    kop(el, e.item.name, `${e.category} section, ${e.scaleText || ''}`, '#1d4ed8');
    veld(el, 'Rotation', keuze([[0, '0°'], [90, '90°'], [180, '180°'], [270, '270°']], e.rotation || 0,
      (v) => werkBij(ann, update, sectieMaat, (x) => { x.rotation = Number(v); })));
    schaalVeld(el, ann, update, sectieMaat);
    veld(el, 'Label', keuze([['1', 'Show'], ['0', 'Hide']], e.label === false ? '0' : '1',
      (v) => werkBij(ann, update, sectieMaat, (x) => { x.label = v === '1'; })));
    const tabel = document.createElement('div');
    tabel.style.cssText = 'display:grid;grid-template-columns:auto 1fr;gap:1px 10px;margin-top:4px;font-variant-numeric:tabular-nums;';
    for (const [k, v] of Object.entries(e.item)) {
      if (k === 'name') continue;
      const a = document.createElement('span'); a.textContent = k; a.style.opacity = '0.7';
      const b = document.createElement('span'); b.textContent = typeof v === 'number' ? v.toLocaleString('en-NZ') : String(v);
      tabel.append(a, b);
    }
    el.appendChild(tabel);
    requestAnimationFrame(() => { try { el.scrollIntoView({ block: 'start' }); } catch {} });
    return el;
  };
}

function boutPaneel(api) {
  return (ann, update) => {
    if (!ann) return document.createElement('div');   // the host calls this on deselect too
    const e = ann.element;
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;gap:5px;padding:8px;font-size:12px;border-top:2px solid #0f766e;';
    if (!e) return el;
    const g = boutGroep(e);
    kop(el, `${g.rows * g.cols}-${e.bolt?.name || 'bolt'}`, `Bolt group, ${e.scaleText || ''}`, '#0f766e');
    const status = document.createElement('div');
    status.style.cssText = 'margin-top:4px;padding:4px 6px;border-radius:3px;';
    const toonStatus = () => {
      const x = ann.element, h = boutGroep(x);
      if (h.fouten.length) { status.style.background = 'rgba(220,38,38,.12)'; status.textContent = `Check fails: ${h.fouten.join('; ')}`; }
      else if (h.ongecontroleerd) { status.style.background = 'rgba(234,179,8,.15)'; status.textContent = `Not checked: set minEdge and minPitch for ${x.bolt?.name || 'this bolt'} in the Element Library.`; }
      else { status.style.background = 'rgba(22,163,74,.12)'; status.textContent = `OK: edge ≥ ${x.bolt.minEdge}, pitch ≥ ${x.bolt.minPitch}`; }
    };
    const wb = (wijzig) => { werkBij(ann, update, boutMaat, wijzig); toonStatus(); };
    // Bolt choice from the library
    const bouten = document.createElement('select');
    bouten.style.cssText = INVOER;
    veld(el, 'Bolt', bouten);
    laadBibliotheek(api).then((lib) => {
      for (const c of lib.categories.filter((c) => c.kind === 'bolt')) {
        for (const it of c.items) { const o = document.createElement('option'); o.value = `${c.id}|${it.name}`; o.textContent = it.name; bouten.appendChild(o); }
      }
      const huidig = [...bouten.options].find((o) => o.textContent === e.bolt?.name);
      if (huidig) bouten.value = huidig.value;
    });
    bouten.addEventListener('change', async () => {
      const [cid, naam] = bouten.value.split('|');
      const lib = await laadBibliotheek(api);
      const it = categorie(lib, cid)?.items.find((i) => i.name === naam);
      if (it) wb((x) => { x.bolt = kopie(it); });
    });
    veld(el, 'Rows', getal(g.rows, (n) => wb((x) => { x.rows = Math.max(1, Math.round(n)); })));
    veld(el, 'Columns', getal(g.cols, (n) => wb((x) => { x.cols = Math.max(1, Math.round(n)); })));
    veld(el, 'Pitch (mm)', getal(g.pitch, (n) => wb((x) => { x.pitch = n; }), 5));
    veld(el, 'Gauge (mm)', getal(g.gauge, (n) => wb((x) => { x.gauge = n; }), 5));
    veld(el, 'Edge across', getal(g.ex, (n) => wb((x) => { x.edgeX = n; }), 5));
    veld(el, 'Edge along', getal(g.ey, (n) => wb((x) => { x.edgeY = n; }), 5));
    veld(el, 'Rotation', keuze([[0, '0°'], [90, '90°'], [180, '180°'], [270, '270°']], e.rotation || 0, (v) => wb((x) => { x.rotation = Number(v); })));
    veld(el, 'Plate', keuze([['1', 'Show'], ['0', 'Hide']], e.plate === false ? '0' : '1', (v) => wb((x) => { x.plate = v === '1'; })));
    schaalVeld(el, ann, update, boutMaat);
    toonStatus();
    el.appendChild(status);
    requestAnimationFrame(() => { try { el.scrollIntoView({ block: 'start' }); } catch {} });
    return el;
  };
}

export function startElementen(api) {
  api.registerAnnotationType(SECTIE, plaatsingsType(api, SECTIE));
  api.registerAnnotationType(BOUTEN, plaatsingsType(api, BOUTEN));
  api.registerPropertyPanel(SECTIE, sectiePaneel());
  api.registerPropertyPanel(BOUTEN, boutPaneel(api));
}

/** Arm the click-to-place tool for a library item. */
export function plaats(api, cat, it) {
  const soort = cat.kind === 'bolt' ? BOUTEN : SECTIE;
  api.setTool(soort);
  api.setToolOverrides({ seed43Element: { category: cat.name, shape: cat.shape, item: kopie(it) } });
}
