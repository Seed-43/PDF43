// Stamps tab of the Seed43 drawer: QA colours, a search box with the Stamp
// Builder on its right, then the families in three groups:
//   Stamps  click one, then click on the sheet to place it
//   Sheets  drawing sheets: add to this page, to all pages, or a new PDF
//   Forms   A4 forms (RFI, site instruction…): usually a new PDF

import { GROEPEN, groepVan } from './families.js';
import { QA_CSS } from './qa.js';

const STIJL_ID = 'seed43-stamp-panel-stijl';
const OPEN = 'seed43.stampGroups';

const CSS = `
.s43p-lijst{padding:4px;}
.s43p-groep{font-size:11.5px;font-weight:bold;opacity:.75;padding:8px 6px 3px;cursor:pointer;user-select:none;display:flex;gap:6px;align-items:center;}
.s43p-groep::before{content:'▾';font-size:10px;width:10px;}
.s43p-groep[data-dicht="1"]::before{content:'▸';}
.s43p-knop{display:flex;align-items:center;gap:8px;width:100%;padding:5px 6px;border:1px solid transparent;border-radius:4px;
  background:none;color:inherit;cursor:pointer;text-align:left;font:inherit;font-size:13px;}
.s43p-knop:hover{background:var(--hover);}
.s43p-knop[data-aan="1"]{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 12%,transparent);}
.s43p-knop svg{width:22px;height:22px;flex:none;}
.s43p-acties{display:flex;flex-wrap:wrap;gap:4px;padding:4px 6px 8px 36px;}
.s43p-acties button{font:inherit;font-size:12px;padding:4px 8px;border:1px solid var(--rand,#c8ccd1);border-radius:4px;background:none;color:inherit;cursor:pointer;}
.s43p-acties button:hover{border-color:var(--acc,#0078d7);}
.s43p-acties input{width:44px;font:inherit;font-size:12px;padding:3px 4px;border:1px solid var(--rand,#c8ccd1);border-radius:4px;background:transparent;color:inherit;}
.s43p-acties label{display:flex;align-items:center;gap:4px;font-size:12px;}
.s43p-leeg{padding:8px;opacity:.7;}
.s43p-zoek{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--rand,#c8ccd1);}
.s43p-zoek input{flex:1;min-width:0;box-sizing:border-box;font:inherit;font-size:14px;padding:7px 10px;border-radius:6px;
  border:1px solid var(--rand,#c8ccd1);background:transparent;color:inherit;}
.s43p-zoek input:focus{outline:none;border-color:var(--acc,#0078d7);}
.s43p-bouwer{flex:none;white-space:nowrap;font:inherit;font-size:12px;padding:7px 10px;border:1px solid var(--acc,#0078d7);border-radius:5px;background:none;color:inherit;cursor:pointer;}
.s43p-bouwer:hover{background:color-mix(in srgb,var(--acc,#0078d7) 15%,transparent);}
${QA_CSS}
`;

function leesDicht() {
  try { return JSON.parse(localStorage.getItem(OPEN) || '{}') || {}; } catch { return {}; }
}

function knop(tekst, titel, fn) {
  const b = document.createElement('button');
  b.textContent = tekst; b.title = titel;
  b.addEventListener('click', async (e) => {
    e.stopPropagation(); b.disabled = true;
    try { await fn(); } catch (err) { alert(err.message || err); } finally { b.disabled = false; }
  });
  return b;
}

function bladActies(f, blad) {
  const d = document.createElement('div');
  d.className = 's43p-acties';
  const aantal = document.createElement('input');
  aantal.type = 'number'; aantal.min = 1; aantal.max = 200; aantal.value = 1;
  aantal.title = 'How many pages the new PDF gets';
  const l = document.createElement('label');
  l.append(knop('New PDF', `A new PDF with this ${groepVan(f) === 'form' ? 'form' : 'sheet'} on every page (1 page = a blank sheet)`, () => blad.nieuw(f, Math.max(1, Math.min(200, +aantal.value || 1)))), aantal, 'pages');
  d.append(
    knop('Add to this page', 'Put it on the page you are on, fitted to the page, behind the markups', () => blad.plaatsHier(f)),
    knop('Add to all pages', 'Put it on every page of this PDF', () => blad.plaatsAlle(f)),
    l,
  );
  return d;
}

