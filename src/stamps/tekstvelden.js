// Text on a smart border that should be filled in per drawing (the project
// name, a drawing number, a date) becomes a box for a value: the user picks
// the text on the sheet, it leaves the frame and a field takes its place, in
// the same size, weight and colour, with the text as its starting value. The
// field gets its name from the label next to it ("PROJECT:" to its left, or
// "DRAWING No." above it), and its box reaches to the next line or text on
// its right, so longer values fit. Removing the field puts the text back.

const isTekst = (p) => p?.t === 'text' && !p.r && String(p.text || '').trim();

/** The box of a text primitive on the sheet (baseline text, unrotated). */
export function tekstVak(p) {
  const s = p.s || 5;
  const w = p.w || s * 0.55 * String(p.text).length;
  return { x: p.x, y: p.y - s * 0.82, w, h: s * 1.12, s, basis: p.y };
}

/** The pickable texts of a family's smart border. */
export function teksten(f) {
  return (f.smart || []).filter(isTekst);
}

/** The text under a point, the smallest box first. */
export function tekstOp(f, x, y) {
  let beste = null, opp = Infinity;
  for (const p of teksten(f)) {
    const v = tekstVak(p);
    if (x >= v.x - 1 && x <= v.x + v.w + 1 && y >= v.y - 1 && y <= v.y + v.h + 1 && v.w * v.h < opp) { beste = p; opp = v.w * v.h; }
  }
  return beste;
}

/** The texts inside a box (the whole text inside it). */
export function tekstenIn(f, r) {
  return teksten(f).filter((p) => {
    const v = tekstVak(p);
    return v.x >= r.x - 1 && v.y >= r.y - 1 && v.x + v.w <= r.x + r.w + 1 && v.y + v.h <= r.y + r.h + 1;
  });
}

/** Pieces on one line, close together, are one value ("123", "Main", "Street"). */
function regels(lijst) {
  const vakken = lijst.map((p) => ({ p, v: tekstVak(p) })).sort((a, b) => a.v.basis - b.v.basis || a.v.x - b.v.x);
  const uit = [];
  for (const it of vakken) {
    const r = uit.find((g) => Math.abs(g.basis - it.v.basis) < it.v.s * 0.35 && Math.abs(g.s - it.v.s) < it.v.s * 0.3
      && it.v.x - (g.x + g.w) < it.v.s * 1.6 && it.v.x + it.v.w > g.x - it.v.s * 1.6);
    if (r) {
      const x1 = Math.max(r.x + r.w, it.v.x + it.v.w);
      r.x = Math.min(r.x, it.v.x); r.w = x1 - r.x; r.delen.push(it.p);
    } else uit.push({ basis: it.v.basis, s: it.v.s, x: it.v.x, w: it.v.w, delen: [it.p] });
  }
  for (const r of uit) r.delen.sort((a, b) => a.x - b.x);
  return uit;
}

/**
 * The label of a value: the text just left of it on its line, else one just
 * right of it that starts with a colon (":JOB", a right-hand title block
 * column), else the text just above it. { naam, rechts } (rechts: the label
 * is on the right, so the value is right-aligned).
 */
function labelVoor(regel, rest) {
  let links = null, rechts = null, boven = null;
  for (const p of rest) {
    const v = tekstVak(p);
    const eind = v.x + v.w;
    if (Math.abs(v.basis - regel.basis) < regel.s * 0.6 && eind <= regel.x + 1 && regel.x - eind < 220) {
      if (!links || eind > tekstVak(links).x + tekstVak(links).w) links = p;
    }
    if (Math.abs(v.basis - regel.basis) < regel.s * 0.6 && v.x >= regel.x + regel.w - 1 && v.x - (regel.x + regel.w) < 40 && /^\s*:/.test(p.text)) {
      if (!rechts || v.x < tekstVak(rechts).x) rechts = p;
    }
    const onder = v.y + v.h, top = regel.basis - regel.s * 0.82;
    if (onder <= top + 1 && top - onder < Math.max(regel.s, v.s) * 3.2 && v.x < regel.x + regel.w && eind > regel.x - 20) {
      if (!boven || onder > tekstVak(boven).y + tekstVak(boven).h) boven = p;
    }
  }
  // A label to the left that ends in a colon beats one on the right; a bare
  // text to the left (another value) loses to a ':LABEL' on the right.
  const kies = links && (/:\s*$/.test(links.text) || !rechts) ? links : rechts || links || boven;
  const naam = String(kies?.text || '').replace(/^[\s:]+|[:.\s]+$/g, '').trim();
  return { naam: naam || null, rechts: !!kies && kies === rechts };
}

