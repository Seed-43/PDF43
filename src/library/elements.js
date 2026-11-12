// Library elements on the sheet: steel and timber sections (to-scale
// outline), members drawn from point A to point B in elevation or plan, and
// bolt groups (plate, bolts and the edge / pitch checks from the library).
//
// Placing a member works like the line tool: click point A, then point B
// (press-drag-release also works). Ctrl or Shift keeps it horizontal or
// vertical, both keys together also allow 45 degrees. While placing or
// dragging a grip, points snap to other elements' grips: member ends A and
// B, midpoints and centre lines, and section and bolt group centres. A
// selected element shows its grips: drag A or B to stretch a member, the
// midpoint or centre to move. Space rotates the selected element (or the
// one being placed) by 90 degrees.

import { registreerEigenschappen, registreerMeervoud } from '../eigenschappen.js';
import { formulier, kop, groep, veld, waarde, tip } from '../formulier.js';
import { maakMaatschets } from './maatschets.js';

/**
 * Change element: a Category list and an Element list. Picking an element
 * swaps the selected one for it (`kies(cat, item)`); position, rotation,
 * view and scale stay. Fixings change only to fixings, sections and members
 * only to sections.
 */
function wisselRijen(el, e, kies) {
  const lib = geladenBibliotheek();
  if (!lib) return;
  const fixing = BEVESTIGINGEN.includes(e.shape);
  const uit = leesRegios().off;
  const cats = lib.categories.filter((c) => c.kind === 'section' && c.shape !== 'bracing'
    && BEVESTIGINGEN.includes(c.shape) === fixing && !uit.includes(regioVan(c)) && c.items.length);
  const nu = cats.find((c) => c.id === e.catId)
    || cats.find((c) => c.name === e.category && c.shape === e.shape && c.items.some((i) => i.name === e.item?.name))
    || cats.find((c) => c.name === e.category) || cats[0];
  if (!nu) return;
  const catLijst = keuze(cats.map((c) => [c.id, `${regioVan(c)} · ${c.name}`]), nu.id, () => vulItems());
  const itemLijst = document.createElement('select');
  itemLijst.style.cssText = INVOER;
  const vulItems = () => {
    const c = cats.find((x) => x.id === catLijst.value);
    itemLijst.replaceChildren();
    if (c !== nu) {
      const o = document.createElement('option'); o.value = ''; o.textContent = 'Pick an element...'; itemLijst.appendChild(o);
    }
    for (const it of c?.items || []) { const o = document.createElement('option'); o.value = it.name; o.textContent = it.name; itemLijst.appendChild(o); }
    itemLijst.value = c === nu ? (e.item?.name || '') : '';
  };
  vulItems();
  itemLijst.addEventListener('change', () => {
    const c = cats.find((x) => x.id === catLijst.value);
    const it = c?.items.find((x) => x.name === itemLijst.value);
    if (c && it && !(c === nu && it.name === e.item?.name)) kies(c, it);
  });
  groep(el, 'Change element');
  veld(el, 'Category', catLijst);
  veld(el, 'Element', itemLijst);
}

/** The dimension key of a section (no group of its own: it follows the dimensions). */
function schets(el, shape, item) {
  const cv = maakMaatschets(shape, item);
  if (!cv) return;
  const w = document.createElement('div');
  w.className = 's43f-schets';
  w.appendChild(cv);
  el.appendChild(w);
}

// Section data: each value with its name and unit, dimensions first, then
// the section properties. Large properties are shown in powers of ten.
const MATEN = [
  ['d', 'Depth', 'mm'], ['b', 'Width', 'mm'], ['tf', 'Flange thickness', 'mm'], ['tw', 'Web thickness', 'mm'],
  ['t', 'Thickness', 'mm'], ['r1', 'Root radius', 'mm'], ['r2', 'Toe radius', 'mm'], ['ro', 'Outside corner radius', 'mm'],
  ['ri', 'Inside corner radius', 'mm'], ['lip', 'Lip', 'mm'], ['e', 'Top flange', 'mm'], ['f', 'Bottom flange', 'mm'],
  ['plies', 'Plies', ''],
];
const EIGENSCHAPPEN = [
  ['mass', 'Mass', 'kg/m', 0], ['A', 'Area', 'mm²', 0],
  ['Ix', 'Second moment Ix', 'mm⁴', 6], ['Iy', 'Second moment Iy', 'mm⁴', 6],
  ['Zx', 'Elastic modulus Zx', 'mm³', 3], ['Zy', 'Elastic modulus Zy', 'mm³', 3],
  ['Sx', 'Plastic modulus Sx', 'mm³', 3], ['Sy', 'Plastic modulus Sy', 'mm³', 3],
  ['J', 'Torsion constant J', 'mm⁴', 3], ['Iw', 'Warping constant Iw', 'mm⁶', 9],
];
const MACHT = { 3: '10³', 6: '10⁶', 9: '10⁹' };

function getalTekst(v, macht = 0) {
  if (typeof v !== 'number') return String(v);
  if (macht && Math.abs(v) >= 10 ** macht) return `${(v / 10 ** macht).toLocaleString('en-NZ', { maximumFractionDigits: 3 })} × ${MACHT[macht]}`;
  return v.toLocaleString('en-NZ', { maximumFractionDigits: 3 });
}

/** Dimensions (with the key), section properties, then anything else. */
function sectieGegevens(el, shape, item) {
  const gezien = new Set(['name', 'blocking', 'view', 'check']);
  groep(el, 'Dimensions');
  for (const [k, naam, eenheid] of MATEN) {
    if (item[k] == null || item[k] === '') continue;
    gezien.add(k);
    waarde(el, `${naam} (${k})`, `${getalTekst(item[k])}${eenheid ? ` ${eenheid}` : ''}`);
  }
  schets(el, shape, item);
  const eig = EIGENSCHAPPEN.filter(([k]) => item[k] != null && item[k] !== '');
  if (eig.length) {
    groep(el, 'Section properties');
    for (const [k, naam, eenheid, macht] of eig) {
      gezien.add(k);
      waarde(el, naam, `${getalTekst(item[k], macht)} ${eenheid}`);
    }
  }
  const rest = Object.entries(item).filter(([k]) => !gezien.has(k));
  if (rest.length) {
    groep(el, 'Other');
    for (const [k, v] of rest) waarde(el, k, getalTekst(v));
  }
}
import { laadBibliotheek, categorie, geladenBibliotheek, regioVan } from './store.js';
import { leesRegios } from './window.js';
import { BRACING_STANDAARD, BRACING_CODES, bracingLengte, bracingRaak } from './bracing.js';
import { sectieMaat, tekenSectie, boutMaat, tekenBoutGroep, boutGroep, boutZijaanzicht, boutOpties, tekenLid, lidBounds, lidGeometrie, BEVESTIGINGEN, AANTAL_VORMEN, metAantal, labelNaam, UITLIJNING } from './draw.js';
import { SECTIE, BOUTEN, LID, ONZE, GREEP_NAAM, grepen, zoekSnap, haaks, haaksStap, lidPunten } from './snap.js';
import { startOverlay, stopOverlay, meldStaat, ijk, naarPagina, zoomVan, teken, tekenSnap, tekenGrepen, tekenElastiek } from './overlay.js';

export { SECTIE, BOUTEN, LID };

