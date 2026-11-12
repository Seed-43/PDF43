// Seed43 Properties: the options of a selected Seed43 item (member, section,
// bolt group, bracing line, smart stamp) in a drawer that slides out from the
// right edge of the page view, opened and closed with its "Properties" tab.
// The forms are Property / Value tables (formulier.js). It needs nothing new
// from the app: the forms still come through api.registerPropertyPanel, and
// the app's panel shows a one-line note where the form used to be.
//
// The ribbon button switches the drawer off again: the forms then show in the
// app's Properties panel as before.

import { stijl as formStijl } from './formulier.js';

const AAN = 'seed43.eigenschappenVenster';
const OPEN = 'seed43.eigenschappenOpen';
const STIJL_ID = 'seed43-lade-stijl';
const BREEDTE = 380;

const CSS = `
.s43d-lade{--bg:var(--theme-surface,#fff);--rand:var(--theme-border,#c8ccd1);--tx:var(--theme-text,#1f2328);--acc:var(--theme-accent,#0078d7);
  position:fixed;z-index:930;width:${BREEDTE}px;display:flex;flex-direction:column;background:var(--bg);color:var(--tx);
  border:1px solid var(--rand);border-radius:8px 0 0 8px;box-shadow:-6px 0 20px rgba(0,0,0,.25);
  transition:transform .2s ease,opacity .2s ease;font:13px/1.35 system-ui,Segoe UI,sans-serif;overflow:hidden;}
.s43d-lade[data-dicht]{transform:translateX(40px);opacity:0;pointer-events:none;box-shadow:none;}
.s43d-balk{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--rand);flex:none;}
.s43d-tabje{padding:4px 12px;border:1px solid transparent;border-radius:6px;background:none;color:inherit;font:inherit;font-weight:600;cursor:pointer;opacity:.75;}
.s43d-tabje:hover{opacity:1;background:color-mix(in srgb,var(--tx) 8%,transparent);}
.s43d-tabje[data-aan]{opacity:1;border-color:var(--acc);background:color-mix(in srgb,var(--acc) 15%,transparent);}
.s43d-kies{flex:1;min-height:0;display:flex;flex-direction:column;}
.s43d-lade [hidden]{display:none !important;}
.s43d-balk span{flex:1;}
.s43d-x{border:0;background:none;color:inherit;cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;border-radius:4px;}
.s43d-x:hover{background:color-mix(in srgb,var(--tx) 10%,transparent);}
.s43d-lijf{flex:1;min-height:0;overflow:auto;}
.s43d-leeg{padding:16px;color:var(--theme-text-secondary,#666);}
.s43d-tab{position:fixed;z-index:931;writing-mode:vertical-rl;padding:14px 7px;border:1px solid var(--theme-border,#c8ccd1);border-right:0;
  border-radius:8px 0 0 8px;background:var(--theme-surface,#fff);color:var(--theme-text,#1f2328);font:600 13px system-ui,Segoe UI,sans-serif;
  cursor:pointer;box-shadow:-3px 0 10px rgba(0,0,0,.18);transition:left .2s ease;}
.s43d-tab[data-wijs]{animation:s43d-wijs 1s ease-in-out 3;}
@keyframes s43d-wijs{0%,100%{box-shadow:-3px 0 10px rgba(0,0,0,.18);}50%{box-shadow:-3px 0 0 4px var(--theme-accent,#0078d7);}}
.s43d-tab:hover,.s43d-tab[data-open]{border-color:var(--theme-accent,#0078d7);color:var(--theme-accent,#0078d7);}
`;

export function vensterAan() {
  try { return localStorage.getItem(AAN) !== '0'; } catch { return true; }
}
function isOpen() {
  try { return localStorage.getItem(OPEN) === '1'; } catch { return false; }
}

let lade = null;   // { el, lijf, kies, tab, tabjes }
let api0 = null;   // the extension API, for the Elements tab

// The drawer and its tab are fixed over the right edge of the page view, but
// are not inside it: the page view never sees their clicks, scrolling or
// typing (inside it, scrolling the drawer scrolled the sheet and keys typed in
// a field reached the app's shortcuts).
function houder() {
  return document.body;
}

function paginaVak() {
  const r = document.querySelector('.main-view')?.getBoundingClientRect();
  if (r && r.width > 0 && r.height > 0) return r;
  return { top: 120, height: window.innerHeight - 120, right: window.innerWidth, width: window.innerWidth };
}