/** Where a right-aligned box can reach on the left: the previous text or upright line. */
function linksGrens(regel, f, rest) {
  let x = Math.max(0, regel.x - 320);
  const top = regel.basis - regel.s * 0.9, onder = regel.basis + regel.s * 0.25;
  for (const p of rest) {
    const v = tekstVak(p);
    if (v.x + v.w < regel.x && v.y < onder && v.y + v.h > top) x = Math.max(x, v.x + v.w + 2);
  }
  for (const p of f.smart || []) {
    if (p.t !== 'path' || !p.p) continue;
    for (let i = 0; i + 3 < p.p.length; i += 2) {
      const x1 = p.p[i], y1 = p.p[i + 1], x2 = p.p[i + 2], y2 = p.p[i + 3];
      if (Math.abs(x1 - x2) > 0.5 || x1 >= regel.x || Math.min(y1, y2) > top || Math.max(y1, y2) < onder) continue;
      x = Math.max(x, x1 + 2);
    }
  }
  return Math.min(x, regel.x);
}

/** Where the box can reach on the right: the next text or upright line, or the sheet edge. */
function rechtsGrens(regel, f, rest) {
  let x = Math.min(f.width || 595, regel.x + 320);
  const top = regel.basis - regel.s * 0.9, onder = regel.basis + regel.s * 0.25;
  for (const p of rest) {
    const v = tekstVak(p);
    if (v.x > regel.x + regel.w && v.y < onder && v.y + v.h > top) x = Math.min(x, v.x - 2);
  }
  for (const p of f.smart || []) {
    if (p.t !== 'path' || !p.p) continue;
    for (let i = 0; i + 3 < p.p.length; i += 2) {
      const x1 = p.p[i], y1 = p.p[i + 1], x2 = p.p[i + 2], y2 = p.p[i + 3];
      if (Math.abs(x1 - x2) > 0.5) continue;                       // upright lines only
      if (x1 <= regel.x + regel.w || Math.min(y1, y2) > top || Math.max(y1, y2) < onder) continue;
      x = Math.min(x, x1 - 2);
    }
  }
  for (const p of f.frame || []) {
    if (p.t === 'line' && Math.abs(p.x1 - p.x2) < 0.5 && p.x1 > regel.x + regel.w && Math.min(p.y1, p.y2) <= top && Math.max(p.y1, p.y2) >= onder) x = Math.min(x, p.x1 - 2);
  }
  return Math.max(x, regel.x + regel.w);
}

/**
 * Turn the picked texts into fields. Returns the new fields; the texts are
 * taken out of f.smart and kept on their field (uitTekst) to put back.
 */
export function maakVelden(f, gekozen, sleutelVan) {
  const kies = new Set(gekozen.filter(isTekst));
  if (!kies.size) return [];
  const rest = teksten(f).filter((p) => !kies.has(p));
  const nieuw = [];
  for (const r of regels([...kies])) {
    const waarde = r.delen.map((p) => p.text).join(' ').replace(/\s+/g, ' ').trim();
    const lb = labelVoor(r, rest);
    const label = lb.naam || waarde.slice(0, 24) || 'Field';
    const eerste = r.delen[0];
    const h = r.s * 1.3;
    // Label on the right: the value is right-aligned and its box grows to the left.
    const x0 = lb.rechts ? linksGrens(r, f, rest) : r.x - 0.5;
    const x1 = lb.rechts ? r.x + r.w + 0.5 : rechtsGrens(r, f, rest);
    const veld = {
      key: sleutelVan(label, [...f.fields, ...nieuw].map((x) => x.key)), label, kind: 'text', value: waarde,
      x: +x0.toFixed(2), y: +(r.basis - r.s * 0.33 - h / 2).toFixed(2), w: +(x1 - x0).toFixed(2), h: +h.toFixed(2),
      size: r.s, ...(lb.rechts ? { align: 'right' } : {}), ...(eerste.b ? { bold: true } : {}), ...(eerste.c ? { color: eerste.c } : {}),
      uitTekst: r.delen,
    };
    nieuw.push(veld);
  }
  f.smart = f.smart.filter((p) => !kies.has(p));
  f.fields.push(...nieuw);
  return nieuw;
}

/** A field made from text, removed: its text goes back on the sheet. */
export function tekstTerug(f, veld) {
  if (Array.isArray(veld?.uitTekst) && veld.uitTekst.length) f.smart = [...(f.smart || []), ...veld.uitTekst];
}
