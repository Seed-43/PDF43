// Dimension key for a section: its real shape, to scale, with the dimensions
// marked by the same letters as the properties table (d, b, tf, tw, t, lip).
// Shown under the section data in the Seed43 Properties drawer.

import { tekenVoorbeeld, sectieVorm, isHout } from './draw.js';

const B = 240, H = 200;          // canvas, CSS pixels
const MARGE = 46;                // room for the dimension lines
const INKT = '#1f2328';

const num = (v) => (Number.isFinite(+v) ? +v : 0);

/** Arrowhead at (x, y), pointing along (dx, dy). */
function pijlpunt(ctx, x, y, dx, dy) {
  const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, s = 5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - ux * s - uy * s * 0.45, y - uy * s + ux * s * 0.45);
  ctx.lineTo(x - ux * s + uy * s * 0.45, y - uy * s - ux * s * 0.45);
  ctx.closePath();
  ctx.fill();
}

/** Dimension line from (x1, y1) to (x2, y2) with arrows both ends and a label. */
function maat(ctx, x1, y1, x2, y2, tekst, lx, ly) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  pijlpunt(ctx, x1, y1, x1 - x2, y1 - y2);
  pijlpunt(ctx, x2, y2, x2 - x1, y2 - y1);
  ctx.fillText(tekst, lx, ly);
}

