// Seed43: tools for Open PDF Studio in one extension. Each tool lives in its
// own folder under src/ and can be switched on or off on the Seed43 ribbon
// tab; the choice is remembered.
//
//   ocr/     Paddle OCR engine (Recognize Text, page labels,
//            form recognition)
//   stamps/  Smart Stamps: stamp families with shared parameters, a
//            dockable palette to place them and a stamp builder
//   collab/  Seed43 Collab: share a PDF by key and mark it up together
//            (end-to-end encrypted, server at collab.seed43.org)
//   library/ Element Library: sections and bolts (NZ Steel to start) the
//            user edits like a CAD library, placed to scale; bolt groups
//            checked against the library's edge distance and pitch

import { hertekenOveral } from './herteken.js';
import { registreerOcr, stopOcr } from './ocr/engine.js';
import { startStamps } from './stamps/index.js';
import { startElementen, stopElementen, plaatsBracing } from './library/elements.js';
import { openBibliotheek } from './library/window.js';
import { openAbout } from './about.js';
import { autoLink, samenvatting } from './links/index.js';
import * as melding from './links/melding.js';
import { tipsAan, wisselTips } from './library/gids.js';
const ICOON_TIPS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z"/></svg>';
import { vensterAan, wisselVenster, startLade, verwijderLade, bijAanUit, wisselLadeTab, ladeTabAan } from './eigenschappen.js';
import { startCollab } from './collab/index.js';
import { startWeb } from './web/index.js';

const OPSLAG = 'seed43.tools';
const ZICHTBAAR = 'seed43.ribbon';
const ICOON_EIGENSCHAPPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M14 4v16"/><path d="M16.5 8h2"/><path d="M16.5 11h2"/><path d="M16.5 14h2"/></svg>';
const ICOON_LINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="7" r="3.5"/><path d="M3 7h7"/><circle cx="17.5" cy="17" r="3.5"/><path d="M14 17h7"/><path d="M9 10.5l5.5 3"/><path d="M12.5 14l2 -0.5 -0.6 -2"/></svg>';
const ICOON_ABOUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/></svg>';

const ICOON_STEMPEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="9" rx="1.5"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/><path d="M6 15h12"/></svg>';
const ICOON_COLLAB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v6"/><path d="M14 3v4h4"/><path d="M6 3v18h6"/><circle cx="17" cy="16" r="2.2"/><path d="M13 21c.4-2 2-3 4-3s3.6 1 4 3"/><path d="M9 9h3"/><path d="M9 12h4"/></svg>';

const ICOON_BRACING = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 17h18" stroke-dasharray="3 2"/><path d="M3 20h18"/><path d="M7 9h10"/><path d="M7 6h3"/></svg>';
const ICOON_BIBLIOTHEEK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14"/><path d="M5 20h14"/><path d="M12 4v16"/><path d="M8 8h8"/><path d="M8 16h8"/></svg>';

const ICOON_OCR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h3"/><path d="M17 4h3v3"/><path d="M20 17v3h-3"/><path d="M7 20H4v-3"/><path d="M8 9h8"/><path d="M8 12h8"/><path d="M8 15h5"/></svg>';

// Add a tool here: { id, label, title, icon, start(api), stop(api) }.
const TOOLS = [
  {
    id: 'ocr',
    label: { en: 'Paddle OCR', nl: 'Paddle OCR' },
    title: {
      en: 'Paddle OCR engine. When on, pick "Paddle OCR" as the engine in Recognize Text (OCR).',
      nl: 'Paddle OCR-engine. Aan: kies "Paddle OCR" als engine in Tekst herkennen (OCR).',
    },
    icon: ICOON_OCR,
    start: (api) => registreerOcr(api),
    stop: (api) => stopOcr(api),
  },
];

function leesAan() {
  try {
    const v = JSON.parse(localStorage.getItem(OPSLAG) || 'null');
    if (v && typeof v === 'object') return v;
  } catch {}
  return Object.fromEntries(TOOLS.map(t => [t.id, true]));  // all on at first
}

function bewaarAan(aan) {
  try { localStorage.setItem(OPSLAG, JSON.stringify(aan)); } catch {}
}

let tab = null;

// Web build for seed43.org/pdf-studio (`node build.mjs --web`, 21 November
// 2026): no Collab and no About; the Properties drawer and the Smart Stamps
// drawer tab are always on, so they get no ribbon button. Tips stays, the
// user can turn it off. The desktop build defines this as false.
const WEB = typeof __SEED43_WEB__ !== 'undefined' && __SEED43_WEB__ === true;

function webStandaard() {
  try {
    localStorage.setItem('seed43.eigenschappenVenster', '1');
    const tabs = JSON.parse(localStorage.getItem('seed43.drawerTabs') || '{}') || {};
    tabs.stempels = true;
    tabs.collab = false;
    localStorage.setItem('seed43.drawerTabs', JSON.stringify(tabs));
  } catch {}
}

