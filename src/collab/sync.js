// Seed43 Collab: live markup sync for one open session document.
//
// The app has no "markup changed" event for extensions, so this watches the
// document's revision (it changes with every undo step), compares the markups
// with the last known state and sends what changed. Other people's changes
// come in by long-poll and are applied with applyAnnotationBatch.
//
// Markups made during the session keep their id on every PC (createAnnotation
// keeps a given id). Markups that were already in the PDF get a different id
// on each PC when it loads, so those are matched by a fingerprint of their
// content instead ("f-..."), worked out the same way on every PC.

import { call, CollabError, uitleg } from './client.js';
import { sha256hex } from './crypto.js';
import { device, keys, sluitEvent, openEvent, openKop } from './sessions.js';

const MAX_DATA = 200 * 1024;
const VLUCHTIG = new Set(['id', 'createdAt', 'modifiedAt']);

const json = (a) => JSON.stringify(a);
const kopie = (a) => JSON.parse(JSON.stringify(a));
const willekeurig = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');

function vast(a) {
  // Sorted keys, without what differs per PC or per load.
  const schoon = (v) => Array.isArray(v) ? v.map(schoon)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().filter((k) => !k.startsWith('_')).map((k) => [k, schoon(v[k])]))
    : v;
  const o = {};
  for (const k of Object.keys(a).sort()) if (!VLUCHTIG.has(k) && !k.startsWith('_')) o[k] = schoon(a[k]);
  return JSON.stringify(o);
}

export class Koppeling {
  /** `doc` = { name } of the app tab that holds this session's temp file. */
  constructor(api, sessie, bestandsnaam, { bijStatus } = {}) {
    this.api = api;
    this.s = sessie;
    this.naam = bestandsnaam;
    this.bijStatus = bijStatus || (() => {});
    this.status = { staat: 'opening', tekst: 'Opening…' };
    this.lokaal = new Map();     // local id -> key
    this.terug = new Map();      // key -> local id
    this.basis = new Map();      // local id -> JSON as last synced
    this.koppen = new Map();     // key -> event id of the newest version on the server
    this.verzonden = new Set();  // event ids this PC sent
    this.wachtrij = [];          // remote events not applied yet
    this.cursor = 0;             // applied up to this revision
    this.opgehaald = 0;          // fetched up to this revision
    this.bezig = false;
    this.stop = false;
    this.alleenLezen = false;
    this.rev = null;
  }

  zet(staat, tekst) { this.status = { staat, tekst }; try { this.bijStatus(this.status); } catch {} }

  actief() { return this.api.getDocumentInfo()?.name === this.naam; }

  async start() {
    this.k = await keys(this.s.key);
    // Wait for the app to open the temp file in a tab.
    for (let i = 0; i < 300 && !this.actief(); i++) await new Promise((r) => setTimeout(r, 100));
    if (!this.actief()) { this.zet('fout', 'The shared PDF didn\'t open.'); return; }
    await this.allePaginas();
    // Fingerprints for the markups already in the PDF, the same on every PC.
    const tel = new Map();
    const bestaand = this.api.getAnnotations().map((a) => ({ a, v: vast(a) }));
    const metHash = await Promise.all(bestaand.map(async (x) => ({ ...x, h: (await sha256hex(x.v)).slice(0, 24) })));
    metHash.sort((x, y) => (x.h < y.h ? -1 : x.h > y.h ? 1 : 0));
    for (const { a, h } of metHash) {
      const n = (tel.get(h) || 0) + 1; tel.set(h, n);
      const key = `f-${h}-${n}`;
      this.lokaal.set(a.id, key); this.terug.set(key, a.id);
    }
    for (const a of this.api.getAnnotations()) this.basis.set(a.id, json(a));
    // Catch up: the server's current version of every markup changed so far.
    const snap = await call('GET', '/v1/session/snapshot', { access: this.k.access, device: device() });
    const ops = [];
    for (const h of snap.annotations) {
      this.koppen.set(h.id, h.base);
      const data = h.data ? await openKop(this.k.content, h).catch(() => null) : null;
      ops.push(...this.plan(h.id, h.data ? 'edit' : 'delete', data));
    }
    this.toepassen(ops);
    this.rev = this.api.getDocumentInfo()?.revision;
    this.cursor = this.opgehaald = snap.cursor;
    this.alleenLezen = snap.phase !== 'edit';
    this.zet(this.alleenLezen ? 'alleen-lezen' : 'live', this.alleenLezen ? 'Read-only' : 'Live');
    this.luister();
    this.klok = setInterval(() => this.tik().catch((e) => console.warn('[seed43 collab]', e)), 600);
  }

