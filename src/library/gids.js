// Placing guides: a small card that shows, with a looping animation, how to
// place an element. It appears when placing starts, once per kind, until the
// user ticks "Don't show this again". The panel tips can open it again.

const STIJL_ID = 'seed43-gids-stijl';
const UIT = 'seed43.gids.uit';   // kinds the user switched off

const CSS = `
.s43g{position:fixed;z-index:945;width:300px;background:var(--theme-surface,#fff);color:var(--theme-text,#1f2328);
  border:1px solid var(--theme-border,#c8ccd1);border-radius:8px;box-shadow:0 10px 28px rgba(0,0,0,.28);
  font:12.5px/1.4 system-ui,Segoe UI,sans-serif;overflow:hidden;animation:s43g-in .18s ease;}
@keyframes s43g-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
.s43g-kop{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--theme-border,#c8ccd1);font-weight:600;}
.s43g-kop span{flex:1;}
.s43g-x{border:0;background:none;color:inherit;cursor:pointer;font-size:16px;line-height:1;padding:0 4px;border-radius:3px;}
.s43g-x:hover{background:#e81123;color:#fff;}
.s43g svg{display:block;width:100%;height:auto;background:#f1f2f4;}
.s43g ol{margin:8px 0 6px;padding:0 12px 0 28px;}
.s43g li{margin:3px 0;}
.s43g kbd{display:inline-block;padding:0 5px;border:1px solid var(--theme-border,#c8ccd1);border-bottom-width:2px;border-radius:4px;
  font:600 11px system-ui,Segoe UI,sans-serif;background:color-mix(in srgb,var(--theme-text,#000) 6%,transparent);}
.s43g-voet{display:flex;align-items:center;gap:8px;padding:6px 10px 9px;border-top:1px solid var(--theme-border,#c8ccd1);}
.s43g-voet label{flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;}
.s43g-voet button{font:inherit;padding:3px 12px;border-radius:5px;cursor:pointer;border:1px solid var(--theme-accent,#0078d7);
  background:color-mix(in srgb,var(--theme-accent,#0078d7) 18%,transparent);color:inherit;}
`;

// Shared bits of the animations (SVG, 280 x 120, loops every 6 s).
const PIJL = (pad, extra = '') => `<g ${extra}><path d="M0 0 L0 14 L4 10.5 L7 16 L9 15 L6 9.5 L11 9.5 Z" fill="#111" stroke="#fff" stroke-width="1">
  <animateMotion dur="6s" repeatCount="indefinite" path="${pad}" keyTimes="0;0.2;0.55;1" keyPoints="0;0;1;1" calcMode="linear"/></path></g>`;
const KLIK = (x, y, begin) => `<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0">
  <animate attributeName="r" values="3;14" dur="0.6s" begin="${begin}" repeatCount="indefinite" keyTimes="0;1"/>
  <animate attributeName="opacity" values="0;1;0;0" keyTimes="0;0.05;0.1;1" dur="6s" begin="${begin}" repeatCount="indefinite"/></circle>`;
const TOETS = (x, y, tekst, van, tot) => `<g opacity="0"><rect x="${x}" y="${y}" width="${tekst.length * 8 + 14}" height="20" rx="4" fill="#fff" stroke="#9ca3af"/>
  <text x="${x + 7}" y="${y + 14}" font-size="11" font-weight="700" font-family="Segoe UI,sans-serif" fill="#111">${tekst}</text>
  <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;${van};${van + 0.02};${tot};${tot + 0.02}" dur="6s" repeatCount="indefinite"/></g>`;

