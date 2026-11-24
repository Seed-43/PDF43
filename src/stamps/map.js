// The templates folder: every stamp, sheet and memo the user makes or changes
// is also kept as a file, so it survives a reinstall or a cleared browser
// store, and can be copied to another computer or shared on a network drive.
//
//   Documents\S43 PDF Templates\Stamps\<name>.seed43stamps
//                              \Sheets\…
//                              \Memos\…
//                              \Deleted\…   (what was deleted in the builder)
//
// Nothing is ever removed from the folder: a deleted family's file moves to
// Deleted, a renamed one is renamed. Built-in families are written only once
// the user changes them. A file is the same as an export from the builder
// ({ seed43StampFamilies: 1, families: [one family] }), so it can be imported
// anywhere too. Files dropped into the folders appear the next time the
// Stamps tab starts or the builder opens.
//
// Shared locations (like Revit's library places): folders the user maps, a
// company library on a network drive say, read only. Their templates show in
// the builder and the Stamps tab with the location's name; they are never
// written to, and they are not kept in this computer's store, so a change on
// the share shows next time. Own templates win over shared ones with the same
// id; among shared locations the one higher in the list wins.

import { GROEPEN, groepVan, geldig } from './families.js';

export const MAP_NAAM = 'S43 PDF Templates';
const WEG = 'Deleted';
const EXT = '.seed43stamps';

const T = () => window.__TAURI__ || null;
const paden = new Map();     // family id -> its file
let basis = null;

/** True when this family has a file in the folder. */
export const heeftBestand = (id) => paden.has(id);

/** True when the app can reach the file system (the desktop app). */
export const heeftMap = () => !!(T()?.fs?.writeTextFile && T()?.path?.documentDir);

async function scope(dir) {
  try { await T().core.invoke('allow_fs_scope', { path: `${dir}\\_scope.seed43` }); } catch {}
}

/** The templates folder, made when it is not there yet. */
export async function basisMap() {
  if (basis) return basis;
  const t = T();
  const docs = await t.path.documentDir();
  const b = await t.path.join(docs, MAP_NAAM);
  await scope(docs);
  await scope(b);
  try { await t.fs.mkdir(b, { recursive: true }); } catch {}
  for (const sub of [...Object.values(GROEPEN), WEG]) {
    const p = await t.path.join(b, sub);
    await scope(p);
    try { await t.fs.mkdir(p, { recursive: true }); } catch {}
  }
  basis = b;
  return b;
}

const veilig = (naam) => String(naam || 'Template').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Template';

async function submap(f) {
  return T().path.join(await basisMap(), GROEPEN[groepVan(f)]);
}

/** The families in a folder's Stamps, Sheets and Memos (and loose in the folder itself). */
async function leesFamilies(b, opPad) {
  const t = T();
  const uit = new Map();
  await scope(b);
  for (const dir of [b, ...await Promise.all(Object.values(GROEPEN).map((sub) => t.path.join(b, sub)))]) {
    await scope(dir);
    let items = [];
    try { items = await t.fs.readDir(dir); } catch { continue; }
    for (const it of items) {
      if (!it.isFile || !/\.(seed43stamps|json)$/i.test(it.name)) continue;
      const pad = await t.path.join(dir, it.name);
      try {
        await T().core.invoke('allow_fs_scope', { path: pad });
        const data = JSON.parse(await t.fs.readTextFile(pad));
        for (const f of (Array.isArray(data) ? data : data.families || []).filter(geldig)) {
          if (uit.has(f.id)) continue;
          uit.set(f.id, f);
          opPad?.(f.id, pad);
        }
      } catch (e) { console.warn('[seed43] template not read:', pad, e); }
    }
  }
  return uit;
}

/** Every family in the own folder (not Deleted), keyed by id. */
export async function leesMap() {
  if (!heeftMap()) return new Map();
  return leesFamilies(await basisMap(), (id, pad) => paden.set(id, pad));
}

// ── Shared locations (read only) ─────────────────────────────────────

const LOCATIES = 'seed43.templateLocations';

/** The mapped locations: [{ name, path }], highest priority first. */
export function leesLocaties() {
  try {
    const v = JSON.parse(localStorage.getItem(LOCATIES) || '[]');
    return Array.isArray(v) ? v.filter((l) => l && typeof l.path === 'string' && l.path) : [];
  } catch { return []; }
}

export function bewaarLocaties(lijst) {
  localStorage.setItem(LOCATIES, JSON.stringify(lijst.map((l) => ({ name: String(l.name || '').trim() || l.path.split(/[\\/]/).filter(Boolean).pop(), path: l.path }))));
}