const kopie = (x) => JSON.parse(JSON.stringify(x));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PER_MM = { mm: 1, cm: 0.1, m: 0.001, in: 1 / 25.4, inch: 1 / 25.4, ft: 1 / 304.8 };
const PT_PER_PAPER_MM = 72 / 25.4;
const SNAP_PX = 10;        // snap radius in screen pixels
const GREEP_PX = 8;        // grip pick radius in screen pixels
const SLEEP_PX = 6;        // a press that moves this far is a drag

/** Page points per real millimetre at (x, y): the sheet's scale, else 1:denom. */
export function puntenPerMm(api, page, x, y, denom = 10) {
  try {
    const s = api.getScaleAt?.(page, x, y);
    const f = s && PER_MM[String(s.unit || '').toLowerCase()];
    if (s && f && s.pixelsPerUnit > 0) return { ptsPerMm: s.pixelsPerUnit * f, scaleText: 'sheet scale' };
  } catch {}
  return { ptsPerMm: PT_PER_PAPER_MM / denom, scaleText: `1:${denom}` };
}

// ── Placing state ──────────────────────────────────────────────────────────

let plaatsing = null;   // the element being placed (tool overrides)
let lidStart = null;    // first click of a member: { x, y, page, druk: { cx, cy } | null }
let laatste = null;     // last pointer: { cx, cy, ctrlKey, shiftKey, metaKey }
let richting = null;    // locked direction with Shift / Ctrl: { stap, hoek }
let geselecteerd = null;   // id of the selected Seed43 element
let greepSleep = null;  // grip being dragged: { id, soort, page }

const isPlaatsTool = (api) => ONZE.includes(api.getCurrentTool?.());

function snapRadius(page, s) {
  return SNAP_PX / (zoomVan(page) || s || 1.5);
}

/** A placing point: a Seed43 grip near the raw point wins, else the host's
 *  own snapped point (PDF content, grid), else the raw point. */
function kiesPunt(api, page, x, y, state, uitsluit) {
  const snap = zoekSnap(api, page, x, y, snapRadius(page, state?.docScale), uitsluit);
  if (snap) return { x: snap.x, y: snap.y, snap };
  const hx = state?.startX, hy = state?.startY;
  if (Number.isFinite(hx) && Number.isFinite(hy) && Math.hypot(hx - x, hy - y) < snapRadius(page, state?.docScale) * 1.5) return { x: hx, y: hy, snap: null };
  return { x, y, snap: null };
}

/**
 * Square to `vast` (Ctrl / Shift), but still snapping: with a snap point near
 * the pointer, the end stops where a perpendicular from that point meets the
 * square line.
 */
function haaksMetSnap(api, page, vast, x, y, stap, radius, uitsluit) {
  // The direction locks to the way the pointer first moves once Shift or
  // Ctrl is held, and stays until the keys are let go (Tab turns it).
  if (!richting || richting.stap !== stap) {
    if (Math.hypot(x - vast.x, y - vast.y) < radius) return { ...haaks(vast.x, vast.y, x, y, stap), snap: null, haaks: stap };
    const r = (stap * Math.PI) / 180;
    richting = { stap, hoek: Math.round(Math.atan2(y - vast.y, x - vast.x) / r) * r };
  }
  const ux = Math.cos(richting.hoek), uy = Math.sin(richting.hoek);
  // Along the locked line, either way from the fixed point.
  const t0 = (x - vast.x) * ux + (y - vast.y) * uy;
  const s = zoekSnap(api, page, x, y, radius, uitsluit);
  if (!s) return { x: vast.x + ux * t0, y: vast.y + uy * t0, snap: null, haaks: stap };
  const t = (s.x - vast.x) * ux + (s.y - vast.y) * uy;
  return { x: vast.x + ux * t, y: vast.y + uy * t, snap: { ...s, tekst: `${s.tekst} (square)` }, haaks: stap };
}

/** Tab: turn the locked direction to the next one (90, or 45 with both keys). */
function draaiRichting() {
  if (!richting) return false;
  richting.hoek += (richting.stap * Math.PI) / 180;
  return true;
}

/** What a placed element takes over from the placing choice: pieces, label text, line position, label. */
function extraVan(keuze) {
  const x = {};
  if (keuze.enkel) x.enkel = kopie(keuze.enkel);
  if (keuze.aantal > 1) x.aantal = keuze.aantal;
  if (keuze.labelTekst) x.labelTekst = keuze.labelTekst;
  if (keuze.catId) x.catId = keuze.catId;
  if (keuze.label === false) x.label = false;
  if (keuze.showLength === false) x.showLength = false;
  return x;
}

function nieuwElement(api, soort, keuze, page, x, y) {
  const schaal = puntenPerMm(api, page, x, y);
  if (soort === SECTIE) return { category: keuze.category, shape: keuze.shape, item: kopie(keuze.item), rotation: keuze.rotation || 0, label: true, ...extraVan(keuze), ...schaal };
  // A bolt group made like a selected one keeps its layout.
  if (keuze.sjabloon) return { ...kopie(keuze.sjabloon), rotation: keuze.rotation || 0, ...schaal };
  return { bolt: kopie(keuze.item), rows: 2, cols: 2, pitch: 70, gauge: 70, edgeX: 35, edgeY: 35, rotation: keuze.rotation || 0, plate: true,
    view: ['elevation', 'plan'].includes(keuze.view) ? keuze.view : 'face', grip: 20, along: 'gauge', ...schaal };
}

