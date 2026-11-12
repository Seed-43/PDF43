// The Element Library window: browse the library like a family browser
// (filter and category tree on the left, search across the top, a grid of
// to-scale previews or the editable table in the middle, details on the
// right), edit and save it like a CAD block library, and place sections,
// members and bolt groups from it.

import { openLink, bibliotheekVerzoekUrl } from '../extern.js';
import {
  laadBibliotheek, bewaarBibliotheek, standaardBibliotheek, geldigeBibliotheek, nieuweStandaardCategorieen,
  groepVan, regioVan, SOORTEN, VORMEN,
} from './store.js';
import { plaats, PLAATS_GREPEN } from './elements.js';
import { tekenVoorbeeld, sectieVorm, isHout } from './draw.js';

const kopie = (x) => JSON.parse(JSON.stringify(x));
const UI_OPSLAG = 'seed43.library.ui';
const GROEP_VOLGORDE = ['Steel', 'Timber', 'Fixings', 'Bolts', 'Reference tables'];

// Countries (regions): their order in Browse and which ones load. Unticked
// countries are left out of Browse, search and the counts; elements already
// placed on a sheet are not affected.
const REGIO_OPSLAG = 'seed43.library.regions';
export function leesRegios() {
  try {
    const v = JSON.parse(localStorage.getItem(REGIO_OPSLAG) || 'null');
    if (v && typeof v === 'object') return { order: Array.isArray(v.order) ? v.order : [], off: Array.isArray(v.off) ? v.off : [] };
  } catch {}
  return { order: [], off: [] };
}
function bewaarRegios(v) {
  try { localStorage.setItem(REGIO_OPSLAG, JSON.stringify(v)); } catch {}
}
/** Every country in the library, in the user's order (new ones alphabetically at the end). */
export function regioVolgorde(lib, inst = leesRegios()) {
  const alle = [...new Set(lib.categories.map((c) => regioVan(c)))];
  const plek = (r) => { const i = inst.order.indexOf(r); return i < 0 ? 1e6 : i; };
  return alle.sort((a, b) => (plek(a) - plek(b)) || a.localeCompare(b));
}

const SOORT_MEERVOUD = { section: 'Sections', bolt: 'Bolts', table: 'Tables' };

// ── Styles (once, scoped under .s43l) ──────────────────────────────────────

