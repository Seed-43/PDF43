"""Write the South Africa region of data/nz-steel.seed43lib.json.

Steel: the SAISC "Database of structural steel sections" (Section properties,
steel profiles, rev 2, saisc.co.za/resources/for-engineers): I-sections and
IPE (parallel flange), H-sections, PFC, equal and unequal angles, CHS, SHS,
RHS, cold-formed lipped channels and lipped zeds. Parse the PDF once with
    python tools/south-africa-library.py path/to/section-properties-steel-profiles.pdf
which writes tools/za-saisc-sections.json; later runs read that file.
Timber: SA Pine S5 / S7 structural sizes (SANS 1783; York Timber product
guide) and glulam (RSB Group, grade 7: thicknesses 38 to 165, widths 67 to
622). Bolts: the same metric bolts as the NZ library.
Units in the library are mm (A mm2, I mm4, Z mm3, J mm4, Cw mm6).
"""

import copy
import json
import pathlib
import re
import sys

PAD = pathlib.Path('data/nz-steel.seed43lib.json')
BRON = pathlib.Path(__file__).with_name('za-saisc-sections.json')
ZA = 'South Africa'
SAISC = 'SAISC Database of structural steel sections (section properties, steel profiles rev 2).'

# Table heading in the PDF -> (key, value columns after the designation, optional first column)
TABELLEN = {
    'I-sections (Parallel flange)': ('I', 'h b tw tf r1 m A Ix Zx rx Iy Zy ry J Cw Zplx Zply htf hw', None),
    'H-sections (Parallel flange)': ('H', 'h b tw tf r1 m A Ix Zx rx Iy Zy ry J Cw Zplx Zply htf hw', None),
    'Channels (Parallel flange)': ('PFC', 'h b tw tf r1 m A Ix Zx rx Iy Zy ry J Cw Zplx Zply htf hw ac ay', None),
    'Angles (Equal leg)': ('EA', 'r1 r2 m A Ix Zx rx Iu Zu ru Iv Zv rv J ay', None),
    'Angles (Unequal leg)': ('UA', 'r1 r2 m A Ix Zx rx Iy Zy ry Iu Zu ru Iv Zv rv J ax ay alpha', None),
    'Circular hollow sections': ('CHS', 'm A Ix Zx rx J Zplx', None),
    'Square hollow sections': ('SHS', 'r1 m A Ix Zx rx J Zplx', 'r1'),
    'Rectangular hollow sections': ('RHS', 'r1 m A Ix Zx rx Iy Zy ry J Zplx Zply', 'r1'),
    'Cold-formed lipped channels': ('LC', 'm A Ix Zx rx Iy Zy ry J ay', None),
    'Cold-formed lipped zeds': ('LZ', 'm A Ix Zx rx Iy Zy ry J rv', None),
}
EINDE = ['I-sections (Taper flange)', 'Channels (Taper flange)', 'Cold-formed lipped angles', 'User defined properties']
NAAM = re.compile(r'^(IPE(-[A-Z]+)? \d+|PFC \d+x\d+|\d+(\.\d+)?x\d+(\.\d+)?(x\d+(\.\d+)?){0,2}\*?)$')
GETAL = re.compile(r'^-?\d+(\.\d+)?$')


def ontleed_pdf(pdf):
    import pymupdf
    regels = [r.strip() for p in pymupdf.open(pdf) for r in p.get_text().split('\n')]
    koppen = {i: r for i, r in enumerate(regels) if r in TABELLEN or r in EINDE}
    starts = sorted(koppen)
    uit = {}
    for n, i in enumerate(starts):
        kop = koppen[i]
        if kop not in TABELLEN:
            continue
        sleutel, kolommen, optioneel = TABELLEN[kop]
        kol = kolommen.split()
        eind = starts[n + 1] if n + 1 < len(starts) else len(regels)
        rijen, huidig = [], None
        for r in regels[i + 1:eind]:
            if NAAM.match(r):
                huidig = {'naam': r.rstrip('*'), 'waarden': []}
                rijen.append(huidig)
            elif huidig is not None and GETAL.match(r):
                huidig['waarden'].append(float(r))
        lijst = uit.setdefault(sleutel, [])
        for rij in rijen:
            w = rij['waarden']
            k = kol
            if len(w) == len(kol) - 1 and optioneel:
                k = [c for c in kol if c != optioneel]
            if len(w) < len(k):
                continue
            lijst.append({'name': rij['naam'], **dict(zip(k, w[:len(k)]))})
    BRON.write_text(json.dumps(uit, indent=1) + '\n', encoding='utf-8')
    return uit