function plaatsingsType(api, soort) {
  const maat = soort === SECTIE ? sectieMaat : boutMaat;
  return {
    drawMode: 'click',
    cursor: 'copy',
    create(x, y, _x2, _y2, e, state) {
      const keuze = state?.toolOverrides?.seed43Element;
      if (!keuze?.item) return null;
      const page = state.currentPage || 1;
      meldStaat(state); ijk(e, x, y, page);
      const p = kiesPunt(api, page, x, y, state);
      const element = nieuwElement(api, soort, keuze, page, p.x, p.y);
      const m = maat(element);
      try { telGebruik(keuze); } catch {}
      return { type: soort, x: p.x - m.w / 2, y: p.y - m.h / 2, width: m.w, height: m.h, element, subject: element.item?.name || element.bolt?.name || '' };
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

function lidAnnotatie(api, keuze, page, a, b) {
  const schaal = puntenPerMm(api, page, a.x, a.y);
  const ann = {
    type: LID, startX: a.x, startY: a.y, endX: b.x, endY: b.y,
    element: { category: keuze.category, shape: keuze.shape, item: kopie(keuze.item), view: keuze.view || 'elevation', label: true,
      ...(keuze.uitlijn && keuze.uitlijn !== 'centre' ? { uitlijn: keuze.uitlijn } : {}), ...extraVan(keuze), ...schaal },
    subject: labelNaam(keuze),
  };
  const bb = lidBounds(ann);
  return { ...ann, x: bb.x, y: bb.y, width: bb.width, height: bb.height };
}

/** Second point of a member: square to the first with Ctrl / Shift, else snapped. */
function tweedePunt(api, page, p1, x, y, mods, state) {
  const stap = haaksStap(mods);
  if (stap) return haaksMetSnap(api, page, p1, x, y, stap, snapRadius(page, state?.docScale));
  return kiesPunt(api, page, x, y, state);
}

/** A member from point A to point B: click A, then click B (or press at A
 *  and release at B), with a live preview in between. */
function lidType(api) {
  return {
    drawMode: 'click',
    cursor: 'crosshair',
    create(x, y, _x2, _y2, e, state) {
      const keuze = state?.toolOverrides?.seed43Element;
      if (!keuze?.item) return null;
      const page = state.currentPage || 1;
      meldStaat(state); ijk(e, x, y, page);
      if (!lidStart || lidStart.page !== page) {
        const p = kiesPunt(api, page, x, y, state);
        lidStart = { x: p.x, y: p.y, page, druk: e ? { cx: e.clientX, cy: e.clientY } : null };
        herteken(api);
        return null;
      }
      const p2 = tweedePunt(api, page, lidStart, x, y, e, state);
      if (Math.hypot(p2.x - lidStart.x, p2.y - lidStart.y) < 1) return null;   // same point: wait for B
      const { a, b } = lidPunten(keuze.greep, lidStart, p2);
      lidStart = null;
      richting = null;
      herteken(api);
      try { telGebruik(keuze); } catch {}
      return lidAnnotatie(api, keuze, page, a, b);
    },
    preview(ctx, sx, sy, cx, cy, state) {
      const keuze = state?.toolOverrides?.seed43Element;
      if (!keuze?.item || Math.hypot(cx - sx, cy - sy) < 2) return;
      tekenLid(ctx, lidAnnotatie(api, keuze, state.currentPage || 1, { x: sx, y: sy }, { x: cx, y: cy }));
    },
    render(ctx, ann) { tekenLid(ctx, ann); },
    getBounds(ann) { return ann.element ? lidBounds(ann) : { x: ann.x, y: ann.y, width: ann.width || 0, height: ann.height || 0 }; },
    hitTest(px, py, ann, tol = 2) {
      if (!ann.element) return false;
      // A bracing line: the line or its tag text.
      if (ann.element.shape === 'bracing') return bracingRaak(px, py, ann, tol);
      const g = lidGeometrie(ann);
      const t = (px - g.ax) * g.ux + (py - g.ay) * g.uy;
      const n = Math.abs((px - g.ax) * g.nx + (py - g.ay) * g.ny);
      return t >= -tol && t <= g.L + tol && n <= (g.p.breedte * g.k) / 2 + tol;
    },
  };
}

// ── Live layer: preview, snap marker, grips ────────────────────────────────

function geselecteerdeAnn(api) {
  if (!geselecteerd) return null;
  return api.getAnnotations().find((a) => a.id === geselecteerd && ONZE.includes(a.type)) || null;
}

/** The element with one grip moved to (x, y): the changes for the host. */
function greepWijziging(ann, soort, x, y) {
  if (ann.type === LID) {
    const c = {};
    if (soort === 'A') Object.assign(c, { startX: x, startY: y });
    else if (soort === 'B') Object.assign(c, { endX: x, endY: y });
    else {
      const dx = x - (ann.startX + ann.endX) / 2, dy = y - (ann.startY + ann.endY) / 2;
      Object.assign(c, { startX: ann.startX + dx, startY: ann.startY + dy, endX: ann.endX + dx, endY: ann.endY + dy });
    }
    const b = lidBounds({ ...ann, ...c });
    return Object.assign(c, { x: b.x, y: b.y, width: b.width, height: b.height });
  }
  const m = (ann.type === SECTIE ? sectieMaat : boutMaat)(ann.element);
  return { x: x - m.w / 2, y: y - m.h / 2 };
}

/** Where a dragged grip goes: snapped, or square to the fixed end with Ctrl / Shift. */
function greepPunt(api, ann, soort, p) {
  const stap = haaksStap(laatste);
  if (stap && ann.type === LID && (soort === 'A' || soort === 'B')) {
    const vast = soort === 'A' ? { x: ann.endX, y: ann.endY } : { x: ann.startX, y: ann.startY };
    return haaksMetSnap(api, ann.page, vast, p.x, p.y, stap, SNAP_PX / p.s, ann.id);
  }
  const snap = zoekSnap(api, ann.page, p.x, p.y, SNAP_PX / p.s, ann.id);
  return snap ? { x: snap.x, y: snap.y, snap } : { x: p.x, y: p.y, snap: null };
}

function tekenTekst(c, s, x, y, tekst) {
  c.save();
  c.font = `${11 / s}px Arial, sans-serif`;
  c.textBaseline = 'top';
  const w = c.measureText(tekst).width, pad = 3 / s;
  c.fillStyle = 'rgba(17, 24, 39, 0.78)';
  c.fillRect(x + 14 / s - pad, y + 14 / s - pad, w + 2 * pad, 11 / s + 2 * pad);
  c.fillStyle = '#fff';
  c.fillText(tekst, x + 14 / s, y + 14 / s);
  c.restore();
}

function herteken(api) {
  const p = laatste ? naarPagina({ clientX: laatste.cx, clientY: laatste.cy }) : null;
  const tool = api.getCurrentTool?.();

  // Dragging a grip of the selected element
  if (greepSleep) {
    const ann = api.getAnnotations().find((a) => a.id === greepSleep.id);
    if (!ann || !p || p.page !== ann.page) { teken(ann?.page || greepSleep.page, () => {}); return; }
    const q = greepPunt(api, ann, greepSleep.soort, p);
    const nieuw = { ...ann, ...greepWijziging(ann, greepSleep.soort, q.x, q.y) };
    teken(ann.page, (c, s) => {
      c.globalAlpha = 0.75;
      (ann.type === LID ? tekenLid : ann.type === SECTIE ? tekenSectie : tekenBoutGroep)(c, nieuw);
      c.globalAlpha = 1;
      tekenGrepen(c, s, grepen(nieuw), null);
      tekenSnap(c, s, q.snap);
      if (ann.type === LID) {
        const L = Math.hypot(nieuw.endX - nieuw.startX, nieuw.endY - nieuw.startY) / (ann.element.ptsPerMm || 1);
        tekenTekst(c, s, q.x, q.y, `${GREEP_NAAM[greepSleep.soort]}  L=${Math.round(L)}`);
      }
    });
    return;
  }

  // Placing an element
  if (ONZE.includes(tool) && plaatsing?.item) {
    if (lidStart && tool !== LID) lidStart = null;
    if (!p) { teken(lidStart?.page, lidStart ? (c, s) => tekenSnap(c, s, { ...lidStart, soort: 'A' }) : null); return; }
    const page = p.page;
    teken(page, (c, s) => {
      if (tool === LID) {
        if (lidStart && lidStart.page === page) {
          const q = tweedePunt(api, page, lidStart, p.x, p.y, laatste, { docScale: s });
          const { a, b } = lidPunten(plaatsing.greep, lidStart, q);
          if (Math.hypot(b.x - a.x, b.y - a.y) > 0.5) {
            c.globalAlpha = 0.8;
            tekenLid(c, lidAnnotatie(api, plaatsing, page, a, b));
            c.globalAlpha = 1;
          }
          tekenElastiek(c, s, lidStart, q);
          tekenSnap(c, s, q.snap);
          const L = Math.hypot(b.x - a.x, b.y - a.y) / (puntenPerMm(api, page, a.x, a.y).ptsPerMm || 1);
          const naam = plaatsing.greep === 'B' ? 'point A' : plaatsing.greep === 'mid' ? 'an end' : 'point B';
          const lijn = plaatsing.uitlijn && plaatsing.uitlijn !== 'centre' ? `  J: ${UITLIJNING[plaatsing.uitlijn]}` : '  J: centre';
          tekenTekst(c, s, q.x, q.y, `L=${Math.round(L)}  Click ${naam}${q.haaks ? '  Tab: turn' : '  (Ctrl/Shift: square)'}${lijn}`);
        } else {
          const q = kiesPunt(api, page, p.x, p.y, { docScale: s });
          tekenSnap(c, s, q.snap);
          const naam = plaatsing.greep === 'B' ? 'point B' : plaatsing.greep === 'mid' ? 'the midpoint' : 'point A';
          tekenTekst(c, s, q.x, q.y, `Click ${naam} of ${labelNaam(plaatsing)}  (J: ${(UITLIJNING[plaatsing.uitlijn || 'centre'] || 'Centre').toLowerCase()})`);
        }
      } else {
        const q = kiesPunt(api, page, p.x, p.y, { docScale: s });
        const soort = tool === SECTIE ? SECTIE : BOUTEN;
        const element = nieuwElement(api, soort, plaatsing, page, q.x, q.y);
        const m = (soort === SECTIE ? sectieMaat : boutMaat)(element);
        c.globalAlpha = 0.55;
        (soort === SECTIE ? tekenSectie : tekenBoutGroep)(c, { x: q.x - m.w / 2, y: q.y - m.h / 2, element });
        c.globalAlpha = 1;
        tekenSnap(c, s, q.snap);
      }
    });
    return;
  }
  if (lidStart && !ONZE.includes(tool)) lidStart = null;

  // Grips of the selected element
  const ann = tool === 'select' ? geselecteerdeAnn(api) : null;
  if (!ann) { teken(null); return; }
  let actief = null;
  if (p && p.page === ann.page) {
    let best = GREEP_PX / p.s;
    for (const g of grepen(ann)) { const d = Math.hypot(g.x - p.x, g.y - p.y); if (d <= best) { best = d; actief = g; } }
  }
  teken(ann.page, (c, s) => tekenGrepen(c, s, grepen(ann), actief));
}

let lusAan = false;
function startLus(api) {
  if (lusAan) return;
  lusAan = true;
  const stap = () => {
    if (!lusAan) return;
    const bezig = greepSleep || lidStart || geselecteerd || (isPlaatsTool(api) && laatste);
    herteken(api);
    if (bezig) requestAnimationFrame(stap); else lusAan = false;
  };
  requestAnimationFrame(stap);
}

function onthoudAanwijzer(e) {
  laatste = { cx: e.clientX, cy: e.clientY, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, metaKey: e.metaKey };
}

function luisteraars(api) {
  const beweeg = (e) => {
    onthoudAanwijzer(e);
    if (greepSleep) { e.stopPropagation(); e.preventDefault(); }
    startLus(api);
  };
  const druk = (e) => {
    if (e.button !== 0) return;
    onthoudAanwijzer(e);
    if (api.getCurrentTool?.() !== 'select') return;
    const p = naarPagina(e);
    if (!p) return;
    const ann = geselecteerdeAnn(api);
    if (ann && ann.page === p.page && !e.ctrlKey && !e.altKey) {
      let best = GREEP_PX / p.s, greep = null;
      for (const g of grepen(ann)) { const d = Math.hypot(g.x - p.x, g.y - p.y); if (d <= best) { best = d; greep = g; } }
      if (greep) {
        greepSleep = { id: ann.id, soort: greep.soort, page: ann.page };
        e.stopImmediatePropagation(); e.preventDefault();
        startLus(api);
        return;
      }
    }
    // A press elsewhere on the sheet: the host reports the new selection
    // (the same element again if it is pressed).
    geselecteerd = null;
  };
  const los = (e) => {
    if (greepSleep) {
      e.stopImmediatePropagation(); e.preventDefault();
      onthoudAanwijzer(e);
      const sl = greepSleep;
      greepSleep = null;
      const ann = api.getAnnotations().find((a) => a.id === sl.id);
      const p = naarPagina(e);
      if (ann && p && p.page === ann.page) {
        const q = greepPunt(api, ann, sl.soort, p);
        try { api.applyAnnotationBatch([{ op: 'update', id: ann.id, changes: greepWijziging(ann, sl.soort, q.x, q.y) }]); api.redrawAnnotations?.(); }
        catch (err) { console.warn('[seed43] grip drag:', err); }
      }
      startLus(api);
      return;
    }
    // Press at A, drag, release at B: place the member in one gesture.
    if (lidStart?.druk && api.getCurrentTool?.() === LID && plaatsing?.item) {
      const d = lidStart.druk;
      lidStart.druk = null;
      if (Math.hypot(e.clientX - d.cx, e.clientY - d.cy) < SLEEP_PX) return;   // a click: wait for B
      const p = naarPagina(e);
      if (!p || p.page !== lidStart.page) return;
      const q = tweedePunt(api, p.page, lidStart, p.x, p.y, e, { docScale: p.s });
      const { a, b } = lidPunten(plaatsing.greep, lidStart, q);
      const ann = lidAnnotatie(api, plaatsing, p.page, a, b);
      lidStart = null;
      richting = null;
      try { api.applyAnnotationBatch([{ op: 'create', annotation: { ...ann, page: p.page, seed43Element: plaatsing } }]); api.redrawAnnotations?.(); telGebruik(plaatsing); }
      catch (err) { console.warn('[seed43] member not placed:', err); }
      startLus(api);
    }
  };
  const toets = (e) => {
    if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Meta') {
      if (laatste) { laatste.ctrlKey = e.ctrlKey; laatste.shiftKey = e.shiftKey; laatste.metaKey = e.metaKey; }
      // Keys let go (or the other one added): the direction is free again.
      if (e.type === 'keyup' || haaksStap(e) !== richting?.stap) richting = null;
      startLus(api);
      return;
    }
    if (e.type !== 'keydown') return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName) || t.closest?.('.s43d-lade, .s43l, .s43v'))) return;
    // Tab: the locked direction turns (vertical / horizontal, or 45s).
    if (e.key === 'Tab' && (lidStart || greepSleep) && draaiRichting()) {
      e.preventDefault(); e.stopPropagation();
      startLus(api);
      return;
    }
    // J: where the line sits on a member being placed (centre or an edge).
    if ((e.key === 'j' || e.key === 'J') && !e.ctrlKey && !e.altKey && !e.metaKey && api.getCurrentTool?.() === LID && plaatsing && plaatsing.shape !== 'bracing') {
      const volg = Object.keys(UITLIJNING);
      plaatsing.uitlijn = volg[(volg.indexOf(plaatsing.uitlijn || 'centre') + 1) % volg.length];
      try { localStorage.setItem(UITLIJN_OPSLAG, plaatsing.uitlijn); } catch {}
      api.setToolOverrides({ seed43Element: plaatsing });
      e.preventDefault(); e.stopPropagation();
      startLus(api);
      return;
    }
    // Enter: place another of the selected element (like Create Similar).
    if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && geselecteerd && !lidStart && !greepSleep
        && !isPlaatsTool(api) && maakZoals(api)) {
      e.preventDefault(); e.stopPropagation();
      return;
    }
    if (e.key === 'Escape') {
      if (greepSleep) { greepSleep = null; e.stopPropagation(); }
      lidStart = null;
      richting = null;
      startLus(api);
    }
  };
  return { beweeg, druk, los, toets };
}

