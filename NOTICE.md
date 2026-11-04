# Third-party components

Seed43 bundles the following, each under its own licence.

| Component | Files | Licence | Source |
|---|---|---|---|
| PP-OCRv4 mobile text detection | `models/det_ppocrv4_mobile.onnx` | Apache-2.0 | PaddleOCR (PaddlePaddle), ONNX conversion from RapidOCR (huggingface.co/SWHL/RapidOCR) |
| PP-OCR mobile v2.0 text line direction classifier | `models/cls_mobile_v2.onnx` | Apache-2.0 | PaddleOCR (PaddlePaddle), ONNX conversion from RapidOCR |
| PP-OCRv5 English text recognition and dictionary | `models/rec_en_ppocrv5.onnx`, `models/rec_en_dict.txt` | Apache-2.0 | PaddleOCR (PaddlePaddle), ONNX conversion from huggingface.co/monkt/paddleocr-onnx |
| ONNX Runtime Web | `index.js` (bundled), `ort/ort-wasm-simd-threaded.wasm` | MIT | github.com/microsoft/onnxruntime |
