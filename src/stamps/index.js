// Smart Stamps: stamps built from families (stamps/families.js), placed from
// the Stamps tab of the Seed43 drawer, edited in the properties panel. Every
// stamp of a family shows the family's parameter values: change one stamp and
// all stamps of that family in the file follow. "Per stamp" parameters belong
// to the one stamp.
//
// Sheets (drawing sheets and forms) are stamps too: fitted to the page, drawn
// as ink only so white is see-through, kept behind every other markup, and
// selected only by their title block so the drawing under them stays usable.

import { registreerEigenschappen, registreerStempelTab } from '../eigenschappen.js';
import { formulier, kop as formKop, groep, veld as formVeld, tip } from '../formulier.js';
import { laadFamilies, bewaarFamilies, standaardWaarden, AUTO, groepVan } from './families.js';
import { maat, teken, grenzen, raakVlak, bijPlaatjeGeladen } from './render.js';
import { openBouwer } from './builder.js';
import { maakStempelLijst } from './panel.js';
import { laadProfiel, profielWaarden } from './profile.js';
import { maakQa, stopQa } from './qa.js';
import { legePdf } from './pdf.js';
import { startInPlaats, stopInPlaats } from './inplace.js';
import { revVeld, revRijen, revLijst, revIndex, volgendeRev, metRevs } from './revs.js';

export const TYPE = 'seed43Stamp';

let families = [];
let actief = false;
let ladeLijst = null;   // the list in the drawer's Stamps tab
let achterKlok = null;
let api0 = null;

const kopie = (x) => JSON.parse(JSON.stringify(x));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isBlad = (f) => groepVan(f) !== 'stamp';

