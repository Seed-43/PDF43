// QA colours: pick who you are checking as (Check 1, 2, 3 or Approved) and
// every markup you draw from then on takes that checker's colour, whatever
// tool made it. The rule that goes with it: cloud a QA markup once it is done.
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

const OPSLAG = 'seed43.qaChecker';
let klok = null;

function leesKeuze() {
  try { return localStorage.getItem(OPSLAG) || 'off'; } catch { return 'off'; }
}

export function stopQa() { clearInterval(klok); klok = null; }

/** The QA colours bar for the top of the Stamps tab. */
export function maakQa(api, eigenType) {
  let keuze = leesKeuze();
  let doc = null, bekend = new Set();

  const tik = () => {
    const k = QA_KLEUREN.find((x) => x.id === keuze);
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
  };
  stopQa();
  klok = setInterval(tik, 350);
  tik();

  const el = document.createElement('div');
  el.className = 's43q';
  el.innerHTML = '<div class="s43q-kop">QA colours <span title="Markups you draw take the checker\'s colour. Cloud each QA markup once it is done.">ⓘ</span></div>';
  const rij = document.createElement('div');
  rij.className = 's43q-rij';
  const teken = () => {
    rij.replaceChildren();
    for (const k of QA_KLEUREN) {
      const b = document.createElement('button');
      b.className = 's43q-knop';
      b.dataset.aan = k.id === keuze ? '1' : '0';
      b.title = k.kleur ? `Draw as ${k.label}: new markups turn this colour` : 'Markups keep their own colours';
      b.innerHTML = k.kleur ? `<i style="background:${k.kleur}"></i>${k.label}` : k.label;
      b.addEventListener('click', () => {
        keuze = k.id;
        try { localStorage.setItem(OPSLAG, keuze); } catch {}
        bekend = new Set((api.getAnnotations?.() || []).map((a) => a.id));
        teken();
      });
      rij.appendChild(b);
    }
  };
  teken();
  el.appendChild(rij);
  return el;
}

export const QA_CSS = `
.s43q{padding:8px 12px;border-bottom:1px solid var(--rand,#c8ccd1);}
.s43q-kop{font-size:11.5px;opacity:.75;margin-bottom:5px;}
.s43q-kop span{cursor:help;}
.s43q-rij{display:flex;flex-wrap:wrap;gap:4px;}
.s43q-knop{display:flex;align-items:center;gap:5px;font:inherit;font-size:12px;padding:3px 8px;border:1px solid var(--rand,#c8ccd1);
  border-radius:12px;background:none;color:inherit;cursor:pointer;}
.s43q-knop i{width:9px;height:9px;border-radius:50%;display:inline-block;}
.s43q-knop[data-aan="1"]{border-color:var(--acc,#0078d7);background:color-mix(in srgb,var(--acc,#0078d7) 15%,transparent);font-weight:bold;}
`;
