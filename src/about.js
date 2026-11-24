// About Seed43: like the About button of the Seed43 pyRevit tools. Shows the
// version, checks GitHub for a newer release, lists what changed, and lets
// the user choose which Seed43 tools show on the ribbon.
//
// Updates: an add-on cannot replace itself. A newer release is installed
// from the app (File, Extensions: the Seed43 catalogue entry, or Install
// from file with the downloaded seed43.oppx).

import pakket from '../plugin.json';
import wijzigingen from '../data/changelog.json';
import { openLink } from './extern.js';
import { LOGO_SVG } from './logo.js';

export const VERSIE = pakket.version;
const REPO = 'Seed-43/PDF43';
const RELEASES = `https://github.com/${REPO}/releases`;
const ISSUES = `https://github.com/${REPO}/issues`;
const FEATURE = `https://github.com/${REPO}/issues/new?template=feature-request.yml`;
const SUPPORT = 'https://buymeacoffee.com/seed43';
const EMAIL = 'support@seed43.org';
// The change list shows the last versions only.
const GESCHIEDENIS = 5;
const STIJL_ID = 'seed43-about-stijl';

const CSS = `
.s43a-achter{position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:3000;display:flex;align-items:center;justify-content:center;}
.s43a{--bg:var(--theme-app-menu-bg,#fff);--tx:var(--theme-app-menu-text,#1f2328);--rand:var(--theme-app-menu-sidebar-border,#c8ccd1);
  --hover:var(--theme-app-menu-item-hover,#eef2f7);--acc:var(--theme-accent,#0078d7);--groen:#4c9a52;
  --zacht:color-mix(in srgb,var(--tx) 60%,var(--bg));--vlak:color-mix(in srgb,var(--tx) 5%,var(--bg));
  width:min(560px,94vw);max-height:90vh;display:flex;flex-direction:column;background:var(--bg);color:var(--tx);
  border:1px solid var(--rand);border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.35);font:13px/1.45 system-ui,Segoe UI,sans-serif;overflow:hidden;}
.s43a button{font:inherit;color:inherit;background:var(--vlak);border:1px solid var(--rand);border-radius:6px;padding:4px 10px;cursor:pointer;}
.s43a button:hover{background:var(--hover);}
.s43a-merk{display:block;height:34px;width:auto;overflow:visible;}
.s43a-kop button{white-space:nowrap;}
.s43a-merk .logo-glow{opacity:.8;}
.s43a-steun h3{margin:0 0 4px;}
.s43a-steun-knoppen{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
.s43a-koffie{border-color:var(--acc)!important;}
.s43a-kop{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--rand);}
.s43a-logo{font-size:24px;line-height:1;flex:1;}
.s43a-logo b{color:var(--groen);}
.s43a-logo small{display:block;font-size:12px;color:var(--zacht);margin-top:4px;}
.s43a-x{border:0 !important;background:none !important;font-size:18px !important;padding:0 6px !important;}
.s43a-lint{display:none;padding:8px 16px;background:var(--groen);color:#fff;cursor:pointer;font-weight:600;}
.s43a-lint span{font-weight:400;opacity:.9;margin-left:8px;}
.s43a-lijf{overflow:auto;padding:12px 16px 16px;display:flex;flex-direction:column;gap:14px;}
.s43a-kaart{border:1px solid var(--rand);border-radius:8px;padding:12px 14px;background:var(--vlak);}
.s43a-kaart h3{margin:0 0 6px;font-size:14px;}
.s43a-kopje{font-size:11px;font-weight:600;letter-spacing:.06em;color:var(--zacht);margin:2px 0 -6px;}
.s43a-kaart ul{margin:2px 0 8px 18px;padding:0;}
.s43a-kaart li{margin:1px 0;}
.s43a-sub{font-weight:600;margin-top:6px;}
.s43a-zacht{color:var(--zacht);}
.s43a-tool{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--rand);}
.s43a-tool:first-child{border-top:0;}
.s43a-tool svg{width:22px;height:22px;flex:none;}
.s43a-tool div{flex:1;}
.s43a-tool small{display:block;color:var(--zacht);}
.s43a-schakel{width:36px;height:20px;border-radius:10px;border:1px solid var(--rand);background:var(--vlak);position:relative;cursor:pointer;flex:none;padding:0 !important;}
.s43a-schakel::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--zacht);transition:left .12s;}
.s43a-schakel[aria-checked="true"]{background:var(--groen);border-color:var(--groen);}
.s43a-schakel[aria-checked="true"]::after{left:18px;background:#fff;}
.s43a a{color:var(--acc);}
.s43a-voet{font-size:12px;color:var(--zacht);}
.s43a-ouder summary{cursor:pointer;color:var(--zacht);margin-top:4px;}
`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function versieDelen(v) {
  return String(v || '').replace(/^v/i, '').split('.').map((x) => parseInt(x, 10) || 0);
}