function familieIcoon(f) {
  const kleur = /^#[0-9a-f]{3,8}$/i.test(f.color || '') ? f.color : '#c0392b';
  if (isBlad(f)) {
    const staand = (f.height || 1) > (f.width || 1);
    const [w, h] = staand ? [14, 19] : [20, 14];
    const x = 12 - w / 2, y = 12 - h / 2;
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="1.4"/>`
      + (groepVan(f) === 'sheet'
        ? `<rect x="${x + w * 0.55}" y="${y + h * 0.7}" width="${w * 0.45}" height="${h * 0.3}" fill="none" stroke="currentColor" stroke-width="1"/>`
        : `<path d="M${x + 2} ${y + 4}h${w - 4}M${x + 2} ${y + 7}h${w - 4}M${x + 2} ${y + 10}h${w - 7}" stroke="currentColor" stroke-width="1"/>`)
      + '</svg>';
  }
  const letters = esc((f.name || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '?');
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="${kleur}" stroke-width="1.8"/><line x1="4" y1="9" x2="20" y2="9" stroke="${kleur}" stroke-width="1"/><text x="12" y="17" font-size="6.5" font-family="Arial" font-weight="bold" text-anchor="middle" fill="${kleur}">${letters}</text></svg>`;
}

const context = (api) => ({ fileName: api.getDocumentInfo?.()?.name || '', pages: api.getPageCount?.() || 0 });

async function laadAllePaginas(api) {
  const n = api.getPageCount();
  for (let p = 1; p <= n; p++) await api.waitForPageAnnotations(p);
}

/** Load every page's markups, then update all stamps of `familieId`. */
export async function werkFamilieBij(api, familieId, wijzig) {
  await laadAllePaginas(api);
  const ops = api.getAnnotations()
    .filter((a) => a.type === TYPE && a.stamp?.family?.id === familieId)
    .map((a) => ({ op: 'update', id: a.id, changes: { stamp: wijzig(kopie(a.stamp)) } }));
  if (ops.length) api.applyAnnotationBatch(ops);
  return ops.length;
}

/** Values for a new stamp: the family's shared values in this file, per-stamp defaults, my details. */
function nieuweWaarden(api, familie) {
  const basis = standaardWaarden(familie);
  const al = api.getAnnotations().find((a) => a.type === TYPE && a.stamp?.family?.id === familie.id);
  const prof = profielWaarden(familie, laadProfiel());
  for (const v of familie.fields) {
    if (al && !v.perStamp && v.kind !== 'auto' && al.stamp.values?.[v.key] !== undefined) basis[v.key] = al.stamp.values[v.key];
    else if (v.key in prof && prof[v.key] && !basis[v.key]) basis[v.key] = prof[v.key];
  }
  return basis;
}

function nieuwStempel(api, familie, page, x, y, extra = {}) {
  return {
    type: TYPE, page, x, y, opacity: 1, subject: `${familie.name}${isBlad(familie) ? '' : ' stamp'}`,
    stamp: { family: kopie(familie), values: nieuweWaarden(api, familie), placed: new Date().toISOString() },
    ...extra,
  };
}

/**
 * Save one value of a placed stamp: a per-stamp value on this stamp only, a
 * shared one on every stamp of its family in the file.
 */
export async function zetVeld(api, ann, veld, waarde) {
  const r = revVeld(veld.key);
  if (r) {
    // A revision-row box: the newest revision, or a new one on the next empty row.
    const vers = api.getAnnotations().find((a) => a.id === ann.id) || ann;
    const k = revIndex(vers.stamp, r.rij);
    return zetRevs(api, vers, (lijst) => {
      if (k === lijst.length) lijst.push(nieuweRev(lijst));
      if (k === lijst.length - 1) lijst[k][r.kol] = waarde;
      return lijst;
    });
  }
  if (veld.perStamp) {
    const vers = api.getAnnotations().find((a) => a.id === ann.id) || ann;
    const s = kopie(vers.stamp); s.values = { ...(s.values || {}), [veld.key]: waarde };
    api.applyAnnotationBatch([{ op: 'update', id: ann.id, changes: { stamp: s } }]);
  } else {
    await werkFamilieBij(api, ann.stamp.family.id, (s) => { s.values = { ...(s.values || {}), [veld.key]: waarde }; return s; });
  }
  api.redrawAnnotations?.();
}

/** Change a sheet's revision list (it belongs to this sheet only). */
export function zetRevs(api, ann, wijzig) {
  const vers = api.getAnnotations().find((a) => a.id === ann.id) || ann;
  const s = kopie(vers.stamp);
  s.values = metRevs(s, wijzig);
  api.applyAnnotationBatch([{ op: 'update', id: ann.id, changes: { stamp: s } }]);
  api.redrawAnnotations?.();
}

/** A new revision: the next code, today, my initials. */
function nieuweRev(lijst) {
  const laatste = lijst[lijst.length - 1];
  return { rev: volgendeRev(laatste?.rev), desc: '', by: laadProfiel().initials || '', date: new Date().toISOString().slice(0, 10) };
}

// ── sheets: fit to the page, keep at the back ─────────────────────────

async function paginaMaat(api, page) {
  try { const i = await api.getPageInfo(page); if (i?.width > 0) return { w: i.width, h: i.height }; } catch {}
  return null;
}

async function bladOp(api, familie, page) {
  const m = await paginaMaat(api, page);
  const W = familie.width || 595, H = familie.height || 842;
  const s = m ? Math.min(m.w / W, m.h / H) : 1;
  const x = m ? (m.w - W * s) / 2 : 0, y = m ? (m.h - H * s) / 2 : 0;
  return nieuwStempel(api, familie, page, x, y, { scale: s, seed43Sheet: true });
}

/** Put sheets on pages: 'page' (the current one), 'all', or an array of page numbers. */
export async function plaatsBlad(api, familie, waar = 'page') {
  const n = api.getPageCount();
  if (!n) { alert('Open a PDF first.'); return 0; }
  const paginas = waar === 'all' ? Array.from({ length: n }, (_, i) => i + 1)
    : Array.isArray(waar) ? waar : [api.getCurrentPage?.() || 1];
  const ops = [];
  for (const p of paginas) ops.push({ op: 'create', annotation: await bladOp(api, familie, p) });
  api.applyAnnotationBatch(ops);
  naarAchter(api);
  return ops.length;
}

/**
 * Sheets go behind every other markup on their page. The host draws markups
 * in array order and has no API for it, so the live array is reordered (a
 * stable split: sheets first, the rest in their own order).
 */
function naarAchter(api) {
  const lijst = api.getAnnotations?.();
  if (!Array.isArray(lijst) || lijst.length < 2) return;
  let zagAnder = false, nodig = false;
  for (const a of lijst) {
    const blad = a.type === TYPE && a.seed43Sheet;
    if (!blad) zagAnder = true; else if (zagAnder) { nodig = true; break; }
  }
  if (!nodig) return;
  const bladen = lijst.filter((a) => a.type === TYPE && a.seed43Sheet);
  const rest = lijst.filter((a) => !(a.type === TYPE && a.seed43Sheet));
  lijst.splice(0, lijst.length, ...bladen, ...rest);
  api.redrawAnnotations?.();
}

/** A new PDF of `aantal` pages, the sheet's size, with the sheet on every page. */
export async function nieuwePdfVanBlad(api, familie, aantal = 1) {
  const T = window.__TAURI__;
  if (!T?.fs || !T?.path || !T?.event) { alert('This needs the Open PDF Studio desktop app.'); return; }
  const naam = `${familie.name.replace(/[\\/:*?"<>|]/g, '_')} - ${new Date().toISOString().slice(0, 10)} ${Date.now().toString(36).slice(-4)}.pdf`;
  const map = (await T.path.tempDir()).replace(/[\\/]$/, '');
  const pad = `${map}/${naam}`;
  await T.core.invoke('allow_fs_scope', { path: pad });
  await T.fs.writeFile(pad, legePdf(familie.width || 595, familie.height || 842, aantal));
  await T.event.emit('open-files', [pad]);
  // Wait for the new tab, then put the sheet on every page.
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 150));
    const info = api.getDocumentInfo?.();
    if (info?.name === naam && api.getPageCount() === aantal) {
      await laadAllePaginas(api);
      await plaatsBlad(api, familie, 'all');
      return;
    }
  }
  alert('The new PDF opened, but Seed43 could not add the sheet to it. Use Add to all pages.');
}

