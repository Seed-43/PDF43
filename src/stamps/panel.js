// Smart Stamps list for the Stamps tab of the Seed43 drawer: each stamp
// family with its icon (click to place), a search box and the Stamp Builder.


const STIJL_ID = 'seed43-stamp-panel-stijl';

const CSS = `
.s43p-lijst{padding:4px;}
.s43p-knop{display:flex;align-items:center;gap:8px;width:100%;padding:5px 6px;border:1px solid transparent;border-radius:4px;
  background:none;color:inherit;cursor:pointer;text-align:left;font:inherit;font-size:13px;}
.s43p-knop:hover{background:var(--hover);}
.s43p-knop[data-aan="1"]{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 12%,transparent);}
.s43p-knop svg{width:22px;height:22px;flex:none;}
.s43p-leeg{padding:8px;opacity:.7;}
.s43p-zoek{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--rand,#c8ccd1);}
.s43p-zoek input{flex:1;min-width:0;box-sizing:border-box;font:inherit;font-size:14px;padding:7px 10px;border-radius:6px;
  border:1px solid var(--rand,#c8ccd1);background:transparent;color:inherit;}
.s43p-zoek input:focus{outline:none;border-color:var(--acc,#0078d7);}
.s43p-bouwer{flex:none;white-space:nowrap;font:inherit;font-size:12px;padding:7px 10px;border:1px solid var(--acc,#0078d7);border-radius:5px;background:none;color:inherit;cursor:pointer;}
.s43p-bouwer:hover{background:color-mix(in srgb,var(--acc,#0078d7) 15%,transparent);}
`;



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

/**
 * The same list for the Smart Stamps tab of the Seed43 Properties drawer, with a
 * Stamp Builder button under it. Returns { el, ververs(families) }.
 */
export function maakStempelLijst({ families, icoon, kies, bouwer }) {
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
  const el = document.createElement('div');
  el.className = 's43p-tab';
  // Search with the Stamp Builder on its right, like the Elements tab's search.
  const balk = document.createElement('div');
  balk.className = 's43p-zoek';
  const invoer = document.createElement('input');
  invoer.type = 'text';   // not 'search': WebKitGTK draws that as a light GTK box
  invoer.placeholder = 'Search stamps';
  invoer.spellcheck = false;
  const b = document.createElement('button');
  b.className = 's43p-bouwer';
  b.textContent = 'Stamp Builder…';
  b.title = 'Make or change stamp families';
  b.addEventListener('click', () => bouwer());
  balk.append(invoer, b);
  const lijst = document.createElement('div');
  lijst.className = 's43p-lijst';
  el.append(balk, lijst);
  let alle = families;
  const toon = () => {
    const q = invoer.value.trim().toLowerCase();
    const gevonden = q ? alle.filter((f) => String(f.name || '').toLowerCase().includes(q)) : alle;
    vulLijst(lijst, gevonden, icoon, kies);
    if (q && !gevonden.length) lijst.innerHTML = '<div class="s43p-leeg">No stamps match.</div>';
  };
  invoer.addEventListener('input', toon);
  toon();
  return { el, ververs: (f) => { alle = f; toon(); }, focus: () => setTimeout(() => invoer.focus(), 50) };
}



