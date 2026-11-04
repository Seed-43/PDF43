// Seed43: tools for Open PDF Studio in one extension. Each tool lives in its
// own folder under src/ and can be switched on or off on the Seed43 ribbon
// tab; the choice is remembered.
//
//   ocr/  Paddle OCR engine (Recognize Text, page labels,
//         form recognition)

import { registreerOcr, stopOcr } from './ocr/engine.js';

const OPSLAG = 'seed43.tools';

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

  if (api.features?.ribbonTabs !== true) return;
  const telling = () => TOOLS.filter(t => aan[t.id] !== false).length;
  tab = api.registerRibbonTab({
    id: 'main',
    label: 'Seed43',
    groups: [
      {
        id: 'tools',
        label: { en: 'Tools (on/off)', nl: 'Tools (aan/uit)' },
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
              tab?.update('count', { text: `${telling()} / ${TOOLS.length}`, tone: telling() ? 'success' : 'neutral' });
            },
          })),
          { type: 'status', id: 'count', label: { en: 'On', nl: 'Aan' }, text: `${telling()} / ${TOOLS.length}`, tone: telling() ? 'success' : 'neutral' },
        ],
      },
    ],
  });
}

export async function deactivate(api) {
  tab = null;
  for (const t of TOOLS) { try { await t.stop(api); } catch {} }
}
