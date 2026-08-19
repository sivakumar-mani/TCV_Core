import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';
@Component({
  selector: 'app-stb-payment-report',
  imports: [CommonModule, FormsModule],
  templateUrl: './stb-payment-report.html',
  styleUrl: '../cable-tv-subscription-report/cable-tv-subscription-report.scss',
})
export class StbPaymentReport {
  lookups: any = {};
  rows: any[] = [];
  summary = { total_records: 0, total_amount: 0, total_balance: 0 };
  filters = {
    network_id: '',
    collected_by_employee_id: '',
    start_date: this.monthStart(),
    end_date: this.today(),
  };
  constructor(
    private api: CableTvServices,
    private snack: Snackbar,
  ) {}
  ngOnInit() {
    this.api
      .getLookups()
      .subscribe({ next: (r) => (this.lookups = r || {}), error: (e) => this.fail(e) });
  }
  get networks() {
    return this.lookups.networks || [];
  }
  get employees() {
    return this.lookups.employees || [];
  }
  get networkLabel() {
    const n = this.networks.find(
      (x: any) => Number(x.network_id) === Number(this.filters.network_id),
    );
    return n?.network_code || n?.network_name || 'ALL';
  }
  get collectorLabel() {
    const e = this.employees.find(
      (x: any) => Number(x.employee_id) === Number(this.filters.collected_by_employee_id),
    );
    return e?.employee_name || 'ALL';
  }
  load() {
    if (!this.filters.start_date || !this.filters.end_date)
      return this.error('Collection Start Date and Collection End Date are required');
    if (this.filters.end_date < this.filters.start_date)
      return this.error('Collection End Date cannot be before Collection Start Date');
    this.api.getStbPaymentReport(this.filters).subscribe({
      next: (r) => {
        this.rows = r.rows || [];
        this.summary = {
          total_records: +r.total_records || 0,
          total_amount: +r.total_amount || 0,
          total_balance: +r.total_balance || 0,
        };
      },
      error: (e) => this.fail(e),
    });
  }
  clear() {
    this.filters = {
      network_id: '',
      collected_by_employee_id: '',
      start_date: this.monthStart(),
      end_date: this.today(),
    };
    this.rows = [];
    this.summary = { total_records: 0, total_amount: 0, total_balance: 0 };
  }
  date(v: any) {
    return v ? new Date(v).toLocaleDateString('en-GB').replaceAll('/', '-') : '-';
  }
  payment(r: any) {
    return `${r.payment_mode}: ${r.received_by_name || '-'}`;
  }
  print() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<h2>TIME CABLE VISION, Collector: ${this.collectorLabel}, Period: ${this.date(this.filters.start_date)} To ${this.date(this.filters.end_date)}</h2>${document.querySelector('.report-table')?.outerHTML || ''}<script>onload=()=>print()<\/script>`,
    );
    w.document.close();
  }
  excel() {
    const data = [
      [
        'C No',
        'Collected Date',
        'Cust No',
        'Name',
        'Month',
        'Payment Details',
        'STB Number',
        'Package',
        'Balance',
        'Amount',
      ],
      ...this.rows.map((r, i) => [
        i + 1,
        this.date(r.collect_date),
        r.customer_code,
        r.full_name,
        r.payment_month,
        this.payment(r),
        r.stb_no,
        r.package_amount,
        r.balance_amount,
        r.received_amount,
      ]),
    ];
    const csv = data
        .map((x) => x.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\r\n'),
      a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv' }));
    a.download = `STB_Payment_Report_${this.filters.start_date}_to_${this.filters.end_date}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
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
  private error(m: string) {
    this.snack.openSnackbar(m, globalConstants.errorRegex);
  }
  private fail(e: any) {
    this.error(e?.error?.message || 'STB payment report request failed');
  }
}
