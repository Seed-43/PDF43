"""Write the Australia region of data/nz-steel.seed43lib.json.

The same kinds of elements as New Zealand, from Australian sources:

Steel
- Hot-rolled and welded sections, hollow sections, flats, rounds and squares:
  the same AS/NZS 3679 / AS/NZS 1163 sections as the NZ library (copied from
  its categories; check supplier stock before use).
- Lysaght Zeds & Cees purlins and girts: "Zeds and Cees User Guide",
  Lysaght, dimensions table (D, E, F, B, L, t, mass).
Timber
- MGP10 / MGP12 pine and F17 kiln-dried hardwood: Australian stock sizes
  (merchant listings, 2026). Section properties are geometric.
- Meyer Timber meySPAN LVL (calcs.com, from meySPAN13/14 guides) and
  meyJOIST (meyJOIST Product Manual, September 2024, Table 1). meyJOIST
  flange depth and web thickness are not published there; the hyJOIST values
  (same product family) are used and marked estimated.
- Wesbeam e-beam and e-beam+ (F17) LVL (calcs.com, from the December 2018
  Wesbeam design criteria).
- Hyne Beam 17 (GL17) and Beam 18 (GL18) glulam (calcs.com, Hyne design
  data).
Fixings
- MiTek Australia JoistHanger (data sheet 2024, Table 1: A width, B height,
  C 31 flange) and I-BeamHangers face fix and top fix (I-BeamHanger guide).
- Pryda joist hangers (MPFBK / FB / FBF, 1.0 mm), heavy duty JHH (1.2 mm)
  and split SJH (1.95 mm) (pryda.com.au product pages).
  Side plate length L and face flange F, where not published, are estimated.
Bolts: the same metric bolts as NZ (AS 1111 / AS 1252).

Run from the repo root after the NZ generators:
    python tools/australia-library.py
"""

import copy
import json
import pathlib

PAD = pathlib.Path('data/nz-steel.seed43lib.json')
AU = 'Australia'
STAAL_NZ = ['ub', 'uc', 'wb', 'wc', 'pfc', 'ea', 'ua', 'shs', 'rhs', 'chs', 'fl', 'rd', 'sq', 'bolts']


def rechthoek(d, b):
    return {'A': d * b, 'Ix': round(b * d ** 3 / 12), 'Iy': round(d * b ** 3 / 12),
            'Zx': round(b * d ** 2 / 6), 'Zy': round(d * b ** 2 / 6)}


def hout(maten, **extra):
    return [dict({'name': f'{d}x{b}', 'd': d, 'b': b}, **extra, **rechthoek(d, b)) for d, b in maten]


def cat(cid, naam, shape, fields, note, items, group=None, kind='section'):
    c = {'id': cid, 'name': naam, 'region': AU, 'kind': kind, 'shape': shape, 'fields': fields, 'note': note, 'items': items}
    if group:
        c['group'] = group
    if kind != 'section':
        del c['shape']
    return c


