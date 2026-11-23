// Drawing a stamp. Coordinates are page points (the host scales the canvas).
//
// Layouts (family.layout):
//   table     title bar, optional lines, a row per parameter, an optional note
//   banner    big text in a border (status stamps), lines with {Parameter}
//   diagonal  big outlined text across the stamp (Superseded, Void)
//   placed    parameters in boxes at fixed places over a frame or a
//             background picture: drawing sheets, forms, stamps from a PDF
//
// A placed stamp can be scaled (ann.scale). Every layout draws only ink:
// nothing is filled white except the table/banner paper, so a sheet never
// hides the drawing under it.
import { revTekst } from './revs.js';

const TITEL_H = 16;
const RIJ_H = 12;
const RAND = 5;
const MAATEN = { l: 18, m: 11, s: 7.5 };

let meet = null;
function meetCtx() {
  if (!meet) meet = document.createElement('canvas').getContext('2d');
  return meet;
}

// ── values ─────────────────────────────────────────────────────────────

const MAANDEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const twee = (n) => String(n).padStart(2, '0');

export function datumTekst(v, fmt) {
  if (!v) return '';
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  if (Number.isNaN(d.getTime())) return String(v);
  if (fmt === 'd Mmm yyyy') return `${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`;
  if (fmt === 'yyyy-mm-dd') return `${d.getFullYear()}-${twee(d.getMonth() + 1)}-${twee(d.getDate())}`;
  return `${twee(d.getDate())}/${twee(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function tijdTekst(v) {
  const d = new Date(v || Date.now());
  return Number.isNaN(d.getTime()) ? '' : `${twee(d.getHours())}:${twee(d.getMinutes())}`;
}

/** The text a field shows on a stamp. */
export function waardeTekst(veld, stamp, ann, context) {
  const fmt = stamp.values?.format;
  if (veld.kind === 'auto') {
    switch (veld.auto) {
      case 'page': return String(ann.page ?? '');
      case 'pages': return String(context?.pages || '');
      case 'sheetOf': return context?.pages ? `${ann.page ?? ''} of ${context.pages}` : String(ann.page ?? '');
      case 'file': return context?.fileName || '';
      case 'placed': return datumTekst(stamp.placed, fmt);
      case 'time': return tijdTekst(stamp.placed);
      case 'today': return datumTekst(new Date().toISOString(), fmt);
      default: return '';
    }
  }
  if (veld.kind === 'signature') return '';
  // Revision rows show the newest revisions from the sheet's list.
  const rt = revTekst(veld, stamp);
  if (rt !== null) return veld.kind === 'date' ? datumTekst(rt, fmt) : rt;
  const v = stamp.values?.[veld.key] ?? '';
  // A date that was not set shows the date this stamp was placed.
  if (veld.kind === 'date') return datumTekst(v || (veld.blank ? '' : stamp.placed), fmt);
  return String(v);
}

/** Replace {key} or {Label} with the field's text. Null when every placeholder is empty. */
function vulIn(tekst, fam, stamp, ann, context) {
  let gevonden = 0, gevuld = 0;
  const uit = String(tekst).replace(/\{([^{}]+)\}/g, (_, naam) => {
    gevonden++;
    const v = fam.fields.find((f) => f.key === naam || f.label === naam);
    const t = v ? waardeTekst(v, stamp, ann, context) : '';
    if (t) gevuld++;
    return t;
  });
  return gevonden && !gevuld ? null : uit.replace(/\s{2,}/g, ' ').trim();
}

function zichtbaar(regel, stamp) {
  const w = regel.when;
  if (!w) return true;
  const v = stamp.values?.[w.key] ?? '';
  return Array.isArray(w.in) ? w.in.includes(v) : true;
}

/** Family colour, or the colour its colour-by parameter picks. */
export function kleurVan(fam, stamp) {
  const cb = fam.colorBy;
  if (cb?.key && cb.map) {
    const k = cb.map[stamp?.values?.[cb.key]];
    if (k) return k;
  }
  return fam.color || '#c0392b';
}

// ── pictures (backgrounds and signatures) ─────────────────────────────

const plaatjes = new Map();
let bijGeladen = null;
/** Called when a picture finishes loading, so the host can redraw. */
export function bijPlaatjeGeladen(fn) { bijGeladen = fn; }

function plaatje(src) {
  if (!src) return null;
  let p = plaatjes.get(src);
  if (!p) {
    p = new Image();
    p.onload = () => bijGeladen?.();
    p.src = src;
    plaatjes.set(src, p);
  }
  return p.complete && p.naturalWidth ? p : null;
}

// ── text helpers ──────────────────────────────────────────────────────

function pas(ctx, tekst, max) {
  if (ctx.measureText(tekst).width <= max) return tekst;
  let t = tekst;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

function breek(ctx, tekst, max) {
  const regels = [];
  for (const alinea of String(tekst).split('\n')) {
    let r = '';
    for (const w of alinea.split(/\s+/)) {
      const t = r ? `${r} ${w}` : w;
      if (ctx.measureText(t).width > max && r) { regels.push(r); r = w; } else r = t;
    }
    regels.push(r);
  }
  return regels;
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

const font = (pt, vet) => `${vet ? 'bold ' : ''}${pt}px Arial, sans-serif`;

// ── layouts ───────────────────────────────────────────────────────────
// Each returns { w, h, teken(ctx) } with the stamp's top-left at 0, 0.

function tabel(fam, stamp, ann, context) {
  const ctx = meetCtx();
  const w = Math.max(80, fam.width || 180);
  const kleur = kleurVan(fam, stamp);
  const labelW = Math.min(w * 0.42, 80);
  const binnen = w - 2 * RAND;
  const stappen = [];
  let y = TITEL_H + RAND;
  for (const r of fam.lines || []) {
    if (!zichtbaar(r, stamp)) continue;
    const t = vulIn(r.text, fam, stamp, ann, context);
    if (t == null || t === '') continue;
    const pt = MAATEN[r.size] || MAATEN.s;
    ctx.font = font(pt, r.bold);
    for (const regel of breek(ctx, t, binnen)) {
      const yy = y;
      stappen.push((c) => { c.font = font(pt, r.bold); c.fillStyle = kleur; c.textAlign = 'center'; c.fillText(regel, w / 2, yy + pt * 0.6); });
      y += pt * 1.25;
    }
  }
  for (const veld of fam.fields) {
    if (veld.hidden) continue;
    const yy = y;
    if (veld.kind === 'check') {
      ctx.font = font(7.5);
      stappen.push((c) => { c.font = font(7.5); c.fillStyle = '#555'; c.textAlign = 'left'; c.fillText(pas(c, veld.label, binnen), RAND, yy + RIJ_H / 2); });
      y += RIJ_H;
      const gekozen = stamp.values?.[veld.key] ?? '';
      for (const optie of veld.options || []) {
        ctx.font = font(7.5, optie === gekozen);
        const regels = breek(ctx, optie, binnen - 14);
        const oy = y;
        stappen.push((c) => {
          c.strokeStyle = kleur; c.lineWidth = 0.8;
          c.strokeRect(RAND + 1, oy + 2, 8, 8);
          if (optie === gekozen) {
            c.beginPath(); c.moveTo(RAND + 2.5, oy + 6); c.lineTo(RAND + 4.8, oy + 8.6); c.lineTo(RAND + 8.2, oy + 3.2);
            c.lineWidth = 1.4; c.stroke();
          }
          c.font = font(7.5, optie === gekozen); c.fillStyle = optie === gekozen ? kleur : '#555'; c.textAlign = 'left';
          regels.forEach((t, i) => c.fillText(t, RAND + 13, oy + 6 + i * 9));
        });
        y += Math.max(RIJ_H, regels.length * 9 + 3);
      }
      continue;
    }
    if (veld.kind === 'signature') {
      const src = stamp.values?.[veld.key];
      stappen.push((c) => {
        c.font = font(7.5); c.fillStyle = '#555'; c.textAlign = 'left'; c.fillText(pas(c, veld.label + ':', labelW - 3), RAND, yy + 13);
        const p = plaatje(src);
        if (p) {
          const h = 24, b = Math.min(binnen - labelW, (p.naturalWidth / p.naturalHeight) * h);
          c.drawImage(p, RAND + labelW, yy + 1, b, h);
        } else {
          c.strokeStyle = '#999'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(RAND + labelW, yy + 22); c.lineTo(w - RAND, yy + 22); c.stroke();
        }
      });
      y += 26;
      continue;
    }
    const tekst = waardeTekst(veld, stamp, ann, context);
    stappen.push((c) => {
      c.textAlign = 'left';
      c.font = font(7.5); c.fillStyle = '#555';
      c.fillText(pas(c, veld.label + ':', labelW - 3), RAND, yy + RIJ_H / 2);
      c.font = font(8.5, true); c.fillStyle = kleur;
      if (tekst) c.fillText(pas(c, tekst, binnen - labelW), RAND + labelW, yy + RIJ_H / 2);
      else { c.strokeStyle = '#bbb'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(RAND + labelW, yy + RIJ_H - 2); c.lineTo(w - RAND, yy + RIJ_H - 2); c.stroke(); }
    });
    y += RIJ_H;
  }
  if (fam.note) {
    ctx.font = font(6.2);
    const regels = breek(ctx, fam.note, binnen);
    const ny = y + 2;
    stappen.push((c) => { c.font = font(6.2); c.fillStyle = '#555'; c.textAlign = 'left'; regels.forEach((t, i) => c.fillText(t, RAND, ny + 4 + i * 7.6)); });
    y += 4 + regels.length * 7.6;
  }
  const h = y + RAND;
  return {
    w, h,
    teken(c) {
      c.fillStyle = 'rgba(255,255,255,0.85)';
      rondeRechthoek(c, 0, 0, w, h, 4); c.fill();
      c.lineWidth = 1.6; c.strokeStyle = kleur; c.stroke();
      c.fillStyle = kleur; c.font = font(10, true); c.textBaseline = 'middle'; c.textAlign = 'center';
      c.fillText(pas(c, fam.title || fam.name, w - 2 * RAND), w / 2, TITEL_H / 2 + 1);
      c.beginPath(); c.moveTo(RAND, TITEL_H); c.lineTo(w - RAND, TITEL_H); c.lineWidth = 0.8; c.stroke();
      for (const s of stappen) s(c);
    },
  };
}

function bannerRegels(fam, stamp, ann, context) {
  const bron = fam.lines?.length ? fam.lines : [{ text: fam.title || fam.name, size: 'l', bold: true }];
  const uit = [];
  for (const r of bron) {
    if (!zichtbaar(r, stamp)) continue;
    const t = vulIn(r.text, fam, stamp, ann, context);
    if (t == null || t === '') continue;
    uit.push({ t, pt: MAATEN[r.size] || MAATEN.s, vet: !!r.bold });
  }
  return uit;
}

function banner(fam, stamp, ann, context) {
  const ctx = meetCtx();
  const kleur = kleurVan(fam, stamp);
  const regels = bannerRegels(fam, stamp, ann, context);
  let breedste = 40;
  for (const r of regels) { ctx.font = font(r.pt, r.vet); breedste = Math.max(breedste, ctx.measureText(r.t).width); }
  const w = Math.max(fam.width && fam.width > 0 && !fam.autoWidth ? fam.width : 0, breedste + 20);
  const h = regels.reduce((s, r) => s + r.pt * 1.2, 0) + 12;
  return {
    w, h,
    teken(c) {
      c.fillStyle = 'rgba(255,255,255,0.8)';
      rondeRechthoek(c, 0, 0, w, h, 5); c.fill();
      c.strokeStyle = kleur; c.lineWidth = 2; c.stroke();
      rondeRechthoek(c, 3, 3, w - 6, h - 6, 3); c.lineWidth = 0.7; c.stroke();
      c.fillStyle = kleur; c.textAlign = 'center'; c.textBaseline = 'middle';
      let y = 6;
      for (const r of regels) { c.font = font(r.pt, r.vet); c.fillText(pas(c, r.t, w - 12), w / 2, y + r.pt * 0.62); y += r.pt * 1.2; }
    },
  };
}

function diagonaal(fam, stamp, ann, context) {
  const kleur = kleurVan(fam, stamp);
  const regels = bannerRegels(fam, stamp, ann, context);
  const w = Math.max(120, fam.width || 360), h = w * 0.55;
  return {
    w, h,
    teken(c) {
      const hoek = -Math.atan2(h, w);
      const lengte = Math.hypot(w, h) * 0.85;
      c.save();
      c.translate(w / 2, h / 2); c.rotate(hoek);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const groot = regels[0];
      let y = -((regels.length - 1) * 8);
      regels.forEach((r, i) => {
        let pt = i === 0 ? 60 : 12;
        c.font = font(pt, true);
        const m = c.measureText(r.t).width;
        if (m > lengte) { pt *= lengte / m; c.font = font(pt, true); }
        if (i === 0) {
          c.globalAlpha *= 0.55; c.lineWidth = 2; c.strokeStyle = kleur; c.strokeText(r.t, 0, y);
          c.globalAlpha /= 0.55; y += pt * 0.75;
        } else { c.fillStyle = kleur; c.fillText(r.t, 0, y); y += pt * 1.3; }
      });
      if (!groot) { c.font = font(40, true); c.strokeStyle = kleur; c.strokeText(fam.title || fam.name, 0, 0); }
      c.restore();
    },
  };
}

function geplaatst(fam, stamp, ann, context) {
  const w = fam.width || 595, h = fam.height || 842;
  const kleur = fam.ink || '#1f2328';
  return {
    w, h,
    teken(c) {
      const bg = plaatje(fam.background);
      if (bg) c.drawImage(bg, 0, 0, w, h);
      c.strokeStyle = kleur; c.fillStyle = kleur;
      // A smart border (smart.js) first, then the sheet's own frame lines and boxes.
      for (const p of [...(fam.smart || []), ...(fam.frame || [])]) {
        c.lineWidth = p.lw || 0.6;
        if (p.t === 'rect') c.strokeRect(p.x, p.y, p.w, p.h);
        else if (p.t === 'line') { c.beginPath(); c.moveTo(p.x1, p.y1); c.lineTo(p.x2, p.y2); c.stroke(); }
        else if (p.t === 'path') {
          // Smart border line work (smart.js): a polyline in its own weight and colour.
          c.save();
          if (p.c) c.strokeStyle = p.c;
          c.lineCap = 'round'; c.lineJoin = 'round';
          c.beginPath(); c.moveTo(p.p[0], p.p[1]);
          for (let i = 2; i < p.p.length; i += 2) c.lineTo(p.p[i], p.p[i + 1]);
          c.stroke(); c.restore();
        } else if (p.t === 'img') {
          const b = plaatje(p.src);
          if (b) c.drawImage(b, p.x, p.y, p.w, p.h);
        } else if (p.t === 'text' && (p.bl || p.r || p.w || p.c)) {
          // Text from a smart border: on its baseline, at its angle, squeezed to its width.
          c.save();
          c.translate(p.x, p.y);
          if (p.r) c.rotate(p.r);
          c.font = font(p.s || 5, p.b); c.textAlign = 'left'; c.textBaseline = p.bl ? 'alphabetic' : 'top';
          if (p.c) c.fillStyle = p.c;
          if (p.w) { const m = c.measureText(p.text).width; if (m > 0) c.scale(p.w / m, 1); }
          c.fillText(p.text, 0, 0);
          c.restore();
        } else if (p.t === 'text') {
          c.font = font(p.s || 5, p.b); c.textAlign = p.align || 'left'; c.textBaseline = 'top';
          c.fillText(p.text, p.x, p.y);
        }
      }
      for (const veld of fam.fields) {
        if (veld.hidden || veld.x == null) continue;
        const vx = veld.x, vy = veld.y, vw = veld.w || 60, vh = veld.h || 12;
        if (veld.kind === 'signature') {
          const p = plaatje(stamp.values?.[veld.key]);
          if (p) { const b = Math.min(vw, (p.naturalWidth / p.naturalHeight) * vh); c.drawImage(p, vx, vy, b, vh); }
          continue;
        }
        const tekst = waardeTekst(veld, stamp, ann, context);
        if (!tekst) continue;
        const pt = veld.size || Math.min(10, vh * 0.62);
        c.font = font(pt, veld.bold); c.fillStyle = veld.color || kleur; c.textBaseline = 'middle';
        c.textAlign = veld.align || 'left';
        const tx = veld.align === 'center' ? vx + vw / 2 : veld.align === 'right' ? vx + vw - 2 : vx + 2;
        if (veld.multi) {
          c.textBaseline = 'top';
          breek(c, tekst, vw - 4).slice(0, Math.max(1, Math.floor(vh / (pt * 1.2)))).forEach((t, i) => c.fillText(t, tx, vy + 1 + i * pt * 1.2));
        } else c.fillText(pas(c, tekst, vw - 4), tx, vy + vh / 2);
      }
    },
  };
}

export function opmaak(stamp, ann, context) {
  const fam = stamp?.family;
  if (!fam) return null;
  switch (fam.layout) {
    case 'banner': return banner(fam, stamp, ann, context);
    case 'diagonal': return diagonaal(fam, stamp, ann, context);
    case 'placed': return geplaatst(fam, stamp, ann, context);
    default: return tabel(fam, stamp, ann, context);
  }
}

const schaal = (ann) => (Number.isFinite(ann?.scale) && ann.scale > 0 ? ann.scale : 1);

/** Size of a stamp before scaling (for a new stamp of this family). */
export function maat(familie, ann = {}, context = {}) {
  const o = opmaak({ family: familie, values: ann.stamp?.values || {}, placed: new Date().toISOString() }, ann, context);
  return { width: o?.w || 100, height: o?.h || 40 };
}

/** Bounds on the page, scale included. */
export function grenzen(ann, context) {
  const o = opmaak(ann.stamp, ann, context);
  const s = schaal(ann);
  return o ? { x: ann.x, y: ann.y, width: o.w * s, height: o.h * s } : { x: ann.x, y: ann.y, width: ann.width || 0, height: ann.height || 0 };
}

/** Where a click selects the stamp: a sheet only by its title block. */
export function raakVlak(ann, context) {
  const fam = ann.stamp?.family;
  const b = grenzen(ann, context);
  if (fam?.hit) {
    const s = schaal(ann);
    return { x: ann.x + fam.hit.x * s, y: ann.y + fam.hit.y * s, width: fam.hit.w * s, height: fam.hit.h * s };
  }
  return b;
}

export function teken(ctx, ann, context) {
  const o = opmaak(ann.stamp, ann, context);
  if (!o) return;
  ctx.save();
  ctx.globalAlpha = ann.opacity ?? 1;
  ctx.translate(ann.x, ann.y);
  const s = schaal(ann);
  if (s !== 1) ctx.scale(s, s);
  ctx.textBaseline = 'middle';
  o.teken(ctx);
  ctx.restore();
}