function plaats() {
  if (!lade) return;
  const v = paginaVak();
  const open = !lade.el.hasAttribute('data-dicht');
  const b = Math.max(240, Math.min(BREEDTE, v.width - 60));
  Object.assign(lade.el.style, { top: `${v.top + 8}px`, height: `${Math.max(160, v.height - 16)}px`, left: `${v.right - b}px`, width: `${b}px` });
  const tw = lade.tab.offsetWidth || 32;
  const th = lade.tab.offsetHeight || 140;
  lade.tab.style.top = `${v.top + Math.max(20, v.height / 2 - th / 2)}px`;
  lade.tab.style.left = `${v.right - tw - (open ? b : 0)}px`;
}

function zetOpen(open) {
  try { localStorage.setItem(OPEN, open ? '1' : '0'); } catch {}
  if (!lade) return;
  lade.el.toggleAttribute('data-dicht', !open);
  lade.tab.toggleAttribute('data-open', open);
  plaats();
  if (open) setTimeout(meldGids, 0);
}

function maakLade() {
  if (lade) return lade;
  // Left over from an earlier Seed43 in this session (a reinstall does not
  // restart the page): the drawer, and the floating Properties window of 0.6.1.
  for (const n of document.querySelectorAll('.s43d-lade, .s43d-tab')) n.remove();
  for (const n of document.querySelectorAll('.s43v')) {
    if (n.querySelector('.s43v-kop span')?.textContent === 'Seed43 Properties') n.remove();
  }
  formStijl();
  // Always rewrite: after a reinstall the page still holds the old sheet.
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
  const el = document.createElement('div');
  el.className = 's43d-lade';
  el.innerHTML = '<div class="s43d-balk"><button class="s43d-tabje" data-tab="eigenschappen">Seed43 Properties</button>'
    + '<button class="s43d-tabje" data-tab="elementen">Elements</button><span></span><button class="s43d-x" title="Close">×</button></div>'
    + '<div class="s43d-lijf"></div><div class="s43d-kies" hidden></div>';
  const lijf = el.querySelector('.s43d-lijf');
  const kies = el.querySelector('.s43d-kies');
  const tabjes = [...el.querySelectorAll('.s43d-tabje')];
  for (const t of tabjes) t.addEventListener('click', () => zetTab(t.dataset.tab, true));
  const tab = document.createElement('button');
  tab.className = 's43d-tab';
  tab.textContent = 'Seed43 Properties';
  tab.title = 'Seed43 Properties and Elements: the options of the selected Seed43 item, or find and place an element';
  tab.addEventListener('click', () => zetOpen(el.hasAttribute('data-dicht')));
  el.querySelector('.s43d-x').addEventListener('click', () => zetOpen(false));
  // The drawer sits inside the page view: keep its clicks, keys and scrolling
  // to itself, or the page view takes the focus back (typing in a field then
  // went to the app's shortcuts) and treats clicks as clicks on the sheet.
  for (const soort of ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'click', 'dblclick', 'wheel', 'keydown', 'keyup', 'keypress', 'contextmenu']) {
    el.addEventListener(soort, (e) => e.stopPropagation());
    tab.addEventListener(soort, (e) => e.stopPropagation());
  }
  // The app takes the focus back after a click outside its own panels, so a
  // field in the drawer lost it before anything could be typed. Give it back.
  el.addEventListener('mousedown', (e) => {
    const veld = e.target.closest?.('input, textarea, select');
    if (!veld) return;
    const terug = () => { if (document.activeElement !== veld && veld.isConnected) veld.focus(); };
    setTimeout(terug, 0);
    setTimeout(terug, 60);
  });
  houder().append(el, tab);
  lade = { el, lijf, kies, tab, tabjes, snel: null };
  window.addEventListener('resize', plaats);
  // The page view moves and resizes as the app's side panels open and close.
  const mv = document.querySelector('.main-view');
  if (mv && typeof ResizeObserver !== 'undefined') { lade.waker = new ResizeObserver(plaats); lade.waker.observe(mv); }
  requestAnimationFrame(plaats);
  lijf.replaceChildren(leeg());
  zetTab('elementen');   // nothing selected yet: find and place
  zetOpen(isOpen());
  return lade;
}

