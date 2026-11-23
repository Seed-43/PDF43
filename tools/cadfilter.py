# Clean mitek-cad.json for the library:
#  - drop 3D views (the library places plan / front / side only)
#  - drop lettering embossed in plates (MiTek, product names): a dense cluster
#    of tiny strokes at least 12 mm long (bends and notches are smaller)
#  - drop bolt threads: runs of tightly spaced parallel lines across a bolt,
#    and the zigzag of short slanted strokes along its edges
import sys, json, math, collections
src, dst = sys.argv[1], sys.argv[2]
CEL, KLEIN = 15, 60   # 0.1 mm units

def rechthoek(pts):
    # smallest rectangle around the points (rotating calipers on the hull)
    pts = sorted(set(pts))
    def kruis(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo, hi = [], []
    for p in pts:
        while len(lo) >= 2 and kruis(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(hi) >= 2 and kruis(hi[-2], hi[-1], p) <= 0: hi.pop()
        hi.append(p)
    hull = lo[:-1] + hi[:-1]
    best = None
    for i in range(len(hull)):
        a, b = hull[i], hull[(i + 1) % len(hull)]
        t = math.atan2(b[1]-a[1], b[0]-a[0]); c, s_ = math.cos(t), math.sin(t)
        us = [x*c + y*s_ for x, y in hull]; vs = [-x*s_ + y*c for x, y in hull]
        opp = (max(us)-min(us)) * (max(vs)-min(vs))
        if best is None or opp < best[0]: best = (opp, c, s_, min(us), max(us), min(vs), max(vs))
    _, c, s_, u0, u1, v0, v1 = best
    hoek = [(u0, v0), (u1, v0), (u1, v1), (u0, v1), (u0, v0)]
    uit = []
    for u, w in hoek: uit += [round(u*c - w*s_), round(u*s_ + w*c)]
    return uit

def clusters(items):
    cel = collections.defaultdict(list)
    for i, cx, cy in items: cel[(cx // CEL, cy // CEL)].append(i)
    gezien = set()
    for start in list(cel):
        if start in gezien: continue
        stapel, groep = [start], []
        gezien.add(start)
        while stapel:
            c = stapel.pop(); groep.append(c)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (c[0] + dx, c[1] + dy)
                    if n in cel and n not in gezien: gezien.add(n); stapel.append(n)
        yield [i for c in groep for i in cel[c]]

def schoon(v):
    P = v['p']; weg = set(); nieuw = []
    box = []
    for p in P:
        xs, ys = p[0::2], p[1::2]
        box.append((min(xs), min(ys), max(xs), max(ys)))
    # lettering
    klein = [(i, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2) for i, b in enumerate(box) if max(b[2] - b[0], b[3] - b[1]) < KLEIN]
    for g in clusters(klein):
        if len(g) < 15: continue
        x0 = min(box[i][0] for i in g); x1 = max(box[i][2] for i in g)
        y0 = min(box[i][1] for i in g); y1 = max(box[i][3] for i in g)
        if max(x1 - x0, y1 - y0) < 120: continue
        # Embossed lettering is block letters: most strokes run square to
        # the plate. Screw threads (slanted) and curved logos are left alone.
        recht = schuin = 0
        for i in g:
            p = P[i]
            if len(p) != 4: continue
            a = math.degrees(math.atan2(p[3] - p[1], p[2] - p[0])) % 90
            if min(a, 90 - a) < 5: recht += 1
            else: schuin += 1
        if recht < 0.5 * len(g): continue
        weg.update(g)
    # threads: parallel lines
    lijnen = collections.defaultdict(list)
    for i, p in enumerate(P):
        if len(p) != 4: continue
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
    # (The zigzag along a thread is kept: on screws it is the outline.)
    if weg:
        v['p'] = [p for i, p in enumerate(P) if i not in weg]
    return len(weg)

d = json.load(open(src))
tot = 0
for k, views in d['products'].items():
    views[:] = [v for v in views if not v['id'].startswith(('3d', 'iso'))]
    for v in views:
        n = schoon(v); tot += n
        if n and len(sys.argv) > 3: print(k, v['id'], n)
json.dump(d, open(dst, 'w'), separators=(',', ':'))
print('removed strokes', tot)
