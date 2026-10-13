import { writePrintDocument } from './print-layout';
export function downloadSubscriptionReport(headers: string[], rows: unknown[][], filename: string) {
  if (!rows.length) return;
  const csv = [headers, ...rows].map(row => row.map(value => {
    let text = String(value ?? '');
    if (/^\s*[=+@-]/.test(text) && text !== '-') text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function printSubscriptionReport(title: string, headers: string[], rows: unknown[][]): boolean {
  if (!rows.length) return true;
  const popup = window.open('', '_blank', 'width=1200,height=800');
  if (!popup) return false;
  const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]!));
  writePrintDocument(popup, `<!doctype html><html><head><title>${escape(title)}</title><style>
    body{font-family:Arial,sans-serif;color:#111827;margin:24px}h1{font-size:22px}
    table{border-collapse:collapse;width:100%}th,td{border:1px solid #9ca3af;padding:8px;text-align:left;font-size:12px;overflow-wrap:anywhere}
    th{background:#e5e7eb}thead{display:table-header-group}tr{break-inside:avoid}
    @page{size:landscape;margin:12mm}
  </style></head><body><h1>${escape(title)}</h1><p>Total Customers: ${rows.length}</p>
    <table><thead><tr>${headers.map(header => `<th>${escape(header)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(row => `<tr>${row.map(value => `<td>${escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>
  </body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
  return true;
}
