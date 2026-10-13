from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
css=root/'assets/css/style.css'
s=css.read_text(encoding='utf-8')
colors={'#111e2e':'#242424','#26394a':'#3d3f3f','#d5f36c':'#ff8a00','#c4e959':'#ff9f2c','#fbfaf7':'#fffaf5','#8fad2e':'#ee4312','#7f9f32':'#ee4312','#86a622':'#ee4312','#7e9d26':'#ee4312','#9cbb4e30':'#ff8a0030','#d5f36c55':'#ff8a0055'}
for color in ['#658219','#557324','#557521','#4f6b15','#56771c','#64801e','#7b922e','#7b9828','#749122','#809c34','#6d872c','#718346']: colors[color]='#ad4117'
for color in ['#435429','#385019','#637154','#667554','#687c49','#71805d']: colors[color]='#73503b'
for color in ['#acc55c','#b9c997','#bac8af','#c8d2ba','#d8e2ba','#cbd2c1']: colors[color]='#e5b18b'
for color in ['#d4dccb','#dce1d3','#dce0d6','#d5dcd5','#d6ddd2','#dfe3df','#eef0ea','#e9ece2','#e9e9e1']: colors[color]='#e4dbd4'
for color in ['#e5efc5','#e6ecdf','#eaf3d2','#edf1e2','#edf2e0','#edf3d9','#f1f7da','#f0f4e6','#f1f5e7','#f4f7ec']: colors[color]='#fff0e3'
for color in ['#f0f2e9','#f7f9f2','#f0f0e9','#f0f1e9','#f1f2ec','#fbfcf8','#fcfdf9']: colors[color]='#faf0e7'
def recolor(m):
    value=m.group()
    if value in colors: return colors[value]
    if len(value)==9 and value[:7] in colors: return colors[value[:7]]+value[7:]
    return value
s=re.sub(r'#[0-9a-fA-F]{3,8}',recolor,s)
s+='\n/* Supplied logo palette. */\n:root{--ink:#242424;--lime:#ff8a00;--paper:#fffaf5;--line:#e4dbd4}.brand-logo{width:245px;height:54px}.footer-logo{width:260px}.cta-band .eyebrow,.floating-chat{color:#ffab47}.preview-card.featured .pill{background:#ffffffb8}.preview-card.featured p{color:#4b2c1d}@media(max-width:600px){.brand-logo{width:210px;height:45px}}\n'
css.write_text(s,encoding='utf-8')
generator=root/'tools/build_site.py'
s=generator.read_text(encoding='utf-8').replace('src="assets/images/tcv-logo.svg" width="350" height="100"','src="assets/images/tcv-supplied-logo.png" width="522" height="107"')
s=s.replace('href="assets/images/favicon.svg" type="image/svg+xml"','href="assets/images/tcv-supplied-logo.png" type="image/png"').replace('content="#111e2e"','content="#242424"')
generator.write_text(s,encoding='utf-8')
preview='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Time Cable Vision — supplied logo</title><style>*{box-sizing:border-box}body{margin:0;background:#fffaf5;color:#242424;font-family:Segoe UI,Arial,sans-serif}main{max-width:1000px;margin:auto;padding:60px 25px}h1{font-size:46px;letter-spacing:-1.5px;line-height:1.1}p{line-height:1.8;color:#695a50}.logo{padding:40px;background:white;border:1px solid #e4dbd4;border-radius:18px;margin:35px 0}.logo img{display:block;width:100%;max-width:650px;margin:auto;height:auto}.swatches{display:flex;gap:15px;flex-wrap:wrap}.swatches span{padding:24px;border-radius:12px;min-width:170px;font-size:13px}a{display:inline-block;padding:14px 22px;border-radius:8px;background:#ff8a00;color:#242424;text-decoration:none;font-weight:700;margin:25px 12px 0 0}.secondary{background:#242424;color:white}@media(max-width:600px){h1{font-size:34px}.logo{padding:22px}}</style></head><body><main><p>TIME CABLE VISION / WEBSITE BRANDING</p><h1>Your supplied logo.<br>Your original colours.</h1><p>The supplied logo is used unchanged in the website header and footer. Orange, vermilion, dark grey and black guide the website theme.</p><div class="logo"><img src="../assets/images/tcv-supplied-logo.png" width="522" height="107" alt="Supplied original Time Cable Vision logo"></div><div class="swatches"><span style="background:#ff8a00">Orange<br>#FF8A00</span><span style="background:#ee4312;color:white">Vermilion<br>#EE4312</span><span style="background:#3d3f3f;color:white">Dark grey<br>#3D3F3F</span><span style="background:black;color:white">Black<br>#000000</span></div><a href="../index.html">View updated website</a><a class="secondary" href="../assets/images/tcv-supplied-logo.png" download>Download supplied logo</a></main></body></html>'''
(root/'branding/preview.html').write_text(preview,encoding='utf-8')
print('Installed supplied logo and applied its warm colour palette.')
