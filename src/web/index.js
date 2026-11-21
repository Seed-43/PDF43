// Web build only (seed43.org/pdf-studio, 21 November 2026). Two things the
// self-hosted copy needs that the desktop app does not:
//
//   Back     "Back to Seed43" in the title bar, back to the site: to Studio
//            when the PDF came from Studio, otherwise to where the visitor
//            came from on seed43.org, otherwise the home page.
//   Handover Seed43 Studio opens a 3D PDF itself and sends a 2D one here. It
//            puts the file in this site's IndexedDB (nothing is uploaded) and
//            moves this tab to /pdf-studio/?from=studio; here the file is
//            taken out, the stored copy deleted, and dropped onto the page,
//            exactly as the visitor would drag it in.

const DB = 'seed43-overdracht';
const STORE = 'bestanden';
const SLEUTEL = 'pdf';
const MAX_LEEFTIJD = 5 * 60 * 1000;      // a handover older than 5 minutes is stale

const STIJL = `
.s43-terug{display:inline-flex;align-items:center;gap:6px;height:100%;min-height:28px;padding:0 12px;margin-left:6px;
  background:none;border:none;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.s43-terug:hover{background:#e81123;color:#fff}
.s43-terug svg{width:12px;height:12px}
.s43-terug-los{position:fixed;top:0;right:0;z-index:2147483000;height:30px;background:var(--theme-surface,#2b2b2b)}
`;
// Send Feedback goes to OpenAEC's own feedback service; on seed43.org the
// title bar offers the desktop app instead (22 November 2026).
const DESKTOP_URL = 'https://github.com/OpenAEC-Foundation/open-pdf-studio/releases/latest';
const STIJL_DESKTOP = `
.title-bar .send-feedback-btn:not(.s43-desktop){display:none!important}
.title-bar a.s43-desktop{text-decoration:none;display:inline-flex;align-items:center;gap:5px}
.title-bar a.s43-desktop svg{width:12px;height:12px}
`;
const PIJL = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 1.5v6.5M3.2 5.5L6 8.3l2.8-2.8M2 10.5h8"/></svg>';
const TERUG = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 6h-9M5 2.5L1.5 6 5 9.5"/></svg>';
const KRUIS = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>';

function terugAdres() {
  const params = new URLSearchParams(location.search);
  if (params.get('from') === 'studio') return '/studio';
  try {
    const r = document.referrer ? new URL(document.referrer) : null;
    if (r && r.origin === location.origin && !r.pathname.startsWith('/pdf-studio')) return r.pathname + r.search;
  } catch {}
  return '/';
}

function sluitKnop() {
  if (document.querySelector('.s43-terug')) return;
  const stijl = document.createElement('style');
  stijl.textContent = STIJL + STIJL_DESKTOP;
  document.head.appendChild(stijl);

  const knop = document.createElement('button');
  knop.type = 'button';
  knop.className = 's43-terug';
  knop.title = 'Leave Open PDF Studio and go back to Seed43';
  knop.innerHTML = `${TERUG}<span>Back to Seed43</span>`;
  knop.addEventListener('click', () => { location.href = terugAdres(); });

  const desktop = document.createElement('a');
  desktop.className = 'send-feedback-btn s43-desktop';
  desktop.href = DESKTOP_URL;
  desktop.target = '_blank';
  desktop.rel = 'noopener noreferrer';
  desktop.title = 'Download Open PDF Studio for Windows, macOS or Linux (free, by the OpenAEC Foundation). Add the Seed43 tools from File > Extensions.';
  desktop.innerHTML = `${PIJL}<span>Get the desktop version</span>`;

  const plaats = () => {
    const balk = document.querySelector('.title-bar .window-controls');
    if (balk) { balk.appendChild(desktop); balk.appendChild(knop); return true; }
    return false;
  };
  if (!plaats()) {
    // the title bar is drawn by the app after start-up; until then, float it
    knop.classList.add('s43-terug-los');
    document.body.appendChild(knop);
    const kijk = new MutationObserver(() => {
      const balk = document.querySelector('.title-bar .window-controls');
      if (balk) { knop.classList.remove('s43-terug-los'); balk.appendChild(desktop); balk.appendChild(knop); kijk.disconnect(); }
    });
    kijk.observe(document.body, { childList: true, subtree: true });
  }
}

function open() {
  return new Promise((ok, fout) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fout(r.error);
  });
}

async function neemOver() {
  const db = await open();
  const item = await new Promise((ok) => {
    const tx = db.transaction(STORE, 'readwrite');
    const st = tx.objectStore(STORE);
    const lees = st.get(SLEUTEL);
    lees.onsuccess = () => { st.delete(SLEUTEL); ok(lees.result || null); };
    lees.onerror = () => ok(null);
  });
  db.close();
  if (!item || !item.file || Date.now() - (item.at || 0) > MAX_LEEFTIJD) return null;
  return item.file;
}

function laatVallen(file) {
  const dt = new DataTransfer();
  dt.items.add(new File([file], file.name, { type: 'application/pdf', lastModified: file.lastModified || Date.now() }));
  document.body.dispatchEvent(new DragEvent('drop', {
    bubbles: true, cancelable: true, dataTransfer: dt,
    clientX: Math.round(innerWidth / 2), clientY: Math.round(innerHeight / 2),
  }));
}

async function overdracht() {
  if (new URLSearchParams(location.search).get('from') !== 'studio') return;
  let file = null;
  try { file = await neemOver(); } catch (e) { console.warn('[seed43] handover:', e); }
  if (!file) return;
  // the app sets its title to the open document; drop again once if it did not take
  for (let poging = 0; poging < 3; poging++) {
    laatVallen(file);
    await new Promise((r) => setTimeout(r, 1500));
    if (document.title.includes(file.name)) return;
  }
  console.warn('[seed43] handover: the PDF did not open; drop it in by hand');
}

export function startWeb() {
  sluitKnop();
  // after the extension has finished starting, so the app is ready for a drop
  setTimeout(() => { overdracht(); }, 300);
}
