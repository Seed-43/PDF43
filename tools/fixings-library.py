"""Write the Fixings categories (MiTek LUMBERLOK and BOWMAC) of data/nz-steel.seed43lib.json.

Source: MiTek Structural Fixings On-Site Guide, 2024 edition V1 (Fred's copy:
C:\\Fred\\Spechs\\Timber\\MiTek - Lumberlock.pdf). Sizes are the catalogue's;
where the catalogue drawing gives no figure (a hanger's side plate length L
and face flange width F) the value is estimated from the drawing and listed in
the item's `estimated` field. Stainless steel 304-2B versions are separate
items (material "Stainless 304"), with the catalogue's SS code where it gives
one.

Shapes (see src/library/draw.js): hanger (b inside width, d height, t, L, F),
plate (b width, d length, t) and fangle (angle cleat: a leg up, c leg across,
l length, t). Run from the repo root:
    python tools/fixings-library.py
"""

import json
import pathlib

PAD = pathlib.Path('data/nz-steel.seed43lib.json')
GALV = 'Galvanised Z275'
SS = 'Stainless 304'
BRON = 'MiTek Structural Fixings On-Site Guide, 2024 edition'


def met_rvs(items, ss_code=lambda n: 'SS' + n.replace(' ', ''), ss_t=None):
    """Each galvanised item followed by its stainless version."""
    uit = []
    for it in items:
        uit.append(dict(it, material=GALV))
        s = dict(it, name=ss_code(it['name']), material=SS)
        if ss_t is not None:
            s['t'] = ss_t
        uit.append(s)
    return uit


