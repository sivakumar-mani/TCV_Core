import { writePrintDocument } from './print-layout';

export function writePagedPrintDocument(popup: Window, html: string) {
  writePrintDocument(popup, html);
  popup.addEventListener('load', async () => {
    const doc = popup.document;
    await doc.fonts.ready;
    const heading = doc.querySelector('h1')!;
    const meta = doc.querySelector('.meta')!;
    const table = doc.querySelector('table')!;
    const summary = doc.querySelector('.report-summary')!;
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const style = doc.createElement('style');
    doc.head.append(style);
    const controls = doc.createElement('div');
    controls.className = 'print-controls';
    controls.innerHTML = '<label>Paper orientation <select><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label> <button type="button">Print</button>';
    const output = doc.createElement('main');
    doc.body.replaceChildren(controls, output);
    const select = controls.querySelector('select')!;
    const number = (value: number) => value.toLocaleString('en-IN');
    const paginate = () => {
      const landscape = select.value === 'landscape';
      const width = landscape ? 289 : 202;
      const height = landscape ? 202 : 289;
      style.textContent = `@page{size:A4 ${select.value};margin:4mm}
        .print-controls{padding:12px;background:#eef2f6} .print-sheet{width:${width}mm;box-sizing:border-box;margin:12px auto}
        .print-sheet table{width:100% !important;max-width:100%;min-width:0;table-layout:auto} .print-sheet th,.print-sheet td{padding:3px;font-size:9px;height:auto;overflow-wrap:break-word;word-break:normal}
        .print-sheet tbody td{padding:7px 3px !important;line-height:1.4}
        .print-sheet th{width:auto;white-space:normal;overflow-wrap:normal} .print-sheet .meta{gap:6px 16px}
        .print-sheet .totals-row{flex-wrap:wrap} .print-sheet h1{margin:0 0 8px}
        @media print{.print-controls{display:none}.print-sheet{width:100% !important;margin:0}.print-sheet + .print-sheet{break-before:page}}
      `;
      output.replaceChildren();
      const ruler = doc.createElement('div');
      ruler.style.height = `${height}mm`;
      output.append(ruler);
      const capacity = ruler.getBoundingClientRect().height - 4;
      ruler.remove();
      let sheet: HTMLElement, body: HTMLTableSectionElement, footer: HTMLElement;
      let sheetRows: Element[] = [];
      const totals = () => {
        const amounts: Record<string, number> = { CASH: 0, ONLINE: 0, OFFICE: 0 };
        let total = 0;
        for (const row of sheetRows) {
          const amount = Number(row.getAttribute('data-paid')) || 0;
          const mode = row.getAttribute('data-mode') || 'CASH';
          amounts[mode] = (amounts[mode] || 0) + amount;
          total += amount;
        }
        footer.replaceChildren();
        for (const [label, value] of [['Cash Amount', amounts['CASH']], ['Online Amount', amounts['ONLINE']], ['Office Amount', amounts['OFFICE']], ...(amounts['OTHER'] ? [['Other Amount', amounts['OTHER']]] : []), ['Page Total', total]]) {
          const span = doc.createElement('span');
          span.textContent = `${label}: ${number(Number(value))}`;
          footer.append(span);
        }
      };
      const newSheet = () => {
        sheet = doc.createElement('section');
        sheet.className = 'print-sheet';
        sheet.append(heading.cloneNode(true), meta.cloneNode(true));
        const pageLabel = doc.createElement('h2');
        pageLabel.textContent = `Page ${output.children.length + 1}`;
        sheet.append(pageLabel);
        const pageTable = table.cloneNode(false) as HTMLTableElement;
        pageTable.append(table.querySelector('thead')!.cloneNode(true));
        body = doc.createElement('tbody');
        pageTable.append(body);
        footer = doc.createElement('div');
        footer.className = 'totals-row page-totals';
        sheet.append(pageTable, footer);
        output.append(sheet);
        sheetRows = [];
        totals();
      };
      newSheet();
      rows.forEach((row, index) => {
        const clone = row.cloneNode(true) as Element;
        body.append(clone);
        sheetRows.push(clone);
        totals();
        if (sheet.getBoundingClientRect().height > capacity && sheetRows.length > 1) {
          clone.remove();
          sheetRows.pop();
          totals();
          newSheet();
          body.append(clone);
          sheetRows.push(clone);
          totals();
        }
        if (index === rows.length - 1) {
          const finalSummary = summary.cloneNode(true) as HTMLElement;
          sheet.append(finalSummary);
          if (sheet.getBoundingClientRect().height > capacity && sheetRows.length > 1) {
            finalSummary.remove();
            clone.remove();
            sheetRows.pop();
            totals();
            newSheet();
            body.append(clone);
            sheetRows.push(clone);
            totals();
            sheet.append(finalSummary);
          }
        }
      });
    };
    select.addEventListener('change', paginate);
    controls.querySelector('button')!.addEventListener('click', () => { paginate(); popup.print(); });
    paginate();
  }, { once: true });
}
