// The Sheet button on the Seed43 ribbon: pick a drawing sheet or memo, see
// it, then add it to this page, to every page, or start a new PDF of a number
// of pages with it on every page. Laid out like the app's New Document
// window. The Stamps drawer keeps its own way of doing the same.

import { opmaak } from './render.js';
import { GROEPEN, groepVan, leesVerborgen } from './families.js';

const LAATSTE = 'seed43.sheetDialog.last';

function maak(tag, stijl = '', tekst = '') {
  const el = document.createElement(tag);
  if (stijl) el.style.cssText = stijl;
  if (tekst) el.textContent = tekst;
  return el;
}

const KNOP = 'padding:6px 14px;border:1px solid var(--theme-app-menu-divider,#888);border-radius:3px;background:transparent;color:inherit;cursor:pointer;font:inherit;';
const INVOER = 'padding:5px 8px;border:1px solid var(--theme-app-menu-divider,#888);border-radius:3px;background:var(--theme-input-bg,transparent);color:inherit;font:inherit;';

const mm = (pt) => Math.round((pt * 25.4) / 72);
const PAPIER = [['A0', 841, 1189], ['A1', 594, 841], ['A2', 420, 594], ['A3', 297, 420], ['A4', 210, 297], ['A5', 148, 210]];

/** "A1 landscape, 841 x 594 mm" for a sheet's size. */
function papierTekst(w, h) {
  const a = mm(w), b = mm(h);
  const kort = Math.min(a, b), lang = Math.max(a, b);
  const p = PAPIER.find(([, x, y]) => Math.abs(x - kort) <= 3 && Math.abs(y - lang) <= 3);
  return `${p ? `${p[0]} ${a >= b ? 'landscape' : 'portrait'}, ` : ''}${a} x ${b} mm`;
}

/**
 * Open the dialog. `families`: all stamp families (sheets and memos are
 * offered); `acties`: { plaatsHier(f), plaatsAlle(f), nieuw(f, n) }.
 */
