from pathlib import Path
import xml.etree.ElementTree as ET
import pymupdf

root=Path(__file__).resolve().parents[1]/'assets/images'
ns='http://www.w3.org/2000/svg'
ET.register_namespace('',ns)
for name in ['tcv-logo','tcv-logo-light']:
    file=root/(name+'.svg')
    tree=ET.parse(file);svg=tree.getroot()
    definitions={n.attrib['id']:n for n in svg.iter() if 'id' in n.attrib}
    for node in list(svg):
        if node.tag=='{'+ns+'}use':
            href=node.attrib.get('{http://www.w3.org/1999/xlink}href','').lstrip('#')
            glyph=definitions.get(href)
            if glyph is not None:
                attrs={k:v for k,v in glyph.attrib.items() if k!='id'}
                attrs.update({k:node.attrib[k] for k in ['transform','fill'] if k in node.attrib})
                svg.insert(list(svg).index(node),ET.Element('{'+ns+'}path',attrs))
            svg.remove(node)
    for node in list(svg):
        if node.tag=='{'+ns+'}defs': svg.remove(node)
    tree.write(file,encoding='unicode')
    pymupdf.open(file)[0].get_pixmap(matrix=pymupdf.Matrix(4,4),alpha=True).save(str(file.with_suffix('.png')))
print('Portable font-independent SVGs and PNGs ready.')
