// Drawing library elements to scale. Geometry is built in millimetres around
// the element's centre, then turned and scaled to page points
// (ptsPerMm, stored on the element when it is placed).

const num = (v) => (Number.isFinite(+v) ? +v : 0);

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
    case 'flat':
    default:
      return { w: b, h: d, polys: [[[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]]] };
  }
}

function draai([x, y], graden) {
  const r = (graden * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [x * c - y * s, x * s + y * c];
}

export function sectieMaat(el) {
  const v = sectieVorm(el.shape, el.item);
  const k = el.ptsPerMm || 1;
  const staand = (el.rotation || 0) % 180 !== 0;
  return { w: (staand ? v.h : v.w) * k, h: (staand ? v.w : v.h) * k };
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
  ctx.strokeStyle = el.color || '#1d4ed8';
  ctx.fillStyle = 'rgba(29, 78, 216, 0.18)';
  ctx.beginPath();
  for (const poly of v.polys || []) {
    poly.forEach((p, i) => {
      const [x, y] = draai(p, el.rotation || 0);
      i ? ctx.lineTo(cx + x * k, cy + y * k) : ctx.moveTo(cx + x * k, cy + y * k);
    });
    ctx.closePath();
  }
  for (const c of v.circles || []) {
    ctx.moveTo(cx + c.r * k, cy);
    ctx.arc(cx, cy, c.r * k, 0, Math.PI * 2, !!c.hole);
  }
  ctx.fill('evenodd');
  ctx.stroke();
  if (el.label !== false) {
    const { h } = m;
    ctx.fillStyle = el.color || '#1d4ed8';
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
  const staand = (el.rotation || 0) % 180 !== 0;
  return { w: (staand ? g.h : g.w) * k, h: (staand ? g.w : g.h) * k };
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
