// Seed43 Properties: the options of a selected Seed43 item (member, section,
// bolt group, bracing line, smart stamp) in a Seed43 window of their own,
// instead of at the bottom of the app's Properties panel. The window floats or
// docks like the other Seed43 windows (venster.js). It needs nothing new from
// the app: the forms still come through api.registerPropertyPanel, and the
// app's panel shows a one-line note where the form used to be.
//
// The ribbon button switches this off again: the forms then show in the app's
// Properties panel as before.

import { maakVenster } from './venster.js';

const AAN = 'seed43.eigenschappenVenster';

export function vensterAan() {
  try { return localStorage.getItem(AAN) !== '0'; } catch { return true; }
}

let venster = null;

function v() {
  if (!venster) venster = maakVenster({ id: 'properties', titel: 'Seed43 Properties', breedte: 280, hoogte: 240 });
  return venster;
}

function leeg() {
  const d = document.createElement('div');
  d.style.cssText = 'padding:10px;opacity:.7;';
  d.textContent = 'Select a Seed43 member, bolt group, bracing line or smart stamp to edit it here.';
  return d;
}

function notitie() {
  const n = document.createElement('div');
  n.style.cssText = 'padding:6px 8px;font-size:12px;opacity:.75;';
  n.textContent = 'Seed43 options are in the Seed43 Properties window.';
  return n;
}

/**
 * Wrap a property-panel renderer so its form goes to the Seed43 Properties
 * window. A new selection opens the window (also after it was closed);
 * deselecting leaves it open with a hint, so a docked window stays put.
 */
export function viaVenster(renderFn) {
  return (ann, update, commit, cancel) => {
    if (!vensterAan()) return renderFn(ann, update, commit, cancel);
    const w = v();
    if (!ann) {
      try { renderFn(null, update, commit, cancel); } catch {}
      w.lijf.replaceChildren(leeg());
      return null;
    }
    let dom = null;
    try { dom = renderFn(ann, update, commit, cancel); } catch (e) { console.warn('[seed43] properties:', e); }
    w.lijf.replaceChildren(dom || leeg());
    w.open();
    return notitie();
  };
}

/** Ribbon: Properties window on or off. Returns whether it is now on. */
export function wisselVenster() {
  const aan = !vensterAan();
  try { localStorage.setItem(AAN, aan ? '1' : '0'); } catch {}
  if (aan) { v().lijf.replaceChildren(leeg()); v().open(); }
  else venster?.sluit();
  return aan;
}
