// node build.mjs        ->  dist/seed43.oppx          (desktop extension package)
// node build.mjs --web  ->  dist-web/seed43/          (folder for the self-hosted web build of
//                           Open PDF Studio at seed43.org/pdf-studio: no Collab, no About,
//                           Properties and Smart Stamps always on; see src/index.js WEB)
import { build } from 'esbuild';
import fs from 'fs';
import { execFileSync } from 'child_process';
const WEB = process.argv.includes('--web');
const pkg = WEB ? 'dist-web/seed43' : 'dist/pkg';
fs.rmSync(WEB ? 'dist-web' : 'dist', { recursive: true, force: true });
fs.mkdirSync(`${pkg}/models`, { recursive: true });
fs.mkdirSync(`${pkg}/ort`, { recursive: true });
await build({
  entryPoints: ['src/index.js'], bundle: true, format: 'esm', platform: 'browser',
  target: 'es2022', minify: true,
  // Desktop: loaded from a blob: URL; ONNX Runtime builds URLs from import.meta.url.
  // Web: imported from its real address, so import.meta.url is right as it is.
  define: WEB
    ? { __SEED43_WEB__: 'true' }
    : { __SEED43_WEB__: 'false', 'import.meta.url': JSON.stringify('http://tauri.localhost/__seed43__/index.js') },
  outfile: `${pkg}/index.js`, legalComments: 'eof',
});
for (const f of ['det_ppocrv4_mobile.onnx', 'cls_mobile_v2.onnx', 'rec_en_ppocrv5.onnx', 'rec_en_dict.txt']) fs.copyFileSync(`models/${f}`, `${pkg}/models/${f}`);
fs.copyFileSync('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm', `${pkg}/ort/ort-wasm-simd-threaded.wasm`);
fs.mkdirSync(`${pkg}/data`, { recursive: true });
fs.copyFileSync('data/nz-steel.seed43lib.json', `${pkg}/data/nz-steel.seed43lib.json`);
fs.copyFileSync('plugin.json', `${pkg}/plugin.json`);
for (const f of ['LICENSE', 'NOTICE.md', 'ort-LICENSE.txt']) if (fs.existsSync(f)) fs.copyFileSync(f, `${pkg}/${f}`);
if (WEB) {
  const mb = (d) => fs.readdirSync(d, { recursive: true }).map((f) => `${d}/${f}`).filter((p) => fs.statSync(p).isFile())
    .reduce((s, p) => s + fs.statSync(p).size, 0) / 1e6;
  console.log(`${pkg}/ ${mb(pkg).toFixed(1)} MB`);
} else {
  execFileSync('python', ['-I', '-c', `
import zipfile,os,sys
src,out=sys.argv[1],sys.argv[2]
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for root,_,files in os.walk(src):
    for f in files:
      p=os.path.join(root,f); z.write(p, os.path.relpath(p,src).replace(os.sep,'/'))
`, pkg, 'dist/seed43.oppx'], { stdio: 'inherit' });
  const st = fs.statSync('dist/seed43.oppx');
  console.log(`dist/seed43.oppx ${(st.size / 1e6).toFixed(1)} MB`);
}