// ── Properties panels ──────────────────────────────────────────────────────

const INVOER = '';

// Header icons in the Properties table.
const ICOON_SECTIE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 4h14M5 20h14M12 4v16"/></svg>';
const ICOON_LID = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="9" width="18" height="6" rx="1"/><path d="M3 12h18" opacity=".5"/></svg>';
const ICOON_BOUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><circle cx="8" cy="16" r="2.5"/><circle cx="16" cy="16" r="2.5"/></svg>';
const ICOON_BRACING = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 16h18" stroke-dasharray="3 2"/><path d="M7 9h10"/></svg>';

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
    const el = formulier();
    if (!e) return el;
    kop(el, e.item.name, `${e.category} section, ${e.scaleText || ''}`, '#1d4ed8', ICOON_SECTIE);
    wisselRijen(el, e, (c, it) => {
      werkBij(ann, update, sectieMaat, (x) => {
        x.item = kopie(it); delete x.enkel;
        if (BEVESTIGINGEN.includes(c.shape)) x.item.view = e.item?.view || 'section';
        x.category = c.name; x.shape = c.shape; x.catId = c.id;
        metAantal(x, e.aantal || 1);
      });
      update('subject', it.name);
    });
    groep(el, 'Display');
    if (!BEVESTIGINGEN.includes(e.shape)) {
      // Section, or the same element as a member in elevation or plan.
      veld(el, 'View', keuze([['section', 'Section (end on)'], ['elevation', 'Elevation (member)'], ['plan', 'Plan (member)']], 'section',
        (v) => { if (v !== 'section') wisselVorm(ann, v); }));
    }
    veld(el, 'Rotation °', hoekVeld(e.rotation || 0, (v) => werkBij(ann, update, sectieMaat, (x) => { x.rotation = v; })));
    schaalVeld(el, ann, update, sectieMaat);
    veld(el, 'Label', keuze([['1', 'Show'], ['0', 'Hide']], e.label === false ? '0' : '1',
      (v) => werkBij(ann, update, sectieMaat, (x) => { x.label = v === '1'; })));
    if (AANTAL_VORMEN.includes(e.shape)) {
      veld(el, 'Members', keuze([1, 2, 3, 4, 5, 6].map((n) => [String(n), n === 1 ? 'Single' : `${n} side by side (${n}/)`]), String(e.aantal || 1),
        (v) => ((w) => werkBij(ann, update, sectieMaat, w))((x) => { metAantal(x, Number(v)); })));
    }
    const eigen = document.createElement('input');
    eigen.type = 'text';
    eigen.value = e.labelTekst || '';
    eigen.placeholder = labelNaam({ ...e, labelTekst: '' });
    eigen.title = 'Your own label, e.g. DS for a double stud. Empty: the automatic label.';
    eigen.addEventListener('change', () => ((w) => werkBij(ann, update, sectieMaat, w))((x) => { const v = eigen.value.trim(); if (v) x.labelTekst = v; else delete x.labelTekst; }));
    veld(el, 'Label text', eigen);

    if (BEVESTIGINGEN.includes(e.shape)) {
      veld(el, 'View', keuze([['section', 'Section (end on)'], ['elevation', 'Elevation (side on)']], e.item.view === 'elevation' ? 'elevation' : 'section',
        (v) => werkBij(ann, update, sectieMaat, (x) => { x.item = { ...x.item, view: v }; })));
    }
    if (e.shape === 'rect') {
      // Sawn timber: a cross for a member in section, one diagonal for blocking.
      veld(el, 'Look', keuze([['0', 'Timber (cross)'], ['1', 'Blocking (diagonal)']], e.item.blocking ? '1' : '0',
        (v) => werkBij(ann, update, sectieMaat, (x) => { x.item = { ...x.item }; if (v === '1') x.item.blocking = true; else delete x.item.blocking; })));
    }
    sectieGegevens(el, e.shape, e.item);
    el.appendChild(tip('Drag the centre grip to move it; it snaps to member ends, midpoints and centre lines. Space turns it 90 degrees.'));
    return el;
  };
}

