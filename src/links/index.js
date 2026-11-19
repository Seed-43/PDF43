// Auto Link button: reads every page, finds the section / detail bubbles and
// links each to its partner (autolink.js), as the app's own link annotations
// in one undo step. Links already there (an earlier run, or drawn by hand)
// are left alone, so running it again only adds what is missing.

import { planLinks, alGelinkt } from './autolink.js';

const KLEUR = '#0000FF';

/** The view a link jumps to: just above and left of the partner bubble. */
async function doelVan(api, target, info) {
  if (!target.box) return { kind: 'page', page: target.page, fit: 'fit' };
  const marge = target.box.width * 3;
  const p = info.annotationToPdf(Math.max(0, target.box.x - marge), Math.max(0, target.box.y - marge));
  return { kind: 'page', page: target.page, fit: 'xyz', left: p.x, top: p.y, zoom: null };
}

/**
 * Run Auto Link on the open document.
 * @returns {Promise<{made:number, skipped:number, total:number, missing:Array}>}
 */
export async function autoLink(api, { bijVoortgang } = {}) {
  const n = api.getPageCount?.() || 0;
  if (!n) return { made: 0, skipped: 0, total: 0, missing: [] };
  const paginas = [];
  for (let p = 1; p <= n; p++) {
    bijVoortgang?.(p, n);
    const c = await api.readPageContent(p);
    paginas.push({ page: p, items: c?.text || [] });
  }
  const { links, zonderDoel } = planLinks(paginas);
  const bestaande = api.getAnnotations?.() || [];
  const infos = new Map();
  const ops = [];
  let skipped = 0;
  for (const l of links) {
    if (alGelinkt(bestaande, l.page, l.box)) { skipped++; continue; }
    if (!infos.has(l.target.page)) infos.set(l.target.page, await api.getPageInfo(l.target.page));
    const linkTarget = await doelVan(api, l.target, infos.get(l.target.page));
    ops.push({ op: 'create', annotation: {
      type: 'link', page: l.page,
      x: l.box.x, y: l.box.y, width: l.box.width, height: l.box.height,
      linkTarget, linkBorder: 'none', color: KLEUR, strokeColor: KLEUR, lineWidth: 1, linkHighlight: 'I',
    } });
  }
  if (ops.length) api.applyAnnotationBatch(ops);
  api.redrawAnnotations?.();
  return { made: ops.length, skipped, total: links.length, missing: zonderDoel };
}

/** The message after a run. */
export function samenvatting(r) {
  if (!r.total) return 'No section or detail bubbles found. Auto Link looks for a detail number right above a sheet number of this set (SD32 over S4.03), with the sheet numbers read from the title blocks.';
  const delen = [`${r.made} link${r.made === 1 ? '' : 's'} added between section and detail bubbles, both ways.`];
  if (r.skipped) delen.push(`${r.skipped} already had a link and were left as they were.`);
  if (r.missing.length) delen.push(`${r.missing.length} bubble${r.missing.length === 1 ? '' : 's'} point at a sheet that is not in this file (${[...new Set(r.missing.map((m) => m.sheet))].join(', ')}).`);
  delen.push('Undo removes them in one step.');
  return delen.join(' ');
}