// A grip being dragged: the pointer goes to (x1, y1), drags to (x2, y2).
const SLEEP = (x1, y1, x2, y2) => `<rect x="${x1 - 4}" y="${y1 - 4}" width="8" height="8" fill="#2563eb" stroke="#fff">
    <animate attributeName="x" values="${x1 - 4};${x1 - 4};${x2 - 4};${x2 - 4}" keyTimes="0;0.25;0.6;1" dur="6s" repeatCount="indefinite"/>
    <animate attributeName="y" values="${y1 - 4};${y1 - 4};${y2 - 4};${y2 - 4}" keyTimes="0;0.25;0.6;1" dur="6s" repeatCount="indefinite"/></rect>
  ${PIJL(`M${x1 - 40} ${y1 - 30} L${x1} ${y1} L${x2} ${y2}`).replace('keyPoints="0;0;1;1"', 'keyPoints="0;0.4;1;1"')}`;

const GIDSEN = {
  'lid-sel': {
    titel: 'Editing a member',
    svg: `<svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="56" height="18" width="140" fill="rgba(29,78,216,.16)" stroke="#1d4ed8" stroke-width="1.2">
        <animate attributeName="width" values="140;140;200;200" keyTimes="0;0.25;0.6;1" dur="6s" repeatCount="indefinite"/></rect>
      <rect x="36" y="61" width="8" height="8" fill="#2563eb" stroke="#fff"/>
      ${SLEEP(180, 65, 240, 65)}
      ${TOETS(110, 92, 'Enter', 0.72, 0.95)}
    </svg>`,
    stappen: [
      'Drag end <b>A</b> or <b>B</b> to stretch it, the midpoint to move it. Grips snap to ends, edges and corners.',
      'Hold <kbd>Shift</kbd> while dragging to keep it square (<kbd>Tab</kbd> turns it).',
      '<kbd>Space</kbd> turns it 90°. <kbd>Enter</kbd> places another the same.',
      'Seed43 Properties: change the size, view, line (centre or edge), pieces and label.',
    ],
  },
  'sectie-sel': {
    titel: 'Editing a section or fixing',
    svg: `<svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">
      <g><path d="M-8 -19 h16 v4 h-6 v30 h6 v4 h-16 v-4 h6 v-30 h-6 z" fill="rgba(29,78,216,.16)" stroke="#1d4ed8"/>
        <animateTransform attributeName="transform" type="translate" values="100 60;100 60;180 60;180 60" keyTimes="0;0.25;0.6;1" dur="6s" repeatCount="indefinite"/></g>
      ${SLEEP(100, 60, 180, 60)}
      ${TOETS(110, 92, 'Space', 0.72, 0.95)}
    </svg>`,
    stappen: [
      'Drag the centre grip to move it; it snaps to member ends, edges and corners.',
      '<kbd>Space</kbd> turns it 90°. <kbd>Enter</kbd> places another the same.',
      'Seed43 Properties: Change element (size or category), View (section, elevation or plan member), pieces and label.',
    ],
  },
  'bout-sel': {
    titel: 'Editing a bolt group',
    svg: `<svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">
      <g><rect x="-30" y="-30" width="60" height="60" fill="rgba(15,118,110,.12)" stroke="#0f766e"/>
        <circle cx="-15" cy="-15" r="4" fill="#fff" stroke="#0f766e"/><circle cx="15" cy="-15" r="4" fill="#fff" stroke="#0f766e"/>
        <circle cx="-15" cy="15" r="4" fill="#fff" stroke="#0f766e"/><circle cx="15" cy="15" r="4" fill="#fff" stroke="#0f766e"/>
        <animateTransform attributeName="transform" type="translate" values="100 58;100 58;180 58;180 58" keyTimes="0;0.25;0.6;1" dur="6s" repeatCount="indefinite"/></g>
      ${SLEEP(100, 58, 180, 58)}
    </svg>`,
    stappen: [
      'Drag the centre grip to move the group; it snaps to member ends, edges and corners.',
      'Seed43 Properties: bolt, rows, columns, pitch p, gauge g, edges ex and ey (see the key), view, nuts and washers.',
      '<kbd>Enter</kbd> places another group with the same layout.',
    ],
  },
  'bracing-sel': {
    titel: 'Editing a bracing line',
    svg: `<svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="80" width="220" height="10" fill="#e2e8f0" stroke="#94a3b8"/>
      <line x1="40" y1="72" x2="180" y2="72" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 4">
        <animate attributeName="x2" values="180;180;240;240" keyTimes="0;0.25;0.6;1" dur="6s" repeatCount="indefinite"/></line>
      ${SLEEP(180, 72, 240, 72)}
    </svg>`,
    stappen: [
      'Drag end <b>A</b> or <b>B</b> to change the braced length; the length in metres updates.',
      'Click the line or its text to select it.',
      '<kbd>Space</kbd> flips the line and tag to the other side.',
      'Seed43 Properties: tag, rounding, layout, side, both sides and offsets. <kbd>Enter</kbd> places another.',
    ],
  },
  lid: {
    titel: 'Placing a member',
    svg: `<svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">
      <line x1="40" y1="85" x2="240" y2="85" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 3"/>
      <rect x="40" y="76" height="18" width="0" fill="rgba(29,78,216,.16)" stroke="#1d4ed8" stroke-width="1.2">
        <animate attributeName="width" values="0;0;200;200" keyTimes="0;0.2;0.55;1" dur="6s" repeatCount="indefinite"/></rect>
      <circle cx="40" cy="85" r="3.5" fill="#1d4ed8"/>
      <text x="32" y="110" font-size="11" font-family="Segoe UI,sans-serif" fill="#334155">A</text>
      <circle cx="240" cy="85" r="7" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.5;0.53;0.7;0.72" dur="6s" repeatCount="indefinite"/></circle>
      <text x="236" y="110" font-size="11" font-family="Segoe UI,sans-serif" fill="#334155">B</text>
      ${KLIK(40, 85, '1.1s')}${KLIK(240, 85, '3.3s')}
      ${TOETS(110, 20, 'Shift', 0.25, 0.55)}${TOETS(110, 20, 'J', 0.72, 0.9)}
      ${PIJL('M40 85 L240 85')}
    </svg>`,
    stappen: [
      'Click point <b>A</b>, then point <b>B</b> (or press at A and let go at B).',
      'Hold <kbd>Shift</kbd> to keep it square; it locks to the way you move first. <kbd>Tab</kbd> turns it.',
      'Ends snap to other elements: ends, midpoints, edges and corners.',
      '<kbd>J</kbd> puts the line on the centre or an edge (top of steel, one face). <kbd>Space</kbd> turns 90°.',
      'Later: drag a grip to stretch or move it. Select it and press <kbd>Enter</kbd> to place another.',
    ],
  },
  sectie: {
    titel: 'Placing a section or fixing',
    svg: `<svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="60" y="76" width="160" height="16" fill="rgba(29,78,216,.10)" stroke="#94a3b8"/>
      <g opacity="0"><path d="M132 30 h16 v4 h-6 v30 h6 v4 h-16 v-4 h6 v-30 h-6 z" fill="rgba(29,78,216,.16)" stroke="#1d4ed8"/>
        <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.45;0.47;1" dur="6s" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" type="rotate" values="0 140 49;0 140 49;90 140 49;90 140 49" keyTimes="0;0.7;0.78;1" dur="6s" repeatCount="indefinite"/></g>
      ${KLIK(140, 49, '2.7s')}${TOETS(200, 20, 'Space', 0.66, 0.85)}
      ${PIJL('M30 20 L140 49')}
    </svg>`,
    stappen: [
      'Click on the sheet to place it. It snaps to member ends, edges and corners.',
      '<kbd>Space</kbd> turns it 90° (also once placed and selected).',
      'Seed43 Properties: change the size, the view (section, elevation, plan), pieces (2/140x45) and the label.',
      'Select it and press <kbd>Enter</kbd> to place another the same.',
    ],
  },
  bout: {
    titel: 'Placing a bolt group',
    svg: `<svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0"><rect x="110" y="25" width="60" height="60" fill="rgba(15,118,110,.12)" stroke="#0f766e"/>
        <circle cx="125" cy="40" r="4" fill="#fff" stroke="#0f766e"/><circle cx="155" cy="40" r="4" fill="#fff" stroke="#0f766e"/>
        <circle cx="125" cy="70" r="4" fill="#fff" stroke="#0f766e"/><circle cx="155" cy="70" r="4" fill="#fff" stroke="#0f766e"/>
        <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.45;0.47;1" dur="6s" repeatCount="indefinite"/></g>
      ${KLIK(140, 55, '2.7s')}
      ${PIJL('M30 20 L140 55')}
    </svg>`,
    stappen: [
      'Click on the sheet to place the group.',
      'Seed43 Properties: bolt, rows, columns, pitch p, gauge g and edges ex, ey; face, plan or elevation; nuts and washers.',
      'The group turns red when the edge distance or pitch is below the library minimum.',
      'Select it and press <kbd>Enter</kbd> to place another with the same layout.',
    ],
  },
  bracing: {
    titel: 'Placing a bracing line',
    svg: `<svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="80" width="220" height="10" fill="#e2e8f0" stroke="#94a3b8"/>
      <line x1="40" y1="72" x2="40" y2="72" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 4">
        <animate attributeName="x2" values="40;40;240;240" keyTimes="0;0.2;0.55;1" dur="6s" repeatCount="indefinite"/></line>
      <text x="140" y="62" text-anchor="middle" font-size="11" font-family="Segoe UI,sans-serif" fill="#111" opacity="0">JHD (2.81m)
        <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.55;0.57;1" dur="6s" repeatCount="indefinite"/></text>
      ${KLIK(40, 72, '1.1s')}${KLIK(240, 72, '3.3s')}
      ${PIJL('M40 72 L240 72')}
    </svg>`,
    stappen: [
      'Click point <b>A</b>, then point <b>B</b> along the braced wall.',
      'Hold <kbd>Shift</kbd> to keep it square (<kbd>Tab</kbd> turns it).',
      '<kbd>Space</kbd> flips the line and tag to the other side.',
      'The tag and the length in metres are written for you; set the tag and side in Seed43 Properties.',
      'New bracing lines take the last tag and settings.',
    ],
  },
};

