// Library elements on the sheet: steel sections (to-scale outline), members
// drawn from point A to point B in elevation or plan, and bolt groups (plate,
// bolts and the edge / pitch checks from the library). Space rotates the
// selected element (or the one being placed) by 90 degrees.

import { laadBibliotheek, categorie } from './store.js';
import { sectieMaat, tekenSectie, boutMaat, tekenBoutGroep, boutGroep, tekenLid, lidBounds, lidGeometrie } from './draw.js';

export const SECTIE = 'seed43Section';
export const BOUTEN = 'seed43BoltGroup';
export const LID = 'seed43Member';
const ONZE = [SECTIE, BOUTEN, LID];

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
        ? { category: keuze.category, shape: keuze.shape, item: kopie(keuze.item), rotation: keuze.rotation || 0, label: true, ...schaal }
        : { bolt: kopie(keuze.item), rows: 2, cols: 2, pitch: 70, gauge: 70, edgeX: 35, edgeY: 35, rotation: keuze.rotation || 0, plate: true, ...schaal };
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

/** A member from point A to point B (drag), drawn in elevation or plan. */
function lidType(api) {
  return {
    drawMode: 'drag',
    cursor: 'crosshair',
    create(sx, sy, ex, ey, _e, state) {
      const keuze = state?.toolOverrides?.seed43Element;
      if (!keuze?.item || Math.hypot(ex - sx, ey - sy) < 2) return null;
      const schaal = puntenPerMm(api, state.currentPage || 1, sx, sy);
      const ann = {
        type: LID, startX: sx, startY: sy, endX: ex, endY: ey,
        element: { category: keuze.category, shape: keuze.shape, item: kopie(keuze.item), view: keuze.view || 'elevation', label: true, ...schaal },
        subject: keuze.item.name,
      };
      const b = lidBounds(ann);
      return { ...ann, x: b.x, y: b.y, width: b.width, height: b.height };
    },
    preview(ctx, sx, sy, cx, cy, state) {
      const keuze = state?.toolOverrides?.seed43Element;
      if (!keuze?.item || Math.hypot(cx - sx, cy - sy) < 2) return;
      const schaal = puntenPerMm(api, state.currentPage || 1, sx, sy);
      tekenLid(ctx, { startX: sx, startY: sy, endX: cx, endY: cy, element: { shape: keuze.shape, item: keuze.item, view: keuze.view || 'elevation', ...schaal } });
    },
    render(ctx, ann) { tekenLid(ctx, ann); },
    getBounds(ann) { return ann.element ? lidBounds(ann) : { x: ann.x, y: ann.y, width: ann.width || 0, height: ann.height || 0 }; },
    hitTest(px, py, ann, tol = 2) {
      if (!ann.element) return false;
      const g = lidGeometrie(ann);
      const t = (px - g.ax) * g.ux + (py - g.ay) * g.uy;
      const n = Math.abs((px - g.ax) * g.nx + (py - g.ay) * g.ny);
      return t >= -tol && t <= g.L + tol && n <= (g.p.breedte * g.k) / 2 + tol;
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

/** Any angle: type it, or pick a common one from the list. Space also turns by 90. */
function hoekVeld(waarde, wijzig) {
  const i = document.createElement('input');
  i.type = 'number'; i.step = '1'; i.value = waarde; i.style.cssText = INVOER;
  if (!document.getElementById('seed43-hoeken')) {
    const lijst = document.createElement('datalist');
    lijst.id = 'seed43-hoeken';
    for (const h of [0, 15, 30, 45, 60, 90, 135, 180, 225, 270, 315]) { const o = document.createElement('option'); o.value = h; lijst.appendChild(o); }
    document.body.appendChild(lijst);
  }
  i.setAttribute('list', 'seed43-hoeken');
  i.title = 'Type any angle or pick one; Space turns the selected element by 90 degrees';
  i.addEventListener('change', () => { const v = Number(i.value); if (Number.isFinite(v)) wijzig(((v % 360) + 360) % 360); });
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
    veld(el, 'Rotation °', hoekVeld(e.rotation || 0, (v) => werkBij(ann, update, sectieMaat, (x) => { x.rotation = v; })));
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
    veld(el, 'Rotation °', hoekVeld(e.rotation || 0, (v) => wb((x) => { x.rotation = v; })));
    veld(el, 'Plate', keuze([['1', 'Show'], ['0', 'Hide']], e.plate === false ? '0' : '1', (v) => wb((x) => { x.plate = v === '1'; })));
    schaalVeld(el, ann, update, boutMaat);
    toonStatus();
    el.appendChild(status);
    requestAnimationFrame(() => { try { el.scrollIntoView({ block: 'start' }); } catch {} });
    return el;
  };
}

function lidPaneel() {
  return (ann, update) => {
    if (!ann) return document.createElement('div');   // the host calls this on deselect too
    const e = ann.element;
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;gap:5px;padding:8px;font-size:12px;border-top:2px solid #1d4ed8;';
    if (!e) return el;
    const g = lidGeometrie(ann);
    kop(el, e.item.name, `${e.category} member, ${e.view === 'plan' ? 'plan' : 'elevation'}, ${e.scaleText || ''}`, '#1d4ed8');
    const zet = (wijzig) => {
      const x = kopie(ann.element); wijzig(x); update('element', x);
      const b = lidBounds(ann); update('x', b.x); update('y', b.y); update('width', b.width); update('height', b.height);
    };
    veld(el, 'View', keuze([['elevation', 'Elevation'], ['plan', 'Plan']], e.view || 'elevation', (v) => zet((x) => { x.view = v; })));
    const lengte = document.createElement('span');
    lengte.textContent = `${Math.round(g.L / g.k)} mm`;
    veld(el, 'Length', lengte);
    veld(el, 'Label', keuze([['1', 'Name and length'], ['n', 'Name only'], ['0', 'Hide']], e.label === false ? '0' : e.showLength === false ? 'n' : '1',
      (v) => zet((x) => { x.label = v !== '0'; x.showLength = v === '1'; })));
    const huidig = Math.round(PT_PER_PAPER_MM / (e.ptsPerMm || 1));
    veld(el, 'Scale 1:', getal(huidig, (n) => { if (n > 0) zet((x) => { x.ptsPerMm = PT_PER_PAPER_MM / n; x.scaleText = `1:${n}`; }); }));
    const tip = document.createElement('div');
    tip.style.cssText = 'opacity:.7;margin-top:4px;';
    tip.textContent = 'Drag the member to move it. Space turns it 90 degrees about its middle.';
    el.appendChild(tip);
    requestAnimationFrame(() => { try { el.scrollIntoView({ block: 'start' }); } catch {} });
    return el;
  };
}

// ── Space bar: turn the selected element (or the one being placed) ────────

let geselecteerd = null;   // id of the selected Seed43 element

function draaiGeselecteerd(api, stap) {
  const ann = api.getAnnotations().find((a) => a.id === geselecteerd);
  if (!ann?.element) return false;
  const changes = {};
  if (ann.type === LID) {
    const mx = (ann.startX + ann.endX) / 2, my = (ann.startY + ann.endY) / 2;
    const r = (stap * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    const om = (x, y) => [mx + (x - mx) * c - (y - my) * s, my + (x - mx) * s + (y - my) * c];
    [changes.startX, changes.startY] = om(ann.startX, ann.startY);
    [changes.endX, changes.endY] = om(ann.endX, ann.endY);
    const b = lidBounds({ ...ann, ...changes });
    Object.assign(changes, { x: b.x, y: b.y, width: b.width, height: b.height });
  } else {
    const maat = ann.type === SECTIE ? sectieMaat : boutMaat;
    const oud = maat(ann.element);
    const cx = ann.x + oud.w / 2, cy = ann.y + oud.h / 2;
    const element = kopie(ann.element);
    element.rotation = ((((element.rotation || 0) + stap) % 360) + 360) % 360;
    const m = maat(element);
    Object.assign(changes, { element, x: cx - m.w / 2, y: cy - m.h / 2, width: m.w, height: m.h });
  }
  api.applyAnnotationBatch([{ op: 'update', id: ann.id, changes }]);
  api.redrawAnnotations?.();
  return true;
}

let plaatsing = null;   // the element being placed (tool overrides)

function spatieToets(api) {
  return (e) => {
    if (e.code !== 'Space' || e.ctrlKey || e.altKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return;
    const stap = e.shiftKey ? -90 : 90;
    // Placing: turn the element that is about to be placed.
    if ([SECTIE, BOUTEN].includes(api.getCurrentTool?.())) {
      if (plaatsing) {
        plaatsing.rotation = ((((plaatsing.rotation || 0) + stap) % 360) + 360) % 360;
        api.setToolOverrides({ seed43Element: plaatsing });
        e.preventDefault(); e.stopPropagation();
      }
      return;
    }
    if (geselecteerd && draaiGeselecteerd(api, stap)) { e.preventDefault(); e.stopPropagation(); }
  };
}

let toets = null;

export function startElementen(api) {
  api.registerAnnotationType(SECTIE, plaatsingsType(api, SECTIE));
  api.registerAnnotationType(BOUTEN, plaatsingsType(api, BOUTEN));
  api.registerAnnotationType(LID, lidType(api));
  api.registerPropertyPanel(SECTIE, sectiePaneel());
  api.registerPropertyPanel(BOUTEN, boutPaneel(api));
  api.registerPropertyPanel(LID, lidPaneel());
  for (const type of ONZE) api.registerSelectionListener(type, (ann) => { geselecteerd = ann?.id || null; });
  if (toets) window.removeEventListener('keydown', toets, true);
  toets = spatieToets(api);
  window.addEventListener('keydown', toets, true);
}

export function stopElementen() {
  if (toets) window.removeEventListener('keydown', toets, true);
  toets = null;
}

/** Arm the placing tool for a library item: view 'section' (click), or
 *  'elevation' / 'plan' (drag from point A to point B). Bolts: click. */
export function plaats(api, cat, it, view = 'section') {
  const soort = cat.kind === 'bolt' ? BOUTEN : view === 'section' ? SECTIE : LID;
  plaatsing = { category: cat.name, shape: cat.shape, item: kopie(it), view, rotation: 0 };
  api.setTool(soort);
  api.setToolOverrides({ seed43Element: plaatsing });
}
