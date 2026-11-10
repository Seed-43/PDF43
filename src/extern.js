// Open a link in the user's browser. In the desktop app a plain window.open
// does nothing useful; the app opens links through its shell (the same way
// its own links do, js/core/extern-openen.js in Open PDF Studio).

export async function openLink(url) {
  const tauri = window.__TAURI__;
  try {
    if (tauri?.shell?.open) { await tauri.shell.open(url); return true; }
  } catch (e) { console.warn('[seed43] shell open:', e); }
  try {
    const invoke = tauri?.core?.invoke || window.__TAURI_INTERNALS__?.invoke;
    if (invoke) { await invoke('open_url', { url }); return true; }
  } catch (e) { console.warn('[seed43] open_url:', e); }
  try { if (window.open(url, '_blank', 'noopener')) return true; } catch {}
  return false;
}

/** The PDF43 repository on GitHub. */
export const REPO_URL = 'https://github.com/Seed-43/PDF43';

/** A new "Library request" issue (form in .github/ISSUE_TEMPLATE/library-request.yml). */
export function bibliotheekVerzoekUrl(regio = '') {
  const u = new URL(`${REPO_URL}/issues/new`);
  u.searchParams.set('template', 'library-request.yml');
  u.searchParams.set('title', `Library request: ${regio ? `${regio}, ` : ''}`);
  if (regio) u.searchParams.set('region', regio);
  return u.toString();
}
