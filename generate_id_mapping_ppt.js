const PptxGenJS = require('pptxgenjs');
const prs = new PptxGenJS();
prs.defineLayout({ name: 'LAYOUT1', width: 13.333, height: 7.5 });
const fontFace = 'Calibri';

let slide = prs.addSlide();
slide.background = { color: 'FFFFFF' };
slide.addText('TCV Core - ID Mapping Diagram', {
  x: 0.5, y: 0.35, w: 12.333, h: 0.6,
  fontSize: 28, bold: true, color: '003366', align: 'center', fontFace
});

const boxes = [
  { text: 'users\n——\nid', x: 0.5, y: 1.5, w: 2.2, h: 1.0, color: '1F497D' },
  { text: 'countries\n——\ncode', x: 0.5, y: 3.5, w: 2.2, h: 1.0, color: '8064A2' },
  { text: 'merchants\n——\nid\nmerchant_id\ncountry_code', x: 3.2, y: 3.5, w: 2.5, h: 1.2, color: '4F81BD' },
  { text: 'products\n——\nid\nmerchant_id', x: 6.3, y: 2.2, w: 2.5, h: 1.0, color: '9BBB59' },
  { text: 'orders\n——\nid\nuser_id', x: 3.2, y: 1.5, w: 2.5, h: 1.0, color: 'C0504D' },
  { text: 'order_items\n——\norder_id\nproduct_id', x: 6.3, y: 4.8, w: 2.5, h: 1.0, color: 'F79646' }
];

boxes.forEach(box => {
  slide.addShape(prs.ShapeType.rect, {
    x: box.x, y: box.y, w: box.w, h: box.h,
    fill: { color: box.color },
    line: { color: '000000', width: 1.5 }
  });
  slide.addText(box.text, {
    x: box.x, y: box.y, w: box.w, h: box.h,
    fontSize: 12, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace, bold: true
  });
});

const connectors = [
  { x: 2.7, y: 2.0, w: 0.8, h: 0, color: '000000', endArrow: true }, // users -> orders
  { x: 5.7, y: 2.0, w: 0.8, h: 0, color: '000000', endArrow: true }, // orders -> products? no product relation
  { x: 2.7, y: 4.0, w: 0.8, h: 0, color: '000000', endArrow: true }, // countries -> merchants
  { x: 5.7, y: 3.1, w: 0.8, h: 0, color: '000000', endArrow: true }, // merchants -> products
  { x: 8.8, y: 3.7, w: 0, h: 1.1, color: '000000', endArrow: true }, // products -> order_items
  { x: 2.7, y: 1.8, w: 0.8, h: 0.05, color: '000000', endArrow: true }
];

// Add arrows manually with more precise positions
slide.addShape(prs.ShapeType.line, {
  x: 2.2, y: 2.0, w: 1.0, h: 0, line: { color: '000000', width: 2, endArrowType: 'triangle' }
});
slide.addShape(prs.ShapeType.line, {
  x: 2.2, y: 4.0, w: 1.0, h: 0, line: { color: '000000', width: 2, endArrowType: 'triangle' }
});
slide.addShape(prs.ShapeType.line, {
  x: 5.7, y: 2.7, w: 1.0, h: 0, line: { color: '000000', width: 2, endArrowType: 'triangle' }
});
slide.addShape(prs.ShapeType.line, {
  x: 8.8, y: 2.7, w: 1.0, h: 0, line: { color: '000000', width: 2, endArrowType: 'triangle' }
});
slide.addShape(prs.ShapeType.line, {
  x: 8.8, y: 4.2, w: 0, h: 0.8, line: { color: '000000', width: 2, endArrowType: 'triangle' }
});
slide.addShape(prs.ShapeType.line, {
  x: 3.7, y: 1.3, w: 0, h: 0.7, line: { color: '000000', width: 2, endArrowType: 'triangle' }
});

slide.addText('users.id → orders.user_id', { x: 2.0, y: 1.85, w: 1.0, h: 0.3, fontSize: 9, color: '000000', align: 'center', fontFace });
slide.addText('countries.code → merchants.country_code', { x: 2.0, y: 3.85, w: 1.0, h: 0.3, fontSize: 9, color: '000000', align: 'center', fontFace });
slide.addText('merchants.id → products.merchant_id', { x: 6.5, y: 2.95, w: 1.0, h: 0.3, fontSize: 9, color: '000000', align: 'center', fontFace });
slide.addText('products.id → order_items.product_id', { x: 8.7, y: 3.6, w: 1.5, h: 0.3, fontSize: 9, color: '000000', align: 'center', fontFace });
slide.addText('orders.id → order_items.order_id', { x: 5.2, y: 4.4, w: 1.5, h: 0.3, fontSize: 9, color: '000000', align: 'center', fontFace });

prs.writeFile({ fileName: 'TCV_ID_Mapping_Diagram.pptx' });
console.log('Generated TCV_ID_Mapping_Diagram.pptx');
