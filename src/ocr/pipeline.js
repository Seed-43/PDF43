// PDF43 OCR pipeline: PP-OCR (detection, line direction, recognition) on raw
// RGBA pixels. Pure JavaScript, so the same code runs in the add-on
// (onnxruntime-web) and in the Node test harness (onnxruntime-node).
//
// Every text line is detected on its own and turned upright before it is
// read, so a drawing with horizontal and vertical text reads in one pass.

const DET_MEAN = [0.485, 0.456, 0.406];
const DET_STD = [0.229, 0.224, 0.225];
const REC_H = 48;
const REC_MAX_W = 1600;

/** { width, height, data: Uint8ClampedArray RGBA } */
export function bild(width, height, data) {
  return { width, height, data: data || new Uint8ClampedArray(width * height * 4) };
}

/** Bilinear resize. */
export function schaal(img, nw, nh) {
  const { width: w, height: h, data: s } = img;
  const out = bild(nw, nh);
  const d = out.data;
  const fx = w / nw, fy = h / nh;
  for (let y = 0; y < nh; y++) {
    const sy = Math.max(0, (y + 0.5) * fy - 0.5);
    const y0 = Math.min(h - 1, Math.floor(sy)), y1 = Math.min(h - 1, y0 + 1), wy = sy - y0;
    for (let x = 0; x < nw; x++) {
      const sx = Math.max(0, (x + 0.5) * fx - 0.5);
      const x0 = Math.min(w - 1, Math.floor(sx)), x1 = Math.min(w - 1, x0 + 1), wx = sx - x0;
      const o = (y * nw + x) * 4;
      const a = (y0 * w + x0) * 4, b = (y0 * w + x1) * 4, c = (y1 * w + x0) * 4, e = (y1 * w + x1) * 4;
      for (let k = 0; k < 3; k++) {
        const top = s[a + k] + (s[b + k] - s[a + k]) * wx;
        const bot = s[c + k] + (s[e + k] - s[c + k]) * wx;
        d[o + k] = top + (bot - top) * wy;
      }
      d[o + 3] = 255;
    }
  }
  return out;
}

export function knip(img, x0, y0, x1, y1) {
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(img.width, Math.ceil(x1)); y1 = Math.min(img.height, Math.ceil(y1));
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  const out = bild(w, h);
  for (let y = 0; y < h; y++) {
    const src = ((y0 + y) * img.width + x0) * 4;
    out.data.set(img.data.subarray(src, src + w * 4), y * w * 4);
  }
  return out;
}

/** Turn 90 degrees clockwise. */
export function draaiRechtsom(img) {
  const { width: w, height: h, data: s } = img;
  const out = bild(h, w);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (x * h + (h - 1 - y)) * 4, i = (y * w + x) * 4;
    out.data[o] = s[i]; out.data[o + 1] = s[i + 1]; out.data[o + 2] = s[i + 2]; out.data[o + 3] = 255;
  }
  return out;
}

export function draai180(img) {
  const { width: w, height: h, data: s } = img;
  const out = bild(w, h);
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const o = (n - 1 - i) * 4;
    out.data[o] = s[i * 4]; out.data[o + 1] = s[i * 4 + 1]; out.data[o + 2] = s[i * 4 + 2]; out.data[o + 3] = 255;
  }
  return out;
}

function naarTensor(img, mean, std) {
  const { width: w, height: h, data } = img;
  const n = w * h;
  const t = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) t[k * n + i] = (data[i * 4 + k] / 255 - mean[k]) / std[k];
  }
  return t;
}

/** Text line boxes in image pixels: [{ x0, y0, x1, y1, score }]. */
export async function detecteer(ort, sessie, img, { maxZijde = 3200, drempel = 0.3, vakDrempel = 0.5 } = {}) {
  const s = Math.min(1, maxZijde / Math.max(img.width, img.height));
  const nw = Math.max(32, Math.round(img.width * s / 32) * 32);
  const nh = Math.max(32, Math.round(img.height * s / 32) * 32);
  const klein = schaal(img, nw, nh);
  const invoer = new ort.Tensor('float32', naarTensor(klein, DET_MEAN, DET_STD), [1, 3, nh, nw]);
  const uit = await sessie.run({ [sessie.inputNames[0]]: invoer });
  const prob = uit[sessie.outputNames[0]].data; // [1,1,nh,nw]

  // Connected components (4-neighbour, union-find) of prob > drempel.
  const n = nw * nh;
  const ouder = new Int32Array(n).fill(-1);
  const vind = (i) => { while (ouder[i] !== i) { ouder[i] = ouder[ouder[i]]; i = ouder[i]; } return i; };
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const i = y * nw + x;
    if (prob[i] <= drempel) continue;
    ouder[i] = i;
    if (x > 0 && ouder[i - 1] !== -1) ouder[vind(i)] = vind(i - 1);
    if (y > 0 && ouder[i - nw] !== -1) { const a = vind(i), b = vind(i - nw); if (a !== b) ouder[a] = b; }
  }
  const delen = new Map();
  for (let i = 0; i < n; i++) {
    if (ouder[i] === -1) continue;
    const r = vind(i), x = i % nw, y = (i - x) / nw;
    let d = delen.get(r);
    if (!d) delen.set(r, d = { x0: x, y0: y, x1: x, y1: y, som: 0, n: 0 });
    if (x < d.x0) d.x0 = x; if (x > d.x1) d.x1 = x;
    if (y < d.y0) d.y0 = y; if (y > d.y1) d.y1 = y;
    d.som += prob[i]; d.n++;
  }
  const fx = img.width / nw, fy = img.height / nh;
  const vakken = [];
  for (const d of delen.values()) {
    const bw = d.x1 - d.x0 + 1, bh = d.y1 - d.y0 + 1;
    if (bw < 3 || bh < 3) continue;
    const score = d.som / d.n;
    if (score < vakDrempel) continue;
    // DB shrinks text regions: grow by a share of the short side.
    const g = 0.75 * Math.min(bw, bh);
    vakken.push({
      x0: Math.max(0, (d.x0 - g) * fx), y0: Math.max(0, (d.y0 - g) * fy),
      x1: Math.min(img.width, (d.x1 + 1 + g) * fx), y1: Math.min(img.height, (d.y1 + 1 + g) * fy),
      score,
    });
  }
  return vakken;
}