function boutPaneel(api) {
  return (ann, update) => {
    if (!ann) return document.createElement('div');   // the host calls this on deselect too
    const e = ann.element;
    const el = formulier();
    if (!e) return el;
    const g = boutGroep(e);
    kop(el, `${g.rows * g.cols}-${e.bolt?.name || 'bolt'}`, `Bolt group, ${e.scaleText || ''}`, '#0f766e', ICOON_BOUT);
    groep(el, 'Bolt');
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
    // Face (plan) or elevation (side on, through the plies).
    const zij = e.view === 'elevation';
    groep(el, 'View');
    veld(el, 'View', keuze([['face', 'Face (holes)'], ['plan', 'Plan (heads)'], ['elevation', 'Elevation (side on)']], ['elevation', 'plan'].includes(e.view) ? e.view : 'face',
      (v) => { wb((x) => { x.view = v; }); }));
    // Bolt or threaded rod, nuts and washers.
    const o = boutOpties(e);
    groep(el, 'Bolt, nuts and washers');
    veld(el, 'Kind', keuze([['bolt', 'Bolt (hex head)'], ['rod', 'Threaded rod']], o.kind, (v) => wb((x) => { x.kind = v; })));
    veld(el, 'Nuts', keuze(o.kind === 'rod'
      ? [['0', 'None'], ['1', 'One end'], ['2', 'Both ends'], ['1d', 'Double nuts, one end'], ['2d', 'Double nuts, both ends']]
      : [['0', 'None (bolt only)'], ['1', 'Nut'], ['2', 'Double nut']], o.dubbel ? `${o.nuts}d` : String(o.nuts),
      (v) => wb((x) => { x.nuts = v.endsWith('d') ? v : Number(v); })));
    veld(el, 'Ends', keuze([['0', o.kind === 'rod' ? 'As placed' : 'Head on top'], ['1', o.kind === 'rod' ? 'Swapped (other side)' : 'Swapped (nut on top)']],
      o.flip ? '1' : '0', (v) => wb((x) => { x.flip = v === '1'; })));
    veld(el, 'Washers', keuze([['round', 'Round'], ['square', 'Square'], ['none', 'None']], o.washer, (v) => wb((x) => { x.washer = v; })));
    if (o.washer !== 'none') {
      veld(el, 'Washer at', keuze([['nut', 'Nut side only'], ['both', o.kind === 'rod' ? 'Both ends' : 'Under the head too']], o.washerAt,
        (v) => wb((x) => { x.washerAt = v; })));
    }
    if (zij) {
      const z = boutZijaanzicht(e);
      veld(el, 'Grip (mm)', getal(z.grip, (n) => wb((x) => { x.grip = Math.max(1, n); }), 1));
      veld(el, 'Bolts seen', keuze([['gauge', 'Across the gauge (columns)'], ['pitch', 'Along the pitch (rows)']], e.along === 'pitch' ? 'pitch' : 'gauge',
        (v) => wb((x) => { x.along = v; })));
      const lengte = document.createElement('span');
      lengte.textContent = `${z.L} mm (grip + washer + nut + thread)`;
      veld(el, 'Bolt length', lengte);
    }
    groep(el, 'Layout');
    veld(el, 'Rows', getal(g.rows, (n) => wb((x) => { x.rows = Math.max(1, Math.round(n)); })));
    veld(el, 'Columns', getal(g.cols, (n) => wb((x) => { x.cols = Math.max(1, Math.round(n)); })));
    veld(el, 'Pitch (mm)', getal(g.pitch, (n) => wb((x) => { x.pitch = n; }), 5));
    veld(el, 'Gauge (mm)', getal(g.gauge, (n) => wb((x) => { x.gauge = n; }), 5));
    veld(el, 'Edge across', getal(g.ex, (n) => wb((x) => { x.edgeX = n; }), 5));
    veld(el, 'Edge along', getal(g.ey, (n) => wb((x) => { x.edgeY = n; }), 5));
    groep(el, 'Display');
    veld(el, 'Rotation °', hoekVeld(e.rotation || 0, (v) => wb((x) => { x.rotation = v; })));
    veld(el, 'Plate', keuze([['1', 'Show'], ['0', 'Hide']], e.plate === false ? '0' : '1', (v) => wb((x) => { x.plate = v === '1'; })));
    schaalVeld(el, ann, update, boutMaat);
    toonStatus();
    el.appendChild(status);
    el.appendChild(tip('Drag the centre grip to move the group; it snaps to member ends, midpoints and centre lines.'));
    return el;
  };
}

