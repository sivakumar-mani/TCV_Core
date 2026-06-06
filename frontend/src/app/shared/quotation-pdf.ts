const money = (value: any) => Number(value || 0).toFixed(2);

const textValue = (value: any) => String(value ?? '').replace(/\s+/g, ' ').trim();

const pdfText = (value: any) => textValue(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const truncate = (value: any, length: number) => {
  const text = textValue(value);
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
};

const buildRows = (quotation: any) => {
  const items = Array.isArray(quotation?.items) ? quotation.items : [];
  const customerName = quotation?.customer_name || quotation?.customer_label || quotation?.customer_id || '';
  const rows = [
    'THE CHENNAI VIDEO',
    'Quotation',
    '',
    `Quotation No : ${quotation?.quotation_no || 'Draft'}`,
    `Date         : ${quotation?.quotation_date || ''}`,
    `Valid Until  : ${quotation?.valid_until || ''}`,
    `Customer     : ${customerName}`,
    '',
    'S.No  Item                               Qty        Price       Amount',
    '---------------------------------------------------------------------'
  ];

  items.forEach((item: any, index: number) => {
    const name = truncate(item.item_name || item.product_name || item.description || 'Item', 32).padEnd(32, ' ');
    rows.push(
      `${String(index + 1).padEnd(5, ' ')} ${name} ${money(item.qty).padStart(8, ' ')} ${money(item.selling_price).padStart(11, ' ')} ${money(item.amount).padStart(11, ' ')}`
    );
  });

  rows.push('---------------------------------------------------------------------');
  rows.push(`Subtotal     : Rs. ${money(quotation?.total_amount)}`);
  rows.push(`Discount     : Rs. ${money(quotation?.discount_amount)}`);
  rows.push(`Tax          : Rs. ${money(quotation?.tax_amount)}`);
  rows.push(`Total        : Rs. ${money(quotation?.net_amount)}`);

  if (quotation?.requirement_details) {
    rows.push('');
    rows.push(`Requirement  : ${truncate(quotation.requirement_details, 76)}`);
  }

  if (quotation?.remarks) {
    rows.push(`Remarks      : ${truncate(quotation.remarks, 76)}`);
  }

  return rows;
};

export const buildQuotationPdfBlob = (quotation: any) => {
  const rows = buildRows(quotation);
  const pages = [];

  for (let start = 0; start < rows.length; start += 42) {
    pages.push(rows.slice(start, start + 42));
  }

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  const pageIds: number[] = [];

  pages.forEach((pageRows) => {
    const commands = pageRows
      .map((row, index) => `BT /F1 ${index < 2 ? 15 : 10} Tf 40 ${790 - (index * 17)} Td (${pdfText(row)}) Tj ET`)
      .join('\n');
    const contentId = addObject(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  const pagesId = objects.length + 1;
  const pageRefs = pageIds.map((id) => `${id} 0 R`).join(' ');
  const fixedObjects = objects.map((object) => object.replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`));
  fixedObjects.push(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pageIds.length} >>`);
  fixedObjects.push(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const catalogId = fixedObjects.length;
  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  fixedObjects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xref = pdf.length;
  pdf += `xref\n0 ${fixedObjects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${fixedObjects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
};

export const downloadQuotationPdf = (quotation: any) => {
  const blob = buildQuotationPdfBlob(quotation);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${quotation?.quotation_no || 'quotation'}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};
