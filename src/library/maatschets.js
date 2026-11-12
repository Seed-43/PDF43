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