// ── properties panel ──────────────────────────────────────────────────

function knopje(tekst, titel, actie) {
  const b = document.createElement('button');
  b.textContent = tekst; b.title = titel;
  b.addEventListener('click', async (e) => { e.preventDefault(); b.disabled = true; try { await actie(); } finally { b.disabled = false; } });
  return b;
}

function rijKnoppen(...knoppen) {
  const d = document.createElement('div');
  d.style.cssText = 'display:flex;gap:4px;margin-top:2px;flex-wrap:wrap;';
  d.append(...knoppen);
  return d;
}

/** Copy a stamp to other pages, at the same place. */
async function kopieerNaarPaginas(api, ann, keuze, bereik) {
  const n = api.getPageCount();
  let paginas = [];
  if (keuze === 'all') paginas = Array.from({ length: n }, (_, i) => i + 1);
  else if (keuze === 'notFirst') paginas = Array.from({ length: n - 1 }, (_, i) => i + 2);
  else {
    for (const deel of String(bereik).split(',')) {
      const m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(deel);
      if (!m) continue;
      const a = +m[1], b = +(m[2] || m[1]);
      for (let p = Math.min(a, b); p <= Math.max(a, b); p++) if (p >= 1 && p <= n) paginas.push(p);
    }
  }
  paginas = [...new Set(paginas)].filter((p) => p !== ann.page);
  if (!paginas.length) { alert('No other pages to copy to.'); return 0; }
  await laadAllePaginas(api);
  const { id, page, ...rest } = kopie(ann);
  api.applyAnnotationBatch(paginas.map((p) => ({ op: 'create', annotation: { ...rest, page: p, stamp: { ...rest.stamp, placed: new Date().toISOString() } } })));
  naarAchter(api);
  return paginas.length;
}

