// Elements tab of the Seed43 drawer: the Element Library in short. Type a
// name or size, pick from the list and place it, without opening the library
// window. Follows the Countries choice of the library (which load, in which
// order).
//
//   Enter or double-click   place the first view (section, or bolt face)
//   click                   pick; the views show under the row

import { laadBibliotheek, regioVan, groepVan } from './store.js';
import { plaats, leesGebruik } from './elements.js';
import { tekenVoorbeeld, isHout } from './draw.js';
import { leesRegios, regioVolgorde } from './window.js';

const STIJL_ID = 'seed43-snelkies-stijl';
const MAX = 150;
const TOP = 20;

const CSS = `
.s43k{display:flex;flex-direction:column;height:100%;min-height:0;}
.s43k-zoek{padding:10px 12px;border-bottom:1px solid var(--rand);flex:none;}
.s43k-zoek input{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:7px 10px;border-radius:6px;
  border:1px solid var(--rand);background:transparent;color:inherit;}
.s43k-zoek input:focus{outline:none;border-color:var(--acc);}
.s43k-tel{padding:4px 12px;font-size:11.5px;color:var(--theme-text-secondary,#666);flex:none;}
.s43k-lijst{flex:1;min-height:0;overflow:auto;}
.s43k-rij{display:flex;align-items:center;gap:10px;padding:5px 12px;cursor:pointer;border-bottom:1px solid color-mix(in srgb,var(--rand) 50%,transparent);}
.s43k-rij:hover{background:color-mix(in srgb,var(--tx) 6%,transparent);}
.s43k-rij[data-aan]{background:color-mix(in srgb,var(--acc) 14%,transparent);}
.s43k-rij canvas{width:30px;height:30px;flex:none;}
.s43k-naam{flex:1;min-width:0;}
.s43k-naam b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.s43k-naam span{display:block;font-size:11.5px;color:var(--theme-text-secondary,#666);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.s43k-views{display:flex;gap:6px;padding:4px 12px 8px 52px;}
.s43k-views button{font:inherit;font-size:12px;padding:3px 10px;border-radius:5px;cursor:pointer;
  border:1px solid var(--acc);background:color-mix(in srgb,var(--acc) 18%,transparent);color:inherit;}
.s43k-views button:hover{background:color-mix(in srgb,var(--acc) 32%,transparent);}
.s43k-leeg{padding:16px 12px;color:var(--theme-text-secondary,#666);}
`;

function stijl() {
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
}

const maak = (tag, klasse = '', tekst = '') => {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst) e.textContent = tekst;
  return e;
};

function hooiberg(c, it) {
  const delen = [it.name, c.name, groepVan(c), regioVan(c)];
  if (it.d && it.b) delen.push(`${it.d}x${it.b}`, `${it.b}x${it.d}`);
  else if (it.d) delen.push(`d${it.d}`);
  for (const v of Object.values(it)) if (typeof v === 'string') delen.push(v);
  return delen.join(' ').toLowerCase().replace(/\s*x\s*/g, 'x');
}

/** The views offered for an item: [label, view] pairs; the first is the default. */
function views(c) {
  if (c.kind === 'bolt') return [['Face', 'section'], ['Plan', 'plan'], ['Elevation', 'elevation']];
  if (['hanger', 'plate', 'fangle'].includes(c.shape)) return [['Section', 'section'], ['Elevation', 'elevation']];
  return [['Section', 'section'], ['Elevation', 'elevation'], ['Plan', 'plan']];
}

