// Drawing a stamp. Coordinates are page points (the host scales the canvas).

const TITEL_H = 16;
const RIJ_H = 12;
const RAND = 5;

export function maat(familie) {
  const rijen = familie.fields.length;
  return { width: Math.max(80, familie.width || 180), height: TITEL_H + RAND + rijen * RIJ_H + RAND };
}

function datumTekst(v) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

/** The text a field shows on a stamp. */
export function waardeTekst(veld, stamp, ann, context) {
  if (veld.kind === 'auto') {
    if (veld.auto === 'page') return String(ann.page ?? '');
    if (veld.auto === 'file') return context?.fileName || '';
    if (veld.auto === 'placed') return datumTekst(stamp.placed);
    return '';
  }
  const v = stamp.values?.[veld.key] ?? '';
  return veld.kind === 'date' ? datumTekst(v) : String(v);
}

function rondeRechthoek(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function pas(ctx, tekst, max) {
  if (ctx.measureText(tekst).width <= max) return tekst;
  let t = tekst;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

export function teken(ctx, ann, context) {
  const stamp = ann.stamp;
  const familie = stamp?.family;
  if (!familie) return;
  const { width: w, height: h } = maat(familie);
  const x = ann.x, y = ann.y;
  const kleur = familie.color || '#c0392b';
  ctx.save();
  ctx.globalAlpha = ann.opacity ?? 1;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  rondeRechthoek(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = kleur;
  ctx.stroke();
  // Title bar
  ctx.fillStyle = kleur;
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(pas(ctx, familie.title || familie.name, w - 2 * RAND), x + w / 2, y + TITEL_H / 2 + 1);
  ctx.beginPath();
  ctx.moveTo(x + RAND, y + TITEL_H);
  ctx.lineTo(x + w - RAND, y + TITEL_H);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Parameters
  ctx.textAlign = 'left';
  const labelW = Math.min(w * 0.42, 80);
  familie.fields.forEach((veld, i) => {
    const ry = y + TITEL_H + RAND + i * RIJ_H + RIJ_H / 2;
    ctx.font = '7.5px Arial, sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText(pas(ctx, veld.label + ':', labelW - 3), x + RAND, ry);
    ctx.font = 'bold 8.5px Arial, sans-serif';
    ctx.fillStyle = kleur;
    ctx.fillText(pas(ctx, waardeTekst(veld, stamp, ann, context), w - labelW - 2 * RAND), x + RAND + labelW, ry);
  });
  ctx.restore();
}
