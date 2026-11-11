"""Write the United Kingdom region of data/nz-steel.seed43lib.json.

Steel
- UB, UC, PFC and the large equal and unequal angles: British Steel
  "Sections: dimensions and properties" datasheets (UK sections datasheets,
  CUBD:ENG:072026, britishsteel.co.uk), BS 4-1 / BS EN 10365 / BS EN 10056-1.
- Smaller angles and the hot-finished SHS, RHS and CHS ranges (BS EN 10210-2):
  Koyda Ltd "Steel Section Tables" KOY-STT-001 Rev C (koyda.com), which gives
  mass, A, I and the elastic modulus. The plastic modulus and the torsion
  constant of hollow sections are calculated here from the nominal
  dimensions with the EN 10210-2 corner radii (outside 1.5 t, inside 1.0 t);
  the calculated A and I are checked against the published figures.
Parse the PDFs once with
    python tools/uk-library.py UK-sections-datasheets.pdf koyda-steel-section-tables.pdf
which writes tools/uk-steel-sections.json; later runs read that file.
Timber
- C16 and C24 sawn softwood and CLS: BS EN 336 sizes as stocked by UK
  merchants. Section properties are geometric.
- Glulam: Sodra Wood UK stock range (November 2025): GL24h system beams and
  GL28c visual beams.
- Kerto-S LVL (Metsa Wood): S-beam common sizes, 45 to 63 thick, 200 to 600 deep.
- JJI-Joists (James Jones and Sons technical manual, November 2023): 45 deep
  flanges 47 (A+), 63 (B+), 72 (C) and 97 (D) wide, 9 mm OSB web.
Bolts: the same metric bolts as the NZ library.
Units in the library are mm (A mm2, I mm4, Z and S mm3, J mm4, Iw mm6).
"""

import copy
import json
import math
import pathlib
import re
import sys

PAD = pathlib.Path('data/nz-steel.seed43lib.json')
BRON = pathlib.Path(__file__).with_name('uk-steel-sections.json')
UK = 'United Kingdom'
BS = 'British Steel UK sections datasheets (CUBD:ENG:072026).'
KOYDA = 'Koyda Steel Section Tables KOY-STT-001 Rev C.'

# British Steel: section heading -> key. Dimension pages list the designation
# first, property pages last.
BS_KOPPEN = [('Universal beams (UB)', 'UB'), ('Universal columns (UC)', 'UC'), ('Universal bearing piles', 'UBP'),
             ('Parallel flange channels (PFC)', 'PFC'), ('Asymmetric beams', 'ASB'), ('Unequal angles (UA)', 'UA'),
             ('Equal angles (EA)', 'EA')]
BS_KOL = {
    'UB': ('m D B t T r d B2T dt Ix Iy rx ry', 'Zx Zy Sx Sy u x H J A'),
    'UC': ('m D B t T r d B2T dt Ix Iy rx ry', 'Zx Zy Sx Sy u x H J A'),
    'PFC': ('m D B t T Cy r d B2T dt Ix Iy rx', 'ry Zx Zy Sx Sy u x H J A'),
    'EA': ('m h b s r1 r2 A C Ix Iu Iv', 'rx ru rv Zx J Fa sm st'),
    'UA': ('m h b s r1 r2 A Cx Cy Ix Iy Iu Iv', 'rx ry ru rv Zx Zy tana J Fa1 Fa2 Ya'),
}
KOYDA_KOL = {
    'PFC': 'm h b tw tf r cy A Ix Zx', 'EA': 'm a t r1 r2 A c Ix Zx', 'UA': 'm a b t r1 r2 A cx cy Ix Iy',
    'SHS': 'm h t A I Z', 'RHS': 'm h b t A Ix Iy Zx Zy', 'CHS': 'm d t A I Z',
}
KOYDA_KOPPEN = [('Equal angles (EA)', 'EA'), ('Unequal angles (UA)', 'UA'), ('Square hollow sections (SHS)', 'SHS'),
                ('Rectangular hollow sections (RHS)', 'RHS'), ('Circular hollow sections (CHS)', 'CHS'),
                ('Universal beams (UB)', None), ('Universal columns (UC)', None), ('Parallel flange channels (PFC)', 'PFC'),
                ('Standards, method', None)]
GETAL = re.compile(r'^-?[\d,]*\.?\d+$')


def getal(s):
    return float(s.replace(',', ''))


