// Seed43 Collab: what this PC remembers, and the session actions (share, join,
// open, end, delete, remove a seat). Kept in localStorage on this PC only:
// the device secret, and per session its share key and (for the owner) the
// owner token. Nothing here is sent anywhere except the derived access key.

import { call } from './client.js';
import { deriveKeys, newShareKey, newSecret, parseShareKey, formatShareKey, seal, open, sealFile, openFile } from './crypto.js';

const APPARAAT = 'seed43.collab.device';
const LIJST = 'seed43.collab.sessions';
const NAAM = 'seed43.collab.name';

const lees = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch { return d; } };
const schrijf = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export function device() {
  let d = lees(APPARAAT, null);
  if (typeof d !== 'string' || d.length !== 43) { d = newSecret(); schrijf(APPARAAT, d); }
  return d;
}

export const mijnNaam = () => lees(NAAM, '');
export const zetNaam = (n) => schrijf(NAAM, String(n || '').trim().slice(0, 80));

/** This PC's sessions: [{ key, id, role, ownerToken?, title, editUntil, deleteAt, downloadedAt?, file? }] */
export function lijst() {
  const l = lees(LIJST, []);
  return Array.isArray(l) ? l.filter((s) => s && typeof s.key === 'string') : [];
}
function bewaar(l) { schrijf(LIJST, l); }
export function werkBij(key, changes) {
  const l = lijst();
  const s = l.find((x) => x.key === key);
  if (s) { Object.assign(s, changes); bewaar(l); }
  return s;
}
export function vergeet(key) { bewaar(lijst().filter((x) => x.key !== key)); }

const sleutels = new Map();   // share key -> { access, content }
export async function keys(shareKey) {
  if (!sleutels.has(shareKey)) sleutels.set(shareKey, await deriveKeys(shareKey));
  return sleutels.get(shareKey);
}

// What's encrypted where: the aad ties a blob to its role, so a blob can't be
// moved from one place to another (a name passed off as a title, for example).
const AAD_TITEL = 'title', AAD_NAAM = 'seat-name';

export async function limieten() {
  return call('GET', '/v1/limits');
}

/** Share a PDF: make the key, create the session, upload the encrypted PDF. */
export async function deel(pdfBytes, title, naam) {
  const key = newShareKey();
  const k = await keys(key);
  const res = await call('POST', '/v1/sessions', {
    access: k.access, device: device(),
    body: { title: await seal(k.content, title, AAD_TITEL), name: await seal(k.content, naam, AAD_NAAM) },
  });
  const s = { key, id: res.id, role: 'owner', ownerToken: res.ownerToken, title, editUntil: res.editUntil, deleteAt: res.deleteAt, gedeeld: Date.now() };
  bewaar([s, ...lijst()]);
  await call('PUT', '/v1/session/pdf', { access: k.access, owner: res.ownerToken, raw: await sealFile(k.content, pdfBytes) });
  return s;
}

/** Join with a pasted key. Returns the session as remembered here. */
export async function doeMee(typedKey, naam) {
  const raw = parseShareKey(typedKey);
  if (!raw) throw new Error('That isn\'t a Seed43 Collab key. It looks like S43-XXXX-XXXX-…');
  const key = formatShareKey(raw);
  const k = await keys(key);
  const st = await call('POST', '/v1/session/join', { access: k.access, device: device(), body: { name: await seal(k.content, naam, AAD_NAAM) } });
  const title = await open(k.content, st.title, AAD_TITEL).catch(() => 'Shared PDF');
  const prior = lijst().find((x) => x.key === key);
  const s = { ...(prior || {}), key, id: st.id, role: prior?.role || 'member', title, editUntil: st.editUntil, deleteAt: st.deleteAt };
  bewaar([s, ...lijst().filter((x) => x.key !== key)]);
  return s;
}

/** The live state of a session, names decrypted. */
export async function status(s) {
  const k = await keys(s.key);
  const st = await call('GET', '/v1/session', { access: k.access, device: device() });
  for (const seat of st.seats) seat.name = await open(k.content, seat.name, AAD_NAAM).catch(() => '(unreadable)');
  werkBij(s.key, { editUntil: st.editUntil, deleteAt: st.deleteAt, phase: st.phase });
  return st;
}

export async function downloadPdf(s) {
  const k = await keys(s.key);
  return openFile(k.content, await call('GET', '/v1/session/pdf', { access: k.access, device: device() }));
}

export async function verwijderStoel(s, seat) {
  const k = await keys(s.key);
  return call('DELETE', `/v1/session/seats/${seat}`, { access: k.access, owner: s.ownerToken });
}

export async function beeindig(s) {
  const k = await keys(s.key);
  const r = await call('POST', '/v1/session/end', { access: k.access, owner: s.ownerToken, body: {} });
  werkBij(s.key, { editUntil: r.editUntil, deleteAt: r.deleteAt, phase: 'readonly' });
  return r;
}

export async function verwijder(s) {
  const k = await keys(s.key);
  await call('DELETE', '/v1/session', { access: k.access, owner: s.ownerToken });
  vergeet(s.key);
}

// Markup events. The plaintext is the whole annotation; the aad binds it to
// its markup and event, so the server can't move it to another markup.
export async function sluitEvent(content, ev) { return seal(content, ev.data, `ann|${ev.ann}|${ev.id}`); }
export async function openEvent(content, ev) { return open(content, ev.data, `ann|${ev.ann}|${ev.id}`); }
export async function openKop(content, head) { return open(content, head.data, `ann|${head.id}|${head.base}`); }
