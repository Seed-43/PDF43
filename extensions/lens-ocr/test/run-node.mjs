// Node harness: node test/run-node.mjs <page.png>  (same pipeline as the add-on)
import fs from 'fs';
import * as ort from 'onnxruntime-node';
import { PNG } from 'pngjs';
import { herken, alfabet, bild } from '../src/pipeline.js';
const M = new URL('../models/', import.meta.url);
const sessie = (f) => ort.InferenceSession.create(new URL(f, M).pathname.replace(/^\/([A-Z]:)/, '$1'));
const [det, cls, rec] = await Promise.all([sessie('det_ppocrv4_mobile.onnx'), sessie('cls_mobile_v2.onnx'), sessie('rec_en_ppocrv5.onnx')]);
const tekens = alfabet(fs.readFileSync(new URL('rec_en_dict.txt', M), 'utf8'));
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const t0 = Date.now();
const woorden = await herken(ort, { det, cls, rec }, tekens, bild(png.width, png.height, new Uint8ClampedArray(png.data)));
console.log(JSON.stringify({ ms: Date.now() - t0, woorden }));
