type InvoiceKind = 'PROVIDER' | 'TCV';

const byteLength = (value: string) => new TextEncoder().encode(value).length;
const escapePdf = (value: unknown) => String(value ?? '-')
  .replace(/[^\x20-\x7E]/g, '')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');
const money = (value: unknown) => (Number(value) || 0).toFixed(2);
const displayDate = (value: unknown) => {
  if (!value) return '-';
  const text = String(value).slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : text;
};
const wrap = (value: unknown, maxCharacters: number, maxLines = 3) => {
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
  if (lines.length > maxLines) {
    lines[maxLines - 1] = `${lines.slice(maxLines - 1).join(' ')}`
      .slice(0, Math.max(maxCharacters - 3, 1)).trimEnd() + '...';
  }
  return (lines.length ? lines : ['-']).slice(0, maxLines);
};

export async function openInternetSubscriptionInvoicePdf(data: {
  kind: InvoiceKind;
  customer: any;
  subscription: any;
  package: any;
  address: string;
}) {
  const { kind, customer, subscription, package: packageRow } = data;
  const network = String(customer?.network_type || '').toUpperCase();
  const isKrishi = network === 'KRISHI';
  const amount = Number(subscription?.amount) || 0;
  const gstRate = Number(packageRow?.gst_percent) || 18;
  const taxable = amount / (1 + gstRate / 100);
  const halfTax = (amount - taxable) / 2;
  const invoicePrefix = kind === 'TCV' ? 'TCV-NET' : isKrishi ? 'KRISHI' : 'RAILWIRE';
  const invoiceNo = `${invoicePrefix}-${subscription?.subscription_year || ''}-${subscription?.internet_subscription_id || ''}`;
  const invoiceDate = subscription?.collect_date || subscription?.created_at || new Date();
  const packageName = packageRow?.package_name || 'Internet Subscription';
  let railwireLogo: Uint8Array | null = null;
  if (!isKrishi) {
    try {
      const response = await fetch(new URL('railwirenewlogo.jpg', document.baseURI));
      if (response.ok) railwireLogo = new Uint8Array(await response.arrayBuffer());
    } catch (_error) {
      railwireLogo = null;
    }
  }
  const commands: string[] = [];
  const text = (x: number, y: number, size: number, value: unknown, bold = false, color = '0 0 0') =>
    commands.push(`BT ${color} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET`);
  const rightText = (rightX: number, y: number, size: number, value: unknown, bold = false) => {
    const content = String(value ?? '-');
    text(Math.max(rightX - content.length * size * .51, 40), y, size, content, bold);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color = '.62 .65 .7') =>
    commands.push(`q ${color} RG .6 w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  const rect = (x: number, y: number, width: number, height: number, color = '.62 .65 .7', stroke = 0.6) =>
    commands.push(`q ${color} RG ${stroke} w ${x} ${y} ${width} ${height} re S Q`);
  const fill = (x: number, y: number, width: number, height: number, color = '.92 .92 .92') =>
    commands.push(`q ${color} rg ${x} ${y} ${width} ${height} re f Q`);
  const multiText = (x: number, y: number, size: number, value: unknown, max: number, lines = 3, bold = false) =>
    wrap(value, max, lines).forEach((part, index) => text(x, y - index * (size + 3), size, part, bold));
  const logo = (x: number, y: number, width: number, height: number) =>
    commands.push(`q ${width} 0 0 ${height} ${x} ${y} cm /Im1 Do Q`);

  const left = 38;
  const right = 557;
  const width = right - left;

  if (kind === 'PROVIDER' && isKrishi) {
    rect(10, 12, 575, 818, '1 0 0', 2.2);
    text(left, 792, 22, 'KRISHII FIBER', true, '0 .26 .58');
    text(left, 779, 7, 'INTERNET, TV, OTT, VOIP', true, '0 .45 .27');
    text(255, 748, 15, 'Tax Invoice', true);
    line(left, 736, right, 736, '.15 .15 .15');
    fill(left, 694, width, 22, '.80 .80 .80');
    rect(left, 545, width, 171);
    line(214, 545, 214, 716); line(390, 545, 390, 716);
    text(47, 701, 9, 'Invoice From', true); text(223, 701, 9, 'Invoice To', true); text(399, 701, 9, 'Customer Information', true);
    text(43, 680, 9, 'KRISHII FIBER', true);
    multiText(43, 665, 8, '4 Agaram Main Road, Ranganathan Nagar Selaiyur, Tamil Nadu - 600073', 35);
    text(43, 625, 8, 'GSTIN: 33AAGCK2549D1ZT');
    text(219, 680, 9, customer?.full_name || '-', true);
    multiText(219, 665, 8, data.address, 34);
    text(219, 625, 8, `Registered Mobile: ${customer?.mobile_no || '-'}`, true);
    [['Customer No', customer?.customer_code], ['User Name', customer?.net_id], ['Invoice No', invoiceNo],
      ['Billing Date', displayDate(invoiceDate)], ['Billing Period', `${displayDate(subscription?.start_date)} To`],
      ['', displayDate(subscription?.end_date)]].forEach(([label, value], index) => {
        text(397, 680 - index * 20, 8, label, false); text(468, 680 - index * 20, 8, value, index < 3);
      });
  } else if (kind === 'PROVIDER') {
    rect(38, 44, 519, 752, '0 .36 .72', 1.2);
    if (railwireLogo) logo(left + 8, 738, 92, 57);
    else text(left + 8, 764, 22, 'RAILWIRE', true, '0 .20 .38');
    text(220, 770, 13, 'TAX INVOICE-CUM-RECEIPT', true);
    text(left + 8, 738, 9, 'RailTel Corporation of India Limited.', true);
    text(left + 8, 724, 8, 'GSTIN: 33AABCR7176C1ZK');
    text(left + 8, 711, 8, 'PAN: AABCR7176C');
    fill(300, 615, 238, 112, '.96 .96 .96'); rect(300, 615, 238, 112, '.82 .82 .82');
    text(314, 706, 9, 'RailTel Corporation of India Limited', true);
    multiText(314, 690, 8, '4th Floor, Chief Administrative Officer Block, E.V.R. Periyar Salai, Chennai - 600008', 48);
    text(314, 648, 8, 'Payment Mode: Partner Recharge', true);
    text(314, 634, 8, 'Payment Collection Agency: Time Cable Vision');
    text(left, 585, 9, 'Billing Details', true);
    text(left, 570, 9, customer?.full_name || '-', true);
    multiText(left, 556, 8, data.address, 62, 2);
    text(left, 524, 8, `Username: ${customer?.net_id || '-'}`, true);
    text(left, 510, 8, `Subscriber ID: ${customer?.customer_code || '-'}`);
    multiText(left, 496, 8, `Package: ${packageName}`, 62, 2);
    [['Invoice No.', invoiceNo], ['Invoice Date', displayDate(invoiceDate)],
      ['Reference', subscription?.internet_subscription_id],
      ['Billing Period', `${displayDate(subscription?.start_date)} - ${displayDate(subscription?.end_date)}`]]
      .forEach(([label, value], index) => { text(350, 570 - index * 22, 8, label, true); text(430, 570 - index * 22, 8, value); });
  } else {
    if (railwireLogo) logo(left, 764, 92, 57);
    else text(left, 792, 17, isKrishi ? 'KRISHII FIBER' : 'RAILWIRE', true, isKrishi ? '0 .3 .58' : '0 .2 .38');
    text(376, 792, 17, 'TIME CABLE VISION', true, '.85 .12 0');
    text(left, 777, 7, isKrishi ? 'Krishii Fiber Internet Pvt. Ltd.' : 'Railwire Franchise Partner');
    text(376, 777, 7, 'No: 3/2, 2nd Street, Arkeeswarar Colony');
    text(376, 765, 7, 'Chrompet, Chennai - 600044');
    text(376, 753, 7, 'GSTIN: 33AAGCK2549D1ZT');
    line(left, 742, right, 742, '0 0 1');
    text(left, 721, 10, customer?.full_name || '-', true);
    multiText(left, 706, 8, data.address, 58, 2);
    text(left, 674, 8, `Registered Mobile: ${customer?.mobile_no || '-'}`);
    [['Invoice No', invoiceNo], ['Invoice Date', displayDate(invoiceDate)],
      ['Invoice Period', `${displayDate(subscription?.start_date)} to ${displayDate(subscription?.end_date)}`]]
      .forEach(([label, value], index) => { text(350, 721 - index * 18, 8, label); text(420, 721 - index * 18, 8, value); });
  }

  const tableTop = kind === 'PROVIDER' && isKrishi ? 500 : kind === 'PROVIDER' ? 455 : 635;
  const col = [left, 360, 407, 482, right];
  fill(left, tableTop - 24, width, 24, '.88 .88 .88');
  rect(left, tableTop - 105, width, 105);
  col.slice(1, -1).forEach((x) => line(x, tableTop - 105, x, tableTop));
  [tableTop - 24, tableTop - 54, tableTop - 71, tableTop - 88].forEach((y) => line(left, y, right, y));
  text(left + 6, tableTop - 16, 8, 'Description', true);
  text(367, tableTop - 16, 8, 'Qty', true); text(414, tableTop - 16, 8, 'Unit Cost', true); text(490, tableTop - 16, 8, 'Total', true);
  multiText(left + 6, tableTop - 42, 8, packageName, 57, 2);
  text(378, tableTop - 42, 8, '1'); rightText(474, tableTop - 42, 8, money(taxable)); rightText(549, tableTop - 42, 8, money(taxable));
  text(300, tableTop - 67, 8, `CGST @ ${gstRate / 2}%`, true); rightText(549, tableTop - 67, 8, money(halfTax));
  text(300, tableTop - 84, 8, `SGST @ ${gstRate / 2}%`, true); rightText(549, tableTop - 84, 8, money(halfTax));
  text(300, tableTop - 101, 8, 'GRAND TOTAL', true); rightText(549, tableTop - 101, 8, money(amount), true);

  const paymentY = tableTop - 135;
  text(left, paymentY, 9, 'Payment Details', true);
  text(left, paymentY - 18, 8, `Status: ${subscription?.payment_status || 'PENDING'}`);
  text(210, paymentY - 18, 8, `Paid: ${money(subscription?.paid_amount)}`);
  text(360, paymentY - 18, 8, `Balance: ${money(subscription?.balance_amount)}`);
  line(left, paymentY - 32, right, paymentY - 32);
  text(left, paymentY - 54, 8, 'This is a computer generated invoice and does not require a signature.');
  text(190, paymentY - 72, 9, 'Thank you for your prompt payment.', true);

  const encoder = new TextEncoder();
  const encode = (value: string) => encoder.encode(value);
  const content = `${commands.join('\n')}\n`;
  const contentId = railwireLogo ? 7 : 6;
  const resources = railwireLogo ? ' /XObject << /Im1 6 0 R >>' : '';
  const objects: Uint8Array[] = [
    encode('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n'),
    encode('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n'),
    encode(`3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${resources} >> /Contents ${contentId} 0 R >> endobj\n`),
    encode('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n'),
    encode('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n'),
  ];
  if (railwireLogo) {
    const imageHeader = encode(`6 0 obj << /Type /XObject /Subtype /Image /Width 3067 /Height 1907 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${railwireLogo.length} >> stream\n`);
    const imageFooter = encode('\nendstream endobj\n');
    const imageObject = new Uint8Array(imageHeader.length + railwireLogo.length + imageFooter.length);
    imageObject.set(imageHeader); imageObject.set(railwireLogo, imageHeader.length); imageObject.set(imageFooter, imageHeader.length + railwireLogo.length);
    objects.push(imageObject);
  }
  objects.push(encode(`${contentId} 0 obj << /Length ${byteLength(content)} >> stream\n${content}endstream endobj\n`));
  const header = encode('%PDF-1.4\n');
  const offsets: number[] = [];
  let length = header.length;
  objects.forEach((object) => { offsets.push(length); length += object.length; });
  const xrefOffset = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => xref += `${String(offset).padStart(10, '0')} 00000 n \n`);
  xref += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const xrefBytes = encode(xref);
  const pdfBytes = new Uint8Array(xrefOffset + xrefBytes.length);
  let position = 0;
  [header, ...objects, xrefBytes].forEach((part) => {
    pdfBytes.set(part, position);
    position += part.length;
  });
  const url = URL.createObjectURL(new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${invoiceNo}.pdf`;
    anchor.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
