// QA colours: pick who you are checking as (Check 1, 2, 3 or Approved) and
// every markup you draw from then on takes that checker's colour, whatever
// tool made it. The rule that goes with it: cloud a QA markup once it is done.
//
// "By seat" is for Seed43 Collab: in a shared PDF, seat 1 draws as Check 1,
// seat 2 as Check 2 and seat 3 as Check 3, so the three people need not pick.
// Outside a shared PDF it does nothing.
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
  { id: 'seat', label: 'By seat', kleur: null, collab: true },
];

const PER_STOEL = { 1: 'c1', 2: 'c2', 3: 'c3' };

/** The QA colour of a Collab seat (1-3), or null. */
export function stoelKleur(stoel) {
  return QA_KLEUREN.find((k) => k.id === PER_STOEL[stoel]) || null;
}

const OPSLAG = 'seed43.qaChecker';
let keuze = leesKeuze();
let klok = null;
let api = null, eigenType = null;
let doc = null, bekend = new Set();
const houders = new Set();       // who started the watcher (stamps, collab)
const balken = new Set();        // redraw functions of the bars on show
let stoelBron = () => null;      // this PC's seat in the shared PDF on show

function leesKeuze() {
  try { return localStorage.getItem(OPSLAG) || 'off'; } catch { return 'off'; }
}

/** Collab tells which seat this PC has in the shared PDF on show (or null). */
export function zetStoelBron(fn) { stoelBron = typeof fn === 'function' ? fn : () => null; }

/** The colour new markups take now, or null. */
function huidig() {
  if (keuze === 'seat') return stoelKleur(stoelBron());
  return QA_KLEUREN.find((x) => x.id === keuze && x.kleur) || null;
}

function tik() {
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
    ops.push({ op: 'update', id: a.id, changes: { color: kleur, strokeColor: kleur, subject: a.subject ? a.subject : k.label } });
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

/** The QA colours bar. `collab` shows the By seat choice and a note about seats. */
export function maakQa(a, type, { collab = false } = {}) {
  startQa(a, type, collab ? 'collab' : 'stamps');
  const el = document.createElement('div');
  el.className = 's43q';
  el.innerHTML = '<div class="s43q-kop">QA colours <span title="Markups you draw take the checker\'s colour. Cloud each QA markup once it is done.">ⓘ</span></div>';
  const rij = document.createElement('div');
  rij.className = 's43q-rij';
  const noot = document.createElement('div');
  noot.className = 's43q-noot';
  const teken = () => {
    if (!el.isConnected && el.dataset.getekend) { balken.delete(teken); return; }
    el.dataset.getekend = '1';
    rij.replaceChildren();
    for (const k of QA_KLEUREN) {
      if (k.collab && !collab && keuze !== k.id) continue;
      const b = document.createElement('button');
      b.className = 's43q-knop';
      b.dataset.aan = k.id === keuze ? '1' : '0';
      b.title = k.id === 'seat' ? 'In a shared PDF: seat 1 draws as Check 1, seat 2 as Check 2, seat 3 as Check 3'
        : k.kleur ? `Draw as ${k.label}: new markups turn this colour` : 'Markups keep their own colours';
      b.innerHTML = k.id === 'seat'
        ? `<i style="background:${stoelKleur(1).kleur}"></i><i style="background:${stoelKleur(2).kleur}"></i><i style="background:${stoelKleur(3).kleur}"></i>${k.label}`
        : k.kleur ? `<i style="background:${k.kleur}"></i>${k.label}` : k.label;
      b.addEventListener('click', () => kies(k.id));
      rij.appendChild(b);
    }
    if (keuze === 'seat') {
      const s = stoelBron(), k = stoelKleur(s);
      noot.textContent = k ? `You are in seat ${s}: you draw as ${k.label}.` : 'By seat works in a shared PDF: seat 1 is Check 1, seat 2 Check 2, seat 3 Check 3.';
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
.s43q-knop i + i{margin-left:-7px;}
.s43q-knop[data-aan="1"]{border-color:var(--acc,#0078d7);background:color-mix(in srgb,var(--acc,#0078d7) 15%,transparent);font-weight:bold;}
.s43q-noot{font-size:11.5px;opacity:.75;margin-top:5px;}
`;
