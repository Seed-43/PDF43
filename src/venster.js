// Seed43 windows that float or dock, without help from the app.
//
// The official Open PDF Studio gives an add-on no dock of its own, so Seed43
// keeps its windows (Smart Stamps, Properties) itself. Press and hold on the
// title to drag; a window docks the moment the pointer reaches an edge of the
// page view (left, right, top or bottom), floats again once it is dragged
// away, and stays where it is when you let go. Windows docked on the same
// side stack next to each other. A docked window lies over the edge of the
// page view: the app's own layout does not move for it.

const STIJL_ID = 'seed43-venster-stijl';
const OPSLAG = 'seed43.vensters';
const SNAP = 60;      // docks when the pointer comes this close to an edge
const LOS = 100;      // comes off again this far away
const ZIJDEN = ['left', 'right', 'top', 'bottom'];

const CSS = `
.s43v{--bg:var(--theme-surface,var(--theme-app-menu-bg,#fff));--tx:var(--theme-text,var(--theme-app-menu-text,#1f2328));
  --rand:var(--theme-border,var(--theme-app-menu-sidebar-border,#c8ccd1));--hover:var(--theme-ribbon-btn-hover,var(--theme-app-menu-item-hover,#eef2f7));
  --acc:var(--theme-accent,#0078d7);
  position:fixed;z-index:940;display:flex;flex-direction:column;background:var(--bg);color:var(--tx);
  border:1px solid var(--rand);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.22);
  font:12px/1.3 system-ui,Segoe UI,sans-serif;overflow:hidden;}
.s43v[data-dok]{border-radius:0;box-shadow:0 0 6px rgba(0,0,0,.18);}
.s43v-kop{display:flex;align-items:center;gap:6px;padding:7px 8px 7px 10px;border-bottom:1px solid var(--rand);cursor:grab;
  font-weight:600;font-size:13px;user-select:none;flex:none;}
.s43v-kop span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.s43v-x{border:0;background:none;color:inherit;cursor:pointer;font-size:15px;line-height:1;padding:0 3px;border-radius:3px;}
.s43v-x:hover{background:#e81123;color:#fff;}
.s43v-lijf{flex:1;min-height:0;overflow:auto;}
.s43v-live::after{content:'';position:absolute;inset:0;background:var(--acc);opacity:.12;pointer-events:none;}
.s43v-live{outline:1px solid var(--acc);outline-offset:-1px;}
.s43v-doel{position:fixed;z-index:941;width:36px;height:36px;display:flex;align-items:center;justify-content:center;
  background:var(--theme-surface,#fff);border:1px solid var(--theme-border,#c8ccd1);color:var(--theme-text-secondary,#666);pointer-events:none;}
.s43v-doel svg{width:20px;height:20px;}
`;

const DOEL_ICOON = {
  left: '<rect x="1" y="1" width="6" height="18" rx="1" fill="currentColor" opacity=".4"/>',
  right: '<rect x="13" y="1" width="6" height="18" rx="1" fill="currentColor" opacity=".4"/>',
  top: '<rect x="1" y="1" width="18" height="6" rx="1" fill="currentColor" opacity=".4"/>',
  bottom: '<rect x="1" y="13" width="18" height="6" rx="1" fill="currentColor" opacity=".4"/>',
};

const vensters = new Map();   // id -> venster

function stijl() {
  // Always rewrite: after a reinstall the page still holds the old sheet.
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
}

function leesAlle() {
  try { const v = JSON.parse(localStorage.getItem(OPSLAG) || 'null'); if (v && typeof v === 'object') return v; } catch {}
  return {};
}
function bewaar(id, staat) {
  const alle = leesAlle();
  alle[id] = staat;
  try { localStorage.setItem(OPSLAG, JSON.stringify(alle)); } catch {}
}

/** The page view's rectangle (or the window below the ribbon if not found). */
function paginaVak() {
  const mv = document.querySelector('.main-view');
  if (mv) {
    const r = mv.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  }
  return { left: 0, top: 120, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight - 120 };
}

/** Lay out every docked window: per side in docking order, side by side. */
function herschik() {
  const v = paginaVak();
  const opDok = {};
  for (const w of vensters.values()) {
    if (!w.open || !w.staat.dok) continue;
    (opDok[w.staat.dok] ||= []).push(w);
  }
  for (const [kant, lijst] of Object.entries(opDok)) {
    lijst.sort((a, b) => (a.staat.volg || 0) - (b.staat.volg || 0));
    let verschuif = 0;
    for (const w of lijst) {
      const s = w.el.style;
      if (kant === 'left' || kant === 'right') {
        const b = w.breedte;
        s.top = `${v.top}px`; s.height = `${v.height}px`; s.width = `${b}px`;
        s.left = `${kant === 'left' ? v.left + verschuif : v.right - verschuif - b}px`;
        verschuif += b;
      } else {
        const h = w.hoogte;
        s.left = `${v.left}px`; s.width = `${v.width}px`; s.height = `${h}px`;
        s.top = `${kant === 'top' ? v.top + verschuif : v.bottom - verschuif - h}px`;
        verschuif += h;
      }
    }
  }
}

function zweefPlaats(w) {
  const s = w.el.style;
  s.width = `${w.breedte}px`;
  s.height = '';
  s.maxHeight = '70vh';
  const x = Math.min(Math.max(0, w.staat.x ?? (window.innerWidth - w.breedte - 40)), Math.max(0, window.innerWidth - w.breedte));
  const y = Math.min(Math.max(0, w.staat.y ?? 160), Math.max(0, window.innerHeight - 60));
  s.left = `${x}px`; s.top = `${y}px`;
}