/** A thickness: two arrows pointing at the faces from outside, and a label. */
function dikte(ctx, x1, y1, x2, y2, horizontaal, tekst, lx, ly) {
  const s = 14;
  ctx.beginPath();
  if (horizontaal) {
    ctx.moveTo(x1 - s, y1); ctx.lineTo(x1, y1); ctx.moveTo(x2 + s, y2); ctx.lineTo(x2, y2);
  } else {
    ctx.moveTo(x1, y1 - s); ctx.lineTo(x1, y1); ctx.moveTo(x2, y2 + s); ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  if (horizontaal) { pijlpunt(ctx, x1, y1, 1, 0); pijlpunt(ctx, x2, y2, -1, 0); }
  else { pijlpunt(ctx, x1, y1, 0, 1); pijlpunt(ctx, x2, y2, 0, -1); }
  ctx.fillText(tekst, lx, ly);
}

/** Thin extension line. */
function hulp(ctx, x1, y1, x2, y2) {
  ctx.save(); ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}

/** The key as a canvas element, or null for shapes without one (fixings). */
export function maakMaatschets(shape, it) {
  const v = sectieVorm(shape, it);
  if (!(v.w > 0) || !(v.h > 0) || ['hanger', 'plate', 'fangle', 'ijoist'].includes(shape)) return null;
  const dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.width = B * dpr; cv.height = H * dpr;
  cv.style.cssText = `width:${B}px;height:${H}px;background:#f1f2f4;border-radius:4px;display:block;margin:10px 14px;`;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const k = Math.min((B - 2 * MARGE) / v.w, (H - 2 * MARGE) / v.h);
  tekenVoorbeeld(ctx, shape, it, B, H, { k, kleur: isHout(shape) ? '#92400e' : '#374151', lijn: 1.4 });

  // Section outline on the canvas: centred, w x h in mm times k.
  const cx = B / 2, cy = H / 2, hw = (v.w * k) / 2, hh = (v.h * k) / 2;
  const L = cx - hw, R = cx + hw, T = cy - hh, O = cy + hh;
  const d = num(it.d), b = num(it.b) || d, tf = num(it.tf) || num(it.t), tw = num(it.tw) || num(it.t), t = num(it.t) || tf;
  ctx.strokeStyle = INKT; ctx.fillStyle = INKT; ctx.lineWidth = 1;
  ctx.font = '12px system-ui, Segoe UI, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // Overall depth on the right, width under the section (all shapes).
  const dx = R + 16, by = O + 16;
  hulp(ctx, R + 2, T, dx + 4, T); hulp(ctx, R + 2, O, dx + 4, O);
  maat(ctx, dx, T, dx, O, shape === 'chs' || shape === 'round' ? 'd' : 'd', dx + 10, cy);
  if (!['chs', 'round'].includes(shape)) {
    hulp(ctx, L, O + 2, L, by + 4); hulp(ctx, R, O + 2, R, by + 4);
    maat(ctx, L, by, R, by, 'b', cx, by + 11);
  }

  switch (shape) {
    case 'I':
    case 'channel': {
      const ftf = tf * k, ftw = tw * k;
      // Flange thickness: arrows and label clear of the section, on the left,
      // with extension lines from the flange faces.
      const fx = L - 12;
      hulp(ctx, L - 2, T, fx - 4, T); hulp(ctx, L - 2, T + ftf, fx - 4, T + ftf);
      dikte(ctx, fx, T, fx, T + ftf, false, 'tf', fx - 14, T + ftf / 2);
      // Web thickness at mid height.
      const wx = shape === 'I' ? cx - ftw / 2 : L;
      dikte(ctx, wx, cy, wx + ftw, cy, true, 'tw', wx + ftw + 22, cy - 9);
      // Root radius where the web meets the bottom flange, with a leader.
      if (num(it.r1)) {
        const rx = shape === 'I' ? cx + ftw / 2 : L + ftw, ry = O - ftf;
        ctx.beginPath(); ctx.moveTo(rx + 1, ry - 1); ctx.lineTo(rx + 16, ry - 16); ctx.stroke();
        ctx.fillText('r1', rx + 24, ry - 20);
      }
      break;
    }
    case 'angle':
    case 'rhs':
    case 'lipped-c':
    case 'lipped-z': {
      const ft = t * k;
      dikte(ctx, L, cy, L + ft, cy, true, 't', L + ft + 20, cy - 9);
      if ((shape === 'lipped-c' || shape === 'lipped-z') && num(it.lip)) {
        const lp = num(it.lip) * k;
        hulp(ctx, R + 2, T + lp, dx - 18, T + lp);
        maat(ctx, R - 12, T, R - 12, T + lp, 'lip', R - 30, T + lp / 2);
      }
      break;
    }
    case 'chs': {
      const ft = t * k;
      dikte(ctx, L, cy, L + ft, cy, true, 't', L + ft + 20, cy - 9);
      break;
    }
    default: break;   // sawn, glulam, LVL, flat, round: d and b only
  }
  return cv;
}

/**
 * Key for a bolt group seen face on: the plate with its holes, to scale, with
 * pitch (p, between rows), gauge (g, between columns) and the edge distances
 * across (ex) and along (ey) marked, each with its value in mm.
 */
export function maakBoutSchets(el) {
  const rows = Math.max(1, Math.round(num(el.rows) || 1)), cols = Math.max(1, Math.round(num(el.cols) || 1));
  const p = num(el.pitch), g = num(el.gauge), ex = num(el.edgeX), ey = num(el.edgeY);
  const pw = 2 * ex + (cols - 1) * g, ph = 2 * ey + (rows - 1) * p;
  if (!(pw > 0) || !(ph > 0)) return null;
  const dpr = window.devicePixelRatio || 1;
  const B2 = 260, H2 = 230, M = 52;
  const cv = document.createElement('canvas');
  cv.width = B2 * dpr; cv.height = H2 * dpr;
  cv.style.cssText = `width:${B2}px;height:${H2}px;background:#f1f2f4;border-radius:4px;display:block;margin:10px 14px;`;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const k = Math.min((B2 - 2 * M) / pw, (H2 - 2 * M) / ph);
  const L = (B2 - pw * k) / 2, T = (H2 - ph * k) / 2, R = L + pw * k, O = T + ph * k;
  // Plate and holes
  ctx.fillStyle = 'rgba(15,118,110,0.12)'; ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 1.4;
  ctx.fillRect(L, T, pw * k, ph * k); ctx.strokeRect(L, T, pw * k, ph * k);
  const dGat = Math.max(4, Math.min((num(el.bolt?.d) || 16) * k, 0.8 * Math.min(g || pw, p || ph) * k));
  const gatX = (c) => L + (ex + c * g) * k, gatY = (r) => T + (ey + r * p) * k;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    ctx.beginPath(); ctx.arc(gatX(c), gatY(r), dGat / 2, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gatX(c) - dGat * 0.7, gatY(r)); ctx.lineTo(gatX(c) + dGat * 0.7, gatY(r));
    ctx.moveTo(gatX(c), gatY(r) - dGat * 0.7); ctx.lineTo(gatX(c), gatY(r) + dGat * 0.7); ctx.lineWidth = 0.6; ctx.stroke(); ctx.lineWidth = 1.4;
  }
  ctx.strokeStyle = INKT; ctx.fillStyle = INKT; ctx.lineWidth = 1;
  ctx.font = '11px system-ui, Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const rond = (v) => String(Math.round(v * 10) / 10);
  // Along the bottom: edge across, gauge, edge across
  const by = O + 18;
  hulp(ctx, L, O + 2, L, by + 4); hulp(ctx, R, O + 2, R, by + 4);
  for (let c = 0; c < cols; c++) hulp(ctx, gatX(c), gatY(rows - 1) + dGat / 2 + 2, gatX(c), by + 4);
  maat(ctx, L, by, gatX(0), by, '', 0, 0); ctx.fillText(`ex ${rond(ex)}`, (L + gatX(0)) / 2, by + 13);
  if (cols > 1) { maat(ctx, gatX(0), by, gatX(1), by, '', 0, 0); ctx.fillText(`g ${rond(g)}`, (gatX(0) + gatX(1)) / 2, by + 13); }
  // Down the right: edge along, pitch
  const rx = R + 18;
  hulp(ctx, R + 2, T, rx + 4, T); hulp(ctx, R + 2, O, rx + 4, O);
  for (let r = 0; r < rows; r++) hulp(ctx, gatX(cols - 1) + dGat / 2 + 2, gatY(r), rx + 4, gatY(r));
  ctx.textAlign = 'left';
  maat(ctx, rx, T, rx, gatY(0), '', 0, 0); ctx.fillText(`ey ${rond(ey)}`, rx + 5, (T + gatY(0)) / 2);
  if (rows > 1) { maat(ctx, rx, gatY(0), rx, gatY(1), '', 0, 0); ctx.fillText(`p ${rond(p)}`, rx + 5, (gatY(0) + gatY(1)) / 2); }
  // Bolt name over the plate
  ctx.textAlign = 'center';
  ctx.fillText(`${rows * cols} × ${el.bolt?.name || 'bolt'}`, (L + R) / 2, T - 14);
  return cv;
}
