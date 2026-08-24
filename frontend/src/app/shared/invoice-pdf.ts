const byteLength = (value: string) => new TextEncoder().encode(value).length;
const escapePdf = (value: unknown) => String(value ?? '-')
  .replace(/[^\x20-\x7E]/g, '')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');
const number = (value: unknown) => (Number(value) || 0).toFixed(2);

const wrap = (value: unknown, maxCharacters: number, maxLines = 2) => {
  const words = String(value ?? '-').trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharacters) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  if (lines.length > maxLines) lines[maxLines - 1] = `${lines.slice(maxLines - 1).join(' ')}`.slice(0, maxCharacters - 3).trimEnd() + '...';
  return (lines.length ? lines : ['-']).slice(0, maxLines);
};

export function downloadInvoicePdf(invoice: any, displayDate: (value: string | Date) => string) {
  const commands: string[] = [];
  const text = (x: number, y: number, size: number, value: unknown) =>
    commands.push(`BT /F1 ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET`);
  const rightText = (rightX: number, y: number, size: number, value: unknown) => {
    const content = String(value ?? '-');
    text(Number((rightX - content.length * size * 0.52).toFixed(2)), y, size, content);
  };
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    commands.push(`q 0.72 0.72 0.72 RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  const rect = (x: number, y: number, width: number, height: number) =>
    commands.push(`q 0.72 0.72 0.72 RG 0.6 w ${x} ${y} ${width} ${height} re S Q`);
  const fillRect = (x: number, y: number, width: number, height: number, shade: number) => {
    const color = (shade / 255).toFixed(3);
    commands.push(`q ${color} ${color} ${color} rg ${x} ${y} ${width} ${height} re f Q`);
    rect(x, y, width, height);
  };

  const left = 40;
  const right = 555;
  const width = right - left;

  // Keep the document label at the top, ahead of all invoice content.
  text(270, 810, 15, 'Invoice');
  line(left, 801, right, 801);
  text(left, 775, 22, 'TCV');
  text(left, 755, 9, 'No:2/3, Second Street, Arkeeswarar Colony');
  text(left, 741, 9, 'Chrompet, Chennai - 600044');
  text(left, 727, 9, 'Contact # : 9962543540');
  text(left, 713, 9, 'GSTIN: 33AYUPM7228A1ZD');
  line(left, 702, right, 702);

  fillRect(left, 638, 248, 54, 241);
  fillRect(307, 638, 248, 54, 241);
  text(left + 12, 675, 9, 'To:');
  text(left + 36, 675, 9, String(invoice.customer_name || '-').slice(0, 32));
  text(left + 36, 661, 8, String(invoice.address || '-').slice(0, 42));
  text(left + 36, 647, 8, `Contact #: ${invoice.phone || ''}`.slice(0, 42));
  text(321, 675, 9, 'Invoice#');
  text(408, 675, 9, String(invoice.invoice_no || ''));
  text(321, 659, 9, 'Invoice Date');
  text(408, 659, 9, displayDate(invoice.invoice_date));
  text(321, 645, 9, 'Work Order');
  text(408, 645, 9, String(invoice.work_order_no || '-'));

  const tableTop = 622;
  const headerHeight = 24;
  const rowHeight = 30;
  const items = (invoice.items || []).slice(0, 10);
  const tableBottom = tableTop - headerHeight - rowHeight * Math.max(items.length, 1);
  const serialRight = 70;
  const descriptionRight = 355;
  const qtyRight = 405;
  const rateRight = 475;

  fillRect(left, tableTop - headerHeight, width, headerHeight, 212);
  rect(left, tableBottom, width, tableTop - tableBottom);
  [serialRight, descriptionRight, qtyRight, rateRight].forEach((x) => line(x, tableBottom, x, tableTop));
  line(left, tableTop - headerHeight, right, tableTop - headerHeight);
  for (let y = tableTop - headerHeight - rowHeight; y >= tableBottom; y -= rowHeight) line(left, y, right, y);
  text(left + 7, tableTop - 16, 8, 'S.No');
  text(serialRight + 8, tableTop - 16, 8, 'Description');
  rightText(qtyRight - 6, tableTop - 16, 8, 'Qty');
  rightText(rateRight - 6, tableTop - 16, 8, 'Rate');
  rightText(right - 6, tableTop - 16, 8, 'Amount');

  items.forEach((item: any, index: number) => {
    const y = tableTop - headerHeight - rowHeight * index - 16;
    text(left + 10, y, 8, index + 1);
    wrap([item.item_name, item.description].filter(Boolean).join(' - '), 54).forEach((value, lineIndex) =>
      text(serialRight + 8, y - lineIndex * 10, 8, value));
    rightText(qtyRight - 6, y, 8, `${number(item.qty)} ${item.unit || 'PCS'}`);
    rightText(rateRight - 6, y, 8, number(item.selling_price));
    rightText(right - 6, y, 8, number(item.amount));
  });

  const summaryTop = tableBottom;
  const summaryBottom = 100;
  const totalsLeft = 330;
  rect(left, summaryBottom, width, summaryTop - summaryBottom);
  line(totalsLeft, summaryBottom, totalsLeft, summaryTop);
  text(left + 10, summaryTop - 20, 10, 'UPI Payment: 9962543540');
  text(left + 10, summaryTop - 40, 9, 'Please pay to this account');
  [
    'Account Name: Time Cable Vision',
    'CA No: 510909010042677',
    'Bank Name: City Union Bank',
    'Branch: New Colony Chrompet',
    'IFSC Code: CIUB0000432',
    'MICR Code: 600054082'
  ].forEach((value, index) => text(left + 10, summaryTop - 60 - index * 15, 8, value));
  text(left + 10, summaryTop - 165, 8, 'Thank you for giving us the opportunity to serve you.');
  text(left + 10, summaryTop - 180, 8, 'We truly appreciate your business and continued support.');

  [
    ['Sub Total', invoice.total_amount],
    ['Discount', invoice.discount_amount],
    ['Tax', invoice.tax_amount],
    ['Net Amount', invoice.net_amount],
    ['Paid', invoice.paid_amount],
    ['Balance', invoice.balance_amount]
  ].forEach(([label, value], index) => {
    const rowBottom = summaryTop - 18 * (index + 1);
    fillRect(totalsLeft, rowBottom, right - totalsLeft, 18, index === 3 ? 238 : 247);
    text(totalsLeft + 8, rowBottom + 5, 9, label);
    rightText(right - 8, rowBottom + 5, 9, number(value));
  });
  line(totalsLeft + 115, summaryBottom + 35, right - 20, summaryBottom + 35);
  text(totalsLeft + 125, summaryBottom + 20, 8, 'Authorized Signature');

  const content = `${commands.join('\n')}\n`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${byteLength(content)} >> stream\n${content}endstream endobj`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object) => {
    offsets.push(byteLength(pdf));
    pdf += `${object}\n`;
  });
  const xref = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => pdf += `${String(offset).padStart(10, '0')} 00000 n \n`);
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `invoice-${invoice.invoice_no}.pdf`.replace(/\s+/g, '-');
  anchor.click();
  URL.revokeObjectURL(url);
}
