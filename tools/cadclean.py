# Clean the raw MiTek view data for the Seed43 library (units 0.1 mm).
# Rules, in order:
#  1. views: drop 3D views; per product keep only listed views (screws: plan + front)
#  2. marks inside heads: short open strokes (and tiny letters) inside a small
#     closed shape (nail head, nut, screw head) go: V marks, logos, text
#  3. texture: tight clusters of short strokes (nail spirals, thread lines,
#     embossed lettering) go; where nothing else outlines the cluster (a screw
#     thread is its own edge) an outline rectangle takes its place
#  4. hand overrides: boxes to clear per product view (overrides.json)
import sys, json, math, collections
src, dst = sys.argv[1], sys.argv[2]
OVR = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}

KEEP = {'MB': {'side': 'Elevation'}}
STRETCH = {'MB': 'side'}   # strap: drawn to any length, the hole pattern repeats
SCREWS = ('SC3512SS', 'SC3514SS', 'SC7514SS', 'BLUESCREW')

def bbox(p):
    xs, ys = p[0::2], p[1::2]
    return min(xs), min(ys), max(xs), max(ys)

def closed(p):
    return len(p) >= 8 and abs(p[0] - p[-2]) <= 3 and abs(p[1] - p[-1]) <= 3

def area(p):
    a = 0
    for i in range(0, len(p) - 2, 2): a += p[i] * p[i + 3] - p[i + 2] * p[i + 1]
    return abs(a) / 2

def inside(x, y, p):
    c = False; n = len(p) // 2
    for i in range(n):
        x1, y1 = p[2 * i], p[2 * i + 1]; x2, y2 = p[2 * ((i + 1) % n)], p[2 * ((i + 1) % n) + 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-9) + x1: c = not c
    return c

def lengte(p):
    return sum(math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]) for i in range(0, len(p) - 2, 2))

