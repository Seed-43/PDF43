// node build.mjs  ->  dist/pdf43.oppx
import { build } from 'esbuild';
import fs from 'fs';
import { execFileSync } from 'child_process';
const pkg = 'dist/pkg';
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync(`${pkg}/models`, { recursive: true });
fs.mkdirSync(`${pkg}/ort`, { recursive: true });
await build({
  entryPoints: ['src/index.js'], bundle: true, format: 'esm', platform: 'browser',
  target: 'es2022', minify: true,
  // Loaded from a blob: URL; ONNX Runtime builds URLs from import.meta.url.
  define: { 'import.meta.url': JSON.stringify('http://tauri.localhost/__pdf43__/index.js') }, outfile: `${pkg}/index.js`, legalComments: 'eof',
});
for (const f of ['det_ppocrv4_mobile.onnx', 'cls_mobile_v2.onnx', 'rec_en_ppocrv5.onnx', 'rec_en_dict.txt']) fs.copyFileSync(`models/${f}`, `${pkg}/models/${f}`);
fs.copyFileSync('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm', `${pkg}/ort/ort-wasm-simd-threaded.wasm`);
fs.copyFileSync('plugin.json', `${pkg}/plugin.json`);
for (const f of ['LICENSE', 'NOTICE.md', 'ort-LICENSE.txt']) if (fs.existsSync(f)) fs.copyFileSync(f, `${pkg}/${f}`);
execFileSync('python', ['-I', '-c', `
import zipfile,os,sys
src,out=sys.argv[1],sys.argv[2]
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for root,_,files in os.walk(src):
    for f in files:
      p=os.path.join(root,f); z.write(p, os.path.relpath(p,src).replace(os.sep,'/'))
`, pkg, 'dist/pdf43.oppx'], { stdio: 'inherit' });
const st = fs.statSync('dist/pdf43.oppx');
console.log(`dist/pdf43.oppx ${(st.size / 1e6).toFixed(1)} MB`);
