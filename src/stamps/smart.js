// Smart border: turn a page of a PDF (a company's blank title-block sheet)
// into a sheet that draws as vectors, keeping only real pictures as images.
//
//   1. The app gives the page's line work (edges, curves already in short
//      pieces) and its text (with position, size, angle and width).
//   2. The page is rendered in tiles at about 290 dpi. For every edge the
//      pixels tell how thick and what colour the line is; an edge with no ink
//      under it is only the outline of a filled shape and is left out.
//   3. Lines and text are drawn again on the same tiles; ink that is still not
//      covered is a picture (logo, photo, solid fill). Only those areas are
//      cut out, as print-quality images with white made see-through.
//
// The result is a frame of primitives for a 'placed' sheet family:
//   { t: 'path', p: [x, y, x, y…], lw, c? }       a line or polyline
//   { t: 'text', x, y, s, text, b?, r?, w?, c?, bl: true }   text on its baseline
//   { t: 'img', x, y, w, h, src }                  a picture

import { inktPlaatje } from './profile.js';

const R = 4;                 // pixels per point while measuring (≈ 290 dpi)
const TEGEL = 500;           // tile size in points (2000 px at R)
const INKT = 200;            // darker than this is ink
const CEL = 2;               // residual grid in points
const BEELD_DPI = 300;

const sleutel = (x, y) => `${Math.round(x * 20)},${Math.round(y * 20)}`;

async function pixels(blob, w, h) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0);
  return ctx.getImageData(0, 0, w, h).data;
}

const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** Text item -> its corners on the page (for covering) and a text primitive. */
function tekstVan(item) {
  const [a, b, c, d, e, f] = item.transform;
  const s = Math.hypot(c, d) || item.height || 8;
  const hoek = Math.atan2(b, a);
  const w = item.width || 0;
  if (!item.text?.trim() || s < 1) return null;
  return { prim: { t: 'text', x: e, y: f, s: +s.toFixed(2), text: item.text, bl: true, ...(Math.abs(hoek) > 0.01 ? { r: +hoek.toFixed(4) } : {}), ...(w > 0 ? { w: +w.toFixed(2) } : {}), ...(/bold|black|heavy/i.test(item.fontName || '') ? { b: true } : {}) }, hoek, s, w };
}

/** Join edges of the same weight and colour that meet into polylines. */
function samenvoegen(lijnen) {
  const groepen = new Map();
  for (const l of lijnen) {
    const k = `${l.lw}|${l.c || ''}`;
    if (!groepen.has(k)) groepen.set(k, []);
    groepen.get(k).push(l);
  }
  const uit = [];
  for (const groep of groepen.values()) {
    const bij = new Map();
    const voeg = (k, i) => { if (!bij.has(k)) bij.set(k, []); bij.get(k).push(i); };
    groep.forEach((l, i) => { voeg(sleutel(l.x1, l.y1), i); voeg(sleutel(l.x2, l.y2), i); });
    const gebruikt = new Set();
    const volgende = (x, y) => (bij.get(sleutel(x, y)) || []).find((j) => !gebruikt.has(j));
    for (let i = 0; i < groep.length; i++) {
      if (gebruikt.has(i)) continue;
      gebruikt.add(i);
      const l = groep[i];
      const pts = [[l.x1, l.y1], [l.x2, l.y2]];
      for (let kant = 0; kant < 2; kant++) {
        for (;;) {
          const [x, y] = kant ? pts[0] : pts[pts.length - 1];
          const j = volgende(x, y);
          if (j === undefined) break;
          gebruikt.add(j);
          const m = groep[j];
          const ander = sleutel(m.x1, m.y1) === sleutel(x, y) ? [m.x2, m.y2] : [m.x1, m.y1];
          if (kant) pts.unshift(ander); else pts.push(ander);
        }
      }
      const p = [];
      for (const [x, y] of pts) p.push(+x.toFixed(2), +y.toFixed(2));
      uit.push({ t: 'path', p, lw: l.lw, ...(l.c ? { c: l.c } : {}) });
    }
  }
  return uit;
}

/**
 * Build a smart border from page `page` of the open PDF.
 * `voortgang(tekst)` reports progress. Returns { width, height, frame, stats }.
 */