function lidPaneel() {
  return (ann, update) => {
    if (!ann) return document.createElement('div');   // the host calls this on deselect too
    const e = ann.element;
    const el = formulier();
    if (!e) return el;
    const g = lidGeometrie(ann);
    if (e.shape === 'bracing') { bracingPaneel(el, ann, update, e, g); return el; }
    kop(el, e.item.name, `${e.category} member, ${e.view === 'plan' ? 'plan' : 'elevation'}, ${e.scaleText || ''}`, '#1d4ed8', ICOON_LID);
    const zet = (wijzig) => {
      const x = kopie(ann.element); wijzig(x); update('element', x);
      const b = lidBounds(ann); update('x', b.x); update('y', b.y); update('width', b.width); update('height', b.height);
    };
    wisselRijen(el, e, (c, it) => {
      zet((x) => { x.item = kopie(it); delete x.enkel; x.category = c.name; x.shape = c.shape; x.catId = c.id; metAantal(x, e.aantal || 1); });
      update('subject', it.name);
    });
    groep(el, 'Member');
    veld(el, 'View', keuze([['elevation', 'Elevation'], ['plan', 'Plan'], ['section', 'Section (end on)']], e.view || 'elevation',
      (v) => { if (v === 'section') wisselVorm(ann, 'section'); else zet((x) => { x.view = v; }); }));
    const lengte = document.createElement('span');
    lengte.textContent = `${Math.round(g.L / g.k)} mm`;
    veld(el, 'Length', lengte);
    veld(el, 'Line at', keuze(Object.entries(UITLIJNING), e.uitlijn || 'centre', (v) => zet((x) => { if (v === 'centre') delete x.uitlijn; else x.uitlijn = v; })));
    veld(el, 'Label', keuze([['1', 'Name and length'], ['n', 'Name only'], ['0', 'Hide']], e.label === false ? '0' : e.showLength === false ? 'n' : '1',
      (v) => zet((x) => { x.label = v !== '0'; x.showLength = v === '1'; })));
    if (AANTAL_VORMEN.includes(e.shape)) {
      veld(el, 'Members', keuze([1, 2, 3, 4, 5, 6].map((n) => [String(n), n === 1 ? 'Single' : `${n} side by side (${n}/)`]), String(e.aantal || 1),
        (v) => zet((x) => { metAantal(x, Number(v)); })));
    }
    const eigen = document.createElement('input');
    eigen.type = 'text';
    eigen.value = e.labelTekst || '';
    eigen.placeholder = labelNaam({ ...e, labelTekst: '' });
    eigen.title = 'Your own label, e.g. DS for a double stud. Empty: the automatic label.';
    eigen.addEventListener('change', () => zet((x) => { const v = eigen.value.trim(); if (v) x.labelTekst = v; else delete x.labelTekst; }));
    veld(el, 'Label text', eigen);

    const huidig = Math.round(PT_PER_PAPER_MM / (e.ptsPerMm || 1));
    veld(el, 'Scale 1:', getal(huidig, (n) => { if (n > 0) zet((x) => { x.ptsPerMm = PT_PER_PAPER_MM / n; x.scaleText = `1:${n}`; }); }));
    sectieGegevens(el, e.shape, e.item);
    el.appendChild(tip('Drag end A or B to stretch the member (Ctrl/Shift keeps it square), the midpoint to move it; grips snap to other elements. Space turns it 90 degrees about its middle.'));
    return el;
  };
}

// ── Bracing legend tag ──────────────────────────────────────────────────

let laatsteBracing = { ...BRACING_STANDAARD };

function bracingPaneel(el, ann, update, e, g) {
  const it = { ...BRACING_STANDAARD, ...e.item };
  el.style.borderTopColor = '#2563eb';
  kop(el, `${it.tag || 'Bracing'} (${bracingLengte(g.L / g.k, it.round05).tekst})`, `Bracing line, ${e.scaleText || ''}`, '#2563eb', ICOON_BRACING);
  groep(el, 'Identity');
  const zet = (wijzig) => {
    const x = kopie(ann.element);
    x.item = { ...BRACING_STANDAARD, ...x.item };
    wijzig(x.item);
    x.item.name = x.item.tag || 'Bracing';
    laatsteBracing = { ...x.item };
    update('element', x);
    const b = lidBounds({ ...ann, element: x }); update('x', b.x); update('y', b.y); update('width', b.width); update('height', b.height);
  };
  const tag = document.createElement('input');
  tag.value = it.tag || '';
  tag.setAttribute('list', 'seed43-bracing-codes');
  tag.style.cssText = 'width:100%;box-sizing:border-box;';
  if (!document.getElementById('seed43-bracing-codes')) {
    const dl = document.createElement('datalist'); dl.id = 'seed43-bracing-codes';
    for (const c of BRACING_CODES) { const o = document.createElement('option'); o.value = c; dl.appendChild(o); }
    document.body.appendChild(dl);
  }
  tag.addEventListener('change', () => zet((x) => { x.tag = tag.value.trim(); }));
  veld(el, 'Tag', tag);
  const lengte = document.createElement('span');
  lengte.textContent = `${Math.round(g.L / g.k)} mm, shown as ${bracingLengte(g.L / g.k, it.round05).tekst}`;
  veld(el, 'Length', lengte);
  groep(el, 'Tag');
  veld(el, 'Round down to', keuze([['0', '0.01 m'], ['1', '0.05 m']], it.round05 ? '1' : '0', (v) => zet((x) => { x.round05 = v === '1'; })));
  veld(el, 'Layout', keuze([['0', 'TAG (2.81m)'], ['1', 'Tag above length']], it.above ? '1' : '0', (v) => zet((x) => { x.above = v === '1'; })));
  veld(el, 'Side', keuze([['0', 'Normal'], ['1', 'Flipped']], it.flip ? '1' : '0', (v) => zet((x) => { x.flip = v === '1'; })));
  veld(el, 'Both sides', keuze([['0', 'No'], ['1', 'Yes (line each side)']], it.both ? '1' : '0', (v) => zet((x) => { x.both = v === '1'; })));
  groep(el, 'Placement');
  veld(el, 'Wall offset (paper mm)', getal(it.wallOffset, (n) => zet((x) => { x.wallOffset = n; }), 0.5));
  veld(el, 'Tag offset (paper mm)', getal(it.tagOffset, (n) => zet((x) => { x.tagOffset = n; }), 0.5));
  veld(el, 'Tag from end A (mm, 0 = middle)', getal(it.fromEnd, (n) => zet((x) => { x.fromEnd = Math.max(0, n); }), 50));
  const huidig = Math.round(PT_PER_PAPER_MM / (e.ptsPerMm || 1));
  groep(el, 'Scale');
  veld(el, 'Scale 1:', getal(huidig, (n) => { if (n > 0) { const x = kopie(ann.element); x.ptsPerMm = PT_PER_PAPER_MM / n; x.scaleText = `1:${n}`; update('element', x); } }));
  el.appendChild(tip('Drag end A or B to change the braced length (Ctrl/Shift keeps it square). New bracing lines take the last tag and settings.'));
}