  sluit() {
    this.stop = true;
    clearInterval(this.klok);
    this.afbreken?.abort();
  }

  async allePaginas() {
    const n = this.api.getPageCount();
    for (let p = 1; p <= n; p++) await this.api.waitForPageAnnotations(p);
  }

  sleutel(id) { return this.lokaal.get(id) || id; }

  /** Turn one remote change into batch operations for this PC. */
  plan(key, op, data) {
    const id = this.terug.get(key) || key;
    const er = this.api.getAnnotations().some((a) => a.id === id);
    if (op === 'delete' || !data) return er ? [{ op: 'delete', id }] : [];
    const a = { ...data, id };
    if (!er) return [{ op: 'create', annotation: a }];
    const { id: _i, type: _t, ...changes } = a;
    return [{ op: 'update', id, changes }];
  }

  toepassen(ops) {
    if (!ops.length) return;
    try {
      this.api.applyAnnotationBatch(ops);
    } catch (e) {
      // One bad markup must not stop the rest: apply them one by one.
      for (const op of ops) { try { this.api.applyAnnotationBatch([op]); } catch (f) { console.warn('[seed43 collab] skipped a markup:', f); } }
    }
    const nu = new Map(this.api.getAnnotations().map((a) => [a.id, a]));
    for (const op of ops) {
      const id = op.op === 'create' ? op.annotation.id : op.id;
      if (nu.has(id)) {
        this.basis.set(id, json(nu.get(id)));
        if (op.op === 'create' && !this.lokaal.has(id) && id.startsWith('f-')) { this.lokaal.set(id, id); this.terug.set(id, id); }
      } else this.basis.delete(id);
    }
    // this.rev is left alone on purpose: an edit made while this ran must
    // still be found by the next tick (the comparison skips what came in).
  }