def main():
    cats = []
    velden_h = ['b', 'd', 't', 'L', 'F', 'material', 'fixing', 'estimated']

    # Joist hangers (p. 7, 55): inside width b x height d.
    jh = [(47, 90), (47, 120), (47, 190), (70, 180), (95, 165), (52, 90), (52, 120), (52, 190)]
    items = [{'name': f'JH{b}x{d}', 'b': b, 'd': d, 't': 0.91, 'L': 40, 'F': 28,
              'fixing': '30 x 3.15 product nails or 17-12g x 35 screws', 'estimated': 'L, F'} for b, d in jh]
    cats.append({'id': 'll-joist-hangers', 'name': 'Joist hangers (Lumberlok)', 'group': 'Fixings', 'kind': 'section',
                 'shape': 'hanger', 'fields': velden_h,
                 'note': f'LUMBERLOK joist hangers, 0.91 mm G300 Z275 or 0.9 mm stainless 304-2B. JH47 x 90 = 47 inside width, 90 high. 52 wide for rough sawn. L (side plate along the joist) and F (face flange) are estimated from the catalogue drawing. {BRON}, pages 7 and 55.',
                 'items': met_rvs(items, ss_t=0.9)})

    # LVL hangers (p. 65): 270 high, 55 flanges.
    items = [{'name': f'JH{b}270', 'b': b, 'd': 270, 't': 0.91, 'L': 55, 'F': 55,
              'fixing': '12 nails or 6 screws (17-14g x 35) per flange', 'estimated': 'L'} for b in (47, 65, 95)]
    cats.append({'id': 'll-lvl-hangers', 'name': 'LVL hangers (Lumberlok)', 'group': 'Fixings', 'kind': 'section',
                 'shape': 'hanger', 'fields': velden_h,
                 'note': f'LUMBERLOK LVL hangers for 45, 63 and 90 LVL, 270 high, 0.91 mm galvanised; not for exterior use. {BRON}, pages 64 and 65.',
                 'items': [dict(i, material=GALV) for i in items]})

    # I-beam hangers (p. 57, 58): code = height A + width B.
    face = ['20090', '24050', '24055', '24065', '24090', '30050', '30065', '30090', '36065', '36090', '40090']
    top = ['20050', '24065', '24090', '30050', '30065', '30090', '36065', '36090', '40090']
    items = []
    for pre, lijst, vast in (('IBHF', face, 'face fix'), ('IBHT', top, 'top fix')):
        for c in lijst:
            items.append({'name': pre + c, 'b': int(c[3:]), 'd': int(c[:3]), 't': 1.15, 'L': 50, 'F': 30 if pre == 'IBHF' else 0,
                          'fixing': f'{vast}, 40 x 3.75 nails (supplied)', 'material': GALV, 'estimated': 'L, F'})
    cats.append({'id': 'll-ibeam-hangers', 'name': 'I-beam hangers (Lumberlok)', 'group': 'Fixings', 'kind': 'section',
                 'shape': 'hanger', 'fields': velden_h,
                 'note': f'LUMBERLOK I-beam hangers, 1.15 mm G300 Z275. IBHF = face fix to a timber beam, IBHT = top fix over a timber plate on a steel beam. IBHF30065 = 300 high, 65 wide. {BRON}, pages 57 and 58.',
                 'items': items})

    # Split hangers (p. 59): pairs; 72 side, 52 flange.
    items = [{'name': f'SPH{n}', 'a': h, 'c': 72, 'l': 52, 't': 1.55, 'fixing': '17-14g x 35 screws, used in pairs (LH and RH)'}
             for n, h in ((140, 137), (180, 177), (220, 217))]
    cats.append({'id': 'll-split-hangers', 'name': 'Split hangers (Lumberlok)', 'group': 'Fixings', 'kind': 'section',
                 'shape': 'fangle', 'fields': ['a', 'c', 'l', 't', 'material', 'fixing'],
                 'note': f'LUMBERLOK split hangers for wide or double members, always in pairs. a = height, c = 72 side, l = 52 flange. 1.55 mm galvanised or 1.5 mm stainless 304-2B. {BRON}, pages 10 and 59.',
                 'items': met_rvs(items, ss_code=lambda n: 'SS' + n, ss_t=1.5)})

    # Angle cleats: Tylok angles, CPC, CF, Multigrip (p. 7, 11).
    items = [
        {'name': '3A6', 'a': 35, 'c': 35, 'l': 90, 't': 0.95, 'fixing': 'Tylok angle, teeth (hammer on)'},
        {'name': '5A6', 'a': 35, 'c': 35, 'l': 150, 't': 0.95, 'fixing': 'Tylok angle, teeth (hammer on)'},
        {'name': 'CPC40', 'a': 86, 'c': 29, 'l': 40, 't': 1.55, 'fixing': '17-14g screws + 30 x 3.15 nails; 50 rafters'},
        {'name': 'CPC40S', 'a': 43, 'c': 29, 'l': 40, 't': 1.55, 'fixing': '17-14g screws + 30 x 3.15 nails; 50 rafters'},
        {'name': 'CPC80', 'a': 86, 'c': 29, 'l': 80, 't': 1.55, 'fixing': '17-14g screws + 30 x 3.15 nails; 100 rafters'},
        {'name': 'CF1', 'a': 120, 'c': 48, 'l': 100, 't': 1.55, 'fixing': 'nails or 17-14g screws + M12 bolt to concrete'},
        {'name': 'CF2X', 'a': 200, 'c': 48, 'l': 100, 't': 1.55, 'fixing': 'nails or 17-14g screws + M12 bolt to concrete'},
        {'name': 'Multigrip', 'a': 125, 'c': 38, 'l': 38, 't': 0.91, 'fixing': '30 x 3.15 nails or 17-14g screws'},
    ]
    uit = []
    for it in items:
        uit.append(dict(it, material=GALV))
        if it['name'].startswith('CPC'):
            uit.append(dict(it, name='SS' + it['name'], material=SS, t=1.5))
        elif it['name'] == 'Multigrip':
            uit.append(dict(it, name='SS Multigrip', material=SS, t=0.9))
    cats.append({'id': 'll-cleats', 'name': 'Angles and cleats (Lumberlok)', 'group': 'Fixings', 'kind': 'section',
                 'shape': 'fangle', 'fields': ['a', 'c', 'l', 't', 'material', 'fixing'],
                 'note': f'LUMBERLOK Tylok angles, concealed purlin cleats (CPC), concrete fixing cleats (CF) and Multigrip. a = upright leg, c = leg across, l = length. {BRON}, pages 7, 11, 19 and 21.',
                 'items': uit})

    # Plates: Tylok (p. 7), Nailon (p. 9), Strap Nail (p. 13).
    items = []
    for w, rijen in ((34, (2, 4, 6, 8, 10, 12, 14, 16)), (68, (2, 4, 6, 8, 10, 12, 14, 16)),
                     (102, (4, 6, 8, 10, 12)), (136, (6, 8, 10, 12, 14))):
        tanden = {34: 5, 68: 10, 102: 15, 136: 20}[w]
        for r in rijen:
            items.append({'name': f'{r}T{tanden}', 'b': w, 'd': 30 * r, 't': 0.95, 'material': GALV, 'fixing': 'Tylok teeth (hammer or press)'})
    for t, b in ((1.0, 110), (2.0, 113), (2.0, 150), (3.0, 130), (3.0, 240)):
        items.append({'name': f'Nailon {b} x {t:g}', 'b': b, 'd': 240, 't': t, 'material': GALV if t < 3 else 'Black steel',
                      'fixing': '30 x 3.15 nails or 17-14g screws; cut to length, 40 mm steps (80 to 2400)'})
    items.append({'name': 'SS Nailon 110 x 0.9', 'b': 110, 'd': 240, 't': 0.9, 'material': SS,
                  'fixing': 'stainless nails or screws; cut to length, 40 mm steps'})
    items.append({'name': 'Strap Nail', 'b': 39, 'd': 76, 't': 0.95, 'material': GALV, 'fixing': 'teeth plus nails'})
    cats.append({'id': 'll-plates', 'name': 'Plates (Lumberlok)', 'group': 'Fixings', 'kind': 'section',
                 'shape': 'plate', 'fields': ['b', 'd', 't', 'material', 'fixing'],
                 'note': f'LUMBERLOK Tylok plates (6T10 = 6 rows of teeth long x 10 wide), Nailon plates (drawn 240 long; cut to length) and Strap Nail. b = width, d = length. {BRON}, pages 7, 9, 13 and 18.',
                 'items': items})

    lib = json.loads(PAD.read_text(encoding='utf-8'))
    nieuw = {c['id'] for c in cats}
    lib['categories'] = [c for c in lib['categories'] if c['id'] not in nieuw] + cats
    PAD.write_text(json.dumps(lib, indent=1, ensure_ascii=True) + '\n', encoding='utf-8', newline='\n')
    print(len(cats), 'fixing categories,', sum(len(c['items']) for c in cats), 'items')


if __name__ == '__main__':
    main()