// The web build has no Paddle OCR (21 November 2026): the engine is not even bundled (build.mjs).
const tools = () => (WEB ? TOOLS.filter((t) => t.id !== 'ocr') : TOOLS);

export async function activate(api) {
  hertekenOveral(api);   // changes show at once in continuous view too
  if (WEB) {
    webStandaard();
    try { startWeb(api); } catch (e) { console.warn('[seed43] web:', e); }
  }
  const aan = leesAan();
  for (const t of tools()) {
    if (aan[t.id] !== false) {
      try { await t.start(api); } catch (e) { console.warn(`[seed43] ${t.id} did not start:`, e); aan[t.id] = false; }
    }
  }

  // Smart Stamps are always available: placed stamps must keep showing.
  try { await startStamps(api); } catch (e) { console.warn('[seed43] stamps did not start:', e); }
  try { startElementen(api); } catch (e) { console.warn('[seed43] element library did not start:', e); }
  try { startLade(api); } catch (e) { console.warn('[seed43] properties drawer:', e); }
  if (!WEB) {
    try { startCollab(api); } catch (e) { console.warn('[seed43] collab:', e); }
  }

  if (api.features?.ribbonTabs !== true) return;
  bouwTab(api, aan);
}

// ── Ribbon: which tools show (chosen in About) ───────────────────────────

const ABOUT_TOOLS = [
  { id: 'ocr', label: 'Paddle OCR', beschrijving: 'OCR engine for scans and page labels; the ribbon button switches it on or off', icon: ICOON_OCR },
  { id: 'stamps', label: 'Smart Stamps', beschrijving: 'Stamp families with shared parameters, and the Stamp Builder (in the Seed43 drawer)', icon: ICOON_STEMPEL },
  { id: 'collab', label: 'Collab', beschrijving: 'Share a PDF by key and mark it up together (in the Seed43 drawer)', icon: ICOON_COLLAB },
  { id: 'library', label: 'Element Library', beschrijving: 'Steel, timber, fixings and bolts placed to scale', icon: ICOON_BIBLIOTHEEK },
  { id: 'autolink', label: 'Auto Link', beschrijving: 'Links section and detail bubbles to each other, both ways', icon: ICOON_LINK },
  { id: 'bracing', label: 'Bracing', beschrijving: 'Bracing legend lines with type and length in metres', icon: ICOON_BRACING },
];

function leesZichtbaar() {
  try { const v = JSON.parse(localStorage.getItem(ZICHTBAAR) || 'null'); if (v && typeof v === 'object') return v; } catch {}
  return {};
}
const isZichtbaar = (id) => leesZichtbaar()[id] !== false;

