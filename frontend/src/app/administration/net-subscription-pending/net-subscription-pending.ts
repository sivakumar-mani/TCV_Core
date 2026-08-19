import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { InternetCustomerServices } from '../../services/internet-customer-services';
import { PermissionService } from '../../services/permission.service';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-net-subscription-pending',
  imports: [CommonModule, FormsModule],
  templateUrl: './net-subscription-pending.html',
  styleUrl: './net-subscription-pending.scss',
})
export class NetSubscriptionPending {
  customers: any[] = [];
  lookups: any = {};
  filters = { customer_no: '', customer_name: '', area_id: '', street_id: '' };
  selected: any = null;
  customer: any = null;
  saving = false;
  form: any = {};
  monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  periodCounts = Array.from({ length: 12 }, (_, i) => i + 1);
  dayCounts = Array.from({ length: 31 }, (_, i) => i + 1);
  freePeriodCounts = Array.from({ length: 13 }, (_, i) => i);
  freeDayCounts = Array.from({ length: 32 }, (_, i) => i);
  constructor(
    private service: InternetCustomerServices,
    private loader: NgxUiLoaderService,
    private snackbar: Snackbar,
    public permissions: PermissionService,
  ) {}
  ngOnInit() {
    this.service
      .getSubscriptionLookups()
      .subscribe({ next: (r) => (this.lookups = r || {}), error: (e) => this.error(e) });
    this.load();
  }
  get areas() {
    return this.lookups.areas || [];
  }
  get employees() {
    return this.lookups.employees || [];
  }
  get streets() {
    return (this.lookups.streets || []).filter(
      (x: any) => !this.filters.area_id || Number(x.area_id) === Number(this.filters.area_id),
    );
  }
  load() {
    this.loader.start();
    this.service.getPendingSubscriptions(this.filters).subscribe({
      next: (r) => {
        this.loader.stop();
        this.customers = r?.customers || [];
      },
      error: (e) => this.error(e),
    });
  }
  reset() {
    this.filters = { customer_no: '', customer_name: '', area_id: '', street_id: '' };
    this.load();
  }
  open(c: any, s: any) {
    this.customer = c;
    const employee = this.lookups.logged_in_employee_id || this.permissions.employeeId();
    const admin = this.permissions.isAdmin();
    const cashAdminLocked = Number(s.cash_admin_locked) === 1;
    const storedRenewedBy = ['ADMIN', 'CUSTOMER'].includes(String(s.renewed_by || '').toUpperCase())
      ? String(s.renewed_by).toUpperCase()
      : `EMPLOYEE:${s.renewed_by_employee_id || employee || ''}`;
    this.form = {
      subscription_month: Number(s.subscription_month) || new Date().getMonth() + 1,
      subscription_year: Number(s.subscription_year) || new Date().getFullYear(),
      period_value: Number(s.period_value) || 1,
      period_unit: s.billing_basis || 'MONTH',
      period_count: Number(s.period_count) || 1,
      free_period_value: Number(s.free_period_value) || 0,
      free_period_unit: s.free_period_unit || 'MONTH',
      start_date: this.inputDate(s.start_date),
      end_date: this.inputDate(s.end_date),
      amount: Math.round(Number(s.amount) || 0),
      paid_amount: Math.round(Number(s.paid_amount) || 0),
      balance_amount: Math.round(Number(s.balance_amount) || 0),
      payment_status: s.payment_status || 'PENDING',
      collect_date: this.today(),
      collected_by_employee_id: employee,
      renewed_by_value: cashAdminLocked ? 'ADMIN' : storedRenewedBy,
      payment_mode: cashAdminLocked ? 'CASH' : (s.payment_mode || 'DASHBOARD'),
      cash_admin_locked: cashAdminLocked,
      payment_reference: '',
      payment_mapped_employee_id: null,
    };
    this.selected = s;
  }
  close() {
    if (!this.saving) {
      this.customer = null;
      this.selected = null;
    }
  }
  paidChanged() {
    const paid = Math.max(
      Math.min(Number(this.form.paid_amount) || 0, Number(this.form.amount) || 0),
      0,
    );
    this.form.paid_amount = paid;
    this.form.balance_amount = Math.max(Number(this.form.amount) - paid, 0);
    this.form.payment_status =
      this.form.balance_amount === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
  }
  monthYear(s: any) {
    return `${this.monthNames[Math.max(Number(s.subscription_month) - 1, 0)] || '-'} - ${s.subscription_year || '-'}`;
  }
  periodOptions(unit: string, free = false) {
    return unit === 'DAYS'
      ? free
        ? this.freeDayCounts
        : this.dayCounts
      : free
        ? this.freePeriodCounts
        : this.periodCounts;
  }
  unitChanged(free = false) {
    if (free) this.form.free_period_value = 0;
    else this.form.period_value = 1;
    this.calculate();
  }
  calculate() {
    if (!this.selected) return;
    const f = this.form,
      network = String(this.customer?.network_type || '').toUpperCase(),
      value = Math.max(Number(f.period_value) || 1, 1),
      free = Math.max(Number(f.free_period_value) || 0, 0);
    const start = new Date(
      Date.UTC(
        Number(f.subscription_year),
        Number(f.subscription_month) - 1,
        network === 'KRISHI' ? 16 : 1,
      ),
    );
    const daysInMonth = new Date(start.getUTCFullYear(), start.getUTCMonth() + 1, 0).getDate(),
      count =
        f.period_unit === 'YEAR'
          ? value * 12
          : f.period_unit === 'DAYS'
            ? value / daysInMonth
            : value;
    const end = new Date(start);
    if (f.period_unit === 'DAYS') end.setUTCDate(end.getUTCDate() + value - 1);
    else if (network === 'KRISHI') {
      end.setUTCMonth(end.getUTCMonth() + count);
      end.setUTCDate(15);
    } else end.setUTCDate(end.getUTCDate() + count * 30 - 1);
    if (f.free_period_unit === 'DAYS') end.setUTCDate(end.getUTCDate() + free);
    else if (network === 'KRISHI')
      end.setUTCMonth(end.getUTCMonth() + free * (f.free_period_unit === 'YEAR' ? 12 : 1));
    else end.setUTCDate(end.getUTCDate() + free * (f.free_period_unit === 'YEAR' ? 360 : 30));
    f.period_count = Number(count.toFixed(4));
    f.start_date = start.toISOString().slice(0, 10);
    f.end_date = end.toISOString().slice(0, 10);
    f.amount = Math.round(
      (Number(this.customer?.package_price) || Number(this.selected.amount) || 0) * count,
    );
    this.paidChanged();
  }
  renewedChanged() {
    if (!this.permissions.isAdmin() && this.form.cash_admin_locked) {
      this.form.renewed_by_value = 'ADMIN';
      this.form.payment_mode = 'CASH';
      this.form.payment_reference = '';
      this.form.payment_mapped_employee_id = null;
    } else if (this.form.renewed_by_value !== 'ADMIN') {
      this.form.payment_mode = 'DASHBOARD';
      this.form.payment_reference = '';
      this.form.payment_mapped_employee_id = null;
    }
  }
  save() {
    this.calculate();
    const received =
      (Number(this.form.paid_amount) || 0) - (Number(this.selected?.paid_amount) || 0);
    if (
      !this.selected ||
      received <= 0 ||
      received > Number(this.form.amount) - Number(this.selected.paid_amount || 0)
    )
      return this.snackbar.openSnackbar(
        'Paid Amount must be greater than the already paid amount and within the subscription total',
        globalConstants.errorRegex,
      );
    this.saving = true;
    this.loader.start();
    this.service
      .receiveSubscriptionPayment(this.selected.internet_subscription_id, {
        ...this.form,
        received_amount: received,
      })
      .subscribe({
        next: (r) => {
          this.saving = false;
          this.loader.stop();
          this.snackbar.openSnackbar(r?.message || 'Subscription updated successfully', '');
          this.close();
          this.load();
        },
        error: (e) => {
          this.saving = false;
          this.error(e);
        },
      });
  }
  address(c: any) {
    return (
      [c.door_no, c.street_name, c.area_name, c.city, c.pincode].filter(Boolean).join(', ') || '-'
    );
  }
  period(s: any) {
    return `${this.date(s.start_date)} to ${this.date(s.end_date)}`;
  }
  date(v: any) {
    if (!v) return '-';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toLocaleDateString('en-GB');
  }
  private inputDate(v: any) {
    if (!v) return '';
    const t = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? ''
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  private today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  private error(e: any) {
    this.loader.stop();
    this.snackbar.openSnackbar(e?.error?.message || 'Request failed', globalConstants.errorRegex);
  }
}
