// Seed43 Collab: the Collab tab of the Seed43 drawer. Share a PDF by key with
// up to 2 others, join with a key, and mark it up together, end-to-end
// encrypted. The server: https://collab.seed43.org (see the Seed43 Collab design).

import { registreerLadeTab, toonLadeTab } from '../eigenschappen.js';
import { maakQa, zetStoelBron, zetNaamBron, verversQa, stoelKleur, stopQa, qaNaam, QA_CSS } from '../stamps/qa.js';
import { uitleg } from './client.js';
import * as S from './sessions.js';
import { Koppeling } from './sync.js';
import { startPaginaSlot } from './paginaslot.js';
import { openLink } from '../extern.js';

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
.s43c-live[data-staat="alleen-lezen"],.s43c-live[data-staat="gepauzeerd"]{background:#e6a23c;}
.s43c-live[data-staat="offline"],.s43c-live[data-staat="einde"],.s43c-live[data-staat="fout"]{background:#c0392b;}
.s43c ul{margin:4px 0 0;padding-left:18px;}
.s43c li{margin:2px 0;}
.s43c-wie{position:fixed;z-index:940;padding:5px 12px;border-radius:999px;font:600 12.5px system-ui,Segoe UI,sans-serif;
  background:var(--theme-surface,#fff);color:var(--theme-text,#1f2328);border:1px solid var(--theme-accent,#0078d7);
  box-shadow:0 3px 12px rgba(0,0,0,.25);pointer-events:none;transform:translateX(-50%);white-space:nowrap;}
.s43c-wie span{font-weight:400;opacity:.75;margin-left:6px;}
.s43c-band{position:fixed;z-index:939;display:flex;align-items:center;gap:8px;padding:4px 12px 4px 10px;border-radius:0 0 8px 0;
  font:600 12px system-ui,Segoe UI,sans-serif;background:var(--theme-accent,#0078d7);color:#fff;cursor:pointer;
  box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap;}
.s43c-band span{font-weight:400;opacity:.9;}
.s43c-steun{border:1px solid color-mix(in srgb,#208A3C 60%,var(--rand));border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px;
  background:color-mix(in srgb,#208A3C 8%,transparent);}
.s43c-steun .kop{font-weight:800;font-size:14px;}
.s43c-meter{position:relative;height:12px;border-radius:6px;background:color-mix(in srgb,var(--tx) 14%,transparent);margin:4px 0 22px;}
.s43c-meter .vol{height:100%;border-radius:6px;background:linear-gradient(90deg,#1f893c,#3fb35a);}
.s43c-meter .mp{position:absolute;top:-4px;width:2px;height:20px;background:var(--tx);opacity:.55;}
.s43c-meter .ml{position:absolute;top:18px;transform:translateX(-50%);font-size:10.5px;color:var(--theme-text-secondary,#888);white-space:nowrap;}
.s43c-meter .ml.eind{transform:translateX(-100%);}
.s43c-steun .som{font-size:13px;}
.s43c-steun .som b{font-size:15px;}
.s43c button.s43c-koffie{border-color:#3fb35a;background:color-mix(in srgb,#208A3C 25%,transparent);font-weight:700;}
.s43c-band i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#2ecc71;font-style:normal;}
.s43c-band i[data-staat="alleen-lezen"],.s43c-band i[data-staat="gepauzeerd"]{background:#f5c04a;}
.s43c-band i[data-staat="offline"],.s43c-band i[data-staat="einde"],.s43c-band i[data-staat="fout"]{background:#ff6b6b;}
.s43c-qa{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none;}
${QA_CSS}
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
    'The PDF\'s pages are locked: everyone marks up the same pages, and nobody can add, delete or replace them',
    'Anyone with the key can join until the seats are full, so share it only with people you trust',
    'Your PDF and markups are encrypted on your PC before upload. Seed43\'s server in New Zealand stores them but can\'t read them. Keep your key safe: if it\'s lost, nobody (not even Seed43) can recover the document',
  ]) ul.appendChild(maak('li', null, t));
  return ul;
}

// ── opening a session document in the app ───────────────────────────────

async function openInApp(s) {
  const al = koppelingen.get(s.key);
  if (al && !al.stop && al.actief()) { zeg('It\'s open: it\'s the tab you\'re on.'); return; }
  // Any earlier copy stops syncing. Its tab may have been closed (an extension
  // can't see that), and an edited copy can't be matched to the server again:
  // a fresh copy of the PDF, caught up from the server, always can.
  al?.sluit();
  koppelingen.delete(s.key);
  const T = tauri();
  if (!T?.fs || !T?.path || !T?.event) throw new Error('This needs the Open PDF Studio desktop app.');
  zeg('Downloading and decrypting…');
  const bytes = await S.downloadPdf(s);
  // A new name each time, so the app opens a new tab rather than switching to
  // an old one that's no longer synced.
  const naam = `S43 Collab - ${veilig(s.title).slice(0, 60)} - ${s.id.slice(0, 6)}${Date.now().toString(36).slice(-4)}.pdf`;
  const map = (await T.path.tempDir()).replace(/[\\/]$/, '');
  const pad = `${map}/${naam}`;
  await T.core.invoke('allow_fs_scope', { path: pad });
  await T.fs.writeFile(pad, bytes);
  const eerder = S.lijst().find((x) => x.key === s.key);
  S.werkBij(s.key, { files: [...new Set([...(eerder?.files || []), ...(eerder?.file ? [eerder.file] : []), pad])], file: null });
  const k = new Koppeling(api0, s, naam, { bijStatus: () => teken() });
  koppelingen.set(s.key, k);
  await T.event.emit('open-files', [pad]);
  melding = { soort: 'melding', tekst: 'Opened in a new tab. If you still have an older tab of this PDF open, close it: only the new one is live.' };
  k.start().catch((e) => { zegFout(e); k.sluit(); });
  teken();
}

/**
 * Delete this PC's decrypted copies of a session's PDF (the temp files Open
 * writes). They're readable, so they shouldn't outlive the session: they go
 * on Delete now, Forget, and once the session has ended or been deleted.
 * A copy the system already cleared, or that can't be removed (open in
 * another program on Windows), is skipped and tried again next time.
 */
async function wisKopieen(s) {
  const T = tauri();
  const paden = [...new Set([...(s.files || []), ...(s.file ? [s.file] : [])])];
  if (!paden.length || !T?.fs) return;
  const over = [];
  for (const pad of paden) {
    try {
      await T.core.invoke('allow_fs_scope', { path: pad });
      if (await T.fs.exists(pad)) await T.fs.remove(pad);
    } catch (e) {
      console.warn('[seed43 collab] could not remove a copy yet:', e);
      over.push(pad);
    }
  }
  S.werkBij(s.key, { files: over, file: null });
}

/** At start-up: copies of sessions past their delete date go, and so do the sessions. */
async function ruimOp() {
  const nu = Date.now() / 1000;
  for (const s of S.lijst()) {
    if (s.deleteAt && s.deleteAt <= nu) {
      await wisKopieen(s);
      if (!(S.lijst().find((x) => x.key === s.key)?.files || []).length) S.vergeet(s.key);
    }
  }
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

// ── support meter (Buy Me a Coffee goal, set on seed43.org) ─────────────

const STEUN_URL = 'https://seed43.org/collab/support';
const STEUN_CACHE = 'seed43.collab.support';
let steun = null;

/** Totals only: goal, raised, milestone points, supporter count. Cached for an hour. */
async function laadSteun() {
  try {
    const c = JSON.parse(localStorage.getItem(STEUN_CACHE) || 'null');
    if (c && Date.now() - c.at < 3600e3) { steun = c.data; return; }
    if (c) steun = c.data;
  } catch {}
  try {
    const r = await fetch(STEUN_URL, { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    if (typeof d?.goalNzd !== 'number' || typeof d?.raisedNzd !== 'number') return;
    steun = d;
    try { localStorage.setItem(STEUN_CACHE, JSON.stringify({ at: Date.now(), data: d })); } catch {}
    teken();
  } catch {}
}

const nzd = (n) => '$' + Math.round(n).toLocaleString('en-NZ');

function steunKaart() {
  const k = maak('div', 's43c-steun');
  k.appendChild(maak('div', 'kop', 'Help Seed43 Collab grow'));
  if (steun && steun.goalNzd > 0) {
    const pct = Math.max(0, Math.min(100, (steun.raisedNzd / steun.goalNzd) * 100));
    const m = maak('div', 's43c-meter');
    const vol = maak('div', 'vol'); vol.style.width = pct + '%';
    m.appendChild(vol);
    const punten = [...(steun.milestonesNzd || []).map((v, i) => [v, `M${i + 1}`]), [steun.goalNzd, 'Goal']];
    for (const [v, naam] of punten) {
      const x = Math.min(100, (v / steun.goalNzd) * 100);
      const mp = maak('div', 'mp'); mp.style.left = `calc(${x}% - 1px)`;
      const ml = maak('div', 'ml' + (x >= 99 ? ' eind' : ''), `${naam} ${nzd(v)}`); ml.style.left = x + '%';
      ml.title = naam === 'Goal' ? `Goal: ${nzd(v)}` : `Milestone ${naam.slice(1)}: ${nzd(v)}`;
      m.append(mp, ml);
    }
    k.appendChild(m);
    const som = maak('div', 'som');
    som.innerHTML = `<b>${nzd(steun.raisedNzd)}</b> of ${nzd(steun.goalNzd)} NZD (${Math.round(pct)}%)`
      + (steun.supporters ? ` · ${steun.supporters} supporter${steun.supporters === 1 ? '' : 's'}` : '');
    k.appendChild(som);
  }
  k.appendChild(maak('div', 's43c-klein', 'Seed43 Collab runs on Seed43\'s own server. Your support helps it grow.'));
  const kn = maak('div', 's43c-knoppen');
  kn.appendChild(knop('Support Seed43', async () => {
    const url = steun?.url || 'https://buymeacoffee.com/Seed43';
    // Some Linux setups can't start the browser from the app (an AppImage with a
    // WebKit browser such as GNOME Web as the default): copy the link as well.
    try { await navigator.clipboard.writeText(url); } catch {}
    zeg(`Opening the support page. If your browser didn't open, the link is copied: ${url.replace(/^https?:\/\//, '')}`);
    await openLink(url);
  }, 's43c-koffie'));
  k.appendChild(kn);
  return k;
}

// ── the tab ─────────────────────────────────────────────────────────────

const statussen = new Map();   // key -> last status from the server (seats etc.)

async function ververs() {
  for (const s of S.lijst()) {
    try { statussen.set(s.key, await S.status(s)); }
    catch (e) {
      if (['gone', 'denied', 'removed'].includes(e?.code)) {
        statussen.set(s.key, { fout: uitleg(e), weg: true });
        await wisKopieen(s);
      }
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
  // (Pages locked: a later paid tier may allow new page versions.)
  kaart.appendChild(maak('div', 's43c-sub', regel));
  if (!st?.weg) kaart.appendChild(maak('div', 's43c-klein', '🔒 Pages locked: markups only'));
  if (k) {
    const l = maak('div', 's43c-klein');
    const stip = maak('span', 's43c-live'); stip.dataset.staat = k.status.staat;
    l.append(stip, document.createTextNode(k.status.tekst));
    kaart.appendChild(l);
  }
  if (st?.seats) {
    for (const seat of st.seats) {
      const r = maak('div', 's43c-stoel');
      // The seat's QA colour (By seat): seat 1 Check 1, seat 2 Check 2, seat 3 Check 3.
      const qk = stoelKleur(seat.seat);
      if (qk) { const stip = maak('i', 's43c-qa'); stip.style.background = qk.kleur; stip.title = `Seat ${seat.seat} draws as ${qk.label} (${qaNaam(qk)}) with QA colours By seat`; r.appendChild(stip); }
      r.appendChild(maak('span', null, `${seat.seat}. ${seat.name}${seat.owner ? ' (owner)' : ''}${seat.you ? ' · you' : ''}`));
      if (s.role === 'owner' && !seat.owner) r.appendChild(knop('Remove', async () => { await S.verwijderStoel(s, seat.seat); await ververs(); }));
      kaart.appendChild(r);
    }
    kaart.appendChild(maak('div', 's43c-klein', `${st.seats.length} of ${st.maxSeats} seats taken`));
  }
  const knoppen = maak('div', 's43c-knoppen');
  if (!st?.weg) {
    knoppen.appendChild(knop('Open', () => openInApp(s), 's43c-hoofd'));
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
      await S.verwijder(s); await wisKopieen(s); statussen.delete(s.key);
      zeg('Deleted from the server, and this PC\'s temporary copy removed.');
    }, 's43c-gevaar'));
  } else {
    knoppen.appendChild(knop('Forget', async () => {
      if (!await vraag(`Remove '${s.title}' from this list? You'd need the key to join again.`)) return;
      koppelingen.get(s.key)?.sluit(); koppelingen.delete(s.key); await wisKopieen(s); S.vergeet(s.key); statussen.delete(s.key); teken();
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
  verversQa();
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

  w.appendChild(steunKaart());

  if (limieten && !concept) {
    const v = maak('details');
    v.appendChild(maak('summary', 's43c-klein', 'The limits of the free service'));
    v.appendChild(limietTekst(limieten));
    w.appendChild(v);
  }
  wortel.replaceChildren(w);
}

// ── whose markup is this? ───────────────────────────────────────────────

let wieTag = null;

/** On selecting one markup in a live session tab: a tag at the top of the page saying whose it is. */
function toonWie(gekozen) {
  const k = [...koppelingen.values()].find((x) => !x.stop && x.actief() && x.mijnStoel != null);
  const a = gekozen?.length === 1 ? gekozen[0] : null;
  if (!k || !a) { wieTag?.remove(); wieTag = null; return; }
  const seat = k.makerVan(k.sleutel(a.id));
  if (seat != null && !k.namen.has(seat)) k.verversNamen().then(() => { if (wieTag && k.namen.has(seat)) toonWie(gekozen); });
  const mijn = seat === k.mijnStoel;
  if (!wieTag) { wieTag = maak('div', 's43c-wie'); document.body.appendChild(wieTag); }
  wieTag.replaceChildren(document.createTextNode(mijn ? 'Your markup' : `${k.naamVan(seat)}'s markup`));
  if (!mijn) wieTag.appendChild(maak('span', null, 'locked: only they can change it'));
  const v = document.querySelector('.main-view')?.getBoundingClientRect();
  wieTag.style.left = `${v ? v.left + v.width / 2 : window.innerWidth / 2}px`;
  wieTag.style.top = `${(v ? v.top : 60) + 10}px`;
}

// ── the banner on a shared PDF ──────────────────────────────────────────

let band = null;
const actieveKoppeling = () => [...koppelingen.values()].find((x) => !x.stop && x.actief());

/** While a shared PDF's tab is active: a banner at the top-left of the page view. */
function tekenBand() {
  const k = actieveKoppeling();
  if (!k) { band?.remove(); band = null; return; }
  if (!band) {
    band = maak('div', 's43c-band');
    band.title = 'Seed43 Collab: open the Collab tab';
    band.addEventListener('click', () => toonLadeTab('collab'));
    document.body.appendChild(band);
  }
  const mensen = k.namen.size;
  const stip = maak('i'); stip.dataset.staat = k.status.staat;
  band.replaceChildren(stip, document.createTextNode(`Seed43 Collab · ${k.status.tekst}`),
    maak('span', null, `🔒 pages locked${mensen ? ` · ${mensen} ${mensen === 1 ? 'person' : 'people'}` : ''}`));
  const v = document.querySelector('.main-view')?.getBoundingClientRect();
  band.style.left = `${v ? v.left : 0}px`;
  band.style.top = `${v ? v.top : 0}px`;
}

export function startCollab(api) {
  api0 = api;
  startPaginaSlot(() => !!actieveKoppeling());
  setInterval(tekenBand, 500);
  try { api.onSelectionChange?.((gekozen) => toonWie(gekozen)); } catch (e) { console.warn('[seed43 collab] selection:', e); }
  ruimOp().catch((e) => console.warn('[seed43 collab] clean-up:', e));
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
  // QA colours By seat: this PC's seat in the shared PDF on show.
  const opScherm = () => [...koppelingen.values()].find((x) => !x.stop && x.actief() && x.mijnStoel != null);
  zetStoelBron(() => opScherm()?.mijnStoel ?? null);
  // Check 1-3 take the names of the people in seats 1-3.
  zetNaamBron((stoel) => opScherm()?.namen.get(stoel) || null);
  registreerLadeTab('collab', {
    bouw: () => {
      const tab = maak('div');
      tab.appendChild(maakQa(api, 'seed43Stamp', { collab: true }));
      wortel = maak('div');
      tab.appendChild(wortel);
      teken();
      S.limieten().then((l) => { limieten = l; teken(); }).catch(() => {});
      laadSteun();
      ververs().catch(() => {});
      return tab;
    },
    ververs: () => { teken(); ververs().catch(() => {}); },
  });
}

export function stopCollab() {
  wieTag?.remove(); wieTag = null;
  band?.remove(); band = null;
  for (const k of koppelingen.values()) k.sluit();
  koppelingen.clear();
  registreerLadeTab('collab', null);
  stopQa('collab');
  zetStoelBron(null);
  zetNaamBron(null);
  wortel = null;
}
