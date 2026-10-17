"""
Contrast audit, step 2 — measure.

    python3 tests/contrast/analyze.py <outDir>

For every run of text captured by run.mjs, reads the real background pixels
behind it (from the text-hidden screenshot), takes a worst case (the 90th
percentile of background pixels toward the text's own luminance, so a stray
star does not count but a bright glow does), composites the text colour with
its opacity, and checks WCAG 2.2 AA: 4.5:1, or 3:1 for large text
(>= 24px, or >= 18.66px bold).
"""
import json, sys, os
from collections import defaultdict
from PIL import Image

out = sys.argv[1]
data = json.load(open(os.path.join(out, 'capture.json')))

def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

def lum(rgb):
    r, g, b = rgb[:3]
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def over(fg, bg):
    a = fg[3]
    return [fg[i] * a + bg[i] * (1 - a) for i in range(3)]

fails = []
checked = 0
cache = {}
for stop in data:
    path = os.path.join(out, stop['shot'])
    img = cache.get(path) or Image.open(path).convert('RGB')
    cache = {path: img}
    W, H = img.size
    for it in stop['items']:
        px = []
        for (l, t, r, b) in it['rects']:
            l, t, r, b = max(0, l), max(0, t), min(W, r), min(H, b)
            if r - l < 2 or b - t < 2:
                continue
            step = max(1, int(((r - l) * (b - t) / 1500) ** 0.5))
            px += [img.getpixel((x, y)) for x in range(l, r, step) for y in range(t, b, step)]
        if not px:
            continue
        checked += 1
        large = it['px'] >= 24 or (it['px'] >= 18.66 and it['weight'] >= 700)
        need = 3.0 if large else 4.5
        bgl = sorted(px, key=lum)
        worst = None
        for fg in it['fg']:
            fl = lum(fg)
            # background pixels nearest the text's luminance are the hard ones
            idx = int(len(bgl) * (0.9 if fl > lum(bgl[len(bgl) // 2]) else 0.1))
            bg = bgl[min(idx, len(bgl) - 1)]
            rr = ratio(over(fg, bg), bg)
            if worst is None or rr < worst[0]:
                worst = (rr, fg, bg)
        if worst[0] < need:
            fails.append({**{k: stop[k] for k in ('size', 'lang', 'stop')}, 'section': it['section'], 'cls': it['cls'], 'text': it['text'],
                          'px': it['px'], 'ratio': round(worst[0], 2), 'need': need,
                          'fg': [round(v, 2) if i == 3 else int(v) for i, v in enumerate(worst[1])], 'bg': list(worst[2])})

print(f'checked {checked} text runs; {len(fails)} below WCAG AA')
groups = defaultdict(list)
for f in fails:
    groups[(f['section'].split('#')[0], f['cls'])].append(f)
for (sec, cls), fs in sorted(groups.items(), key=lambda kv: min(f['ratio'] for f in kv[1])):
    w = min(fs, key=lambda f: f['ratio'])
    langs = sorted({f['lang'] for f in fs}); sizes = sorted({f['size'] for f in fs})
    print(f"{w['ratio']:>5} / {w['need']}  {sec:<14} {cls:<34} x{len(fs):<3} {','.join(langs)} {','.join(sizes)}  “{w['text']}” fg{w['fg']} bg{w['bg']}")
json.dump(fails, open(os.path.join(out, 'fails.json'), 'w'), ensure_ascii=False, indent=1)
