// Element Library: one JSON library (like a CAD block library) that the user
// opens, edits and saves. Categories have a kind: 'section' (placed as a
// to-scale outline), 'bolt' (feeds bolt groups and their checks) or 'table'
// (reference data). The first library is NZ Steel, shipped with the
// extension (data/nz-steel.seed43lib.json).

const OPSLAG = 'seed43.library';
let huidig = null;
const HOUT_VLAG = 'seed43.library.timber2025b';
const ZA_VLAG = 'seed43.library.za2026b';
const AU_VLAG = 'seed43.library.au2026a';
const UK_VLAG = 'seed43.library.uk2026b';
const FIXING_VLAG = 'seed43.library.fixings2024a';
const HOUT_VERVANG = /^(timber-sg8|lvl-|prolam-|hyjoist$)/;
const OUDE_TABELLEN = new Set(['gauge-angles', 'gauge-welded-flange', 'gauge-welded-web', 'pfc-baseplate']);

export const SOORTEN = { section: 'Section', bolt: 'Bolt', table: 'Table' };
export const VORMEN = { I: 'I-section', channel: 'Channel', angle: 'Angle', rhs: 'RHS / SHS', chs: 'CHS', flat: 'Flat / square', round: 'Round bar', 'lipped-c': 'Lipped C (purlin)', 'lipped-z': 'Lipped Z (purlin)', rect: 'Sawn timber', glulam: 'Glulam', lvl: 'LVL', ijoist: 'I-joist (timber)', hanger: 'Hanger (fixing)', plate: 'Plate (fixing)', fangle: 'Angle cleat (fixing)' };

export function geldigeBibliotheek(b) {
  return b && typeof b === 'object' && Array.isArray(b.categories)
    && b.categories.every((c) => c && typeof c.id === 'string' && Array.isArray(c.items) && Array.isArray(c.fields));
}

