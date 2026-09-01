import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';
import { PermissionService } from '../../services/permission.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-cable-tv-account-pending',
  imports: [CommonModule, FormsModule],
  templateUrl: './cable-tv-account-pending.html',
  styleUrl: './cable-tv-account-pending.scss'
})
export class CableTvAccountPending {
  accounts: any[] = [];
  nameFilter = '';
  statusFilter = 'PENDING';
  installedByFilter = '';
  startDate = '';
  endDate = '';
  employees: any[] = [];
  showPaymentModal = false;
  showReportPreview = false;
  selectedAccount: any = null;
  paymentHistory: any[] = [];
  selectedReportAccounts: any[] = [];
  paymentBaseBalance = 0;
  receivedAmountValue = 0;
  paymentBalanceValue = 0;
  paymentStatusValue = 'PENDING';
  accountSummary = { pendingCount: 0, partialCount: 0, totalAmount: 0 };
  paymentForm = {
    paid_date: '',
    cash_amount: 0,
    online_amount: 0,
    received_date: '',
    due_date: '',
    received_by_employee_id: null as number | null
  };

  constructor(
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private snackbar: Snackbar,
    public permissions: PermissionService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.nameFilter = this.route.snapshot.queryParamMap.get('name') || '';
    this.statusFilter = String(this.route.snapshot.queryParamMap.get('status') || 'PENDING').toUpperCase();
    if (!this.permissions.isAdmin() && this.permissions.employeeId()) {
      this.installedByFilter = String(this.permissions.employeeId());
    }
    this.loadEmployees();
    this.loadAccounts();
  }

  loadEmployees() {
    this.cableTvService.getLookups().subscribe({
      next: (response: any) => {
        this.employees = response?.employees || [];
        if (!this.permissions.isAdmin() && this.loggedInEmployeeId) {
          this.installedByFilter = String(this.loggedInEmployeeId);
        }
      },
      error: (error: any) => this.handleError(error)
    });
  }

  loadAccounts() {
    this.ngxLoader.start();
    forkJoin({
      rows: this.cableTvService.getPendingAccounts({
        name: this.nameFilter.trim(),
        status: this.statusFilter,
        installed_by_employee_id: this.installedByFilter,
        start_date: this.startDate,
        end_date: this.endDate
      }),
      pendingRows: this.cableTvService.getPendingAccounts({ status: 'PENDING' }),
      partialRows: this.cableTvService.getPendingAccounts({ status: 'PARTIAL' })
    }).subscribe({
      next: ({ rows, pendingRows, partialRows }: any) => {
        this.ngxLoader.stop();
        this.accounts = rows || [];
        const pending = Array.isArray(pendingRows) ? pendingRows : [];
        const partial = Array.isArray(partialRows) ? partialRows : [];
        this.accountSummary = {
          pendingCount: pending.length,
          partialCount: partial.length,
          totalAmount: [...pending, ...partial].reduce(
            (total: number, item: any) => total + this.reportBalance(item), 0
          )
        };
        const visibleIds = new Set(this.accounts.map((item: any) => Number(item.account_id)));
        this.selectedReportAccounts = this.selectedReportAccounts.filter((item: any) => visibleIds.has(Number(item.account_id)));
      },
      error: (error: any) => this.handleError(error)
    });
  }

  openPayment(item: any) {
    const today = this.today();
    this.selectedAccount = item;
    this.paymentBaseBalance = this.accountReceiptBalance(item);
    this.paymentHistory = [];
    this.paymentForm = {
      paid_date: today,
      cash_amount: 0,
      online_amount: 0,
      received_date: today,
      due_date: item.due_date ? String(item.due_date).slice(0, 10) : '',
      received_by_employee_id: this.loggedInEmployeeId
    };
    this.recalculatePayment();
    this.showPaymentModal = true;
    this.cableTvService.getAccountPayments(item.account_id).subscribe({
      next: (rows: any) => this.paymentHistory = rows || [],
      error: (error: any) => this.handleError(error)
    });
  }

  closePayment() {
    this.showPaymentModal = false;
    this.selectedAccount = null;
    this.paymentHistory = [];
    this.paymentBaseBalance = 0;
  }

