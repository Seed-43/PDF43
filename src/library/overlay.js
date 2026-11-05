// A drawing layer over the sheet for what the host does not draw for a
// plug-in: the live member preview between two clicks, the snap marker while
// hovering and the grips of the selected element.
//
// The plug-in API gives page points only inside the tool callbacks, so the
// pointer is mapped here from screen pixels to page points the way the host
// does it (zoom and offset of the page canvas). Every point the host hands
// over (a click) is a sample that checks and corrects the mapping. What
// lands on the sheet always comes from the host's own click points or from
// this mapping checked against them; see docs/host-changes.md for the API
// that would make the mapping unnecessary.

let api = null;
let doek = null, ctx = null;
let docSchaal = 0;                 // last doc.scale the host reported
const paginaBreedte = new Map();   // page -> width in page points
let correctie = null;              // { page, dx, dy } screen px, from a host sample

export function startOverlay(a) {
  api = a;
  if (!doek) {
    doek = document.createElement('canvas');
    doek.setAttribute('data-seed43', 'overlay');
    doek.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:2000;';
    document.body.appendChild(doek);
    ctx = doek.getContext('2d');
    maatDoek();
    window.addEventListener('resize', maatDoek);
  }
  try { vraagBreedte(api.getCurrentPage?.() || 1); } catch {}
}

export function stopOverlay() {
  window.removeEventListener('resize', maatDoek);
  doek?.remove();
  doek = null; ctx = null;
}

function maatDoek() {
  if (!doek) return;
  const dpr = window.devicePixelRatio || 1;
  doek.width = Math.round(window.innerWidth * dpr);
  doek.height = Math.round(window.innerHeight * dpr);
  doek.style.width = `${window.innerWidth}px`;
  doek.style.height = `${window.innerHeight}px`;
}

function vraagBreedte(page) {
  if (paginaBreedte.has(page) || !api?.getPageInfo) return;
  paginaBreedte.set(page, 0);
  Promise.resolve(api.getPageInfo(page)).then((i) => { if (i?.width > 0) paginaBreedte.set(page, i.width); }).catch(() => {});
}

/** What the host knows about the page, from a tool callback's state. */
export function meldStaat(state) {
  if (state?.docScale > 0) docSchaal = state.docScale;
  else {
    const d = state?.documents?.[state.activeDocumentIndex];
    if (d?.scale > 0) docSchaal = d.scale;
  }
  const p = state?.currentPage;
  if (p && state.pageWidth > 0) paginaBreedte.set(p, state.pageWidth);
}

// ── Screen <-> page ────────────────────────────────────────────────────────

function vlakVanElement(el, page) {
  const r = el.getBoundingClientRect();
  if (!(r.width > 0)) return null;
  vraagBreedte(page);
  const pw = paginaBreedte.get(page);
  return { page, rect: r, s: pw > 0 ? r.width / pw : docSchaal || 1.5, ox: r.left, oy: r.top };
}

/** The page surface under a screen point (continuous view), else the single page canvas. */
function vlak(clientX, clientY, page) {
  const huidig = api?.getCurrentPage?.() || 1;
  if (clientX !== undefined) {
    const el = document.elementFromPoint(clientX, clientY);
    const cont = el?.closest?.('.canvas-container-cont');
    if (cont) {
      const p = parseInt(cont.dataset.page ?? cont.closest('.page-wrapper')?.dataset.page, 10);
      return vlakVanElement(cont, Number.isFinite(p) ? p : huidig);
    }
  } else if (page) {
    const cont = document.querySelector(`.page-wrapper[data-page="${page}"] .canvas-container-cont`);
    if (cont && cont.offsetParent) return vlakVanElement(cont, page);
  }
  const doekEl = document.getElementById('annotation-canvas');
  if (!doekEl || !doekEl.offsetParent) return null;
  if (page && page !== huidig) return null;
  const r = doekEl.getBoundingClientRect();
  const vp = window.__pdfViewport;
  let v;
  if (vp?.active && Number(vp.zoom) > 0) v = { page: huidig, rect: r, s: Number(vp.zoom), ox: r.left + (Number(vp.offsetX) || 0), oy: r.top + (Number(vp.offsetY) || 0) };
  else { const b = vlakVanElement(doekEl, huidig); if (!b) return null; v = b; if (docSchaal > 0) v.s = docSchaal; }
  return v;
}