function vulLijst(lijst, families, icoon, kies, blad, zoekt) {
  lijst.replaceChildren();
  if (!families.length) {
    lijst.innerHTML = `<div class="s43p-leeg">${zoekt ? 'No stamps match.' : 'No stamp families yet. Make one in the Stamp Builder.'}</div>`;
    return;
  }
  const dicht = leesDicht();
  for (const [g, titel] of Object.entries(GROEPEN)) {
    const inGroep = families.filter((f) => groepVan(f) === g);
    if (!inGroep.length) continue;
    const kop = document.createElement('div');
    kop.className = 's43p-groep';
    kop.textContent = `${titel} (${inGroep.length})`;
    const isDicht = !zoekt && !!dicht[g];
    kop.dataset.dicht = isDicht ? '1' : '0';
    const doos = document.createElement('div');
    doos.style.display = isDicht ? 'none' : '';
    kop.addEventListener('click', () => {
      const nu = doos.style.display !== 'none';
      doos.style.display = nu ? 'none' : '';
      kop.dataset.dicht = nu ? '1' : '0';
      const d2 = leesDicht(); d2[g] = nu;
      try { localStorage.setItem(OPEN, JSON.stringify(d2)); } catch {}
    });
    lijst.append(kop, doos);
    for (const f of inGroep) {
      const b = document.createElement('button');
      b.className = 's43p-knop';
      b.innerHTML = icoon(f);
      const naam = document.createElement('span');
      naam.textContent = f.name;
      b.appendChild(naam);
      doos.appendChild(b);
      if (g === 'stamp') {
        b.title = `Place a ${f.name} stamp: click on the sheet`;
        b.addEventListener('click', () => {
          for (const k of lijst.querySelectorAll('.s43p-knop')) k.dataset.aan = k === b ? '1' : '0';
          kies(f);
        });
      } else {
        b.title = 'Show what you can do with it';
        let acties = null;
        b.addEventListener('click', () => {
          for (const k of lijst.querySelectorAll('.s43p-acties')) if (k !== acties) k.remove();
          for (const k of lijst.querySelectorAll('.s43p-knop')) k.dataset.aan = k === b ? '1' : '0';
          if (acties?.isConnected) { acties.remove(); b.dataset.aan = '0'; return; }
          acties = bladActies(f, blad);
          b.after(acties);
        });
      }
    }
  }
}

/**
 * The list for the Stamps tab of the Seed43 drawer. Returns { el, ververs(families) }.
 */
export function maakStempelLijst({ families, icoon, kies, blad, bouwer, qa }) {
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
  const el = document.createElement('div');
  el.className = 's43p-tab';
  const balk = document.createElement('div');
  balk.className = 's43p-zoek';
  const invoer = document.createElement('input');
  invoer.type = 'text';   // not 'search': WebKitGTK draws that as a light GTK box
  invoer.placeholder = 'Search stamps, sheets, forms';
  invoer.spellcheck = false;
  const b = document.createElement('button');
  b.className = 's43p-bouwer';
  b.textContent = 'Stamp Builder…';
  b.title = 'Make or change stamps, sheets and forms, and set My details';
  b.addEventListener('click', () => bouwer());
  balk.append(invoer, b);
  const lijst = document.createElement('div');
  lijst.className = 's43p-lijst';
  if (qa) el.appendChild(qa);
  el.append(balk, lijst);
  let alle = families;
  const toon = () => {
    const q = invoer.value.trim().toLowerCase();
    const gevonden = q ? alle.filter((f) => `${f.name} ${f.title || ''}`.toLowerCase().includes(q)) : alle;
    vulLijst(lijst, gevonden, icoon, kies, blad, !!q);
  };
  invoer.addEventListener('input', toon);
  toon();
  return { el, ververs: (f) => { alle = f; toon(); }, focus: () => setTimeout(() => invoer.focus(), 50) };
}
