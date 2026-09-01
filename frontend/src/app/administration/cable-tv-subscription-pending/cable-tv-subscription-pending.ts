import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { PermissionService } from '../../services/permission.service';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-cable-tv-subscription-pending',
  imports: [CommonModule, FormsModule],
  templateUrl: './cable-tv-subscription-pending.html',
  styleUrl: './cable-tv-subscription-pending.scss'
})
export class CableTvSubscriptionPending {
  customers: any[] = [];
  totalCustomers = 0;
  lookups: any = {};
  filters = { customer_no: '', old_customer_no: '', customer_name: '', area_id: '', street_id: '' };
  selectedCustomer: any = null;
  selectedSubscription: any = null;
  showPaymentModal = false;
  saving = false;
  readonly paymentModes = ['CASH', 'ONLINE', 'OFFICE'];
  readonly billingBasisOptions = ['MONTH', 'YEAR', 'DAY'];
  readonly periodCountOptions = Array.from({ length: 12 }, (_value, index) => index + 1);
  readonly months = Array.from({ length: 12 }, (_value, index) => ({
    value: index + 1,
    label: new Date(2026, index, 1).toLocaleString('en-US', { month: 'long' })
  }));
  readonly yearOptions = Array.from({ length: 9 }, (_value, index) => new Date().getFullYear() - 2 + index);
  paymentForm = {
    subscription_month: 1,
    subscription_year: new Date().getFullYear(),
    number_of_days_or_months: 1,
    billing_basis: 'MONTH',
    received_count: 1,
    start_date: '',
    expiry_date: '',
    amount: 0,
    paid_amount: 0,
    balance_amount: 0,
    payment_status: 'PENDING',
    collected_date: '',
    payment_mode: 'CASH',
    payment_reference: '',
    received_by_employee_id: null as number | null,
    comments: ''
  };

  constructor(
    private cableTvService: CableTvServices,
    private loader: NgxUiLoaderService,
    private snackbar: Snackbar,
    public permissions: PermissionService
  ) {}

  ngOnInit() {
    this.loadLookups();
    this.loadPendingSubscriptions();
  }

  get areas() { return this.lookups.areas || []; }
  get employees() { return this.lookups.employees || []; }
  get streets() {
    const areaId = Number(this.filters.area_id);
    return (this.lookups.streets || []).filter((item: any) => !areaId || Number(item.area_id) === areaId);
  }
  get calculatedSubscriptionAmount() { return Math.round(Number(this.paymentForm.amount) || 0); }
  get currentBalance() {
    const alreadyPaid = Math.round(Number(this.selectedSubscription?.paid_amount) || 0);
    return Math.max(Math.round(this.calculatedSubscriptionAmount - alreadyPaid), 0);
  }
  get remainingBalance() { return Math.max(Math.round(Number(this.paymentForm.balance_amount) || 0), 0); }
  get calculatedStatus() {
    return String(this.paymentForm.payment_status || 'PENDING').toUpperCase();
  }
  get subscriptionMonthStart() {
    return `${this.paymentForm.subscription_year}-${String(this.paymentForm.subscription_month).padStart(2, '0')}-01`;
  }
  get subscriptionMonthEnd() {
    return this.monthLastDate(this.paymentForm.subscription_month, this.paymentForm.subscription_year);
  }
  get loggedInEmployee() {
    const employeeId = this.permissions.employeeId();
    const identity = String(this.permissions.employeeCode() || this.permissions.username() || '').trim().toLowerCase();
    return this.employees.find((item: any) =>
      (employeeId && Number(item.employee_id) === Number(employeeId))
      || String(item.employee_code || '').trim().toLowerCase() === identity
      || String(item.employee_name || '').trim().toLowerCase() === identity
    );
  }
  get receiverName() {
    const employee = this.employees.find((item: any) =>
      Number(item.employee_id) === Number(this.paymentForm.received_by_employee_id)
    );
    return employee?.employee_name || this.permissions.username() || '-';
  }

