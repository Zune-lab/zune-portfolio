"""Extract skin palettes from the web CSS + src/config/skins.js into mobile/tools/skins.json."""
import re, json, pathlib

SRC = pathlib.Path(__file__).resolve().parents[2] / 'src'
KEYS = ['bg','panel','inset','line','text','text-dim','amber','amber-dim','on-amber','glow','glow-green','green','js','css-lang','danger']

def parse_vars(body):
    return {m.group(1): m.group(2).strip() for m in re.finditer(r'--([\w-]+):\s*([^;]+);', body) if m.group(1) in KEYS}

def blocks(css):
    for m in re.finditer(r'(:root[^{]*)\{([^}]*)\}', css):
        yield m.group(1).strip(), m.group(2)

palettes = {}
rks = {}
# default zune skin lives in index.css
idx = (SRC/'index.css').read_text()
for sel, body in blocks(idx):
    if sel == ':root':
        palettes.setdefault('zune', {}).setdefault('dark', {}).update(parse_vars(body))
    elif sel == ":root[data-theme='light']":
        palettes.setdefault('zune', {}).setdefault('light', {}).update(parse_vars(body))

for f in sorted((SRC/'styles/skins').glob('*.css')):
    sid = f.stem
    if sid.startswith('_') or sid in ('index','zune'): continue
    for sel, body in blocks(f.read_text()):
        m = re.fullmatch(r":root\[data-skin='([\w-]+)'\](\[data-theme='light'\])?", sel)
        if not m or m.group(1) != sid: continue
        v = parse_vars(body)
        rk = re.search(r'--rk:\s*([\d.]+)', body)
        if rk and not m.group(2): rks[sid] = float(rk.group(1))
        if len(v) < 8: continue
        palettes.setdefault(sid, {}).setdefault('light' if m.group(2) else 'dark', {}).update(v)

# skin metadata from config/skins.js
cfg = (SRC/'config/skins.js').read_text()
def fix(sid, modes, pal):
    # a single-mode skin only has a base block (parsed as 'dark'): file it under its real mode
    if len(modes) == 1:
        return {modes[0]: pal.get('dark', {})}
    # light blocks only override some vars: inherit the rest from the dark base
    light = {**pal.get('dark', {}), **pal.get('light', {})}
    return {'dark': pal['dark'], 'light': light}

skins = []
for m in re.finditer(r"\{\s*id: '([\w-]+)',\s*group: '(\w+)',\s*label: '([^']+)',\s*note: '([^']+)',\s*modes: (both|\[[^\]]*\]),(.*?)\n  \},", cfg, re.S):
    sid, group, label, note, modes, rest = m.groups()
    modes = ['dark','light'] if modes == 'both' else re.findall(r"'(\w+)'", modes)
    unlock = re.search(r"unlock: \{ game: '([\w-]+)', min: (\d+), hint: '([^']+)'", rest)
    skins.append(dict(id=sid, group=group, label=label, note=note, modes=modes,
        unlock=dict(game=unlock[1], min=int(unlock[2]), hint=unlock[3]) if unlock else None,
        rk=rks.get(sid, 1.0),
        palettes=fix(sid, modes, palettes.get(sid, {}))))

out = pathlib.Path(__file__).parent/'skins.json'
out.write_text(json.dumps(dict(
    default='zune', autoByTod={'dawn':'nord','day':'catppuccin','dusk':'gruvbox','night':'tokyo-night'}, skins=skins), indent=1))
print(len(skins), 'skins')
for s in skins:
    print(f"{s['id']:12} {s['group']:9} modes={s['modes']} palettes={ {k:len(v) for k,v in s['palettes'].items()} }")