  async luister() {
    while (!this.stop) {
      this.afbreken = new AbortController();
      try {
        const r = await call('GET', '/v1/session/events', { access: this.k.access, device: device(),
          query: { after: this.opgehaald, wait: 20, limit: 100 }, signal: this.afbreken.signal });
        this.wachtrij.push(...r.events);
        this.opgehaald = r.cursor;
        if (r.phase !== 'edit' && !this.alleenLezen) { this.alleenLezen = true; this.zet('alleen-lezen', 'Read-only'); }
        else if (this.status.staat === 'offline') this.zet(this.alleenLezen ? 'alleen-lezen' : 'live', this.alleenLezen ? 'Read-only' : 'Live');
        if (this.actief()) await this.verwerk();
      } catch (e) {
        if (this.stop || e?.name === 'AbortError') return;
        if (e instanceof CollabError && ['gone', 'removed', 'denied'].includes(e.code)) {
          this.zet('einde', uitleg(e)); this.sluit(); return;
        }
        this.zet('offline', 'Reconnecting…');
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  async verwerk() {
    if (!this.wachtrij.length || this.bezig) return;
    this.bezig = true;
    try {
      // Apply only after our own pending changes are sent, so ours aren't lost.
      const ops = [];
      const events = this.wachtrij.splice(0);
      for (const ev of events) {
        this.koppen.set(ev.ann, ev.id);
        this.cursor = ev.revision;
        if (this.verzonden.has(ev.id)) continue;
        const data = ev.op === 'delete' ? null : await openEvent(this.k.content, ev).catch(() => null);
        if (ev.op !== 'delete' && !data) { console.warn('[seed43 collab] a markup could not be verified, ignored'); continue; }
        ops.push(...this.plan(ev.ann, ev.op, data));
      }
      if (ops.length) {
        const paginas = new Set(ops.map((o) => o.op === 'create' ? o.annotation.page
          : this.api.getAnnotations().find((a) => a.id === o.id)?.page).filter(Boolean));
        for (const p of paginas) await this.api.waitForPageAnnotations(p);
        this.toepassen(ops);
      }
    } finally {
      this.bezig = false;
    }
  }

  async tik() {
    if (this.stop || this.bezig || !this.actief()) return;
    const rev = this.api.getDocumentInfo()?.revision;
    if (rev !== this.rev && !this.alleenLezen) {
      this.bezig = true;
      try { await this.verstuur(); } finally { this.bezig = false; }
    }
    await this.verwerk();
  }

  async verstuur() {
    // The revision this comparison sees. Anything edited during the sends below
    // changes the revision again, so the next tick picks it up.
    const rev = this.api.getDocumentInfo()?.revision;
    const nu = new Map(this.api.getAnnotations().map((a) => [a.id, a]));
    const wijzigingen = [];
    for (const [id, a] of nu) {
      const j = json(a);
      if (!this.basis.has(id)) wijzigingen.push({ id, a, j, soort: 'nieuw' });
      else if (this.basis.get(id) !== j) wijzigingen.push({ id, a, j, soort: 'anders' });
    }
    for (const id of this.basis.keys()) if (!nu.has(id)) wijzigingen.push({ id, soort: 'weg' });
    for (const w of wijzigingen) {
      const key = this.sleutel(w.id);
      const kop = this.koppen.get(key) || null;
      const data = w.a ? kopie(w.a) : null;
      if (data && JSON.stringify(data).length > MAX_DATA) { console.warn('[seed43 collab] markup too large to share:', w.id); this.basis.set(w.id, w.j); continue; }
      try {
        if (w.soort === 'weg') {
          if (!kop) {
            // Never on the server yet (a PDF markup): tell the others it existed, then that it's gone.
            const vorige = JSON.parse(this.basis.get(w.id));
            await this.zend(key, 'create', null, vorige);
          }
          await this.zend(key, 'delete', this.koppen.get(key), null);
          this.basis.delete(w.id);
        } else {
          await this.zend(key, kop ? 'edit' : 'create', kop, data);
          this.basis.set(w.id, w.j);
        }
      } catch (e) {
        if (e instanceof CollabError && e.code === 'conflict') {
          // Someone changed it first: theirs is on its way in and will replace ours.
          console.warn('[seed43 collab] conflict on', key);
          this.basis.set(w.id, w.j);
          continue;
        }
        if (e instanceof CollabError && e.code === 'read_only') { this.alleenLezen = true; this.zet('alleen-lezen', 'Read-only: your changes aren\'t shared'); return; }
        if (e instanceof CollabError && ['gone', 'removed', 'denied'].includes(e.code)) { this.zet('einde', uitleg(e)); this.sluit(); return; }
        this.zet('offline', 'Reconnecting…');
        return;   // try again next tick; nothing in basis changed for this one
      }
    }
    this.rev = rev;
  }

  async zend(ann, op, base, data) {
    const ev = { id: willekeurig(), ann, op, base: op === 'create' ? null : base, data: null };
    if (data) ev.data = await sluitEvent(this.k.content, { ...ev, data });
    this.verzonden.add(ev.id);
    const r = await call('POST', '/v1/session/events', { access: this.k.access, device: device(), body: ev });
    this.koppen.set(ann, r.id);
    return r;
  }
}
