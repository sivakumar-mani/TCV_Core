from pathlib import Path
import re
import zipfile

root=Path(__file__).resolve().parents[1]
css=root/'assets/css/style.css'
s=css.read_text(encoding='utf-8')
colors={'#ff8a00':'#0c5fba','#ff9f2c':'#084e9c','#ffab47':'#8ec5ff','#ee4312':'#0c5fba','#ad4117':'#0755a6','#73503b':'#466681','#4b2c1d':'#ffffff','#fff0e3':'#eaf3ff','#faf0e7':'#f0f5fc','#fffaf5':'#f8fbff','#e4dbd4':'#dce5ef','#e5b18b':'#a9c9ee','#fffdf2ee':'#f8fbffee'}
def recolor(match):
    value=match.group()
    if value in colors: return colors[value]
    if len(value)==9 and value[:7] in colors: return colors[value[:7]]+value[7:]
    return value
s=re.sub(r'#[0-9a-fA-F]{3,8}',recolor,s)
s=s.replace('/* Supplied logo palette. */','/* Blue theme inspired by the supplied sky reference; original logo retained. */')
s+='\n/* Contrast for solid blue accents. */\n.primary,.light{color:#fff}.service-marquee{color:#fff}.preview-card.featured{color:#fff}.preview-card.featured p,.preview-card.featured .preview-price span{color:#eef6ff}.preview-card.featured .pill{color:#242424}.cta-band .eyebrow,.floating-chat{color:#8ec5ff}\n'
css.write_text(s,encoding='utf-8')
readme=root/'README.md'
s=readme.read_text(encoding='utf-8').replace('The theme follows its orange, vermilion, dark grey and black palette, with warm off-white backgrounds.','The website theme uses sky blue `#0C5FBA`, charcoal and cool off-white backgrounds, following the supplied blue reference. The original logo retains its supplied colours.')
readme.write_text(s,encoding='utf-8')
preview=root/'branding/preview.html'
s=preview.read_text(encoding='utf-8')
s=s.replace('Your original colours.','A fresh blue website theme.').replace('Orange, vermilion, dark grey and black guide the website theme.','Sky blue from your reference image guides the website theme; the original logo keeps its supplied colours.')
for old,new in colors.items(): s=s.replace(old,new)
s=s.replace('Orange<br>#FF8A00','Sky blue<br>#0C5FBA').replace('Vermilion<br>#EE4312','Accent blue<br>#0C5FBA')
s=s.replace('background:#0c5fba">Sky blue','background:#0c5fba;color:white">Sky blue')
preview.write_text(s,encoding='utf-8')
with zipfile.ZipFile(root/'deployment/time-cable-vision-static.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for file in [*root.glob('*.html'),root/'robots.txt',root/'sitemap.xml',*(p for p in (root/'assets').rglob('*') if p.is_file())]: archive.write(file,file.relative_to(root).as_posix())
print('Blue theme applied; original logo retained; upload ZIP refreshed.')