/** Arm the bracing line tool: click A, then B along the braced wall. */
export function plaatsBracing(api) {
  const item = { ...laatsteBracing, name: laatsteBracing.tag || 'Bracing' };
  plaatsing = { category: 'Bracing', shape: 'bracing', item, view: 'elevation', rotation: 0, greep: 'A' };
  lidStart = null;
  api.setTool(LID);
  api.setToolOverrides({ seed43Element: plaatsing });
  startLus(api);
}

// ── Space bar: turn the selected element (or the one being placed) ────────

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
        startLus(api);
      }
      return;
    }
    if (geselecteerd && draaiGeselecteerd(api, stap)) { e.preventDefault(); e.stopPropagation(); }
  };
}

let toets = null;
let apiRef = null;   // for forms that change an element's kind

/**
 * Swap a section for a member in elevation or plan, or a member for a
 * section. The app cannot change an annotation's type, so the old one is
 * deleted and the new one created in one batch (one undo step). Same element
 * and scale: a section becomes a 1 m member through its centre, a member a
 * section at its midpoint.
 */
function wisselVorm(ann, naar) {
  const api = apiRef;
  const e = ann?.element;
  if (!api || !e) return;
  const basis = { category: e.category, shape: e.shape, item: kopie(e.item), ptsPerMm: e.ptsPerMm, scaleText: e.scaleText,
    ...extraVan(e), label: e.label !== false };
  let nieuw;
  if (ann.type === SECTIE && (naar === 'elevation' || naar === 'plan')) {
    const cx = ann.x + (ann.width || 0) / 2, cy = ann.y + (ann.height || 0) / 2;
    const half = 500 * (e.ptsPerMm || 1);
    const lid = { type: LID, startX: cx - half, startY: cy, endX: cx + half, endY: cy, element: { ...basis, view: naar }, subject: e.item?.name || '' };
    const bb = lidBounds(lid);
    nieuw = { ...lid, x: bb.x, y: bb.y, width: bb.width, height: bb.height };
  } else if (ann.type === LID && naar === 'section') {
    const mx = (ann.startX + ann.endX) / 2, my = (ann.startY + ann.endY) / 2;
    const element = { ...basis, rotation: 0 };
    const m = sectieMaat(element);
    nieuw = { type: SECTIE, x: mx - m.w / 2, y: my - m.h / 2, width: m.w, height: m.h, element, subject: e.item?.name || '' };
  } else return;
  try {
    const uit = api.applyAnnotationBatch([{ op: 'delete', id: ann.id }, { op: 'create', annotation: { ...nieuw, page: ann.page } }]);
    api.redrawAnnotations?.();
    const id = uit?.createdIds?.[0];
    if (id) { try { api.selectAnnotations?.({ ids: [id] }); } catch {} }
  } catch (err) { console.warn('[seed43] change view:', err); }
}
let pointer = null;

export function startElementen(api) {
  apiRef = api;
  // Load the library now, so Change element can list it straight away.
  laadBibliotheek(api).catch(() => {});
  api.registerAnnotationType(SECTIE, plaatsingsType(api, SECTIE));
  api.registerAnnotationType(BOUTEN, plaatsingsType(api, BOUTEN));
  api.registerAnnotationType(LID, lidType(api));
  // The forms go to the Seed43 Properties window (eigenschappen.js).
  registreerEigenschappen(api, SECTIE, sectiePaneel());
  registreerEigenschappen(api, BOUTEN, boutPaneel(api));
  registreerEigenschappen(api, LID, lidPaneel());
  registreerMeervoud(api, ONZE, meervoudPaneel);
  for (const type of ONZE) api.registerSelectionListener(type, (ann) => { geselecteerd = ann?.id || null; startLus(api); });
  stopElementen();
  startOverlay(api);
  toets = spatieToets(api);
  window.addEventListener('keydown', toets, true);
  pointer = luisteraars(api);
  window.addEventListener('pointermove', pointer.beweeg, true);
  window.addEventListener('pointerdown', pointer.druk, true);
  window.addEventListener('pointerup', pointer.los, true);
  window.addEventListener('keydown', pointer.toets, true);
  window.addEventListener('keyup', pointer.toets, true);
}

export function stopElementen() {
  if (toets) window.removeEventListener('keydown', toets, true);
  toets = null;
  if (pointer) {
    window.removeEventListener('pointermove', pointer.beweeg, true);
    window.removeEventListener('pointerdown', pointer.druk, true);
    window.removeEventListener('pointerup', pointer.los, true);
    window.removeEventListener('keydown', pointer.toets, true);
    window.removeEventListener('keyup', pointer.toets, true);
  }
  pointer = null;
  lusAan = false;
  lidStart = null; greepSleep = null;
  stopOverlay();
}

/** Place-by grips for a member: A (click A then B), the midpoint (click the
 *  middle, then an end) or B (click B then A). */
export const PLAATS_GREPEN = [['A', 'End A'], ['mid', 'Midpoint'], ['B', 'End B']];

/** Arm the placing tool for a library item: view 'section' (click), or
 *  'elevation' / 'plan' (click point A, then point B). Bolts: click.
 *  greep: the grip a member is placed by ('A', 'mid' or 'B'). */
// How often each element is placed: { 'catId|name': { n, laatst } }. The
// Elements tab lists the 20 most used when its search is empty.
const GEBRUIK = 'seed43.library.gebruik';
export function leesGebruik() {
  try { const v = JSON.parse(localStorage.getItem(GEBRUIK) || 'null'); if (v && typeof v === 'object') return v; } catch {}
  return {};
}
function telGebruik(keuze) {
  if (!keuze?.catId || !keuze.item?.name) return;
  const g = leesGebruik();
  const k = `${keuze.catId}|${keuze.item.name}`;
  g[k] = { n: (g[k]?.n || 0) + 1, laatst: Date.now() };
  // Keep it small: the 200 most used.
  const sleutels = Object.keys(g);
  if (sleutels.length > 200) {
    sleutels.sort((a, b) => (g[b].n - g[a].n) || (g[b].laatst - g[a].laatst)).slice(200).forEach((s) => delete g[s]);
  }
  try { localStorage.setItem(GEBRUIK, JSON.stringify(g)); } catch {}
}

const UITLIJN_OPSLAG = 'seed43.uitlijn';
function leesUitlijn() {
  try { const v = localStorage.getItem(UITLIJN_OPSLAG); return UITLIJNING[v] ? v : 'centre'; } catch { return 'centre'; }
}