const CSS = `
.s43l-achter{position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:3000;display:flex;align-items:center;justify-content:center;}
.s43l{--bg:var(--theme-app-menu-bg,#fff);--tx:var(--theme-app-menu-text,#1f2328);--rand:var(--theme-app-menu-sidebar-border,#c8ccd1);
  --lijn:var(--theme-app-menu-divider,#e3e5e8);--hover:var(--theme-app-menu-item-hover,#eef2f7);--acc:var(--theme-accent,#0078d7);
  --vlak:var(--hover);--vlak:color-mix(in srgb,var(--tx) 4%,var(--bg));--zacht:color-mix(in srgb,var(--tx) 60%,var(--bg));
  width:min(1320px,97vw);height:min(840px,94vh);display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;grid-template-columns:minmax(0,1fr);background:var(--bg);color:var(--tx);
  border:1px solid var(--rand);border-radius:8px;box-shadow:0 18px 50px rgba(0,0,0,.35);font-size:12px;overflow:hidden;font-family:inherit;}
.s43l *{box-sizing:border-box;}
.s43l button{font:inherit;color:inherit;background:var(--bg);border:1px solid var(--rand);border-radius:5px;padding:4px 10px;cursor:pointer;line-height:1.3;}
.s43l button:hover:not(:disabled){background:var(--hover);}
.s43l button:disabled{opacity:.45;cursor:default;}
.s43l button.prim{background:var(--acc);border-color:var(--acc);color:#fff;}
.s43l button.prim:hover:not(:disabled){filter:brightness(1.08);background:var(--acc);}
.s43l button.ikoon{padding:3px 7px;min-width:28px;}
.s43l button.aan{background:var(--hover);border-color:var(--acc);}
.s43l input,.s43l select,.s43l textarea{font:inherit;color:inherit;background:var(--bg);border:1px solid var(--rand);border-radius:5px;padding:3px 6px;}
.s43l input:focus,.s43l select:focus,.s43l textarea:focus,.s43l button:focus-visible,.s43l .s43l-tegel:focus-visible{outline:2px solid var(--acc);outline-offset:-1px;}
.s43l-kop{display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid var(--lijn);}
.s43l-titel{font-size:14px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.s43l-titel span{font-weight:400;color:var(--zacht);margin-left:6px;}
.s43l-balk{display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--lijn);background:var(--vlak);flex-wrap:wrap;}
.s43l-nav{display:flex;gap:4px;}
.s43l-kruimel{display:flex;align-items:center;gap:4px;min-width:0;flex:0 1 auto;white-space:nowrap;overflow:hidden;}
.s43l-kruimel a{cursor:pointer;color:var(--acc);text-decoration:none;}
.s43l-kruimel a:hover{text-decoration:underline;}
.s43l-kruimel b{font-weight:600;}
.s43l-zoek{flex:1 1 280px;position:relative;min-width:180px;}
.s43l-zoek input{width:100%;font-size:14px;padding:7px 10px 7px 32px;border-radius:7px;}
.s43l-zoek svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);opacity:.55;pointer-events:none;}
.s43l-aantal{color:var(--zacht);white-space:nowrap;min-width:78px;text-align:right;}
.s43l-midden{display:grid;grid-template-columns:230px minmax(0,1fr) 290px;min-height:0;}
.s43l[data-smal="1"] .s43l-midden{grid-template-columns:230px minmax(0,1fr);}
.s43l[data-smal="1"] .s43l-info{display:none;}
.s43l[data-smal="1"][data-info="1"] .s43l-info{display:flex;position:absolute;right:0;top:0;bottom:0;width:min(300px,80%);z-index:2;box-shadow:-6px 0 18px rgba(0,0,0,.18);}
.s43l[data-heel-smal="1"] .s43l-midden{grid-template-columns:minmax(0,1fr);}
.s43l[data-heel-smal="1"] .s43l-zij{display:none;}
.s43l[data-heel-smal="1"][data-zij="1"] .s43l-zij{display:flex;position:absolute;left:0;top:0;bottom:0;width:min(250px,85%);z-index:2;box-shadow:6px 0 18px rgba(0,0,0,.18);}
.s43l-midden{position:relative;}
.s43l .alleen-smal{display:none;}
.s43l[data-smal="1"] .alleen-smal.info,.s43l[data-heel-smal="1"] .alleen-smal.zij{display:inline-block;}
.s43l-zij{border-right:1px solid var(--lijn);display:flex;flex-direction:column;min-height:0;background:var(--bg);}
.s43l-zij-scroll{flex:1;overflow:auto;padding:6px 0 10px;}
.s43l-sectie{padding:10px 14px 4px;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--zacht);}
.s43l-sectie-knop{display:flex;align-items:center;gap:8px;}
.s43l-sectie-knop span{flex:1;}
.s43l-sectie-knop button{text-transform:none;letter-spacing:0;font-weight:500;}
.s43l-regio{display:flex;align-items:center;gap:8px;cursor:default;}
.s43l-regio .naam{flex:1;}
.s43l-greep{cursor:grab;color:var(--zacht);font-size:16px;line-height:1;padding:2px 4px;border-radius:3px;user-select:none;}
.s43l-greep:hover{background:var(--hover);color:var(--acc);}
.s43l-regio.sleept{opacity:.6;}
.s43l-regio.lijn-boven{box-shadow:inset 0 2px 0 var(--acc,#e07b00);}
.s43l-regio.lijn-onder{box-shadow:inset 0 -2px 0 var(--acc,#e07b00);}
.s43l-regio input{margin:0;}
.s43l-regio-tip{padding:8px 14px;font-size:11.5px;color:var(--zacht);}
.s43l-filter{padding:2px 14px 6px;display:flex;flex-direction:column;gap:6px;}
.s43l-chips{display:flex;flex-wrap:wrap;gap:4px;}
.s43l-chip{border-radius:999px !important;padding:2px 9px !important;font-size:11.5px;}
.s43l-chip.aan{background:var(--acc) !important;border-color:var(--acc) !important;color:#fff;}
.s43l-filter select{width:100%;}
.s43l-boom{padding:0 6px;}
.s43l-knoop{display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:5px;cursor:pointer;user-select:none;}
.s43l-knoop:hover{background:var(--hover);}
.s43l-knoop.aan{background:var(--hover);box-shadow:inset 3px 0 0 var(--acc);font-weight:600;}
.s43l-knoop .n{margin-left:auto;color:var(--zacht);font-variant-numeric:tabular-nums;font-weight:400;}
.s43l-knoop .pijl{width:12px;display:inline-block;text-align:center;opacity:.6;transition:transform .12s;}
.s43l-knoop.dicht .pijl{transform:rotate(-90deg);}
.s43l-knoop.kind{padding-left:26px;}
.s43l-zij-voet{padding:8px 10px;border-top:1px solid var(--lijn);display:flex;gap:6px;flex-wrap:wrap;}
.s43l-werk{display:flex;flex-direction:column;min-width:0;min-height:0;}
.s43l-werk-kop{display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid var(--lijn);flex-wrap:wrap;}
.s43l-werk-kop .notitie{flex-basis:100%;color:var(--zacht);font-style:italic;}
.s43l-weergave{margin-left:auto;display:flex;gap:4px;align-items:center;}
.s43l-tegels{flex:1;overflow:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--tegel,128px),1fr));gap:10px;align-content:start;}
.s43l-groepkop{grid-column:1/-1;font-weight:600;padding:6px 2px 0;display:flex;gap:8px;align-items:baseline;border-bottom:1px solid var(--lijn);}
.s43l-groepkop:first-child{padding-top:0;}
.s43l-groepkop span{color:var(--zacht);font-weight:400;}
.s43l-tegel{border:1px solid var(--lijn);border-radius:7px;padding:6px 6px 7px;display:flex;flex-direction:column;align-items:stretch;gap:4px;cursor:pointer;background:var(--bg);outline:none;min-width:0;}
.s43l-tegel:hover{border-color:var(--rand);background:var(--vlak);}
.s43l-tegel.aan{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc);background:var(--hover);}
.s43l-tegel canvas{width:100%;aspect-ratio:4/3;display:block;border-radius:4px;background:var(--vlak);}
.s43l-tegel .naam{font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.s43l-tegel .sub{text-align:center;color:var(--zacht);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.s43l-tegel .let{color:#b45309;}
.s43l-leeg{grid-column:1/-1;padding:40px 10px;text-align:center;color:var(--zacht);}
.s43l-lijst{flex:1;overflow:auto;}
.s43l-lijst table{border-collapse:collapse;width:max-content;min-width:100%;}
.s43l-lijst th{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--rand);padding:5px 6px;text-align:left;font-weight:600;z-index:1;}
.s43l-lijst td{border-bottom:1px solid var(--lijn);padding:0;}
.s43l-lijst td.ro{padding:4px 8px;white-space:nowrap;}
.s43l-lijst tr.aan td{background:var(--hover);}
.s43l-lijst tr:hover td{background:var(--vlak);}
.s43l-lijst td input{border:none;background:transparent;border-radius:0;padding:4px 6px;width:84px;}
.s43l-lijst td input.naam{width:160px;font-weight:600;}
.s43l-rijknoppen{display:flex;flex-wrap:wrap;gap:6px;padding:7px 12px;border-top:1px solid var(--lijn);}
.s43l-info{border-left:1px solid var(--lijn);display:flex;flex-direction:column;min-height:0;background:var(--bg);}
.s43l-info-scroll{flex:1;overflow:auto;padding:12px 14px;}
.s43l-info canvas{width:100%;aspect-ratio:4/3;display:block;border-radius:6px;background:var(--vlak);border:1px solid var(--lijn);}
.s43l-info h3{margin:10px 0 2px;font-size:15px;}
.s43l-info .cat{color:var(--zacht);margin-bottom:8px;}
.s43l-velden{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;font-variant-numeric:tabular-nums;}
.s43l-velden span:nth-child(odd){color:var(--zacht);}
.s43l-bron{margin-top:12px;padding-top:8px;border-top:1px solid var(--lijn);color:var(--zacht);line-height:1.45;}
.s43l-let{margin:8px 0;padding:6px 8px;border-radius:5px;background:rgba(234,179,8,.15);border:1px solid rgba(234,179,8,.45);}
.s43l-voet{display:flex;align-items:center;gap:8px;padding:9px 14px;border-top:1px solid var(--lijn);flex-wrap:wrap;background:var(--vlak);}
.s43l-voet .status{flex:1;min-width:120px;color:var(--zacht);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.s43l-voet .groep{display:flex;align-items:center;gap:6px;}
.s43l-dialoog{position:fixed;inset:0;z-index:3100;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;}
.s43l-dialoog>div{width:min(700px,92vw);padding:14px;display:flex;flex-direction:column;gap:8px;border-radius:8px;}
`;

function zorgVoorCss() {
  // Always rewrite: after a reinstall the page still holds the old sheet.
  let st = document.getElementById('seed43-library-css');
  if (!st) { st = document.createElement('style'); st.id = 'seed43-library-css'; document.head.appendChild(st); }
  if (st.textContent !== CSS) st.textContent = CSS;
}

const IKOON_ZOEK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

function maak(tag, klasse = '', tekst = '') {
  const el = document.createElement(tag);
  if (klasse) el.className = klasse;
  if (tekst) el.textContent = tekst;
  return el;
}

function knop(tekst, actie, klasse = '', titel = '') {
  const b = maak('button', klasse, tekst);
  b.type = 'button';
  if (titel) b.title = titel;
  b.addEventListener('click', actie);
  return b;
}

/** CSV or tab-separated text (pasted from Excel) to rows of cells. */
function leesTabel(tekst) {
  const regels = tekst.replace(/\r/g, '').split('\n').filter((r) => r.trim());
  const sep = regels[0]?.includes('\t') ? '\t' : ',';
  return regels.map((r) => {
    const cellen = []; let cel = '', q = false;
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch === '"') { if (q && r[i + 1] === '"') { cel += '"'; i++; } else q = !q; }
      else if (ch === sep && !q) { cellen.push(cel); cel = ''; }
      else cel += ch;
    }
    cellen.push(cel);
    return cellen.map((c) => c.trim());
  });
}

const waarde = (s) => (s !== '' && Number.isFinite(+s) ? +s : s);
const getalTekst = (v) => (typeof v === 'number' ? v.toLocaleString('en-NZ', { maximumFractionDigits: 3 }) : String(v));