function plaats(w) {
  if (w.staat.dok) { w.el.dataset.dok = w.staat.dok; w.el.style.maxHeight = ''; herschik(); }
  else { delete w.el.dataset.dok; zweefPlaats(w); herschik(); }
}

let luistert = false;
function luister() {
  if (luistert) return;
  luistert = true;
  window.addEventListener('resize', herschik);
  const mv = document.querySelector('.main-view');
  if (mv && typeof ResizeObserver !== 'undefined') new ResizeObserver(herschik).observe(mv);
}

// --- Dragging, with live snapping ---
function doelen(aan, behalve) {
  for (const d of document.querySelectorAll('.s43v-doel')) d.remove();
  if (!aan) return;
  const v = paginaVak();
  for (const kant of ZIJDEN) {
    if (kant === behalve) continue;
    const d = document.createElement('div');
    d.className = 's43v-doel';
    d.innerHTML = `<svg viewBox="0 0 20 20"><rect x="1" y="1" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>${DOEL_ICOON[kant]}</svg>`;
    const midX = v.left + v.width / 2 - 18, midY = v.top + v.height / 2 - 18;
    Object.assign(d.style, {
      left: `${kant === 'left' ? v.left + 6 : kant === 'right' ? v.right - 42 : midX}px`,
      top: `${kant === 'top' ? v.top + 6 : kant === 'bottom' ? v.bottom - 42 : midY}px`,
    });
    document.body.appendChild(d);
  }
}

function sleep(w, e) {
  if (e.button !== 0 || e.target.closest('button')) return;
  e.preventDefault();
  const r = w.el.getBoundingClientRect();
  const dx = w.staat.dok ? Math.min(40, r.width / 2) : e.clientX - r.left;
  const dy = w.staat.dok ? 14 : e.clientY - r.top;
  const startX = e.clientX, startY = e.clientY;
  let bewogen = false;
  let gedokt = w.staat.dok || null;

  function kantVoor(cx, cy) {
    const v = paginaVak();
    const afstand = { left: cx - v.left, right: v.right - cx, top: cy - v.top, bottom: v.bottom - cy };
    if (gedokt && afstand[gedokt] < LOS) return gedokt;
    let beste = null;
    for (const k of ZIJDEN) if (afstand[k] < SNAP && (beste === null || afstand[k] < afstand[beste])) beste = k;
    return beste;
  }

  function beweeg(ev) {
    if ((ev.buttons & 1) === 0) { los(); return; }
    if (!bewogen) {
      if (Math.abs(ev.clientX - startX) < 4 && Math.abs(ev.clientY - startY) < 4) return;
      bewogen = true;
    }
    w.staat.x = ev.clientX - dx;
    w.staat.y = ev.clientY - dy;
    const kant = kantVoor(ev.clientX, ev.clientY);
    if (kant !== gedokt) {
      gedokt = kant;
      w.staat.dok = kant;
      if (kant) w.staat.volg = Date.now();
    }
    plaats(w);
    w.el.classList.toggle('s43v-live', !!kant);
    doelen(true, kant);
  }

  let klaar = false;
  function los() {
    if (klaar) return;
    klaar = true;
    window.removeEventListener('mousemove', beweeg, true);
    window.removeEventListener('mouseup', los, true);
    window.removeEventListener('pointerup', los, true);
    window.removeEventListener('blur', los);
    w.el.classList.remove('s43v-live');
    doelen(false);
    if (bewogen) bewaar(w.id, w.staat);
  }

  window.addEventListener('mousemove', beweeg, true);
  window.addEventListener('mouseup', los, true);
  window.addEventListener('pointerup', los, true);
  window.addEventListener('blur', los);
}

/**
 * A Seed43 window. `breedte` when floating or docked left/right, `hoogte` when
 * docked top/bottom. `bijSluiten` runs when the user closes it with its ×.
 * Returns { lijf, open(), sluit(), isOpen(), titel(t) }.
 */
export function maakVenster({ id, titel, breedte = 260, hoogte = 220, bijSluiten }) {
  if (vensters.has(id)) return vensters.get(id).api;
  stijl();
  luister();
  const el = document.createElement('div');
  el.className = 's43v';
  el.innerHTML = '<div class="s43v-kop"><span></span><button class="s43v-x" title="Close">×</button></div><div class="s43v-lijf"></div>';
  const kop = el.querySelector('.s43v-kop');
  const naam = kop.querySelector('span');
  naam.textContent = titel;
  const lijf = el.querySelector('.s43v-lijf');
  const w = { id, el, breedte, hoogte, open: false, staat: { dok: null, ...(leesAlle()[id] || {}) } };
  kop.addEventListener('mousedown', (e) => sleep(w, e));
  el.querySelector('.s43v-x').addEventListener('click', () => { api.sluit(); bijSluiten?.(); });
  const api = {
    lijf,
    open() {
      if (!w.open) { document.body.appendChild(el); w.open = true; }
      plaats(w);
    },
    sluit() {
      if (!w.open) return;
      el.remove();
      w.open = false;
      herschik();
    },
    isOpen: () => w.open,
    titel(t) { naam.textContent = t; },
  };
  w.api = api;
  vensters.set(id, w);
  return api;
}
