// Maker's drawings for fixings: outlines taken 1:1 from the MiTek NZ CAD
// files (Lumberlok and Bowmac), kept in data/mitek-cad.json. Each product has
// its views (Plan, Front, Side, 3D…) as lines in 0.1 mm, centred, y down.
// A fixing whose name matches a product is drawn from these lines instead of
// the simple outline; the simple outline stays the fallback.

let data = null;
let laden = null;

/** Load the drawings once; `klaar` runs when they arrive (to redraw). */
export function laadCad(api, klaar) {
  if (data || laden) return laden;
  laden = api.readAsset('data/mitek-cad.json')
    .then((buf) => { data = JSON.parse(new TextDecoder().decode(buf)).products || {}; klaar?.(); return data; })
    .catch((e) => { console.warn('[seed43] maker drawings not loaded:', e); data = {}; return data; });
  return laden;
}

/** The product key for a library item name: SS (stainless) and DG share the drawing. */
export function cadSleutel(naam) {
  let n = String(naam || '').toUpperCase().replace(/\s+/g, '');
  if (n === 'MULTIGRIP' || n === 'SSMULTIGRIP') return 'MG';
  if (n === 'MULTI-BRACE' || n === 'MULTIBRACE') return 'MB';
  n = n.replace(/^SS(?=JH|SPH|CPC)/, '');
  // JH47x90 -> JH4790; JH70x180 -> JH70; JH95x165 -> JH95
  const jh = /^JH(\d+)X(\d+)$/.exec(n);
  if (jh) n = ['70', '95'].includes(jh[1]) ? `JH${jh[1]}` : `JH${jh[1]}${jh[2]}`;
  if (data && !data[n] && data[n.replace(/DG$/, '')]) n = n.replace(/DG$/, '');
  return n;
}

/** The maker's drawing for an item, or null: { views: [{id, name, w, h, p}] }. */
export function cadVan(it) {
  if (!data || !it) return null;
  const views = data[it.cad || cadSleutel(it.name)];
  return views?.length ? views : null;
}

/** The library's section / elevation views mapped onto the drawing's views. */
const STANDAARD_VIEW = { section: ['front', 'front-left-hand'], elevation: ['side', 'side-left-hand'], plan: ['plan', 'plan-left-hand'] };

/** The drawing view for an item's `view` (a drawing view id, or section / elevation / plan). */
export function cadView(views, view) {
  if (!views) return null;
  return views.find((v) => v.id === view)
    || views.find((v) => (STANDAARD_VIEW[view] || []).includes(v.id))
    || views.find((v) => v.id === 'front') || views[0];
}

const mm = (p) => {
  const uit = [];
  for (let i = 0; i < p.length; i += 2) uit.push([p[i] / 10, p[i + 1] / 10]);
  return uit;
};

/** The strap angle allowed: -90 (south) to 90 (north). */
export const armHoek = (a) => Math.max(-90, Math.min(90, Math.round((Number(a) || 0) * 10) / 10));

/**
 * The view as lines in mm, centred: { w, h, paden: [[[x,y]...]...], anker }.
 * opties.turn: the angle of a part that turns (a pole brace strap) around
 * its pivot, degrees, 0 = east, 90 = north (the strap's direction toward the
 * pivot); opties.mirror: drawn mirrored, left for right. anker is where the
 * view's own centre went (mm), so turning can keep the fixed part still.
 */
export function cadVorm(v, lengte, opties = {}) {
  let paden = v.p.map(mm);
  if (v.stretch && lengte > 0 && Math.abs(lengte - v.h) > 0.5) paden = gerekt(v, paden, lengte).paden;
  const t = v.turn;
  if (t) {
    const [px, py] = [t.pivot[0] / 10, t.pivot[1] / 10];
    const d = ((opties.turn == null ? t.angle : armHoek(opties.turn)) - t.angle) * Math.PI / 180;
    const c = Math.cos(d), s = Math.sin(d);
    // Counter-clockwise on the sheet (y down).
    paden = paden.concat(t.p.map(mm).map((l) => l.map(([x, y]) => [px + (x - px) * c + (y - py) * s, py - (x - px) * s + (y - py) * c])));
  }
  if (opties.mirror) paden = paden.map((l) => l.map(([x, y]) => [-x, y]));
  if (!t && !opties.mirror) return { w: v.w, h: lengte > 0 && v.stretch ? lengte : v.h, paden, anker: [0, 0] };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of paden) for (const [x, y] of l) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  return { w: x1 - x0, h: y1 - y0, paden: paden.map((l) => l.map(([x, y]) => [x - mx, y - my])), anker: [-mx, -my] };
}

/**
 * A strap (Multi-Brace) at another length: its outline drawn to that length
 * and the pattern inside (holes) repeated along it, whole holes only.
 */
function gerekt(v, paden, L) {
  const hw = v.w / 2, hh = v.h / 2;
  const isRand = (p) => {
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
    return Math.max(...xs) - Math.min(...xs) > v.w * 0.9 || Math.max(...ys) - Math.min(...ys) > v.h * 0.5;
  };
  const binnen = paden.filter((p) => !isRand(p));
  const uit = [[[-hw, -L / 2], [hw, -L / 2], [hw, L / 2], [-hw, L / 2], [-hw, -L / 2]]];
  for (let k = 0; -L / 2 + k * v.h < L / 2; k++) {
    const dy = -L / 2 + hh + k * v.h;
    for (const p of binnen) {
      const q = p.map(([x, y]) => [x, y + dy]);
      if (q.every(([, y]) => y >= -L / 2 + 0.5 && y <= L / 2 - 0.5)) uit.push(q);
    }
  }
  return { w: v.w, h: L, paden: uit };
}

export const isCadGeladen = () => !!data;