function stijl() {
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
}

const ALLES = 'seed43.gids.alles';   // '0' = all tips off (ribbon Tips button)
/** Tips (guides and the properties card) on or off as a whole. */
export function tipsAan() {
  try { return localStorage.getItem(ALLES) !== '0'; } catch { return true; }
}
/** Ribbon: tips on or off. Switching them on also brings back every guide ticked off. */
export function wisselTips() {
  const aan = !tipsAan();
  try {
    localStorage.setItem(ALLES, aan ? '1' : '0');
    if (aan) localStorage.removeItem(UIT);
  } catch {}
  if (!aan) sluitGids();
  return aan;
}

function uit() {
  try { const v = JSON.parse(localStorage.getItem(UIT) || '[]'); return new Set(Array.isArray(v) ? v : []); } catch { return new Set(); }
}
function zetUit(soort, aan) {
  const s = uit();
  if (aan) s.add(soort); else s.delete(soort);
  try { localStorage.setItem(UIT, JSON.stringify([...s])); } catch {}
}

let kaart = null;
let wacht = null;

export function sluitGids() {
  clearInterval(wacht);
  wacht = null;
  kaart?.remove();
  kaart = null;
}

/**
 * Show the guide for `soort` ('lid', 'sectie', 'bout', 'bracing'). `altijd`
 * shows it even when switched off (the "Show the guide" link). `nogBezig()`
 * tells whether placing is still going; the card goes when it is not.
 */
