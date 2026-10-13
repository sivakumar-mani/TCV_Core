// Popup documents do not inherit the application's styles.
export function writePrintDocument(popup: Window, html: string) {
  const styles = `<style data-portal-print-layout>
    @page { size: auto; margin: 8mm; }
    @media print {
      html, body { width: auto !important; min-height: 0 !important; margin: 0 !important; }
      table { width: 100% !important; max-width: 100% !important; min-width: 0 !important; table-layout: auto !important; }
      th, td { font-size: 9px !important; padding: 3px !important; height: auto !important; overflow-wrap: break-word !important; word-break: normal !important; }
      th { white-space: normal !important; width: auto !important; overflow-wrap: normal !important; }
      tbody td { padding: 7px 3px !important; line-height: 1.4 !important; }
      tbody tr { height: auto !important; break-inside: avoid; }
      thead { display: table-header-group; }
      tfoot { display: table-row-group; }
      .meta { display: flex; flex-wrap: wrap; gap: 6px 16px !important; }
      .totals-row { flex-wrap: wrap; }
    }
  </style>`;
  popup.document.write(html.replace(/<\/head>/i, `${styles}</head>`));
}
