const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');

const sqlPath = path.join(__dirname, 'backend', 'tables_enhanced.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const tableBlocks = [...sql.matchAll(/CREATE TABLE\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*ENGINE=/g)];
const tables = tableBlocks.map((match) => {
  const [, name, body] = match;
  const idColumns = [];
  const foreignKeys = [];

  body.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim().replace(/,$/, '');
    const columnMatch = line.match(/^([a-zA-Z0-9_]+)\s+/);
    if (columnMatch) {
      const column = columnMatch[1];
      if (/(^id$|_id$)/.test(column)) idColumns.push(column);
    }

    const fkMatch = line.match(
      /^FOREIGN KEY\s+\(([a-zA-Z0-9_]+)\)\s+REFERENCES\s+([a-zA-Z0-9_]+)\(([a-zA-Z0-9_]+)\)/i
    );
    if (fkMatch) {
      const [, fromColumn, toTable, toColumn] = fkMatch;
      foreignKeys.push({ fromTable: name, fromColumn, toTable, toColumn });
    }
  });

  return { name, idColumns, foreignKeys };
});

const links = tables.flatMap((table) => table.foreignKeys);

const groups = [
  ['users', 'employees', 'audit_log'],
  ['brands', 'categories', 'products', 'stock_master', 'stock_ledger'],
  ['suppliers', 'purchase_master', 'purchase_items', 'supplier_payments'],
  ['customers', 'quotation_master', 'quotation_items', 'work_orders', 'work_order_employees'],
  ['sales_master', 'sales_items', 'customer_payments', 'service_tickets', 'warranty_master'],
];

const tableMap = new Map(tables.map((table) => [table.name, table]));
const orderedTables = groups.flatMap((group) => group.map((name) => tableMap.get(name)).filter(Boolean));

const layout = {};
const boxW = 220;
const headerH = 34;
const rowH = 24;
const gapX = 58;
const gapY = 34;
const margin = 32;

groups.forEach((group, col) => {
  let y = 92;
  group.forEach((tableName) => {
    const table = tableMap.get(tableName);
    if (!table) return;
    const h = headerH + Math.max(table.idColumns.length, 1) * rowH + 14;
    layout[tableName] = { x: margin + col * (boxW + gapX), y, w: boxW, h };
    y += h + gapY;
  });
});

const width = margin * 2 + groups.length * boxW + (groups.length - 1) * gapX;
const height = Math.max(...Object.values(layout).map((box) => box.y + box.h)) + 60;

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function anchor(tableName, side) {
  const box = layout[tableName];
  if (!box) return null;
  return {
    x: side === 'left' ? box.x : box.x + box.w,
    y: box.y + box.h / 2,
  };
}

const svgLines = [];
svgLines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
svgLines.push('<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280"/></marker></defs>');
svgLines.push('<rect width="100%" height="100%" fill="#f8fafc"/>');
svgLines.push('<text x="50%" y="48" text-anchor="middle" font-family="Calibri, Arial, sans-serif" font-size="30" font-weight="700" fill="#12355b">TCV Core - ID Only Data Diagram</text>');
svgLines.push('<text x="50%" y="74" text-anchor="middle" font-family="Calibri, Arial, sans-serif" font-size="14" fill="#64748b">Generated from backend/tables_enhanced.sql - only primary and foreign key ID columns shown</text>');

links.forEach((link, index) => {
  const fromBox = layout[link.fromTable];
  const toBox = layout[link.toTable];
  if (!fromBox || !toBox) return;
  const fromSide = fromBox.x < toBox.x ? 'right' : 'left';
  const toSide = fromBox.x < toBox.x ? 'left' : 'right';
  const from = anchor(link.fromTable, fromSide);
  const to = anchor(link.toTable, toSide);
  const offset = ((index % 5) - 2) * 5;
  const c1x = from.x + (to.x - from.x) * 0.45;
  const c2x = from.x + (to.x - from.x) * 0.55;
  svgLines.push(`<path d="M ${from.x} ${from.y + offset} C ${c1x} ${from.y + offset}, ${c2x} ${to.y - offset}, ${to.x} ${to.y - offset}" fill="none" stroke="#94a3b8" stroke-width="1.7" marker-end="url(#arrow)" opacity="0.85"/>`);
});

