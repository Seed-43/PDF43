// Edit a sheet, memo or placed stamp right on the drawing, the way Revit lets
// you click a label in a title block: double-click a box (Project, Drawing
// title, Rev…) and a field opens over it. Enter or clicking away keeps it,
// Esc drops it. The Properties panel edits the same values.
//
// The host gives page points only to tool callbacks, so the pointer is mapped
// to the page with the library's overlay mapping (zoom and canvas offset).

import { startOverlay, naarPagina } from '../library/overlay.js';
import { AUTO } from './families.js';
import { revVeld, revIndex, revLijst } from './revs.js';

let uit = null;   // stop function of the running listeners

const STIJL = 'position:fixed;z-index:3000;box-sizing:border-box;font-family:Arial,sans-serif;'
  + 'border:2px solid #0078d7;border-radius:3px;background:#fffef2;color:#1f2328;padding:2px 4px;outline:none;'
  + 'box-shadow:0 2px 10px rgba(0,0,0,.25);';

/** Can the pointer edit on the sheet with this tool? Not while a drawing tool is on. */
function magNu(api) {
  const t = api.getCurrentTool?.();
  return !t || t === 'select' || /hand|pan/i.test(t);
}

/** The field of a placed stamp under a page point, smallest box first. */
function veldOnder(api, type, p) {
  let best = null;
  for (const ann of api.getAnnotations?.() || []) {
    if (ann.type !== type || ann.page !== p.page || ann.stamp?.family?.layout !== 'placed') continue;
    const s = Number.isFinite(ann.scale) && ann.scale > 0 ? ann.scale : 1;
    const lx = (p.x - ann.x) / s, ly = (p.y - ann.y) / s;
    for (const veld of ann.stamp.family.fields || []) {
      if (veld.hidden || veld.x == null) continue;
      const w = veld.w || 60, h = veld.h || 12;
      // The whole box counts, its small label strip above the value included.
      const binnen = lx >= veld.x && lx <= veld.x + w && ly >= veld.y && ly <= veld.y + h;
      const inCel = lx >= veld.x - 1.5 && lx <= veld.x + w + 1.5 && ly >= veld.y - 7.5 && ly <= veld.y + h + 1.5;
      if (!inCel) continue;
      // Normal stamps sit on top of sheets: they win over a sheet's box. A hit
      // on the value itself wins over one on a neighbour's edge.
      const vlak = w * h * (ann.seed43Sheet ? 1e6 : 1) * (binnen ? 1 : 1e3);
      if (!best || vlak < best.vlak) best = { ann, veld, s, lx, ly, vlak };
    }
  }
  return best;
}

/** Screen rectangle of the field (CSS px). */
function schermVak(e, p, hit) {
  const k = hit.s * p.s;
  return {
    left: e.clientX - (hit.lx - hit.veld.x) * k,
    top: e.clientY - (hit.ly - hit.veld.y) * k,
    width: (hit.veld.w || 60) * k,
    height: (hit.veld.h || 12) * k,
    k,
  };
}

function melding(tekst, x, y) {
  const d = document.createElement('div');
  d.textContent = tekst;
  d.style.cssText = `position:fixed;left:${x + 12}px;top:${y + 12}px;z-index:3000;font:12px Arial,sans-serif;`
    + 'background:#1f2328;color:#fff;padding:5px 8px;border-radius:4px;pointer-events:none;';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1800);
}

/**
 * Start in-place editing. `zet(ann, veld, waarde)` saves a value (shared or
 * per stamp); `profiel()` gives My details (for the signature).
 */
