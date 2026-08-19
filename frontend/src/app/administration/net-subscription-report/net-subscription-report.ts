import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { InternetCustomerServices } from '../../services/internet-customer-services';
import { PermissionService } from '../../services/permission.service';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-net-subscription-report',
  imports: [CommonModule, FormsModule],
  templateUrl: './net-subscription-report.html',
  styleUrl: '../cable-tv-subscription-report/cable-tv-subscription-report.scss',
})
export class NetSubscriptionReport {
  lookups: any = {};
  rows: any[] = [];
  summary = { total_records: 0, total_amount: 0, total_balance: 0, total_count: 0 };
  filters = {
    network_type: '',
    collected_by_employee_id: '',
    renewed_by_employee_id: '',
    payment_mode: '',
    start_date: this.monthStart(),
    end_date: this.today(),
  };
  page = 1;
  pageSize = 25;
  pageSizes = [25, 50, 100];
  networkTypes = ['KRISHI', 'RAILWIRE', 'DMNET'];
  paymentTypes = ['DASHBOARD', 'ONLINE', 'CASH'];
  constructor(
    private api: InternetCustomerServices,
    private loader: NgxUiLoaderService,
    private snackbar: Snackbar,
    public permissions: PermissionService,
  ) {}
  ngOnInit() {
    this.api.getSubscriptionLookups().subscribe({
      next: (r) => {
        this.lookups = r || {};
        if (!this.permissions.isAdmin())
          this.filters.collected_by_employee_id = String(
            this.lookups.logged_in_employee_id || this.permissions.employeeId() || '',
          );
        this.load();
      },
      error: (e) => this.error(e),
    });
  }
  get employees() {
    return this.lookups.employees || [];
  }
  get pageCount() {
    return Math.max(Math.ceil(this.rows.length / this.pageSize), 1);
  }
  get pageRows() {
    return this.rows.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get pageTotal() {
    return this.pageRows.reduce((n, r) => n + Number(r.paid_amount || 0), 0);
  }
  get collectorLabel() {
    const e = this.employees.find(
      (x: any) => Number(x.employee_id) === Number(this.filters.collected_by_employee_id),
    );
    return e
      ? e.employee_name || this.permissions.username()
      : !this.permissions.isAdmin()
        ? this.permissions.username()
        : 'ALL';
  }
  get paymentTotals() {
    const totals: Record<string, number> = {};
    this.rows.forEach((r) => {
      const m = String(r.payment_mode || 'DASHBOARD').toUpperCase();
      totals[m] = (totals[m] || 0) + Number(r.paid_amount || 0);
    });
    return Object.entries(totals).map(([mode, amount]) => ({ mode, amount }));
  }
  load() {
    if (
      !this.filters.start_date ||
      !this.filters.end_date ||
      this.filters.end_date < this.filters.start_date
    )
      return this.fail('Select a valid date range');
    this.loader.start();
    this.api.getSubscriptionReport({ ...this.filters }).subscribe({
      next: (r) => {
        this.loader.stop();
        this.rows = r?.rows || [];
        this.summary = {
          total_records: Number(r?.total_records) || 0,
          total_amount: Number(r?.total_amount) || 0,
          total_balance: Number(r?.total_balance) || 0,
          total_count: Number(r?.total_count) || 0,
        };
        this.page = 1;
      },
      error: (e) => this.error(e),
    });
  }
  clear() {
    this.filters = {
      network_type: '',
      collected_by_employee_id: this.permissions.isAdmin()
        ? ''
        : String(this.lookups.logged_in_employee_id || this.permissions.employeeId() || ''),
      renewed_by_employee_id: '',
      payment_mode: '',
      start_date: this.monthStart(),
      end_date: this.today(),
    };
    this.load();
  }
  changePage(n: number) {
    this.page = Math.min(Math.max(n, 1), this.pageCount);
  }
  month(row: any) {
    return `${new Date(2000, Number(row.subscription_month) - 1, 1).toLocaleString('en-US', { month: 'long' })} ${row.subscription_year}`;
  }
  date(v: any) {
    if (!v) return '-';
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? String(v)
      : d.toLocaleDateString('en-GB').replaceAll('/', '-');
  }
  exportExcel() {
    const lines = [
      [
        'S.No',
        'Collected Date',
        'Collected By',
        'Renewed By',
        'Customer No',
        'Name',
        'Network',
        'Net ID',
        'Month',
        'Period',
        'Type',
        'Count',
        'Balance',
        'Amount',
      ],
      ...this.rows.map((r, i) => [
        i + 1,
        this.date(r.collect_date),
        r.collected_by_name || '-',
        r.renewed_by_name || '-',
        r.customer_code,
        r.full_name,
        r.network_type,
        r.net_id,
        this.month(r),
        r.number_of_days,
        r.payment_mode,
        r.period_count,
        r.balance_amount,
        r.paid_amount,
      ]),
    ];
    const csv = lines
      .map((x) => x.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv' }));
    a.download = `Net_Subscription_Report_${this.filters.start_date}_to_${this.filters.end_date}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  printReport() {
    const w = window.open('', '_blank', 'width=1200,height=800');
    if (!w) return this.fail('Allow pop-ups to print the report');
    const body = this.rows
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td>${this.date(r.collect_date)}</td><td>${r.collected_by_name || '-'}</td><td>${r.renewed_by_name || '-'}</td><td>${r.customer_code}</td><td>${r.full_name}</td><td>${r.network_type}</td><td>${this.month(r)}</td><td>${r.number_of_days}</td><td>${r.payment_mode}</td><td>${r.period_count}</td><td>${r.balance_amount}</td><td>${r.paid_amount}</td></tr>`,
      )
      .join('');
    w.document.write(
      `<html><head><title>Net Subscription Report</title><style>body{font-family:Arial;margin:22px}table{border-collapse:collapse;width:100%}th{background:#0878ee;color:white}th,td{border:1px solid #bbb;padding:7px}</style></head><body><h1>Net Subscription Report</h1><p>Collected By: ${this.collectorLabel} | Network: ${this.filters.network_type || 'ALL'} | Period: ${this.date(this.filters.start_date)} to ${this.date(this.filters.end_date)}</p><table><thead><tr><th>S.No</th><th>Date</th><th>Collected By</th><th>Renewed By</th><th>C No</th><th>Name</th><th>Network</th><th>Month</th><th>Period</th><th>Type</th><th>Count</th><th>Balance</th><th>Amount</th></tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>window.print();<\/script></body></html>`,
    );
    w.document.close();
  }
  private local(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  private today() {
    return this.local(new Date());
  }
  private monthStart() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }
  private fail(m: string) {
    this.snackbar.openSnackbar(m, globalConstants.errorRegex);
  }
  private error(e: any) {
    this.loader.stop();
    this.fail(e?.error?.message || 'Report request failed');
  }
}