def ontleed_bs(pdf):
    import pymupdf
    uit, sleutel = {}, None
    for p in pymupdf.open(pdf):
        regels = [r.strip() for r in p.get_text().split('\n')]
        tekst = '\n'.join(regels)
        gevonden = [(tekst.find(k), s) for k, s in BS_KOPPEN if k in tekst]
        if gevonden:
            sleutel = min(gevonden)[1]
        if sleutel not in BS_KOL:
            continue
        maat = 'Mass' in tekst
        kol = BS_KOL[sleutel][0 if maat else 1].split()
        naam = re.compile(r'^\d+ x \d+ x \d+(\.\d+)?\s*\*?$')
        rijen = uit.setdefault(sleutel, {})
        buf, huidig = [], None
        for r in regels:
            if naam.match(r):
                n = re.sub(r'\s+', ' ', r.rstrip('* ')).replace(' x ', 'x')
                if maat:
                    huidig = n
                    buf = []
                else:
                    if len(buf) >= len(kol):
                        rijen.setdefault(n, {}).update(zip(kol, buf[-len(kol):]))
                    buf = []
            elif GETAL.match(r):
                buf.append(getal(r))
                if maat and huidig and len(buf) == len(kol):
                    rijen.setdefault(huidig, {}).update(zip(kol, buf))
                    huidig = None
    # The datasheet names the new 406 x 260 UBs 410 x 260 on the property pages.
    ub = uit.get('UB', {})
    for n in [n for n in ub if n.startswith('410x260x')]:
        ub.setdefault(n.replace('410x', '406x', 1), {}).update(ub.pop(n))
    return uit


def ontleed_koyda(pdf):
    import pymupdf
    uit, sleutel = {}, None
    naam = re.compile(r'^\d+(\.\d+)?( × \d+(\.\d+)?){1,2}$')
    for p in pymupdf.open(pdf):
        regels = [r.strip() for r in p.get_text().split('\n')]
        tekst = '\n'.join(regels)
        gevonden = [(tekst.find(k), s) for k, s in KOYDA_KOPPEN if k in tekst]
        if gevonden:
            sleutel = min(gevonden)[1]
        if sleutel not in KOYDA_KOL:
            continue
        kol = KOYDA_KOL[sleutel].split()
        rijen = uit.setdefault(sleutel, {})
        huidig, buf = None, []
        def sluit():
            if huidig and len(buf) == len(kol):
                rijen[huidig] = dict(zip(kol, buf))
            elif huidig and buf:
                print(f'  Koyda {sleutel} {huidig}: {len(buf)} values, expected {len(kol)}; skipped')
        for r in regels:
            if naam.match(r):
                sluit()
                huidig, buf = r.replace(' × ', 'x'), []
            elif huidig and GETAL.match(r):
                buf.append(getal(r))
        sluit()
    return uit


# Hollow sections (EN 10210-2, hot finished): ro = 1.5 t, ri = 1.0 t.
def breedte(y, B, H, r):
    """Width of a rounded rectangle B x H (corner radius r) at height y from the centre."""
    y = abs(y)
    if y > H / 2:
        return 0.0
    k = y - (H / 2 - r)
    return B if k <= 0 else B - 2 * (r - math.sqrt(max(r * r - k * k, 0.0)))


def kokervorm(H, B, t):
    ro, ri = 1.5 * t, 1.0 * t
    n = 4000
    dy = (H / 2) / n
    A = I = S = 0.0
    for i in range(n):
        y = (i + 0.5) * dy
        w = breedte(y, B, H, ro) - breedte(y, B - 2 * t, H - 2 * t, ri)
        A += 2 * w * dy
        I += 2 * w * y * y * dy
        S += 2 * w * y * dy
    rc = (ro + ri) / 2
    p = 2 * ((B - t) + (H - t)) - 2 * rc * (4 - math.pi)
    Ah = (B - t) * (H - t) - rc * rc * (4 - math.pi)
    J = t ** 3 * p / 3 + 4 * Ah * Ah * t / p
    return A, I, S, J


def koker(r, rond=False):
    if rond:
        d, t = r['d'], r['t']
        di = d - 2 * t
        A = math.pi * (d * d - di * di) / 4
        I = math.pi * (d ** 4 - di ** 4) / 64
        return {'A': A, 'Ix': I, 'Sx': (d ** 3 - di ** 3) / 6, 'J': 2 * I}
    H, B, t = r['h'], r.get('b', r['h']), r['t']
    A, Ix, Sx, J = kokervorm(H, B, t)
    _, Iy, Sy, _ = kokervorm(B, H, t)
    return {'A': A, 'Ix': Ix, 'Iy': Iy, 'Sx': Sx, 'Sy': Sy, 'J': J}