  savePayment() {
    if (!this.selectedAccount) return;
    const validationMessage = this.paymentValidationMessage();
    if (validationMessage) {
      this.snackbar.openSnackbar(validationMessage, globalConstants.errorRegex);
      return;
    }
    this.ngxLoader.start();
    this.cableTvService.receiveAccount(this.selectedAccount.account_id, this.paymentForm).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.snackbar.openSnackbar(response?.message || 'Payment recorded successfully', '');
        this.closePayment();
        this.loadAccounts();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  revertToPending(accountId: number) {
    if (!confirm('Revert this received account and related service statuses to Pending?')) return;
    this.ngxLoader.start();
    this.cableTvService.revertAccountToPending(accountId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.snackbar.openSnackbar(response?.message || 'Account reverted to pending', '');
        this.loadAccounts();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  resetFilters() {
    this.nameFilter = '';
    this.statusFilter = 'PENDING';
    this.installedByFilter = this.permissions.isAdmin()
      ? ''
      : String(this.loggedInEmployeeId || '');
    this.startDate = '';
    this.endDate = '';
    this.loadAccounts();
  }

  get reportTotals() {
    return this.accounts.reduce((totals, item: any) => ({
      stb: totals.stb + (Number(item.stb_amount) || 0),
      stbDiscount: totals.stbDiscount + (Number(item.stb_discount) || 0),
      connection: totals.connection + (Number(item.connection_amount) || 0),
      labor: totals.labor + (Number(item.labor_amount) || 0),
      material: totals.material + (Number(item.material_cost) || 0),
      materialDiscount: totals.materialDiscount + (Number(item.material_discount) || 0),
      subscription: totals.subscription + (Number(item.subscription_amount) || 0),
      total: totals.total + (Number(item.grand_total) || 0),
      customerPaid: totals.customerPaid + (Number(item.customer_paid_amount) || 0),
      balance: totals.balance + this.reportBalance(item)
    }), {
      stb: 0,
      stbDiscount: 0,
      connection: 0,
      labor: 0,
      material: 0,
      materialDiscount: 0,
      subscription: 0,
      total: 0,
      customerPaid: 0,
      balance: 0
    });
  }

  get loggedInAdminName() {
    const employee = this.loggedInEmployee;
    return employee?.employee_name || this.permissions.username();
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

  get loggedInEmployeeId() {
    return this.loggedInEmployee?.employee_id || this.permissions.employeeId();
  }

  get reportInstalledByLabel() {
    if (!this.installedByFilter) return 'All employees';
    const employee = this.employees.find(
      (item: any) => Number(item.employee_id) === Number(this.installedByFilter)
    );
    return employee?.employee_name || 'All employees';
  }

  get reportStartDateLabel() {
    return this.startDate ? this.displayDate(this.startDate) : 'All dates';
  }

  get reportEndDateLabel() {
    return this.endDate ? this.displayDate(this.endDate) : 'All dates';
  }

  updatePaymentAmount(field: 'cash_amount' | 'online_amount', value: any) {
    this.paymentForm[field] = value === '' || value === null ? 0 : Math.max(Number(value) || 0, 0);
    this.recalculatePayment();
  }

  get receivedAmount() {
    return this.receivedAmountValue;
  }

  get paymentBalance() {
    return this.paymentBalanceValue;
  }

  get officeCurrentBalance() {
    return this.paymentBaseBalance;
  }

  get customerCurrentBalance() {
    return this.accountReceiptBalance(this.selectedAccount);
  }

  get paymentTargetAmount() {
    return this.accountReceiptBalance(this.selectedAccount);
  }

  accountReceiptBalance(item: any) {
    const totalPayment = Math.max(Number(item?.grand_total) || 0, 0);
    const officeReceived = Math.max(Number(item?.office_received_amount) || 0, 0);
    return Number(Math.max(totalPayment - officeReceived, 0).toFixed(2));
  }

  reportBalance(item: any) {
    const serverBalance = Number(item?.calculated_balance_amount);
    return Number.isFinite(serverBalance) ? serverBalance : this.accountReceiptBalance(item);
  }

  reportPaymentStatus(item: any) {
    const status = String(item?.calculated_account_status || item?.account_status || '').trim().toUpperCase();
    if (status === 'NA') return 'NA';
    if (status === 'RECEIVED') return 'PAID';
    if (['PAID', 'PARTIAL', 'PENDING'].includes(status)) return status;
    return this.reportBalance(item) <= 0 ? 'PAID' : 'PENDING';
  }

  get calculatedPaymentStatus() {
    return this.paymentStatusValue;
  }

  recalculatePayment() {
    const cash = Math.max(Number(this.paymentForm.cash_amount) || 0, 0);
    const online = Math.max(Number(this.paymentForm.online_amount) || 0, 0);
    this.receivedAmountValue = Number((cash + online).toFixed(2));
    this.paymentBalanceValue = Number(Math.max(this.paymentBaseBalance - this.receivedAmountValue, 0).toFixed(2));
    this.paymentStatusValue = this.paymentBalanceValue <= 0 ? 'PAID' : 'UNPAID';
    if (this.paymentBalanceValue <= 0) this.paymentForm.due_date = '';
  }

  get paymentValid() {
    const currentBalance = this.officeCurrentBalance;
    return Boolean(
      this.paymentForm.paid_date
      && this.paymentForm.received_date
      && (currentBalance <= 0 || this.receivedAmount > 0)
      && this.receivedAmount <= currentBalance
      && (this.paymentBalance <= 0 || this.paymentForm.due_date)
    );
  }

  paymentValidationMessage() {
    if (!this.paymentForm.paid_date) return 'Paid Date is required';
    if (!this.paymentForm.received_date) return 'Received Date is required';
    if (this.officeCurrentBalance > 0 && this.receivedAmount <= 0) return 'Enter a Cash or Online amount';
    if (this.receivedAmount > this.officeCurrentBalance) return 'Cash + Online cannot exceed Total Payment';
    if (this.paymentBalance > 0 && !this.paymentForm.due_date) return 'Due Date is required for a partial payment';
    return '';
  }

  today() {
    const date = new Date();
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  isReportRowSelected(item: any) {
    return this.selectedReportAccounts.some((selected: any) => Number(selected.account_id) === Number(item.account_id));
  }

  toggleReportRow(item: any, checked: boolean) {
    if (checked && !this.isReportRowSelected(item)) this.selectedReportAccounts = [...this.selectedReportAccounts, item];
    if (!checked) this.selectedReportAccounts = this.selectedReportAccounts.filter(
      (selected: any) => Number(selected.account_id) !== Number(item.account_id)
    );
  }

  toggleAllReportRows(checked: boolean) {
    this.selectedReportAccounts = checked ? [...this.accounts] : [];
  }

  get allReportRowsSelected() {
    return Boolean(this.accounts.length) && this.accounts.every((item: any) => this.isReportRowSelected(item));
  }

  openReportPreview() {
    if (!this.accounts.length) return;
    this.showReportPreview = true;
  }

  closeReportPreview() {
    this.showReportPreview = false;
  }

  exportExcel() {
    if (!this.accounts.length) return;
    const headers = [
      'S.No', 'Install/Update Date', 'Cust No', 'Customer Name', 'Installed By', 'Connection Type',
      'STB', 'STB Discount', 'Connection', 'Labor', 'Subscription', 'Customer Paid', 'Materials', 'Balance',
      'Total', 'Due Date', 'Status'
    ];
    const rows = this.accounts.map((item: any, index: number) => [
      index + 1,
      this.displayDate(this.installUpdateDate(item)),
      this.customerNumber(item),
      item.full_name || '',
      item.installed_by_name || '',
      this.connectionTypeLabel(item.connection_type),
      this.amountValue(item.stb_amount),
      this.amountValue(item.stb_discount),
      this.amountValue(item.connection_amount),
      this.amountValue(item.labor_amount),
      this.amountValue(item.subscription_amount),
      this.amountValue(item.customer_paid_amount),
      this.materialAmountValue(item),
      this.amountValue(this.reportBalance(item)),
      this.amountValue(item.grand_total),
      this.displayDate(item.due_date),
      this.reportPaymentStatus(item)
    ]);
    const totals = this.reportTotals;
    rows.push([
      '', '', '', '', '', 'Grand Total',
      this.amountValue(totals.stb),
      this.amountValue(totals.stbDiscount),
      this.amountValue(totals.connection),
      this.amountValue(totals.labor),
      this.amountValue(totals.subscription),
      this.amountValue(totals.customerPaid),
      this.amountValue(totals.material - totals.materialDiscount),
      this.amountValue(totals.balance),
      this.amountValue(totals.total),
      '', '', ''
    ]);
    const csv = [headers, ...rows]
      .map(columns => columns.map(value => this.csvValue(value)).join(','))
      .join('\r\n');
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Pending_Account_Report_${this.today()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  printReport() {
    if (!this.accounts.length) return;
    const popup = window.open('', '_blank', 'width=1300,height=800');
    if (!popup) {
      this.snackbar.openSnackbar('Allow pop-ups to print the Pending Account Report', globalConstants.errorRegex);
      return;
    }
    const rows = this.accounts.map((item: any, index: number) => `<tr>
      <td>${index + 1}</td>
      <td>${this.escapeHtml(this.displayDate(this.installUpdateDate(item)))}</td>
      <td>${this.escapeHtml(this.customerNumber(item))}</td>
      <td>${this.escapeHtml(item.full_name || '-')}</td>
      <td>${this.escapeHtml(item.installed_by_name || '-')}</td>
      <td>${this.escapeHtml(this.connectionTypeLabel(item.connection_type))}</td>
      <td class="number">${this.amountValue(item.stb_amount)}</td>
      <td class="number">${this.amountValue(item.stb_discount)}</td>
      <td class="number">${this.amountValue(item.connection_amount)}</td>
      <td class="number">${this.amountValue(item.labor_amount)}</td>
      <td class="number">${this.amountValue(item.subscription_amount)}</td>
      <td class="number">${this.amountValue(item.customer_paid_amount)}</td>
      <td class="number">${this.materialAmountValue(item)}</td>
      <td class="number">${this.amountValue(this.reportBalance(item))}</td>
      <td class="number">${this.amountValue(item.grand_total)}</td>
      <td>${this.escapeHtml(this.reportPaymentStatus(item))}</td>
    </tr>`).join('');
    const totals = this.reportTotals;
    const totalRow = `<tr class="grand"><td colspan="6">Grand Total (${this.accounts.length} records)</td>
      <td class="number">${this.amountValue(totals.stb)}</td>
      <td class="number">${this.amountValue(totals.stbDiscount)}</td>
      <td class="number">${this.amountValue(totals.connection)}</td>
      <td class="number">${this.amountValue(totals.labor)}</td>
      <td class="number">${this.amountValue(totals.subscription)}</td>
      <td class="number">${this.amountValue(totals.customerPaid)}</td>
      <td class="number">${this.amountValue(totals.material - totals.materialDiscount)}</td>
      <td class="number">${this.amountValue(totals.balance)}</td>
      <td class="number">${this.amountValue(totals.total)}</td><td></td></tr>`;
    popup.document.write(`<!doctype html><html><head><title>Pending Account Report</title><style>
      body{font-family:Arial,sans-serif;color:#111827;margin:24px}h1{text-align:center;font-size:24px}
      .meta{display:flex;flex-wrap:wrap;gap:10px 28px;margin:14px 0;font-weight:700}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #9ca3af;padding:7px;font-size:11px;text-align:left}
      th{background:#e5e7eb}.number{text-align:right}.grand td{background:#f3f4f6;font-weight:700}@media print{body{margin:10mm}}
    </style></head><body><h1>Pending Account Report</h1>
      <div class="meta">
        <span>Installed By: ${this.escapeHtml(this.reportInstalledByLabel)}</span>
        <span>Start Date: ${this.escapeHtml(this.reportStartDateLabel)}</span>
        <span>End Date: ${this.escapeHtml(this.reportEndDateLabel)}</span>
        <span>Status: ${this.escapeHtml(this.statusFilter || 'ALL')}</span>
        <span>Printed: ${this.displayDate(new Date())}</span>
      </div>
      <table><thead><tr><th>S.No</th><th>Install/Update Date</th><th>Cust No</th><th>Customer Name</th><th>Installed By</th><th>Type</th>
      <th>STB</th><th>STB Discount</th><th>Connection</th><th>Labor</th><th>Subscription</th><th>Customer Paid</th><th>Materials</th>
      <th>Balance</th><th>Total</th><th>Status</th></tr></thead><tbody>${rows}${totalRow}</tbody></table>
      <script>window.onload=()=>window.print();<\/script></body></html>`);
    popup.document.close();
  }

  exportSelectedPaymentInvoice() {
    const items = this.selectedReportAccounts;
    if (!items.length) return;
    const popup = window.open('', '_blank', 'width=1100,height=760');
    if (!popup) {
      this.snackbar.openSnackbar('Allow pop-ups to generate the printable PDF', globalConstants.errorRegex);
      return;
    }
    const amount = (value: any) => Number(value || 0).toFixed(2);
    const installedNames = [...new Set(items.map((item: any) => item.installed_by_name || '-'))].join(', ');
    const invoiceRows = items.map((item: any) => {
      const installUpdateDate = this.installUpdateDate(item);
      const date = installUpdateDate ? new Date(installUpdateDate).toLocaleDateString('en-GB').replaceAll('/', '-') : '-';
      const type = this.escapeHtml(this.connectionTypeLabel(item.connection_type));
      const customerNo = this.escapeHtml(this.customerNumber(item));
      return `<tr><td>${date}</td><td>${customerNo}</td><td>${type}</td><td>${amount(item.stb_amount)}</td><td>${amount(item.connection_amount)}</td><td>${amount(item.labor_amount)}</td><td>${amount(item.subscription_amount)}</td><td>${amount(item.customer_paid_amount)}</td><td>${this.materialAmountValue(item)}</td><td>${amount(this.reportBalance(item))}</td><td>${amount(item.grand_total)}</td></tr>`;
    }).join('');
    const grandTotal = items.reduce((sum: number, item: any) => sum + Number(item.grand_total || 0), 0);
    const customerNos = items.map((item: any) => this.customerNumber(item)).join(', ');
    popup.document.write(`<!doctype html><html><head><title>Payment Invoice</title><style>
      body{font-family:Arial,sans-serif;color:#111827;margin:32px}h1{text-align:center;font-size:22px;margin:0 0 24px}
      .meta{display:flex;justify-content:space-between;margin-bottom:14px;font-size:14px}table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #6b7280;padding:8px;text-align:right;font-size:12px}th{background:#e5e7eb}
      th:nth-child(-n+3),td:nth-child(-n+3){text-align:left}
      .grand td{font-weight:700;background:#f3f4f6}.note{font-size:11px;margin-top:18px;color:#4b5563}
      @media print{body{margin:12mm}.no-print{display:none}}
    </style></head><body><h1>Payment Invoice</h1><div class="meta"><strong>Installed by: ${this.escapeHtml(installedNames)}</strong><span>Printed: ${new Date().toLocaleDateString('en-GB').replaceAll('/', '-')}</span></div>
    <table><thead><tr><th>Date</th><th>Cust No</th><th>Type</th><th>STB</th><th>Connection</th><th>Labor</th><th>Subscription</th><th>Customer Paid</th><th>Materials</th><th>Balance</th><th>Total Office</th></tr></thead><tbody>
    ${invoiceRows}<tr class="grand"><td colspan="10">Grand Total</td><td>${amount(grandTotal)}</td></tr>
    </tbody></table><p class="note">Selected customers: ${this.escapeHtml(customerNos)}</p>
    <script>window.onload=()=>{window.print();}</script></body></html>`);
    popup.document.close();
  }

  private amountValue(value: any) {
    return Number(value || 0).toFixed(2);
  }

  private materialAmountValue(item: any) {
    const material = this.amountValue(item?.material_cost);
    const discount = Number(item?.material_discount) || 0;
    return discount ? `${material} - ${this.amountValue(discount)}` : material;
  }

  connectionTypeLabel(value: any) {
    const type = String(value || '').trim().toUpperCase();
    const labels: Record<string, string> = {
      NEW: 'New',
      NEW_CUSTOMER_ONBOARDING: 'New',
      STB_UPDATE: 'STB Update',
      RECONNECTION: 'Reconnection',
      SHIFTED: 'Location Change',
      LOCATION_CHANGE: 'Location Change',
      TRANSFERRED: 'Transferred',
      CONNECTION_UPDATE: 'Connection Update'
    };
    return labels[type] || (type
      ? type.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase())
      : '-');
  }

  installUpdateDate(item: any) {
    return item?.install_update_date || item?.account_date || item?.updated_date || item?.installed_date || null;
  }

  customerNumber(item: any) {
    const customerNo = String(item?.customer_code || '').trim();
    const oldCustomerNo = String(item?.legacy_customer_no || '').trim();
    if (customerNo && oldCustomerNo) return `${customerNo}/${oldCustomerNo}`;
    return customerNo || oldCustomerNo || '-';
  }

  private displayDate(value: any) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-GB').replaceAll('/', '-');
  }

  private csvValue(value: any) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  private escapeHtml(value: any) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character] || character));
  }

  private handleError(error: any) {
    this.ngxLoader.stop();
    this.snackbar.openSnackbar(error?.error?.message || globalConstants.genericError, globalConstants.errorRegex);
  }
}