function paneel(api) {
  return (ann, update) => {
    if (!ann) return document.createElement('div');   // the host calls this on deselect too
    const stamp = ann.stamp;
    const fam = stamp?.family;
    const el = formulier();
    if (!fam) { el.textContent = 'Not a Seed43 stamp'; return el; }
    const blad = isBlad(fam);
    const vergrendeld = !!ann.locked;
    formKop(el, blad ? fam.name : `${fam.name} stamp`,
      blad ? 'Shared values change every sheet of this kind in the file. Per-sheet values belong to this page. Or double-click a box on the sheet to fill it in there.' : `Changes update every ${fam.name} stamp in this file.`,
      fam.color || '#c0392b', familieIcoon(fam));
    if (vergrendeld) el.appendChild(tip('Locked: unlock it below to change it.'));


    const toonVelden = (titel, velden) => {
      if (!velden.length) return;
      groep(el, titel);
      for (const veld of velden) {
        const zet = (w) => zetVeld(api, ann, veld, w);
        let invoer;
        let extra = null;
        if (veld.kind === 'auto') {
          invoer = document.createElement('span');
          invoer.className = 's43f-tekst';
          invoer.textContent = `${AUTO[veld.auto] || 'Automatic'} (automatic)`;
          invoer.style.opacity = '0.6';
        } else if (veld.kind === 'choice' || veld.kind === 'check') {
          invoer = document.createElement('select');
          const opties = veld.kind === 'check' ? ['', ...(veld.options || [])] : (veld.options || []);
          for (const o of opties) {
            const opt = document.createElement('option');
            opt.value = o; opt.textContent = o || '(none ticked)';
            invoer.appendChild(opt);
          }
          invoer.value = stamp.values?.[veld.key] ?? '';
        } else if (veld.kind === 'signature') {
          invoer = document.createElement('span');
          invoer.className = 's43f-tekst';
          invoer.textContent = stamp.values?.[veld.key] ? 'Signed' : 'Not signed';
          extra = rijKnoppen(
            knopje('Sign', 'Use the signature saved in My details', async () => {
              const sig = laadProfiel().signature;
              if (!sig) { alert('No signature saved yet. Add one in Stamp Builder › My details.'); return; }
              await zet(sig);
            }),
            knopje('Clear', 'Remove the signature', () => zet('')),
          );
        } else if (veld.multi) {
          invoer = document.createElement('textarea');
          invoer.rows = 4;
          invoer.style.cssText = 'width:100%;box-sizing:border-box;resize:vertical;font:inherit;';
          invoer.value = stamp.values?.[veld.key] ?? '';
        } else {
          invoer = document.createElement('input');
          invoer.type = veld.kind === 'date' ? 'date' : 'text';
          if (veld.kind === 'initials') invoer.maxLength = 6;
          invoer.value = stamp.values?.[veld.key] ?? '';
        }
        if (veld.kind === 'profile') {
          extra = rijKnoppen(knopje('From my details', 'Fill in from Stamp Builder › My details', async () => {
            const w = laadProfiel()[veld.from] || '';
            if (!w) { alert('Nothing saved for this in My details yet.'); return; }
            invoer.value = w; await zet(w);
          }));
        }
        if (veld.kind === 'date') {
          const geplaatst = veld.blank ? '' : (stamp.placed || '').slice(0, 10);
          if (!invoer.value && geplaatst) { invoer.value = geplaatst; invoer.title = 'Date placed (not set)'; }
          extra = rijKnoppen(
            knopje('Today', `Set ${veld.label} to today`, async () => { const t = new Date().toISOString().slice(0, 10); invoer.value = t; await zet(t); }),
            knopje(veld.blank ? 'Clear' : 'Placed', veld.blank ? 'Leave it empty' : 'Show the date each stamp was placed', async () => { invoer.value = geplaatst; await zet(''); }),
          );
        }
        if (vergrendeld) { invoer.disabled = true; extra?.querySelectorAll('button').forEach((b) => { b.disabled = true; }); }
        if (!['auto', 'signature'].includes(veld.kind)) invoer.addEventListener('change', () => zet(invoer.value));
        formVeld(el, veld.label + (veld.perStamp && !blad ? ' (this stamp)' : ''), invoer, extra);
      }
    };
    const metRevRijen = revRijen(fam) > 0;
    const velden = fam.fields.filter((v) => (!v.hidden || v.kind === 'profile') && !(metRevRijen && revVeld(v.key)));
    if (blad) {
      toonVelden('This sheet', velden.filter((v) => v.perStamp));
      if (metRevRijen) toonRevisies(el, api, ann, vergrendeld, update);
      toonVelden('Shared by every sheet', velden.filter((v) => !v.perStamp));
    } else toonVelden('Parameters', velden);

    // Stamp: size, copy to pages, lock.
    groep(el, blad ? 'Sheet' : 'Stamp');
    const grootte = document.createElement('input');
    grootte.type = 'number'; grootte.min = 10; grootte.max = 2000; grootte.step = 5;
    grootte.value = Math.round((ann.scale || 1) * 100);
    grootte.disabled = vergrendeld;
    grootte.addEventListener('change', () => {
      const s = Math.max(0.1, Math.min(20, (Number(grootte.value) || 100) / 100));
      api.applyAnnotationBatch([{ op: 'update', id: ann.id, changes: { scale: s } }]);
      api.redrawAnnotations?.();
    });
    const knoppenGrootte = blad ? rijKnoppen(knopje('Fit to page', 'Fit the sheet to this page again', async () => {
      const n = await bladOp(api, fam, ann.page);
      api.applyAnnotationBatch([{ op: 'update', id: ann.id, changes: { x: n.x, y: n.y, scale: n.scale } }]);
      api.redrawAnnotations?.();
    })) : null;
    formVeld(el, 'Size (%)', grootte, knoppenGrootte);

    const keuze = document.createElement('select');
    for (const [k, t] of [['all', 'All pages'], ['notFirst', 'All but the first page'], ['range', 'Pages…']]) {
      const o = document.createElement('option'); o.value = k; o.textContent = t; keuze.appendChild(o);
    }
    const bereik = document.createElement('input');
    bereik.type = 'text'; bereik.placeholder = 'e.g. 2-5, 8'; bereik.style.display = 'none';
    keuze.addEventListener('change', () => { bereik.style.display = keuze.value === 'range' ? '' : 'none'; });
    const kopKnop = knopje('Copy', 'Put a copy at the same place on those pages', async () => {
      const n = await kopieerNaarPaginas(api, ann, keuze.value, bereik.value);
      if (n) kopKnop.textContent = `Copied to ${n}`;
    });
    formVeld(el, 'Copy to', keuze, rijKnoppen(bereik, kopKnop));

    const slot = document.createElement('input');
    slot.type = 'checkbox'; slot.checked = vergrendeld;
    slot.title = 'A locked stamp can\'t be moved or changed until it is unlocked';
    slot.addEventListener('change', () => {
      api.applyAnnotationBatch([{ op: 'update', id: ann.id, changes: { locked: slot.checked } }]);
      api.redrawAnnotations?.();
    });
    formVeld(el, 'Locked', slot);
    return el;
  };
}