def sig(v, n=3):
    """Round to n significant figures, like the published tables."""
    if not v:
        return 0
    return round(v, -int(math.floor(math.log10(abs(v)))) + n - 1)


def main():
    if len(sys.argv) > 2:
        data = {'bs': ontleed_bs(sys.argv[1]), 'koyda': ontleed_koyda(sys.argv[2])}
        BRON.write_text(json.dumps(data, indent=1) + '\n', encoding='utf-8')
    else:
        data = json.loads(BRON.read_text(encoding='utf-8'))
    bs, ky = data['bs'], data['koyda']
    lib = json.loads(PAD.read_text(encoding='utf-8'))
    nz = {c['id']: c for c in lib['categories']}
    cats = []

    def cat(cid, naam, shape, fields, note, items, group=None, kind='section'):
        c = {'id': cid, 'name': naam, 'region': UK, 'kind': kind, 'shape': shape, 'fields': fields, 'note': note, 'items': items}
        if group:
            c['group'] = group
        cats.append(c)

    def mm(r, k, f):
        return round(r[k] * f, 6) if k in r else None

    ivelden = ['d', 'b', 'tf', 'tw', 'r1', 'mass', 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'Sx', 'Sy', 'J', 'Iw']
    def i_item(naam, r):
        it = {'name': naam, 'd': r['D'], 'b': r['B'], 'tf': r['T'], 'tw': r['t'], 'r1': r['r'], 'mass': r['m']}
        for k, bron, f in (('A', 'A', 1e2), ('Ix', 'Ix', 1e4), ('Iy', 'Iy', 1e4), ('Zx', 'Zx', 1e3), ('Zy', 'Zy', 1e3),
                           ('Sx', 'Sx', 1e3), ('Sy', 'Sy', 1e3), ('J', 'J', 1e4), ('Iw', 'H', 1e12)):
            v = mm(r, bron, f)
            if v is not None:
                it[k] = v
        return it
    def volgorde(n):
        return [float(x) for x in n.split('x')]
    for key, cid, naam, shape, oms in (('UB', 'uk-ub', 'UB', 'I', 'Universal beams'), ('UC', 'uk-uc', 'UC', 'I', 'Universal columns'),
                                       ('PFC', 'uk-pfc', 'PFC', 'channel', 'Parallel flange channels')):
        rij = {n: r for n, r in bs.get(key, {}).items() if 'D' in r}
        noot = ''
        if key == 'PFC':
            # Sizes British Steel does not roll: dimensions, A, Ix and Zx from Koyda.
            for n, r in ky.get('PFC', {}).items():
                if n not in rij:
                    rij[n] = {'D': r['h'], 'B': r['b'], 'T': r['tf'], 't': r['tw'], 'r': r['r'], 'm': r['m'], 'A': r['A'], 'Ix': r['Ix'], 'Zx': r['Zx']}
            noot = f' 100, 125, 380 and 430 deep from {KOYDA}'
        cat(cid, naam, shape, ivelden, f'{oms}, serial size h x b x mass (BS 4-1 / BS EN 10365). {BS}{noot}',
            [i_item(n, rij[n]) for n in sorted(rij, key=volgorde)])

    hvelden = ['d', 'b', 'tf', 'tw', 'r1', 'mass', 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'J']
    def bs_hoek(n, r, gelijk):
        it = {'name': n, 'd': r['h'], 'b': r['b'], 'tf': r['s'], 'tw': r['s'], 'r1': r['r1'], 'mass': r['m'], 'A': round(r['A'] * 100, 6),
              'Ix': round(r['Ix'] * 1e4, 6), 'Iy': round((r['Ix'] if gelijk else r['Iy']) * 1e4, 6)}
        if 'Zx' in r:
            it['Zx'] = round(r['Zx'] * 1e3, 6)
            it['Zy'] = round((r['Zx'] if gelijk else r['Zy']) * 1e3, 6)
        if 'J' in r:
            it['J'] = round(r['J'] * 1e4, 6)
        return it
    def ky_hoek(n, r, gelijk):
        a, b = r['a'], (r['a'] if gelijk else r['b'])
        it = {'name': n, 'd': a, 'b': b, 'tf': r['t'], 'tw': r['t'], 'r1': r['r1'], 'mass': r['m'], 'A': round(r['A'] * 100, 6),
              'Ix': round(r['Ix'] * 1e4, 6), 'Iy': round((r['Ix'] if gelijk else r['Iy']) * 1e4, 6)}
        if gelijk and 'Zx' in r:
            it['Zx'] = it['Zy'] = round(r['Zx'] * 1e3, 6)
        return it
    for key, cid, naam, gelijk in (('EA', 'uk-ea', 'Equal angles', True), ('UA', 'uk-ua', 'Unequal angles', False)):
        rij = {n: bs_hoek(n, r, gelijk) for n, r in bs.get(key, {}).items() if 'h' in r}
        for n, r in ky.get(key, {}).items():
            rij.setdefault(n, ky_hoek(n, r, gelijk))
        cat(cid, naam, 'angle', hvelden, f'{naam}, h x b x t (BS EN 10056-1). Large sizes and J from {BS} Smaller sizes from {KOYDA}',
            [rij[n] for n in sorted(rij, key=volgorde)])

    afwijking = []
    def controleer(naam, k, eigen, gepubliceerd):
        if gepubliceerd and abs(eigen / gepubliceerd - 1) > 0.03:
            afwijking.append(f'{naam} {k}: calculated {eigen:.4g}, published {gepubliceerd:.4g}')
    for key, cid, naam in (('SHS', 'uk-shs', 'SHS'), ('RHS', 'uk-rhs', 'RHS')):
        items = []
        for n, r in sorted(ky.get(key, {}).items(), key=lambda x: volgorde(x[0])):
            b = r.get('b', r['h'])
            g = koker(r)
            controleer(n, 'A', g['A'], r['A'] * 100)
            controleer(n, 'Ix', g['Ix'], (r.get('Ix') or r.get('I')) * 1e4)
            Zx = (r.get('Zx') or r.get('Z')) * 1e3
            Zy = (r.get('Zy') or r.get('Z')) * 1e3
            items.append({'name': n, 'd': r['h'], 'b': b, 't': r['t'], 'ro': 1.5 * r['t'], 'ri': r['t'], 'mass': r['m'],
                          'A': round(r['A'] * 100, 6), 'Ix': round((r.get('Ix') or r.get('I')) * 1e4, 6),
                          'Iy': round((r.get('Iy') or r.get('I')) * 1e4, 6), 'Zx': round(Zx, 6), 'Zy': round(Zy, 6),
                          'Sx': sig(g['Sx']), 'Sy': sig(g['Sy']), 'J': sig(g['J'])})
        cat(cid, naam, 'rhs', ['d', 'b', 't', 'ri', 'ro', 'mass', 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'Sx', 'Sy', 'J'],
            f'{"Square" if key == "SHS" else "Rectangular"} hollow sections, hot finished, h x b x t (BS EN 10210-2). '
            f'Mass, A, I and elastic modulus from {KOYDA} Plastic modulus S and torsion constant J calculated from the nominal '
            'dimensions (corner radii 1.5 t outside, 1.0 t inside). Cold-formed (EN 10219) sections differ.', items)
    chs = []
    for n, r in sorted(ky.get('CHS', {}).items(), key=lambda x: volgorde(x[0])):
        g = koker(r, rond=True)
        controleer(n, 'A', g['A'], r['A'] * 100)
        controleer(n, 'Ix', g['Ix'], r['I'] * 1e4)
        chs.append({'name': n, 'd': r['d'], 't': r['t'], 'mass': r['m'], 'A': round(r['A'] * 100, 6), 'Ix': round(r['I'] * 1e4, 6),
                    'Zx': round(r['Z'] * 1e3, 6), 'Sx': sig(g['Sx']), 'J': sig(g['J'])})
    cat('uk-chs', 'CHS', 'chs', ['d', 't', 'mass', 'A', 'Ix', 'Zx', 'Sx', 'J'],
        f'Circular hollow sections, hot finished, D x t (BS EN 10210-2). Mass, A, I and elastic modulus from {KOYDA} '
        'Plastic modulus S and J calculated from the nominal dimensions.', chs)
    for a in afwijking:
        print('  check:', a)

    # Timber
    def rechthoek(d, b):
        return {'A': d * b, 'Ix': round(b * d ** 3 / 12), 'Iy': round(d * b ** 3 / 12), 'Zx': round(b * d ** 2 / 6), 'Zy': round(d * b ** 2 / 6)}
    def hout(maten, **extra):
        return [dict({'name': f'{d}x{b}', 'd': d, 'b': b}, **extra, **rechthoek(d, b)) for d, b in maten]
    tvelden = ['d', 'b', 'grade', 'A', 'Ix', 'Iy', 'Zx', 'Zy']
    zaag = ([(d, 47) for d in (75, 100, 125, 150, 175, 200, 225, 250, 275, 300)]
            + [(d, 63) for d in (150, 175, 200, 225)] + [(d, 75) for d in (150, 200, 225, 250, 300)])
    for g in ('C16', 'C24'):
        cat(f'uk-{g.lower()}', f'{g} sawn', 'rect', tvelden,
            f'{g} strength graded softwood (BS EN 338 / BS EN 14081), regularised BS EN 336 sizes as stocked by UK merchants, '
            'kiln dried, treated or untreated. Check stock with the supplier. Section properties are geometric.',
            hout(zaag, grade=g), 'Timber')
    cat('uk-cls', 'CLS', 'rect', tvelden,
        'CLS (Canadian Lumber Standard) studwork, C16 or C24, eased edges: 38 x 63, 89, 140, 184 and 235. Section properties are geometric.',
        hout([(63, 38), (89, 38), (140, 38), (184, 38), (235, 38)], grade='C16 / C24'), 'Timber')
    gl24 = [(240, 38), (220, 45), (225, 45), (240, 45), (253, 45), (300, 45), (302, 45), (220, 90), (240, 90), (253, 90),
            (300, 90), (302, 90), (240, 140), (253, 140), (302, 140)]
    gl28 = [(225, 90), (270, 90), (315, 90), (360, 90), (405, 90), (450, 90), (270, 115), (315, 115), (360, 115), (405, 115),
            (450, 115), (495, 115), (140, 140), (225, 140), (270, 140), (315, 140), (360, 140), (405, 140), (450, 140), (495, 140)]
    cat('uk-glulam-gl24h', 'Glulam GL24h', 'glulam', tvelden,
        'GL24h glulam system beams, industrial finish (Sodra Wood UK stock range, November 2025). Other sizes and grades '
        '(GL24c to GL30h, 38 to 280 wide, 80 to 1680 deep) to order. Section properties are geometric.',
        hout(gl24, grade='GL24h'), 'Timber')
    cat('uk-glulam-gl28c', 'Glulam GL28c', 'glulam', tvelden,
        'GL28c glulam beams, visual finish (Sodra Wood UK stock range, November 2025). Section properties are geometric.',
        hout(gl28, grade='GL28c'), 'Timber')
    kerto = [(d, b) for b in (45, 51, 57, 63) for d in (200, 220, 240, 260, 300, 360, 400, 450, 600)]
    cat('uk-kerto-s', 'Kerto-S LVL', 'lvl', tvelden,
        'Metsa Wood Kerto LVL S-beam (LVL 48 P), common sizes: 45, 51, 57 and 63 thick, 200 to 600 deep (27 to 75 thick on order). '
        'Check UK stock with the merchant. Section properties are geometric.',
        hout(kerto, grade='Kerto-S'), 'Timber')
    jji = [(195, 'A+'), (195, 'B+'), (195, 'C'), (195, 'D')] + [(d, f) for d in (220, 235, 240, 245, 300, 350) for f in ('A+', 'B+', 'C', 'D')] + [(400, 'D')]
    breed = {'A+': 47, 'B+': 63, 'C': 72, 'D': 97}
    cat('uk-jji', 'JJI-Joists', 'ijoist', ['d', 'b', 'tf', 'tw', 'grade'],
        'James Jones JJI-Joists (technical manual, November 2023): 45 deep softwood flanges, 47 (A+), 63 (B+), 72 (C) or 97 (D) wide, '
        '9 mm OSB/3 web. Depths from the span tables: 195 to 350, and 400 D.',
        [{'name': f'JJI {d}{f}', 'd': d, 'b': breed[f], 'tf': 45, 'tw': 9, 'grade': f} for d, f in jji], 'Timber')

    bouten = copy.deepcopy(nz['bolts'])
    bouten.update({'id': 'uk-bolts', 'region': UK})
    bouten['note'] = ((bouten.get('note') or '') + ' The same metric bolts are used in the UK (BS EN ISO 4014 / 4017, grades 4.6 and 8.8).').strip()
    cats.append(bouten)

    nieuw = {c['id'] for c in cats}
    lib['categories'] = [c for c in lib['categories'] if c['id'] not in nieuw] + cats
    PAD.write_text(json.dumps(lib, indent=1, ensure_ascii=True) + '\n', encoding='utf-8', newline='\n')
    for c in cats:
        print(f"{c['id']:18} {len(c['items'])}")


if __name__ == '__main__':
    main()
