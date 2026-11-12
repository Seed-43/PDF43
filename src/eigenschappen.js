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
  position:absolute;z-index:930;width:${BREEDTE}px;max-width:calc(100% - 60px);top:8px;bottom:8px;right:0;display:flex;flex-direction:column;background:var(--bg);color:var(--tx);
  border:1px solid var(--rand);border-radius:8px 0 0 8px;box-shadow:-6px 0 20px rgba(0,0,0,.25);
  transition:transform .2s ease,opacity .2s ease;font:13px/1.35 system-ui,Segoe UI,sans-serif;overflow:hidden;}
.s43d-lade[data-dicht]{transform:translateX(40px);opacity:0;pointer-events:none;box-shadow:none;}
.s43d-balk{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--rand);flex:none;}
.s43d-balk b{padding:4px 12px;border:1px solid var(--acc);border-radius:6px;background:color-mix(in srgb,var(--acc) 15%,transparent);font-weight:600;}
.s43d-balk span{flex:1;}
.s43d-x{border:0;background:none;color:inherit;cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;border-radius:4px;}
.s43d-x:hover{background:color-mix(in srgb,var(--tx) 10%,transparent);}
.s43d-lijf{flex:1;min-height:0;overflow:auto;}
.s43d-leeg{padding:16px;color:var(--theme-text-secondary,#666);}
.s43d-tab{position:absolute;z-index:931;top:50%;right:0;margin-top:-50px;writing-mode:vertical-rl;padding:14px 7px;border:1px solid var(--theme-border,#c8ccd1);border-right:0;
  border-radius:8px 0 0 8px;background:var(--theme-surface,#fff);color:var(--theme-text,#1f2328);font:600 13px system-ui,Segoe UI,sans-serif;
  cursor:pointer;box-shadow:-3px 0 10px rgba(0,0,0,.18);transition:right .2s ease;}
.s43d-tab:hover,.s43d-tab[data-open]{border-color:var(--theme-accent,#0078d7);color:var(--theme-accent,#0078d7);}
`;

export function vensterAan() {
  try { return localStorage.getItem(AAN) !== '0'; } catch { return true; }
}
function isOpen() {
  try { return localStorage.getItem(OPEN) === '1'; } catch { return false; }
}

let lade = null;   // { el, lijf, tab }

// The drawer and its tab live inside the page view, pinned to its right
// edge: no screen coordinates, so the app's interface scale cannot shift it.
function houder() {
  return document.querySelector('.main-view') || document.body;
}

function plaats() {
  if (!lade) return;
  const open = !lade.el.hasAttribute('data-dicht');
  lade.tab.style.right = open ? `${lade.el.offsetWidth || BREEDTE}px` : '0px';
}

function zetOpen(open) {
  try { localStorage.setItem(OPEN, open ? '1' : '0'); } catch {}
  if (!lade) return;
  lade.el.toggleAttribute('data-dicht', !open);
  lade.tab.toggleAttribute('data-open', open);
  plaats();
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
  el.innerHTML = '<div class="s43d-balk"><b>Seed43 Properties</b><span></span><button class="s43d-x" title="Close">×</button></div><div class="s43d-lijf"></div>';
  const lijf = el.querySelector('.s43d-lijf');
  const tab = document.createElement('button');
  tab.className = 's43d-tab';
  tab.textContent = 'Seed43 Properties';
  tab.title = 'Seed43 Properties: the options of the selected Seed43 item';
  tab.addEventListener('click', () => zetOpen(el.hasAttribute('data-dicht')));
  el.querySelector('.s43d-x').addEventListener('click', () => zetOpen(false));
  houder().append(el, tab);
  lade = { el, lijf, tab };
  window.addEventListener('resize', plaats);
  lijf.replaceChildren(leeg());
  zetOpen(isOpen());
  return lade;
}

export function verwijderLade() {
  if (!lade) return;
  lade.el.remove();
  lade.tab.remove();
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
}

/**
 * Register the properties form for a Seed43 annotation type. With the drawer
 * on, the form shows in the drawer and the app's panel gets a one-line note;
 * with it off, the form shows in the app's panel as before.
 */
export function registreerEigenschappen(api, type, renderFn) {
  api.registerPropertyPanel(type, (ann, update, commit, cancel) => {
    if (!vensterAan()) return renderFn(ann, update, commit, cancel);
    if (!ann) { try { renderFn(null, update, commit, cancel); } catch {} return null; }
    return notitie();
  });
  api.registerSelectionListener(type, (ann) => {
    if (!vensterAan()) return;
    if (ann) { clearTimeout(wis); toon(api, renderFn, ann); return; }
    // A deselect calls every type's listener: clear once, unless something
    // was selected again straight after (moving to another Seed43 item).
    const nu = teller;
    clearTimeout(wis);
    wis = setTimeout(() => { if (teller === nu && lade) lade.lijf.replaceChildren(leeg()); }, 0);
  });
}

/** Start: show the drawer's tab when the drawer is switched on. */
export function startLade() {
  if (vensterAan()) maakLade();
}

/** Ribbon: Properties drawer on or off. Returns whether it is now on. */
export function wisselVenster() {
  const aan = !vensterAan();
  try { localStorage.setItem(AAN, aan ? '1' : '0'); } catch {}
  if (aan) { maakLade(); zetOpen(true); } else verwijderLade();
  return aan;
}
