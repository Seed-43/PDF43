// Seed43 Collab: the Collab tab of the Seed43 drawer. Share a PDF by key with
// up to 2 others, join with a key, and mark it up together, end-to-end
// encrypted. The server: https://collab.seed43.org (see the Seed43 Collab design).

import { registreerLadeTab } from '../eigenschappen.js';
import { uitleg } from './client.js';
import * as S from './sessions.js';
import { Koppeling } from './sync.js';

const STIJL_ID = 'seed43-collab-stijl';
const CSS = `
.s43c{padding:10px 12px;display:flex;flex-direction:column;gap:12px;font-size:13px;}
.s43c h4{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--theme-text-secondary,#888);font-weight:600;}
.s43c-rij{display:flex;gap:8px;align-items:center;}
.s43c input{flex:1;min-width:0;box-sizing:border-box;font:inherit;padding:7px 10px;border-radius:6px;border:1px solid var(--rand);background:transparent;color:inherit;}
.s43c input:focus{outline:none;border-color:var(--acc);}
.s43c button{flex:none;font:inherit;font-size:12px;padding:6px 10px;border:1px solid var(--acc);border-radius:5px;background:none;color:inherit;cursor:pointer;white-space:nowrap;}
.s43c button:hover{background:color-mix(in srgb,var(--acc) 15%,transparent);}
.s43c button.s43c-hoofd{background:color-mix(in srgb,var(--acc) 22%,transparent);font-weight:600;}
.s43c button.s43c-gevaar{border-color:#c0392b;}
.s43c button:disabled{opacity:.5;cursor:default;}
.s43c-kaart{border:1px solid var(--rand);border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:6px;}
.s43c-titel{font-weight:700;font-size:14px;overflow-wrap:anywhere;}
.s43c-sub,.s43c-klein{color:var(--theme-text-secondary,#888);font-size:12px;}
.s43c-sleutel{font-family:ui-monospace,Consolas,monospace;font-size:12.5px;padding:6px 8px;border-radius:5px;border:1px dashed var(--acc);overflow-wrap:anywhere;user-select:all;}
.s43c-knoppen{display:flex;flex-wrap:wrap;gap:6px;}
.s43c-stoel{display:flex;align-items:center;gap:6px;}
.s43c-stoel span{flex:1;}
.s43c-stoel button{padding:1px 7px;}
.s43c-melding{padding:8px 10px;border-radius:6px;background:color-mix(in srgb,var(--acc) 12%,transparent);}
.s43c-fout{padding:8px 10px;border-radius:6px;background:color-mix(in srgb,#c0392b 18%,transparent);}
.s43c-live{display:inline-block;width:8px;height:8px;border-radius:50%;background:#888;margin-right:6px;}
.s43c-live[data-staat="live"]{background:#2ecc71;}
.s43c-live[data-staat="alleen-lezen"]{background:#e6a23c;}
.s43c-live[data-staat="offline"],.s43c-live[data-staat="einde"],.s43c-live[data-staat="fout"]{background:#c0392b;}
.s43c ul{margin:4px 0 0;padding-left:18px;}
.s43c li{margin:2px 0;}
`;

let api0 = null;
let wortel = null;          // the tab's element
const koppelingen = new Map();   // share key -> Koppeling
let melding = null;         // { soort: 'melding'|'fout', tekst }
let limieten = null;

const tauri = () => window.__TAURI__;
const datum = (t) => new Date(t * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const veilig = (t) => String(t).replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/\.pdf$/i, '').slice(0, 80) || 'Shared PDF';

function maak(tag, klasse, tekst) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst != null) e.textContent = tekst;
  return e;
}
function knop(tekst, fn, klasse = '') {
  const b = maak('button', klasse, tekst);
  b.addEventListener('click', async () => {
    b.disabled = true;
    try { await fn(); } catch (e) { zegFout(e); } finally { b.disabled = false; }
  });
  return b;
}
function zeg(tekst) { melding = { soort: 'melding', tekst }; teken(); }
function zegFout(e) { console.warn('[seed43 collab]', e); melding = { soort: 'fout', tekst: uitleg(e) }; teken(); }

function limietTekst(l) {
  const ul = maak('ul');
  for (const t of [
    `Up to ${l.maxSeats} people per PDF, including you`,
    'You can share 1 PDF at a time. When it turns read-only, or you end or delete it, you can share another',
    `${l.editDays} days of editing, then ${l.graceDays} days read-only, then the PDF and markups are deleted from our server`,
    `PDFs up to ${l.maxPdfMiB} MB`,
    'Anyone with the key can join until the seats are full, so share it only with people you trust',
    'Your PDF and markups are encrypted on your PC before upload. Seed43\'s server in New Zealand stores them but can\'t read them. Keep your key safe: if it\'s lost, nobody (not even Seed43) can recover the document',
  ]) ul.appendChild(maak('li', null, t));
  return ul;
}

// ── opening a session document in the app ───────────────────────────────

