// Paddle OCR: a PaddleOCR (PP-OCR) engine for Open PDF Studio. It registers
// itself as an OCR engine; pick "Paddle OCR" as the engine in
// Recognize Text (OCR) and the app uses it for the searchable text layer,
// page labels and form recognition. Everything runs locally: the models and
// ONNX Runtime ship inside the Seed43 extension.

import * as ort from 'onnxruntime-web/wasm';
import { herken, alfabet, bild } from './pipeline.js';

const DPI = 200;            // page raster for recognition
const TEGEL_PX = 1900;      // tile side in pixels (host limit 2048 / 4 MP)

let laden = null;           // Promise<{ sessies, tekens }>

async function laadModellen(api) {
  const [wasm, det, cls, rec, dict] = await Promise.all([
    api.readAsset('ort/ort-wasm-simd-threaded.wasm'),
    api.readAsset('models/det_ppocrv4_mobile.onnx'),
    api.readAsset('models/cls_mobile_v2.onnx'),
    api.readAsset('models/rec_en_ppocrv5.onnx'),
    api.readAsset('models/rec_en_dict.txt'),
  ]);
  ort.env.wasm.wasmBinary = wasm;
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  const opties = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
  const [sDet, sCls, sRec] = await Promise.all([
    ort.InferenceSession.create(new Uint8Array(det), opties),
    ort.InferenceSession.create(new Uint8Array(cls), opties),
    ort.InferenceSession.create(new Uint8Array(rec), opties),
  ]);
  return { sessies: { det: sDet, cls: sCls, rec: sRec }, tekens: alfabet(new TextDecoder().decode(dict)) };
}

/** The page (or a region of it) as RGBA pixels, assembled from host tiles. */
async function rasterVan(request, gebied, schaal) {
  const breedtePx = Math.ceil(gebied.width * schaal), hoogtePx = Math.ceil(gebied.height * schaal);
  const doek = new OffscreenCanvas(breedtePx, hoogtePx);
  const ctx = doek.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, breedtePx, hoogtePx);
  const tegelPt = TEGEL_PX / schaal;
  for (let y = 0; y < gebied.height; y += tegelPt) {
    for (let x = 0; x < gebied.width; x += tegelPt) {
      const rect = {
        x: gebied.x + x, y: gebied.y + y,
        width: Math.min(tegelPt, gebied.width - x), height: Math.min(tegelPt, gebied.height - y),
      };
      const tegel = await request.renderTile(rect, { scale: schaal });
      const bmp = await createImageBitmap(tegel.blob);
      ctx.drawImage(bmp, Math.round(x * schaal), Math.round(y * schaal));
      bmp.close?.();
    }
  }
  const data = ctx.getImageData(0, 0, breedtePx, hoogtePx).data;
  return bild(breedtePx, hoogtePx, data);
}

export async function registreerOcr(api) {
  if (api.features?.ocrEngines !== true || api.features?.assets !== true) {
    console.warn('[seed43] this Open PDF Studio has no OCR engine slot; update the app');
    return;
  }
  await api.registerOcrEngine({
    id: 'paddleocr',
    label: 'Paddle OCR',
    languages: ['eng'],
    region: true,
    async recognize(request) {
      laden ||= laadModellen(api).catch((e) => { laden = null; throw e; });
      const { sessies, tekens } = await laden;
      const gebied = request.region
        ? clampGebied(request.region, request.page)
        : { x: 0, y: 0, width: request.page.width, height: request.page.height };
      // A small region (a title block box) gets a finer raster.
      const schaal = request.region
        ? Math.min(8, Math.max(DPI / 72, 1200 / Math.max(gebied.width, gebied.height)))
        : DPI / 72;
      const img = await rasterVan(request, gebied, schaal);
      if (request.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const woorden = await herken(ort, sessies, tekens, img);
      return woorden.map((w) => ({
        text: w.text,
        left: gebied.x + w.left / schaal, top: gebied.y + w.top / schaal,
        width: w.width / schaal, height: w.height / schaal,
        confidence: w.confidence,
      }));
    },
  });
}

function clampGebied(r, page) {
  const x = Math.max(0, Math.min(page.width - 1, r.x)), y = Math.max(0, Math.min(page.height - 1, r.y));
  return { x, y, width: Math.max(1, Math.min(page.width - x, r.width)), height: Math.max(1, Math.min(page.height - y, r.height)) };
}

export async function stopOcr(api) {
  laden = null;
  try { await api?.unregisterOcrEngine?.('paddleocr'); } catch {}
}