/** The library: the user's saved copy, else the shipped NZ Steel. */
export async function laadBibliotheek(api) {
  if (huidig) return huidig;
  try {
    const v = JSON.parse(localStorage.getItem(OPSLAG) || 'null');
    if (geldigeBibliotheek(v)) {
      // The NZ gauge and base plate reference tables shipped up to 0.6.0
      // were never used by any tool; drop them from saved copies too.
      const voor = v.categories.length;
      v.categories = v.categories.filter((c) => !OUDE_TABELLEN.has(c.id));
      let gewijzigd = v.categories.length !== voor;
      // Timber from the supplier tables: placeholder categories taken from
      // the Revit type names (rows marked check) are replaced, and timber
      // categories the saved copy does not have yet are added, once.
      if (localStorage.getItem(HOUT_VLAG) !== '1') {
        try {
          const std = await standaardBibliotheek(api);
          for (const c of std.categories.filter((x) => x.group === 'Timber' && x.id !== 'timber-gauged')) {
            const i = v.categories.findIndex((x) => x.id === c.id);
            // Supplier timber shipped since 0.6.0 is replaced as a whole (new
            // section looks); a Revit placeholder only while still unchecked.
            if (i < 0) v.categories.push(c);
            else if (HOUT_VERVANG.test(c.id) || v.categories[i].items.some((it) => it.check)) v.categories[i] = c;
            else continue;
            gewijzigd = true;
          }
          localStorage.setItem(HOUT_VLAG, '1');
        } catch (e) { console.warn('[seed43] timber not added to the saved library:', e); }
      }
      // Fixings (Lumberlok, Bowmac): shipped fixing categories are added or
      // replaced once per catalogue edition.
      if (localStorage.getItem(FIXING_VLAG) !== '1') {
        try {
          const std = await standaardBibliotheek(api);
          for (const c of std.categories.filter((x) => x.group === 'Fixings')) {
            const i = v.categories.findIndex((x) => x.id === c.id);
            if (i < 0) v.categories.push(c); else v.categories[i] = c;
            gewijzigd = true;
          }
          localStorage.setItem(FIXING_VLAG, '1');
        } catch (e) { console.warn('[seed43] fixings not added to the saved library:', e); }
      }
      // Australia (same kinds of elements as New Zealand): shipped Australian
      // categories the saved copy does not have yet are added, once.
      if (localStorage.getItem(AU_VLAG) !== '1') {
        try {
          const std = await standaardBibliotheek(api);
          const ids = new Set(v.categories.map((c) => c.id));
          for (const c of std.categories.filter((x) => x.region === 'Australia' && !ids.has(x.id))) { v.categories.push(c); gewijzigd = true; }
          localStorage.setItem(AU_VLAG, '1');
        } catch (e) { console.warn('[seed43] Australia not added to the saved library:', e); }
      }
      // South Africa, the same way.
      if (localStorage.getItem(ZA_VLAG) !== '1') {
        try {
          const std = await standaardBibliotheek(api);
          const ids = new Set(v.categories.map((c) => c.id));
          for (const c of std.categories.filter((x) => x.region === 'South Africa' && !ids.has(x.id))) { v.categories.push(c); gewijzigd = true; }
          localStorage.setItem(ZA_VLAG, '1');
        } catch (e) { console.warn('[seed43] South Africa not added to the saved library:', e); }
      }
      // United Kingdom, the same way.
      if (localStorage.getItem(UK_VLAG) !== '1') {
        try {
          const std = await standaardBibliotheek(api);
          const ids = new Set(v.categories.map((c) => c.id));
          for (const c of std.categories.filter((x) => x.region === 'United Kingdom' && !ids.has(x.id))) { v.categories.push(c); gewijzigd = true; }
          localStorage.setItem(UK_VLAG, '1');
        } catch (e) { console.warn('[seed43] United Kingdom not added to the saved library:', e); }
      }
      // The library note still describing the removed gauge tables.
      if (/Gauge tables/.test(v.source || '')) {
        try { v.source = (await standaardBibliotheek(api)).source; gewijzigd = true; } catch {}
      }
      if (gewijzigd) { try { localStorage.setItem(OPSLAG, JSON.stringify(v)); } catch {} }
      return (huidig = v);
    }
  } catch {}
  return (huidig = await standaardBibliotheek(api));
}

/** The library if it is already loaded (for forms that cannot wait), else null. */
export function geladenBibliotheek() {
  return huidig;
}

export async function standaardBibliotheek(api) {
  const data = await api.readAsset('data/nz-steel.seed43lib.json');
  return JSON.parse(new TextDecoder().decode(data));
}

export function bewaarBibliotheek(b) {
  huidig = b;
  try { localStorage.setItem(OPSLAG, JSON.stringify(b)); } catch (e) {
    console.warn('[seed43] library not saved:', e);
    throw new Error('The library could not be saved (browser storage full?). Export it to a file instead.');
  }
}

export function categorie(b, id) {
  return b?.categories.find((c) => c.id === id) || null;
}

export function item(b, catId, naam) {
  return categorie(b, catId)?.items.find((i) => i.name === naam) || null;
}

/** Region in the library browser (the shipped library is New Zealand). */
export function regioVan(c) {
  return c?.region || 'New Zealand';
}

/** Group in the library browser: Steel, Timber, Bolts or Reference tables (or the category's own group). */
export function groepVan(c) {
  if (c.group) return c.group;
  if (c.kind === 'bolt') return 'Bolts';
  if (c.kind === 'table') return 'Reference tables';
  if (['hanger', 'plate', 'fangle'].includes(c.shape)) return 'Fixings';
  return ['rect', 'glulam', 'lvl', 'ijoist'].includes(c.shape) ? 'Timber' : 'Steel';
}

/** Categories of the shipped library that a saved library does not have yet. */
export async function nieuweStandaardCategorieen(api, b) {
  const std = await standaardBibliotheek(api);
  const ids = new Set(b.categories.map((c) => c.id));
  return std.categories.filter((c) => !ids.has(c.id));
}
