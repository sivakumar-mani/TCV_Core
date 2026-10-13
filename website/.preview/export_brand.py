from pathlib import Path
import xml.etree.ElementTree as ET
import pymupdf

root = Path(__file__).resolve().parents[1]
ns = 'http://www.w3.org/2000/svg'
ET.register_namespace('', ns)
font_path = 'C:/Windows/Fonts/segoeuib.ttf'
font = pymupdf.Font(fontfile=font_path)
for name, color in [('tcv-logo', (17/255,30/255,46/255)), ('tcv-logo-light', (251/255,250/255,247/255))]:
    file = root / 'assets/images' / (name + '.svg')
    tree = ET.parse(file)
    svg = tree.getroot()
    doc = pymupdf.open()
    page = doc.new_page(width=350,height=100)
    page.insert_font(fontname='TCV',fontfile=font_path)
    for text,x,y,size,spacing in [('TIME CABLE',117,36,27,2.5),('VISION',115,83,48,3)]:
        for char in text:
            page.insert_text((x,y),char,fontname='TCV',fontsize=size,color=color)
            x += font.text_length(char,fontsize=size)+spacing
    # Outline the wordmark so browser, print and PNG exports use identical lettering.
    outlined = ET.fromstring(page.get_svg_image(text_as_path=True))
    for child in list(svg):
        if child.attrib.get('font-family'):
            index = list(svg).index(child)
            svg.remove(child)
            for item in list(outlined):
                svg.insert(index,item);index+=1
            break
    tree.write(file,encoding='unicode')
    pymupdf.open(file)[0].get_pixmap(matrix=pymupdf.Matrix(4,4),alpha=True).save(str(file.with_suffix('.png')))
print('Outlined wordmarks and exported matching transparent PNGs.')
