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

export const VERSIE = pakket.version;
const REPO = 'Seed-43/PDF43';
const RELEASES = `https://github.com/${REPO}/releases`;
const ISSUES = `https://github.com/${REPO}/issues`;
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
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) return null;
    const j = await r.json();
    const oppx = (j.assets || []).find((a) => /\.oppx$/i.test(a.name));
    return { versie: String(j.tag_name || '').replace(/^v/i, ''), url: j.html_url || RELEASES, oppx: oppx?.browser_download_url || null, notities: j.body || '' };
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
  if (!document.getElementById(STIJL_ID)) {
    const s = document.createElement('style'); s.id = STIJL_ID; s.textContent = CSS; document.head.appendChild(s);
  }
  document.querySelector('.s43a-achter')?.remove();
  const achter = document.createElement('div');
  achter.className = 's43a-achter';
  const nu = wijzigingen.find((w) => w.version === VERSIE) || wijzigingen[0];
  const ouder = wijzigingen.filter((w) => w !== nu);
  achter.innerHTML = `
    <div class="s43a" role="dialog" aria-label="About Seed43">
      <div class="s43a-kop">
        <div class="s43a-logo"><b>Seed</b>43<small>Tools for Open PDF Studio, version ${esc(VERSIE)}</small></div>
        <button class="s43a-check" title="Check GitHub for a newer Seed43">Check for updates</button>
        <button class="s43a-issue" title="Report a problem or ask for a feature on GitHub">Report an issue</button>
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

  let release = null;
  const toonUpdate = () => {
    const stand = $('.s43a-stand');
    if (!release) { stand.textContent = 'Could not reach GitHub to check for updates.'; return; }
    if (nieuwer(release.versie, VERSIE)) {
      const lint = $('.s43a-lint');
      lint.style.display = 'block';
      lint.querySelector('span').textContent = `${release.versie} (you have ${VERSIE}), click for how to update`;
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
  $('.s43a-lint').addEventListener('click', () => {
    const k = $('.s43a-status');
    k.innerHTML = `<h3>Update to Seed43 ${esc(release.versie)}</h3>
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
  });
  controleer();
}