def rechthoek(pts):
    pts = sorted(set(pts))
    if len(pts) < 3: return None
    def kr(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo, hi = [], []
    for p in pts:
        while len(lo) >= 2 and kr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(hi) >= 2 and kr(hi[-2], hi[-1], p) <= 0: hi.pop()
        hi.append(p)
    hull = lo[:-1] + hi[:-1]
    best = None
    for i in range(len(hull)):
        a, b = hull[i], hull[(i + 1) % len(hull)]
        t = math.atan2(b[1]-a[1], b[0]-a[0]); c, s = math.cos(t), math.sin(t)
        us = [x*c + y*s for x, y in hull]; vs = [-x*s + y*c for x, y in hull]
        o = (max(us)-min(us)) * (max(vs)-min(vs))
        if best is None or o < best[0]: best = (o, c, s, min(us), max(us), min(vs), max(vs))
    _, c, s, u0, u1, v0, v1 = best
    uit = []
    for u, w in [(u0, v0), (u1, v0), (u1, v1), (u0, v1), (u0, v0)]: uit += [round(u*c - w*s), round(u*s + w*c)]
    return uit, (u1 - u0, v1 - v0, c, s, u0, u1, v0, v1)

def segmenten(P, B, minL):
    """Long straight pieces: (i, x1, y1, x2, y2, L, angle)."""
    uit = []
    for i, p in enumerate(P):
        for q in range(0, len(p) - 2, 2):
            x1, y1, x2, y2 = p[q], p[q + 1], p[q + 2], p[q + 3]
            L = math.hypot(x2 - x1, y2 - y1)
            if L >= minL: uit.append((i, x1, y1, x2, y2, L, math.atan2(y2 - y1, x2 - x1) % math.pi))
    return uit

def hoekverschil(a, b):
    d = abs(a - b) % math.pi
    return min(d, math.pi - d)

def schoon(k, v):
    P = v['p']; B = [bbox(p) for p in P]; weg = set(); nieuw = []
    maat = lambda b: max(b[2] - b[0], b[3] - b[1])
    # 2. marks in round heads (V on nail heads, logo text on screw heads):
    #    small strokes inside a closed round head 6-16 mm across; a socket
    #    or hex that fills a good part of the head stays
    koppen = [] if (k in SCREWS and v['id'] == 'plan') else [i for i, p in enumerate(P) if closed(p) and len(p) >= 24 and 60 <= maat(B[i]) <= 160
              and 0.8 <= (B[i][2] - B[i][0]) / max(1, B[i][3] - B[i][1]) <= 1.25]
    for i, p in enumerate(P):
        if i in koppen or maat(B[i]) > 70: continue
        b = B[i]
        for j in koppen:
            bj = B[j]
            if not (bj[0] < b[0] and bj[2] > b[2] and bj[1] < b[1] and bj[3] > b[3]): continue
            if not all(inside(p[q], p[q + 1], P[j]) for q in range(0, len(p), 2)): continue
            if closed(p) and maat(b) > 0.2 * maat(bj): break
            weg.add(i); break
    # 3b. thread lines: runs of tightly spaced parallel lines (bolt hatching)
    lijnen = collections.defaultdict(list)
    for i, p in enumerate(P):
        if len(p) != 4 or i in weg: continue
        x1, y1, x2, y2 = p
        L = math.hypot(x2 - x1, y2 - y1)
        if L < 30: continue
        a = math.atan2(y2 - y1, x2 - x1) % math.pi
        nx, ny = -math.sin(a), math.cos(a)
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        lijnen[(round(L / 3), round(math.degrees(a) / 3) % 60)].append((mx * nx + my * ny, mx * math.cos(a) + my * math.sin(a), i))
    for groep in lijnen.values():
        if len(groep) < 5: continue
        groep.sort()
        run = [groep[0]]
        for g in groep[1:] + [None]:
            if g and g[0] - run[-1][0] <= 22 and abs(g[1] - run[-1][1]) <= 15: run.append(g); continue
            if len(run) >= 5: weg.update(r[2] for r in run)
            run = [g] if g else []
    # 3c. embossed block lettering on plates
    klein = [(i, (B[i][0] + B[i][2]) / 2, (B[i][1] + B[i][3]) / 2) for i in range(len(P)) if i not in weg and maat(B[i]) < 60]
    cel = collections.defaultdict(list)
    for i, cx, cy in klein: cel[(cx // 15, cy // 15)].append(i)
    gezien = set()
    for start in list(cel):
        if start in gezien: continue
        stapel, groep = [start], []; gezien.add(start)
        while stapel:
            c = stapel.pop(); groep.append(c)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (c[0] + dx, c[1] + dy)
                    if n in cel and n not in gezien: gezien.add(n); stapel.append(n)
        g = [i for c in groep for i in cel[c]]
        if len(g) < 15: continue
        bb = (min(B[i][0] for i in g), min(B[i][1] for i in g), max(B[i][2] for i in g), max(B[i][3] for i in g))
        if maat(bb) < 120: continue
        recht = sum(1 for i in g if len(P[i]) == 4 and min(math.degrees(math.atan2(P[i][3] - P[i][1], P[i][2] - P[i][0])) % 90, 90 - math.degrees(math.atan2(P[i][3] - P[i][1], P[i][2] - P[i][0])) % 90) < 5)
        if recht >= 0.5 * len(g): weg.update(g)
    o = OVR.get(k, {}).get(v['id'], {})
    zaad_uit = (k in SCREWS and v['id'] == 'plan') or o.get('auto') is False
    # 3d. nails, screw threads, bolt threads: clusters of short slanted strokes.
    #     Everything inside such a cluster's box is redrawn as its silhouette.
    zaad = []
    for i, p in enumerate(P if not zaad_uit else []):
        if i in weg or maat(B[i]) >= 400: continue
        x1, y1, x2, y2 = p[0], p[1], p[-2], p[-1]
        L = math.hypot(x2 - x1, y2 - y1)
        if L < 4: continue
        a = math.degrees(math.atan2(y2 - y1, x2 - x1)) % 90
        schuin = min(a, 90 - a)
        # thread flanks: short and steeply slanted; spiral lines: long and
        # just off the axis (a twisted shank)
        if (L < 60 and schuin >= 12) or (L >= 60 and 2.5 <= schuin <= 20): zaad.append(i)
    cel = collections.defaultdict(list)
    for i in zaad: cel[(((B[i][0] + B[i][2]) / 2) // 30, ((B[i][1] + B[i][3]) / 2) // 30)].append(i)
    gezien = set()
    dozen = []
    for start in list(cel):
        if start in gezien: continue
        stapel, groep = [start], []; gezien.add(start)
        while stapel:
            c = stapel.pop(); groep.append(c)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (c[0] + dx, c[1] + dy)
                    if n in cel and n not in gezien: gezien.add(n); stapel.append(n)
        g = [i for c in groep for i in cel[c]]
        if len(g) < 6: continue
        x0 = min(B[i][0] for i in g); y0 = min(B[i][1] for i in g); x1 = max(B[i][2] for i in g); y1 = max(B[i][3] for i in g)
        w, h = x1 - x0, y1 - y0
        if max(w, h) < 2.5 * min(w, h) or max(w, h) < 60 or min(w, h) > 200: continue
        if h >= w: dozen.append((x0 - 15, y0 - 40, x1 + 15, y1 + 40, 'y'))
        else: dozen.append((x0 - 40, y0 - 15, x1 + 40, y1 + 15, 'x'))
    for (x0, y0, x1, y1, as_) in dozen:
        binnen = [i for i, b in enumerate(B) if i not in weg and b[0] >= x0 and b[2] <= x1 and b[1] >= y0 and b[3] <= y1]
        if len(binnen) < 8: continue
        poly = omhulsel([P[i] for i in binnen], as_)
        if poly: weg.update(binnen); nieuw.append(poly)
    # 4. hand overrides: {"clear": [[x0,y0,x1,y1]...], "envelope": [[x0,y0,x1,y1,"x"|"y"]...]} in mm
    for box in o.get('clear', []):
        x0, y0, x1, y1 = [round(z * 10) for z in box[:4]]
        grens = box[4] * 10 if len(box) > 4 else 25   # only strokes smaller than this (text)
        for i, b in enumerate(B):
            if b[0] >= x0 and b[2] <= x1 and b[1] >= y0 and b[3] <= y1 and maat(b) <= grens: weg.add(i)
    for box in o.get('envelope', []):
        x0, y0, x1, y1 = [round(z * 10) for z in box[:4]]
        binnen = [i for i, b in enumerate(B) if i not in weg and b[0] >= x0 and b[2] <= x1 and b[1] >= y0 and b[3] <= y1]
        poly = omhulsel([P[i] for i in binnen], box[4] if len(box) > 4 else ('y' if y1 - y0 >= x1 - x0 else 'x'))
        if poly: weg.update(binnen); nieuw.append(poly)
    v['p'] = [p for i, p in enumerate(P) if i not in weg] + nieuw
    return len(weg), len(nieuw)

def omhulsel(paden, as_='y', stap=5):
    """Silhouette of strokes along an axis: the outline a thread or nail shows."""
    pts = []
    for p in paden:
        for q in range(0, len(p) - 2, 2):
            x1, y1, x2, y2 = p[q], p[q + 1], p[q + 2], p[q + 3]
            n = max(1, int(math.hypot(x2 - x1, y2 - y1) // 2))
            for t in range(n + 1): pts.append((x1 + (x2 - x1) * t / n, y1 + (y2 - y1) * t / n))
    if len(pts) < 3: return None
    if as_ == 'x': pts = [(y, x) for x, y in pts]
    rij = collections.defaultdict(list)
    for x, y in pts: rij[int(y // stap)].append(x)
    ks = sorted(rij)
    links = [(min(rij[k]), k * stap + stap / 2) for k in ks]
    rechts = [(max(rij[k]), k * stap + stap / 2) for k in ks]
    # smooth the crests: a thread outline is straight along each side
    def glad(rij_, f):
        uit = []
        for i in range(len(rij_)):
            venster = [rij_[j][0] for j in range(max(0, i - 3), min(len(rij_), i + 4))]
            uit.append((f(venster), rij_[i][1]))
        return uit
    links, rechts = glad(links, min), glad(rechts, max)
    ring = links + rechts[::-1] + [links[0]]
    ring = rdp(ring, 3)
    if as_ == 'x': ring = [(y, x) for x, y in ring]
    uit = []
    for x, y in ring: uit += [round(x), round(y)]
    return uit

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0]-a[0], b[1]-a[1]; L = math.hypot(dx, dy)
    dmax, idx = 0, 0
    for i in range(1, len(pts)-1):
        p = pts[i]
        dd = abs(dy*(p[0]-a[0]) - dx*(p[1]-a[1]))/L if L else math.hypot(p[0]-a[0], p[1]-a[1])
        if dd > dmax: dmax, idx = dd, i
    if dmax > eps: return rdp(pts[:idx+1], eps)[:-1] + rdp(pts[idx:], eps)
    return [a, b]

d = json.load(open(src))
for k, views in d['products'].items():
    views[:] = [v for v in views if not v['id'].startswith(('3d', 'iso'))]
    if k in KEEP:
        views[:] = [dict(v, name=KEEP[k][v['id']]) for v in views if v['id'] in KEEP[k]]
    if k in SCREWS:
        views[:] = [v for v in views if v['id'] in ('plan', 'front')]
    for v in views:
        if STRETCH.get(k) == v['id']: v['stretch'] = True
        n = schoon(k, v)
        if '-v' in sys.argv: print(k, v['id'], n)
d['source'] = 'MiTek NZ CAD files (Lumberlok and Bowmac), 1:1 mm; cleaned: no 3D views, lettering, logos, nail spirals or thread patterns'
json.dump(d, open(dst, 'w'), separators=(',', ':'))