/** Pick a folder (the app's folder dialog). Resolves to its path or null. */
export async function kiesMap(titel = 'Choose a templates folder') {
  const t = T();
  if (!t?.dialog?.open) throw new Error('Choosing a folder needs the Open PDF Studio desktop app.');
  const p = await t.dialog.open({ directory: true, multiple: false, title: titel });
  return Array.isArray(p) ? p[0] || null : p || null;
}

/** The families of every shared location, each marked with its location's name. */
export async function leesGedeeld() {
  const uit = new Map();
  if (!heeftMap()) return uit;
  for (const l of leesLocaties()) {
    let fams;
    try { fams = await leesFamilies(l.path); } catch (e) { console.warn('[seed43] location not read:', l.path, e); continue; }
    for (const [id, f] of fams) if (!uit.has(id)) uit.set(id, { ...f, shared: l.name || l.path });
  }
  return uit;
}

/** Write one family to its file (renamed or moved when its name or group changed). */
export async function schrijfFamilie(f) {
  const t = T();
  const dir = await submap(f);
  let pad = await t.path.join(dir, `${veilig(f.name)}${EXT}`);
  const oud = paden.get(f.id);
  // Another family already has that file name: add a short id.
  for (const [id, p] of paden) if (id !== f.id && p.toLowerCase() === pad.toLowerCase()) pad = await t.path.join(dir, `${veilig(f.name)} (${f.id.slice(-4)})${EXT}`);
  await T().core.invoke('allow_fs_scope', { path: pad }).catch(() => {});
  if (oud && oud.toLowerCase() !== pad.toLowerCase()) {
    try { await T().core.invoke('allow_fs_scope', { path: oud }); await t.fs.rename(oud, pad); } catch {}
  }
  await t.fs.writeTextFile(pad, JSON.stringify({ seed43StampFamilies: 1, families: [f] }, null, 1));
  paden.set(f.id, pad);
}

/** Move a deleted family's file to Deleted (kept, never removed). */
export async function verplaatsNaarWeg(id) {
  const oud = paden.get(id);
  if (!oud) return;
  const t = T();
  const naam = oud.split(/[\\/]/).pop();
  const stempel = new Date().toISOString().slice(0, 10);
  const doel = await t.path.join(await basisMap(), WEG, naam.replace(EXT, ` ${stempel}${EXT}`));
  try {
    await T().core.invoke('allow_fs_scope', { path: oud });
    await T().core.invoke('allow_fs_scope', { path: doel });
    await t.fs.rename(oud, doel);
    paden.delete(id);
  } catch (e) { console.warn('[seed43] template not moved to Deleted:', e); }
}

/** Show a group's folder (Stamps, Sheets or Memos) in Explorer. */
export async function toonMap(groep) {
  const t = T();
  if (!heeftMap()) throw new Error('The templates folder needs the Open PDF Studio desktop app.');
  const dir = await t.path.join(await basisMap(), GROEPEN[groep] || GROEPEN.stamp);
  // Show a file inside when there is one, so Explorer opens the folder itself.
  let doel = dir;
  try {
    const eerste = (await t.fs.readDir(dir)).find((i) => i.isFile);
    if (eerste) doel = await t.path.join(dir, eerste.name);
  } catch {}
  try { await t.core.invoke('reveal_in_file_manager', { path: doel }); } catch (e) {
    try { await t.shell.open(dir); } catch { throw new Error(`Could not open ${dir}: ${e?.message || e}`); }
  }
  return dir;
}

/**
 * Bring the folder and the families in sync: families from files are taken in
 * (a file wins over the stored copy), families the folder lacks are written
 * (built-ins only when changed). Returns the merged list, and whether it changed.
 */
export async function synchroniseer(families, isOngewijzigdStandaard) {
  if (!heeftMap()) return { families, gewijzigd: false };
  const opMap = await leesMap();
  let gewijzigd = false;
  // Shared ones are read again each time: what is on the share now.
  const eigen = families.filter((f) => !f.shared);
  if (eigen.length !== families.length) gewijzigd = true;
  const lijst = eigen.map((f) => {
    const m = opMap.get(f.id);
    if (m && JSON.stringify(m) !== JSON.stringify(f)) { gewijzigd = true; return m; }
    return f;
  });
  for (const [id, f] of opMap) if (!lijst.some((x) => x.id === id)) { lijst.push(f); gewijzigd = true; }
  for (const f of lijst) {
    if (opMap.has(f.id) || isOngewijzigdStandaard(f)) continue;
    try { await schrijfFamilie(f); } catch (e) { console.warn('[seed43] template not written:', f.name, e); }
  }
  for (const [id, f] of await leesGedeeld()) if (!lijst.some((x) => x.id === id)) { lijst.push(f); gewijzigd = true; }
  return { families: lijst, gewijzigd };
}
