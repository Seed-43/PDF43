// Drawing library elements to scale. Geometry is built in millimetres around
// the element's centre, then turned and scaled to page points
// (ptsPerMm, stored on the element when it is placed).

const num = (v) => (Number.isFinite(+v) ? +v : 0);

/** Timber shapes, drawn in brown. */
export const HOUTVORMEN = ['rect', 'glulam', 'lvl', 'ijoist'];
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
    case 'rect': {
      // Sawn timber: the section with a cross, or one diagonal for blocking;
      // 2/ = pieces side by side.
      const n = Math.max(1, Math.round(num(it.plies) || 1));
      const lijnen = it.blocking ? [[[-hb, -hd], [hb, hd]]] : [[[-hb, -hd], [hb, hd]], [[hb, -hd], [-hb, hd]]];
      for (let i = 1; i < n; i++) { const x = -hb + (b * i) / n; lijnen.push([[x, -hd], [x, hd]]); }
      return { w: b, h: d, hout: true, lijnen, polys: [[[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]]] };
    }
    case 'glulam': {
      // Glulam: laminations across the depth, LAMEL mm thick from the
      // bottom; what is left over is the top lamination.
      const lijnen = [];
      for (let y = hd - LAMEL; y > -hd + 1; y -= LAMEL) lijnen.push([[-hb, y], [hb, y]]);
      return { w: b, h: d, hout: true, dun: true, lijnen, polys: [[[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]]] };
    }
    case 'lvl': {
      // LVL: veneer lines down the depth, VINEER mm apart from the left.
      const lijnen = [];
      for (let x = -hb + VINEER; x < hb - 1; x += VINEER) lijnen.push([[x, -hd], [x, hd]]);
      return { w: b, h: d, hout: true, dun: true, lijnen, polys: [[[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]]] };
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
    ctx.fillText(el.item.name, cx, cy + h / 2 + 2);
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

export function boutMaat(el) {
  const g = boutGroep(el), k = el.ptsPerMm || 1;
  return gedraaid(g.w * k, g.h * k, el.rotation);
}

export function tekenBoutGroep(ctx, ann) {
  const el = ann.element;
  if (!el) return;
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
  for (let i = 0; i < g.rows; i++) {
    for (let j = 0; j < g.cols; j++) {
      const x = -g.gauge * (g.cols - 1) / 2 + j * g.gauge, y = -g.pitch * (g.rows - 1) / 2 + i * g.pitch;
      const [px, py] = P(x, y);
      ctx.beginPath(); ctx.arc(px, py, r * k, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px - r * k * 1.3, py); ctx.lineTo(px + r * k * 1.3, py);
      ctx.moveTo(px, py - r * k * 1.3); ctx.lineTo(px, py + r * k * 1.3); ctx.stroke();
    }
  }
  // Label and check result
  const { h } = m;
  ctx.fillStyle = kleur;
  ctx.font = '7px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${g.rows * g.cols}-${el.bolt?.name || 'bolt'}`, cx, cy + h / 2 + 2);
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
    else if (shape === 'rhs' || shape === 'chs' || shape === 'lipped-c') lijnen.push({ o: -breedte / 2 + t, dash: true }, { o: breedte / 2 - t, dash: true });
    else if (shape === 'rect') { const n = Math.max(1, Math.round(num(it.plies) || 1)); for (let i = 1; i < n; i++) lijnen.push({ o: -b / 2 + (b * i) / n }); }
    else if (shape === 'ijoist') { const w = num(it.tw); if (w > 0) lijnen.push({ o: -w / 2, dash: true }, { o: w / 2, dash: true }); else lijnen.push({ o: 0, dash: true }); }
  } else {
    breedte = d;
    if (shape === 'I' || shape === 'channel') lijnen.push({ o: -d / 2 + tf }, { o: d / 2 - tf });
    else if (shape === 'angle') lijnen.push({ o: -d / 2 + t });
    else if (shape === 'rhs' || shape === 'chs' || shape === 'lipped-c') lijnen.push({ o: -d / 2 + t, dash: true }, { o: d / 2 - t, dash: true });
    else if (shape === 'ijoist' && num(it.tf) > 0) lijnen.push({ o: -d / 2 + num(it.tf) }, { o: d / 2 - num(it.tf) });
  }
  return { breedte, lijnen };
}

export function lidGeometrie(ann) {
  const el = ann.element, k = el.ptsPerMm || 1;
  const ax = ann.startX, ay = ann.startY, bx = ann.endX, by = ann.endY;
  const L = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
  const p = lidProfiel(el.shape, el.item, el.view);
  const hw = (p.breedte * k) / 2;
  const hoeken = [[ax + nx * hw, ay + ny * hw], [bx + nx * hw, by + ny * hw], [bx - nx * hw, by - ny * hw], [ax - nx * hw, ay - ny * hw]];
  return { ax, ay, bx, by, L, ux, uy, nx, ny, k, p, hoeken };
}

export function lidBounds(ann) {
  const g = lidGeometrie(ann);
  const xs = g.hoeken.map((h) => h[0]), ys = g.hoeken.map((h) => h[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function tekenLid(ctx, ann) {
  const el = ann.element;
  if (!el) return;
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
    ctx.fillText(`${el.item.name}${el.showLength === false ? '' : `  L=${lengte}`}`, 0, -af);
  }
  ctx.restore();
}