function gecorrigeerd(v) {
  if (v && correctie && correctie.page === v.page && correctie.s === v.s) { v.ox += correctie.dx; v.oy += correctie.dy; }
  return v;
}

/** A point the host gave for a pointer event: check the mapping against it. */
export function ijk(e, x, y, page) {
  if (!e || !Number.isFinite(e.clientX) || !Number.isFinite(x)) return;
  const v = vlak(e.clientX, e.clientY);
  if (!v || (page && v.page !== page)) return;
  const dx = e.clientX - (v.ox + x * v.s), dy = e.clientY - (v.oy + y * v.s);
  correctie = Math.hypot(dx, dy) > 1.5 ? { page: v.page, dx, dy, s: v.s } : null;
}

/** Page point under a pointer event: { x, y, page, s } (s = screen px per page point), or null. */
export function naarPagina(e) {
  const v = gecorrigeerd(vlak(e.clientX, e.clientY));
  if (!v) return null;
  const { rect } = v;
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return null;
  return { x: (e.clientX - v.ox) / v.s, y: (e.clientY - v.oy) / v.s, page: v.page, s: v.s };
}

/** Screen pixels per page point on a page (for snap radii), or 0. */
export function zoomVan(page) {
  return gecorrigeerd(vlak(undefined, undefined, page))?.s || 0;
}

// ── Drawing ────────────────────────────────────────────────────────────────

/** Clear the layer; with a page and a function, draw in page points on it. */
export function teken(page, fn) {
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, doek.width, doek.height);
  if (!page || !fn) return;
  const v = gecorrigeerd(vlak(undefined, undefined, page));
  if (!v) return;
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(v.rect.left * dpr, v.rect.top * dpr, v.rect.width * dpr, v.rect.height * dpr);
  ctx.clip();
  ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.ox, dpr * v.oy);
  try { fn(ctx, v.s); } catch (e) { console.warn('[seed43] overlay:', e); }
  ctx.restore();
}

const SNAP_KLEUR = '#f59e0b';
const GREEP_KLEUR = '#2563eb';

/** Snap marker (in page points, sized in screen pixels): square at an end, triangle at a midpoint, circle at a centre. */
export function tekenSnap(c, s, p) {
  if (!p) return;
  const r = 6 / s;
  c.save();
  c.lineWidth = 1.6 / s;
  c.strokeStyle = SNAP_KLEUR;
  c.beginPath();
  if (p.soort === 'A' || p.soort === 'B') c.rect(p.x - r, p.y - r, 2 * r, 2 * r);
  else if (p.soort === 'mid') { c.moveTo(p.x, p.y - r); c.lineTo(p.x + r, p.y + r * 0.8); c.lineTo(p.x - r, p.y + r * 0.8); c.closePath(); }
  else if (p.soort === 'line') { c.moveTo(p.x - r, p.y - r); c.lineTo(p.x + r, p.y + r); c.moveTo(p.x + r, p.y - r); c.lineTo(p.x - r, p.y + r); }
  else c.arc(p.x, p.y, r, 0, Math.PI * 2);
  c.stroke();
  if (p.tekst) {
    c.font = `${11 / s}px Arial, sans-serif`;
    c.fillStyle = SNAP_KLEUR;
    c.textBaseline = 'bottom';
    c.fillText(p.tekst, p.x + r * 1.4, p.y - r * 1.2);
  }
  c.restore();
}

/** Grips of the selected element: filled squares at A and B, a circle at the centre. */
export function tekenGrepen(c, s, grepen, actief) {
  c.save();
  c.lineWidth = 1.2 / s;
  for (const g of grepen) {
    const r = (g === actief ? 5.5 : 4.5) / s;
    c.beginPath();
    if (g.soort === 'A' || g.soort === 'B') c.rect(g.x - r, g.y - r, 2 * r, 2 * r);
    else c.arc(g.x, g.y, r, 0, Math.PI * 2);
    c.fillStyle = g === actief ? SNAP_KLEUR : GREEP_KLEUR;
    c.strokeStyle = '#fff';
    c.fill();
    c.stroke();
  }
  c.restore();
}

/** A thin rubber line from the first click to the cursor. */
export function tekenElastiek(c, s, a, b) {
  c.save();
  c.lineWidth = 1 / s;
  c.setLineDash([4 / s, 3 / s]);
  c.strokeStyle = SNAP_KLEUR;
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  c.restore();
}
