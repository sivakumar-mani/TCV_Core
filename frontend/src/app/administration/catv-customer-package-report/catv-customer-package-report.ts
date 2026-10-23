import { buildExcelWorkbook } from '../../shared/excel-workbook';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { writePrintDocument } from '../../shared/print-layout';

@Component({
  selector: 'app-catv-customer-package-report',
  imports: [CommonModule, FormsModule, SelectModule],
  templateUrl: './catv-customer-package-report.html',
  styleUrls: ['../cable-tv-subscription-report/cable-tv-subscription-report.scss']
})
export class CatvCustomerPackageReport {
  rows: any[] = [];
  networks: any[] = [];
  packages: any[] = [];
  filters = { network_id: '', package_id: '', status: '' };
  appliedFilters = { ...this.filters };
  loading = false;
  loaded = false;
  totalCustomers = 0;
  page = 1;
  pageSize = 50;
  readonly statuses = ['ACTIVE', 'INACTIVE', 'DISCONNECTED', 'SHIFTED', 'TRANSFERRED', 'RETRIEVED', 'FAULT', 'UPGRADE', 'FREE', 'LEASE_LINE'];
  readonly headers = ['New C No', 'Old C No', 'Customer Name', 'STB Number', 'Package Name', 'Package Price', 'Status'];
  constructor(private api: CableTvServices, private snackbar: Snackbar) {}
  ngOnInit() { this.loadReport(); }
  get pageCount() { return Math.max(1, Math.ceil(this.rows.length / this.pageSize)); }
  get pageRows() { return this.rows.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get filterDescription() {
    return `Network: ${this.networks.find(n => String(n.network_id) === String(this.appliedFilters.network_id))?.network_name || 'All'} | Package: ${this.packages.find(p => String(p.package_id) === String(this.appliedFilters.package_id))?.package_name || 'All'} | Status: ${this.appliedFilters.status || 'All'}`;
  }
  loadReport() {
    if (this.loading) return;
    this.loading = true;
    const selected = { network_id: this.filters.network_id || '', package_id: this.filters.package_id || '', status: this.filters.status || '' };
    this.api.getCatvCustomerPackageReport(selected).subscribe({
      next: (response: any) => {
        this.rows = response.rows || [];
        this.networks = response.networks || [];
        this.packages = response.packages || [];
        this.totalCustomers = response.total_customers || 0;
        this.appliedFilters = selected;
        this.page = 1;
        this.loading = false;
        this.loaded = true;
      },
      error: (error: any) => {
        this.loading = false;
        this.snackbar.openSnackbar(error?.error?.message || 'Report request failed', 'error');
      }
    });
  }
  clearFilters() { this.filters = { network_id: '', package_id: '', status: '' }; this.loadReport(); }
  values(row: any): any[] {
    return [row.customer_code ?? '', row.legacy_customer_no || '', row.full_name || '', row.stb_no || '', row.package_name || '', row.package_price == null ? '' : Number(row.package_price).toFixed(2), row.status || ''];
  }
  exportExcel() {
    const rows: Array<Array<string | number>> = [
      ['CATV Customer Package Report'], [this.filterDescription], this.headers,
      ...this.rows.map(row => this.values(row).map((value, i) => i === 5 && value !== '' ? Number(value) : String(value)))
    ];
    const workbook = buildExcelWorkbook(rows);
    const url = URL.createObjectURL(new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a'); link.href = url; link.download = 'CATV_Customer_Packages.xlsx'; link.click(); URL.revokeObjectURL(url);
  }

  exportPdf() {
    const popup = window.open('', '_blank', 'width=1200,height=800');
    if (!popup) { this.snackbar.openSnackbar('Allow pop-ups to export PDF', 'error'); return; }
    const rows = this.rows.map(row => `<tr>${this.values(row).map(value => `<td>${this.escape(value)}</td>`).join('')}</tr>`).join('');
    writePrintDocument(popup, `<!doctype html><html><head><meta charset="utf-8"><title>CATV Customer Package Report</title><style>@page{size:A4 landscape;margin:10mm}body{font:11px Arial,sans-serif;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #888;padding:5px;text-align:left;overflow-wrap:anywhere}th{background:#eee}thead{display:table-header-group}tr{break-inside:avoid}td:nth-child(6){text-align:right}</style></head><body><h1>CATV Customer Package Report</h1><p>${this.escape(this.filterDescription)}</p><p>Customers: ${this.totalCustomers} | Package rows: ${this.rows.length}</p><table><thead><tr>${this.headers.map(h => `<th>${this.escape(h)}</th>`).join('')}</tr></thead><tbody>${rows || '<tr><td colspan="7">No matching customers.</td></tr>'}</tbody></table><script>window.onload=()=>window.print();<\/script></body></html>`);
    popup.document.close();
  }
  private escape(value: any) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] || c)); }
}
