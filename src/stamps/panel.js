// Stamps tab of the Seed43 drawer: QA colours, a row of three tabs with the
// Stamp Builder on its right, a search box, then the families of that tab:
//   Stamps  click one, then click on the sheet to place it
//   Sheets  drawing sheets (A0 to A4): add to this page, to all pages, or a new PDF
//   Memos   A4 memos and forms (RFI, site instruction…): usually a new PDF

import { GROEPEN, groepVan } from './families.js';
import { QA_CSS } from './qa.js';

const STIJL_ID = 'seed43-stamp-panel-stijl';
const TAB = 'seed43.stampTab';

const CSS = `
.s43p-lijst{padding:4px;}
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
.s43p-zoek{display:flex;gap:8px;align-items:center;padding:8px 12px;}
.s43p-zoek input{flex:1;min-width:0;box-sizing:border-box;font:inherit;font-size:14px;padding:7px 10px;border-radius:6px;
  border:1px solid var(--rand,#c8ccd1);background:transparent;color:inherit;}
.s43p-zoek input:focus{outline:none;border-color:var(--acc,#0078d7);}
.s43p-tabs{display:flex;gap:2px;align-items:flex-end;padding:8px 12px 0;border-bottom:1px solid var(--rand,#c8ccd1);}
.s43p-tabje{font:inherit;font-size:13px;padding:6px 12px;border:1px solid transparent;border-bottom:none;border-radius:6px 6px 0 0;
  background:none;color:inherit;cursor:pointer;opacity:.75;margin-bottom:-1px;}
.s43p-tabje:hover{opacity:1;background:var(--hover);}
.s43p-tabje[data-aan="1"]{opacity:1;font-weight:bold;border-color:var(--rand,#c8ccd1);background:var(--paneel,var(--bg,transparent));
  box-shadow:inset 0 2px 0 var(--acc,#0078d7);}
.s43p-tabje small{font-weight:normal;opacity:.7;margin-left:3px;}
.s43p-tabs .s43p-bouwer{margin:0 0 5px auto;}
.s43p-bouwer{flex:none;white-space:nowrap;font:inherit;font-size:12px;padding:5px 10px;border:1px solid var(--acc,#0078d7);border-radius:5px;background:none;color:inherit;cursor:pointer;}
.s43p-bouwer:hover{background:color-mix(in srgb,var(--acc,#0078d7) 15%,transparent);}
${QA_CSS}
`;

function leesTab() {
  try { const t = localStorage.getItem(TAB); return t in GROEPEN ? t : 'stamp'; } catch { return 'stamp'; }
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
  l.append(knop('New PDF', `A new PDF with this ${groepVan(f) === 'form' ? 'memo' : 'sheet'} on every page (1 page = a blank sheet)`, () => blad.nieuw(f, Math.max(1, Math.min(200, +aantal.value || 1)))), aantal, 'pages');
  d.append(
    knop('Add to this page', 'Put it on the page you are on, fitted to the page, behind the markups', () => blad.plaatsHier(f)),
    knop('Add to all pages', 'Put it on every page of this PDF', () => blad.plaatsAlle(f)),
    l,
  );
  return d;
}

const LEEG = {
  stamp: 'No stamps yet. Make one in the Stamp Builder.',
  sheet: 'No sheets yet. Make one in the Stamp Builder.',
  form: 'No memos yet. Make one in the Stamp Builder.',
};

function vulLijst(lijst, families, g, icoon, kies, blad, zoekt) {
  lijst.replaceChildren();
  if (!families.length) {
    lijst.innerHTML = `<div class="s43p-leeg">${zoekt ? `No ${GROEPEN[g].toLowerCase()} match.` : LEEG[g]}</div>`;
    return;
  }
  for (const f of families) {
    const b = document.createElement('button');
    b.className = 's43p-knop';
    b.innerHTML = icoon(f);
    const naam = document.createElement('span');
    naam.textContent = f.name;
    b.appendChild(naam);
    lijst.appendChild(b);
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

/**
 * The list for the Stamps tab of the Seed43 drawer. Returns { el, ververs(families) }.
 */
export function maakStempelLijst({ families, icoon, kies, blad, bouwer, qa }) {
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
  const el = document.createElement('div');
  el.className = 's43p-tab';
  let tab = leesTab();
  const tabs = document.createElement('div');
  tabs.className = 's43p-tabs';
  const tabjes = {};
  for (const [g, titel] of Object.entries(GROEPEN)) {
    const t = document.createElement('button');
    t.className = 's43p-tabje';
    t.dataset.groep = g;
    t.addEventListener('click', () => {
      tab = g;
      try { localStorage.setItem(TAB, g); } catch {}
      toon();
    });
    tabjes[g] = { t, titel };
    tabs.appendChild(t);
  }
  const b = document.createElement('button');
  b.className = 's43p-bouwer';
  b.textContent = 'Stamp Builder…';
  b.title = 'Make or change stamps, sheets and memos, and set My details';
  b.addEventListener('click', () => bouwer());
  tabs.appendChild(b);
  const balk = document.createElement('div');
  balk.className = 's43p-zoek';
  const invoer = document.createElement('input');
  invoer.type = 'text';   // not 'search': WebKitGTK draws that as a light GTK box
  invoer.spellcheck = false;
  balk.append(invoer);
  const lijst = document.createElement('div');
  lijst.className = 's43p-lijst';
  if (qa) el.appendChild(qa);
  el.append(tabs, balk, lijst);
  let alle = families;
  const toon = () => {
    const q = invoer.value.trim().toLowerCase();
    const gevonden = q ? alle.filter((f) => `${f.name} ${f.title || ''}`.toLowerCase().includes(q)) : alle;
    // While searching, each tab shows how many it found.
    for (const [g, { t, titel }] of Object.entries(tabjes)) {
      t.dataset.aan = g === tab ? '1' : '0';
      const n = gevonden.filter((f) => groepVan(f) === g).length;
      t.innerHTML = q ? `${titel}<small>${n}</small>` : titel;
    }
    invoer.placeholder = `Search ${GROEPEN[tab].toLowerCase()}`;
    vulLijst(lijst, gevonden.filter((f) => groepVan(f) === tab), tab, icoon, kies, blad, !!q);
  };
  invoer.addEventListener('input', toon);
  toon();
  return { el, ververs: (f) => { alle = f; toon(); }, focus: () => setTimeout(() => invoer.focus(), 50) };
}