/**
 * Enter on a selected Seed43 element: start placing another one like it, the
 * same element, view, pieces, label and line position (Create Similar).
 */
function maakZoals(api) {
  const ann = api.getAnnotations?.().find((a) => a.id === geselecteerd && ONZE.includes(a.type));
  const e = ann?.element;
  if (!e) return false;
  if (ann.type === LID && e.shape === 'bracing') {
    laatsteBracing = { ...BRACING_STANDAARD, ...(e.item || {}) };
    plaatsBracing(api);
    return true;
  }
  if (ann.type === BOUTEN) {
    plaatsing = { category: 'Bolts', shape: 'bolt', item: kopie(e.bolt), view: e.view, rotation: e.rotation || 0, greep: 'A', sjabloon: kopie(e) };
  } else {
    plaatsing = {
      category: e.category, shape: e.shape, item: kopie(e.item), view: ann.type === SECTIE ? 'section' : (e.view || 'elevation'),
      rotation: ann.type === SECTIE ? (e.rotation || 0) : 0, greep: 'A', uitlijn: e.uitlijn || leesUitlijn(), ...extraVan(e),
    };
  }
  lidStart = null;
  richting = null;
  api.setTool(ann.type);
  api.setToolOverrides({ seed43Element: plaatsing });
  startLus(api);
  return true;
}

export function plaats(api, cat, it, view = 'section', greep = 'A') {
  // Fixings are placed by a click in either view; the view sets their look.
  const fixing = BEVESTIGINGEN.includes(cat.shape);
  const soort = cat.kind === 'bolt' ? BOUTEN : (view === 'section' || fixing) ? SECTIE : LID;
  const item = kopie(it);
  if (fixing) item.view = view === 'section' ? 'section' : 'elevation';
  plaatsing = { category: cat.name, catId: cat.id, shape: cat.shape, item, view: fixing ? 'section' : view, rotation: 0, greep: ['A', 'mid', 'B'].includes(greep) ? greep : 'A',
    uitlijn: leesUitlijn() };
  richting = null;
  lidStart = null;
  api.setTool(soort);
  api.setToolOverrides({ seed43Element: plaatsing });
  startLus(api);
}

// ── Several Seed43 items selected: one shared form ─────────────────────────

/** The new element and bounds of `ann` after `wijzig(element)`, in place. */
function herzien(ann, wijzig) {
  const element = kopie(ann.element);
  wijzig(element, ann);
  if (ann.type === LID) {
    const b = lidBounds({ ...ann, element });
    return { element, x: b.x, y: b.y, width: b.width, height: b.height };
  }
  const maat = ann.type === SECTIE ? sectieMaat : boutMaat;
  const oud = maat(ann.element);
  const cx = ann.x + oud.w / 2, cy = ann.y + oud.h / 2;
  const m = maat(element);
  return { element, x: cx - m.w / 2, y: cy - m.h / 2, width: m.w, height: m.h };
}

/** A list with 'Mixed' first when the items differ. */
function gedeeld(waarden, opties, wijzig) {
  const een = waarden.every((v) => v === waarden[0]);
  const lijst = een ? opties : [['', 'Mixed'], ...opties];
  return keuze(lijst, een ? waarden[0] : '', (v) => { if (v !== '') wijzig(v); });
}

function meervoudPaneel(api, anns, opnieuw) {
  const el = formulier();
  const telSoort = (t) => anns.filter((a) => a.type === t).length;
  const delen = [[SECTIE, 'section'], [LID, 'member'], [BOUTEN, 'bolt group']]
    .map(([t, n]) => [telSoort(t), n]).filter(([n]) => n).map(([n, w]) => `${n} ${w}${n > 1 ? 's' : ''}`);
  kop(el, `${anns.length} elements`, `${delen.join(', ')}. Changes apply to all of them.`, '#1d4ed8',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1" opacity=".5"/></svg>');
  const pas = (wijzig) => {
    const ops = anns.map((a) => ({ op: 'update', id: a.id, changes: herzien(a, wijzig) }));
    try { api.applyAnnotationBatch(ops); api.redrawAnnotations?.(); } catch (err) { console.warn('[seed43] several:', err); }
    opnieuw();
  };

  groep(el, 'Shared');
  // Scale: typed in, applied to all.
  const schalen = anns.map((a) => Math.round(PT_PER_PAPER_MM / (a.element.ptsPerMm || 1)));
  const schaal = document.createElement('input');
  schaal.type = 'number'; schaal.step = '1';
  if (schalen.every((v) => v === schalen[0])) schaal.value = schalen[0]; else schaal.placeholder = 'Mixed';
  schaal.addEventListener('change', () => {
    const n = Number(schaal.value);
    if (n > 0) pas((x) => { x.ptsPerMm = PT_PER_PAPER_MM / n; x.scaleText = `1:${n}`; });
  });
  veld(el, 'Scale 1:', schaal);
  veld(el, 'Label', gedeeld(anns.map((a) => (a.element.label === false ? '0' : '1')), [['1', 'Show'], ['0', 'Hide']],
    (v) => pas((x) => { x.label = v === '1'; })));

  const vlak = anns.every((a) => a.type === SECTIE || a.type === BOUTEN);
  if (vlak) {
    const draai = anns.map((a) => a.element.rotation || 0);
    const hoek = hoekVeld(draai.every((v) => v === draai[0]) ? draai[0] : '', (v) => pas((x) => { x.rotation = v; }));
    if (!draai.every((v) => v === draai[0])) hoek.placeholder = 'Mixed';
    veld(el, 'Rotation °', hoek);
  }
  const leden = anns.every((a) => a.type === LID && a.element.shape !== 'bracing');
  if (leden) {
    groep(el, 'Members');
    veld(el, 'View', gedeeld(anns.map((a) => a.element.view || 'elevation'), [['elevation', 'Elevation'], ['plan', 'Plan']],
      (v) => pas((x) => { x.view = v; })));
    veld(el, 'Line at', gedeeld(anns.map((a) => a.element.uitlijn || 'centre'), Object.entries(UITLIJNING),
      (v) => pas((x) => { if (v === 'centre') delete x.uitlijn; else x.uitlijn = v; })));
  }
  if (anns.every((a) => a.type !== BOUTEN && AANTAL_VORMEN.includes(a.element.shape))) {
    groep(el, 'Timber');
    veld(el, 'Members', gedeeld(anns.map((a) => String(a.element.aantal || 1)),
      [1, 2, 3, 4, 5, 6].map((n) => [String(n), n === 1 ? 'Single' : `${n} side by side (${n}/)`]),
      (v) => pas((x) => { metAantal(x, Number(v)); })));
  }
  if (anns.every((a) => a.type !== BOUTEN)) {
    const teksten = anns.map((a) => a.element.labelTekst || '');
    const eigen = document.createElement('input');
    eigen.type = 'text';
    if (teksten.every((v) => v === teksten[0])) eigen.value = teksten[0]; else eigen.placeholder = 'Mixed';
    eigen.title = 'Your own label for all of them, e.g. DS. Empty: the automatic labels.';
    eigen.addEventListener('change', () => { const v = eigen.value.trim(); pas((x) => { if (v) x.labelTekst = v; else delete x.labelTekst; }); });
    veld(el, 'Label text', eigen);
  }
  el.appendChild(tip('Select one element to see all its properties.'));
  return el;
}
