# Lens OCR

A text recognition (OCR) engine add-on for [Open PDF Studio](https://github.com/OpenAEC-Foundation/open-pdf-studio), built on PaddleOCR (PP-OCR) and running locally through ONNX Runtime.

It finds every text line on a page and turns each line upright before reading it. Drawings that mix horizontal and vertical text, and sheets stored sideways, read in one pass. On a test architectural sheet it read 380 clean words where the built-in Tesseract read 38, and every drawing number in the title blocks (A1-1, A2-0, A2-3...) correctly.

## Install

In Open PDF Studio: **Extensions > Browse**, find Lens OCR, **Install**. Or **Extensions > Add custom** with this repository's link, or download `lens-ocr.oppx` from the latest release and use **Install from File**.

Then open **Recognize Text (OCR)** and set **Engine** to **Lens OCR (PaddleOCR)**. The app uses it for the searchable text layer, page labels and form recognition. If it fails, the app falls back to its built-in Tesseract.

Needs an Open PDF Studio build with the OCR engine slot (`api.features.ocrEngines`).

## Build

```bash
npm install
node build.mjs          # dist/lens-ocr.oppx
node test/run-node.mjs page.png   # same pipeline in Node, for testing
```

`proto/proto.py` is the Python prototype used to check accuracy.

## Licence

Apache-2.0. The bundled models and ONNX Runtime keep their own licences; see [NOTICE.md](NOTICE.md).