function bouwTab(api, aan) {
  const toon = leesZichtbaar();
  const zie = (id) => toon[id] !== false;
  try { tab?.dispose?.(); } catch {}
  const alle = [
      {
        id: 'tools',
        label: { en: 'Tools', nl: 'Tools' },
        items: [
          ...tools().map(t => ({
            type: 'action', id: `tool-${t.id}`, label: t.label, title: t.title, icon: t.icon,
            size: 'large', active: aan[t.id] !== false,
            onRun: async () => {
              const nu = aan[t.id] === false;
              if (nu) await t.start(api); else await t.stop(api);
              aan[t.id] = nu;
              bewaarAan(aan);
              tab?.update(`tool-${t.id}`, { active: nu });
            },
          })),
        ],
      },
      {
        id: 'sheets',
        label: { en: 'Sheets', nl: 'Bladen' },
        items: [
          {
            type: 'action', id: 'auto-link', label: { en: 'Auto Link', nl: 'Auto-link' }, icon: ICOON_LINK, size: 'large',
            title: { en: 'Link section and detail bubbles both ways: plan bubble to detail title, and the title back. One undo step; run again to add only what is missing.', nl: 'Elke doorsnede- en detailbel met zijn tegenhanger verbinden, beide kanten op.' },
            onRun: async () => {
              const m = melding.open('Auto Link', 'Reading the sheets...');
              try {
                tab?.update('auto-link', { active: true });
                const r = await autoLink(api, { bijVoortgang: (p, n) => m.zet(`Reading sheet ${p} of ${n}...`) });
                m.klaar(samenvatting(r));
              } catch (e) {
                m.klaar(`Auto Link did not finish: ${e?.message || e}`);
              } finally {
                tab?.update('auto-link', { active: false });
              }
            },
          },
        ],
      },
      {
        id: 'library',
        label: { en: 'Elements', nl: 'Elementen' },
        items: [
          {
            type: 'action', id: 'element-library', label: { en: 'Element Library', nl: 'Elementenbibliotheek' }, icon: ICOON_BIBLIOTHEEK, size: 'large',
            title: { en: 'Sections, bolts and your own elements: edit the library, then place to scale. Bolt groups are checked against the edge distance and pitch in the library.', nl: 'Profielen, bouten en eigen elementen: bewerk de bibliotheek en plaats op schaal.' },
            onRun: () => openBibliotheek(api).catch((e) => console.warn('[seed43] library window:', e)),
          },
          {
            type: 'action', id: 'bracing-line', label: { en: 'Bracing', nl: 'Schoren' }, icon: ICOON_BRACING, size: 'large',
            title: { en: 'Bracing legend line: click A, then B along a braced wall. Shows the bracing type and its length in metres; Ctrl or Shift keeps it square.', nl: 'Schoorlijn: klik A en dan B langs een geschoorde wand.' },
            onRun: () => plaatsBracing(api),
          },
        ],
      },
  ];
  // Hide the tools switched off in About; a group with nothing left goes.
  const welk = { 'tool-ocr': 'ocr', 'element-library': 'library', 'bracing-line': 'bracing', 'auto-link': 'autolink' };
  // Smart Stamps and Collab switch their tab in the Seed43 drawer on or off,
  // like Paddle OCR: on (lit) shows the tab and opens the drawer on it.
  const ladeKnop = (id, tabId, label, icon, title) => ({
    type: 'action', id, label, icon, size: 'large', title, active: ladeTabAan(tabId),
    onRun: () => { const aan = wisselLadeTab(tabId); try { tab?.update(id, { active: aan }); } catch {} },
  });
  const tipsKnop = {
    type: 'action', id: 'tips', label: { en: 'Tips', nl: 'Tips' }, icon: ICOON_TIPS, size: 'large',
    title: { en: 'Show or hide the Seed43 tips: the animated guides when placing or selecting, and the properties card. On again brings back the ones you ticked off.', nl: 'Seed43-tips tonen of verbergen.' },
    active: tipsAan(),
    onRun: () => { const aanNu = wisselTips(); tab?.update('tips', { active: aanNu }); },
  };
  const groups = WEB ? [
    { id: 'seed43', label: 'Seed43', items: [tipsKnop] },
    ...alle.filter((g) => g.items.length),
  ] : [
    {
      id: 'seed43', label: 'Seed43',
      items: [{
        type: 'action', id: 'about', label: { en: 'About', nl: 'Over' }, icon: ICOON_ABOUT, size: 'large',
        title: { en: 'Seed43 version, updates, what changed, and which tools show on this tab.', nl: 'Seed43-versie, updates en welke tools op dit tabblad staan.' },
        onRun: () => openAbout({
          tools: ABOUT_TOOLS,
          zichtbaar: isZichtbaar,
          zet: (id, v) => { const z = leesZichtbaar(); z[id] = v; try { localStorage.setItem(ZICHTBAAR, JSON.stringify(z)); } catch {} bouwTab(api, aan); },
        }),
      }, {
        type: 'action', id: 'tips', label: { en: 'Tips', nl: 'Tips' }, icon: ICOON_TIPS, size: 'large',
        title: { en: 'Show or hide the Seed43 tips: the animated guides when placing or selecting, and the properties card. On again brings back the ones you ticked off.', nl: 'Seed43-tips tonen of verbergen.' },
        active: tipsAan(),
        onRun: () => { const aanNu = wisselTips(); tab?.update('tips', { active: aanNu }); },
      }, {
        type: 'action', id: 'properties-window', label: { en: 'Properties', nl: 'Eigenschappen' }, icon: ICOON_EIGENSCHAPPEN, size: 'large',
        title: {
          en: 'Properties drawer: the options of the selected Seed43 item, in a drawer on the right of the page (Properties tab). Off: they show in the Properties panel.',
          nl: 'Lade Seed43-eigenschappen: de opties van een gekozen element in een lade rechts van de pagina. Uit: in het eigenschappenpaneel van de app.',
        },
        active: vensterAan(),
        onRun: () => { const aanNu = wisselVenster(); tab?.update('properties-window', { active: aanNu }); },
      },
      ...(zie('stamps') ? [ladeKnop('smart-stamps', 'stempels', 'Smart Stamps', ICOON_STEMPEL,
        { en: 'Smart Stamps tab in the Seed43 drawer on or off. On: search and place a stamp, or open the Stamp Builder.', nl: 'Tabblad Slimme stempels in de Seed43-lade aan of uit.' })] : []),
      ...(zie('collab') ? [ladeKnop('collab', 'collab', 'Collab', ICOON_COLLAB,
        { en: 'Collab tab in the Seed43 drawer on or off. On: share a PDF by key and mark it up together.', nl: 'Tabblad Collab in de Seed43-lade aan of uit.' })] : []),
      ],
    },
    ...alle.map((g) => ({ ...g, items: g.items.filter((it) => zie(welk[it.id] || it.id)) })).filter((g) => g.items.length),
  ];
  tab = api.registerRibbonTab({ id: 'main', label: 'Seed43', groups });
  bijAanUit((aanNu) => { try { tab?.update('properties-window', { active: aanNu }); } catch {} });
}

export async function deactivate(api) {
  tab = null;
  verwijderLade();
  stopElementen();
  for (const t of tools()) { try { await t.stop(api); } catch {} }
}