export function startInPlaats(api, { type, zet, profiel }) {
  stopInPlaats();
  startOverlay(api);
  let open = null;   // the open editor
  let rand = null;   // hover outline

  const sluit = (bewaar) => {
    if (!open) return;
    const o = open; open = null;
    if (bewaar && o.el.value !== o.oud) Promise.resolve(zet(o.ann, o.veld, o.el.value)).catch((err) => console.warn('[seed43 stamps]', err));
    o.el.remove();
  };

  const opener = (e, p, hit) => {
    const { ann, veld } = hit;
    if (ann.locked) { melding('Locked: unlock it in Properties to change it.', e.clientX, e.clientY); return; }
    if (veld.kind === 'auto') { melding(`${veld.label}: ${AUTO[veld.auto] || 'automatic'}, filled in by itself.`, e.clientX, e.clientY); return; }
    let oud = ann.stamp?.values?.[veld.key] ?? '';
    const rv = revVeld(veld.key);
    if (rv) {
      // Revision rows: only the newest can be changed, or a new one started on the next empty row.
      const lijst = revLijst(ann.stamp), k = revIndex(ann.stamp, rv.rij);
      if (k < lijst.length - 1) { melding('An older revision: only the newest can be changed.', e.clientX, e.clientY); return; }
      if (k > lijst.length) { melding('Fill in the revisions in order: use the next empty row.', e.clientX, e.clientY); return; }
      oud = lijst[k]?.[rv.kol] ?? '';
    }
    if (veld.kind === 'signature') {
      if (oud) { if (confirm(`Remove the signature from ${veld.label}?`)) zet(ann, veld, ''); return; }
      const sig = profiel().signature;
      if (!sig) { melding('No signature saved yet: add one in Stamp Builder › My details.', e.clientX, e.clientY); return; }
      zet(ann, veld, sig);
      return;
    }
    const r = schermVak(e, p, hit);
    const pt = Math.max(12, Math.min(26, (veld.size || Math.min(10, (veld.h || 12) * 0.62)) * r.k));
    let el;
    if (veld.kind === 'choice' || veld.kind === 'check') {
      el = document.createElement('select');
      const opties = veld.kind === 'check' ? ['', ...(veld.options || [])] : [...(veld.options || [])];
      if (oud && !opties.includes(oud)) opties.unshift(oud);
      for (const o of opties) {
        const opt = document.createElement('option');
        opt.value = o; opt.textContent = o || '(none ticked)';
        el.appendChild(opt);
      }
      el.addEventListener('change', () => sluit(true));
    } else if (veld.multi) {
      el = document.createElement('textarea');
      el.style.resize = 'both';
    } else {
      el = document.createElement('input');
      el.type = veld.kind === 'date' ? 'date' : 'text';
      if (veld.kind === 'initials') el.maxLength = 6;
    }
    el.value = oud;
    el.title = veld.multi ? `${veld.label}: Ctrl+Enter or click away to keep, Esc to cancel` : `${veld.label}: Enter or click away to keep, Esc to cancel`;
    const w = Math.max(r.width, veld.kind === 'date' ? 150 : 120);
    const h = veld.multi ? Math.max(r.height, 90) : Math.max(r.height, pt + 12);
    el.style.cssText = STIJL + `left:${Math.max(4, Math.min(r.left, innerWidth - w - 4))}px;top:${Math.max(4, Math.min(r.top, innerHeight - h - 4))}px;`
      + `width:${w}px;height:${h}px;font-size:${pt}px;font-weight:${veld.bold ? 'bold' : 'normal'};text-align:${veld.multi ? 'left' : veld.align || 'left'};`;
    // Keep keys and clicks to the field: the page view would take them as shortcuts.
    for (const soort of ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'click', 'dblclick', 'wheel', 'keypress', 'keyup', 'contextmenu']) {
      el.addEventListener(soort, (ev) => ev.stopPropagation());
    }
    el.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Escape') { ev.preventDefault(); sluit(false); }
      else if (ev.key === 'Enter' && (!veld.multi || ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); sluit(true); }
    });
    document.body.appendChild(el);
    open = { el, ann, veld, oud: String(oud) };
    rand?.remove(); rand = null;
    // The app takes the focus back after a click on the page: give it back.
    const focus = () => { if (open?.el === el && document.activeElement !== el) { el.focus(); if (el.select && el.type === 'text') el.select(); } };
    // Not closed on blur: the app moves the focus around after a double-click.
    // A click elsewhere, Enter, Esc or scrolling closes it.
    focus(); for (const ms of [0, 60, 150, 300]) setTimeout(focus, ms);
  };

  const opDubbel = (e) => {
    if (open || e.target?.closest?.('.s43d, .s43d-tab, [data-seed43-edit]')) return;
    if (!magNu(api)) return;
    const p = naarPagina(e);
    if (!p) return;
    const hit = veldOnder(api, type, p);
    if (!hit) return;
    e.stopPropagation(); e.preventDefault();
    opener(e, p, hit);
  };

  // Hover: outline the box the pointer is over, so it is clear it can be edited.
  let wacht = false, laatst = null;
  const zweef = () => {
    wacht = false;
    const e = laatst;
    if (!e || open || e.buttons || !magNu(api) || e.target?.closest?.('.s43d, .s43d-tab')) { rand?.remove(); rand = null; return; }
    const p = naarPagina(e);
    const hit = p && veldOnder(api, type, p);
    if (!hit || hit.ann.locked || hit.veld.kind === 'auto') { rand?.remove(); rand = null; return; }
    const r = schermVak(e, p, hit);
    if (!rand) {
      rand = document.createElement('div');
      rand.style.cssText = 'position:fixed;z-index:2500;pointer-events:none;border:1px dashed #0078d7;background:rgba(0,120,215,.06);border-radius:2px;';
      document.body.appendChild(rand);
    }
    Object.assign(rand.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    rand.title = '';
  };
  const opBeweeg = (e) => { laatst = e; if (!wacht) { wacht = true; requestAnimationFrame(zweef); } };
  const opScroll = () => { rand?.remove(); rand = null; sluit(true); };
  const opDruk = (e) => { if (open && e.target !== open.el) sluit(true); };

  document.addEventListener('dblclick', opDubbel, true);
  document.addEventListener('pointerdown', opDruk, true);
  document.addEventListener('mousemove', opBeweeg, true);
  document.addEventListener('wheel', opScroll, { capture: true, passive: true });
  uit = () => {
    document.removeEventListener('dblclick', opDubbel, true);
    document.removeEventListener('pointerdown', opDruk, true);
    document.removeEventListener('mousemove', opBeweeg, true);
    document.removeEventListener('wheel', opScroll, { capture: true });
    sluit(true);
    rand?.remove(); rand = null;
  };
}

export function stopInPlaats() { uit?.(); uit = null; }