export function toonGids(soort, { altijd = false, nogBezig = null } = {}) {
  const g = GIDSEN[soort];
  if (!g || (!altijd && (!tipsAan() || uit().has(soort)))) return;
  stijl();
  sluitGids();
  const el = document.createElement('div');
  el.className = 's43g';
  el.innerHTML = `<div class="s43g-kop"><span></span><button class="s43g-x" title="Close">×</button></div>${g.svg}
    <ol>${g.stappen.map((s) => `<li>${s}</li>`).join('')}</ol>
    <div class="s43g-voet"><label><input type="checkbox"> Don't show this again</label><button>Got it</button></div>`;
  el.querySelector('.s43g-kop span').textContent = g.titel;
  const vink = el.querySelector('input');
  vink.checked = uit().has(soort);
  const dicht = () => { zetUit(soort, vink.checked); sluitGids(); };
  el.querySelector('.s43g-x').addEventListener('click', dicht);
  el.querySelector('.s43g-voet button').addEventListener('click', dicht);
  vink.addEventListener('change', () => zetUit(soort, vink.checked));
  for (const t of ['mousedown', 'click', 'keydown', 'wheel', 'pointerdown']) el.addEventListener(t, (e) => e.stopPropagation());
  // Bottom left of the page view, clear of the sheet's centre.
  const r = document.querySelector('.main-view')?.getBoundingClientRect();
  el.style.left = `${(r?.left ?? 20) + 16}px`;
  el.style.bottom = `${Math.max(16, window.innerHeight - (r?.bottom ?? window.innerHeight) + 16)}px`;
  document.body.appendChild(el);
  kaart = el;
  if (nogBezig) wacht = setInterval(() => { if (!nogBezig()) sluitGids(); }, 600);
}