/**
 * Revisions of a sheet in Properties: older ones greyed (history), the newest
 * editable, and Add revision for the next one. The sheet shows as many of the
 * newest as it has revision rows.
 */
function toonRevisies(el, api, ann, vergrendeld, update) {
  // Through the panel's update when there is one, so the form redraws.
  const wijzig = (fn) => {
    if (typeof update !== 'function') return zetRevs(api, ann, fn);
    const s = kopie(ann.stamp);
    s.values = metRevs(s, fn);
    update('stamp', s);
  };
  const lijst = revLijst(ann.stamp);
  const n = revRijen(ann.stamp.family);
  groep(el, n === 1 ? 'Revisions (the sheet shows the newest)' : `Revisions (the sheet shows the newest ${n})`);
  const invoer = (waarde, type, uit) => {
    const i = document.createElement('input');
    i.type = type; i.value = waarde || ''; i.disabled = uit || vergrendeld;
    i.style.cssText = 'width:100%;min-width:0;box-sizing:border-box;';
    return i;
  };
  lijst.forEach((r, k) => {
    const nieuwste = k === lijst.length - 1;
    const rij = document.createElement('div');
    // Rev, By and Date on one line, the description under them.
    rij.style.cssText = `display:grid;grid-template-columns:42px 46px minmax(0,1fr);gap:3px;width:100%;${nieuwste ? '' : 'opacity:.5;'}`;
    const delen = [invoer(r.rev, 'text', !nieuwste), invoer(r.desc, 'text', !nieuwste), invoer(r.by, 'text', !nieuwste), invoer(r.date, 'date', !nieuwste)];
    delen[0].placeholder = 'Rev'; delen[1].placeholder = 'Description'; delen[2].placeholder = 'By';
    if (nieuwste) {
      ['rev', 'desc', 'by', 'date'].forEach((kol, i) => delen[i].addEventListener('change', () => wijzig((l) => { l[l.length - 1][kol] = delen[i].value; return l; })));
    } else rij.title = 'An older revision: only the newest can be changed';
    delen[1].style.gridColumn = '1 / -1';
    rij.append(delen[0], delen[2], delen[3], delen[1]);
    formVeld(el, nieuwste ? 'Newest' : k >= lijst.length - n ? 'On the sheet' : 'Off the sheet', rij);
  });
  if (!lijst.length) el.appendChild(tip('No revisions yet: add the first one.'));
  const laatste = lijst[lijst.length - 1];
  const toevoegen = knopje('Add revision', 'Start the next revision on a new line; the one before is kept, greyed out', () => wijzig((l) => { l.push(nieuweRev(l)); return l; }));
  toevoegen.disabled = vergrendeld || !!(laatste && !laatste.rev && !laatste.desc);
  const weg = knopje('Remove newest', 'Take the newest revision off this sheet', async () => {
    if (!confirm(`Remove revision ${laatste?.rev || ''} from this sheet?`)) return;
    wijzig((l) => { l.pop(); return l; });
  });
  weg.disabled = vergrendeld || !lijst.length;
  formVeld(el, '', rijKnoppen(toevoegen, weg));
}

