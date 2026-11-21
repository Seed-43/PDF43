// Auto Link button: reads every page, finds the section / detail bubbles and
// links each to its partner (autolink.js). The links are plain PDF links,
// the same as the ones Revit exports: invisible, highlighted on hover, and
// not editable in the app. A bubble that already has a link (from Revit, or
// an earlier run) is left alone, so running it again only adds what is
// missing. One undo step.
//
// Needs api.addPdfLinks / api.getPageLinks (features.pdfLinks).

import { planLinks } from './autolink.js';

/** Is a point inside one of the rectangles? */
function binnen(lijst, x, y) {
  return lijst.some((r) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height);
}

/** Can this app make plain links? */
export function kanAutoLink(api) {
  return api?.features?.pdfLinks === true && typeof api.addPdfLinks === 'function' && typeof api.getPageLinks === 'function';
}

/**
 * Run Auto Link on the open document.
 * @returns {Promise<{made:number, skipped:number, total:number}>}
 */
export async function autoLink(api, { bijVoortgang } = {}) {
  if (!kanAutoLink(api)) throw new Error('This needs a newer Open PDF Studio (plain PDF links for extensions).');
  const n = api.getPageCount?.() || 0;
  if (!n) return { made: 0, skipped: 0, total: 0 };
  const paginas = [];
  const bestaand = new Map();
  for (let p = 1; p <= n; p++) {
    bijVoortgang?.(p, n);
    const c = await api.readPageContent(p);
    paginas.push({ page: p, items: c?.text || [] });
    bestaand.set(p, await api.getPageLinks(p));
  }
  const { links } = planLinks(paginas);
  const nieuw = [];
  let skipped = 0;
  for (const l of links) {
    const cx = l.box.x + l.box.width / 2, cy = l.box.y + l.box.height / 2;
    if (binnen(bestaand.get(l.page) || [], cx, cy)) { skipped++; continue; }
    // Open just above and left of the partner bubble; no partner: the whole sheet.
    const t = l.target.box;
    const marge = t ? t.width * 3 : 0;
    nieuw.push({
      page: l.page,
      rect: { ...l.box },
      target: t ? { page: l.target.page, x: Math.max(0, t.x - marge), y: Math.max(0, t.y - marge) } : { page: l.target.page },
    });
  }
  if (nieuw.length) await api.addPdfLinks(nieuw);
  return { made: nieuw.length, skipped, total: links.length };
}

/** The message after a run. */
export function samenvatting(r) {
  if (!r.total) return 'No section or detail bubbles found. Auto Link looks for a detail number right above a sheet number of this set (SD32 over S4.03), with the sheet numbers read from the title blocks.';
  const delen = [r.made
    ? `${r.made} link${r.made === 1 ? '' : 's'} added between section and detail bubbles.`
    : 'Every section and detail bubble already has a link; nothing added.'];
  if (r.made && r.skipped) delen.push(`${r.skipped} already had a link and were left as they were.`);
  if (r.made) delen.push('Undo removes them in one step.');
  return delen.join(' ');
}
