import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { PermissionService } from '../../services/permission.service';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-cable-tv-subscription-report',
  imports: [CommonModule, FormsModule],
  templateUrl: './cable-tv-subscription-report.html',
  styleUrl: './cable-tv-subscription-report.scss'
})
export class CableTvSubscriptionReport {
  lookups: any = {};
  rows: any[] = [];
  summary = { total_records: 0, total_amount: 0, total_balance: 0, total_count: 0 };
  filters = {
    network_id: '',
    collected_by_employee_id: '',
    customer_type: '',
    payment_type: '',
    start_date: this.monthStart(),
    end_date: this.today()
  };
  readonly customerTypes = [
    { value: 'REGULAR', label: 'Regular Customers' },
    { value: 'BUSINESS', label: 'Business Customers' }
  ];
  page = 1;
  pageSize = 25;
  readonly pageSizes = [25, 50, 100];

  constructor(
    private cableTvService: CableTvServices,
    private loader: NgxUiLoaderService,
    private snackbar: Snackbar,
    public permissions: PermissionService
  ) {}

  ngOnInit() {
    this.cableTvService.getLookups().subscribe({
      next: (response: any) => {
        this.lookups = response || {};
        if (!this.permissions.isAdmin()) {
          const employee = this.loggedInEmployee;
          this.filters.collected_by_employee_id = employee?.employee_id ? String(employee.employee_id) : '';
        }
        this.loadReport();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  get networks() { return this.lookups.networks || []; }
  get employees() { return this.lookups.employees || []; }
  get loggedInEmployee() {
    const employeeId = this.permissions.employeeId();
    const identity = String(this.permissions.employeeCode() || this.permissions.username() || '').trim().toLowerCase();
    return this.employees.find((item: any) =>
      (employeeId && Number(item.employee_id) === Number(employeeId))
      || String(item.employee_code || '').trim().toLowerCase() === identity
      || String(item.employee_name || '').trim().toLowerCase() === identity
    );
  }
  get loggedInEmployeeName() {
    const employee = this.loggedInEmployee;
    return employee?.employee_name || this.permissions.username() || '-';
  }
  get collectorLabel() {
    if (!this.permissions.isAdmin()) return this.loggedInEmployeeName;
    const employee = this.employees.find((item: any) => Number(item.employee_id) === Number(this.filters.collected_by_employee_id));
    return employee?.employee_name || 'ALL';
  }
  get networkLabel() {
    const network = this.networks.find((item: any) => Number(item.network_id) === Number(this.filters.network_id));
    return network ? (network.network_code || network.network_name) : 'ALL';
  }
  get customerTypeLabel() {
    return this.customerTypes.find(type => type.value === this.filters.customer_type)?.label || 'All Customers';
  }
  get pageCount() { return Math.max(Math.ceil(this.rows.length / this.pageSize), 1); }
  get pageRows() {
    const start = (this.page - 1) * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }
  get pageTotal() { return this.pageRows.reduce((sum, row) => sum + Math.round(Number(row.paid_amount) || 0), 0); }
  get paymentModeBreakdown() {
    const totals = this.rows.reduce((result: Record<string, number>, row: any) => {
      const rawMode = String(row.payment_mode || 'CASH').toUpperCase();
      const mode = ['CASH', 'ONLINE', 'OFFICE'].includes(rawMode) ? rawMode : 'OTHER';
      result[mode] = (result[mode] || 0) + Math.round(Number(row.paid_amount) || 0);
      return result;
    }, {});
    return [
      { mode: 'CASH', label: 'Cash Amount', amount: totals['CASH'] || 0 },
      { mode: 'ONLINE', label: 'Online Amount', amount: totals['ONLINE'] || 0 },
      { mode: 'OFFICE', label: 'Office Amount', amount: totals['OFFICE'] || 0 },
      ...(totals['OTHER'] ? [{ mode: 'OTHER', label: 'Other Amount', amount: totals['OTHER'] }] : [])
    ];
  }

  loadReport() {
    if (!this.filters.start_date || !this.filters.end_date) return this.showError('From Date and To Date are required');
    if (this.filters.end_date < this.filters.start_date) return this.showError('To Date cannot be before From Date');
    const requestFilters = { ...this.filters };
    if (!this.permissions.isAdmin()) delete (requestFilters as any).collected_by_employee_id;
    this.loader.start();
    this.cableTvService.getCableSubscriptionReport(requestFilters).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.rows = response?.rows || [];
        this.summary = {
          total_records: Number(response?.total_records) || 0,
          total_amount: Math.round(Number(response?.total_amount) || 0),
          total_balance: Math.round(Number(response?.total_balance) || 0),
          total_count: Number(response?.total_count) || 0
        };
        this.page = 1;
      },
      error: (error: any) => this.handleError(error)
    });
  }

  clearFilters() {
    this.filters = {
      network_id: '',
      collected_by_employee_id: this.permissions.isAdmin() ? '' : String(this.loggedInEmployee?.employee_id || ''),
      customer_type: '',
      payment_type: '',
      start_date: this.monthStart(),
      end_date: this.today()
    };
    this.loadReport();
  }

  changePage(value: number) {
    this.page = Math.min(Math.max(value, 1), this.pageCount);
  }

  monthLabel(row: any) {
    const month = new Date(2000, Number(row.subscription_month) - 1, 1).toLocaleString('en-US', { month: 'long' });
    return `${month} ${row.subscription_year}`;
  }

  paymentDetails(row: any) {
    return `${this.titleCase(row.payment_mode || 'CASH')}: ${row.collected_by_name || '-'}`;
  }

  paymentType(row: any) { return String(row.payment_mode || 'CASH').toUpperCase(); }

  customerNumber(row: any) {
    return row.legacy_customer_no ? `${row.customer_code} / ${row.legacy_customer_no}` : String(row.customer_code || '-');
  }

  printReport() {
    const popup = window.open('', '_blank', 'width=1200,height=800');
    if (!popup) return this.showError('Allow pop-ups to print the report');
    const rows = this.rows.map((row, index) => `<tr>
      <td>${index + 1}</td><td>${this.escapeHtml(this.displayDate(row.collect_date))}</td>
      <td>${this.escapeHtml(this.customerNumber(row))}</td><td>${this.escapeHtml(row.collected_by_name || '-')}</td><td>${this.escapeHtml(row.full_name)}</td>
      <td>${this.escapeHtml(row.network_code || row.network_name || '-')}</td>
      <td>${this.escapeHtml(this.monthLabel(row))}</td><td>${Math.round(Number(row.number_of_days) || 0)}</td>
      <td>${this.escapeHtml(this.paymentType(row))}</td><td>${this.escapeHtml(row.mapped_employee_name || '-')}</td><td class="number">${this.count(row.received_count)}</td>
      <td class="number">${this.amount(row.balance_amount)}</td><td class="number">${this.amount(row.paid_amount)}</td>
    </tr>`).join('');
    popup.document.write(`<!doctype html><html><head><title>CATV Subscription Report</title><style>
      body{font-family:Arial,sans-serif;color:#172033;margin:22px}h1{color:#0878ee;font-size:25px}
      .meta{display:flex;gap:32px;margin:16px 0;font-weight:700}table{border-collapse:collapse;width:100%}
      th{background:#0878ee;color:#fff}th,td{border:1px solid #b8c1cc;padding:8px;text-align:left}.number{text-align:right}
      tfoot td{font-weight:700}@media print{button{display:none}}
    </style></head><body><h1>CATV Subscription Report</h1>
      <div class="meta"><span>Collected By: ${this.escapeHtml(this.collectorLabel)}</span><span>Network: ${this.escapeHtml(this.networkLabel)}</span><span>Customer Type: ${this.escapeHtml(this.customerTypeLabel)}</span><span>Period: ${this.escapeHtml(this.displayDate(this.filters.start_date))} to ${this.escapeHtml(this.displayDate(this.filters.end_date))}</span></div>
      <table><thead><tr><th>S.No</th><th>Collected Date</th><th>C No/Old C No</th><th>Collected By</th><th>Name</th><th>Network</th><th>Month</th><th>Period</th><th>Type</th><th>Mapped</th><th>Count</th><th>Balance</th><th>Amount</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="13">No records found.</td></tr>'}</tbody>
      <tfoot>${this.paymentModeBreakdown.map(item => `<tr><td colspan="12">${this.escapeHtml(item.label)}</td><td class="number">${this.amount(item.amount)}</td></tr>`).join('')}<tr><td colspan="9">Total Records: ${this.summary.total_records}</td><td>Grand Total</td><td class="number">${this.summary.total_count}</td><td class="number">${this.amount(this.summary.total_balance)}</td><td class="number">${this.amount(this.summary.total_amount)}</td></tr></tfoot></table>
      <script>window.onload=()=>window.print();<\/script></body></html>`);
    popup.document.close();
  }

  exportExcel() {
    const headers = ['S.No', 'Collected Date', 'C No/Old C No', 'Collected By', 'Name', 'Network', 'Month', 'Period', 'Type', 'Mapped', 'Count', 'Balance', 'Amount'];
    const data = this.rows.map((row, index) => [
      index + 1, this.displayDate(row.collect_date), this.customerNumber(row), row.collected_by_name || '-', row.full_name,
      row.network_code || row.network_name || '-', this.monthLabel(row), Math.round(Number(row.number_of_days) || 0),
      this.paymentType(row), row.mapped_employee_name || '-', Number(row.received_count) || 0,
      Math.round(Number(row.balance_amount) || 0), Math.round(Number(row.paid_amount) || 0)
    ]);
    this.paymentModeBreakdown.forEach(item => {
      data.push(['', '', '', '', '', '', '', '', '', '', '', item.label, item.amount]);
    });
    data.push(['', '', '', '', '', '', '', '', `Total Records: ${this.summary.total_records}`, 'Grand Total', this.summary.total_count, this.summary.total_balance, this.summary.total_amount]);
    const csv = [headers, ...data].map(columns => columns.map(value => this.csvValue(value)).join(',')).join('\r\n');
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CATV_Subscription_Report_${this.filters.start_date}_to_${this.filters.end_date}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  amount(value: any) { return Math.round(Number(value) || 0).toLocaleString('en-IN'); }
  count(value: any) { return Number(Number(value || 0).toFixed(2)).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
  displayDate(value: any) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  }

  private titleCase(value: any) { const text = String(value || '').toLowerCase(); return text ? text[0].toUpperCase() + text.slice(1) : ''; }
  private csvValue(value: any) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
  private escapeHtml(value: any) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
  }
  private localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private today() { return this.localDate(new Date()); }
  private monthStart() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`; }
  private showError(message: string) { this.snackbar.openSnackbar(message, globalConstants.errorRegex); }
  private handleError(error: any) { this.loader.stop(); this.showError(error?.error?.message || error?.message || 'Report request failed'); }
}
