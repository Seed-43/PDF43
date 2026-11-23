// My details: name, initials, company, CPEng number and signature, kept on
// this computer only. Stamps fill their "From my details" and signature
// parameters from here when they are placed, so nobody types them twice and
// they never travel inside a shared stamp-family file.

const OPSLAG = 'seed43.profile';

export const PROFIEL_VELDEN = { name: 'Name', initials: 'Initials', company: 'Company', cpeng: 'CPEng no.', phone: 'Phone', email: 'Email' };

export function laadProfiel() {
  try {
    const v = JSON.parse(localStorage.getItem(OPSLAG) || 'null');
    if (v && typeof v === 'object') return v;
  } catch {}
  return {};
}

export function bewaarProfiel(p) {
  try { localStorage.setItem(OPSLAG, JSON.stringify(p)); } catch (e) { alert(`Could not save your details (${e.name}).`); }
}

/** Values from my details for a family's profile and signature parameters. */
export function profielWaarden(familie, profiel = laadProfiel()) {
  const uit = {};
  for (const v of familie.fields) {
    if (v.kind === 'profile') uit[v.key] = profiel[v.from] || '';
    else if (v.kind === 'signature') uit[v.key] = profiel.signature || '';
  }
  return uit;
}

/**
 * A picture with its white made transparent and cropped to the ink, as a
 * PNG data URL no larger than `max` pixels on its long side.
 */
export async function inktPlaatje(bron, { max = 1600, drempel = 235, bijsnijden = true } = {}) {
  const img = await new Promise((ok, fout) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => fout(new Error('That picture could not be read.'));
    i.src = typeof bron === 'string' ? bron : URL.createObjectURL(bron);
  });
  let w = img.naturalWidth, h = img.naturalHeight;
  const s = Math.min(1, max / Math.max(w, h));
  w = Math.round(w * s); h = Math.round(h * s);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const licht = Math.min(d[i], d[i + 1], d[i + 2]);
      if (d[i + 3] < 10 || licht >= drempel) { d[i + 3] = 0; continue; }
      // Soft edge: near-white ink fades out instead of leaving a halo.
      if (licht > drempel - 40) d[i + 3] = Math.round(d[i + 3] * (drempel - licht) / 40);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  ctx.putImageData(data, 0, 0);
  if (!bijsnijden || x1 < 0) return { url: c.toDataURL('image/png'), width: w, height: h };
  const uit = document.createElement('canvas');
  uit.width = x1 - x0 + 1; uit.height = y1 - y0 + 1;
  uit.getContext('2d').drawImage(c, x0, y0, uit.width, uit.height, 0, 0, uit.width, uit.height);
  return { url: uit.toDataURL('image/png'), width: uit.width, height: uit.height };
}
