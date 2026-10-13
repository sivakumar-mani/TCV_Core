from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'tools/build_site.py'
text = source.read_text(encoding='utf-8')
old = '<span class="brand-symbol">{icon(\'tv\')}</span><span>TIME CABLE<span class="brand-second">VISION<span class="brand-dot">.</span></span></span>'
new = '<img class="brand-logo" src="assets/images/tcv-logo.svg" width="350" height="100" alt="Time Cable Vision">'
assert text.count(old) == 1
text = text.replace(old, new)
old_footer = '<a class="footer-brand" href="index.html">Time Cable Vision<span>.</span></a>'
new_footer = '<a class="footer-brand" href="index.html" aria-label="Time Cable Vision home"><img class="footer-logo" src="assets/images/tcv-logo.svg" width="350" height="100" alt="Time Cable Vision"></a>'
assert text.count(old_footer) == 1
source.write_text(text.replace(old_footer, new_footer), encoding='utf-8')
for name in ['tcv-logo.svg', 'tcv-logo-light.svg']:
    p = root / 'assets/images' / name
    p.write_text(p.read_text(encoding='utf-8').replace('viewBox="0 0 440 100"', 'viewBox="0 0 350 100"'), encoding='utf-8')
