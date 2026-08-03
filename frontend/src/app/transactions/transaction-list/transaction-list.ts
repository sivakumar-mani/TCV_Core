import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';
import { TransactionServices } from '../../services/transaction-services';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-transaction-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './transaction-list.html',
  styleUrl: './transaction-list.scss'
})
export class TransactionList {
  showForm = false;
  showDetails = false;
  selectedTransaction: any = null;
  rows: any[] = [];
  users: any[] = [];
  instructedByUsers: any[] = [];
  summary = { total_credit: 0, total_debit: 0, balance: 0 };
  filters = { start_date: this.monthStart(), end_date: this.today(), transaction_type: '', created_by_user_id: '' };
  form = this.emptyForm();

  constructor(
    private service: TransactionServices,
    private loader: NgxUiLoaderService,
    private snackbar: Snackbar,
    public permissions: PermissionService
  ) {}

  ngOnInit() { this.load(); }

  get selectedUserName() {
    const user = this.users.find(item => Number(item.user_id) === Number(this.filters.created_by_user_id));
    return user ? `${user.user_name}${user.username ? ` (${user.username})` : ''}` : 'All Users';
  }

  load() {
    if (!this.filters.start_date || !this.filters.end_date) return this.error('Start Date and End Date are required');
    if (this.filters.end_date < this.filters.start_date) return this.error('End Date cannot be before Start Date');
    this.loader.start();
    this.service.getTransactions(this.filters).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.rows = response?.rows || [];
        this.users = response?.users || [];
        this.instructedByUsers = response?.instructed_by_users || [];
        this.summary = {
          total_credit: Number(response?.total_credit) || 0,
          total_debit: Number(response?.total_debit) || 0,
          balance: Number(response?.balance) || 0
        };
      },
      error: error => this.handleError(error)
    });
  }

  reset() {
    this.filters = { start_date: this.monthStart(), end_date: this.today(), transaction_type: '', created_by_user_id: '' };
    this.load();
  }

  openForm() {
    this.form = this.emptyForm();
    this.showForm = true;
  }

  view(row: any) {
    this.selectedTransaction = row;
    this.showDetails = true;
  }

  closeDetails() {
    this.showDetails = false;
    this.selectedTransaction = null;
  }

  save() {
    if (
      !this.form.transaction_date || !this.form.transaction_type || !this.form.category.trim()
      || Number(this.form.amount) <= 0 || !this.form.payment_mode
      || !this.form.reference_no.trim() || !this.form.description.trim()
    ) {
      return this.error('Date, Type, Purpose, Amount, Payment Mode, Reference No, and Description are required');
    }
    if (this.form.transaction_type === 'DEBIT' && (!this.form.instructed_by_user_id || !this.form.bill_copy_available || !this.form.item_list.trim())) {
      return this.error('Instructed By, Bill Copy Yes/No, and Item List/Description are required for Debit');
    }
    if (this.form.transaction_type === 'CREDIT' && (!this.form.received_by.trim() || !this.form.received_date)) {
      return this.error('Received By and Received Date are required for Credit');
    }
    this.loader.start();
    this.service.addTransaction(this.form).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.snackbar.openSnackbar(response?.message || 'Transaction added successfully', 'success');
        this.showForm = false;
        this.load();
      },
      error: error => this.handleError(error)
    });
  }

  approve(row: any) {
    if (!this.permissions.isAdmin() || String(row.approval_status || 'PENDING').toUpperCase() !== 'PENDING') return;
    if (!confirm('Approve this transaction?')) return;
    this.loader.start();
    this.service.approveTransaction(Number(row.finance_transaction_id)).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.snackbar.openSnackbar(response?.message || 'Transaction approved successfully', 'success');
        this.closeDetails();
        this.load();
      },
      error: error => this.handleError(error)
    });
  }

  delete(row: any) {
    if (!this.permissions.isAdmin()) return;
    if (!confirm('Delete this transaction permanently?')) return;
    this.loader.start();
    this.service.deleteTransaction(Number(row.finance_transaction_id)).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.snackbar.openSnackbar(response?.message || 'Transaction deleted successfully', 'success');
        if (this.selectedTransaction?.finance_transaction_id === row.finance_transaction_id) this.closeDetails();
        this.load();
      },
      error: error => this.handleError(error)
    });
  }

  printReport() {
    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) return this.error('Allow pop-ups to print the report');
    const rows = this.rows.map((row, index) => `<tr>
      <td>${index + 1}</td><td>${this.escape(this.displayDate(row.transaction_date))}</td>
      <td>${this.escape(row.transaction_type)}</td><td>${this.escape(row.category)}</td>
      <td>${this.escape(row.payment_mode)}</td><td>${this.escape(row.reference_no || '-')}</td>
      <td>${this.escape(row.transaction_type === 'DEBIT' ? row.item_list || row.description || '-' : row.description || '-')}</td><td>${this.escape(row.entered_by_name || '-')}</td>
      <td>${this.escape(row.approval_status || 'PENDING')}</td>
      <td class="number">${this.amount(row.transaction_type === 'DEBIT' ? row.amount : 0)}</td>
      <td class="number">${this.amount(row.transaction_type === 'CREDIT' ? row.amount : 0)}</td>
    </tr>`).join('');
    popup.document.write(`<!doctype html><html><head><title>Transaction Report</title><style>
      body{font-family:Arial,sans-serif;color:#172033;margin:24px}h1{color:#0878ee}
      .meta{font-weight:700;margin:14px 0}table{border-collapse:collapse;width:100%}
      th{background:#0878ee;color:#fff}th,td{border:1px solid #bac3ce;padding:8px;text-align:left}
      .number{text-align:right}tfoot td{font-weight:700}@media print{button{display:none}}
    </style></head><body><h1>Transaction Report</h1>
      <div class="meta">Period: ${this.escape(this.displayDate(this.filters.start_date))} to ${this.escape(this.displayDate(this.filters.end_date))} &nbsp; | &nbsp; User: ${this.escape(this.selectedUserName)}</div>
      <table><thead><tr><th>S.No</th><th>Date</th><th>Type</th><th>Purpose</th><th>Mode</th><th>Reference</th><th>Description / Items</th><th>Entered By</th><th>Status</th><th>Debit</th><th>Credit</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="11">No transactions found.</td></tr>'}</tbody>
      <tfoot><tr><td colspan="9">Balance: ${this.amount(this.summary.balance)}</td><td class="number">${this.amount(this.summary.total_debit)}</td><td class="number">${this.amount(this.summary.total_credit)}</td></tr></tfoot></table>
      <script>window.onload=()=>window.print();<\/script></body></html>`);
    popup.document.close();
  }

  displayDate(value: any) {
    const text = String(value || '').slice(0, 10);
    if (!text) return '-';
    const [year, month, day] = text.split('-');
    return `${day}-${month}-${year}`;
  }
  amount(value: any) { return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  private emptyForm() {
    return {
      transaction_date: this.today(), transaction_type: 'DEBIT', category: '', amount: 0,
      payment_mode: 'CASH', reference_no: '', description: '', instructed_by_user_id: null,
      bill_copy_available: '', item_list: '', received_by: '', received_date: this.today()
    };
  }
  private localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private today() { return this.localDate(new Date()); }
  private monthStart() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`; }
  private escape(value: any) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char)); }
  private error(message: string) { this.snackbar.openSnackbar(message, globalConstants.errorRegex); }
  private handleError(error: any) { this.loader.stop(); this.error(error?.error?.message || error?.message || 'Transaction request failed'); }
}
