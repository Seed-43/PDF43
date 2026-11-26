// Auto Link: hyperlinks between section / detail bubbles and the views they
// point to, both ways.
//
// A Revit sheet set marks a cut with a bubble: the detail number over the
// sheet it is drawn on (SD32 over S4.03, on plan S1.02). The detail's own
// title on that sheet carries the same number over the sheet it is cut on
// (SD32 over S1.02, on S4.03). Revit's PDF export links the first to the
// second at best; nothing links back, and a set printed or merged elsewhere
// often has no links at all.
//
// This finds every such pair from the page text and links each bubble to its
// partner: the plan bubble to the detail title, the title back to the bubble.
// A bubble whose partner is not found links to the top of the sheet it names.
// A detail cut and drawn on the same sheet: its bubble and its title link to
// each other on that page.
//
// Pure: page text in, link plans out. The tool (index.js) reads the pages and
// creates the app's own link annotations, so they can be edited, undone and
// saved like any other link.

const SHEET_RE = /^[A-Z]{1,3}-?\d{1,3}(?:\.\d{1,3})?[A-Z]?$/;
const LABEL_RE = /^[A-Za-z]{0,3}\d{1,3}[A-Za-z]?$/;

/** Text items of a page, horizontal in the view, with a box: { text, x, y, w, h } (y down, top of the box). */
export function tekstVakken(items) {
  const uit = [];
  for (const it of items || []) {
    const text = String(it.text ?? '').trim();
    if (!text) continue;
    const t = it.transform;
    let h = Math.abs(it.height || 0);
    if (Array.isArray(t)) {
      // Horizontal in the view only: rotated text is no bubble.
      if (Math.abs(t[1]) > 0.05 * Math.abs(t[0]) || t[0] <= 0) continue;
      h = Math.hypot(t[2], t[3]) || h;
    }
    if (!(h > 0)) continue;
    const w = Math.abs(it.width || 0) || text.length * h * 0.55;
    uit.push({ text, x: it.x, y: it.y - h, w, h });
  }
  return uit;
}

/**
 * The sheet number of each page: the largest sheet-like text on it (the title
 * block), lowest and rightmost on a tie. Returns { [page]: 'S4.03' } and
 * { 'S4.03': page }; a sheet number found on two pages is dropped.
 */
export function bladNummers(paginas) {
  const vanPagina = {}, paginaVan = {}, dubbel = new Set();
  for (const { page, vakken } of paginas) {
    let beste = null;
    for (const v of vakken) {
      if (!SHEET_RE.test(v.text)) continue;
      if (!beste || v.h > beste.h * 1.15 || (Math.abs(v.h - beste.h) <= beste.h * 0.15 && v.y + v.x > beste.y + beste.x)) beste = v;
    }
    // Only a title block: clearly larger than the bubble text on the page.
    const bubbel = vakken.filter((v) => SHEET_RE.test(v.text) && v !== beste).map((v) => v.h);
    const gewoon = bubbel.length ? bubbel.sort((a, b) => a - b)[Math.floor(bubbel.length / 2)] : 0;
    if (!beste || (gewoon && beste.h < gewoon * 1.2)) continue;
    vanPagina[page] = beste.text;
    if (paginaVan[beste.text]) dubbel.add(beste.text); else paginaVan[beste.text] = page;
  }
  for (const s of dubbel) { delete paginaVan[s]; for (const p of Object.keys(vanPagina)) if (vanPagina[p] === s) delete vanPagina[p]; }
  return { vanPagina, paginaVan };
}

/**
 * Bubbles on a page: a short label right above a sheet number of the set,
 * centred on each other. Returns [{ label, sheet, box: { x, y, width, height } }].
 */
export function bubbels(vakken, bladen, eigenBlad = null) {
  const uit = [];
  const gebruikt = new Set();
  for (const s of vakken) {
    if (!bladen.has(s.text) || s.text === eigenBlad && s.h > 1.15 * Math.min(...vakken.filter((v) => bladen.has(v.text)).map((v) => v.h))) continue;
    const cx = s.x + s.w / 2;
    let beste = null;
    for (const l of vakken) {
      if (l === s || gebruikt.has(l) || !LABEL_RE.test(l.text) || bladen.has(l.text)) continue;
      if (Math.abs(l.h - s.h) > 0.35 * s.h) continue;
      const dx = Math.abs(l.x + l.w / 2 - cx);
      const dy = s.y - l.y;   // label above: its top is higher
      if (dx > Math.max(1.5, 0.5 * s.h) || dy < 0.6 * s.h || dy > 2.2 * s.h) continue;
      if (!beste || dy < beste.dy) beste = { l, dy };
    }
    if (!beste) continue;
    gebruikt.add(beste.l);
    const l = beste.l;
    // The circle round both: centred, a little larger than the text.
    const x0 = Math.min(l.x, s.x), x1 = Math.max(l.x + l.w, s.x + s.w);
    const y0 = l.y, y1 = s.y + s.h;
    const r = Math.max(x1 - x0, y1 - y0) / 2 + 0.6 * s.h;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    uit.push({ label: l.text, sheet: s.text, box: { x: mx - r, y: my - r, width: 2 * r, height: 2 * r } });
  }
  return uit;
}

/**
 * The links to make. `paginas`: [{ page, items }] with readPageContent text.
 * Returns { links: [{ page, box, label, sheet, target: { page, box|null } }],
 *           zonderDoel: [{ page, label, sheet }], bladen }.
 */
export function planLinks(paginas) {
  const metVakken = paginas.map((p) => ({ page: p.page, vakken: tekstVakken(p.items) }));
  const { vanPagina, paginaVan } = bladNummers(metVakken);
  const bladen = new Set(Object.keys(paginaVan));
  const perPagina = new Map();
  for (const { page, vakken } of metVakken) perPagina.set(page, bubbels(vakken, bladen, vanPagina[page]));
  const links = [], zonderDoel = [];
  for (const [page, lijst] of perPagina) {
    const eigen = vanPagina[page] || null;
    for (const b of lijst) {
      const doelPagina = paginaVan[b.sheet];
      if (!doelPagina) { zonderDoel.push({ page, label: b.label, sheet: b.sheet }); continue; }
      if (doelPagina === page) {
        // Cut and drawn on the same sheet (2 over S1.01, on S1.01): the cut
        // bubble and the view title link to each other on this page.
        const zelfde = lijst.filter((d) => d !== b && d.label === b.label && d.sheet === b.sheet);
        if (zelfde.length === 1) links.push({ page, box: b.box, label: b.label, sheet: b.sheet, target: { page, box: zelfde[0].box } });
        continue;
      }
      const daar = perPagina.get(doelPagina) || [];
      // The partner: the same label, pointing back at this sheet.
      const partner = daar.find((d) => d.label === b.label && eigen && d.sheet === eigen)
        || (daar.filter((d) => d.label === b.label).length === 1 ? daar.find((d) => d.label === b.label) : null);
      links.push({ page, box: b.box, label: b.label, sheet: b.sheet, target: { page: doelPagina, box: partner ? partner.box : null } });
    }
  }
  return { links, zonderDoel, bladen: vanPagina };
}

/** Does a link already cover this box (an earlier run, or one drawn by hand)? */
export function alGelinkt(bestaande, page, box) {
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  return (bestaande || []).some((a) => a.type === 'link' && a.page === page
    && cx >= a.x && cx <= a.x + a.width && cy >= a.y && cy <= a.y + a.height);
}
