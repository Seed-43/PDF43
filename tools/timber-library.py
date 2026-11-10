"""Write the timber categories of data/nz-steel.seed43lib.json.

Sources (checked 2026-11-10):
- Prolam Product List 2025 (prolamnz.com, via eboss.co.nz): finished sizes of
  PL8 / PL12 glulam beams (visual and non-visual), H5 posts, H4 landscaping
  posts, PLX20 and PLX Column.
- Futurebuild LVL Residential Design Guide NZ, August 2022, Table 1 (product
  range: hySPAN, hy90, hyONE, hyCHORD, hyJOIST sizes).
- Futurebuild LVL Specific Engineering Design Guide, August 2019: Table 15
  (hyJOIST section geometry and mass) and Tables 8, 10, 12, 14 (mass per metre).
- SG8 radiata framing sizes as sold in NZ (90 to 290 x 45, H1.2 / H3.2).

Section properties of the rectangular sections are geometric (b d^3 / 12 and
so on), in mm units like the steel. Run from the repo root:
    python tools/timber-library.py
"""

import json
import pathlib

PAD = pathlib.Path('data/nz-steel.seed43lib.json')

def rechthoek(d, b):
    return {
        'A': d * b,
        'Ix': round(b * d ** 3 / 12),
        'Iy': round(d * b ** 3 / 12),
        'Zx': round(b * d ** 2 / 6),
        'Zy': round(d * b ** 2 / 6),
    }


def lvl_items(maten, massa, extra=None):
    items = []
    for d, b in maten:
        it = {'name': f'{d}x{b}', 'd': d, 'b': b}
        if (d, b) in massa:
            it['mass'] = massa[(d, b)]
        it.update(rechthoek(d, b))
        if extra:
            it.update(extra)
        items.append(it)
    return items


