// The app's redrawAnnotations() repaints the single-page canvas only. In
// continuous view (the usual one) the page overlays are painted elsewhere
// and only follow on the next scroll or click, so a change made from
// Seed43 Properties, or a move by the centre grip, showed up only after a
// click on the sheet. The continuous view repaints its overlays when its
// scroll area reports a scroll, so after every redraw or markup change
// Seed43 reports one (once per frame at most).

let gepland = false;

function porContinu() {
  if (gepland) return;
  gepland = true;
  requestAnimationFrame(() => {
    gepland = false;
    if (!document.querySelector('.canvas-container-cont')) return;   // not continuous view
    document.getElementById('pdf-container')?.dispatchEvent(new Event('scroll'));
  });
}

/** Make the extension's redraws and markup changes show at once in every view mode. */
export function hertekenOveral(api) {
  if (!api || api.__seed43Herteken) return;
  try {
    const teken = api.redrawAnnotations?.bind(api);
    const batch = api.applyAnnotationBatch?.bind(api);
    if (teken) api.redrawAnnotations = (...a) => { const r = teken(...a); porContinu(); return r; };
    if (batch) api.applyAnnotationBatch = (...a) => { const r = batch(...a); porContinu(); return r; };
    api.__seed43Herteken = true;
  } catch (e) { console.warn('[seed43] redraw hook:', e); }
}
