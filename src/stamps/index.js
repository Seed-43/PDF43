// Smart Stamps: stamps built from families (stamps/families.js), placed from
// the dockable Smart Stamps palette, edited in the properties panel. Every
// stamp of a family shows the family's parameter values: change one stamp and
// all stamps of that family in the file follow.

import { laadFamilies, bewaarFamilies, standaardWaarden, AUTO } from './families.js';
import { maat, teken } from './render.js';
import { openBouwer } from './builder.js';

export const TYPE = 'seed43Stamp';
export const PALET = 'smart-stamps';

let families = [];
let actief = false;

const kopie = (x) => JSON.parse(JSON.stringify(x));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function familieIcoon(f) {
  const kleur = /^#[0-9a-f]{3,8}$/i.test(f.color || '') ? f.color : '#c0392b';
  const letters = esc((f.name || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '?');
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="${kleur}" stroke-width="1.8"/><line x1="4" y1="9" x2="20" y2="9" stroke="${kleur}" stroke-width="1"/><text x="12" y="17" font-size="6.5" font-family="Arial" font-weight="bold" text-anchor="middle" fill="${kleur}">${letters}</text></svg>`;
}

const PALET_ICOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="9" rx="1.5"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/><path d="M6 15h12"/></svg>';

function registreerPalet(api) {
  api.registerToolPalette({
    id: PALET,
    label: 'Smart Stamps',
    icon: PALET_ICOON,
    defaultVisible: false,
    defaultMode: 'docked-right',
    tools: families.map((f, i) => ({
      id: `stamp-${f.id}`, tool: TYPE, label: f.name, icon: familieIcoon(f), group: i,
      overrides: { seed43Family: f.id },
    })),
  });
}

/** Load every page's markups, then update all stamps of `familieId`. */
export async function werkFamilieBij(api, familieId, wijzig) {
  const n = api.getPageCount();
  for (let p = 1; p <= n; p++) await api.waitForPageAnnotations(p);
  const ops = api.getAnnotations()
    .filter((a) => a.type === TYPE && a.stamp?.family?.id === familieId)
    .map((a) => ({ op: 'update', id: a.id, changes: { stamp: wijzig(kopie(a.stamp)) } }));
  if (ops.length) api.applyAnnotationBatch(ops);
  return ops.length;
}

/** The current values of a family in this file (from any placed stamp). */
function waardenInBestand(api, familie) {
  const al = api.getAnnotations().find((a) => a.type === TYPE && a.stamp?.family?.id === familie.id);
  return al ? kopie(al.stamp.values || {}) : standaardWaarden(familie);
}

function paneel(api) {
  return (ann) => {
    if (!ann) return document.createElement('div');   // the host calls this on deselect too
    const stamp = ann.stamp;
    const fam = stamp?.family;
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:8px;font-size:12px;border-top:2px solid ' + (fam?.color || '#c0392b') + ';';
    if (!fam) { el.textContent = 'Not a Seed43 stamp'; return el; }
    const kop = document.createElement('div');
    kop.innerHTML = `<div style="font-weight:bold;font-size:13px;color:${esc(fam.color || '#c0392b')}">${esc(fam.name)} stamp</div><div style="opacity:.7">Changes update every ${esc(fam.name)} stamp in this file.</div>`;
    el.appendChild(kop);
    // The app lists its own sections first: bring the stamp's parameters into view.
    requestAnimationFrame(() => { try { el.scrollIntoView({ block: 'start' }); } catch {} });
    for (const veld of fam.fields) {
      const rij = document.createElement('label');
      rij.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
      const l = document.createElement('span');
      l.textContent = veld.label;
      l.style.opacity = '0.8';
      rij.appendChild(l);
      let invoer;
      if (veld.kind === 'auto') {
        invoer = document.createElement('span');
        invoer.textContent = `${AUTO[veld.auto] || 'Automatic'} (automatic)`;
        invoer.style.opacity = '0.6';
      } else if (veld.kind === 'choice') {
        invoer = document.createElement('select');
        for (const o of veld.options || []) {
          const opt = document.createElement('option');
          opt.value = o; opt.textContent = o;
          invoer.appendChild(opt);
        }
        invoer.value = stamp.values?.[veld.key] ?? '';
      } else {
        invoer = document.createElement('input');
        invoer.type = veld.kind === 'date' ? 'date' : 'text';
        invoer.value = stamp.values?.[veld.key] ?? '';
      }
      const zet = async (waarde) => {
        await werkFamilieBij(api, fam.id, (s) => { s.values = { ...(s.values || {}), [veld.key]: waarde }; return s; });
        api.redrawAnnotations?.();
      };
      if (veld.kind === 'date') {
        // Not set: each stamp shows the date it was placed.
        const geplaatst = (stamp.placed || '').slice(0, 10);
        if (!invoer.value) { invoer.value = geplaatst; invoer.title = 'Date placed (not set)'; }
        const knoppen = document.createElement('div');
        knoppen.style.cssText = 'display:flex;gap:4px;margin-top:2px;';
        const knop = (tekst, titel, waarde) => {
          const b = document.createElement('button');
          b.textContent = tekst; b.title = titel;
          b.style.cssText = 'font:inherit;padding:2px 8px;cursor:pointer;';
          b.addEventListener('click', async (e) => { e.preventDefault(); invoer.value = waarde() || geplaatst; await zet(waarde()); });
          return b;
        };
        knoppen.append(
          knop('Today', `Set ${veld.label} to today on every ${fam.name} stamp`, () => new Date().toISOString().slice(0, 10)),
          knop('Placed', `Show the date each ${fam.name} stamp was placed`, () => ''),
        );
        rij.append(l, invoer, knoppen);
      }
      if (veld.kind !== 'auto') {
        invoer.style.cssText = 'font:inherit;padding:3px 5px;';
        invoer.addEventListener('change', () => zet(invoer.value));
      }
      if (veld.kind !== 'date') rij.appendChild(invoer);
      el.appendChild(rij);
    }
    return el;
  };
}

function markeringType(api) {
  return {
    drawMode: 'click',
    cursor: 'copy',
    create(x, y, _x2, _y2, _e, state) {
      const id = state?.toolOverrides?.seed43Family;
      const familie = families.find((f) => f.id === id) || families[0];
      if (!familie) return null;
      const { width, height } = maat(familie);
      return {
        type: TYPE, x: x - width / 2, y: y - height / 2, width, height, opacity: 1,
        subject: `${familie.name} stamp`,
        stamp: { family: kopie(familie), values: waardenInBestand(api, familie), placed: new Date().toISOString() },
      };
    },
    render(ctx, ann) {
      teken(ctx, ann, { fileName: api.getDocumentInfo?.()?.name || '' });
    },
    getBounds(ann) {
      const fam = ann.stamp?.family;
      return fam ? { x: ann.x, y: ann.y, ...maat(fam) } : { x: ann.x, y: ann.y, width: ann.width || 0, height: ann.height || 0 };
    },
    hitTest(px, py, ann, tol = 2) {
      const b = this.getBounds(ann);
      return px >= b.x - tol && px <= b.x + b.width + tol && py >= b.y - tol && py <= b.y + b.height + tol;
    },
  };
}

export async function startStamps(api) {
  if (actief) return;
  families = laadFamilies();
  api.registerAnnotationType(TYPE, markeringType(api));
  api.registerPropertyPanel(TYPE, paneel(api));
  registreerPalet(api);
  actief = true;
}

export async function stopStamps(api) {
  if (!actief) return;
  actief = false;
  try { await api?.setToolPaletteVisible?.(PALET, false); } catch {}
  try { api?.unregisterToolPalette?.(PALET); } catch {}
  try { api?.unregisterPropertyPanel?.(TYPE); } catch {}
  // The markup type stays registered so placed stamps keep showing.
}

export function isActief() { return actief; }

/** Open or close the Smart Stamps palette. Returns whether it is now open. */
export async function wisselPalet(api) {
  if (!actief) return false;
  const open = await api.isToolPaletteVisible?.(PALET);
  await api.setToolPaletteVisible?.(PALET, !open);
  return !open;
}

export function bouwer(api) {
  if (!actief) return;
  openBouwer(families, async (nieuw, gewijzigd) => {
    families = nieuw;
    bewaarFamilies(families);
    registreerPalet(api);
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