/**
 * Show a tab: 'eigenschappen' (the selected item) or 'elementen' (find and
 * place). Selecting an item shows Properties; with nothing selected the
 * drawer shows Elements. `opZoek` puts the cursor in the search box.
 */
function zetTab(naam, opZoek = false) {
  if (!lade) return;
  for (const t of lade.tabjes) t.toggleAttribute('data-aan', t.dataset.tab === naam);
  lade.lijf.hidden = naam !== 'eigenschappen';
  lade.kies.hidden = naam !== 'elementen';
  if (naam === 'elementen') {
    if (!lade.snel && api0) {
      const l = lade;
      import('./library/snelkies.js').then(({ maakSnelKies }) => {
        if (l !== lade || l.snel) return;
        l.snel = maakSnelKies(api0);
        l.kies.replaceChildren(l.snel.el);
        if (opZoek) l.snel.focus();
      }).catch((e) => console.warn('[seed43] elements tab:', e));
    } else if (opZoek) lade.snel?.focus();
    else lade.snel?.ververs();
  }
}

export function verwijderLade() {
  if (!lade) return;
  lade.el.remove();
  lade.tab.remove();
  lade.waker?.disconnect();
  window.removeEventListener('resize', plaats);
  lade = null;
}

function leeg() {
  const d = document.createElement('div');
  d.className = 's43d-leeg';
  d.textContent = 'Select a Seed43 member, section, bolt group, bracing line or smart stamp to see its properties.';
  return d;
}

function notitie() {
  const n = document.createElement('div');
  n.style.cssText = 'padding:6px 8px;font-size:12px;opacity:.75;';
  n.textContent = 'Seed43 options are in the Seed43 Properties drawer (tab on the right of the page).';
  return n;
}

// --- Following the selection ---------------------------------------------
//
// The drawer follows the selection itself (api.registerSelectionListener),
// so it works while the app's own Properties panel is closed or folded up.
// Its form edits a copy of the annotation; the changes of one edit go to the
// app as one api.applyAnnotationBatch update (one undo step), after which the
// form is drawn again from the updated annotation.

let teller = 0;     // goes up with every form shown; a pending clear checks it
let laatstGetoond = null;   // the single item last shown in Properties
let gidsHook = null;
const gidsGezien = new Set();   // ids the guide was shown for this session

/** `fn(ann)` runs when a Seed43 item's properties are on show in the open drawer. */
export function bijEigenschappen(fn) { gidsHook = fn; }

let hintHook = null;
const hintGezien = new Set();
/** `fn(ann, open)` runs when a Seed43 item is selected while the drawer is closed or off. */
export function bijGeslotenEigenschappen(fn) { hintHook = fn; }
function meldGesloten(ann) {
  if (!ann || !hintHook || hintGezien.has(ann.id)) return;
  hintGezien.add(ann.id);
  const open = () => {
    if (!vensterAan()) { try { localStorage.setItem(AAN, '1'); } catch {} aanUitHook?.(true); }
    maakLade();
    zetOpen(true);
    if (ann) {
      const vers = vorigApi?.getAnnotations?.().find((a) => a.id === ann.id);
      if (vers && vorigRender[vers.type]) toon(vorigApi, vorigRender[vers.type], vers);
    }
  };
  setTimeout(() => {
    try {
      lade?.tab.toggleAttribute('data-wijs', false);
      void lade?.tab.offsetWidth;
      lade?.tab.toggleAttribute('data-wijs', true);
      hintHook(ann, open);
    } catch {}
  }, 0);
}
let vorigApi = null;
let aanUitHook = null;
/** `fn(aan)` runs when the drawer is switched on from the hint (the ribbon button follows). */
export function bijAanUit(fn) { aanUitHook = fn; }
const vorigRender = {};
function meldGids() {
  const ann = laatstGetoond;
  if (!ann || !gidsHook || !lade || lade.el.hasAttribute('data-dicht') || lade.lijf.hidden) return;
  if (gidsGezien.has(ann.id)) return;
  gidsGezien.add(ann.id);
  try { gidsHook(ann); } catch {}
}
let wis = null;

function kopieVan(ann) {
  try { return structuredClone(ann); } catch { return JSON.parse(JSON.stringify(ann)); }
}

