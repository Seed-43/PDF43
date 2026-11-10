// Seed43: tools for Open PDF Studio in one extension. Each tool lives in its
// own folder under src/ and can be switched on or off on the Seed43 ribbon
// tab; the choice is remembered.
//
//   ocr/     Paddle OCR engine (Recognize Text, page labels,
//            form recognition)
//   stamps/  Smart Stamps: stamp families with shared parameters, a
//            dockable palette to place them and a stamp builder
//   library/ Element Library: sections and bolts (NZ Steel to start) the
//            user edits like a CAD library, placed to scale; bolt groups
//            checked against the library's edge distance and pitch

import { registreerOcr, stopOcr } from './ocr/engine.js';
import { startStamps, wisselPalet, paletOpen, bouwer } from './stamps/index.js';
import { startElementen, stopElementen, plaatsBracing } from './library/elements.js';
import { openBibliotheek } from './library/window.js';

const OPSLAG = 'seed43.tools';

const ICOON_STEMPEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="9" rx="1.5"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/><path d="M6 15h12"/></svg>';
const ICOON_BOUWER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M3 8h18"/><path d="M7 12h6"/><path d="M15 20l2-2 3 3"/><path d="M17 18l3-3"/></svg>';

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

export async function activate(api) {
  const aan = leesAan();
  for (const t of TOOLS) {
    if (aan[t.id] !== false) {
      try { await t.start(api); } catch (e) { console.warn(`[seed43] ${t.id} did not start:`, e); aan[t.id] = false; }
    }
  }

  // Smart Stamps are always available: placed stamps must keep showing.
  try { await startStamps(api); } catch (e) { console.warn('[seed43] stamps did not start:', e); }
  try { startElementen(api); } catch (e) { console.warn('[seed43] element library did not start:', e); }

  if (api.features?.ribbonTabs !== true) return;
  tab = api.registerRibbonTab({
    id: 'main',
    label: 'Seed43',
    groups: [
      {
        id: 'tools',
        label: { en: 'Tools', nl: 'Tools' },
        items: [
          ...TOOLS.map(t => ({
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
        id: 'stamps',
        label: { en: 'Stamps', nl: 'Stempels' },
        items: [
          {
            type: 'action', id: 'smart-stamps', label: 'Smart Stamps', icon: ICOON_STEMPEL, size: 'large',
            title: { en: 'Open or close the Smart Stamps panel: pick a stamp, then click on the sheet.', nl: 'Het paneel Slimme stempels openen of sluiten: kies een stempel en klik op het blad.' },
            active: false,
            onRun: async () => {
              const open = await wisselPalet(api, () => tab?.update('smart-stamps', { active: false }));
              tab?.update('smart-stamps', { active: open });
            },
          },
          {
            type: 'action', id: 'stamp-builder', label: { en: 'Stamp Builder', nl: 'Stempelbouwer' }, icon: ICOON_BOUWER, size: 'large',
            title: { en: 'Design stamp families and their parameters.', nl: 'Stempelfamilies en hun parameters ontwerpen.' },
            onRun: () => bouwer(api),
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
    ],
  });
  try { tab.update('smart-stamps', { active: await paletOpen(api) }); } catch {}
}

export async function deactivate(api) {
  tab = null;
  stopElementen();
  for (const t of TOOLS) { try { await t.stop(api); } catch {} }
}
