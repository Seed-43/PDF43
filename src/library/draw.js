// Drawing library elements to scale. Geometry is built in millimetres around
// the element's centre, then turned and scaled to page points
// (ptsPerMm, stored on the element when it is placed).

import { tekenBracing, bracingBounds } from './bracing.js';

const num = (v) => (Number.isFinite(+v) ? +v : 0);

/** Timber shapes, drawn in brown. */
export const HOUTVORMEN = ['rect', 'glulam', 'lvl', 'ijoist'];
/** Fixings (brackets, hangers, plates): placed by a click, in section or elevation. */
export const BEVESTIGINGEN = ['hanger', 'plate', 'fangle'];
/** Glulam lamination thickness and LVL veneer line spacing, mm (drawing only). */
const LAMEL = 45;
const VINEER = 10;

/** Outline of a section in mm, centred: { polys: [[x,y]...][], circles: [{r, hole}], w, h }. */
export function sectieVorm(shape, it) {
  const d = num(it.d), b = num(it.b) || d, tf = num(it.tf) || num(it.t), tw = num(it.tw) || num(it.t), t = num(it.t) || tf;
  const hd = d / 2, hb = b / 2;
  switch (shape) {
    case 'I':
      return { w: b, h: d, polys: [[
        [-hb, -hd], [hb, -hd], [hb, -hd + tf], [tw / 2, -hd + tf], [tw / 2, hd - tf], [hb, hd - tf], [hb, hd],
        [-hb, hd], [-hb, hd - tf], [-tw / 2, hd - tf], [-tw / 2, -hd + tf], [-hb, -hd + tf]]] };
    case 'channel':
      return { w: b, h: d, polys: [[
        [-hb, -hd], [hb, -hd], [hb, -hd + tf], [-hb + tw, -hd + tf], [-hb + tw, hd - tf], [hb, hd - tf], [hb, hd], [-hb, hd]]] };
    case 'angle':
      return { w: b, h: d, polys: [[[-hb, -hd], [-hb + t, -hd], [-hb + t, hd - t], [hb, hd - t], [hb, hd], [-hb, hd]]] };
    case 'rhs':
      return { w: b, h: d, polys: [[[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]], [[-hb + t, -hd + t], [hb - t, -hd + t], [hb - t, hd - t], [-hb + t, hd - t]]], hollow: true };
    case 'chs':
      return { w: d, h: d, circles: [{ r: d / 2 }, { r: Math.max(0, d / 2 - t), hole: true }] };
    case 'round':
      return { w: d, h: d, circles: [{ r: d / 2 }] };
    case 'lipped-c': {
      const lip = num(it.lip);
      return { w: b, h: d, polys: [[
        [hb, -hd + lip], [hb, -hd], [-hb, -hd], [-hb, hd], [hb, hd], [hb, hd - lip], [hb - t, hd - lip], [hb - t, hd - t],
        [-hb + t, hd - t], [-hb + t, -hd + t], [hb - t, -hd + t], [hb - t, -hd + lip]]] };
    }
    case 'lipped-z': {
      // Lipped Zed purlin: top flange e to one side, bottom flange f to the
      // other, lips at both ends, web t thick.
      const e = num(it.e) || b, f = num(it.f) || b, lip = num(it.lip), w = e + f - t, hw = w / 2;
      const xw = -hw + f - t;
      return { w, h: d, polys: [[
        [-hw, hd - lip], [-hw, hd], [xw + t, hd], [xw + t, -hd + t], [hw - t, -hd + t], [hw - t, -hd + lip],
        [hw, -hd + lip], [hw, -hd], [xw, -hd], [xw, hd - t], [-hw + t, hd - t], [-hw + t, hd - lip]]] };
    }
    case 'rect': {
      // Sawn timber: the section with a cross, or one diagonal for blocking;
      // 2/ = pieces side by side.
      const n = Math.max(1, Math.round(num(it.plies) || 1));
      const lijnen = [];
      for (let i = 0; i < n; i++) {
        const x0 = -hb + (b * i) / n, x1 = -hb + (b * (i + 1)) / n;
        lijnen.push([[x0, -hd], [x1, hd]]);
        if (!it.blocking) lijnen.push([[x1, -hd], [x0, hd]]);
        if (i) lijnen.push([[x0, -hd], [x0, hd]]);
      }
      return { w: b, h: d, hout: true, lijnen, polys: [[[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]]] };
    }
    case 'glulam': {
      // Glulam: laminations across the depth, LAMEL mm thick from the
      // bottom; what is left over is the top lamination.
      const lijnen = [];
      for (let y = hd - LAMEL; y > -hd + 1; y -= LAMEL) lijnen.push([[-hb, y], [hb, y]]);
      const n = Math.max(1, Math.round(num(it.plies) || 1));
      for (let i = 1; i < n; i++) { const x = -hb + (b * i) / n; lijnen.push([[x, -hd], [x, hd]]); }
      return { w: b, h: d, hout: true, dun: true, lijnen, polys: [[[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]]] };
    }
    case 'lvl': {
      // LVL: veneer lines down the depth, VINEER mm apart from the left.
      const lijnen = [];
      for (let x = -hb + VINEER; x < hb - 1; x += VINEER) lijnen.push([[x, -hd], [x, hd]]);
      const n = Math.max(1, Math.round(num(it.plies) || 1));
      for (let i = 1; i < n; i++) { const x = -hb + (b * i) / n; lijnen.push([[x, -hd], [x, hd]]); }
      return { w: b, h: d, hout: true, dun: true, lijnen, polys: [[[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]]] };
    }
    // ── Fixings (Lumberlok, Bowmac): it.view 'section' (end on) or 'elevation' (side on) ──
    case 'hanger': {
      // Joist hanger: inside width b, height h, steel t, side plate L along
      // the joist, face flanges F wide. Section: the U around the joist with
      // the face flanges either side. Elevation: the side plate, with the
      // flange on the supporting face as a heavy line at the left.
      const t = Math.max(num(it.t), 0.5), L = num(it.L) || 40, F = num(it.F) || 30;
      if (it.view === 'elevation') {
        const hw = L / 2;
        return { w: L, h: d, staal: true, polys: [[[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]],
          lijnen: [[[-hw + t, -hd], [-hw + t, hd]]] };
      }
      const bi = b / 2, bo = bi + t, ho = hd, hi = hd - t;
      return { w: b + 2 * t + 2 * F, h: d, staal: true, polys: [
        [[-bo, -ho], [-bi, -ho], [-bi, hi], [bi, hi], [bi, -ho], [bo, -ho], [bo, ho], [-bo, ho]],
        [[-bo - F, -ho], [-bo, -ho], [-bo, ho], [-bo - F, ho]],
        [[bo, -ho], [bo + F, -ho], [bo + F, ho], [bo, ho]],
      ] };
    }
    case 'plate': {
      // Flat plate or strap: width b, length d (it.d), thickness t. Elevation:
      // the plate face on; section: the plate edge on.
      const t = Math.max(num(it.t), 0.5);
      if (it.view === 'elevation') return { w: b, h: d, staal: true, polys: [[[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]]] };
      return { w: b, h: t, staal: true, polys: [[[-hb, -t / 2], [hb, -t / 2], [hb, t / 2], [-hb, t / 2]]] };
    }
    case 'fangle': {
      // Angle cleat or bracket: legs a (up) and c (across), length l, t.
      // Section: the L end on. Elevation: leg a face on, l long.
      const a = num(it.a), c = num(it.c), l = num(it.l), t = Math.max(num(it.t), 0.5);
      if (it.view === 'elevation') return { w: l, h: a, staal: true, polys: [[[-l / 2, -a / 2], [l / 2, -a / 2], [l / 2, a / 2], [-l / 2, a / 2]]] };
      const x0 = -c / 2, y0 = a / 2;
      return { w: c, h: a, staal: true, polys: [[[x0, -y0], [x0 + t, -y0], [x0 + t, y0 - t], [x0 + c, y0 - t], [x0 + c, y0], [x0, y0]]] };
    }
    case 'ijoist': {
      // I-joist: true outline once tf and tw are known, else the outline
      // with the web dashed.
      const f = num(it.tf), w = num(it.tw);
      if (f > 0 && w > 0) return { ...sectieVorm('I', { d, b, tf: f, tw: w }), hout: true };
      return { w: b, h: d, hout: true, streep: [[[0, -hd], [0, hd]]],
        polys: [[[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]]] };
    }
    case 'flat':
    default:
      return { w: b, h: d, polys: [[[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]]] };
  }
}

function draai([x, y], graden) {
  const r = (graden * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [x * c - y * s, x * s + y * c];
}

/** Width and height of a w x h box turned by any angle. */
export function gedraaid(w, h, graden) {
  const r = ((graden || 0) * Math.PI) / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
  return { w: w * c + h * s, h: w * s + h * c };
}

const STAAL = '#1d4ed8';
const DUN = '#9ca3af';
const HOUT = '#92400e';
const HOUT_VUL = 'rgba(180, 120, 50, 0.16)';

/** Timber shapes are drawn in brown. */
export const isHout = (shape) => HOUTVORMEN.includes(shape);

/** Fill and stroke a section outline (mm) at cx, cy, k page points per mm. */
function tekenVorm(ctx, v, cx, cy, k, rot, kleur, vul) {
  const P = (p) => { const [x, y] = draai(p, rot); return [cx + x * k, cy + y * k]; };
  ctx.strokeStyle = kleur;
  ctx.fillStyle = vul;
  ctx.beginPath();
  for (const poly of v.polys || []) {
    poly.forEach((p, i) => { const [x, y] = P(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
  }
  for (const c of v.circles || []) {
    ctx.moveTo(cx + c.r * k, cy);
    ctx.arc(cx, cy, c.r * k, 0, Math.PI * 2, !!c.hole);
  }
  ctx.fill('evenodd');
  ctx.stroke();
  const lijn = (lijst, streep) => {
    if (!lijst?.length) return;
    const lw = ctx.lineWidth;
    ctx.lineWidth = lw * 0.6;
    ctx.setLineDash(streep ? [lw * 4, lw * 3] : []);
    ctx.beginPath();
    for (const [a, b] of lijst) { const [x1, y1] = P(a), [x2, y2] = P(b); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = lw;
  };
  if (v.dun) { const k0 = ctx.strokeStyle; ctx.strokeStyle = DUN; lijn(v.lijnen, false); ctx.strokeStyle = k0; } else lijn(v.lijnen, false);
  lijn(v.streep, true);
}

/** A section fitted into a w x h box (library previews), proportions kept. */
export function tekenVoorbeeld(ctx, shape, it, w, h, opties = {}) {
  const v = sectieVorm(shape, it);
  if (!(v.w > 0) || !(v.h > 0)) return false;
  const marge = opties.marge ?? 6;
  const k = opties.k || Math.min((w - 2 * marge) / v.w, (h - 2 * marge) / v.h);
  ctx.save();
  ctx.lineWidth = opties.lijn || 1;
  ctx.lineJoin = 'round';
  const kleur = opties.kleur || (v.hout ? HOUT : STAAL);
  tekenVorm(ctx, v, w / 2, h / 2, k, 0, kleur, v.hout ? HOUT_VUL : 'rgba(29, 78, 216, 0.16)');
  ctx.restore();
  return true;
}

export function sectieMaat(el) {
  const v = sectieVorm(el.shape, el.item);
  const k = el.ptsPerMm || 1;
  return gedraaid(v.w * k, v.h * k, el.rotation);
}

export function tekenSectie(ctx, ann) {
  const el = ann.element;
  if (!el) return;
  const v = sectieVorm(el.shape, el.item);
  const k = el.ptsPerMm || 1;
  // x, y is the top-left of the bounds (the host moves elements by x, y).
  const m = sectieMaat(el);
  const cx = ann.x + m.w / 2, cy = ann.y + m.h / 2;
  ctx.save();
  ctx.lineWidth = 0.6;
  const kleur = el.color || (v.hout ? HOUT : STAAL);
  tekenVorm(ctx, v, cx, cy, k, el.rotation || 0, kleur, v.hout ? HOUT_VUL : 'rgba(29, 78, 216, 0.18)');
  if (el.label !== false) {
    const { h } = m;
    ctx.fillStyle = kleur;
    ctx.font = '7px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(labelNaam(el), cx, cy + h / 2 + 2);
  }
  ctx.restore();
}

/** Bolt group: plate size and the checks against the bolt's minimums. */
export function boutGroep(el) {
  const rows = Math.max(1, Math.round(num(el.rows) || 1)), cols = Math.max(1, Math.round(num(el.cols) || 1));
  const pitch = num(el.pitch), gauge = num(el.gauge), ex = num(el.edgeX), ey = num(el.edgeY);
  const minEdge = num(el.bolt?.minEdge), minPitch = num(el.bolt?.minPitch);
  const fouten = [];
  if (minEdge > 0) {
    if (ex < minEdge) fouten.push(`edge ${ex} < ${minEdge} (across)`);
    if (ey < minEdge) fouten.push(`edge ${ey} < ${minEdge} (along)`);
  }
  if (minPitch > 0) {
    if (rows > 1 && pitch < minPitch) fouten.push(`pitch ${pitch} < ${minPitch}`);
    if (cols > 1 && gauge < minPitch) fouten.push(`gauge ${gauge} < ${minPitch}`);
  }
  const ongecontroleerd = !(minEdge > 0) || !(minPitch > 0);
  return {
    rows, cols, pitch, gauge, ex, ey, fouten, ongecontroleerd,
    w: gauge * (cols - 1) + 2 * ex, h: pitch * (rows - 1) + 2 * ey,
  };
}

// ── Bolt group in elevation (side on) ─────────────────────────────────
// ISO 4014/4032 and AS 1252 proportions, mm: head height k, nut height m,
// washer thickness wt and outside diameter wd. Square washers: typical
// timber sizes (side x thickness). Other diameters scale from d.
const BOUT_DELEN = {
  12: { k: 7.5, m: 10.8, wt: 2.5, wd: 24, sq: 50, sqt: 3 }, 16: { k: 10, m: 14.8, wt: 3, wd: 30, sq: 65, sqt: 5 },
  20: { k: 12.5, m: 18, wt: 3, wd: 37, sq: 65, sqt: 5 }, 24: { k: 15, m: 21.5, wt: 4, wd: 44, sq: 75, sqt: 6 },
  30: { k: 18.7, m: 25.6, wt: 4, wd: 56, sq: 90, sqt: 8 }, 36: { k: 22.5, m: 31, wt: 5, wd: 66, sq: 100, sqt: 8 },
};

/**
 * Options of a bolt group (both views):
 *   kind     'bolt' (hex head) | 'rod' (threaded rod)
 *   nuts     0 | 1 | 2   bolt: none, a nut, double nut; rod: none, one end, both ends
 *            '1d' | '2d'   rod: double nuts at one end, at both ends
 *   washer   'none' | 'round' | 'square'
 *   washerAt 'nut' (under the nuts only) | 'both' (also under the head or at the other end)
 *   flip     true: the bolt turned over (nut side on top, head side below)
 */
export function boutOpties(el) {
  const ruw = String(el.nuts ?? '1');
  const dubbel = ruw.endsWith('d');
  const nuts = [0, 1, 2].includes(parseInt(ruw, 10)) ? parseInt(ruw, 10) : 1;
  return {
    kind: el.kind === 'rod' ? 'rod' : 'bolt',
    nuts,
    dubbel: dubbel && nuts > 0,
    washer: ['none', 'round', 'square'].includes(el.washer) ? el.washer : 'round',
    washerAt: el.washerAt === 'both' ? 'both' : 'nut',
    flip: el.flip === true,
  };
}

export function boutAfmetingen(el) {
  const d = num(el.bolt?.d) || 20;
  const p = BOUT_DELEN[d] || { k: 0.64 * d, m: 0.86 * d, wt: Math.max(2.5, 0.16 * d), wd: 1.85 * d, sq: 3.2 * d, sqt: Math.max(3, 0.25 * d) };
  const af = num(el.bolt?.af) || 1.5 * d;
  return { d, ...p, af, e: af * 1.155 };
}

/** Side view of a bolt group: parts stacked up from the plies (top) and down (bottom). */
export function boutZijaanzicht(el) {
  const g = boutGroep(el);
  const a = boutAfmetingen(el);
  const o = boutOpties(el);
  const langs = el.along === 'pitch';
  const n = langs ? g.rows : g.cols, s = langs ? g.pitch : g.gauge, rand = langs ? g.ey : g.ex;
  const grip = num(el.grip) || 20;
  const uitsteek = Math.max(3, Math.round(0.4 * a.d));
  const ring = o.washer === 'square' ? { soort: 'washer', h: a.sqt, w: a.sq } : o.washer === 'round' ? { soort: 'washer', h: a.wt, w: a.wd } : null;
  const moer = { soort: 'nut', h: a.m, w: a.e };
  const draad = { soort: 'thread', h: uitsteek, w: a.d };
  // Bottom (nut side): washer, nut(s), thread past the nut.
  const onder = [];
  if (o.nuts > 0 && ring) onder.push(ring);
  const perEind = o.dubbel ? 2 : 1;
  const onderNoten = o.kind === 'rod' ? (o.nuts > 0 ? perEind : 0) : o.nuts;
  for (let i = 0; i < onderNoten; i++) onder.push(moer);
  onder.push(draad);
  // Top: a bolt head, or the other end of the rod.
  const boven = [];
  if (o.kind === 'bolt') {
    if (ring && o.washerAt === 'both') boven.push(ring);
    boven.push({ soort: 'head', h: a.k, w: a.e });
  } else {
    if (o.nuts === 2) { if (ring && o.washerAt === 'both') boven.push(ring); for (let i = 0; i < perEind; i++) boven.push(moer); }
    boven.push(draad);
  }
  const som = (lijst) => lijst.reduce((t, x) => t + x.h, 0);
  const lengteRuw = grip + som(onder) + som(boven) - (o.kind === 'bolt' ? a.k : 0);
  const L = Math.ceil(lengteRuw / 5) * 5;
  // The rounding goes into the thread past the nut.
  onder[onder.length - 1] = { ...draad, h: draad.h + (L - lengteRuw) };
  // Turned over: both lists run from the plies outward, so they just swap.
  if (o.flip) { const t = boven.slice(); boven.length = 0; boven.push(...onder); onder.length = 0; onder.push(...t); }
  const breedste = Math.max(...[...onder, ...boven].map((x) => x.w));
  const breedte = Math.max((n - 1) * s + 2 * rand, breedste + 4);
  return { ...g, ...a, o, n, s, grip, L, boven, onder, w: breedte, h: som(boven) + grip + som(onder), langs };
}

export function boutMaat(el) {
  const g = el.view === 'elevation' ? boutZijaanzicht(el) : boutGroep(el), k = el.ptsPerMm || 1;
  return gedraaid(g.w * k, g.h * k, el.rotation);
}

function tekenBoutZijaanzicht(ctx, ann) {
  const el = ann.element;
  const z = boutZijaanzicht(el), k = el.ptsPerMm || 1;
  const m = boutMaat(el);
  const cx = ann.x + m.w / 2, cy = ann.y + m.h / 2, rot = el.rotation || 0;
  const fout = z.fouten.length > 0;
  const kleur = fout ? '#dc2626' : (el.color || '#0f766e');
  const P = (x, y) => { const [a, b] = draai([x, y], rot); return [cx + a * k, cy + b * k]; };
  const lijn = (pts, sluiten = false) => { ctx.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = P(x, y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); if (sluiten) ctx.closePath(); };
  const rechthoek = (x0, y0, w, h, vul) => { lijn([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], true); if (vul) { ctx.fillStyle = vul; ctx.fill(); } ctx.stroke(); };
  const deel = (x, y0, p) => {
    rechthoek(x - p.w / 2, y0, p.w, p.h, '#ffffff');
    if (p.soort === 'head' || p.soort === 'nut') {   // hexagon across the corners: two face lines
      lijn([[x - p.w / 4, y0], [x - p.w / 4, y0 + p.h]]); ctx.stroke();
      lijn([[x + p.w / 4, y0], [x + p.w / 4, y0 + p.h]]); ctx.stroke();
    }
  };
  ctx.save();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = kleur;
  const top = -z.h / 2;
  const hBoven = z.boven.reduce((t, x) => t + x.h, 0);
  const plaatTop = top + hBoven, plaatOnder = plaatTop + z.grip;
  if (el.plate !== false) rechthoek(-z.w / 2, plaatTop, z.w, z.grip, fout ? 'rgba(220,38,38,0.08)' : 'rgba(15,118,110,0.08)');
  for (let i = 0; i < z.n; i++) {
    const x = -z.s * (z.n - 1) / 2 + i * z.s;
    // Top parts, from the plies up.
    let y = plaatTop;
    for (const p of z.boven) { y -= p.h; deel(x, y, p); }
    // Shank hidden in the plies.
    ctx.setLineDash([2, 1.5]);
    lijn([[x - z.d / 2, plaatTop], [x - z.d / 2, plaatOnder]]); ctx.stroke();
    lijn([[x + z.d / 2, plaatTop], [x + z.d / 2, plaatOnder]]); ctx.stroke();
    ctx.setLineDash([]);
    // Bottom parts, from the plies down.
    y = plaatOnder;
    for (const p of z.onder) { deel(x, y, p); y += p.h; }
    // Centre line
    ctx.setLineDash([6, 1.5, 1, 1.5]); ctx.lineWidth = 0.35;
    lijn([[x, top - 3], [x, top + z.h + 3]]); ctx.stroke();
    ctx.setLineDash([]); ctx.lineWidth = 0.6;
  }
  const { h } = m;
  ctx.fillStyle = kleur;
  ctx.font = '7px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const naam = z.o.kind === 'rod' ? `M${z.d} threaded rod` : (el.bolt?.name || 'bolt');
  ctx.fillText(`${z.rows * z.cols}-${naam} x ${z.L}`, cx, cy + h / 2 + 2);
  if (fout) ctx.fillText(z.fouten.join(', '), cx, cy + h / 2 + 11);
  ctx.restore();
}

export function tekenBoutGroep(ctx, ann) {
  const el = ann.element;
  if (!el) return;
  if (el.view === 'elevation') { tekenBoutZijaanzicht(ctx, ann); return; }
  const g = boutGroep(el), k = el.ptsPerMm || 1;
  const m = boutMaat(el);
  const cx = ann.x + m.w / 2, cy = ann.y + m.h / 2, rot = el.rotation || 0;
  const fout = g.fouten.length > 0;
  const kleur = fout ? '#dc2626' : (el.color || '#0f766e');
  const P = (x, y) => { const [a, b] = draai([x, y], rot); return [cx + a * k, cy + b * k]; };
  ctx.save();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = kleur;
  // Plate
  if (el.plate !== false && g.w > 0 && g.h > 0) {
    ctx.beginPath();
    [[-g.w / 2, -g.h / 2], [g.w / 2, -g.h / 2], [g.w / 2, g.h / 2], [-g.w / 2, g.h / 2]].forEach(([x, y], i) => {
      const [px, py] = P(x, y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = fout ? 'rgba(220,38,38,0.08)' : 'rgba(15,118,110,0.08)';
    ctx.fill();
    ctx.stroke();
  }
  // Bolts: hole circle with a cross
  const r = (num(el.bolt?.hole) || num(el.bolt?.d) || 20) / 2;
  // Face view: the washer seen from the head side (round or square), if any.
  const ringZicht = el.washer === 'square' || el.washer === 'round' ? el.washer : 'none';
  const ringMaat = boutAfmetingen(el);
  // Plan: what is seen from the top end (the head of a bolt, or the other end of a rod).
  const bovenaanzicht = el.view === 'plan';
  const opt = boutOpties(el);
  // Turned over, the nut side is on top: a nut (if any) with its washer.
  const bovenZeskant = opt.flip ? opt.nuts > 0 : (opt.kind === 'bolt' || opt.nuts === 2);
  const bovenRing = opt.washer === 'none' || !bovenZeskant ? 'none'
    : (opt.flip || opt.washerAt === 'both') ? opt.washer : 'none';
  for (let i = 0; i < g.rows; i++) {
    for (let j = 0; j < g.cols; j++) {
      const x = -g.gauge * (g.cols - 1) / 2 + j * g.gauge, y = -g.pitch * (g.rows - 1) / 2 + i * g.pitch;
      const [px, py] = P(x, y);
      const ring = (straal) => { ctx.beginPath(); ctx.arc(px, py, straal * k, 0, Math.PI * 2); ctx.stroke(); };
      const vierkant = (hs) => {
        ctx.beginPath();
        [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]].forEach(([dx, dy], q) => { const [qx, qy] = P(x + dx, y + dy); q ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); });
        ctx.closePath(); ctx.stroke();
      };
      const kruis = (rr) => {
        ctx.beginPath(); ctx.moveTo(px - rr * k * 1.3, py); ctx.lineTo(px + rr * k * 1.3, py);
        ctx.moveTo(px, py - rr * k * 1.3); ctx.lineTo(px, py + rr * k * 1.3); ctx.stroke();
      };
      if (bovenaanzicht) {
        // Plan: looking down on the top end: washer (if one is there),
        // then the hexagon of the head or nut, or the end of the rod.
        if (bovenRing === 'round') ring(ringMaat.wd / 2); else if (bovenRing === 'square') vierkant(ringMaat.sq / 2);
        if (bovenZeskant) {
          const R = ringMaat.e / 2;
          ctx.beginPath();
          for (let q = 0; q < 6; q++) {
            const hoek = (Math.PI / 3) * q;   // corners left and right, flats top and bottom
            const [qx, qy] = P(x + R * Math.cos(hoek), y + R * Math.sin(hoek));
            q ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy);
          }
          ctx.closePath(); ctx.stroke();
          ring(ringMaat.af / 2 * 0.95);
        } else {
          ring(ringMaat.d / 2);
        }
        kruis(ringMaat.d / 2);
        continue;
      }
      ring(r);
      if (ringZicht === 'round') ring(ringMaat.wd / 2);
      else if (ringZicht === 'square') vierkant(ringMaat.sq / 2);
      kruis(r);
    }
  }
  // Label and check result
  const { h } = m;
  ctx.fillStyle = kleur;
  ctx.font = '7px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${g.rows * g.cols}-${opt.kind === 'rod' ? `M${ringMaat.d} threaded rod` : (el.bolt?.name || 'bolt')}`, cx, cy + h / 2 + 2);
  if (fout) ctx.fillText(g.fouten.join(', '), cx, cy + h / 2 + 11);
  ctx.restore();
}


// ── Members along a line (elevation or plan) ──────────────────────────────

/** Width across the member in mm for a view, and the lines along it
 *  (offsets from the centre line in mm, dashed = hidden). */
export function lidProfiel(shape, it, view) {
  const d = num(it.d), b = num(it.b) || d, tf = num(it.tf) || num(it.t), tw = num(it.tw) || num(it.t), t = num(it.t) || tf;
  const lijnen = [];
  let breedte;
  if (view === 'plan') {
    breedte = shape === 'chs' || shape === 'round' ? d : b;
    if (shape === 'I') lijnen.push({ o: -tw / 2, dash: true }, { o: tw / 2, dash: true });
    else if (shape === 'channel') lijnen.push({ o: -b / 2 + tw, dash: true });
    else if (shape === 'angle') lijnen.push({ o: -b / 2 + t, dash: true });
    else if (shape === 'rhs' || shape === 'chs' || shape === 'lipped-c' || shape === 'lipped-z') lijnen.push({ o: -breedte / 2 + t, dash: true }, { o: breedte / 2 - t, dash: true });
    else if (shape === 'rect' || shape === 'glulam' || shape === 'lvl') { const n = Math.max(1, Math.round(num(it.plies) || 1)); for (let i = 1; i < n; i++) lijnen.push({ o: -b / 2 + (b * i) / n }); }
    else if (shape === 'ijoist') { const w = num(it.tw); if (w > 0) lijnen.push({ o: -w / 2, dash: true }, { o: w / 2, dash: true }); else lijnen.push({ o: 0, dash: true }); }
  } else {
    breedte = d;
    if (shape === 'I' || shape === 'channel') lijnen.push({ o: -d / 2 + tf }, { o: d / 2 - tf });
    else if (shape === 'angle') lijnen.push({ o: -d / 2 + t });
    else if (shape === 'rhs' || shape === 'chs' || shape === 'lipped-c' || shape === 'lipped-z') lijnen.push({ o: -d / 2 + t, dash: true }, { o: d / 2 - t, dash: true });
    else if (shape === 'ijoist' && num(it.tf) > 0) lijnen.push({ o: -d / 2 + num(it.tf) }, { o: d / 2 - num(it.tf) });
  }
  return { breedte, lijnen };
}

// ── Members side by side (2/140x45) and the label text ──────────────────

/** Shapes that can be doubled, tripled, ... (pieces side by side). */
export const AANTAL_VORMEN = ['rect', 'glulam', 'lvl'];

/**
 * Set how many pieces side by side: the element's item becomes n times as
 * wide with n plies; the single piece is kept in `enkel`. n = 1 restores it.
 */
export function metAantal(el, n) {
  const basis = el.enkel || el.item;
  n = Math.max(1, Math.min(20, Math.round(+n || 1)));
  if (n > 1 && AANTAL_VORMEN.includes(el.shape)) {
    el.enkel = basis;
    el.item = { ...basis, b: num(basis.b) * n, plies: (Math.round(num(basis.plies)) || 1) * n };
    el.aantal = n;
  } else {
    el.item = basis;
    delete el.enkel;
    delete el.aantal;
  }
  return el;
}

/** The label: the user's own text, else 2/140x45 for doubled members, else the name. */
export function labelNaam(el) {
  if (el?.labelTekst) return el.labelTekst;
  const naam = el?.enkel?.name || el?.item?.name || '';
  return el?.aantal > 1 ? `${el.aantal}/${naam}` : naam;
}

/** Where the drawn line sits on the member: centre, or one edge (top of steel, one face). */
export const UITLIJNING = { centre: 'Centre', top: 'Top / left edge', bottom: 'Bottom / right edge' };

export function lidGeometrie(ann) {
  const el = ann.element, k = el.ptsPerMm || 1;
  let ax = ann.startX, ay = ann.startY, bx = ann.endX, by = ann.endY;
  const L = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
  const p = lidProfiel(el.shape, el.item, el.view);
  const hw = (p.breedte * k) / 2;
  // Line on an edge: the member moves off the line, below it (or to the
  // right of a vertical line) for 'top', above (or left) for 'bottom'.
  if (el.uitlijn === 'top' || el.uitlijn === 'bottom') {
    let ox = nx, oy = ny;
    if (oy < -1e-6 || (Math.abs(oy) <= 1e-6 && ox < 0)) { ox = -ox; oy = -oy; }
    const af = (el.uitlijn === 'top' ? 1 : -1) * hw;
    ax += ox * af; ay += oy * af; bx += ox * af; by += oy * af;
  }
  const hoeken = [[ax + nx * hw, ay + ny * hw], [bx + nx * hw, by + ny * hw], [bx - nx * hw, by - ny * hw], [ax - nx * hw, ay - ny * hw]];
  return { ax, ay, bx, by, L, ux, uy, nx, ny, k, p, hoeken };
}

export function lidBounds(ann) {
  if (ann.element?.shape === 'bracing') return bracingBounds(ann);
  const g = lidGeometrie(ann);
  const xs = g.hoeken.map((h) => h[0]), ys = g.hoeken.map((h) => h[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function tekenLid(ctx, ann) {
  const el = ann.element;
  if (!el) return;
  if (el.shape === 'bracing') { tekenBracing(ctx, ann); return; }
  const g = lidGeometrie(ann);
  const kleur = el.color || (isHout(el.shape) ? HOUT : STAAL);
  ctx.save();
  ctx.strokeStyle = kleur;
  ctx.lineWidth = 0.6;
  ctx.fillStyle = isHout(el.shape) ? HOUT_VUL : 'rgba(29, 78, 216, 0.10)';
  ctx.beginPath();
  g.hoeken.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (const l of g.p.lijnen) {
    const o = l.o * g.k;
    ctx.setLineDash(l.dash ? [3, 2] : []);
    ctx.beginPath();
    ctx.moveTo(g.ax + g.nx * o, g.ay + g.ny * o);
    ctx.lineTo(g.bx + g.nx * o, g.by + g.ny * o);
    ctx.stroke();
  }
  // Centre line
  ctx.setLineDash([8, 2, 1.5, 2]);
  ctx.lineWidth = 0.35;
  const over = 4;
  ctx.beginPath();
  ctx.moveTo(g.ax - g.ux * over, g.ay - g.uy * over);
  ctx.lineTo(g.bx + g.ux * over, g.by + g.uy * over);
  ctx.stroke();
  ctx.setLineDash([]);
  // Label above the member, readable (never upside down)
  if (el.label !== false) {
    let hoek = Math.atan2(g.uy, g.ux);
    if (hoek > Math.PI / 2 || hoek < -Math.PI / 2) hoek += Math.PI;
    const mx = (g.ax + g.bx) / 2, my = (g.ay + g.by) / 2;
    const af = (g.p.breedte * g.k) / 2 + 3;
    ctx.translate(mx, my);
    ctx.rotate(hoek);
    ctx.fillStyle = kleur;
    ctx.font = '7px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const lengte = Math.round(g.L / g.k);
    ctx.fillText(`${labelNaam(el)}${el.showLength === false ? '' : `  L=${lengte}`}`, 0, -af);
  }
  ctx.restore();
}
