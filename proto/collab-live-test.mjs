// Live test of the Collab extension code against https://collab.seed43.org.
// node proto/collab-live-test.mjs
import { Worker } from 'node:worker_threads';
import assert from 'node:assert/strict';
import * as C from '../src/collab/crypto.js';

let ok = 0;
const stap = (t) => { ok++; console.log('  ok', t); };

// ── crypto, offline ──
const key = C.newShareKey();
assert.match(key, /^S43(-[0-9A-HJKMNP-TV-Z]{4}){8}$/);
assert.equal(C.formatShareKey(C.parseShareKey(key.toLowerCase().replace(/-/g, ' '))), key);
assert.equal(C.parseShareKey('S43-1234'), null);
stap('share keys: format, sloppy typing accepted, short key refused');
const k = await C.deriveKeys(key);
assert.equal(k.access.length, 43);
assert.notEqual((await C.deriveKeys(C.newShareKey())).access, k.access);
const groot = new Uint8Array(2.5 * 1024 * 1024 - 7).map((_, i) => (i * 31 + 7) & 255);
const dicht = await C.sealFile(k.content, groot);
assert.deepEqual(await C.openFile(k.content, dicht), groot);
const knoei = dicht.slice(); knoei[knoei.length - 5] ^= 1;
await assert.rejects(C.openFile(k.content, knoei));
await assert.rejects(C.openFile(k.content, dicht.slice(0, 13 + 1024 * 1024 + 16)));   // cut after the first chunk
stap('files: 2.5 MB round trip; a changed byte and a cut-short file are both refused');
const b = await C.seal(k.content, { x: 1 }, 'title');
await assert.rejects(C.open(k.content, b, 'seat-name'));
stap('blobs: a title can\'t be passed off as a name (aad)');

// ── live, three participants ──
const pdfMarkups = [{ type: 'textbox', page: 1, subject: 'pdf-note', x: 10, y: 10, text: 'in the PDF already' }];
function deelnemer(naam) {
  const w = new Worker(new URL('./collab-deelnemer.mjs', import.meta.url), { workerData: { naam, pdfMarkups } });
  let n = 0; const wacht = new Map();
  w.on('message', ({ id, r, fout }) => { const p = wacht.get(id); wacht.delete(id); fout ? p.rej(Object.assign(new Error(fout.message), fout)) : p.res(r); });
  return { doe: (cmd, arg) => new Promise((res, rej) => { const id = ++n; wacht.set(id, { res, rej }); w.postMessage({ id, cmd, arg }); }), w };
}
const slaap = (ms) => new Promise((r) => setTimeout(r, ms));
const [fred, ana, ben, vier] = ['Fred', 'Ana', 'Ben', 'Vier'].map(deelnemer);
try {
  const pdf = new TextEncoder().encode('%PDF-1.7 test ' + 'x'.repeat(5000));
  const { key: sk } = await fred.doe('deel', { pdf, titel: 'Live test drawing' });
  stap('Fred shares (encrypted upload)');
  assert.equal((await ana.doe('doeMee', sk)).title, 'Live test drawing');
  await ben.doe('doeMee', sk.toLowerCase());
  await assert.rejects(vier.doe('doeMee', sk), (e) => e.code === 'full');
  stap('Ana and Ben join, the 4th is refused (full); the title decrypts for them');
  const st = await fred.doe('status');
  assert.deepEqual(st.seats.map((s) => s.name), ['Fred', 'Ana', 'Ben']);
  stap('seat names decrypt: Fred, Ana, Ben');
  for (const p of [fred, ana, ben]) assert.equal((await p.doe('open')).pdfLength, pdf.length);
  stap('all three download and decrypt the PDF and go live');

  await fred.doe('teken', { id: 'f1', type: 'line', page: 1, subject: 'fred-line', x1: 0, y1: 0, x2: 50, y2: 50 });
  await ana.doe('teken', { id: 'a1', type: 'rectangle', page: 1, subject: 'ana-box', x: 5, y: 5, width: 20, height: 20 });
  await ben.doe('wijzig', { subject: 'pdf-note', changes: { text: 'Ben edited the PDF note' } });
  await slaap(4000);
  for (const p of [fred, ana, ben]) console.log(JSON.stringify(await p.doe('debug')));
  const [sf, sa, sb] = await Promise.all([fred.doe('stand'), ana.doe('stand'), ben.doe('stand')]);
  assert.deepEqual(sa, sf); assert.deepEqual(sb, sf);
  assert.equal(sf.length, 3);
  assert.equal(sf.find((a) => a.subject === 'pdf-note').text, 'Ben edited the PDF note');
  stap('new markups from Fred and Ana, and Ben\'s edit of a markup that was in the PDF, reach everyone');

  await ana.doe('wis', 'fred-line');
  await fred.doe('wijzig', { subject: 'ana-box', changes: { width: 99 } });
  await slaap(4000);
  const [tf, ta, tb] = await Promise.all([fred.doe('stand'), ana.doe('stand'), ben.doe('stand')]);
  assert.deepEqual(ta, tf); assert.deepEqual(tb, tf);
  assert.equal(tf.length, 2);
  assert.equal(tf.find((a) => a.subject === 'ana-box').width, 99);
  stap('a delete and an edit of someone else\'s markup reach everyone; all three match');

  await fred.doe('beeindig');
  await ben.doe('teken', { id: 'b9', type: 'line', page: 1, subject: 'late', x1: 1, y1: 1, x2: 2, y2: 2 });
  await slaap(2500);
  assert.equal((await fred.doe('stand')).length, 2);
  stap('after End now, a late markup isn\'t shared (read-only)');
} finally {
  for (const p of [fred, ana, ben]) await p.doe('stop').catch(() => {});
  await fred.doe('verwijder').then(() => console.log('  (test session deleted from the server)')).catch((e) => console.log('  delete failed:', e.message));
  for (const p of [fred, ana, ben, vier]) p.w.terminate();
}
console.log(`${ok} checks passed`);
