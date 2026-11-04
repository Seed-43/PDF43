"""Prototype of the Paddle OCR pipeline (PP-OCR via ONNX Runtime) to check
accuracy before porting it to the add-on. Usage:
    python -I proto.py <page.png> [rec_height]
Prints the recognized lines with confidence."""
import sys, os, time
import numpy as np
from PIL import Image
from scipy import ndimage
import onnxruntime as ort

M = os.path.join(os.path.dirname(__file__), '..', 'models')
det = ort.InferenceSession(os.path.join(M, 'det_ppocrv4_mobile.onnx'))
rec = ort.InferenceSession(os.path.join(M, 'rec_en_ppocrv5.onnx'))
cls = ort.InferenceSession(os.path.join(M, 'cls_mobile_v2.onnx'))
DICT = open(os.path.join(M, 'rec_en_dict.txt'), encoding='utf-8').read().split('\n')
if DICT and DICT[-1] == '': DICT.pop()
CHARS = [''] + DICT + [' ']  # 0 = CTC blank, last = space
REC_H = int(sys.argv[2]) if len(sys.argv) > 2 else 48


def detect(img, max_side=3200):
    w, h = img.size
    s = min(1.0, max_side / max(w, h))
    nw, nh = max(32, int(round(w * s / 32)) * 32), max(32, int(round(h * s / 32)) * 32)
    a = np.asarray(img.convert('RGB').resize((nw, nh), Image.BILINEAR), dtype=np.float32) / 255.0
    a = (a - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    prob = det.run(None, {det.get_inputs()[0].name: a.transpose(2, 0, 1)[None].astype(np.float32)})[0][0, 0]
    mask = prob > 0.3
    lab, n = ndimage.label(mask)
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None: continue
        ys, xs = sl
        bh, bw = ys.stop - ys.start, xs.stop - xs.start
        if bh < 3 or bw < 3: continue
        score = prob[sl][lab[sl] == i].mean()
        if score < 0.5: continue
        # unclip: DB shrinks text regions; grow by a share of the short side
        d = 0.75 * min(bh, bw)
        fx, fy = w / nw, h / nh
        boxes.append((max(0, (xs.start - d) * fx), max(0, (ys.start - d) * fy),
                      min(w, (xs.stop + d) * fx), min(h, (ys.stop + d) * fy), float(score)))
    return boxes


def norm_rec(crop):
    w, h = crop.size
    nw = max(8, min(1600, int(round(w * REC_H / h))))
    a = np.asarray(crop.convert('RGB').resize((nw, REC_H), Image.BILINEAR), dtype=np.float32) / 255.0
    return ((a - 0.5) / 0.5).transpose(2, 0, 1)[None].astype(np.float32)


def read(crop):
    out = rec.run(None, {rec.get_inputs()[0].name: norm_rec(crop)})[0][0]
    idx = out.argmax(1); p = out.max(1)
    text, conf, last = [], [], -1
    for i, c in zip(idx, p):
        if i != last and i != 0 and i < len(CHARS):
            text.append(CHARS[i]); conf.append(c)
        last = i
    return ''.join(text), float(np.mean(conf)) if conf else 0.0


def upside_down(crop):
    a = np.asarray(crop.convert('RGB').resize((192, 48), Image.BILINEAR), dtype=np.float32) / 255.0
    a = ((a - 0.5) / 0.5).transpose(2, 0, 1)[None].astype(np.float32)
    p = cls.run(None, {cls.get_inputs()[0].name: a})[0][0]
    return p[1] > p[0] and p[1] > 0.9


def ocr(img):
    out = []
    for x0, y0, x1, y1, sc in detect(img):
        crop = img.crop((int(x0), int(y0), int(x1), int(y1)))
        if crop.height > 1.5 * crop.width:          # vertical line: turn upright
            crop = crop.transpose(Image.ROTATE_270)
        if upside_down(crop):
            crop = crop.transpose(Image.ROTATE_180)
        t, c = read(crop)
        if t.strip(): out.append((t, c, (int(x0), int(y0), int(x1), int(y1))))
    return out


if __name__ == '__main__':
    img = Image.open(sys.argv[1])
    t0 = time.time()
    res = ocr(img)
    print(f'{len(res)} lines in {time.time() - t0:.1f}s')
    for t, c, b in res:
        print(f'{c:.2f} {t}')
