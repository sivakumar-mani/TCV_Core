export interface SimplePdfOptions {
  filename: string;
  title: string;
  details: Array<[string, unknown]>;
  columns: string[];
  rows: unknown[][];
}

const clean = (value: unknown, length = 45) => String(value ?? '-')
  .replace(/[^\x20-\x7E]/g, '?')
  .replace(/([\\()])/g, '\\$1')
  .slice(0, length);

const byteLength = (value: string) => new TextEncoder().encode(value).length;

export function downloadSimplePdf(options: SimplePdfOptions) {
  const commands: string[] = [];
  const text = (x: number, y: number, size: number, value: unknown) => {
    commands.push(`BT /F1 ${size} Tf ${x} ${y} Td (${clean(value, 70)}) Tj ET`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number) => commands.push(`${x1} ${y1} m ${x2} ${y2} l S`);

  text(40, 800, 18, options.title);
  let y = 775;
  options.details.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? 40 : 310;
    if (index > 0 && index % 2 === 0) y -= 18;
    text(x, y, 9, `${label}: ${value ?? '-'}`);
  });
  y -= 30;

  const pageWidth = 515;
  const columnWidth = pageWidth / Math.max(options.columns.length, 1);
  line(40, y + 8, 555, y + 8);
  options.columns.forEach((column, index) => text(44 + index * columnWidth, y - 5, 8, clean(column, 18)));
  line(40, y - 12, 555, y - 12);
  y -= 28;
  options.rows.slice(0, 32).forEach((row) => {
    row.forEach((value, index) => text(44 + index * columnWidth, y, 8, clean(value, 20)));
    y -= 18;
    line(40, y + 7, 555, y + 7);
  });

  const content = commands.join('\n') + '\n';
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
  anchor.download = options.filename.replace(/\s+/g, '-');
  anchor.click();
  URL.revokeObjectURL(url);
}