/** Is this (upright) line upside down? */
async function ondersteBoven(ort, sessie, img) {
  const klein = schaal(img, 192, 48);
  const t = new ort.Tensor('float32', naarTensor(klein, [0.5, 0.5, 0.5], [0.5, 0.5, 0.5]), [1, 3, 48, 192]);
  const p = (await sessie.run({ [sessie.inputNames[0]]: t }))[sessie.outputNames[0]].data;
  return p[1] > p[0] && p[1] > 0.9;
}

/** Read one upright line: { text, confidence (0-1), tekens: [{ c, f }] }, f =
 *  position of the character along the line, 0..1. */
async function lees(ort, sessie, img, tekens) {
  const nw = Math.max(8, Math.min(REC_MAX_W, Math.round(img.width * REC_H / img.height)));
  const klein = schaal(img, nw, REC_H);
  const t = new ort.Tensor('float32', naarTensor(klein, [0.5, 0.5, 0.5], [0.5, 0.5, 0.5]), [1, 3, REC_H, nw]);
  const uit = (await sessie.run({ [sessie.inputNames[0]]: t }))[sessie.outputNames[0]];
  const [, stappen, klassen] = uit.dims;
  const d = uit.data;
  const lijst = [];
  let vorige = -1;
  for (let s = 0; s < stappen; s++) {
    let best = 0, p = -Infinity;
    for (let k = 0; k < klassen; k++) { const v = d[s * klassen + k]; if (v > p) { p = v; best = k; } }
    if (best !== vorige && best !== 0 && best < tekens.length) lijst.push({ c: tekens[best], p, f: (s + 0.5) / stappen });
    vorige = best;
  }
  const text = lijst.map(x => x.c).join('');
  const confidence = lijst.length ? lijst.reduce((a, x) => a + x.p, 0) / lijst.length : 0;
  return { text, confidence, tekens: lijst };
}

/** Split a read line into words with their span along the line (0..1). */
function woordenVanRegel(regel) {
  const uit = [];
  let huidig = null;
  const n = regel.tekens.length;
  regel.tekens.forEach((t, i) => {
    if (t.c === ' ') { if (huidig) { uit.push(huidig); huidig = null; } return; }
    const halve = 0.5 / Math.max(1, n * 1.5);
    if (!huidig) huidig = { text: '', f0: Math.max(0, t.f - halve), f1: t.f, som: 0, n: 0 };
    huidig.text += t.c; huidig.f1 = Math.min(1, t.f + halve); huidig.som += t.p; huidig.n++;
  });
  if (huidig) uit.push(huidig);
  return uit.map(w => ({ text: w.text, f0: w.f0, f1: w.f1, confidence: w.som / w.n }));
}

/**
 * OCR an image. Returns words in image pixels:
 * [{ text, left, top, width, height, confidence (0-100) }].
 * @param {object} ort onnxruntime (web or node)
 * @param {{ det, cls, rec }} sessies
 * @param {string[]} tekens CTC alphabet: ['', ...dict, ' ']
 */
export async function herken(ort, sessies, tekens, img, { minConfidence = 0.5, voortgang } = {}) {
  const vakken = await detecteer(ort, sessies.det, img);
  const woorden = [];
  let i = 0;
  for (const v of vakken) {
    voortgang?.(++i, vakken.length);
    let regel = knip(img, v.x0, v.y0, v.x1, v.y1);
    const staand = regel.height > 1.5 * regel.width;
    if (staand) regel = draaiRechtsom(regel);       // vertical: turn upright
    const om = await ondersteBoven(ort, sessies.cls, regel);
    if (om) regel = draai180(regel);
    const gelezen = await lees(ort, sessies.rec, regel, tekens);
    if (!gelezen.text.trim() || gelezen.confidence < minConfidence) continue;
    for (const w of woordenVanRegel(gelezen)) {
      // Position along the reading direction back to image pixels.
      const bw = v.x1 - v.x0, bh = v.y1 - v.y0;
      let left, top, width, height;
      if (!staand) {
        const a = om ? 1 - w.f1 : w.f0, b = om ? 1 - w.f0 : w.f1;
        left = v.x0 + a * bw; width = (b - a) * bw; top = v.y0; height = bh;
      } else {
        // Turned clockwise to read: the line ran bottom to top (or, upside
        // down, top to bottom).
        const a = om ? w.f0 : 1 - w.f1, b = om ? w.f1 : 1 - w.f0;
        top = v.y0 + a * bh; height = (b - a) * bh; left = v.x0; width = bw;
      }
      woorden.push({ text: w.text, left, top, width, height, confidence: Math.round(w.confidence * 100) });
    }
  }
  return woorden;
}

/** The CTC alphabet from the dictionary file text. */
export function alfabet(dictTekst) {
  const regels = dictTekst.split(/\r?\n/);
  if (regels.length && regels[regels.length - 1] === '') regels.pop();
  return ['', ...regels, ' '];
}
