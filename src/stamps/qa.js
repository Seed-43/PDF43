// QA colours: pick who you are checking as (Check 1, 2, 3 or Approved) and
// every markup you draw from then on takes that checker's colour, whatever
// tool made it. The rule that goes with it: cloud a QA markup once it is done.
//
// Seed43 Collab: in a shared PDF the seat decides, nothing to pick. Seat 1
// (who shared it) draws as Check 1, the two who join as Check 2 and Check 3.
// The checks carry those people's names, and the owner may set the colours.
// The Collab tab shows this as a key; the choice above is for other PDFs.
//
// One setting and one watcher for the whole extension; the bar shows in the
// Stamps tab and in the Collab tab, and both stay in step.
//
// The host has no "markup created" event, so new markups are spotted by id.
// Locked markups (other people's, in a Seed43 Collab PDF) are never touched.

export const QA_KLEUREN = [
  { id: 'off', label: 'Off', kleur: null },
  { id: 'c1', label: 'Check 1', kleur: '#008000' },
  { id: 'c2', label: 'Check 2', kleur: '#ff8040' },
  { id: 'c3', label: 'Check 3', kleur: '#ff00ff' },
  { id: 'ok', label: 'Approved', kleur: '#ff0000', markeer: '#ffff00' },
];

const PER_STOEL = { 1: 'c1', 2: 'c2', 3: 'c3' };
const STOEL_VAN = { c1: 1, c2: 2, c3: 3 };

/** The QA colour of a Collab seat (1-3), or null. */
export function stoelKleur(stoel) {
  return metKleur(QA_KLEUREN.find((k) => k.id === PER_STOEL[stoel])) || null;
}

const OPSLAG = 'seed43.qaChecker';
let keuze = leesKeuze();
let klok = null;
let api = null, eigenType = null;
let doc = null, bekend = new Set();
const houders = new Set();       // who started the watcher (stamps, collab)
const balken = new Set();        // redraw functions of the bars on show
let stoelBron = () => null;      // this PC's seat in the shared PDF on show
let naamBron = () => null;       // the name of the person in a seat of that PDF
let kleurBron = () => null;      // the owner's colour for a check in that PDF
let kleurStand = '';             // to redraw the bars when those colours change

function leesKeuze() {
  try { const k = localStorage.getItem(OPSLAG) || 'off'; return QA_KLEUREN.some((x) => x.id === k) ? k : 'off'; } catch { return 'off'; }
}

/** Collab tells which seat this PC has in the shared PDF on show (or null). */
export function zetStoelBron(fn) { stoelBron = typeof fn === 'function' ? fn : () => null; }

/** Collab tells the name of the person in a seat (1-3) of the shared PDF on show. */
export function zetNaamBron(fn) { naamBron = typeof fn === 'function' ? fn : () => null; }

/** Collab gives the colours the owner set for the shared PDF on show: id -> colour or null. */
export function zetKleurBron(fn) { kleurBron = typeof fn === 'function' ? fn : () => null; }

/** A choice with the colour in force (the owner's, in a shared PDF). */
function metKleur(k) {
  if (!k) return k;
  let c = null;
  try { c = kleurBron(k.id); } catch {}
  return /^#[0-9a-f]{6}$/i.test(c || '') ? { ...k, kleur: c } : k;
}

/** What a choice is called: Check 1-3 take the seat's name in a shared PDF. */
export function qaNaam(k) {
  const stoel = STOEL_VAN[k?.id];
  let naam = null;
  if (stoel) { try { naam = naamBron(stoel); } catch {} }
  return (naam && String(naam).trim()) || k?.label || '';
}

/** The colour new markups take now, or null. */
function mijnStoel() { try { return stoelBron() ?? null; } catch { return null; } }

function huidig() {
  // A shared PDF: your seat's colour, always.
  const stoel = mijnStoel();
  if (stoel != null) return stoelKleur(stoel);
  return metKleur(QA_KLEUREN.find((x) => x.id === keuze && x.kleur)) || null;
}

function tik() {
  // The owner changed the colours (or another shared PDF came on screen): redraw the bars.
  const stand = [mijnStoel(), ...['c1', 'c2', 'c3'].map((id) => { try { return `${kleurBron(id) || ''}/${naamBron(STOEL_VAN[id]) || ''}`; } catch { return ''; } })].join();
  if (stand !== kleurStand) { kleurStand = stand; for (const teken of balken) teken(); }
  const k = huidig();
  const lijst = api.getAnnotations?.() || [];
  const d = api.getDocumentInfo?.()?.id || null;
  if (d !== doc) { doc = d; bekend = new Set(lijst.map((a) => a.id)); return; }
  if (!k?.kleur) { for (const a of lijst) bekend.add(a.id); return; }
  const ops = [];
  for (const a of lijst) {
    if (bekend.has(a.id)) continue;
    bekend.add(a.id);
    if (a.locked || a.type === eigenType || String(a.type).startsWith('seed43')) continue;
    const kleur = /highlight/i.test(a.type) && k.markeer ? k.markeer : k.kleur;
    ops.push({ op: 'update', id: a.id, changes: { color: kleur, strokeColor: kleur, subject: a.subject ? a.subject : qaNaam(k) } });
  }
  if (ops.length) { try { api.applyAnnotationBatch(ops); api.redrawAnnotations?.(); } catch (e) { console.warn('[seed43 qa]', e); } }
}