def mm(r, sleutel, factor):
    v = r.get(sleutel)
    return None if v is None else round(v * factor, 6)


def eigenschappen(r, *sleutels):
    f = {'A': 1e3, 'Ix': 1e6, 'Iy': 1e6, 'Zx': 1e3, 'Zy': 1e3, 'Sx': 1e3, 'Sy': 1e3, 'J': 1e3, 'Iw': 1e9}
    bron = {'Sx': 'Zplx', 'Sy': 'Zply', 'Iw': 'Cw'}
    uit = {}
    for s in sleutels:
        v = mm(r, bron.get(s, s), f[s])
        if v is not None:
            uit[s] = v
    return uit


def maten(naam):
    return [float(x) for x in re.findall(r'\d+(?:\.\d+)?', naam.split(' ', 1)[-1])]


def main():
    data = ontleed_pdf(sys.argv[1]) if len(sys.argv) > 1 else json.loads(BRON.read_text(encoding='utf-8'))
    lib = json.loads(PAD.read_text(encoding='utf-8'))
    nz = {c['id']: c for c in lib['categories']}
    cats = []

    def cat(cid, naam, shape, fields, note, items, group=None, kind='section'):
        c = {'id': cid, 'name': naam, 'region': ZA, 'kind': kind, 'shape': shape, 'fields': fields, 'note': note, 'items': items}
        if group:
            c['group'] = group
        cats.append(c)

    ivelden = ['d', 'b', 'tf', 'tw', 'r1', 'mass', 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'Sx', 'Sy', 'J', 'Iw']
    def i_item(r):
        return {'name': r['name'], 'd': r['h'], 'b': r['b'], 'tf': r['tf'], 'tw': r['tw'], 'r1': r['r1'], 'mass': r['m'],
                **eigenschappen(r, 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'Sx', 'Sy', 'J', 'Iw')}
    i_rij = data.get('I', [])
    cat('za-i', 'I-sections', 'I', ivelden, f'Parallel flange I-sections (UB type). {SAISC}', [i_item(r) for r in i_rij if not r['name'].startswith('IPE')])
    cat('za-ipe', 'IPE', 'I', ivelden, f'IPE and IPE-AA sections. {SAISC}', [i_item(r) for r in i_rij if r['name'].startswith('IPE')])
    cat('za-h', 'H-sections', 'I', ivelden, f'Parallel flange H-sections (UC type). {SAISC}', [i_item(r) for r in data.get('H', [])])
    cat('za-pfc', 'PFC', 'channel', ivelden, f'Parallel flange channels. {SAISC}', [i_item(r) for r in data.get('PFC', [])])

    def hoek(r):
        h, b, t = maten(r['name'])[:3]
        return {'name': r['name'], 'd': h, 'b': b, 'tf': t, 'tw': t, 'r1': r['r1'], 'mass': r['m'],
                **eigenschappen(r, 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'J')}
    hvelden = ['d', 'b', 'tf', 'tw', 'r1', 'mass', 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'J']
    cat('za-ea', 'Equal angles', 'angle', hvelden, f'Equal leg angles, h x b x t. {SAISC}', [hoek(r) for r in data.get('EA', [])])
    cat('za-ua', 'Unequal angles', 'angle', hvelden, f'Unequal leg angles, h x b x t. {SAISC}', [hoek(r) for r in data.get('UA', [])])

    chs = []
    for r in data.get('CHS', []):
        d, t = maten(r['name'])[:2]
        chs.append({'name': r['name'], 'd': d, 't': t, 'mass': r['m'], **eigenschappen(r, 'A', 'Ix', 'Zx', 'Sx', 'J')})
    cat('za-chs', 'CHS', 'chs', ['d', 't', 'mass', 'A', 'Ix', 'Zx', 'Sx', 'J'], f'Circular hollow sections, D x t (SANS 657-1). {SAISC}', chs)
    for key, cid, naam in (('SHS', 'za-shs', 'SHS'), ('RHS', 'za-rhs', 'RHS')):
        items = []
        for r in data.get(key, []):
            h, b, t = maten(r['name'])[:3]
            it = {'name': r['name'], 'd': h, 'b': b, 't': t, 'mass': r['m'], **eigenschappen(r, 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'Sx', 'Sy', 'J')}
            if key == 'SHS':
                it.update({k: it[k.replace('y', 'x')] for k in ('Iy', 'Zy', 'Sy') if k.replace('y', 'x') in it})
            if r.get('r1'):
                it['ro'] = r['r1']
            items.append(it)
        cat(cid, naam, 'rhs', ['d', 'b', 't', 'ro', 'mass', 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'Sx', 'Sy', 'J'],
            f'{"Square" if key == "SHS" else "Rectangular"} hollow sections, h x b x t (SANS 657-1). {SAISC}', items)

    lc, lz = [], []
    for r in data.get('LC', []):
        h, b, c, t = maten(r['name'])[:4]
        lc.append({'name': r['name'], 'd': h, 'b': b, 'lip': c, 't': t, 'mass': r['m'], **eigenschappen(r, 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'J')})
    for r in data.get('LZ', []):
        h, b, c, t = maten(r['name'])[:4]
        lz.append({'name': r['name'], 'd': h, 'e': b, 'f': b, 'b': round(2 * b - t, 2), 'lip': c, 't': t, 'mass': r['m'],
                   **eigenschappen(r, 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'J')})
    cat('za-lipped-channels', 'Lipped channels', 'lipped-c', ['d', 'b', 'lip', 't', 'mass', 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'J'],
        f'Cold-formed lipped channels, h x b x c (lip) x t. {SAISC}', lc)
    cat('za-lipped-zeds', 'Lipped zeds', 'lipped-z', ['d', 'e', 'f', 'b', 'lip', 't', 'mass', 'A', 'Ix', 'Iy', 'Zx', 'Zy', 'J'],
        f'Cold-formed lipped zeds, h x b x c (lip) x t, equal flanges. {SAISC}', lz)

    # Timber
    def rechthoek(d, b):
        return {'A': d * b, 'Ix': round(b * d ** 3 / 12), 'Iy': round(d * b ** 3 / 12), 'Zx': round(b * d ** 2 / 6), 'Zy': round(d * b ** 2 / 6)}
    pine = [(76, 38), (114, 38), (152, 38), (228, 38), (76, 50), (152, 50), (228, 50)]
    for g in ('S5', 'S7'):
        cat(f'za-sa-pine-{g.lower()}', f'SA Pine {g}', 'rect', ['d', 'b', 'grade', 'A', 'Ix', 'Iy', 'Zx', 'Zy'],
            f'SA Pine structural grade {g} (SANS 1783), nominal sizes as stocked (York Timber product guide). S10 has limited availability. Section properties are geometric.',
            [dict({'name': f'{d}x{b}', 'd': d, 'b': b, 'grade': g}, **rechthoek(d, b)) for d, b in pine], 'Timber')
    dikte = [38, 50, 63, 75, 89, 114, 140, 165]
    hoogte = [67, 89, 111, 133, 156, 178, 200, 222, 244, 267, 289, 311, 333, 356, 378, 400, 422, 467, 489, 511, 533, 556, 578, 600, 622]
    cat('za-glulam', 'Glulam (grade 7)', 'glulam', ['d', 'b', 'grade', 'A', 'Ix', 'Iy', 'Zx', 'Zy'],
        'South African glulam, grade 7 (grades up to 12 on order), sizes from RSB Group: thickness 38 to 165, depth 67 to 622. Not every combination is made; check with the supplier. Section properties are geometric.',
        [dict({'name': f'{d}x{b}', 'd': d, 'b': b, 'grade': 'Grade 7'}, **rechthoek(d, b)) for b in dikte for d in hoogte if d > b], 'Timber')

    bouten = copy.deepcopy(nz['bolts'])
    bouten.update({'id': 'za-bolts', 'region': ZA})
    bouten['note'] = ((bouten.get('note') or '') + ' The same metric bolts are used in South Africa (grades 4.8 and 8.8).').strip()
    cats.append(bouten)

    nieuw = {c['id'] for c in cats}
    lib['categories'] = [c for c in lib['categories'] if c['id'] not in nieuw] + cats
    PAD.write_text(json.dumps(lib, indent=1, ensure_ascii=True) + '\n', encoding='utf-8', newline='\n')
    for c in cats:
        print(f"{c['id']:22} {len(c['items'])}")


if __name__ == '__main__':
    main()