function leesUi() {
  try { return { weergave: 'tegels', schaal: false, greep: 'A', tegel: 128, dicht: [], ...JSON.parse(localStorage.getItem(UI_OPSLAG) || '{}') }; }
  catch { return { weergave: 'tegels', schaal: false, greep: 'A', tegel: 128, dicht: [] }; }
}
function bewaarUi(ui) { try { localStorage.setItem(UI_OPSLAG, JSON.stringify(ui)); } catch {} }

/** Short size text under a tile: "310 x 165", "M20 8.8/S", "90 x 45 SG8". */
function maatTekst(c, it) {
  if (c.kind === 'bolt') return [it.category, it.d ? `d ${it.d}` : ''].filter(Boolean).join(', ');
  if (c.kind === 'table') return c.name;
  const d = +it.d, b = +it.b;
  const m = d && b && c.shape !== 'chs' && c.shape !== 'round' ? `${d} x ${b}` : d ? `Ø${d}` : '';
  return [[m, it.grade, it.treatment].filter(Boolean).join(' '), it.mass ? `${it.mass} kg/m` : ''].filter(Boolean).join(', ');
}

// ── Previews ───────────────────────────────────────────────────────────────

function themaKleur(el, naam, standaard) {
  try { return getComputedStyle(el).getPropertyValue(naam).trim() || standaard; } catch { return standaard; }
}

/** Draw an item into a canvas at its CSS size; k = common mm scale (to scale) or 0 (fit). */
function tekenInDoek(doek, c, it, k, opties = {}) {
  const r = doek.getBoundingClientRect();
  const w = Math.max(40, Math.round(r.width || doek.clientWidth || 120)), h = Math.max(30, Math.round(r.height || (w * 3) / 4));
  const dpr = window.devicePixelRatio || 1;
  doek.width = w * dpr; doek.height = h * dpr;
  const ctx = doek.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const tx = themaKleur(doek, 'color', '#333') || '#333';
  const acc = opties.acc || '#0078d7';
  if (c.kind === 'section') {
    const ok = tekenVoorbeeld(ctx, c.shape, it, w, h, { k: k || 0, kleur: isHout(c.shape) ? '#b45309' : acc, lijn: opties.lijn || 1, marge: opties.marge ?? 8 });
    if (!ok) { ctx.fillStyle = tx; ctx.globalAlpha = 0.5; ctx.textAlign = 'center'; ctx.fillText('no d / b', w / 2, h / 2); }
    if (opties.maten && ok) maatLijnen(ctx, c, it, w, h, tx, opties.marge ?? 8);
  } else if (c.kind === 'bolt') {
    const d = +it.d || 20, gat = +it.hole || d + 2, af = +it.af || d * 1.6;
    const s = Math.min(w, h) * 0.8 / Math.max(af * 1.15, gat);
    ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i + Math.PI / 6, rr = (af / 2 / Math.cos(Math.PI / 6)) * s; const x = w / 2 + rr * Math.cos(a), y = h / 2 + rr * Math.sin(a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fillStyle = 'rgba(15,118,110,.12)'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, (d / 2) * s, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.arc(w / 2, h / 2, (gat / 2) * s, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = tx; ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
    const bw = Math.min(w * 0.6, 90), bh = Math.min(h * 0.6, 60), x0 = (w - bw) / 2, y0 = (h - bh) / 2;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, bw, bh);
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x0, y0 + (bh * i) / 4); ctx.lineTo(x0 + bw, y0 + (bh * i) / 4); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x0 + bw / 3, y0); ctx.lineTo(x0 + bw / 3, y0 + bh); ctx.stroke();
  }
}

