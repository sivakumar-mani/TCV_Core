import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InternetCustomerServices } from '../../services/internet-customer-services';
import { WorkflowServices } from '../../services/workflow-services';
import { CommonMethods } from '../../shared/common-methods';

@Component({
  selector: 'app-internet-customer-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './internet-customer-view.html',
  styleUrl: './internet-customer-view.scss',
})
export class InternetCustomerView {
  details: any = {};
  lookups: any = {};
  customerForm: any = {};
  historyForm: any = {};
  customerSearchNo = '';
  id = 0;
  activeTab = 'subscription';
  reviewTab = 'subscription';
  reviewMode = false;
  workflowId: string | null = null;
  approving = false;
  savingCustomer = false;
  savingHistory = false;
  showHistoryModal = false;
  showSubscriptionModal = false;
  showSubscriptionPeriodModal = false;
  editingSubscriptionId: number | null = null;
  editingPackageId: number | null = null;
  editingRouterId: number | null = null;
  readonly today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  readonly monthNames = [
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
  readonly years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 1 + i);
  readonly periodCounts = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly dayCounts = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly freePeriodCounts = Array.from({ length: 13 }, (_, i) => i);
  readonly freeDayCounts = Array.from({ length: 32 }, (_, i) => i);
  readonly tabs = [
    ['subscription', 'Subscription'],
    ['router', 'Router'],
    ['connection', 'Connection'],
    ['package', 'Package'],
  ];
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: InternetCustomerServices,
    private workflows: WorkflowServices,
    private common: CommonMethods,
  ) {
    this.id = Number(route.snapshot.paramMap.get('id'));
    this.reviewMode = route.snapshot.queryParamMap.get('review') === 'true';
    this.workflowId = route.snapshot.queryParamMap.get('workflowId');
    const requestedTab = route.snapshot.queryParamMap.get('tab');
    if (requestedTab && this.tabs.some(([tab]) => tab === requestedTab)) this.activeTab = this.reviewTab = requestedTab;
  }
  ngOnInit() {
    this.api.getLookups().subscribe({
      next: (r) => {
        this.lookups = r;
        this.load();
      },
      error: (e) => this.common.handleError(e),
    });
  }
  load() {
    this.api.getCustomer(this.id).subscribe({
      next: (r) => {
        const keys = [
          'amount',
          'balance_amount',
          'rate',
          'connection_charge',
          'connection_discount',
          'labour_service_charge',
          'package_price',
          'base_price',
          'total_price',
          'grand_total',
          'router_amount',
          'router_discount',
          'connection_amount',
          'labor_amount',
          'material_cost',
          'material_discount',
          'subscription_amount',
          'overall_discount',
          'customer_paid_amount',
          'office_received_amount',
          'office_balance_amount',
        ];
        const rounded = (value: any): any => {
          if (Array.isArray(value)) return value.map(rounded);
          if (value && typeof value === 'object')
            return Object.fromEntries(
              Object.entries(value).map(([key, item]) => [
                key,
                keys.includes(key) ? Math.round(Number(item) || 0) : rounded(item),
              ]),
            );
          return value;
        };
        this.details = rounded(r);
        this.customerSearchNo = this.customerNumber(r.customer);
        this.customerForm = {
          network_type: r.customer?.network_type,
          full_name: r.customer?.full_name,
          net_id: r.customer?.net_id,
          mobile_no: r.customer?.mobile_no,
          alternate_mobile_no: r.customer?.alternate_mobile_no || '',
          aadhaar_no: r.customer?.aadhaar_no || '',
          source_name: r.customer?.source_name,
          installed_by_employee_id: r.customer?.installed_by_employee_id,
        };
      },
      error: (e) => this.common.handleError(e),
    });
  }
  approve() {
    if (
      !this.workflowId ||
      this.approving ||
      !confirm(`Approve Internet customer ${this.customerNumber()}?`)
    )
      return;
    this.approving = true;
    this.workflows.approveWorkflow(this.workflowId).subscribe({
      next: (r) => {
        this.approving = false;
        this.common.handleTokenAndMessage(r);
        this.reviewMode = false;
        this.load();
        this.router.navigate(['/internet/customers/view', this.id], { replaceUrl: true });
      },
      error: (e) => {
        this.approving = false;
        this.common.handleError(e);
      },
    });
  }
  back() {
    this.router.navigateByUrl(this.reviewMode ? '/workflow-approval' : '/internet/customers');
  }
  canUpdate() {
    if (this.isLegacyCustomer()) return true;
    return (
      this.details.customer?.approval_status === 'APPROVED' &&
      this.details.account?.account_status === 'PAID'
    );
  }
  searchCustomerByNumber() {
    const value = this.customerSearchNo.trim();
    if (!value) return;
    this.api.getCustomers().subscribe({
      next: (rows) => {
        const match = (rows || []).find((x) => this.customerNumber(x) === value);
        if (!match)
          return this.common.handleError({
            error: { message: 'Internet customer number was not found' },
          });
        this.id = Number(match.internet_customer_id);
        this.router.navigate(['/internet/customers/view', this.id]).then(() => this.load());
      },
      error: (e) => this.common.handleError(e),
    });
  }
  editHistory() {
    if (this.canUpdate()) this.router.navigate(['/internet/customers/edit', this.id]);
  }
  openAdd() {
    if (!this.canUpdate()) return;
    this.editingPackageId = null;
    this.editingRouterId = null;
    const end = new Date(`${this.today}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 29);
    this.historyForm =
      this.activeTab === 'router'
        ? { router_type: this.latestRouter()?.router_type || 'NEW', update_reason: this.latestRouter()?.router_status === 'ACTIVE' ? 'FAULT' : 'REPLACED', usage_category: this.latestRouter()?.usage_category || 'CUSTOMER_PAID', product_id: this.latestRouter()?.router_status === 'ACTIVE' ? this.latestRouter()?.product_id : null, qty: Number(this.latestRouter()?.qty) || 1, returned_router: false, returned_adapter: false, returned_adapter_product_id: this.returnedAdapter()?.product_id || null, refund_amount: 0, refund_payment_mode: 'CASH', reason_remarks: '' }
        : this.activeTab === 'connection'
          ? {
              connection_date: this.today,
              connection_type: this.latestConnection()?.connection_status === 'DISCONNECTED' ? 'RECONNECTION' : 'DISCONNECT',
              connection_charge: 0,
              connection_discount: 0,
              labour_service_charge: 0,
              new_door_no: '', new_location_id: null, new_area_id: null, new_street_id: null,
              remarks: '',
            }
          : this.activeTab === 'package'
            ? {
                package_id: null,
                start_date: this.today,
                end_date: this.packageEndDate(this.today),
                customer_paid_amount: 0,
              }
            : {
                subscription_month: new Date().getMonth() + 1,
                subscription_year: new Date().getFullYear(),
                period_value: 1,
                period_unit: 'MONTH',
                period_count: 1,
                free_period_value: 0,
                free_period_unit: 'MONTH',
                start_date: this.today,
                end_date: this.today,
                amount: 0,
                paid_amount: 0,
                balance_amount: 0,
                payment_status: 'UNPAID',
                collect_date: this.today,
                collected_by_employee_id: this.lookups.logged_in_employee_id,
                renewed_by_value: `EMPLOYEE:${this.lookups.logged_in_employee_id || ''}`,
                payment_mode: 'DASHBOARD',
                cash_admin_locked: false,
                payment_reference: '',
                payment_mapped_employee_id: null,
                customer_paid_amount: 0,
              };
    if (this.activeTab === 'subscription') {
      this.editingSubscriptionId = null;
      this.calculateSubscription();
      this.showSubscriptionPeriodModal = true;
    } else this.showHistoryModal = true;
  }
  calculateSubscription(preserveEditedDates = false) {
    if (this.activeTab !== 'subscription') return;
    const f = this.historyForm,
      pkg = [...(this.details.packages || [])]
        .filter((x: any) => x.is_active)
        .sort(
          (a: any, b: any) =>
            Number(b.internet_customer_package_id) - Number(a.internet_customer_package_id),
        )[0],
      network = String(this.details.customer?.network_type || '').toUpperCase();
    let start: Date;
    const maximumEndDate = (this.details.subscriptions || []).reduce(
      (maximum: string, row: any) => {
        const parsed = new Date(row?.end_date);
        const value = Number.isNaN(parsed.getTime())
          ? ''
          : new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(value) && value > maximum ? value : maximum;
      },
      '',
    );
    if (this.editingSubscriptionId && f.start_date) {
      start = new Date(`${f.start_date}T00:00:00Z`);
    } else if (maximumEndDate) {
      start = new Date(`${maximumEndDate}T00:00:00Z`);
      start.setUTCDate(start.getUTCDate() + 1);
    } else
      start = new Date(
        Date.UTC(
          Number(f.subscription_year),
          Number(f.subscription_month) - 1,
          network === 'KRISHI' ? 16 : 1,
        ),
      );
    f.subscription_month = start.getUTCMonth() + 1;
    f.subscription_year = start.getUTCFullYear();
    const value = Math.max(Number(f.period_value) || 1, 1),
      daysInMonth = new Date(start.getUTCFullYear(), start.getUTCMonth() + 1, 0).getDate(),
      count =
        f.period_unit === 'YEAR'
          ? value * 12
          : f.period_unit === 'DAYS'
            ? value / daysInMonth
            : value,
      free = Math.max(Number(f.free_period_value) || 0, 0);
    let end = new Date(start);
    if (f.period_unit === 'DAYS') end.setUTCDate(end.getUTCDate() + value - 1);
    else if (network === 'KRISHI') {
      end.setUTCMonth(end.getUTCMonth() + count);
      end.setUTCDate(15);
    } else end.setUTCDate(end.getUTCDate() + count * 30 - 1);
    if (f.free_period_unit === 'DAYS') end.setUTCDate(end.getUTCDate() + free);
    else if (network === 'KRISHI')
      end.setUTCMonth(end.getUTCMonth() + free * (f.free_period_unit === 'YEAR' ? 12 : 1));
    else end.setUTCDate(end.getUTCDate() + free * (f.free_period_unit === 'YEAR' ? 360 : 30));
    const amount = Math.round((Number(pkg?.package_price) || 0) * count),
      paid = Math.max(Math.min(Math.round(Number(f.paid_amount) || 0), amount), 0),
      balance = Math.max(amount - paid, 0);
    Object.assign(f, {
      internet_customer_package_id: pkg?.internet_customer_package_id || null,
      period_count: Number(count.toFixed(4)),
      start_date: start.toISOString().slice(0, 10),
      end_date: preserveEditedDates && this.editingSubscriptionId && this.lookups.is_admin && /^\d{4}-\d{2}-\d{2}$/.test(String(f.end_date || '')) ? f.end_date : end.toISOString().slice(0, 10),
      amount,
      customer_paid_amount: paid,
      balance_amount: balance,
      payment_status: balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID',
    });
  }
  periodValueOptions(unit: string, free = false) {
    if (unit === 'DAYS') return free ? this.freeDayCounts : this.dayCounts;
    return free ? this.freePeriodCounts : this.periodCounts;
  }
  changePeriodUnit(free = false) {
    if (free) this.historyForm.free_period_value = 0;
    else this.historyForm.period_value = 1;
    this.calculateSubscription();
  }
  changeRenewedBy() {
    if (this.historyForm.cash_admin_locked) {
      this.historyForm.renewed_by_value = 'ADMIN';
      this.historyForm.payment_mode = 'CASH';
      return;
    }
    if (!this.lookups.is_admin || this.historyForm.renewed_by_value !== 'ADMIN') {
      this.historyForm.payment_mode = 'DASHBOARD';
      this.historyForm.payment_reference = '';
      this.historyForm.payment_mapped_employee_id = null;
    }
  }
  saveHistory() {
    if (this.savingHistory) return;
    if (this.activeTab === 'router' && !String(this.historyForm.reason_remarks || '').trim()) {
      this.common.handleError({error:{message:'Reason remarks are required'}});return;
    }
    if (this.activeTab === 'router' && this.editingRouterId) {
      this.savingHistory = true;
      this.api.updateRouter(this.id, this.editingRouterId, this.historyForm).subscribe({next:(r)=>{this.savingHistory=false;this.showHistoryModal=false;this.editingRouterId=null;this.common.handleTokenAndMessage(r);this.load();},error:(e)=>{this.savingHistory=false;this.common.handleError(e);}});return;
    }
    if (this.activeTab === 'subscription' && this.editingSubscriptionId) {
      this.savingHistory = true;
      this.api.updateSubscription(this.id, this.editingSubscriptionId, this.historyForm).subscribe({
        next: (r) => { this.savingHistory = false; this.showSubscriptionPeriodModal = false; this.editingSubscriptionId = null; this.common.handleTokenAndMessage(r); this.load(); },
        error: (e) => { this.savingHistory = false; this.common.handleError(e); }
      });
      return;
    }
    if (this.activeTab === 'package' && this.editingPackageId) {
      this.savingHistory = true;
      this.api.updatePackage(this.id, this.editingPackageId, this.historyForm).subscribe({
        next: (r) => { this.savingHistory = false; this.showHistoryModal = false; this.editingPackageId = null; this.common.handleTokenAndMessage(r); this.load(); },
        error: (e) => { this.savingHistory = false; this.common.handleError(e); }
      });
      return;
    }
    const section = this.activeTab === 'subscription' ? 'subscriptions' : `${this.activeTab}s`;
    this.savingHistory = true;
    this.api.addCustomerHistory(this.id, section, this.historyForm).subscribe({
      next: (r) => {
        this.savingHistory = false;
        this.showHistoryModal = false;
        this.showSubscriptionModal = false;
        this.showSubscriptionPeriodModal = false;
        this.common.handleTokenAndMessage(r);
        this.load();
      },
      error: (e) => {
        this.savingHistory = false;
        this.common.handleError(e);
      },
    });
  }
  editSubscription(row: any) {
    if (!this.canEditSubscription(row)) return;
    this.activeTab = 'subscription';
    this.editingSubscriptionId = Number(row.internet_subscription_id);
    const renewed = row.renewed_by === 'ADMIN' || row.renewed_by === 'CUSTOMER'
      ? row.renewed_by : `EMPLOYEE:${row.renewed_by_employee_id || this.lookups.logged_in_employee_id || ''}`;
    this.historyForm = {
      subscription_month: Number(row.subscription_month), subscription_year: Number(row.subscription_year),
      period_value: Number(row.period_value) || 1, period_unit: row.billing_basis || 'MONTH',
      period_count: Number(row.period_count) || 1, free_period_value: Number(row.free_period_value) || 0,
      free_period_unit: row.free_period_unit || 'MONTH', start_date: this.inputDate(row.start_date),
      end_date: this.inputDate(row.end_date), amount: Math.round(Number(row.amount) || 0), paid_amount: Math.round(Number(row.paid_amount) || 0),
      balance_amount: Math.round(Number(row.balance_amount) || 0), payment_status: row.payment_status || 'PENDING',
      collect_date: this.inputDate(row.collect_date) || this.today, collected_by_employee_id: this.lookups.is_admin ? row.collected_by_employee_id : this.lookups.logged_in_employee_id,
      renewed_by_value: Number(row.cash_admin_locked) === 1 ? 'ADMIN' : renewed, payment_mode: Number(row.cash_admin_locked) === 1 ? 'CASH' : (row.payment_mode || 'DASHBOARD'), payment_reference: row.payment_reference || '',
      cash_admin_locked: Number(row.cash_admin_locked) === 1,
      payment_mapped_employee_id: row.payment_mapped_employee_id
    };
    this.showSubscriptionPeriodModal = true;
  }
  canEditSubscription(row: any) {
    return Boolean(this.lookups.is_admin) || String(row?.payment_status || '').toUpperCase() !== 'PAID';
  }
  showSubscriptionActions() {
    return Boolean(this.lookups.is_admin) || (this.details.subscriptions || []).some((row: any) => this.canEditSubscription(row));
  }
  subscriptionStatusLabel(row: any) {
    const status = String(row?.payment_status || 'PENDING').toUpperCase();
    return status === 'PAID' ? 'Paid' : status === 'PARTIAL' ? 'Partial' : 'Unpaid';
  }
  deleteSubscription(row: any) {
    if (!this.lookups.is_admin || !window.confirm('Delete this Internet subscription entry?')) return;
    this.api.deleteSubscription(this.id, Number(row.internet_subscription_id)).subscribe({
      next: (r) => { this.common.handleTokenAndMessage(r); this.load(); }, error: (e) => this.common.handleError(e)
    });
  }
  packageStartChanged() { this.historyForm.end_date = this.packageEndDate(this.historyForm.start_date); }
  latestRouter() { return (this.details.routers || []).find((row: any) => row.approval_status !== 'REJECTED'); }
  routerReasons() { return this.editingRouterId ? ['FAULT','DAMAGED','UPGRADE','RETURNED','REPLACED'] : !this.latestRouter() ? ['REPLACED'] : this.latestRouter()?.router_status === 'ACTIVE' ? ['FAULT','DAMAGED','UPGRADE','RETURNED'] : ['REPLACED']; }
  routerReasonChanged() {
    const statusUpdate = ['FAULT', 'DAMAGED', 'UPGRADE', 'RETURNED'].includes(this.historyForm.update_reason);
    this.historyForm.router_type = this.historyForm.update_reason === 'RETURNED' ? 'RETURNED' : 'NEW';
    this.historyForm.product_id = statusUpdate ? this.latestRouter()?.product_id : null;
    this.historyForm.qty = 1;
  }
  routerOptions() {
    if (!['FAULT','DAMAGED','UPGRADE','RETURNED'].includes(this.historyForm.update_reason)) return this.lookups.routers || [];
    const seen = new Set<number>();
    return (this.details.routers || []).filter((row: any) => Number(row.product_id) === Number(this.latestRouter()?.product_id) && !seen.has(Number(row.product_id)) && !!seen.add(Number(row.product_id)));
  }
  returnedAdapter() {
    return (this.lookups.products || []).find((row: any) => /adapt(?:or|er).*12v.*1amp/i.test(String(row.product_name || '').replace(/\s+/g, '')));
  }
  routerTypeChanged() {
    this.historyForm.product_id = null; this.historyForm.qty = 1;
    if (this.historyForm.router_type !== 'RETURNED') { this.historyForm.returned_router = false; this.historyForm.returned_adapter = false; this.historyForm.refund_amount = 0; }
    this.historyForm.returned_adapter_product_id = this.returnedAdapter()?.product_id || null;
  }
  selectedRouterRate() {
    const row = this.routerOptions().find((x: any) => Number(x.product_id) === Number(this.historyForm.product_id));
    return Math.round(Number(row?.selling_price ?? row?.rate) || 0);
  }
  selectedRouter() { return this.routerOptions().find((x:any)=>Number(x.product_id)===Number(this.historyForm.product_id)) || {}; }
  routerDiscount() { const gross = this.selectedRouterRate() * (Number(this.historyForm.qty) || 0); return this.historyForm.usage_category === 'FREE_USE' ? gross : 0; }
  routerAmount() { return Math.max(this.selectedRouterRate() * (Number(this.historyForm.qty) || 0) - this.routerDiscount(), 0); }
  routerStatusForReason() { return ['INSTALL','REPLACED'].includes(this.historyForm.update_reason) ? 'ACTIVE' : ['DISCONNECT','UPGRADE'].includes(this.historyForm.update_reason) ? 'DISCONNECTED' : this.historyForm.update_reason; }
  routerPaymentStatus(row: any) { return ['FAULT','DISCONNECT','UPGRADE'].includes(String(row?.update_reason || '').toUpperCase()) ? 'NA' : (this.details.account?.account_status || 'PENDING'); }
  latestConnection(){return (this.details.connections||[]).find((x:any)=>x.approval_status!=='REJECTED');}
  connectionTypes(){return this.latestConnection()?.connection_status==='DISCONNECTED'?['RECONNECTION']:['DISCONNECT','LOCATION_CHANGE'];}
  connectionTypeChanged(){if(this.historyForm.connection_type==='DISCONNECT')Object.assign(this.historyForm,{connection_charge:0,connection_discount:0,labour_service_charge:0});}
  connectionPaymentStatus(row:any){const total=Number(row?.connection_charge||0)+Number(row?.labour_service_charge||0)-Number(row?.connection_discount||0);return row?.connection_type==='DISCONNECT'||total<=0?'NA':String(this.details.account?.account_status||'PENDING').toUpperCase();}
  connectionStatus(row:any){return row?.approval_status==='PENDING'?'Waiting Approval':(row?.connection_status||'ACTIVE');}
  locationAreas(){return (this.lookups.areas||[]).filter((x:any)=>Number(x.location_id)===Number(this.historyForm.new_location_id));}
  locationStreets(){return (this.lookups.streets||[]).filter((x:any)=>Number(x.area_id)===Number(this.historyForm.new_area_id));}
  newLocationChanged(){this.historyForm.new_area_id=null;this.historyForm.new_street_id=null;}
  newAreaChanged(){this.historyForm.new_street_id=null;}
  editRouter(row: any) { if(!this.lookups.is_admin)return;this.activeTab='router';this.editingRouterId=Number(row.internet_router_id);this.historyForm={...row,reason_remarks:row.reason_remarks||row.remarks||'',update_reason:row.update_reason||'INSTALL'};this.showHistoryModal=true; }
  deleteRouter(row: any) { if(!this.lookups.is_admin||!window.confirm('Delete this Internet router history entry?'))return;this.api.deleteRouter(this.id,Number(row.internet_router_id)).subscribe({next:(r)=>{this.common.handleTokenAndMessage(r);this.load();},error:(e)=>this.common.handleError(e)}); }
  selectedPackagePrice() {
    const pkg = (this.lookups.packages || []).find((x: any) => Number(x.package_id) === Number(this.historyForm.package_id));
    return Math.round(Number(pkg?.total_price ?? pkg?.price_including_gst ?? pkg?.price) || 0);
  }
  packageUpdatedBy() {
    const employee = (this.lookups.employees || []).find((x: any) => Number(x.employee_id) === Number(this.lookups.logged_in_employee_id));
    return employee?.employee_name || '-';
  }
  isPackageUnavailable(packageId: any) {
    return (this.details.packages || []).some((row: any) =>
      Number(row.package_id) === Number(packageId) &&
      Number(row.internet_customer_package_id) !== Number(this.editingPackageId) &&
      row.approval_status !== 'REJECTED' && (Number(row.is_active) === 1 || row.approval_status === 'PENDING')
    );
  }
  editPackage(row: any) {
    if (!this.lookups.is_admin) return;
    this.activeTab = 'package'; this.editingPackageId = Number(row.internet_customer_package_id);
    this.historyForm = { package_id: Number(row.package_id), start_date: this.inputDate(row.start_date), end_date: this.inputDate(row.end_date), customer_paid_amount: 0 };
    this.showHistoryModal = true;
  }
  deletePackage(row: any) {
    if (!this.lookups.is_admin || !window.confirm('Remove this Internet package detail?')) return;
    this.api.deletePackage(this.id, Number(row.internet_customer_package_id)).subscribe({ next: (r) => { this.common.handleTokenAndMessage(r); this.load(); }, error: (e) => this.common.handleError(e) });
  }
  private packageEndDate(value: any) {
    const start = new Date(`${value || this.today}T00:00:00Z`); if (Number.isNaN(start.getTime())) return '';
    start.setUTCFullYear(start.getUTCFullYear() + 1); return start.toISOString().slice(0, 10);
  }
  private inputDate(value: any) {
    if (!value) return '';
    const text = String(value); if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  saveCustomerInformation() {
    if (!this.lookups.is_admin || this.savingCustomer) return;
    this.savingCustomer = true;
    this.api.updateCustomerInformation(this.id, this.customerForm).subscribe({
      next: (r) => {
        this.savingCustomer = false;
        this.common.handleTokenAndMessage(r);
        this.load();
      },
      error: (e) => {
        this.savingCustomer = false;
        this.common.handleError(e);
      },
    });
  }
  address() {
    const c = this.details.customer || {};
    return [c.door_no, c.street_name, c.area_name, c.location_name, c.city, c.pincode]
      .filter(Boolean)
      .join(', ');
  }
  isLegacyCustomer(customer = this.details.customer) {
    return Boolean(String(customer?.legacy_customer_no || '').trim());
  }
  customerNumber(customer = this.details.customer) {
    return String(customer?.legacy_customer_no || customer?.customer_code || '');
  }
  headerStatus() {
    const customer = this.details.customer || {},
      account = this.details.account || {};
    if (this.isLegacyCustomer(customer))
      return String(customer.status || '').toUpperCase() === 'ACTIVE' ? 'Active' : 'Disconnected';
    if (customer.approval_status === 'REJECTED' || account.approval_status === 'REJECTED')
      return 'Rejected';
    if (customer.approval_status !== 'APPROVED' || account.approval_status !== 'APPROVED')
      return 'Waiting Approval';
    return account.account_status === 'PAID' ? 'Active' : 'Pending Payment';
  }
  monthName(value: any) {
    return new Date(2000, Math.max(Number(value) - 1, 0), 1).toLocaleString('en', {
      month: 'long',
    });
  }
}