function markeringType(api) {
  return {
    drawMode: 'click',
    cursor: 'copy',
    create(x, y, _x2, _y2, _e, state) {
      const id = state?.toolOverrides?.seed43Family;
      const familie = families.find((f) => f.id === id && !isBlad(f)) || families.find((f) => !isBlad(f));
      if (!familie) return null;
      const { width, height } = maat(familie, {}, context(api));
      const ann = nieuwStempel(api, familie, undefined, x - width / 2, y - height / 2);
      delete ann.page;   // the host sets the page it was clicked on
      return ann;
    },
    render(ctx, ann) { teken(ctx, ann, context(api)); },
    getBounds(ann) { return grenzen(ann, context(api)); },
    hitTest(px, py, ann, tol = 2) {
      const b = raakVlak(ann, context(api));
      return px >= b.x - tol && px <= b.x + b.width + tol && py >= b.y - tol && py <= b.y + b.height + tol;
    },
  };
}

export async function startStamps(api) {
  if (actief) return;
  api0 = api;
  families = laadFamilies();
  bijPlaatjeGeladen(() => api.redrawAnnotations?.());
  api.registerAnnotationType(TYPE, markeringType(api));
  registreerEigenschappen(api, TYPE, paneel(api));
  actief = true;
  achterKlok = setInterval(() => { try { naarAchter(api); } catch {} }, 700);
  // Double-click a box on a sheet, memo or placed stamp to fill it in there.
  startInPlaats(api, { type: TYPE, zet: (ann, veld, w) => zetVeld(api, ann, veld, w), profiel: laadProfiel });
  registreerStempelTab({
    bouw: () => {
      ladeLijst = maakStempelLijst({
        families, icoon: familieIcoon,
        kies: (f) => { api.setTool(TYPE); api.setToolOverrides({ seed43Family: f.id }); },
        blad: {
          plaatsHier: (f) => plaatsBlad(api, f, 'page'),
          plaatsAlle: (f) => plaatsBlad(api, f, 'all'),
          nieuw: (f, n) => nieuwePdfVanBlad(api, f, n),
        },
        bouwer: () => bouwer(api),
        qa: maakQa(api, TYPE),
      });
      return ladeLijst.el;
    },
    ververs: () => ladeLijst?.ververs(families),
  });
}

export async function stopStamps(api) {
  if (!actief) return;
  actief = false;
  clearInterval(achterKlok);
  stopQa('stamps');
  stopInPlaats();
  registreerStempelTab(null);
  ladeLijst = null;
  try { api?.unregisterToolPalette?.('smart-stamps'); } catch {}   // left by versions before 26.11.21.1
  try { api?.unregisterPropertyPanel?.(TYPE); } catch {}
  // The markup type stays registered so placed stamps keep showing.
}

export function isActief() { return actief; }

export function bouwer(api = api0) {
  if (!actief) return;
  openBouwer(families, api, async (nieuw, gewijzigd) => {
    families = nieuw;
    bewaarFamilies(families);
    ladeLijst?.ververs(families);
    // Placed stamps of a changed family take its new design; values stay.
    for (const f of gewijzigd) {
      await werkFamilieBij(api, f.id, (s) => {
        s.family = kopie(f);
        const w = standaardWaarden(f);
        s.values = Object.fromEntries(Object.keys(w).map((k) => [k, s.values?.[k] ?? w[k]]));
        return s;
      }).catch(() => 0);
    }
    api.redrawAnnotations?.();
  });
}