function toon(api, renderFn, ann) {
  teller++;
  const l = maakLade();
  const id = ann.id;
  const lees = () => api.getAnnotations?.().find((a) => a.id === id) || ann;
  const werk = kopieVan(lees());
  let wachtend = null;
  const update = (sleutel, waarde) => {
    werk[sleutel] = waarde;
    if (!wachtend) {
      wachtend = {};
      queueMicrotask(() => {
        const changes = wachtend;
        wachtend = null;
        try { api.applyAnnotationBatch([{ op: 'update', id, changes }]); } catch (e) { console.warn('[seed43] properties update:', e); }
        try { api.redrawAnnotations?.(); } catch {}
        const scroll = l.lijf.scrollTop;
        toon(api, renderFn, lees());
        l.lijf.scrollTop = scroll;
      });
    }
    wachtend[sleutel] = waarde;
  };
  let dom = null;
  try { dom = renderFn(werk, update, () => {}, () => {}); } catch (e) { console.warn('[seed43] properties:', e); }
  l.lijf.replaceChildren(dom || leeg());
  zetTab('eigenschappen');
  laatstGetoond = ann;
  meldGids();
}

/**
 * Register the properties form for a Seed43 annotation type. With the drawer
 * on, the form shows in the drawer and the app's panel gets a one-line note;
 * with it off, the form shows in the app's panel as before.
 */
export function registreerEigenschappen(api, type, renderFn) {
  vorigApi = api;
  vorigRender[type] = renderFn;
  api0 = api0 || api;
  api.registerPropertyPanel(type, (ann, update, commit, cancel) => {
    if (!vensterAan()) {
      // Drawer off: the form is in the app's Properties panel; the editing
      // guide shows the first time each item is selected there.
      return renderFn(ann, update, commit, cancel);
    }
    if (!ann) { try { renderFn(null, update, commit, cancel); } catch {} return null; }
    return notitie();
  });
  api.registerSelectionListener(type, (ann) => {
    if (!vensterAan()) {
      if (ann) meldGesloten(ann);
      return;
    }
    if (ann) {
      clearTimeout(wis);
      toon(api, renderFn, ann);
      if (lade?.el.hasAttribute('data-dicht')) meldGesloten(ann);
      return;
    }
    // A deselect calls every type's listener: clear once, unless something
    // was selected again straight after (moving to another Seed43 item).
    const nu = teller;
    clearTimeout(wis);
    wis = setTimeout(() => { if (teller === nu && lade) { lade.lijf.replaceChildren(leeg()); zetTab('elementen'); } }, 0);
  });
}

/** Start: show the drawer's tab when the drawer is switched on. */
export function startLade(api) {
  api0 = api;
  if (vensterAan()) maakLade();
}

/** Ribbon: Properties drawer on or off. Returns whether it is now on. */
export function wisselVenster() {
  const aan = !vensterAan();
  try { localStorage.setItem(AAN, aan ? '1' : '0'); } catch {}
  if (aan) { maakLade(); zetOpen(true); } else verwijderLade();
  return aan;
}

// --- Several Seed43 items selected -----------------------------------------
//
// Needs api.onSelectionChange and api.getSelectedAnnotations (Open PDF Studio
// builds that have them). The single-item listeners report "nothing" for a
// multi-select; this shows one shared form for all of them instead.

/**
 * `typen`: the annotation types to include; `bouw(api, anns, opnieuw)` builds
 * the shared form, `opnieuw()` draws it again after a change.
 */
export function registreerMeervoud(api, typen, bouw) {
  if (typeof api.onSelectionChange !== 'function') return null;
  const toonMeer = (sel) => {
    if (!vensterAan()) return;
    const onze = (sel || []).filter((a) => typen.includes(a.type));
    if (onze.length < 2) return;
    teller++;
    clearTimeout(wis);
    const l = maakLade();
    const ids = onze.map((a) => a.id);
    const opnieuw = () => {
      const vers = (api.getAnnotations?.() || []).filter((a) => ids.includes(a.id));
      toonMeer(vers);
    };
    let dom = null;
    try { dom = bouw(api, onze, opnieuw); } catch (e) { console.warn('[seed43] properties (several):', e); }
    const scroll = l.lijf.scrollTop;
    l.lijf.replaceChildren(dom || leeg());
    l.lijf.scrollTop = scroll;
    zetTab('eigenschappen');
  };
  return api.onSelectionChange(toonMeer);
}
