# MiTek DXF -> to-scale view outlines (mm) for the Seed43 library.
import sys, json, math, os, glob, ezdxf
from ezdxf import path as zpath
from ezdxf import bbox

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0]-a[0], b[1]-a[1]; L = math.hypot(dx, dy)
    dmax, idx = 0, 0
    for i in range(1, len(pts)-1):
        p = pts[i]
        d = abs(dy*(p[0]-a[0]) - dx*(p[1]-a[1]))/L if L else math.hypot(p[0]-a[0], p[1]-a[1])
        if d > dmax: dmax, idx = d, i
    if dmax > eps:
        return rdp(pts[:idx+1], eps)[:-1] + rdp(pts[idx:], eps)
    return [a, b]

def paden(ents):
    uit = []
    for e in ents:
        t = e.dxftype()
        if t in ('HATCH', 'TEXT', 'MTEXT', 'INSERT', 'DIMENSION', 'POINT'):
            if t == 'INSERT': uit += paden(e.virtual_entities())
            continue
        try: p = zpath.make_path(e)
        except Exception: continue
        for sub in p.sub_paths() if p.has_sub_paths else [p]:
            pts = [(v.x, v.y) for v in sub.flattening(0.05)]
            if len(pts) >= 2: uit.append(pts)
    return uit

def isIso(ps):
    rec = schuin = 0
    for pts in ps:
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            L = math.hypot(x2-x1, y2-y1)
            if L < 4: continue
            a = math.degrees(math.atan2(y2-y1, x2-x1)) % 180
            if min(abs(a-0), abs(a-90), abs(a-180)) < 2: rec += L
            elif min(abs(a-30), abs(a-150)) < 4: schuin += L
    return schuin > 0.2 * (rec + schuin)

def ext(ps):
    xs = [x for p in ps for x, _ in p]; ys = [y for p in ps for _, y in p]
    return min(xs), min(ys), max(xs), max(ys)

def product(f):
    d = ezdxf.readfile(f); m = d.modelspace()
    groepen = []
    los = []
    for e in m:
        if e.dxftype() == 'INSERT':
            blk = d.blocks[e.dxf.name]
            if any(x.dxftype() == 'HATCH' for x in blk): continue   # leader with label
            ps = paden(e.virtual_entities())
            if not ps: continue
            x0, y0, x1, y1 = ext(ps)
            if y0 > 660: continue                                # MiTek / brand title
            groepen.append(ps)
        else:
            los += paden([e])
    for p in los: groepen.append([p])
    # join pieces that touch or sit inside each other, until nothing changes
    G = 1.5
    def raak(a, b): return a[0]-G <= b[2] and b[0]-G <= a[2] and a[1]-G <= b[3] and b[1]-G <= a[3]
    cl = [[list(ext(g)), list(g)] for g in groepen]
    veranderd = True
    while veranderd:
        veranderd = False
        uit = []
        for e, g in cl:
            for u in uit:
                if raak(u[0], e):
                    u[0] = [min(u[0][0], e[0]), min(u[0][1], e[1]), max(u[0][2], e[2]), max(u[0][3], e[3])]
                    u[1].extend(g); veranderd = True; break
            else: uit.append([e, g])
        cl = uit
    samen = {i: g for i, (e, g) in enumerate(cl)}
    views = []
    for g in samen.values():
        x0, y0, x1, y1 = ext(g)
        if max(x1-x0, y1-y0) < 3: continue
        views.append({'ps': g, 'e': (x0, y0, x1, y1), 'iso': isIso(g)})
    if not views: return None
    orth = [v for v in views if not v['iso']]
    laag = min(orth or views, key=lambda v: v['e'][1])
    rij = [v for v in orth if v['e'][1] < laag['e'][3] and v['e'][3] > laag['e'][1]]
    top = max(v['e'][3] for v in rij) if rij else laag['e'][3]
    plan = sorted([v for v in orth if v['e'][1] >= top - 1], key=lambda v: v['e'][0])
    rest = sorted([v for v in views if v not in plan], key=lambda v: v['e'][0])
    ortho = [v for v in rest if not v['iso']]; iso = [v for v in rest if v['iso']]
    namen = []
    for i, v in enumerate(plan): namen.append((v, 'plan' + (str(i+1) if i else ''), 'Plan' + (f' {i+1}' if len(plan) > 1 else '')))
    for i, v in enumerate(ortho):
        n = ['Front', 'Side'][i] if i < 2 else f'View {i+1}'
        namen.append((v, n.lower().replace(' ', ''), n))
    for i, v in enumerate(iso): namen.append((v, 'iso' + (str(i+1) if i else ''), '3D' + (f' {i+1}' if len(iso) > 1 else '')))
    res = []
    for v, vid, naam in namen:
        x0, y0, x1, y1 = v['e']; cx, cy = (x0+x1)/2, (y0+y1)/2
        ps = []
        for p in v['ps']:
            q = rdp(p, 0.08)
            plat = []
            for x, y in q: plat += [round((x-cx)*10), round(-(y-cy)*10)]
            # drop repeats
            if len(plat) >= 4: ps.append(plat)
        res.append({'id': vid, 'name': naam, 'w': round(x1-x0, 1), 'h': round(y1-y0, 1), 'p': ps})
    return res

uit = {}
for f in sorted(glob.glob(os.path.join(sys.argv[1], '*.dxf'))):
    n = os.path.basename(f)[:-4]
    if 'range' in n: continue
    r = product(f)
    if r: uit[n.upper()] = r
    print(n.upper(), [(v['name'], v['w'], v['h'], len(v['p'])) for v in r])
json.dump({'source': 'MiTek NZ CAD files (Lumberlok and Bowmac), 1:1 mm', 'units': '0.1 mm, y down, centred', 'products': uit}, open(sys.argv[2], 'w'), separators=(',', ':'))
print(os.path.getsize(sys.argv[2]))
