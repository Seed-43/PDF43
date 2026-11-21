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

import { PAGINA_LABELS } from './paginalabels.js';

// Organize tab: page structure, and changes to the PDF's own content.
const RIBBON_IDS = [
  'insert-page', 'delete-page', 'rotate-left', 'rotate-right', 'reorder-pages', 'edit-pages',
  'ep-crop-margins', 'ep-straighten', 'ep-shift-page', 'ep-resize-pages', 'ep-compress-pdf',
  'ep-edit-text', 'ep-add-text', 'ep-ocr', 'ep-scan-text',
  'add-watermark', 'add-header-footer', 'manage-watermarks', 'document-security',
];
const KLASSE = 's43c-paginaslot';
const STIJL_ID = 'seed43-collab-paginaslot';
const UITLEG = 'Pages are locked in a shared PDF (Seed43 Collab): everyone marks up the same pages.';

const CSS = RIBBON_IDS.map((id) => `body.${KLASSE} #${id}`).join(',\n')
  + '{opacity:.35 !important;pointer-events:none !important;}\n'
  + `.context-menu-item.${KLASSE}-uit{opacity:.4;}`;

let aan = false;
let waker = null;

function isPaginaMenuItem(el) {
  const item = el?.closest?.('.context-menu-item');
  const label = item?.querySelector('.context-menu-label')?.textContent?.trim();
  return label && PAGINA_LABELS.has(label) ? item : null;
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
    if (isPaginaMenuItem(item)) { item.classList.add(`${KLASSE}-uit`); item.title = UITLEG; }
  }
}

/** Start watching. `actief()` says whether a live shared PDF's tab is the active one. */
export function startPaginaSlot(actief) {
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
  for (const soort of ['pointerdown', 'mousedown', 'mouseup', 'click']) document.addEventListener(soort, vang, true);
  const kijker = new MutationObserver((lijst) => { for (const m of lijst) for (const n of m.addedNodes) if (n.nodeType === 1) markeer(n); });
  kijker.observe(document.body, { childList: true, subtree: true });
  const tik = () => {
    const nu = !!actief();
    if (nu === aan) return;
    aan = nu;
    document.body.classList.toggle(KLASSE, aan);
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
    aan = false;
    document.body.classList.remove(KLASSE);
  };
}
