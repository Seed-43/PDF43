// One participant in the live Collab test: its own localStorage (so its own
// device secret) and a fake Open PDF Studio document. Driven by messages.
import { parentPort, workerData } from 'node:worker_threads';
const opslag = new Map();
globalThis.localStorage = { getItem: (k) => opslag.get(k) ?? null, setItem: (k, v) => opslag.set(k, String(v)), removeItem: (k) => opslag.delete(k) };
const S = await import('../src/collab/sessions.js');
const { Koppeling } = await import('../src/collab/sync.js');

const doc = { name: null, revision: 0, annotations: [], pages: [[612, 792], [612, 792], [842, 595]] };
const api = {
  getDocumentInfo: () => doc.name ? { name: doc.name, revision: doc.revision } : null,
  getAnnotations: () => doc.annotations,
  getPageCount: () => doc.pages.length,
  getPageInfo: async (n) => ({ width: doc.pages[n - 1][0], height: doc.pages[n - 1][1], rotation: 0 }),
  waitForPageAnnotations: async () => doc.annotations,
  applyAnnotationBatch(ops) {
    for (const o of ops) {
      if (o.op === 'create') { if (doc.annotations.some((a) => a.id === o.annotation.id)) throw new Error('dup'); doc.annotations.push(structuredClone(o.annotation)); }
      else if (o.op === 'update') Object.assign(doc.annotations.find((a) => a.id === o.id), structuredClone(o.changes));
      else doc.annotations.splice(doc.annotations.findIndex((a) => a.id === o.id), 1);
    }
    doc.revision++;
  },
};
let sessie = null, koppeling = null;
const pdfMarkups = (workerData.pdfMarkups || []).map((m, i) => ({ ...m, id: `${workerData.naam}-load-${i}` }));  // per-PC ids, like the real loader

parentPort.on('message', async ({ id, cmd, arg }) => {
  try {
    let r = null;
    if (cmd === 'deel') { sessie = await S.deel(new Uint8Array(arg.pdf), arg.titel, workerData.naam); r = { key: sessie.key }; }
    else if (cmd === 'doeMee') { sessie = await S.doeMee(arg, workerData.naam); r = { title: sessie.title }; }
    else if (cmd === 'open') {
      const bytes = await S.downloadPdf(sessie);
      doc.name = 'S43 test.pdf'; doc.annotations = structuredClone(pdfMarkups); doc.revision = 1;
      koppeling = new Koppeling(api, sessie, doc.name);
      await koppeling.start();
      r = { pdfLength: bytes.length, staat: koppeling.status.staat };
    }
    else if (cmd === 'teken') { doc.annotations.push(structuredClone(arg)); doc.revision++; }
    else if (cmd === 'wijzig') { const a = doc.annotations.find((x) => x.id === arg.id || x.subject === arg.subject); Object.assign(a, arg.changes); doc.revision++; }
    else if (cmd === 'wis') { doc.annotations.splice(doc.annotations.findIndex((x) => x.subject === arg), 1); doc.revision++; }
    else if (cmd === 'debug') r = { status: koppeling.status, cursor: koppeling.cursor, opgehaald: koppeling.opgehaald, wachtrij: koppeling.wachtrij.length, bezig: koppeling.bezig, rev: koppeling.rev, docrev: doc.revision, koppen: [...koppeling.koppen] };
    else if (cmd === 'stand') r = doc.annotations.map(({ id, locked, ...a }) => a).sort((x, y) => (x.subject > y.subject ? 1 : -1));
    else if (cmd === 'slot') r = Object.fromEntries(doc.annotations.map((a) => [a.subject, !!a.locked]));
    else if (cmd === 'melding') r = koppeling.status.tekst;
    else if (cmd === 'paginaWeg') { doc.weg = doc.pages.pop(); doc.revision++; }
    else if (cmd === 'paginaTerug') { doc.pages.push(doc.weg); doc.revision++; }
    else if (cmd === 'status') r = await S.status(sessie);
    else if (cmd === 'stop') { koppeling?.sluit(); }
    else if (cmd === 'verwijder') { await S.verwijder(sessie); }
    else if (cmd === 'beeindig') { r = await S.beeindig(sessie); }
    parentPort.postMessage({ id, r });
  } catch (e) {
    parentPort.postMessage({ id, fout: { code: e.code, message: e.message } });
  }
});