/** Build the Elements tab. Returns { el, focus() }. */
export function maakSnelKies(api) {
  stijl();
  const el = maak('div', 's43k');
  const zoekVak = maak('div', 's43k-zoek');
  const invoer = maak('input');
  invoer.type = 'search';
  invoer.placeholder = 'Type a name or size: 310UB, 90x45, M16, SAE...';
  zoekVak.appendChild(invoer);
  const tel = maak('div', 's43k-tel');
  const lijst = maak('div', 's43k-lijst');
  el.append(zoekVak, tel, lijst);

  let lib = null;
  let resultaat = [];
  let gekozen = 0;

  const leg = (tekst) => { lijst.replaceChildren(maak('div', 's43k-leeg', tekst)); tel.textContent = ''; };

  // Empty search: the 20 most used elements, most used first.
  function meestGebruikt() {
    const g = leesGebruik();
    const inst = leesRegios();
    const uit = [];
    for (const [k, v] of Object.entries(g)) {
      const scheid = k.indexOf('|');
      const c = lib.categories.find((x) => x.id === k.slice(0, scheid));
      if (!c || inst.off.includes(regioVan(c))) continue;
      const it = c.items.find((x) => x.name === k.slice(scheid + 1));
      if (it) uit.push({ c, it, n: v.n || 0, laatst: v.laatst || 0 });
    }
    return uit.sort((a, b) => (b.n - a.n) || (b.laatst - a.laatst)).slice(0, TOP);
  }

  function zoek() {
    if (!lib) return;
    const woorden = invoer.value.toLowerCase().replace(/\s*x\s*/g, 'x').split(/\s+/).filter(Boolean);
    if (!woorden.length) { resultaat = meestGebruikt(); gekozen = 0; teken(); return; }
    const inst = leesRegios();
    const volgorde = regioVolgorde(lib, inst);
    const uit = [];
    for (const regio of volgorde) {
      if (inst.off.includes(regio)) continue;
      for (const c of lib.categories) {
        if (regioVan(c) !== regio || c.kind === 'table') continue;
        for (const it of c.items) {
          if (woorden.length && !woorden.every((w) => hooiberg(c, it).includes(w))) continue;
          uit.push({ c, it });
        }
      }
    }
    resultaat = uit;
    gekozen = 0;
    teken();
  }

  function plaatsHet(r, view) {
    plaats(api, r.c, r.it, view);
    // The most-used list changes once it is on the sheet: refresh when the
    // pointer comes back to the drawer.
    if (!invoer.value.trim()) el.addEventListener('pointerenter', () => zoek(), { once: true });
  }

  function teken() {
    const leeg = !invoer.value.trim();
    if (leeg && !resultaat.length) { leg('Type to find an element in the library, then double-click it or press Enter to place it. Your most used elements will show here.'); return; }
    if (!resultaat.length) { leg(`Nothing matches "${invoer.value}". Try a size such as 310 or 90x45.`); return; }
    tel.textContent = leeg ? 'Most used' : resultaat.length > MAX ? `${resultaat.length} found, first ${MAX} shown` : `${resultaat.length} found`;
    lijst.replaceChildren();
    resultaat.slice(0, MAX).forEach((r, i) => {
      const rij = maak('div', 's43k-rij');
      if (i === gekozen) rij.dataset.aan = '1';
      const cv = document.createElement('canvas');
      cv.width = 60; cv.height = 60;
      try {
        const ctx = cv.getContext('2d');
        tekenVoorbeeld(ctx, r.c.shape, r.it, 60, 60, { kleur: isHout(r.c.shape) ? '#b45309' : getComputedStyle(el).getPropertyValue('--acc') || '#0078d7', lijn: 2, marge: 6 });
      } catch {}
      const naam = maak('div', 's43k-naam');
      naam.append(maak('b', '', r.it.name), maak('span', '', `${r.c.name} · ${groepVan(r.c)} · ${regioVan(r.c)}${r.n ? ` · placed ${r.n}×` : ''}`));
      rij.append(cv, naam);
      rij.title = 'Double-click to place; click to choose the view';
      rij.addEventListener('click', () => { gekozen = i; teken(); });
      rij.addEventListener('dblclick', () => plaatsHet(r, views(r.c)[0][1]));
      lijst.appendChild(rij);
      if (i === gekozen) {
        const knoppen = maak('div', 's43k-views');
        for (const [label, view] of views(r.c)) {
          const b = maak('button', '', label);
          b.addEventListener('click', (e) => { e.stopPropagation(); plaatsHet(r, view); });
          knoppen.appendChild(b);
        }
        lijst.appendChild(knoppen);
      }
    });
  }

  let timer = null;
  invoer.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(zoek, 80); });
  invoer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = Math.min(resultaat.length, MAX);
      if (!n) return;
      gekozen = (gekozen + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      teken();
      lijst.querySelector('[data-aan]')?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = resultaat[gekozen];
      if (r) plaatsHet(r, views(r.c)[0][1]);
    } else if (e.key === 'Escape' && invoer.value) {
      e.preventDefault(); e.stopPropagation();
      invoer.value = '';
      zoek();
    }
    e.stopPropagation();   // typing here must not trigger the app's shortcuts
  });

  leg('Loading the library...');
  laadBibliotheek(api).then((b) => { lib = b; zoek(); }).catch((e) => leg(`The library did not load: ${e.message}`));

  return {
    el,
    focus() { if (lib) zoek(); setTimeout(() => invoer.focus(), 50); },
    /** Draw the list again (the most-used order may have changed). */
    ververs() { if (lib) zoek(); },
  };
}