async function openInApp(s) {
  const al = koppelingen.get(s.key);
  if (al && !al.stop) { zeg('It\'s already open: look for its tab.'); return; }
  const T = tauri();
  if (!T?.fs || !T?.path || !T?.event) throw new Error('This needs the Open PDF Studio desktop app.');
  zeg('Downloading and decrypting…');
  const bytes = await S.downloadPdf(s);
  const naam = `S43 Collab - ${veilig(s.title)} - ${s.id.slice(0, 6)}.pdf`;
  const map = (await T.path.tempDir()).replace(/[\\/]$/, '');
  const pad = `${map}/${naam}`;
  await T.core.invoke('allow_fs_scope', { path: pad });
  await T.fs.writeFile(pad, bytes);
  S.werkBij(s.key, { file: pad });
  const k = new Koppeling(api0, s, naam, { bijStatus: () => teken() });
  koppelingen.set(s.key, k);
  await T.event.emit('open-files', [pad]);
  melding = null;
  k.start().catch((e) => { zegFout(e); k.sluit(); });
  teken();
}

// ── share and join ──────────────────────────────────────────────────────

let concept = null;   // { pad, bytes, titel } while the share is being confirmed

async function kiesPdf() {
  const T = tauri();
  if (!T?.dialog || !T?.fs) throw new Error('This needs the Open PDF Studio desktop app.');
  const pad = await T.dialog.open({ multiple: false, title: 'Choose the PDF to share', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (!pad || Array.isArray(pad)) return;
  await T.core.invoke('allow_fs_scope', { path: pad });
  const bytes = await T.fs.readFile(pad);
  limieten = limieten || await S.limieten();
  if (bytes.length > limieten.maxPdfMiB * 1024 * 1024) throw new Error(`That PDF is over ${limieten.maxPdfMiB} MB.`);
  concept = { pad, bytes, titel: veilig(pad.split(/[\\/]/).pop()) };
  melding = null;
  teken();
}

async function bevestigDelen() {
  const naam = S.mijnNaam();
  if (!naam) throw new Error('Type your name first: the others see it next to your seat.');
  zeg('Encrypting and uploading…');
  const s = await S.deel(concept.bytes, concept.titel, naam);
  concept = null;
  melding = { soort: 'melding', tekst: 'Shared. Copy the key below and send it to up to 2 people.' };
  teken();
  await openInApp(s);
}

async function doeMee(invoer) {
  const naam = S.mijnNaam();
  if (!naam) throw new Error('Type your name first: the others see it next to your seat.');
  zeg('Joining…');
  const s = await S.doeMee(invoer.value, naam);
  invoer.value = '';
  await openInApp(s);
}

// ── the tab ─────────────────────────────────────────────────────────────

const statussen = new Map();   // key -> last status from the server (seats etc.)

async function ververs() {
  for (const s of S.lijst()) {
    try { statussen.set(s.key, await S.status(s)); }
    catch (e) {
      if (['gone', 'denied'].includes(e?.code)) statussen.set(s.key, { fout: uitleg(e), weg: true });
      else if (e?.code === 'removed') statussen.set(s.key, { fout: uitleg(e), weg: true });
      else statussen.set(s.key, { fout: uitleg(e) });
    }
  }
  teken();
}

function sessieKaart(s) {
  const st = statussen.get(s.key);
  const k = koppelingen.get(s.key);
  const kaart = maak('div', 's43c-kaart');
  kaart.appendChild(maak('div', 's43c-titel', s.title));
  const fase = st?.phase || s.phase;
  const nu = Date.now() / 1000;
  const regel = st?.fout ? st.fout
    : (fase === 'edit' || (!fase && s.editUntil > nu)) ? `${s.role === 'owner' ? 'You shared this' : 'Shared with you'} · editing until ${datum(s.editUntil)}`
    : `Read-only · deleted on ${datum(s.deleteAt)}`;
  kaart.appendChild(maak('div', 's43c-sub', regel));
  if (k) {
    const l = maak('div', 's43c-klein');
    const stip = maak('span', 's43c-live'); stip.dataset.staat = k.status.staat;
    l.append(stip, document.createTextNode(k.status.tekst));
    kaart.appendChild(l);
  }
  if (st?.seats) {
    for (const seat of st.seats) {
      const r = maak('div', 's43c-stoel');
      r.appendChild(maak('span', null, `${seat.seat}. ${seat.name}${seat.owner ? ' (owner)' : ''}${seat.you ? ' · you' : ''}`));
      if (s.role === 'owner' && !seat.owner) r.appendChild(knop('Remove', async () => { await S.verwijderStoel(s, seat.seat); await ververs(); }));
      kaart.appendChild(r);
    }
    kaart.appendChild(maak('div', 's43c-klein', `${st.seats.length} of ${st.maxSeats} seats taken`));
  }
  const knoppen = maak('div', 's43c-knoppen');
  if (!st?.weg) {
    knoppen.appendChild(knop(k && !k.stop ? 'Open (already open)' : 'Open', () => openInApp(s), 's43c-hoofd'));
    knoppen.appendChild(knop('Copy key', async () => { await navigator.clipboard.writeText(s.key); zeg('Key copied.'); }));
  }
  if (s.role === 'owner' && !st?.weg) {
    if ((st?.phase || 'edit') === 'edit') knoppen.appendChild(knop('End now', async () => {
      if (!await vraag(`End editing on '${s.title}' now? It turns read-only straight away. Everyone can still download it for ${limieten?.graceDays ?? 7} days.`)) return;
      await S.beeindig(s); await ververs();
    }));
    knoppen.appendChild(knop('Delete now', async () => {
      if (!await vraag(`Delete '${s.title}' from the server now? The other people lose access straight away, and this can't be undone. Save your own copy first (File › Save As on its tab).`)) return;
      koppelingen.get(s.key)?.sluit(); koppelingen.delete(s.key);
      await S.verwijder(s); statussen.delete(s.key); zeg('Deleted from the server.');
    }, 's43c-gevaar'));
  } else {
    knoppen.appendChild(knop('Forget', async () => {
      if (!await vraag(`Remove '${s.title}' from this list? You'd need the key to join again.`)) return;
      koppelingen.get(s.key)?.sluit(); koppelingen.delete(s.key); S.vergeet(s.key); statussen.delete(s.key); teken();
    }));
  }
  if (s.role === 'owner' && !st?.weg) {
    const sl = maak('div', 's43c-sleutel', s.key);
    sl.title = 'The share key: send it to the people you want to mark up with';
    kaart.appendChild(sl);
  }
  kaart.appendChild(knoppen);
  return kaart;
}

async function vraag(tekst) {
  const T = tauri();
  if (T?.dialog?.ask) return T.dialog.ask(tekst, { title: 'Seed43 Collab', kind: 'warning' });
  return window.confirm(tekst);
}

function teken() {
  if (!wortel) return;
  const w = maak('div', 's43c');
  if (melding) w.appendChild(maak('div', melding.soort === 'fout' ? 's43c-fout' : 's43c-melding', melding.tekst));

  // Your name
  const naamVak = maak('div');
  naamVak.appendChild(maak('h4', null, 'Your name'));
  const naam = maak('input');
  naam.placeholder = 'Shown to the others next to your seat';
  naam.value = S.mijnNaam();
  naam.addEventListener('change', () => S.zetNaam(naam.value));
  naamVak.appendChild(naam);
  w.appendChild(naamVak);

  if (concept) {
    const k = maak('div', 's43c-kaart');
    k.appendChild(maak('div', 's43c-titel', `Share '${concept.titel}'?`));
    k.appendChild(maak('div', 's43c-klein', 'Seed43 Collab is free:'));
    if (limieten) k.appendChild(limietTekst(limieten));
    k.appendChild(maak('div', 's43c-klein', 'Markups already in the PDF are shared too. Save your PDF first if it has unsaved changes.'));
    const kn = maak('div', 's43c-knoppen');
    kn.append(knop('Share', bevestigDelen, 's43c-hoofd'), knop('Cancel', async () => { concept = null; teken(); }));
    k.appendChild(kn);
    w.appendChild(k);
  } else {
    const deel = maak('div');
    deel.appendChild(maak('h4', null, 'Share'));
    deel.appendChild(knop('Share a PDF…', kiesPdf, 's43c-hoofd'));
    w.appendChild(deel);
  }

  const mee = maak('div');
  mee.appendChild(maak('h4', null, 'Join'));
  const r = maak('div', 's43c-rij');
  const invoer = maak('input');
  invoer.placeholder = 'Paste a key: S43-XXXX-XXXX-…';
  invoer.spellcheck = false;
  r.append(invoer, knop('Join', () => doeMee(invoer)));
  mee.appendChild(r);
  w.appendChild(mee);

  const l = S.lijst();
  if (l.length) {
    const vak = maak('div');
    const kop = maak('div', 's43c-rij');
    const h = maak('h4', null, 'Your sessions'); h.style.flex = '1';
    kop.append(h, knop('Refresh', ververs));
    vak.appendChild(kop);
    const kaarten = maak('div'); kaarten.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    for (const s of l) kaarten.appendChild(sessieKaart(s));
    vak.appendChild(kaarten);
    w.appendChild(vak);
  }

  if (limieten && !concept) {
    const v = maak('details');
    v.appendChild(maak('summary', 's43c-klein', 'The limits of the free service'));
    v.appendChild(limietTekst(limieten));
    w.appendChild(v);
  }
  wortel.replaceChildren(w);
}

export function startCollab(api) {
  api0 = api;
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
  registreerLadeTab('collab', {
    bouw: () => {
      wortel = maak('div');
      teken();
      S.limieten().then((l) => { limieten = l; teken(); }).catch(() => {});
      ververs().catch(() => {});
      return wortel;
    },
    ververs: () => { teken(); ververs().catch(() => {}); },
  });
}

export function stopCollab() {
  for (const k of koppelingen.values()) k.sluit();
  koppelingen.clear();
  registreerLadeTab('collab', null);
  wortel = null;
}