/** Is version a newer than b? */
export function nieuwer(a, b) {
  const x = versieDelen(a), y = versieDelen(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}

/** The latest release on GitHub: { versie, url, oppx } or null (offline). */
async function laatsteRelease() {
  try {
    // no-store: GitHub lets a reply be cached for 60 s, which hid a release made just before.
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    const oppx = (j.assets || []).find((a) => /\.oppx$/i.test(a.name));
    // GitHub gives each asset's SHA-256 as "sha256:…"; the update checks the download against it.
    const sha256 = /^sha256:[0-9a-f]{64}$/i.test(oppx?.digest || '') ? oppx.digest.slice(7).toLowerCase() : null;
    return { versie: String(j.tag_name || '').replace(/^v/i, ''), url: j.html_url || RELEASES, oppx: oppx?.browser_download_url || null, sha256, notities: j.body || '' };
  } catch { return null; }
}

function notitiesHtml(n) {
  return Object.entries(n.notes || {}).map(([kop, lijst]) =>
    `<div class="s43a-sub">${esc(kop)}</div><ul>${lijst.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`).join('');
}

/**
 * Open the About window. `tools`: [{ id, label, beschrijving, icon }] with
 * `zichtbaar(id)` and `zet(id, aan)` to show or hide a tool on the ribbon.
 */
export function openAbout({ tools, zichtbaar, zet }) {
  // Always rewrite: after a reinstall the page still holds the old sheet.
  let s = document.getElementById(STIJL_ID);
  if (!s) { s = document.createElement('style'); s.id = STIJL_ID; document.head.appendChild(s); }
  if (s.textContent !== CSS) s.textContent = CSS;
  document.querySelector('.s43a-achter')?.remove();
  const achter = document.createElement('div');
  achter.className = 's43a-achter';
  const nu = wijzigingen.find((w) => w.version === VERSIE) || wijzigingen[0];
  const ouder = wijzigingen.filter((w) => w !== nu).slice(0, GESCHIEDENIS - 1);
  achter.innerHTML = `
    <div class="s43a" role="dialog" aria-label="About Seed43">
      <div class="s43a-kop">
        <div class="s43a-logo" title="Seed43 ${esc(VERSIE)}">${LOGO_SVG}</div>
        <button class="s43a-check" title="Check GitHub for a newer Seed43">Check for updates</button>
        <button class="s43a-issue" title="Report a problem on GitHub">Report an issue</button>
        <button class="s43a-feature" title="Ask for a new tool or a change on GitHub">Request a feature</button>
        <button class="s43a-x" title="Close (Esc)">✕</button>
      </div>
      <div class="s43a-lint" role="button">Update available<span></span></div>
      <div class="s43a-lijf">
        <div class="s43a-kaart s43a-status">
          <h3>Seed43 ${esc(VERSIE)}</h3>
          <div class="s43a-zacht s43a-stand">Checking for updates…</div>
        </div>
        <div class="s43a-kopje">LAST UPDATE</div>
        <div class="s43a-kaart">
          <h3>${esc(nu.version)}<span class="s43a-zacht" style="font-weight:400"> · ${esc(nu.date || '')}</span></h3>
          ${notitiesHtml(nu)}
          ${ouder.length ? `<details class="s43a-ouder"><summary>Earlier versions</summary>${ouder.map((w) => `<div class="s43a-sub">${esc(w.version)} <span class="s43a-zacht" style="font-weight:400">${esc(w.date || '')}</span></div>${notitiesHtml(w)}`).join('')}</details>` : ''}
        </div>
        <div class="s43a-kopje">TOOLS</div>
        <div class="s43a-kaart s43a-tools"></div>
        <div class="s43a-kaart s43a-steun">
          <h3>Support Seed43</h3>
          <div class="s43a-zacht">Seed43 is free. If it saves you time, a coffee helps us keep it going and add more.</div>
          <div class="s43a-steun-knoppen">
            <button class="s43a-koffie">☕  Support this project and help us grow</button>
            <button class="s43a-mail">✉  Email support</button>
          </div>
        </div>
        <div class="s43a-voet">
          Seed43 is free and open source (Apache-2.0): <a href="https://github.com/${REPO}" target="_blank" rel="noopener">github.com/${REPO}</a>.
          Special thanks to the OpenAEC Foundation for Open PDF Studio, and to the PaddleOCR and ONNX Runtime projects.
        </div>
      </div>
    </div>`;
  document.body.appendChild(achter);
  const $ = (s) => achter.querySelector(s);

  // Tools: show or hide on the Seed43 ribbon tab.
  const lijst = $('.s43a-tools');
  for (const t of tools) {
    const rij = document.createElement('div');
    rij.className = 's43a-tool';
    rij.innerHTML = `${t.icon || ''}<div>${esc(t.label)}<small>${esc(t.beschrijving || '')}</small></div>`;
    const s = document.createElement('button');
    s.className = 's43a-schakel';
    s.setAttribute('role', 'switch');
    s.setAttribute('aria-checked', String(zichtbaar(t.id)));
    s.title = 'Show on the Seed43 ribbon tab';
    s.addEventListener('click', async () => {
      const aan = s.getAttribute('aria-checked') !== 'true';
      s.setAttribute('aria-checked', String(aan));
      try { await zet(t.id, aan); } catch (e) { console.warn('[seed43] tool switch:', e); }
    });
    rij.appendChild(s);
    lijst.appendChild(rij);
  }

  const sluit = () => { achter.remove(); window.removeEventListener('keydown', toets, true); };
  const toets = (e) => { if (e.key === 'Escape') { e.stopPropagation(); sluit(); } };
  window.addEventListener('keydown', toets, true);
  achter.addEventListener('mousedown', (e) => { if (e.target === achter) sluit(); });
  $('.s43a-x').addEventListener('click', sluit);
  $('.s43a-issue').addEventListener('click', () => openLink(ISSUES));
  $('.s43a-feature').addEventListener('click', () => openLink(FEATURE));
  $('.s43a-koffie').addEventListener('click', () => openLink(SUPPORT));
  $('.s43a-mail').addEventListener('click', () => openLink(`mailto:${EMAIL}?subject=${encodeURIComponent(`Seed43 ${VERSIE} for Open PDF Studio`)}`));

  let release = null;
  const toonUpdate = () => {
    const stand = $('.s43a-stand');
    if (!release) { stand.textContent = 'Could not reach GitHub to check for updates.'; return; }
    if (nieuwer(release.versie, VERSIE)) {
      const lint = $('.s43a-lint');
      lint.style.display = 'block';
      lint.querySelector('span').textContent = `${release.versie} (you have ${VERSIE}), click to update`;
      stand.innerHTML = `Seed43 <b>${esc(release.versie)}</b> is available.`;
    } else {
      stand.textContent = `You have the latest version (${VERSIE}).`;
    }
  };
  const controleer = async () => {
    $('.s43a-stand').textContent = 'Checking for updates…';
    release = await laatsteRelease();
    toonUpdate();
  };
  $('.s43a-check').addEventListener('click', controleer);
  // If the Extensions window can't be opened: update in place, the way that window does it: the
  // app downloads the package (https only, size-limited, SHA-256 checked),
  // checks it is Seed43, installs it as one transaction and confirms it. The
  // new version runs after a restart. If any step fails, the manual way shows.
  const handmatig = (fout) => {
    const k = $('.s43a-status');
    k.innerHTML = `<h3>Update to Seed43 ${esc(release.versie)}</h3>
      ${fout ? `<p class="s43a-zacht" style="margin:0 0 6px">The automatic update didn't work (${esc(fout)}). You can update by hand:</p>` : ''}
      <ol style="margin:4px 0 8px 18px;padding:0">
        <li>In Open PDF Studio open <b>File, Extensions</b>.</li>
        <li>Find <b>Seed43</b> under Installed or Browse and click <b>Update</b>.</li>
        <li>Or download <b>seed43.oppx</b> and use <b>Install from file</b>.</li>
      </ol>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${release.oppx ? '<button class="s43a-dl">Download seed43.oppx</button>' : ''}
        <button class="s43a-rel">Release notes</button>
      </div>`;
    k.querySelector('.s43a-dl')?.addEventListener('click', () => openLink(release.oppx));
    k.querySelector('.s43a-rel').addEventListener('click', () => openLink(release.url));
  };
  // Open Open PDF Studio's own Extensions window, where Seed43 shows
  // "Update to v…" and the new version starts without a restart. There is no
  // API for it, so this presses the app's own buttons: the Help ribbon tab,
  // then Extensions, then back to the tab you were on. False if any of them
  // can't be found (a different app version), and the direct install is used.
  const openExtensies = async () => {
    const tabKnop = (id) => document.querySelector(`.ribbon-tab[role="tab"][data-tab="${id}"]`);
    const help = tabKnop('help');
    if (!help) return false;
    const vorige = document.querySelector('.ribbon-tab[role="tab"][aria-selected="true"]');
    help.click();
    let knop = null;
    for (let i = 0; i < 40 && !(knop = document.getElementById('ribbon-extensions')); i++) await new Promise((r) => setTimeout(r, 50));
    if (knop) knop.click();
    if (vorige && vorige !== help) setTimeout(() => vorige.click(), 0);
    return !!knop;
  };
  let bezig = false;
  $('.s43a-lint').addEventListener('click', async () => {
    if (bezig || !release) return;
    // The Extensions window opens behind About: close About so it's in view.
    if (await openExtensies().catch(() => false)) { sluit(); return; }
    const invoke = window.__TAURI__?.core?.invoke;
    if (!release.oppx || !invoke) { handmatig(release.oppx ? 'this needs the desktop app' : 'the release has no seed43.oppx'); return; }
    bezig = true;
    const k = $('.s43a-status');
    const zeg = (t) => { k.innerHTML = `<h3>Updating to Seed43 ${esc(release.versie)}</h3><p style="margin:0">${esc(t)}</p>`; };
    let pakket = null;
    try {
      zeg('Downloading from GitHub…');
      pakket = await invoke('extensie_pakket_ophalen', { url: release.oppx, sha256: release.sha256, verwachtId: 'seed43' });
      zeg(`Installing ${pakket.version}…`);
      const r = await invoke('extensie_installeer', { pad: pakket.pad, beleid: 'always', verwachteSha256: pakket.sha256, bron: 'ui' });
      if (r?.transactie) await invoke('extensie_bevestig', { transactie: r.transactie });
      const herstart = window.__TAURI__?.process?.relaunch;
      k.innerHTML = `<h3>Seed43 ${esc(pakket.version)} is installed</h3>
        <p style="margin:0 0 8px">It starts with Open PDF Studio${herstart ? '. Save your work, then restart' : ': close and reopen the app to use it'}.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${herstart ? '<button class="s43a-herstart">Restart now</button>' : ''}
          <button class="s43a-rel">What's new</button>
        </div>`;
      k.querySelector('.s43a-rel').addEventListener('click', () => openLink(release.url));
      k.querySelector('.s43a-herstart')?.addEventListener('click', () => herstart().catch((e) => console.warn('[seed43] restart:', e)));
      const lint = $('.s43a-lint');
      lint.querySelector('span').textContent = 'installed, restart Open PDF Studio to use it';
    } catch (e) {
      console.warn('[seed43] update failed:', e);
      handmatig(String(e?.message || e).slice(0, 160));
    } finally {
      if (pakket?.pad) invoke('extensie_pakket_opruimen', { pad: pakket.pad }).catch(() => {});
      bezig = false;
    }
  });
  controleer();
}