  loadLookups() {
    this.cableTvService.getLookups().subscribe({
      next: (response: any) => {
        this.lookups = response || {};
        if (!this.paymentForm.received_by_employee_id) {
          this.paymentForm.received_by_employee_id = this.loggedInEmployee?.employee_id || this.permissions.employeeId();
        }
      },
      error: (error: any) => this.handleError(error)
    });
  }

  loadPendingSubscriptions() {
    this.loader.start();
    this.cableTvService.getPendingSubscriptions(this.filters).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.customers = response?.customers || [];
        this.totalCustomers = Number(response?.total_customers) || 0;
      },
      error: (error: any) => this.handleError(error)
    });
  }

  areaChanged() {
    this.filters.street_id = '';
  }

  resetFilters() {
    this.filters = { customer_no: '', old_customer_no: '', customer_name: '', area_id: '', street_id: '' };
    this.loadPendingSubscriptions();
  }

  openPayment(customer: any, subscription: any) {
    this.selectedCustomer = customer;
    this.selectedSubscription = subscription;
    this.paymentForm = {
      subscription_month: Number(subscription.subscription_month) || 1,
      subscription_year: Number(subscription.subscription_year) || new Date().getFullYear(),
      number_of_days_or_months: 1,
      billing_basis: 'MONTH',
      received_count: 1,
      start_date: `${subscription.subscription_year}-${String(subscription.subscription_month).padStart(2, '0')}-01`,
      expiry_date: this.monthLastDate(Number(subscription.subscription_month), Number(subscription.subscription_year)),
      amount: Math.round(Number(subscription.amount) || 0),
      paid_amount: Math.round(Number(subscription.paid_amount) || 0),
      balance_amount: Math.round(Number(subscription.balance_amount) || 0),
      payment_status: String(subscription.payment_status || 'PENDING').toUpperCase(),
      collected_date: this.today(),
      payment_mode: 'CASH',
      payment_reference: '',
      received_by_employee_id: this.loggedInEmployee?.employee_id || this.permissions.employeeId(),
      comments: ''
    };
    this.calculateSubscription();
    this.showPaymentModal = true;
  }

  closePayment() {
    if (this.saving) return;
    this.showPaymentModal = false;
    this.selectedCustomer = null;
    this.selectedSubscription = null;
  }

  savePayment() {
    if (!this.selectedSubscription || this.saving) return;
    if (!this.permissions.isAdmin()) {
      this.paymentForm.collected_date = this.today();
      this.paymentForm.payment_mode = 'CASH';
    }
    this.calculateSubscription();
    const originalPaid = Math.round(Number(this.selectedSubscription.paid_amount) || 0);
    const totalPaid = Math.round(Number(this.paymentForm.paid_amount) || 0);
    const amount = totalPaid - originalPaid;
    if (!this.paymentForm.start_date) return this.showError('Start Date is required');
    if ((Number(this.paymentForm.number_of_days_or_months) || 0) <= 0) return this.showError('No. of Period is required');
    if (amount <= 0) return this.showError('Enter a received amount greater than zero');
    if (totalPaid > this.calculatedSubscriptionAmount) return this.showError(`Paid Amount cannot exceed ${this.calculatedSubscriptionAmount}`);
    if (!this.paymentForm.collected_date) return this.showError('Collected Date is required');
    if (this.permissions.isAdmin() && !this.paymentForm.received_by_employee_id) return this.showError('Receiver Name is required');
    const payload = { ...this.paymentForm, received_amount: amount };
    this.saving = true;
    this.loader.start();
    this.cableTvService.receiveSubscriptionPayment(this.selectedSubscription.subscription_id, payload).subscribe({
      next: (response: any) => {
        this.saving = false;
        this.loader.stop();
        this.snackbar.openSnackbar(response?.message || 'Subscription payment saved successfully', '');
        this.closePayment();
        this.loadPendingSubscriptions();
      },
      error: (error: any) => {
        this.saving = false;
        this.handleError(error);
      }
    });
  }

  monthLabel(month: any, year: any) {
    const name = new Date(2000, Number(month) - 1, 1).toLocaleString('en-US', { month: 'short' });
    return `${name}${year}`;
  }

  get selectedAreaName() {
    return this.areas.find((item: any) => Number(item.area_id) === Number(this.filters.area_id))?.area_name || '';
  }

  get selectedStreetName() {
    return (this.lookups.streets || []).find((item: any) => Number(item.street_id) === Number(this.filters.street_id))?.street_name || '';
  }

  address(customer: any) {
    return [customer.door_no, customer.street_name, customer.area_name, customer.city, customer.pincode]
      .filter(Boolean).join(', ') || '-';
  }

  calculateSubscription() {
    if (!this.selectedSubscription) return;
    const basis = String(this.paymentForm.billing_basis || 'MONTH').toUpperCase();
    const month = Number(this.paymentForm.subscription_month) || Number(this.today().slice(5, 7));
    const year = Number(this.paymentForm.subscription_year) || Number(this.today().slice(0, 4));
    const monthFirstDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthLastDate = this.monthLastDate(month, year);
    const rawPeriodCount = basis === 'DAY'
      ? Math.max(Math.round(Number(this.paymentForm.number_of_days_or_months) || 1), 1)
      : Math.min(Math.max(Math.round(Number(this.paymentForm.number_of_days_or_months) || 1), 1), 12);
    const startDate = basis === 'DAY' ? (this.paymentForm.start_date || monthFirstDate) : monthFirstDate;
    let dayEndDate = basis === 'DAY' ? (this.paymentForm.expiry_date || monthLastDate) : monthLastDate;
    if (basis === 'DAY' && new Date(`${dayEndDate}T00:00:00`) < new Date(`${startDate}T00:00:00`)) {
      dayEndDate = startDate;
    }
    const dayCount = basis === 'DAY' ? this.inclusiveDayCount(startDate, dayEndDate) : rawPeriodCount;
    const periodCount = basis === 'DAY' ? dayCount : rawPeriodCount;
    const monthDays = new Date(year, month, 0).getDate();
    const receivedCount = basis === 'YEAR'
      ? rawPeriodCount * 12
      : basis === 'MONTH' ? rawPeriodCount : Number((dayCount / monthDays).toFixed(2));
    const packageAmount = Math.round(Number(this.selectedCustomer?.package_amount || this.selectedSubscription.amount) || 0);
    const amount = basis === 'DAY'
      ? Math.round((packageAmount / monthDays) * periodCount)
      : Math.round(packageAmount * receivedCount);
    const paidAmount = Math.max(Math.round(Number(this.paymentForm.paid_amount) || 0), 0);
    const balance = Math.max(Math.round(amount - paidAmount), 0);
    this.paymentForm = {
      ...this.paymentForm,
      subscription_month: month,
      subscription_year: year,
      start_date: startDate,
      expiry_date: basis === 'DAY' ? dayEndDate : this.subscriptionEndDate(monthFirstDate, basis, periodCount),
      number_of_days_or_months: periodCount,
      received_count: receivedCount,
      amount,
      paid_amount: paidAmount,
      balance_amount: balance,
      payment_status: balance === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'PENDING')
    };
  }

  billingBasisChanged() {
    if (this.paymentForm.billing_basis === 'DAY') {
      this.paymentForm.start_date = this.subscriptionMonthStart;
      this.paymentForm.expiry_date = this.subscriptionMonthEnd;
    } else {
      this.paymentForm.number_of_days_or_months = 1;
    }
    this.calculateSubscription();
  }

  private monthLastDate(month: number, year: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  }

  private inclusiveDayCount(startDate: string, endDate: string) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
    return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  }

  private subscriptionEndDate(startDate: string, basis: string, periodCount: number) {
    const end = new Date(`${startDate}T00:00:00`);
    end.setMonth(end.getMonth() + (basis === 'YEAR' ? periodCount * 12 : periodCount));
    end.setDate(end.getDate() - 1);
    return this.localDate(end);
  }

  private dateInput(value: any) {
    if (!value) return '';
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? text.slice(0, 10) : this.localDate(date);
  }

  private localDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private today() { return this.localDate(new Date()); }
  private showError(message: string) { this.snackbar.openSnackbar(message, globalConstants.errorRegex); }
  private handleError(error: any) {
    this.loader.stop();
    this.showError(error?.error?.message || error?.message || 'Request failed');
  }
}