def main():
    secties = json.loads(pathlib.Path(__file__).with_name('timber-futurebuild-2019.json').read_text())
    massa = {p: {(r['d'], r['b']): r['mass'] for r in rows} for p, rows in secties.items()}

    rect_velden = ['d', 'b', 'grade', 'treatment', 'mass', 'A', 'Ix', 'Iy', 'Zx', 'Zy']
    cats = []

    # SG8 sawn framing.
    cats.append({
        'id': 'timber-sg8', 'name': 'SG8 radiata', 'group': 'Timber', 'kind': 'section', 'shape': 'rect',
        'fields': ['d', 'b', 'grade', 'treatment', 'A', 'Ix', 'Iy', 'Zx', 'Zy'],
        'note': 'SG8 machine stress graded radiata pine, dry dressed, as stocked in NZ (H1.2 inside, H3.2 exposed above ground). Section properties are geometric.',
        'items': [dict({'name': f'{d}x45', 'd': d, 'b': 45, 'grade': 'SG8', 'treatment': 'H1.2 / H3.2'}, **rechthoek(d, 45))
                  for d in (90, 140, 190, 240, 290)],
    })

    # Futurebuild LVL, sizes from the 2022 residential guide, Table 1.
    fb = 'Futurebuild LVL (Carter Holt Harvey). Sizes from the Residential Design Guide NZ, August 2022, Table 1; mass from the Specific Engineering Design Guide, August 2019. Section properties are geometric. Check strength with the Futurebuild design guides or designIT.'
    lvl = [
        ('lvl-hyspan', 'hySPAN LVL', 'hySPAN',
         [(d, 45) for d in (150, 170, 200, 240, 300, 360, 400)] + [(d, 63) for d in (150, 200, 240, 300, 360, 400)]
         + [(450, 90), (600, 90)], 'H1.2'),
        ('lvl-hy90', 'hy90 LVL', 'hy90', [(240, 45), (300, 45)] + [(d, 90) for d in (150, 200, 240, 300, 360, 400)], 'H1.2'),
        ('lvl-hyone', 'hyONE LVL', 'hyONE', [(d, 90) for d in (240, 300, 360, 400)], 'H1.2'),
        ('lvl-hychord', 'hyCHORD LVL', 'hyCHORD', [(d, 45) for d in (90, 140, 190)], 'H1.2 (untreated to order)'),
    ]
    for cid, naam, prod, maten, beh in lvl:
        cats.append({
            'id': cid, 'name': naam, 'group': 'Timber', 'kind': 'section', 'shape': 'lvl', 'fields': rect_velden,
            'note': fb, 'items': lvl_items(maten, massa.get(prod, {}), {'grade': prod, 'treatment': beh}),
        })

    # hyJOIST, 2019 guide Table 15.
    hj = [('HJ200 45', 200, 45, 9, 3.2), ('HJ240 45', 240, 45, 9, 3.4), ('HJ240 63', 240, 63, 9, 4.4),
          ('HJ240 90', 240, 90, 12, 5.9), ('HJ300 45', 300, 45, 9, 3.8), ('HJ300 63', 300, 63, 9, 4.8),
          ('HJ300 90', 300, 90, 12, 6.2), ('HJ360 63', 360, 63, 9, 5.1), ('HJ360 90', 360, 90, 12, 6.6),
          ('HJ400 90', 400, 90, 12, 6.8)]
    cats.append({
        'id': 'hyjoist', 'name': 'I-joists (hyJOIST)', 'group': 'Timber', 'kind': 'section', 'shape': 'ijoist',
        'fields': ['d', 'b', 'tf', 'tw', 'mass'],
        'note': 'hyJOIST engineered I-joists (LVL flanges, plywood web), Futurebuild LVL Specific Engineering Design Guide, August 2019, Table 15: d overall depth, b flange width, tf flange thickness, tw nominal web thickness.',
        'items': [{'name': n, 'd': d, 'b': b, 'tf': 45, 'tw': tw, 'mass': m} for n, d, b, tw, m in hj],
    })

    # Prolam glulam beams: finished depth and width against the nominal code.
    diepte = {88: 100, 140: 150, 190: 200, 225: 225, 240: 250, 270: 270, 290: 300, 315: 350, 360: 400,
              405: 450, 450: 500, 495: 550, 540: 600, 595: 650}
    breedte = {42: 50, 63: 75, 88: 100, 112: 125, 135: 150, 180: 200, 220: 250, 260: 300, 90: 100, 140: 150}
    beschikbaar = json.loads(pathlib.Path(__file__).with_name('timber-prolam-2025.json').read_text())
    for graad in ('PL8', 'PL12'):
        items = []
        maten = sorted({(int(k.split('|')[1]), int(k.split('|')[2])) for k in beschikbaar if k.startswith(graad + '|')},
                       key=lambda x: (x[1], x[0]))
        for d, b in maten:
            afwerking = 'Visual or non-visual' if b in (42, 63) else ('Non-visual' if b in (90, 140) else 'Visual')
            items.append(dict({'name': f'{d}x{b}', 'd': d, 'b': b, 'grade': graad, 'finish': afwerking,
                               'code': f'{diepte[d]}{breedte[b]}', 'treatment': 'H1.2 / H3.2'}, **rechthoek(d, b)))
        cats.append({
            'id': f'prolam-{graad.lower()}', 'name': f'Glulam beams {graad} (Prolam)', 'group': 'Timber',
            'kind': 'section', 'shape': 'glulam',
            'fields': ['d', 'b', 'grade', 'finish', 'code', 'treatment', 'A', 'Ix', 'Iy', 'Zx', 'Zy'],
            'note': f'Prolam {graad} glulam beams, finished sizes from the Prolam Product List 2025. code is the nominal size in the product code (PLVL{graad[2:]}H3-300100 = 290x88 visual H3.2). Visual widths 42 to 260, non-visual 42, 63, 90 and 140. Section properties are geometric. H5, untreated and custom sizes on request.',
            'items': items,
        })

    # Prolam posts.
    posten = [(100, 88), (125, 112), (150, 135), (200, 180), (250, 220), (300, 260), (350, 300)]
    items = []
    for nom, m in posten:
        items.append(dict({'name': f'PLPH5-{nom}', 'd': m, 'b': m, 'nominal': nom, 'grade': 'PL8', 'treatment': 'H5'}, **rechthoek(m, m)))
    for nom, m in posten:
        items.append(dict({'name': f'PLP12H5-{nom}', 'd': m, 'b': m, 'nominal': nom, 'grade': 'PL12', 'treatment': 'H5'}, **rechthoek(m, m)))
    for nom, m in posten[:3]:
        items.append(dict({'name': f'PLP4H4-{nom}', 'd': m, 'b': m, 'nominal': nom, 'grade': 'Landscaping', 'treatment': 'H4'}, **rechthoek(m, m)))
    cats.append({
        'id': 'prolam-posts', 'name': 'Glulam posts (Prolam)', 'group': 'Timber', 'kind': 'section', 'shape': 'glulam',
        'fields': ['d', 'b', 'nominal', 'grade', 'treatment', 'A', 'Ix', 'Zx'],
        'note': 'Prolam laminated posts, finished sizes from the Prolam Product List 2025: H5 visual posts in PL8 and PL12, H4 landscaping posts. The number in the code is the nominal size.',
        'items': items,
    })

    cats.append({
        'id': 'prolam-plx', 'name': 'PLX20 and PLX Column (Prolam)', 'group': 'Timber', 'kind': 'section', 'shape': 'glulam',
        'fields': ['d', 'b', 'code', 'treatment'],
        'note': 'Prolam PLX steel-reinforced glulam, non-visual H1.2, Prolam Product List 2025. Drawn as the timber outline; check capacities with Prolam.',
        'items': [{'name': 'PLX20 240x90', 'd': 240, 'b': 90, 'code': 'PLX20H1-250100', 'treatment': 'H1.2'},
                  {'name': 'PLX20 290x90', 'd': 290, 'b': 90, 'code': 'PLX20H1-300100', 'treatment': 'H1.2'},
                  {'name': 'PLX Column 360x90', 'd': 360, 'b': 90, 'code': 'PLXCH1-400100', 'treatment': 'H1.2'},
                  {'name': 'PLX Column 400x90', 'd': 400, 'b': 90, 'code': 'PLXCH1-450100', 'treatment': 'H1.2'}],
    })

    lib = json.loads(PAD.read_text(encoding='utf-8'))
    nieuw = {c['id']: c for c in cats}
    oud = [c for c in lib['categories'] if c['id'] not in nieuw]
    # Timber goes after the steel and bolts, in the order above.
    lib['categories'] = oud + cats
    lib['name'] = 'NZ Steel and Timber'
    lib['source'] = ('Section data from the Revit steel families (UB axes corrected; HST properties left out). '
                     'Bolt clearances from the Revit reference schedules. Timber from the supplier literature: '
                     'Prolam Product List 2025, Futurebuild LVL design guides (2019, 2022) and SG8 stock sizes; '
                     'Timber gauged is from the Revit type names (rows marked check).')
    tekst = json.dumps(lib, indent=1, ensure_ascii=True) + '\n'
    PAD.write_text(tekst, encoding='utf-8', newline='\n')
    print(len(cats), 'timber categories,', sum(len(c['items']) for c in cats), 'items')


if __name__ == '__main__':
    main()
