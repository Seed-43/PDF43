// Smart Stamps panel for hosts without api.setToolPaletteVisible.
//
// The official Open PDF Studio registers extension tool palettes but gives
// neither the add-on nor the user a way to open one. There Seed43 shows this
// small floating panel instead: the same stamp families, the same tool and
// overrides as the palette buttons. Drag it by its title; its place is kept.

const STIJL_ID = 'seed43-stamp-panel-stijl';
const PLEK = 'seed43.stampPanel';

const CSS = `
.s43p{--bg:var(--theme-app-menu-bg,#fff);--tx:var(--theme-app-menu-text,#1f2328);--rand:var(--theme-app-menu-sidebar-border,#c8ccd1);
  --hover:var(--theme-app-menu-item-hover,#eef2f7);--acc:var(--theme-accent,#0078d7);
  position:fixed;z-index:2900;width:210px;max-height:70vh;display:flex;flex-direction:column;
  background:var(--bg);color:var(--tx);border:1px solid var(--rand);border-radius:6px;
  box-shadow:0 8px 24px rgba(0,0,0,.22);font:12px/1.3 system-ui,Segoe UI,sans-serif;user-select:none;}
.s43p-kop{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--rand);cursor:move;font-weight:600;}
.s43p-kop span{flex:1;}
.s43p-x{border:0;background:none;color:inherit;cursor:pointer;font-size:15px;line-height:1;padding:0 2px;border-radius:3px;}
.s43p-x:hover{background:var(--hover);}
.s43p-lijst{overflow:auto;padding:4px;}
.s43p-knop{display:flex;align-items:center;gap:8px;width:100%;padding:5px 6px;border:1px solid transparent;border-radius:4px;
  background:none;color:inherit;cursor:pointer;text-align:left;font:inherit;}
.s43p-knop:hover{background:var(--hover);}
.s43p-knop[data-aan="1"]{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 12%,transparent);}
.s43p-knop svg{width:22px;height:22px;flex:none;}
.s43p-leeg{padding:8px;opacity:.7;}
`;

let paneel = null;

function leesPlek() {
  try {
    const p = JSON.parse(localStorage.getItem(PLEK) || 'null');
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
  } catch {}
  return { x: Math.max(16, window.innerWidth - 250), y: 160 };
}

function bewaarPlek(x, y) {
  try { localStorage.setItem(PLEK, JSON.stringify({ x, y })); } catch {}
}

function binnenScherm(x, y, el) {
  const w = el?.offsetWidth || 210, h = el?.offsetHeight || 60;
  return {
    x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - w)),
    y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - h)),
  };
}

function maakSleepbaar(el, kop) {
  kop.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    kop.setPointerCapture(e.pointerId);
    const beweeg = (ev) => {
      const p = binnenScherm(ev.clientX - dx, ev.clientY - dy, el);
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
    };
    const los = () => {
      kop.removeEventListener('pointermove', beweeg);
      kop.removeEventListener('pointerup', los);
      bewaarPlek(parseFloat(el.style.left), parseFloat(el.style.top));
    };
    kop.addEventListener('pointermove', beweeg);
    kop.addEventListener('pointerup', los);
  });
}

/**
 * Open the panel. `families` with `icoon(f)` (SVG string); `kies(f)` arms the
 * stamp tool for that family; `bijSluiten()` runs when the user closes it.
 */
export function openPaneel({ families, icoon, kies, bijSluiten }) {
  if (!document.getElementById(STIJL_ID)) {
    const s = document.createElement('style');
    s.id = STIJL_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  sluitPaneel();
  const el = document.createElement('div');
  el.className = 's43p';
  el.innerHTML = '<div class="s43p-kop"><span>Smart Stamps</span><button class="s43p-x" title="Close">×</button></div><div class="s43p-lijst"></div>';
  const lijst = el.querySelector('.s43p-lijst');
  el.querySelector('.s43p-x').addEventListener('click', () => { sluitPaneel(); bijSluiten?.(); });
  vulLijst(lijst, families, icoon, kies);
  document.body.appendChild(el);
  const p = binnenScherm(leesPlek().x, leesPlek().y, el);
  el.style.left = `${p.x}px`;
  el.style.top = `${p.y}px`;
  maakSleepbaar(el, el.querySelector('.s43p-kop'));
  paneel = { el, lijst, icoon, kies };
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
  paneel?.el.remove();
  paneel = null;
}

export function paneelOpen() {
  return !!paneel;
}