export function openBladVenster(families, acties, api) {
  // Only the ones ticked in the Builder list (all, if none are).
  const verborgen = leesVerborgen();
  const alleBladen = families.filter((f) => groepVan(f) !== 'stamp');
  if (!alleBladen.length) { alert('No sheets or memos yet: make one in Stamps › Builder.'); return; }
  const getoond = alleBladen.filter((f) => !verborgen.has(f.id));
  const bladen = getoond.length ? getoond : alleBladen;
  let gekozen = (() => { try { return localStorage.getItem(LAATSTE); } catch { return null; } })();
  if (!bladen.some((f) => f.id === gekozen)) gekozen = bladen[0].id;
  const fam = () => bladen.find((f) => f.id === gekozen) || bladen[0];

  const achter = maak('div', 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:3000;display:flex;align-items:center;justify-content:center;');
  const venster = maak('div', 'width:min(860px,94vw);display:flex;flex-direction:column;background:var(--theme-app-menu-bg,#fff);color:var(--theme-app-menu-text,#222);border:1px solid var(--theme-app-menu-sidebar-border,#888);box-shadow:0 8px 30px rgba(0,0,0,.35);font-size:13px;');
  const kop = maak('div', 'display:flex;align-items:center;padding:10px 14px;font-size:14px;font-weight:bold;border-bottom:1px solid var(--theme-app-menu-divider,#ddd);', 'Seed43 Sheet');
  const kruis = maak('button', `${KNOP}margin-left:auto;padding:2px 8px;border:none;font-size:16px;`, '×');
  kruis.title = 'Close';
  kop.appendChild(kruis);
  const midden = maak('div', 'display:flex;gap:18px;padding:16px;');
  const links = maak('div', 'flex:1;display:grid;grid-template-columns:110px 1fr;gap:10px 10px;align-items:center;align-content:start;');
  const rechts = maak('div', 'width:320px;display:flex;flex-direction:column;align-items:center;gap:8px;');
  const vak = maak('div', 'width:300px;height:300px;display:flex;align-items:center;justify-content:center;background:var(--theme-app-bg,#3a3a40);border:1px solid var(--theme-app-menu-divider,#555);');
  const onderschrift = maak('div', 'opacity:.75;text-align:center;');
  rechts.append(vak, onderschrift);
  midden.append(links, rechts);
  const voet = maak('div', 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-top:1px solid var(--theme-app-menu-divider,#ddd);');
  venster.append(kop, midden, voet);
  achter.appendChild(venster);
  const sluit = () => { achter.remove(); document.removeEventListener('keydown', toets, true); };
  const toets = (e) => { if (e.key === 'Escape') { e.stopPropagation(); sluit(); } };

  // Left: the sheet (grouped Sheets / Memos), its size, and pages for a new PDF.
  // The list's own colours: a transparent select opens a white list with the
  // dialog's light text on it (unreadable in the dark theme).
  const KLEUR = 'background:var(--theme-app-menu-bg,#fff);color:var(--theme-app-menu-text,#222);';
  const keuze = maak('select', INVOER + KLEUR);
  for (const g of ['sheet', 'form']) {
    const lijst = bladen.filter((f) => groepVan(f) === g);
    if (!lijst.length) continue;
    const og = document.createElement('optgroup'); og.label = GROEPEN[g]; og.style.cssText = KLEUR + 'font-weight:bold;';
    for (const f of lijst) { const o = maak('option', KLEUR + 'font-weight:normal;', f.shared ? `🔒 ${f.name}` : f.name); o.value = f.id; og.appendChild(o); }
    keuze.appendChild(og);
  }
  keuze.value = gekozen;
  const maatTekst = maak('div', 'opacity:.85;');
  const paginas = maak('input', `${INVOER}width:70px;`); paginas.type = 'number'; paginas.min = 1; paginas.max = 500; paginas.value = 1;
  const open = api?.getPageCount?.() || 0;
  links.append(
    maak('span', 'opacity:.85;', 'Sheet'), keuze,
    maak('span', 'opacity:.85;', 'Paper size'), maatTekst,
    maak('span', 'opacity:.85;', 'Open PDF'), maak('div', 'opacity:.85;', open ? `${api.getDocumentInfo?.()?.name || 'This PDF'}, ${open} page${open === 1 ? '' : 's'}` : 'None open'),
  );

  function voorbeeld() {
    const f = fam();
    const W = f.width || 595, H = f.height || 842;
    const s = Math.min(280 / W, 280 / H);
    const px = window.devicePixelRatio || 1;
    const c = maak('canvas', 'background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4);');
    c.width = W * s * px; c.height = H * s * px;
    c.style.width = `${W * s}px`; c.style.height = `${H * s}px`;
    const ctx = c.getContext('2d');
    ctx.scale(px * s, px * s);
    ctx.textBaseline = 'middle';
    try { opmaak({ family: f, values: {}, placed: new Date().toISOString() }, { page: 1 }, { fileName: '', pages: 1 }).teken(ctx); } catch (e) { console.warn('[seed43] sheet preview:', e); }
    vak.replaceChildren(c);
    maatTekst.textContent = papierTekst(W, H);
    onderschrift.textContent = `${f.name}${f.shared ? ` (shared: ${f.shared})` : ''}, ${papierTekst(W, H)}`;
  }
  keuze.addEventListener('change', () => {
    gekozen = keuze.value;
    try { localStorage.setItem(LAATSTE, gekozen); } catch {}
    voorbeeld();
  });

  // Footer: the same three ways as the Stamps drawer.
  const knop = (tekst, titel, actie, prim = false, uit = false) => {
    const b = maak('button', KNOP + (prim ? 'background:var(--theme-accent,#0078d7);border-color:var(--theme-accent,#0078d7);color:#fff;' : ''), tekst);
    b.title = titel; b.disabled = uit; if (uit) b.style.opacity = '.5';
    b.addEventListener('click', async () => {
      try { localStorage.setItem(LAATSTE, gekozen); } catch {}
      sluit();
      try { await actie(); } catch (e) { alert(e.message || e); }
    });
    return b;
  };
  voet.append(
    knop('Add to this page', 'Put the sheet on the page you are on, fitted to it', () => acties.plaatsHier(fam()), false, !open),
    knop('Add to all pages', 'Put the sheet on every page of the open PDF', () => acties.plaatsAlle(fam()), false, !open),
    maak('span', 'width:14px;'),
    knop('New PDF', 'A new PDF the size of the sheet, with this many pages, the sheet on each', () => acties.nieuw(fam(), Math.max(1, Math.min(500, Number(paginas.value) || 1))), true),
    paginas, maak('span', '', 'pages'),
    maak('span', 'flex:1;'),
    knop('Cancel', 'Close without adding anything', () => {}),
  );
  kruis.addEventListener('click', sluit);
  achter.addEventListener('mousedown', (e) => { if (e.target === achter) sluit(); });
  document.addEventListener('keydown', toets, true);
  document.body.appendChild(achter);
  voorbeeld();
  keuze.focus();
}
