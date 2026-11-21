// Seed43 Collab: page commands are switched off while a shared PDF's tab is
// the active one. Markups everywhere point at page numbers, and changes to the
// PDF itself are never shared, so inserting, deleting, rotating or replacing
// pages (or other changes to the PDF's content) would only break this copy.
//
// Open PDF Studio has no API for this, so it works on the app's own buttons:
//   - the Organize ribbon buttons, by their ids (greyed out, clicks ignored);
//   - the page-thumbnail menu, whose items have no ids, by their labels in
//     all of the app's languages (paginalabels.js).
// Anything that still gets through (a shortcut, a future command) is caught by
// sync.js, which pauses syncing until the page change is undone.

import { PAGINA_LABELS, PAGINA_PATRONEN, KNIP_LABELS } from './paginalabels.js';

// Organize tab: page structure, and changes to the PDF's own content.
const RIBBON_IDS = [
  'insert-page', 'delete-page', 'extract-pages', 'rotate-left', 'rotate-right', 'reorder-pages', 'edit-pages',
  'ep-crop-margins', 'ep-straighten', 'ep-shift-page', 'ep-resize-pages', 'ep-compress-pdf',
  'ep-edit-text', 'ep-add-text', 'ep-ocr', 'ep-scan-text',
  'add-watermark', 'add-header-footer', 'manage-watermarks', 'document-security',
];
const KLASSE = 's43c-paginaslot';
const STIJL_ID = 'seed43-collab-paginaslot';
const UITLEG = 'Pages are locked in a shared PDF (Seed43 Collab): everyone marks up the same pages.';

const CSS = RIBBON_IDS.map((id) => `body.${KLASSE} #${id}`).join(',\n')
  + '{opacity:.35 !important;pointer-events:none !important;}\n'
  + `.context-menu-item.${KLASSE}-uit,.context-menu-item.${KLASSE}-uit *{opacity:.45 !important;cursor:default !important;}\n`
  + `.context-menu-item.${KLASSE}-uit:hover{background:transparent !important;}`;

let aan = false;
let waker = null;

const labelVan = (item) => item?.querySelector('.context-menu-label')?.textContent?.trim() || '';
const isPaginaLabel = (label) => PAGINA_LABELS.has(label) || PAGINA_PATRONEN.some((r) => r.test(label));

/**
 * A page command on the page-thumbnail menu. Cut, Copy and Paste count only
 * there (a menu that also holds page commands): on markups they stay usable.
 */
function isPaginaMenuItem(el) {
  const item = el?.closest?.('.context-menu-item');
  const label = labelVan(item);
  if (!label) return null;
  if (isPaginaLabel(label)) return item;
  if (KNIP_LABELS.has(label)) {
    // Look a few levels up for the menu it sits in (sections may be wrapped).
    for (let p = item.parentElement, i = 0; p && p !== document.body && i < 4; p = p.parentElement, i++) {
      if ([...p.querySelectorAll('.context-menu-item')].some((x) => x !== item && isPaginaLabel(labelVan(x)))) return item;
    }
  }
  return null;
}

// Clicks on a blocked thumbnail-menu item never reach the app.
function vang(e) {
  if (!aan) return;
  if (isPaginaMenuItem(e.target)) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}

// Grey the blocked items out as the menu appears, and say why.
function markeer(root) {
  if (!aan || !root?.querySelectorAll) return;
  for (const item of root.querySelectorAll('.context-menu-item')) {
    // Both ways: the app may reuse an item for a different command.
    const uit = !!isPaginaMenuItem(item);
    if (uit === item.classList.contains(`${KLASSE}-uit`)) continue;
    item.classList.toggle(`${KLASSE}-uit`, uit);
    if (uit) item.title = UITLEG; else item.removeAttribute('title');
  }
}

/** Start watching. `actief()` says whether a live shared PDF's tab is the active one. */
export function startPaginaSlot(actief) {
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
  for (const soort of ['pointerdown', 'mousedown', 'mouseup', 'click']) document.addEventListener(soort, vang, true);
  // The menu may already be in the page and just be shown, or reuse its items
  // with new labels, so look at the whole page whenever anything in it changes
  // (cheap: only .context-menu-item elements are checked), and on right-click.
  let gepland = false;
  const later = () => { if (gepland || !aan) return; gepland = true; requestAnimationFrame(() => { gepland = false; markeer(document); }); };
  const kijker = new MutationObserver(later);
  kijker.observe(document.body, { childList: true, subtree: true, characterData: true });
  document.addEventListener('contextmenu', later, true);
  const tik = () => {
    const nu = !!actief();
    if (nu === aan) return;
    aan = nu;
    document.body.classList.toggle(KLASSE, aan);
    if (aan) markeer(document);
    else for (const item of document.querySelectorAll(`.${KLASSE}-uit`)) { item.classList.remove(`${KLASSE}-uit`); item.removeAttribute('title'); }
    for (const id of RIBBON_IDS) {
      const b = document.getElementById(id);
      if (b) { if (aan) { b.dataset.s43Titel = b.title || ''; b.title = UITLEG; } else if (b.dataset.s43Titel !== undefined) { b.title = b.dataset.s43Titel; delete b.dataset.s43Titel; } }
    }
  };
  waker = setInterval(tik, 400);
  tik();
  return () => {
    clearInterval(waker);
    kijker.disconnect();
    for (const soort of ['pointerdown', 'mousedown', 'mouseup', 'click']) document.removeEventListener(soort, vang, true);
    document.removeEventListener('contextmenu', later, true);
    aan = false;
    document.body.classList.remove(KLASSE);
  };
}
