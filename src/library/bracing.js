// Bracing legend tag: a dashed line along a braced wall with its bracing
// type and length in metres, like Fred's Revit family "BRACING LEGEND TAG".
// Drawn as a Seed43 member (click A, then B; Ctrl/Shift keeps it square)
// with shape 'bracing'. Settings live on the element's item:
//   tag          bracing type text, e.g. JHD, GS1-N, BL1-H
//   wallOffset   line offset from the wall, paper mm (Revit: Wall Offset)
//   tagOffset    text offset beyond the line, paper mm (Revit: Tag Offset)
//   both         line on both sides of the wall (Bracing Both Side)
//   flip         line and tag on the other side (Flip Tag)
//   above        tag on one line, length on the line under it (Tag Above Length)
//   round05      round the length down to 0.05 m, else 0.01 m (Round Length 0.05)
//   fromEnd      tag position from end A in real mm, 0 = centred
//                (Adjust Tag Offset from One End)

const PT_PER_PAPER_MM = 72 / 25.4;
const LIJN = '#2563eb';
const TEKST = '#111111';
const TEKST_PT = 7;

export const BRACING_STANDAARD = { tag: 'JHD', wallOffset: 1, tagOffset: 1, both: false, flip: false, above: false, round05: false, fromEnd: 0 };

/** Common NZ bracing element codes offered in the tag list (free text is fine too). */
export const BRACING_CODES = ['JHD', 'GS1-N', 'GS2-N', 'GSP-H', 'GS1-H', 'GS2-H', 'BL1-H', 'BLG-H', 'BLP-H', 'EP1', 'EPB'];

const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

/** Real length (mm) rounded down like the Revit family, as metres text. */
export function bracingLengte(lengteMm, round05) {
  const stap = round05 ? 50 : 10;
  const mm = Math.floor(lengteMm / stap + 1e-9) * stap;
  return { mm, tekst: `${(mm / 1000).toFixed(2)}m` };
}

function geometrie(ann) {
  const el = ann.element, it = { ...BRACING_STANDAARD, ...(el.item || {}) };
  const k = el.ptsPerMm || 1;
  const ax = ann.startX, ay = ann.startY, bx = ann.endX, by = ann.endY;
  const L = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / L, uy = (by - ay) / L;
  // Default side: left of A to B on the sheet (above a line drawn left to right).
  const f = it.flip ? -1 : 1;
  const sx = uy * f, sy = -ux * f;
  const wo = num(it.wallOffset, 1) * PT_PER_PAPER_MM;
  const to = num(it.tagOffset, 1) * PT_PER_PAPER_MM;
  const regels = it.above ? 2 : 1;
  const tekstHoogte = regels * TEKST_PT * 1.15;
  return { el, it, k, ax, ay, bx, by, L, ux, uy, sx, sy, wo, to, tekstHoogte };
}

export function bracingBounds(ann) {
  const g = geometrie(ann);
  const ver = g.wo + g.to + g.tekstHoogte + 2;
  const terug = g.it.both ? g.wo + 2 : 2;
  const pts = [];
  for (const [px, py] of [[g.ax, g.ay], [g.bx, g.by]]) {
    pts.push([px + g.sx * ver, py + g.sy * ver], [px - g.sx * terug, py - g.sy * terug]);
  }
  // The tag text can be wider than a short line.
  const m = tekstMidden(g);
  const halfBreed = Math.max(40, (labelTekst(g).join('').length * TEKST_PT * 0.3));
  pts.push([m.x + g.ux * halfBreed, m.y + g.uy * halfBreed], [m.x - g.ux * halfBreed, m.y - g.uy * halfBreed]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function labelTekst(g) {
  const lengte = bracingLengte(g.L / g.k, g.it.round05).tekst;
  const tag = String(g.it.tag || '').trim();
  if (g.it.above) return [tag, `(${lengte})`];
  return [tag ? `${tag} (${lengte})` : `(${lengte})`];
}

function tekstMidden(g) {
  const vanaf = num(g.it.fromEnd, 0) > 0 ? Math.min(num(g.it.fromEnd) * g.k, g.L) : g.L / 2;
  const af = g.wo + g.to;
  return { x: g.ax + g.ux * vanaf + g.sx * af, y: g.ay + g.uy * vanaf + g.sy * af };
}

export function tekenBracing(ctx, ann) {
  if (!ann.element) return;
  const g = geometrie(ann);
  ctx.save();
  ctx.strokeStyle = LIJN;
  ctx.lineWidth = 0.9;
  ctx.setLineDash([4, 2.5]);
  const lijn = (o) => {
    ctx.beginPath();
    ctx.moveTo(g.ax + g.sx * o, g.ay + g.sy * o);
    ctx.lineTo(g.bx + g.sx * o, g.by + g.sy * o);
    ctx.stroke();
  };
  lijn(g.wo);
  if (g.it.both) lijn(-g.wo);
  ctx.setLineDash([]);
  if (ann.element.label !== false) {
    // Readable: never upside down; the text sits on the far side of the line.
    let hoek = Math.atan2(g.uy, g.ux);
    if (hoek > Math.PI / 2 + 1e-6 || hoek < -Math.PI / 2 - 1e-6) hoek += Math.PI;
    const m = tekstMidden(g);
    const omlaagX = -Math.sin(hoek), omlaagY = Math.cos(hoek);
    const naarOnder = g.sx * omlaagX + g.sy * omlaagY > 0;
    const regels = labelTekst(g);
    ctx.translate(m.x, m.y);
    ctx.rotate(hoek);
    ctx.fillStyle = TEKST;
    ctx.font = `${TEKST_PT}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    const r = TEKST_PT * 1.15;
    // Alphabetic baselines (the same in every renderer): cap height about
    // 0.75 of the size, descenders about 0.22.
    ctx.textBaseline = 'alphabetic';
    if (naarOnder) regels.forEach((t, i) => ctx.fillText(t, 0, i * r + TEKST_PT * 0.75));
    else regels.forEach((t, i) => ctx.fillText(t, 0, -(regels.length - 1 - i) * r - TEKST_PT * 0.22));
  }
  ctx.restore();
}

/**
 * Is (px, py) on this bracing line? The dashed line (and its twin when on
 * both sides) and the tag text both count, so the text can be clicked too.
 */
export function bracingRaak(px, py, ann, tol = 2) {
  if (!ann?.element) return false;
  const g = geometrie(ann);
  const dx = px - g.ax, dy = py - g.ay;
  const t = dx * g.ux + dy * g.uy;              // along A to B
  const n = dx * g.sx + dy * g.sy;              // out from the wall, towards the tag
  const marge = Math.max(3, tol + 2);
  // The line, offset from the wall (and on the other side too).
  if (t >= -marge && t <= g.L + marge) {
    if (Math.abs(n - g.wo) <= marge) return true;
    if (g.it.both && Math.abs(n + g.wo) <= marge) return true;
  }
  // The tag text: a box around where it is written.
  const m = tekstMidden(g);
  const tm = (m.x - g.ax) * g.ux + (m.y - g.ay) * g.uy;
  const regels = labelTekst(g);
  const halfBreed = Math.max(...regels.map((r) => r.length)) * TEKST_PT * 0.3 + marge;
  const van = g.wo + g.to - marge, tot = g.wo + g.to + g.tekstHoogte + marge;
  return Math.abs(t - tm) <= halfBreed && n >= Math.min(van, g.wo) && n <= tot;
}
