// Grips and snapping for Seed43 elements: a member's centre-line ends (A, B)
// and midpoint, a section's or bolt group's centre, and any point on a
// member's centre line. Ctrl or Shift keeps a direction horizontal or
// vertical; both together also allow 45 degrees.

import { sectieMaat, boutMaat, sectieVorm, lidGeometrie } from './draw.js';

export const SECTIE = 'seed43Section';
export const BOUTEN = 'seed43BoltGroup';
export const LID = 'seed43Member';
export const ONZE = [SECTIE, BOUTEN, LID];

export const GREEP_NAAM = { A: 'End A', B: 'End B', mid: 'Midpoint', centre: 'Centre', line: 'On centre line', kant: 'Midpoint of side', hoek: 'Corner', rand: 'Edge' };

/** Centre of a section or bolt group (x, y is the top-left of its bounds). */
export function midden(ann) {
  const m = (ann.type === SECTIE ? sectieMaat : boutMaat)(ann.element);
  return { x: ann.x + m.w / 2, y: ann.y + m.h / 2 };
}

/** The grips of an element: { x, y, soort, id }. */
export function grepen(ann) {
  if (!ann?.element) return [];
  if (ann.type === LID) {
    return [
      { x: ann.startX, y: ann.startY, soort: 'A', id: ann.id },
      { x: (ann.startX + ann.endX) / 2, y: (ann.startY + ann.endY) / 2, soort: 'mid', id: ann.id },
      { x: ann.endX, y: ann.endY, soort: 'B', id: ann.id },
    ];
  }
  if (ann.type === SECTIE || ann.type === BOUTEN) return [{ ...midden(ann), soort: 'centre', id: ann.id }];
  return [];
}

/**
 * Points to snap to that are not grips: a section's corners and the middle
 * of each side (top and bottom of a UB, the sides of an SHS), turned with the
 * section; a member's two edges at end A, the middle and end B.
 */
export function snapPunten(ann) {
  if (!ann?.element) return [];
  const el = ann.element;
  if (ann.type === SECTIE) {
    const v = sectieVorm(el.shape, el.item);
    const k = el.ptsPerMm || 1;
    const c = midden(ann);
    const hw = (v.w * k) / 2, hh = (v.h * k) / 2;
    const r = ((el.rotation || 0) * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r);
    const P = (x, y, soort) => ({ x: c.x + x * co - y * si, y: c.y + x * si + y * co, soort, id: ann.id });
    return [
      P(0, -hh, 'kant'), P(0, hh, 'kant'), P(-hw, 0, 'kant'), P(hw, 0, 'kant'),
      P(-hw, -hh, 'hoek'), P(hw, -hh, 'hoek'), P(hw, hh, 'hoek'), P(-hw, hh, 'hoek'),
    ];
  }
  if (ann.type === LID && el.shape !== 'bracing') {
    const g = lidGeometrie(ann);
    const hw = (g.p.breedte * g.k) / 2;
    if (!(hw > 0)) return [];
    const mx = (g.ax + g.bx) / 2, my = (g.ay + g.by) / 2;
    const uit = [];
    for (const [x, y] of [[g.ax, g.ay], [mx, my], [g.bx, g.by]]) {
      uit.push({ x: x + g.nx * hw, y: y + g.ny * hw, soort: 'rand', id: ann.id });
      uit.push({ x: x - g.nx * hw, y: y - g.ny * hw, soort: 'rand', id: ann.id });
    }
    return uit;
  }
  return [];
}

/** Nearest grip within radius (page points), else the nearest point on a
 *  member's centre line, else null. `uitsluit` = id to leave out. */
export function zoekSnap(api, page, x, y, radius, uitsluit) {
  let best = null, bestD = radius;
  const leden = [];
  for (const a of api.getAnnotations()) {
    if (a.page !== page || !ONZE.includes(a.type) || a.id === uitsluit || !a.element) continue;
    if (a.type === LID) leden.push(a);
    for (const g of [...grepen(a), ...snapPunten(a)]) {
      const d = Math.hypot(g.x - x, g.y - y);
      if (d <= bestD) { best = g; bestD = d; }
    }
  }
  if (best) return { ...best, tekst: GREEP_NAAM[best.soort] };
  bestD = radius * 0.7;
  for (const a of leden) {
    const dx = a.endX - a.startX, dy = a.endY - a.startY, L2 = dx * dx + dy * dy;
    if (!(L2 > 0)) continue;
    const t = Math.max(0, Math.min(1, ((x - a.startX) * dx + (y - a.startY) * dy) / L2));
    const px = a.startX + t * dx, py = a.startY + t * dy;
    const d = Math.hypot(px - x, py - y);
    if (d <= bestD) { best = { x: px, y: py, soort: 'line', id: a.id, tekst: GREEP_NAAM.line }; bestD = d; }
  }
  return best;
}

/** Keep the direction from (ax, ay) to (x, y) horizontal or vertical
 *  (stap 90), or at a multiple of 45 degrees (stap 45). */
export function haaks(ax, ay, x, y, stap = 90) {
  const L = Math.hypot(x - ax, y - ay);
  if (!(L > 0)) return { x, y };
  const r = (stap * Math.PI) / 180;
  const h = Math.round(Math.atan2(y - ay, x - ax) / r) * r;
  return { x: ax + L * Math.cos(h), y: ay + L * Math.sin(h) };
}

/** Angle step for the modifier keys: Ctrl or Shift = 90, both = 45, none = 0. */
export function haaksStap(e) {
  if (!e) return 0;
  const c = e.ctrlKey || e.metaKey, s = e.shiftKey;
  return c && s ? 45 : c || s ? 90 : 0;
}

/** End points A and B of a member from two clicks, for the grip it is placed by. */
export function lidPunten(greep, p1, p2) {
  if (greep === 'B') return { a: p2, b: p1 };
  if (greep === 'mid') return { a: { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y }, b: p2 };
  return { a: p1, b: p2 };
}