/** Start the watcher (once for the extension; `wie` names the starter). */
export function startQa(a, type, wie) {
  api = a; if (type) eigenType = type;
  houders.add(wie);
  if (!klok) { klok = setInterval(tik, 350); tik(); }
}

/** Stop for `wie`; the watcher stops when nobody needs it. */
export function stopQa(wie) {
  if (wie) houders.delete(wie); else houders.clear();
  if (!houders.size) { clearInterval(klok); klok = null; }
}

function kies(id) {
  keuze = id;
  try { localStorage.setItem(OPSLAG, keuze); } catch {}
  bekend = new Set((api?.getAnnotations?.() || []).map((x) => x.id));
  for (const teken of balken) teken();
}

/**
 * The QA colours bar. In the Stamps tab: pick who you check as. In the Collab
 * tab (`collab`): the key of a shared PDF, the three seats with their names
 * and colours, yours marked; the seat decides, so there is nothing to pick.
 */
export function maakQa(a, type, { collab = false } = {}) {
  startQa(a, type, collab ? 'collab' : 'stamps');
  const el = document.createElement('div');
  el.className = 's43q';
  el.innerHTML = '<div class="s43q-kop">QA colours <span title="Markups you draw take the checker\'s colour. Cloud each QA markup once it is done.">ⓘ</span></div>';
  const rij = document.createElement('div');
  rij.className = 's43q-rij';
  const noot = document.createElement('div');
  noot.className = 's43q-noot';
  const chip = (k, aan, klik) => {
    const b = document.createElement(klik ? 'button' : 'span');
    b.className = 's43q-knop';
    b.dataset.aan = aan ? '1' : '0';
    if (k.kleur) { const i = document.createElement('i'); i.style.background = k.kleur; b.appendChild(i); }
    b.appendChild(document.createTextNode(k.kleur ? qaNaam(k) : k.label));
    if (klik) b.addEventListener('click', klik);
    return b;
  };
  const teken = () => {
    if (!el.isConnected && el.dataset.getekend) { balken.delete(teken); return; }
    el.dataset.getekend = '1';
    rij.replaceChildren();
    const stoel = mijnStoel();
    if (collab) {
      for (const n of [1, 2, 3]) {
        const k = stoelKleur(n);
        const c = chip(k, n === stoel);
        c.title = `Seat ${n}${n === 1 ? ' (who shared the PDF)' : ''} draws as ${k.label}${n === stoel ? ': that is you' : ''}`;
        if (n === stoel) c.appendChild(document.createTextNode(' (you)'));
        rij.appendChild(c);
      }
      noot.textContent = stoel != null
        ? 'In this shared PDF your markups take your seat\'s colour.'
        : 'In a shared PDF the seat decides: seat 1 (who shared it) draws as Check 1, the two who join as Check 2 and Check 3.';
      noot.hidden = false;
      return;
    }
    for (const k0 of QA_KLEUREN) {
      const k = metKleur(k0);
      const b = chip(k, k.id === keuze, () => kies(k.id));
      b.title = k.kleur ? `Draw as ${k.label}: new markups turn this colour` : 'Markups keep their own colours';
      rij.appendChild(b);
    }
    if (stoel != null) {
      const k = stoelKleur(stoel);
      noot.textContent = `In this shared PDF you draw as ${qaNaam(k)} (seat ${stoel}); this choice is for other PDFs.`;
      noot.hidden = false;
    } else noot.hidden = true;
  };
  balken.add(teken);
  teken();
  el.append(rij, noot);
  return el;
}

/** Redraw the bars (the seat may have changed). */
export function verversQa() { for (const teken of balken) teken(); }

export const QA_CSS = `
.s43q{padding:8px 12px;border-bottom:1px solid var(--rand,#c8ccd1);}
.s43q-kop{font-size:11.5px;opacity:.75;margin-bottom:5px;}
.s43q-kop span{cursor:help;}
.s43q-rij{display:flex;flex-wrap:wrap;gap:4px;}
.s43q-knop{display:flex;align-items:center;gap:5px;font:inherit;font-size:12px;padding:3px 8px;border:1px solid var(--rand,#c8ccd1);
  border-radius:12px;background:none;color:inherit;cursor:pointer;}
.s43q-knop i{width:9px;height:9px;border-radius:50%;display:inline-block;}
span.s43q-knop{cursor:default;}
.s43q-knop[data-aan="1"]{border-color:var(--acc,#0078d7);background:color-mix(in srgb,var(--acc,#0078d7) 15%,transparent);font-weight:bold;}
.s43q-noot{font-size:11.5px;opacity:.75;margin-top:5px;}
`;