export async function slimmeRand(api, page, voortgang = () => {}) {
  const info = await api.getPageInfo(page);
  if (!info?.width) throw new Error('Open the blank border PDF first, on the page you want.');
  const PW = info.width, PH = info.height;
  voortgang('Reading the line work and text…');
  const inhoud = await api.readPageContent(page);
  const edges = (inhoud.edges || []).filter((e) => Math.hypot(e.x2 - e.x1, e.y2 - e.y1) > 0.3);
  const teksten = (inhoud.text || []).map(tekstVan).filter(Boolean);

  const lijnen = [];                     // measured, stroked edges
  const metEdge = new Array(edges.length).fill(null);
  const gx = Math.ceil(PW / CEL), gy = Math.ceil(PH / CEL);
  const rest = new Uint32Array(gx * gy); // uncovered ink per cell

  const tx = Math.ceil(PW / TEGEL), ty = Math.ceil(PH / TEGEL);
  let n = 0;
  for (let j = 0; j < ty; j++) {
    for (let i = 0; i < tx; i++) {
      n++;
      voortgang(`Measuring lines: part ${n} of ${tx * ty}…`);
      const x0 = i * TEGEL, y0 = j * TEGEL;
      const w = Math.min(TEGEL, PW - x0), h = Math.min(TEGEL, PH - y0);
      if (w <= 0.5 || h <= 0.5) continue;
      const tegel = await api.renderPageTile(page, { x: x0, y: y0, width: w, height: h }, { scale: R });
      const W = tegel.width, H = tegel.height;
      const px = await pixels(tegel.blob, W, H);
      const inkt = (X, Y) => {
        if (X < 0 || Y < 0 || X >= W || Y >= H) return false;
        const k = (Y * W + X) * 4;
        return Math.min(px[k], px[k + 1], px[k + 2]) < INKT;
      };
      // Thickness and colour of the edges whose middle is in this tile.
      edges.forEach((e, idx) => {
        if (metEdge[idx]) return;
        const mx = (e.x1 + e.x2) / 2, my = (e.y1 + e.y2) / 2;
        if (mx < x0 || mx >= x0 + w || my < y0 || my >= y0 + h) return;
        const L = Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
        const nx = -(e.y2 - e.y1) / L, ny = (e.x2 - e.x1) / L;
        const dikten = [];
        let kleur = null;
        for (const t of [0.3, 0.5, 0.7]) {
          const cx = (e.x1 + (e.x2 - e.x1) * t - x0) * R, cy = (e.y1 + (e.y2 - e.y1) * t - y0) * R;
          let start = null;
          for (const d of [0, 1, -1, 2, -2]) if (inkt(Math.round(cx + nx * d), Math.round(cy + ny * d))) { start = d; break; }
          if (start === null) continue;
          let a = 0, b = 0;
          while (a < 40 && inkt(Math.round(cx + nx * (start + a + 1)), Math.round(cy + ny * (start + a + 1)))) a++;
          while (b < 40 && inkt(Math.round(cx + nx * (start - b - 1)), Math.round(cy + ny * (start - b - 1)))) b++;
          if (a + b >= 40) continue;   // inside a filled area: not a stroke
          dikten.push((a + b + 0.5) / R);   // less the soft edge the renderer adds
          if (!kleur) {
            const k = (Math.round(cy + ny * start) * W + Math.round(cx + nx * start)) * 4;
            kleur = [px[k], px[k + 1], px[k + 2]];
          }
        }
        if (dikten.length < 2) { metEdge[idx] = { geen: true }; return; }   // a fill's outline
        dikten.sort((p, q) => p - q);
        const lw = Math.max(0.13, Math.round(dikten[Math.floor(dikten.length / 2)] * 20) / 20);
        const [r, g, b] = kleur;
        const grijs = Math.max(r, g, b) - Math.min(r, g, b) < 40 && Math.max(r, g, b) < 110;
        metEdge[idx] = { ...e, lw, ...(grijs ? {} : { c: hex(r, g, b) }) };
        lijnen.push(metEdge[idx]);
      });
      // What lines and text cover in this tile; the rest of the ink is a picture.
      const dek = document.createElement('canvas');
      dek.width = W; dek.height = H;
      const dc = dek.getContext('2d', { willReadFrequently: true });
      dc.setTransform(R, 0, 0, R, -x0 * R, -y0 * R);
      dc.strokeStyle = '#000'; dc.lineCap = 'round';
      for (const l of lijnen) {
        if (Math.max(l.x1, l.x2) < x0 - 5 || Math.min(l.x1, l.x2) > x0 + w + 5 || Math.max(l.y1, l.y2) < y0 - 5 || Math.min(l.y1, l.y2) > y0 + h + 5) continue;
        dc.lineWidth = l.lw + 2 / R;
        dc.beginPath(); dc.moveTo(l.x1, l.y1); dc.lineTo(l.x2, l.y2); dc.stroke();
      }
      dc.fillStyle = '#000';
      for (const t of teksten) {
        const { x, y } = t.prim;
        if (x > x0 + w + 50 || x < x0 - 400 || y > y0 + h + 50 || y < y0 - 50) continue;
        dc.save(); dc.translate(x, y); dc.rotate(t.hoek);
        dc.fillRect(-1, -t.s * 1.05, (t.w || t.s * t.prim.text.length * 0.6) + 2, t.s * 1.35);
        dc.restore();
      }
      const gedekt = dc.getImageData(0, 0, W, H).data;
      for (let Y = 0; Y < H; Y++) {
        for (let X = 0; X < W; X++) {
          const k = (Y * W + X) * 4;
          if (Math.min(px[k], px[k + 1], px[k + 2]) >= INKT || gedekt[k + 3] > 0) continue;
          const cx = Math.floor((x0 + X / R) / CEL), cy = Math.floor((y0 + Y / R) / CEL);
          if (cx < gx && cy < gy) rest[cy * gx + cx]++;
        }
      }
    }
  }

  // Pictures: clusters of cells with real uncovered ink.
  voortgang('Finding pictures…');
  const vol = CEL * CEL * R * R;
  const aan = (c) => rest[c] > vol * 0.06;
  const gezien = new Uint8Array(gx * gy);
  const dozen = [];
  for (let c = 0; c < gx * gy; c++) {
    if (gezien[c] || !aan(c)) continue;
    let x0 = gx, y0 = gy, x1 = -1, y1 = -1, som = 0, cellen = 0;
    const stapel = [c]; gezien[c] = 1;
    while (stapel.length) {
      const k = stapel.pop(); const X = k % gx, Y = (k / gx) | 0;
      x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y); som += rest[k]; cellen++;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = X + dx, ny = Y + dy;
          if (nx < 0 || ny < 0 || nx >= gx || ny >= gy) continue;
          const m = ny * gx + nx;
          if (!gezien[m] && aan(m)) { gezien[m] = 1; stapel.push(m); }
        }
      }
    }
    // Specks (a font that is wider here, an anti-aliased edge) are not pictures.
    if (cellen < 4 || som < vol * 1.5) continue;
    dozen.push({ x: Math.max(0, x0 * CEL - 1), y: Math.max(0, y0 * CEL - 1), w: (x1 - x0 + 1) * CEL + 2, h: (y1 - y0 + 1) * CEL + 2 });
  }
  const beelden = [];
  let b = 0;
  for (const d of dozen.slice(0, 40)) {
    b++;
    voortgang(`Cutting out pictures: ${b} of ${Math.min(dozen.length, 40)}…`);
    const w = Math.min(d.w, PW - d.x), h = Math.min(d.h, PH - d.y);
    const s = Math.min(BEELD_DPI / 72, 2040 / w, 2040 / h, Math.sqrt(3.9e6 / (w * h)));
    const tegel = await api.renderPageTile(page, { x: d.x, y: d.y, width: w, height: h }, { scale: s });
    const ink = await inktPlaatje(tegel.blob, { max: 2048, bijsnijden: false });
    beelden.push({ t: 'img', x: +d.x.toFixed(2), y: +d.y.toFixed(2), w: +w.toFixed(2), h: +h.toFixed(2), src: ink.url });
  }

  const paden = samenvoegen(lijnen);
  const frame = [...beelden, ...paden, ...teksten.map((t) => t.prim)];
  return {
    width: Math.round(PW * 100) / 100, height: Math.round(PH * 100) / 100, frame,
    stats: { lines: lijnen.length, paths: paden.length, texts: teksten.length, pictures: beelden.length, fillOutlines: metEdge.filter((m) => m?.geen).length },
  };
}