def main():
    lib = json.loads(PAD.read_text(encoding='utf-8'))
    nz = {c['id']: c for c in lib['categories']}
    cats = []

    # ── Steel: the same Australian-standard sections ──
    for cid in STAAL_NZ:
        c = copy.deepcopy(nz[cid])
        c['id'] = 'au-' + cid
        c['region'] = AU
        c['note'] = ((c.get('note') or '') + ' The same AS/NZS sections are used in Australia; check supplier stock.').strip()
        cats.append(c)

    # Lysaght Zeds & Cees: (code, t, D, mass, E, F, Lz, B, Lc)
    zc = [
        ('10010', 1.0, 102, 1.78, 53, 49, 12.5, 51, 12.5), ('10012', 1.2, 102, 2.10, 53, 49, 12.5, 51, 12.5),
        ('10015', 1.5, 102, 2.62, 53, 49, 13.5, 51, 13.5), ('10019', 1.9, 102, 3.29, 53, 49, 14.5, 51, 14.5),
        ('15012', 1.2, 152, 2.89, 65, 61, 15.5, 64, 14.5), ('15015', 1.5, 152, 3.59, 65, 61, 16.5, 64, 15.5),
        ('15019', 1.9, 152, 4.51, 65, 61, 17.5, 64, 16.5), ('15024', 2.4, 152, 5.70, 66, 60, 19.5, 64, 18.5),
        ('20015', 1.5, 203, 4.49, 79, 74, 15.0, 76, 15.5), ('20019', 1.9, 203, 5.74, 79, 74, 18.5, 76, 19.0),
        ('20024', 2.4, 203, 7.24, 79, 73, 21.5, 76, 21.0), ('25019', 1.9, 254, 6.50, 79, 74, 18.0, 76, 18.5),
        ('25024', 2.4, 254, 8.16, 79, 73, 21.0, 76, 20.5), ('30024', 2.4, 300, 10.09, 100, 93, 27.0, 96, 27.5),
        ('30030', 3.0, 300, 12.76, 100, 93, 31.0, 96, 31.5), ('35030', 3.0, 350, 15.23, 129, 121, 30.0, 125, 30.0),
    ]
    bron = 'Lysaght Zeds and Cees User Guide, dimensions table (G450 / G500 steel; check strength in the guide).'
    cats.append(cat('au-lysaght-cees', 'Lysaght Cees', 'lipped-c', ['d', 'b', 't', 'lip', 'mass'],
                    f'Lysaght Cee purlins and girts: d depth, b flange, lip, t base metal thickness. {bron}',
                    [{'name': f'C{c}', 'd': D, 'b': B, 't': t, 'lip': Lc, 'mass': m} for c, t, D, m, E, F, Lz, B, Lc in zc]))
    cats.append(cat('au-lysaght-zeds', 'Lysaght Zeds', 'lipped-z', ['d', 'e', 'f', 'b', 't', 'lip', 'mass'],
                    f'Lysaght Zed purlins and girts: d depth, e and f the two flanges (lapping), lip, t base metal thickness. {bron}',
                    [{'name': f'Z{c}', 'd': D, 'e': E, 'f': F, 'b': round(E + F - t, 1), 't': t, 'lip': Lz, 'mass': m}
                     for c, t, D, m, E, F, Lz, B, Lc in zc]))

    # ── Timber ──
    rect_f = ['d', 'b', 'grade', 'treatment', 'A', 'Ix', 'Iy', 'Zx', 'Zy']
    mgp = [(70, 35), (90, 35), (70, 45), (90, 45), (140, 45), (190, 45), (240, 45), (290, 45)]
    for g in ('MGP10', 'MGP12'):
        cats.append(cat(f'au-{g.lower()}', f'{g} pine', 'rect', rect_f,
                        f'{g} machine graded pine (AS/NZS 1748), dry dressed Australian stock sizes; untreated, H2 or H3. Section properties are geometric.',
                        hout(mgp, grade=g, treatment='H2 / H3'), 'Timber'))
    f17 = [(90, 35), (90, 45), (140, 45), (170, 45), (190, 35), (190, 45), (240, 45), (290, 35), (290, 45)]
    cats.append(cat('au-f17', 'F17 hardwood (KD)', 'rect', rect_f,
                    'F17 seasoned (kiln dried) structural hardwood, Australian stock sizes; larger sizes are often finger jointed or laminated. Species vary by supplier. Section properties are geometric.',
                    hout(f17, grade='F17', treatment='Untreated / H3'), 'Timber'))

    lvl_f = ['d', 'b', 'grade', 'A', 'Ix', 'Iy', 'Zx', 'Zy']
    mey = [(90, 45), (90, 63), (120, 45), (140, 45), (150, 45), (150, 63), (190, 45), (200, 45), (200, 63), (240, 45),
           (240, 63), (290, 45), (300, 45), (300, 63), (300, 75), (360, 45), (360, 63), (400, 45), (400, 63), (400, 75), (450, 63)]
    cats.append(cat('au-meyspan', 'meySPAN LVL (Meyer Timber)', 'lvl', lvl_f,
                    'Meyer Timber meySPAN LVL (E13), sizes from the meySPAN13/14 design data via calcs.com; check the current Meyer guide. Section properties are geometric.',
                    hout(mey, grade='meySPAN13'), 'Timber'))
    eb = [(d, b) for d, bs in ((90, (35, 45, 63)), (130, (35, 45, 63)), (150, (35, 45, 63)), (170, (35, 45, 63)), (200, (35, 45, 63)),
                               (240, (35, 45, 63)), (300, (35, 45, 63, 75)), (360, (45, 63)), (400, (45, 63, 75)), (450, (45, 63))) for b in bs]
    cats.append(cat('au-ebeam', 'e-beam LVL (Wesbeam)', 'lvl', lvl_f,
                    'Wesbeam e-beam LVL, sizes from the Wesbeam design criteria (December 2018) via calcs.com. Section properties are geometric.',
                    hout(eb, grade='e-beam'), 'Timber'))
    ebp = [(70, 35), (90, 35), (90, 45), (120, 35), (120, 45), (140, 35), (140, 45), (170, 35), (190, 35), (190, 45), (240, 35), (240, 45), (290, 45)]
    cats.append(cat('au-ebeam-plus', 'e-beam+ F17 LVL (Wesbeam)', 'lvl', lvl_f,
                    'Wesbeam e-beam+ (F17) LVL, sizes from the Wesbeam design criteria (December 2018) via calcs.com. Section properties are geometric.',
                    hout(ebp, grade='e-beam+ F17'), 'Timber'))

    mj = [('MJ200 45', 200, 45, 2.7), ('MJ240 45', 240, 45, 2.9), ('MJ240 63', 240, 63, 3.7), ('MJ240 90', 240, 90, 4.9),
          ('MJ255 63', 255, 63, 3.8), ('MJ300 45', 300, 45, 3.3), ('MJ300 63', 300, 63, 4.0), ('MJ300 90', 300, 90, 5.2),
          ('MJ360 63', 360, 63, 4.4), ('MJ360 90', 360, 90, 5.6)]
    cats.append(cat('au-meyjoist', 'meyJOIST I-joists (Meyer Timber)', 'ijoist', ['d', 'b', 'tf', 'tw', 'mass', 'estimated'],
                    'Meyer Timber meyJOIST, meyJOIST Product Manual September 2024, Table 1 (depth, flange width, mass). Flange depth tf and web tw are not published there; the hyJOIST values (same product family) are used.',
                    [{'name': n, 'd': d, 'b': b, 'tf': 45, 'tw': 12 if b == 90 else 9, 'mass': m, 'estimated': 'tf, tw'} for n, d, b, m in mj], 'Timber'))

    gl17 = {65: [130, 165, 195, 230, 260, 295, 330, 360, 395, 425, 460, 495],
            85: [130, 165, 195, 230, 260, 295, 330, 360, 395, 425, 460, 495, 525, 560, 590],
            130: [130, 165, 195, 230, 260, 295, 330, 360, 395, 425, 460, 495, 525, 560, 590]}
    gl18 = {65: [120, 155, 185, 215, 240, 270, 300, 330, 360, 390, 420],
            85: [120, 155, 185, 215, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600],
            130: [120, 155, 185, 215, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600]}
    for cid, naam, grade, tab in (('au-hyne-beam17', 'Beam 17 glulam (Hyne)', 'GL17', gl17), ('au-hyne-beam18', 'Beam 18 glulam (Hyne)', 'GL18', gl18)):
        cats.append(cat(cid, naam, 'glulam', ['d', 'b', 'grade', 'A', 'Ix', 'Iy', 'Zx', 'Zy'],
                        f'Hyne {naam.split(" glulam")[0]} ({grade}) glulam, sizes from Hyne design data via calcs.com; check stock with Hyne. Section properties are geometric.',
                        hout([(d, b) for b, ds in tab.items() for d in ds], grade=grade), 'Timber'))

    # ── Fixings ──
    hf = ['b', 'd', 't', 'L', 'F', 'material', 'fixing', 'estimated']
    mjh = [('JH3590', 36, 84), ('JH35120', 36, 117), ('JH4090', 41, 82), ('JH40120', 41, 115), ('JH40190', 41, 180),
           ('JH4590', 46, 79), ('JH45120', 46, 112), ('JH45140', 46, 139), ('JH45190', 46, 177), ('JH45220', 46, 214),
           ('JH5090', 51, 77), ('JH50120', 51, 110), ('JH50190', 51, 175), ('JH65165', 65, 167), ('JH70160', 70, 165), ('JH95150', 95, 152)]
    cats.append(cat('au-mitek-joist-hangers', 'JoistHangers (MiTek)', 'hanger', hf,
                    'MiTek Australia JoistHanger, 1.0 mm G300 Z275: b = A (inside width), d = B (height), F = C (31 face flange), from the JoistHanger data sheet (2024), Table 1. L (side plate along the joist) is estimated.',
                    [{'name': n, 'b': a, 'd': h, 't': 1.0, 'L': 40, 'F': 31, 'material': 'Galvanised Z275',
                      'fixing': 'MiTek 30 x 2.8 nails or MSA1430 screws', 'estimated': 'L'} for n, a, h in mjh], 'Fixings'))
    ibhf = [('IBHF20050', 198, 48), ('IBHF20065', 190, 65), ('IBHF20070', 187, 71), ('IBHF20090', 198, 91), ('IBHF22045', 220, 46),
            ('IBHF24040', 236, 41), ('IBHF24050', 233, 48), ('IBHF24055', 231, 53), ('IBHF24060', 228, 59), ('IBHF24065', 239, 65),
            ('IBHF24070', 236, 71), ('IBHF24090', 237, 91), ('IBHF30040', 296, 41), ('IBHF30050', 299, 48), ('IBHF30055', 297, 53),
            ('IBHF30060', 294, 59), ('IBHF30065', 291, 65), ('IBHF30070', 288, 71), ('IBHF30090', 298, 91), ('IBHF30095', 295, 96),
            ('IBHF36060', 356, 59), ('IBHF36065', 353, 65), ('IBHF36090', 354, 91), ('IBHF40065', 394, 65), ('IBHF40090', 391, 91)]
    ibht = [('IBHT20050', 200, 48), ('IBHT24050', 240, 48), ('IBHT24065', 240, 65), ('IBHT24090', 240, 91), ('IBHT30050', 301, 48),
            ('IBHT30055', 300, 53), ('IBHT30065', 300, 65), ('IBHT30070', 300, 71), ('IBHT30090', 300, 91), ('IBHT36060', 360, 59),
            ('IBHT36065', 360, 65), ('IBHT36090', 360, 91), ('IBHT40090', 400, 91)]
    cats.append(cat('au-mitek-ibeam-hangers', 'I-BeamHangers (MiTek)', 'hanger', hf,
                    'MiTek Australia I-BeamHangers, 1.2 mm: IBHF face fix, IBHT top fix; d = A (hanger height / I-beam depth), b = B (width), from the I-BeamHanger guide. L and F are estimated.',
                    [{'name': n, 'b': b, 'd': a, 't': 1.2, 'L': 50, 'F': 30 if n.startswith('IBHF') else 0, 'material': 'Galvanised',
                      'fixing': 'MiTek 40 x 3.75 nails or MSA screws', 'estimated': 'L, F'} for n, a, b in ibhf + ibht], 'Fixings'))

    pfb = [('MPFBK3590', 35, 90), ('MPFBK3890', 38, 90), ('MPFBK4590', 45, 90), ('MPFBK5090', 50, 90),
           ('MPFBK35120', 35, 120), ('MPFBK38120', 38, 120), ('MPFBK45120', 45, 120), ('MPFBK50120', 50, 120),
           ('MPFBK35140', 35, 140), ('MPFBK38140', 38, 140), ('MPFBK45140', 45, 140), ('MPFBK50140', 50, 140),
           ('FB65170', 65, 170), ('FBK35180', 35, 180), ('MPFBK38180', 38, 180), ('MPFBK45180', 45, 180), ('MPFBK50180', 50, 180),
           ('FB70200', 70, 200), ('FB90200', 90, 200), ('FB62220', 62, 220), ('MPFBK45220', 45, 220), ('MPFBK50220', 50, 220),
           ('FBF74163', 74, 163), ('FBF94153', 94, 153)]
    items = [{'name': n, 'b': b, 'd': d, 't': 1.0, 'L': 40, 'F': 30, 'material': 'Galvanised',
              'fixing': 'Pryda nails (knuckle nail on MPFBK)', 'estimated': 'L, F'} for n, b, d in pfb]
    items += [{'name': 'JHH65', 'b': 65, 'd': 126, 't': 1.2, 'L': 45, 'F': 30, 'material': 'Galvanised', 'fixing': 'heavy duty, Pryda nails', 'estimated': 'L, F'},
              {'name': 'JHH100', 'b': 95, 'd': 140, 't': 1.2, 'L': 45, 'F': 30, 'material': 'Galvanised', 'fixing': 'heavy duty, Pryda nails', 'estimated': 'L, F'}]
    cats.append(cat('au-pryda-joist-hangers', 'Joist hangers (Pryda)', 'hanger', hf,
                    'Pryda joist hangers, 1.0 mm galvanised (MPFBK with knuckle nail, FB, FBF floor truss hangers) and heavy duty JHH, 1.2 mm; b width, d depth as named on pryda.com.au. L and F are estimated.',
                    items, 'Fixings'))
    cats.append(cat('au-pryda-split-hangers', 'Split hangers (Pryda)', 'fangle', ['a', 'c', 'l', 't', 'material', 'fixing'],
                    'Pryda split joist hangers, 1.95 mm, used in pairs for 45 to 90 wide members: a = height, c = 61 depth, l = flange (estimated 50).',
                    [{'name': n, 'a': h, 'c': 61, 'l': 50, 't': 1.95, 'material': 'Galvanised', 'fixing': 'used in pairs'} for n, h in (('SJH140', 138), ('SJH220', 220))],
                    'Fixings'))

    nieuw = {c['id'] for c in cats}
    lib['categories'] = [c for c in lib['categories'] if c['id'] not in nieuw] + cats
    PAD.write_text(json.dumps(lib, indent=1, ensure_ascii=True) + '\n', encoding='utf-8', newline='\n')
    print(len(cats), 'Australian categories,', sum(len(c['items']) for c in cats), 'items')


if __name__ == '__main__':
    main()