/** A "Show the guide" link for the panel tips. */
export function gidsLink(soort) {
  const a = document.createElement('a');
  a.href = '#';
  a.textContent = 'Show the guide';
  a.style.cssText = 'margin-left:6px;color:var(--theme-accent,#0078d7);';
  a.addEventListener('click', (e) => { e.preventDefault(); toonGids(soort, { altijd: true }); });
  return a;
}

/**
 * "This element has properties": shown when a Seed43 element is selected
 * while Seed43 Properties is closed. `open()` opens it; `nogBezig()` keeps
 * the card while the element stays selected.
 */
export function toonEigenschappenHint({ naam, open, nogBezig }) {
  if (!tipsAan() || uit().has('open-props')) return;
  stijl();
  sluitGids();
  const el = document.createElement('div');
  el.className = 's43g';
  el.innerHTML = `<div class="s43g-kop"><span>Seed43 Properties</span><button class="s43g-x" title="Close">×</button></div>
    <ol style="list-style:none;padding:0 12px;"><li></li></ol>
    <div class="s43g-voet"><label><input type="checkbox"> Don't show this again</label><button>Open properties</button></div>`;
  el.querySelector('li').textContent = `${naam} has its own properties: size, view, pieces, label, and a key to its dimensions.`;
  const vink = el.querySelector('input');
  const dicht = () => { zetUit('open-props', vink.checked); sluitGids(); };
  el.querySelector('.s43g-x').addEventListener('click', dicht);
  el.querySelector('.s43g-voet button').addEventListener('click', () => { zetUit('open-props', vink.checked); sluitGids(); open(); });
  vink.addEventListener('change', () => zetUit('open-props', vink.checked));
  for (const t of ['mousedown', 'click', 'keydown', 'wheel', 'pointerdown']) el.addEventListener(t, (e) => e.stopPropagation());
  const r = document.querySelector('.main-view')?.getBoundingClientRect();
  el.style.left = `${(r?.right ?? window.innerWidth) - 316}px`;
  el.style.bottom = `${Math.max(16, window.innerHeight - (r?.bottom ?? window.innerHeight) + 16)}px`;
  document.body.appendChild(el);
  kaart = el;
  if (nogBezig) wacht = setInterval(() => { if (!nogBezig()) sluitGids(); }, 600);
}
