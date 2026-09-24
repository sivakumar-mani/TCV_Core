import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { SelectModule } from 'primeng/select';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-catv-customer-list-report',
  imports: [CommonModule, FormsModule, SelectModule],
  templateUrl: './catv-customer-list-report.html',
  styleUrls: ['../cable-tv-subscription-report/cable-tv-subscription-report.scss', './catv-customer-list-report.scss']
})
export class CatvCustomerListReport {
  networks: any[] = [];
  areas: any[] = [];
  streets: any[] = [];
  rows: any[] = [];
  filters = { network_id: '', area_id: '', street_id: '', status: '' };
  summary = { total_records: 0 };
  page = 1;
  pageSize = 50;
  readonly pageSizes = [25, 50, 100];
  readonly statuses = ['ACTIVE', 'INACTIVE', 'DISCONNECTED', 'SHIFTED', 'TRANSFERRED', 'RETRIEVED', 'FAULT', 'UPGRADE', 'FREE', 'LEASE_LINE'];

  constructor(private service: CableTvServices, private loader: NgxUiLoaderService, private snackbar: Snackbar) {}

  ngOnInit() {
    this.loader.start();
    this.service.getLookups().subscribe({
      next: (response: any) => {
        this.networks = response?.networks || [];
        this.areas = response?.areas || [];
        this.streets = response?.streets || [];
        this.loadReport();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  get filteredAreas() {
    return this.filters.network_id
      ? this.areas.filter(item => Number(item.network_id) === Number(this.filters.network_id))
      : this.areas;
  }
  get filteredStreets() {
    return this.filters.area_id
      ? this.streets.filter(item => Number(item.area_id) === Number(this.filters.area_id))
      : this.streets;
  }
  get networkLabel() {
    const network = this.networks.find(item => Number(item.network_id) === Number(this.filters.network_id));
    return network ? (network.network_code || network.network_name) : 'All Networks';
  }
  get areaLabel() { return this.areas.find(item => Number(item.area_id) === Number(this.filters.area_id))?.area_name || 'All Areas'; }
  get streetLabel() { return this.streets.find(item => Number(item.street_id) === Number(this.filters.street_id))?.street_name || 'All Streets'; }
  get statusLabel() { return this.filters.status ? this.titleCase(this.filters.status.replace('_', ' ')) : 'All Statuses'; }
  get pageCount() { return Math.max(Math.ceil(this.rows.length / this.pageSize), 1); }
  get pageRows() { return this.rows.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }

  areaChanged() {
    if (!this.filteredStreets.some(item => Number(item.street_id) === Number(this.filters.street_id))) this.filters.street_id = '';
  }

  networkChanged() {
    if (!this.filteredAreas.some(item => Number(item.area_id) === Number(this.filters.area_id))) this.filters.area_id = '';
    this.areaChanged();
  }

  loadReport() {
    this.loader.start();
    this.service.getCableCustomerListReport(this.filters).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.rows = response?.rows || [];
        this.summary = { total_records: Number(response?.total_records) || 0 };
        this.page = 1;
      },
      error: (error: any) => this.handleError(error)
    });
  }

  clearFilters() {
    this.filters = { network_id: '', area_id: '', street_id: '', status: '' };
    this.loadReport();
  }

  changePage(value: number) { this.page = Math.min(Math.max(value, 1), this.pageCount); }
  customerNumber(row: any) { return row.legacy_customer_no ? `${row.customer_code} / ${row.legacy_customer_no}` : String(row.customer_code || '-'); }
  printReport() {
    const popup = window.open('', '_blank', 'width=1200,height=800');
    if (!popup) return this.error('Allow pop-ups to print the report');
    const rows = this.rows.map((row, index) => `<tr><td class="fit">${index + 1}</td><td class="date"></td><td class="fit">${this.escape(this.customerNumber(row))}</td><td class="fit">${this.escape(row.full_name)}</td><td class="fit">${this.escape(row.stb_no || '')}</td><td class="manual"></td><td class="write"></td><td class="write"></td></tr>`).join('');
    popup.document.write(`<!doctype html><html><head><title>CATV Customer List Report</title><style>
      @page{size:A4 portrait;margin:8mm}body{font-family:Arial,sans-serif;color:#172033;margin:0}h1{text-align:center;font-size:20.4px;margin:0 0 7px}.meta{display:flex;flex-wrap:wrap;gap:20px;margin:0 0 8px;font-size:12px;font-weight:700}table{border-collapse:collapse;table-layout:fixed;width:100%;font-size:10.8px;line-height:1.1}th{background:#0878ee;color:#fff}th,td{border:1px solid #333;height:17px;padding:2px 4px;text-align:left;overflow-wrap:anywhere}tbody tr{background:#fff;height:1in;break-inside:avoid;page-break-inside:avoid}tbody td{height:1in;box-sizing:border-box}th:nth-child(1){width:4%}th:nth-child(2){width:10%}th:nth-child(3){width:14%}th:nth-child(4){width:22%}th:nth-child(5){width:18%}th:nth-child(6){width:16%}th:nth-child(7),th:nth-child(8){width:8%}th,td{box-sizing:border-box}tfoot td{font-weight:700;background:#f3f5f7}
    </style></head><body><h1>CATV Customer List Report</h1><div class="meta"><span>Network: ${this.escape(this.networkLabel)}</span><span>Area: ${this.escape(this.areaLabel)}</span><span>Street: ${this.escape(this.streetLabel)}</span><span>Status: ${this.escape(this.statusLabel)}</span></div><table><thead><tr><th>S.No</th><th>Date</th><th>C No / Old C No</th><th>Customer Name</th><th>STB No</th><th>New STB</th><th>Paid</th><th>Balance</th></tr></thead><tbody>${rows || '<tr><td colspan="8">No customers found.</td></tr>'}</tbody><tfoot><tr><td colspan="8">Total Customers: ${this.summary.total_records}</td></tr></tfoot></table><script>window.onload=()=>window.print();<\/script></body></html>`);
    popup.document.close();
  }

  exportExcel() {
    const headers = ['S.No', 'Date', 'C No / Old C No', 'Customer Name', 'STB No', 'New STB', 'Paid', 'Balance'];
    const data = this.rows.map((row, index) => [index + 1, '', this.customerNumber(row), row.full_name, row.stb_no || '', '', '', '']);
    data.push(['', '', `Total Customers: ${this.summary.total_records}`, '', '', '', '', '']);
    const csv = [headers, ...data].map(columns => columns.map(value => this.csvValue(value)).join(',')).join('\r\n');
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'CATV_Customer_List_Report.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private titleCase(value: string) { return value.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()); }
  private csvValue(value: any) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
  private escape(value: any) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char)); }
  private error(message: string) { this.snackbar.openSnackbar(message, globalConstants.errorRegex); }
  private handleError(error: any) { this.loader.stop(); this.error(error?.error?.message || error?.message || 'Report request failed'); }
}
