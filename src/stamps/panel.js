// Smart Stamps panel for hosts without api.setToolPaletteVisible.
//
// The official Open PDF Studio registers extension tool palettes but gives
// neither the add-on nor the user a way to open one. There Seed43 shows this
// panel instead: the same stamp families, the same tool and overrides as the
// palette buttons. It is a Seed43 window (venster.js): it floats or docks on
// any edge of the page view and stacks with the other Seed43 windows.

import { maakVenster } from '../venster.js';

const STIJL_ID = 'seed43-stamp-panel-stijl';

const CSS = `
.s43p-lijst{padding:4px;}
.s43p-knop{display:flex;align-items:center;gap:8px;width:100%;padding:5px 6px;border:1px solid transparent;border-radius:4px;
  background:none;color:inherit;cursor:pointer;text-align:left;font:inherit;font-size:13px;}
.s43p-knop:hover{background:var(--hover);}
.s43p-knop[data-aan="1"]{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 12%,transparent);}
.s43p-knop svg{width:22px;height:22px;flex:none;}
.s43p-leeg{padding:8px;opacity:.7;}
`;

let paneel = null;

/**
 * Open the panel. `families` with `icoon(f)` (SVG string); `kies(f)` arms the
 * stamp tool for that family; `bijSluiten()` runs when the user closes it.
 */
export function openPaneel({ families, icoon, kies, bijSluiten }) {
  // Always rewrite: after a reinstall the page still holds the old sheet.
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
  const venster = maakVenster({ id: 'stamps', titel: 'Smart Stamps', breedte: 210, hoogte: 90, bijSluiten: () => { paneel = null; bijSluiten?.(); } });
  const lijst = document.createElement('div');
  lijst.className = 's43p-lijst';
  venster.lijf.replaceChildren(lijst);
  vulLijst(lijst, families, icoon, kies);
  venster.open();
  paneel = { venster, lijst, icoon, kies };
}

function vulLijst(lijst, families, icoon, kies) {
  lijst.replaceChildren();
  if (!families.length) {
    lijst.innerHTML = '<div class="s43p-leeg">No stamp families yet. Make one in the Stamp Builder.</div>';
    return;
  }
  for (const f of families) {
    const b = document.createElement('button');
    b.className = 's43p-knop';
    b.title = `Place a ${f.name} stamp: click on the sheet`;
    b.innerHTML = icoon(f);
    const naam = document.createElement('span');
    naam.textContent = f.name;
    b.appendChild(naam);
    b.addEventListener('click', () => {
      for (const k of lijst.querySelectorAll('.s43p-knop')) k.dataset.aan = k === b ? '1' : '0';
      kies(f);
    });
    lijst.appendChild(b);
  }
}

/** Refresh the list (after the Stamp Builder changed the families). */
export function werkPaneelBij(families) {
  if (paneel) vulLijst(paneel.lijst, families, paneel.icoon, paneel.kies);
}

export function sluitPaneel() {
  paneel?.venster.sluit();
  paneel = null;
}

export function paneelOpen() {
  return !!paneel && paneel.venster.isOpen();
}