/** b and d dimension text beside the large preview. */
function maatLijnen(ctx, c, it, w, h, kleur, marge) {
  const v = sectieVorm(c.shape, it);
  const k = Math.min((w - 2 * marge) / v.w, (h - 2 * marge) / v.h);
  const bw = v.w * k, bh = v.h * k;
  ctx.save();
  ctx.fillStyle = kleur; ctx.globalAlpha = 0.75; ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText(`${v.w}`, w / 2, (h - bh) / 2 - 2);
  ctx.save(); ctx.translate((w - bw) / 2 - 3, h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(`${v.h}`, 0, 0); ctx.restore();
  ctx.restore();
}

// ── The window ─────────────────────────────────────────────────────────────

let open = null;   // the open window (one at a time)

export async function openBibliotheek(api) {
  if (open) { open.focus(); return; }
  zorgVoorCss();
  let lib = kopie(await laadBibliotheek(api));
  const ui = leesUi();
  let nav = { regio: null, groep: null, catId: null };
  // Browse rows opened in this window; every row starts folded up.
  const uitgeklapt = new Set();
  const geschiedenis = [nav]; let positie = 0;
  const filter = { soorten: new Set(Object.keys(SOORTEN)), vorm: '' };
  let zoek = '';
  let gekozen = null;          // { catId, i }
  let gewijzigd = false;
  let resultaat = [];          // [{ c, it, i }]
  let tegels = [];             // tile elements in result order
  let waarnemer = null;        // IntersectionObserver for lazy previews

  // Skeleton
  const achter = maak('div', 's43l-achter');
  const venster = maak('div', 's43l');
  venster.setAttribute('role', 'dialog');
  venster.setAttribute('aria-label', 'Element Library');
  venster.tabIndex = -1;
  const kop = maak('div', 's43l-kop');
  const titel = maak('div', 's43l-titel');
  const balk = maak('div', 's43l-balk');
  const midden = maak('div', 's43l-midden');
  const zij = maak('div', 's43l-zij');
  const zijScroll = maak('div', 's43l-zij-scroll');
  const zijVoet = maak('div', 's43l-zij-voet');
  const werk = maak('div', 's43l-werk');
  const werkKop = maak('div', 's43l-werk-kop');
  const werkVak = maak('div', '');
  werkVak.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;';
  const info = maak('div', 's43l-info');
  const infoScroll = maak('div', 's43l-info-scroll');
  const voet = maak('div', 's43l-voet');
  zij.append(zijScroll, zijVoet);
  werk.append(werkKop, werkVak);
  info.append(infoScroll);
  midden.append(zij, werk, info);
  venster.append(kop, balk, midden, voet);
  achter.appendChild(venster);

  const cat = (id) => lib.categories.find((c) => c.id === id) || null;
  // Countries switched off in Countries are not loaded into Browse or search.
  const regioAan = (c) => !leesRegios().off.includes(regioVan(c));
  let regioScherm = false;   // the Countries list is showing in the sidebar
  const gekozenItem = () => { const c = gekozen && cat(gekozen.catId); const it = c?.items[gekozen.i]; return it ? { c, it } : null; };
  const zetTitel = () => { titel.innerHTML = ''; titel.append('Element Library'); };
  const markeer = () => { gewijzigd = true; zetTitel(); };

  // Edits made in the list view are kept: closing saves them.
  const sluit = () => {
    if (gewijzigd) { try { bewaarBibliotheek(lib); gewijzigd = false; } catch (e) { alert(e.message); return; } }
    waarnemer?.disconnect();
    grootte.disconnect();
    window.removeEventListener('keydown', toetsen, true);
    achter.remove();
    open = null;
  };

  // ── Navigation ──
  function gaNaar(n, { opslaan = true } = {}) {
    nav = { regio: n.regio || null, groep: n.groep || null, catId: n.catId || null };
    if (nav.catId) { const c = cat(nav.catId) || {}; nav.groep = groepVan(c) || nav.groep; nav.regio = regioVan(c); }
    if (nav.groep && !nav.regio) nav.regio = 'New Zealand';
    // Going to a category (search, double-click) opens its rows in Browse.
    if (nav.catId) { uitgeklapt.add(nav.regio); uitgeklapt.add(`${nav.regio}/${nav.groep}`); }
    if (opslaan) { geschiedenis.splice(positie + 1); geschiedenis.push(nav); positie = geschiedenis.length - 1; }
    if (venster.dataset.zij === '1') venster.dataset.zij = '0';
    tekenAlles();
  }
  const terug = () => { if (positie > 0) { positie--; gaNaar(geschiedenis[positie], { opslaan: false }); } };
  const vooruit = () => { if (positie < geschiedenis.length - 1) { positie++; gaNaar(geschiedenis[positie], { opslaan: false }); } };
  const thuis = () => gaNaar({});

  // ── Results ──
  function hooiberg(c, it) {
    // Names and sizes: name, category, d x b, and text fields such as grade,
    // treatment or bolt category (not every section property).
    const delen = [it.name, c.name, groepVan(c)];
    if (it.d && it.b) delen.push(`${it.d}x${it.b}`, `${it.b}x${it.d}`);
    else if (it.d) delen.push(`d${it.d}`);
    for (const v of Object.values(it)) if (typeof v === 'string') delen.push(v);
    return delen.join(' ').toLowerCase().replace(/\s*x\s*/g, 'x');
  }
  function zoekResultaat() {
    const woorden = zoek.toLowerCase().replace(/\s*x\s*/g, 'x').split(/\s+/).filter(Boolean);
    const uit = [];
    for (const c of lib.categories) {
      if (!regioAan(c)) continue;
      if (!filter.soorten.has(c.kind)) continue;
      if (filter.vorm && (c.kind !== 'section' || c.shape !== filter.vorm)) continue;
      if (nav.catId && c.id !== nav.catId) continue;
      if (nav.regio && regioVan(c) !== nav.regio) continue;
      if (nav.groep && groepVan(c) !== nav.groep) continue;
      c.items.forEach((it, i) => {
        if (!woorden.length) { uit.push({ c, it, i }); return; }
        const h = hooiberg(c, it);
        if (woorden.every((w) => h.includes(w))) uit.push({ c, it, i });
      });
    }
    return uit;
  }

  // ── Header and toolbar ──
  function tekenKop() {
    kop.innerHTML = '';
    zetTitel();
    kop.append(titel,
      knop('Request a library', () => openLink(bibliotheekVerzoekUrl(nav.regio || '')), '',
        'Ask for elements to be added (another country, supplier or product range): opens a request form on GitHub'),
      knop('✕', sluit, 'ikoon', 'Close (Esc)'),
    );
  }

  const zoekVak = maak('div', 's43l-zoek');
  const zoekInvoer = maak('input');
  zoekInvoer.type = 'search';
  zoekInvoer.placeholder = 'Search names and sizes (e.g. 310UB, 90x45, M20, H5)';
  zoekInvoer.setAttribute('aria-label', 'Search names and sizes');
  zoekVak.innerHTML = IKOON_ZOEK;
  zoekVak.appendChild(zoekInvoer);
  let zoekTimer = 0;
  zoekInvoer.addEventListener('input', () => {
    clearTimeout(zoekTimer);
    zoekTimer = setTimeout(() => { zoek = zoekInvoer.value.trim(); tekenWerk(); }, 90);
  });
  zoekInvoer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      if (e.key === 'Enter' && gekozenItem() && zoekResultaat().some((r) => r.c.id === gekozen.catId && r.i === gekozen.i)) { plaatsGekozen('section'); return; }
      if (resultaat.length) { kies(resultaat[0].c.id, resultaat[0].i); tegels[0]?.focus(); }
    }
  });
  const aantal = maak('div', 's43l-aantal');
  aantal.setAttribute('aria-live', 'polite');
  const kruimel = maak('div', 's43l-kruimel');
  const knopTerug = knop('‹', terug, 'ikoon', 'Back (Alt+Left)');
  const knopVooruit = knop('›', vooruit, 'ikoon', 'Forward (Alt+Right)');
  const knopThuis = knop('⌂', thuis, 'ikoon', 'All elements');
  const knopZij = knop('☰', () => { venster.dataset.zij = venster.dataset.zij === '1' ? '0' : '1'; }, 'ikoon alleen-smal zij', 'Browse');
  const nav1 = maak('div', 's43l-nav'); nav1.append(knopZij, knopTerug, knopVooruit, knopThuis);
  balk.append(nav1, kruimel, zoekVak, aantal);

  function tekenBalk() {
    knopTerug.disabled = positie <= 0;
    knopVooruit.disabled = positie >= geschiedenis.length - 1;
    kruimel.innerHTML = '';
    const link = (tekst, n) => { const a = maak('a', '', tekst); a.addEventListener('click', () => gaNaar(n)); return a; };
    const delen = [nav.regio ? link('Library', {}) : maak('b', '', 'Library')];
    if (nav.regio) delen.push(nav.groep ? link(nav.regio, { regio: nav.regio }) : maak('b', '', nav.regio));
    if (nav.groep) delen.push(nav.catId ? link(nav.groep, { regio: nav.regio, groep: nav.groep }) : maak('b', '', nav.groep));
    if (nav.catId) delen.push(maak('b', '', cat(nav.catId)?.name || ''));
    delen.forEach((d, i) => { if (i) kruimel.append(maak('span', '', '›')); kruimel.append(d); });
  }

  // ── Sidebar: countries (load or not, order) ──
  function tekenRegios() {
    const inst = leesRegios();
    const lijst = regioVolgorde(lib, inst);
    const tel = (r) => lib.categories.filter((c) => regioVan(c) === r).reduce((s, c) => s + c.items.length, 0);
    const zet = (nieuw) => { bewaarRegios(nieuw); tekenZij(); };
    const box = maak('div', 's43l-regios');
    const rijen = [];
    lijst.forEach((r, i) => {
      const rij = maak('div', 's43l-knoop s43l-regio');
      // Grip: press and drag up or down to move this country.
      const greep = maak('span', 's43l-greep', '⠿');
      greep.title = `Drag to move ${r}`;
      greep.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        rij.classList.add('sleept');
        let doel = i;
        let klaar = false;
        const beweeg = (ev) => {
          // Button already up: the release went elsewhere. Finish here.
          if ((ev.buttons & 1) === 0) { los(); return; }
          doel = rijen.length - 1;
          for (let k = 0; k < rijen.length; k++) {
            const rr = rijen[k].getBoundingClientRect();
            if (ev.clientY < rr.top + rr.height / 2) { doel = k; break; }
          }
          rijen.forEach((x, k) => {
            x.classList.toggle('lijn-boven', k === doel && doel !== i && doel < i);
            x.classList.toggle('lijn-onder', k === doel && doel !== i && doel > i);
          });
        };
        const los = () => {
          if (klaar) return;
          klaar = true;
          window.removeEventListener('mousemove', beweeg, true);
          window.removeEventListener('mouseup', los, true);
          window.removeEventListener('blur', los);
          if (doel !== i) {
            const o = lijst.slice();
            const [weg] = o.splice(i, 1);
            o.splice(doel, 0, weg);
            zet({ order: o, off: inst.off });
          } else tekenZij();
        };
        window.addEventListener('mousemove', beweeg, true);
        window.addEventListener('mouseup', los, true);
        window.addEventListener('blur', los);
      });
      const vink = document.createElement('input');
      vink.type = 'checkbox';
      vink.checked = !inst.off.includes(r);
      vink.title = vink.checked ? `Loaded: untick to leave ${r} out of Browse and search` : `Not loaded: tick to show ${r}`;
      vink.addEventListener('change', () => {
        const off = new Set(inst.off);
        if (vink.checked) off.delete(r); else off.add(r);
        if (nav.regio === r && !vink.checked) nav = {};
        zet({ order: lijst, off: [...off] });
      });
      const naam = maak('span', 'naam', r);
      rij.append(greep, vink, naam, maak('span', 'n', String(tel(r))));
      rijen.push(rij);
      box.appendChild(rij);
    });
    box.appendChild(maak('div', 's43l-regio-tip', 'Drag the grips to change the order. Ticked countries load into Browse and search; elements already on a sheet are not affected.'));
    zijScroll.appendChild(box);
  }

  // ── Sidebar: browse ──
  function tekenZij() {
    zijScroll.innerHTML = '';

    const sectie = maak('div', 's43l-sectie s43l-sectie-knop');
    sectie.append(maak('span', '', regioScherm ? 'Countries' : 'Browse'),
      knop(regioScherm ? 'Done' : 'Countries', () => { regioScherm = !regioScherm; tekenZij(); if (!regioScherm) tekenWerk(); }, 'klein',
        regioScherm ? 'Back to Browse' : 'Choose which countries load, and their order'));
    zijScroll.append(sectie);
    if (regioScherm) { tekenRegios(); return; }
    const boom = maak('div', 's43l-boom');
    boom.setAttribute('role', 'tree');
    const alles = maak('div', `s43l-knoop${!nav.regio ? ' aan' : ''}`);
    alles.append(maak('span', 'pijl', ''), maak('span', '', 'All elements'), maak('span', 'n', String(lib.categories.filter(regioAan).reduce((s, c) => s + c.items.length, 0))));
    alles.addEventListener('click', () => gaNaar({}));
    boom.appendChild(alles);
    const telItems = (lijst) => String(lijst.reduce((s, c) => s + c.items.length, 0));
    // One foldable row: click opens and shows it, click again folds it up;
    // the arrow only folds. `sleutel` keeps the fold state per row.
    const rij = (tekst, aantal, sleutel, isHier, niveau, doel) => {
      const dicht = !uitgeklapt.has(sleutel);
      const k = maak('div', `s43l-knoop${niveau ? ' kind' : ''}${isHier ? ' aan' : ''}${dicht ? ' dicht' : ''}`);
      if (niveau) k.style.paddingLeft = `${8 + 16 * niveau}px`;
      k.setAttribute('role', 'treeitem');
      const pijl = maak('span', 'pijl', '▾');
      pijl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dicht) uitgeklapt.add(sleutel); else uitgeklapt.delete(sleutel);
        tekenZij();
      });
      k.append(pijl, maak('span', '', tekst), maak('span', 'n', aantal));
      k.addEventListener('click', () => {
        if (isHier && !dicht) { uitgeklapt.delete(sleutel); tekenZij(); return; }
        uitgeklapt.add(sleutel);
        gaNaar(doel);
      });
      boom.appendChild(k);
      return dicht;
    };
    const regios = new Map();
    for (const c of lib.categories) { if (!regioAan(c)) continue; const r = regioVan(c); if (!regios.has(r)) regios.set(r, []); regios.get(r).push(c); }
    const volgordeRegios = regioVolgorde(lib).filter((r) => regios.has(r));
    for (const [regio, inRegio] of volgordeRegios.map((r) => [r, regios.get(r)])) {
      const hier = nav.regio === regio && !nav.groep && !nav.catId;
      if (rij(regio, telItems(inRegio), regio, hier, 0, { regio })) continue;
      const groepen = new Map();
      for (const c of inRegio) { const g = groepVan(c); if (!groepen.has(g)) groepen.set(g, []); groepen.get(g).push(c); }
      const volgorde = [...groepen.keys()].sort((a, b) => ((GROEP_VOLGORDE.indexOf(a) + 1 || 99) - (GROEP_VOLGORDE.indexOf(b) + 1 || 99)) || a.localeCompare(b));
      for (const g of volgorde) {
        const lijst = groepen.get(g);
        const gHier = nav.regio === regio && nav.groep === g && !nav.catId;
        if (rij(g, telItems(lijst), `${regio}/${g}`, gHier, 1, { regio, groep: g })) continue;
        for (const c of lijst) {
          const r = maak('div', `s43l-knoop kind${c.id === nav.catId ? ' aan' : ''}`);
          r.style.paddingLeft = '40px';
          r.setAttribute('role', 'treeitem');
          r.title = c.note || c.name;
          r.append(maak('span', '', c.name), maak('span', 'n', String(c.items.length)));
          r.addEventListener('click', () => gaNaar({ catId: c.id }));
          boom.appendChild(r);
        }
      }
    }
    zijScroll.append(boom);
    zijVoet.innerHTML = '';
    zijVoet.style.display = 'none';
  }

  function nieuweCategorie() {
    const naam = prompt('Name of the new category (e.g. Anchors):'); if (!naam) return;
    const soort = (prompt('Kind: section, bolt or table', 'section') || 'table').toLowerCase().trim();
    const k = SOORTEN[soort] ? soort : 'table';
    let shape;
    if (k === 'section') {
      const v = (prompt(`Shape: ${Object.keys(VORMEN).join(', ')}`, nav.groep === 'Timber' ? 'rect' : 'I') || 'I').trim();
      shape = VORMEN[v] ? v : 'I';
    }
    const id = naam.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36).slice(-4);
    const fields = k === 'bolt' ? ['d', 'category', 'hole', 'minEdge', 'minPitch'] : ['rect', 'glulam', 'lvl'].includes(shape) ? ['d', 'b', 'grade', 'treatment'] : ['d', 'b'];
    const c = { id, name: naam, kind: k, fields, items: [] };
    if (shape) c.shape = shape;
    if (nav.groep && !['Steel', 'Timber', 'Fixings', 'Bolts', 'Reference tables'].includes(nav.groep)) c.group = nav.groep;
    if (nav.regio && nav.regio !== 'New Zealand') c.region = nav.regio;
    lib.categories.push(c);
    ui.weergave = 'lijst'; bewaarUi(ui);
    markeer(); gaNaar({ catId: id });
  }

  // ── Main area ──
  function tekenWerk() {
    resultaat = zoekResultaat();
    if (gekozen && !resultaat.some((r) => r.c.id === gekozen.catId && r.i === gekozen.i)) gekozen = null;
    aantal.textContent = `${resultaat.length.toLocaleString('en-NZ')} result${resultaat.length === 1 ? '' : 's'}`;
    tekenWerkKop();
    werkVak.innerHTML = '';
    waarnemer?.disconnect();
    if (ui.weergave === 'lijst') tekenLijst(); else tekenTegels();
    tekenInfo();
    tekenVoet();
    if (!venster.contains(document.activeElement)) (tegels.find((t) => t.classList.contains('aan')) || venster).focus({ preventScroll: true });
  }

  function tekenWerkKop() {
    werkKop.innerHTML = '';
    const c = nav.catId && cat(nav.catId);
    if (c && ui.weergave === 'lijst') {
      const naam = maak('input'); naam.value = c.name; naam.style.cssText = 'font-weight:600;width:170px;';
      naam.setAttribute('aria-label', 'Category name');
      naam.addEventListener('change', () => { c.name = naam.value.trim() || c.name; markeer(); tekenZij(); tekenBalk(); });
      werkKop.append(naam, maak('span', '', SOORTEN[c.kind] || c.kind));
      if (c.kind === 'section') {
        const vorm = maak('select');
        for (const [k, t] of Object.entries(VORMEN)) vorm.append(new Option(t, k));
        vorm.value = c.shape || 'I';
        vorm.addEventListener('change', () => { c.shape = vorm.value; markeer(); tekenInfo(); });
        werkKop.append(maak('span', '', 'Shape'), vorm);
      }
    } else {
      werkKop.append(maak('b', '', c ? c.name : nav.groep || nav.regio || 'All elements'));
      if (c) werkKop.append(maak('span', '', `${SOORTEN[c.kind] || c.kind}${c.kind === 'section' ? `, ${VORMEN[c.shape] || c.shape}` : ''}`));
    }
    const wg = maak('div', 's43l-weergave');
    if (ui.weergave === 'tegels') {
      const schaal = knop('To scale', () => { ui.schaal = !ui.schaal; bewaarUi(ui); tekenWerk(); }, ui.schaal ? 'aan' : '', 'Draw the tiles of a category to one common scale');
      schaal.setAttribute('aria-pressed', String(!!ui.schaal));
      const kleiner = knop('−', () => { ui.tegel = Math.max(96, ui.tegel - 24); bewaarUi(ui); tegelMaat(); }, 'ikoon', 'Smaller tiles');
      const groter = knop('+', () => { ui.tegel = Math.min(240, ui.tegel + 24); bewaarUi(ui); tegelMaat(); }, 'ikoon', 'Larger tiles');
      wg.append(schaal, kleiner, groter);
    }
    const tg = knop('▦ Tiles', () => { ui.weergave = 'tegels'; bewaarUi(ui); tekenWerk(); }, ui.weergave === 'tegels' ? 'aan' : '', 'Grid of previews');
    const lj = knop('☰ List', () => { ui.weergave = 'lijst'; bewaarUi(ui); tekenWerk(); }, ui.weergave === 'lijst' ? 'aan' : '', 'Table: edit rows and columns');
    tg.setAttribute('aria-pressed', String(ui.weergave === 'tegels'));
    lj.setAttribute('aria-pressed', String(ui.weergave === 'lijst'));
    wg.append(tg, lj, knop('ⓘ', () => { venster.dataset.info = venster.dataset.info === '1' ? '0' : '1'; }, 'ikoon alleen-smal info', 'Details'));
    werkKop.append(wg);
    if (c?.note) werkKop.append(maak('div', 'notitie', c.note));
  }

  function tegelMaat() { werkVak.querySelector('.s43l-tegels')?.style.setProperty('--tegel', `${ui.tegel}px`); waarnemer && herbeginPreviews(); }

  function herbeginPreviews() {
    for (const t of tegels) { t._getekend = false; waarnemer.unobserve(t); waarnemer.observe(t); }
  }

  function tekenTegels() {
    const grid = maak('div', 's43l-tegels');
    grid.style.setProperty('--tegel', `${ui.tegel}px`);
    grid.setAttribute('role', 'listbox');
    grid.setAttribute('aria-label', 'Results');
    werkVak.appendChild(grid);
    tegels = [];
    if (!resultaat.length) {
      grid.appendChild(maak('div', 's43l-leeg', zoek ? `Nothing matches "${zoek}". Try a size such as 310 or 90x45, or clear the search.` : 'This category is empty. Switch to List to add rows.'));
      return;
    }
    // Common scale per category (to scale): the largest item fills its tile.
    const schaalVan = new Map();
    if (ui.schaal) {
      for (const r of resultaat) {
        if (r.c.kind !== 'section') continue;
        const v = sectieVorm(r.c.shape, r.it);
        const m = Math.max(v.w || 0, (v.h || 0) * 4 / 3);
        schaalVan.set(r.c.id, Math.max(schaalVan.get(r.c.id) || 0, m));
      }
    }
    const acc = themaKleur(venster, '--acc', '#0078d7');
    const meerdere = new Set(resultaat.map((r) => r.c.id)).size > 1;
    const frag = document.createDocumentFragment();
    let vorige = null;
    resultaat.forEach((r, idx) => {
      if (meerdere && r.c !== vorige) {
        const n = resultaat.filter((x) => x.c === r.c).length;
        const h = maak('div', 's43l-groepkop', r.c.name);
        h.append(maak('span', '', `${groepVan(r.c)}, ${n}`));
        frag.appendChild(h);
        vorige = r.c;
      }
      const t = maak('div', `s43l-tegel${gekozen && gekozen.catId === r.c.id && gekozen.i === r.i ? ' aan' : ''}`);
      t.tabIndex = -1;
      t.setAttribute('role', 'option');
      t.dataset.idx = String(idx);
      const doek = maak('canvas');
      t.append(doek, maak('div', 'naam', r.it.name));
      const sub = maak('div', 'sub', maatTekst(r.c, r.it));
      if (r.it.check) { sub.prepend(maak('span', 'let', '● ')); t.title = `${r.it.name}: check against the supplier table`; }
      t.appendChild(sub);
      t._teken = () => {
        const max = schaalVan.get(r.c.id);
        const w = doek.getBoundingClientRect().width || ui.tegel;
        tekenInDoek(doek, r.c, r.it, max ? (w - 16) / max : 0, { acc });
      };
      t.addEventListener('click', () => kies(r.c.id, r.i));
      t.addEventListener('dblclick', () => { kies(r.c.id, r.i); if (r.c.kind === 'table') { ui.weergave = 'lijst'; bewaarUi(ui); gaNaar({ catId: r.c.id }); } else plaatsGekozen('section'); });
      frag.appendChild(t);
      tegels.push(t);
    });
    grid.appendChild(frag);
    waarnemer = new IntersectionObserver((items) => {
      for (const x of items) if (x.isIntersecting && !x.target._getekend) { x.target._getekend = true; x.target._teken(); }
    }, { root: grid, rootMargin: '200px' });
    for (const t of tegels) waarnemer.observe(t);
    const aan = tegels.find((t) => t.classList.contains('aan'));
    if (aan) aan.scrollIntoView({ block: 'nearest' });
  }

  function kies(catId, i, { focus = false } = {}) {
    gekozen = { catId, i };
    for (const t of tegels) {
      const r = resultaat[+t.dataset.idx];
      const aan = r.c.id === catId && r.i === i;
      t.classList.toggle('aan', aan);
      t.setAttribute('aria-selected', String(aan));
      if (aan) { t.tabIndex = 0; if (focus) { t.focus(); t.scrollIntoView({ block: 'nearest' }); } } else t.tabIndex = -1;
    }
    werkVak.querySelectorAll('tr[data-i]').forEach((tr) => tr.classList.toggle('aan', +tr.dataset.i === i && tr.dataset.cat === catId));
    tekenInfo();
    tekenVoet();
  }

  /** Arrow keys in the tile grid: move to the nearest tile in that direction. */
  function pijl(richting) {
    if (!tegels.length) return;
    let idx = tegels.findIndex((t) => t.classList.contains('aan'));
    if (idx < 0) { const r = resultaat[0]; kies(r.c.id, r.i, { focus: true }); return; }
    if (richting === 'ArrowLeft') idx = Math.max(0, idx - 1);
    else if (richting === 'ArrowRight') idx = Math.min(tegels.length - 1, idx + 1);
    else if (richting === 'Home') idx = 0;
    else if (richting === 'End') idx = tegels.length - 1;
    else {
      const a = tegels[idx].getBoundingClientRect(), cx = a.left + a.width / 2;
      const omlaag = richting === 'ArrowDown' || richting === 'PageDown';
      const stappen = richting.startsWith('Page') ? 4 : 1;
      let rij = a.top, beste = idx;
      for (let s = 0; s < stappen; s++) {
        let volgendeRij = null, kand = -1, kandD = Infinity;
        tegels.forEach((t, j) => {
          const b = t.getBoundingClientRect();
          if (omlaag ? b.top > rij + 4 : b.top < rij - 4) {
            if (volgendeRij === null || (omlaag ? b.top < volgendeRij - 4 : b.top > volgendeRij + 4)) { volgendeRij = b.top; kand = -1; kandD = Infinity; }
            if (Math.abs(b.top - volgendeRij) <= 4) { const d = Math.abs(b.left + b.width / 2 - cx); if (d < kandD) { kandD = d; kand = j; } }
          }
        });
        if (kand < 0) break;
        beste = kand; rij = volgendeRij;
      }
      idx = beste;
    }
    const r = resultaat[+tegels[idx].dataset.idx];
    kies(r.c.id, r.i, { focus: true });
  }

  function tekenLijst() {
    const c = nav.catId && cat(nav.catId);
    const vak = maak('div', 's43l-lijst');
    werkVak.appendChild(vak);
    tegels = [];
    const t = maak('table');
    vak.appendChild(t);
    if (!c) {
      // Read-only list of the results across categories.
      const velden = ['d', 'b', 'mass', 'grade', 'treatment'];
      const kr = maak('tr');
      for (const k of ['name', 'category', ...velden]) kr.appendChild(maak('th', '', k));
      t.appendChild(kr);
      for (const r of resultaat.slice(0, 2000)) {
        const tr = maak('tr', gekozen && gekozen.catId === r.c.id && gekozen.i === r.i ? 'aan' : '');
        tr.dataset.i = String(r.i); tr.dataset.cat = r.c.id;
        for (const v of [r.it.name, r.c.name, ...velden.map((k) => r.it[k] ?? '')]) tr.appendChild(maak('td', 'ro', v === '' ? '' : getalTekst(v)));
        tr.addEventListener('click', () => kies(r.c.id, r.i));
        tr.addEventListener('dblclick', () => { kies(r.c.id, r.i); gaNaar({ catId: r.c.id }); });
        t.appendChild(tr);
      }
      const tip = maak('div', '', 'Pick a category in Browse to edit its table: add or delete rows and columns, paste from Excel, rename.');
      tip.style.cssText = 'padding:10px 12px;color:var(--zacht);';
      vak.appendChild(tip);
      return;
    }
    const kolommen = ['name', ...c.fields];
    const kr = maak('tr');
    for (const k of kolommen) kr.appendChild(maak('th', '', k));
    t.appendChild(kr);
    const zichtbaar = new Set(resultaat.map((r) => r.i));
    c.items.forEach((it, i) => {
      if (!zichtbaar.has(i)) return;
      const tr = maak('tr', gekozen && gekozen.catId === c.id && gekozen.i === i ? 'aan' : '');
      tr.dataset.i = String(i); tr.dataset.cat = c.id;
      tr.addEventListener('click', () => { if (!(gekozen && gekozen.catId === c.id && gekozen.i === i)) kies(c.id, i); });
      tr.addEventListener('dblclick', () => { if (c.kind !== 'table') { kies(c.id, i); plaatsGekozen('section'); } });
      for (const k of kolommen) {
        const td = maak('td');
        const inp = maak('input', k === 'name' ? 'naam' : '');
        inp.value = it[k] ?? '';
        inp.setAttribute('aria-label', k);
        inp.addEventListener('change', () => {
          const v = waarde(inp.value.trim());
          if (v === '') { if (k !== 'name') delete it[k]; } else it[k] = v;
          markeer(); tekenInfo();
        });
        td.appendChild(inp);
        tr.appendChild(td);
      }
      t.appendChild(tr);
    });
    const rk = maak('div', 's43l-rijknoppen');
    rk.append(
      knop('+ Row', () => { c.items.push({ name: 'New' }); gekozen = { catId: c.id, i: c.items.length - 1 }; markeer(); zoek = ''; zoekInvoer.value = ''; tekenWerk(); const v = werkVak.querySelector('.s43l-lijst'); if (v) v.scrollTop = 1e9; }),
      knop('Duplicate row', () => { const g = gekozenItem(); if (!g || g.c !== c) return; c.items.splice(gekozen.i + 1, 0, { ...g.it, name: `${g.it.name} copy` }); gekozen.i++; markeer(); tekenWerk(); }),
      knop('Delete row', () => { const g = gekozenItem(); if (!g || g.c !== c) return; if (!confirm(`Delete the row "${g.it.name}"?`)) return; c.items.splice(gekozen.i, 1); gekozen = null; markeer(); tekenAlles(); }),
      knop('+ Column', () => { const k = (prompt('Column name (e.g. grade):') || '').trim(); if (!k || c.fields.includes(k) || k === 'name') return; c.fields.push(k); markeer(); tekenWerk(); }),
      knop('Delete column', () => {
        const k = (prompt(`Column to delete (${c.fields.join(', ')}):`) || '').trim();
        if (!k || !c.fields.includes(k)) return;
        if (!confirm(`Delete the column "${k}" and its values in ${c.items.length} rows?`)) return;
        c.fields = c.fields.filter((f) => f !== k); for (const it of c.items) delete it[k]; markeer(); tekenWerk();
      }),
      knop('Import CSV', () => csvImport(c), '', 'Paste a table from Excel or a CSV file'),
      knop('Delete category', () => {
        if (!confirm(`Delete the category "${c.name}" and its ${c.items.length} rows?`)) return;
        lib.categories = lib.categories.filter((x) => x !== c); gekozen = null; markeer(); gaNaar({ regio: nav.regio, groep: nav.groep });
      }),
    );
    werkVak.appendChild(rk);
  }

  function csvImport(c) {
    const vak = maak('div', 's43l-dialoog');
    const doos = maak('div', 's43l');
    doos.style.cssText = 'width:min(700px,92vw);height:auto;display:flex;flex-direction:column;gap:8px;padding:14px;';
    const uitleg = maak('div', '', `Paste a table (from Excel or a CSV file). The first row is the column names; a column called "name" is the row name. Rows with an existing name are updated, new names are added to "${c.name}".`);
    const t = maak('textarea'); t.style.cssText = 'height:260px;font-family:Consolas,monospace;';
    const k = maak('div'); k.style.cssText = 'display:flex;gap:6px;justify-content:flex-end;';
    const weg = () => vak.remove();
    k.append(knop('Cancel', weg), knop('Import', () => {
      const rijen = leesTabel(t.value);
      if (rijen.length < 2) { alert('Paste a header row and at least one data row.'); return; }
      const kp = rijen[0];
      const naamKol = Math.max(0, kp.findIndex((h) => h.toLowerCase() === 'name'));
      for (const h of kp) if (h && h.toLowerCase() !== 'name' && !c.fields.includes(h)) c.fields.push(h);
      let nieuw = 0, bij = 0;
      for (const r of rijen.slice(1)) {
        const naam = r[naamKol]; if (!naam) continue;
        let it = c.items.find((i) => i.name === naam);
        if (it) bij++; else { it = { name: naam }; c.items.push(it); nieuw++; }
        kp.forEach((h, i) => { if (i !== naamKol && h && r[i] !== undefined && r[i] !== '') it[h] = waarde(r[i]); });
      }
      weg(); markeer(); tekenAlles();
      alert(`${nieuw} rows added, ${bij} updated.`);
    }, 'prim'));
    vak.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); weg(); } });
    doos.append(uitleg, t, k);
    vak.appendChild(doos);
    document.body.appendChild(vak);
    t.focus();
  }

  // ── Details panel ──
  function tekenInfo() {
    infoScroll.innerHTML = '';
    const g = gekozenItem();
    if (!g) {
      const c = nav.catId && cat(nav.catId);
      infoScroll.append(maak('h3', '', c ? c.name : 'Element Library'));
      const p = maak('div', 'cat', c ? `${c.items.length} items. Select one to see its properties.` : 'Select an element to see its preview and properties. Double-click a tile to place it as a section.');
      infoScroll.append(p);
      if (c?.note) infoScroll.append(maak('div', 's43l-bron', c.note));
      // (no library source note on the start panel)
      return;
    }
    const { c, it } = g;
    const doek = maak('canvas');
    infoScroll.append(doek);
    requestAnimationFrame(() => tekenInDoek(doek, c, it, 0, { acc: themaKleur(venster, '--acc', '#0078d7'), lijn: 1.4, marge: 22, maten: true }));
    infoScroll.append(maak('h3', '', it.name));
    infoScroll.append(maak('div', 'cat', `${groepVan(c)}, ${c.name}${c.kind === 'section' ? `, ${VORMEN[c.shape] || c.shape}` : ''}`));
    if (it.check) infoScroll.append(maak('div', 's43l-let', 'Taken from the Revit type name, not from a supplier table: check the sizes and grade before use.'));
    const velden = maak('div', 's43l-velden');
    const eenheid = lib.units || {};
    const eenheidVan = (k) => (['d', 'b', 'tf', 'tw', 't', 'r1', 'ri', 'ro', 'lip', 'hole', 'minEdge', 'minPitch', 'af', 'nominal'].includes(k) ? eenheid.length || 'mm'
      : k === 'mass' ? eenheid.mass : k === 'A' ? eenheid.area : /^I[xyw]?$|^J$/.test(k) ? (k === 'Iw' ? 'mm6' : eenheid.inertia) : /^[ZS][xy]$/.test(k) ? eenheid.modulus : '');
    const sleutels = [...new Set([...c.fields, ...Object.keys(it)])].filter((k) => k !== 'name' && it[k] !== undefined && it[k] !== '');
    for (const k of sleutels) {
      const v = it[k];
      velden.append(maak('span', '', k), maak('span', '', `${typeof v === 'boolean' ? (v ? 'yes' : 'no') : getalTekst(v)}${typeof v === 'number' && eenheidVan(k) ? ` ${eenheidVan(k)}` : ''}`));
    }
    infoScroll.append(velden);
    const bron = maak('div', 's43l-bron');
    bron.textContent = c.note || '';
    infoScroll.append(bron);
  }

  // ── Footer ──
  const status = maak('div', 'status');
  const plaatsGroep = maak('div', 'groep');
  function tekenVoet() {
    voet.innerHTML = '';
    plaatsGroep.innerHTML = '';
    const g = gekozenItem();
    status.textContent = g ? `${g.it.name}, ${g.c.name}` : 'Select an element to place it. Double-click or Enter places it as a section.';
    voet.append(status);
    if (!g || g.c.kind === 'table') {
      const k = knop('Place as section', () => {}, 'prim');
      k.disabled = true;
      k.title = g ? 'Reference tables are not placed on the sheet' : 'Select an element first';
      plaatsGroep.append(k);
    } else if (g.c.kind === 'bolt') {
      plaatsGroep.append(maak('span', '', 'Place bolt group:'),
        knop('Face', () => plaatsGekozen('section'), 'prim', 'Bolt heads seen face on, with the plate (Enter)'),
        knop('Plan', () => plaatsGekozen('plan'), 'prim', 'Looking down on the bolt heads (or nuts), with washers'),
        knop('Elevation', () => plaatsGekozen('elevation'), 'prim', 'Bolts side on: head, plies, washer and nut, with the bolt length'));
    } else {
      const greep = maak('select');
      greep.title = 'The grip a member is placed by: click it first, then the other point';
      for (const [k, t] of PLAATS_GREPEN) greep.append(new Option(t, k));
      greep.value = ui.greep || 'A';
      greep.addEventListener('change', () => { ui.greep = greep.value; bewaarUi(ui); });
      plaatsGroep.append(maak('span', '', 'Place as:'),
        knop('Section', () => plaatsGekozen('section'), 'prim', 'Click on the sheet to place the cross-section (Enter, double-click a tile)'),
        knop('Elevation', () => plaatsGekozen('elevation'), 'prim', 'Click point A, then point B (Ctrl/Shift: horizontal or vertical)'),
        knop('Plan', () => plaatsGekozen('plan'), 'prim', 'Click point A, then point B (Ctrl/Shift: horizontal or vertical)'),
        maak('span', '', 'by'), greep);
    }
    voet.append(plaatsGroep);
  }

  function plaatsGekozen(view = 'section') {
    const g = gekozenItem();
    if (!g) { alert('Select an element first.'); return; }
    if (g.c.kind === 'table') return;
    if (gewijzigd) try { bewaarBibliotheek(lib); gewijzigd = false; } catch (e) { alert(e.message); return; }
    gewijzigd = false;
    sluit();
    plaats(api, g.c, g.it, view, ui.greep);
  }

  function tekenAlles() {
    tekenKop(); tekenBalk(); tekenZij(); tekenWerk();
  }

  // ── Keyboard ──
  const toetsen = (e) => {
    const t = e.target;
    if (!achter.isConnected || t?.closest?.('.s43l-dialoog')) return;
    if (!(venster.contains(t) || t === document.body || t === document.documentElement)) return;
    const typen = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (e.key === 'Escape') {
      e.stopPropagation(); e.preventDefault();
      if (t === zoekInvoer && zoekInvoer.value) { zoekInvoer.value = ''; zoek = ''; tekenWerk(); return; }
      sluit(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); e.stopPropagation(); zoekInvoer.focus(); zoekInvoer.select(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.stopPropagation(); try { bewaarBibliotheek(lib); gewijzigd = false; zetTitel(); } catch (x) { alert(x.message); } return; }
    if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); terug(); return; }
    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); vooruit(); return; }
    if (typen || ui.weergave !== 'tegels') return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); pijl(e.key); }
    else if (e.key === 'Enter' && t?.tagName !== 'BUTTON') { e.preventDefault(); e.stopPropagation(); plaatsGekozen('section'); }
    else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { zoekInvoer.focus(); }
  };
  window.addEventListener('keydown', toetsen, true);
  venster.addEventListener('keydown', (e) => e.stopPropagation());   // keys in the library do not reach the sheet

  // ── Size: narrower windows fold the details and then the sidebar away ──
  const grootte = new ResizeObserver(() => {
    const w = venster.clientWidth;
    venster.dataset.smal = w < 1000 ? '1' : '0';
    venster.dataset.heelSmal = w < 700 ? '1' : '0';
  });

  achter.addEventListener('mousedown', (e) => { if (e.target === achter) sluit(); });
  document.body.appendChild(achter);
  grootte.observe(venster);
  open = { focus: () => zoekInvoer.focus() };
  tekenAlles();
  zoekInvoer.focus();
}
