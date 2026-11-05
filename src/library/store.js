// Element Library: one JSON library (like a CAD block library) that the user
// opens, edits and saves. Categories have a kind: 'section' (placed as a
// to-scale outline), 'bolt' (feeds bolt groups and their checks) or 'table'
// (reference data). The first library is NZ Steel, shipped with the
// extension (data/nz-steel.seed43lib.json).

const OPSLAG = 'seed43.library';
let huidig = null;

export const SOORTEN = { section: 'Section', bolt: 'Bolt', table: 'Table' };
export const VORMEN = { I: 'I-section', channel: 'Channel', angle: 'Angle', rhs: 'RHS / SHS', chs: 'CHS', flat: 'Flat / square', round: 'Round bar', 'lipped-c': 'Lipped C (purlin)', rect: 'Rectangle (timber)', ijoist: 'I-joist (timber)' };

export function geldigeBibliotheek(b) {
  return b && typeof b === 'object' && Array.isArray(b.categories)
    && b.categories.every((c) => c && typeof c.id === 'string' && Array.isArray(c.items) && Array.isArray(c.fields));
}

/** The library: the user's saved copy, else the shipped NZ Steel. */
export async function laadBibliotheek(api) {
  if (huidig) return huidig;
  try {
    const v = JSON.parse(localStorage.getItem(OPSLAG) || 'null');
    if (geldigeBibliotheek(v)) return (huidig = v);
  } catch {}
  return (huidig = await standaardBibliotheek(api));
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

/** Group in the library browser: Steel, Timber, Bolts or Reference tables (or the category's own group). */
export function groepVan(c) {
  if (c.group) return c.group;
  if (c.kind === 'bolt') return 'Bolts';
  if (c.kind === 'table') return 'Reference tables';
  return c.shape === 'rect' || c.shape === 'ijoist' ? 'Timber' : 'Steel';
}

/** Categories of the shipped library that a saved library does not have yet. */
export async function nieuweStandaardCategorieen(api, b) {
  const std = await standaardBibliotheek(api);
  const ids = new Set(b.categories.map((c) => c.id));
  return std.categories.filter((c) => !ids.has(c.id));
}