orderedTables.forEach((table) => {
  const box = layout[table.name];
  svgLines.push(`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2"/>`);
  svgLines.push(`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${headerH}" rx="6" fill="#1f5a8a"/>`);
  svgLines.push(`<path d="M ${box.x} ${box.y + headerH - 6} H ${box.x + box.w} V ${box.y + headerH} H ${box.x} Z" fill="#1f5a8a"/>`);
  svgLines.push(`<text x="${box.x + 14}" y="${box.y + 23}" font-family="Calibri, Arial, sans-serif" font-size="17" font-weight="700" fill="#ffffff">${escapeXml(table.name)}</text>`);
  const columns = table.idColumns.length ? table.idColumns : ['(no id columns)'];
  columns.forEach((column, index) => {
    const y = box.y + headerH + 23 + index * rowH;
    svgLines.push(`<text x="${box.x + 14}" y="${y}" font-family="Calibri, Arial, sans-serif" font-size="15" fill="#1f2937">${escapeXml(column)}</text>`);
  });
});

svgLines.push('</svg>');
fs.writeFileSync(path.join(__dirname, 'TCV_ID_Only_Data_Diagram.svg'), svgLines.join('\n'));

const prs = new PptxGenJS();
prs.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
prs.layout = 'WIDE';
prs.author = 'TCV Core';
prs.subject = 'ID-only data diagram generated from backend/tables_enhanced.sql';
prs.title = 'TCV Core - ID Only Data Diagram';
prs.company = 'KRYA SOLUTIONS PRIVATE LIMITED';

const pptGroups = [
  ['users', 'employees', 'audit_log', 'brands', 'categories', 'products', 'stock_master', 'stock_ledger'],
  ['suppliers', 'purchase_master', 'purchase_items', 'supplier_payments', 'customers', 'quotation_master', 'quotation_items'],
  ['work_orders', 'work_order_employees', 'sales_master', 'sales_items', 'customer_payments', 'service_tickets', 'warranty_master'],
];

pptGroups.forEach((slideTables, slideIndex) => {
  const slide = prs.addSlide();
  slide.background = { color: 'F8FAFC' };
  slide.addText(`TCV Core - ID Only Data Diagram (${slideIndex + 1}/${pptGroups.length})`, {
    x: 0.35, y: 0.2, w: 12.65, h: 0.35,
    fontFace: 'Calibri', fontSize: 20, bold: true, color: '12355B', align: 'center',
  });
  slide.addText('Only ID columns are shown. Relationships follow FOREIGN KEY definitions in tables_enhanced.sql.', {
    x: 0.35, y: 0.55, w: 12.65, h: 0.24,
    fontFace: 'Calibri', fontSize: 9.5, color: '64748B', align: 'center',
  });

  slideTables.forEach((tableName, index) => {
    const table = tableMap.get(tableName);
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = 0.35 + col * 3.22;
    const y = 1.05 + row * 2.95;
    const w = 2.8;
    const h = 0.5 + Math.max(table.idColumns.length, 1) * 0.26 + 0.18;
    slide.addShape(prs.ShapeType.rect, {
      x, y, w, h,
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', width: 1 },
    });
    slide.addShape(prs.ShapeType.rect, {
      x, y, w, h: 0.42,
      fill: { color: '1F5A8A' },
      line: { color: '1F5A8A', width: 1 },
    });
    slide.addText(table.name, {
      x: x + 0.12, y: y + 0.08, w: w - 0.24, h: 0.22,
      fontFace: 'Calibri', fontSize: 12, bold: true, color: 'FFFFFF',
    });
    slide.addText((table.idColumns.length ? table.idColumns : ['(no id columns)']).join('\n'), {
      x: x + 0.12, y: y + 0.53, w: w - 0.24, h: h - 0.55,
      fontFace: 'Calibri', fontSize: 10.5, color: '1F2937',
      breakLine: false, fit: 'shrink',
    });
  });
});

prs.writeFile({ fileName: path.join(__dirname, 'TCV_ID_Only_Data_Diagram.pptx') }).then(() => {
  console.log('Generated TCV_ID_Only_Data_Diagram.svg');
  console.log('Generated TCV_ID_Only_Data_Diagram.pptx');
});
