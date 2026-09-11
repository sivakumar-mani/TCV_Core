import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-complaint-report',
  imports: [CommonModule, FormsModule],
  templateUrl: './complaint-report.html',
  styleUrl: '../cable-tv-subscription-report/cable-tv-subscription-report.scss'
})
export class ComplaintReport {
  rows: any[] = [];
  employees: any[] = [];
  readonly statuses = ['OPEN', 'IN_PROGRESS', 'HOLD', 'PENDING', 'COMPLETED'];
  filters = { start_date: this.monthStart(), end_date: this.today(), status: '', assigned_employee_id: '' };

  constructor(private api: CableTvServices, private loader: NgxUiLoaderService, private snackbar: Snackbar) {}

  ngOnInit() {
    this.loader.start();
    this.api.getLookups().subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.employees = response?.employees || [];
        this.loadReport();
      },
      error: error => this.handleError(error)
    });
  }

  loadReport() {
    if (!this.filters.start_date || !this.filters.end_date) return this.error('Start date and end date are required');
    if (this.filters.end_date < this.filters.start_date) return this.error('End date cannot be before start date');
    this.loader.start();
    this.api.getComplaintReport(this.filters).subscribe({
      next: response => {
        this.loader.stop();
        this.rows = response?.rows || [];
      },
      error: error => this.handleError(error)
    });
  }

  clearFilters() {
    this.filters = { start_date: this.monthStart(), end_date: this.today(), status: '', assigned_employee_id: '' };
    this.loadReport();
  }

  get technicianLabel() {
    const technician = this.employees.find(employee => Number(employee.employee_id) === Number(this.filters.assigned_employee_id));
    return technician?.employee_name || 'All Technicians';
  }

  get statusLabel() { return this.filters.status ? this.statusText(this.filters.status) : 'All Statuses'; }
  date(value: any) { return value ? new Date(value).toLocaleDateString('en-GB').replaceAll('/', '-') : '-'; }
  dateTime(value: any) { return value ? new Date(value).toLocaleString('en-GB') : '-'; }
  statusText(value: any) { return String(value || '').replaceAll('_', ' '); }
  customer(row: any) { return row.customer_name || row.anonymous_name || 'Anonymous'; }
  contact(row: any) { return row.reported_mobile || row.customer_mobile || row.anonymous_mobile || '-'; }

  printReport() {
    const popup = window.open('', '_blank', 'width=1200,height=800');
    if (!popup) return this.error('Allow pop-ups to print the report');
    const rows = this.rows.map((row, index) => `<tr>
      <td>${index + 1}</td><td>${this.escape(row.complaint_no)}</td><td>${this.escape(this.dateTime(row.registered_at))}</td>
      <td>${this.escape(row.complainant_type)}</td><td>${this.escape(row.customer_code || '-')}</td>
      <td>${this.escape(this.customer(row))}<br><small>${this.escape(this.contact(row))}</small></td>
      <td>${this.escape(row.complaint_subject || row.nature_of_complaint)}</td>
      <td>${this.escape(row.assigned_employee_name || 'Unassigned')}</td><td>${this.escape(this.statusText(row.status))}</td>
    </tr>`).join('');
    popup.document.write(`<!doctype html><html><head><title>Complaint Report</title><style>
      @page{size:A4 landscape;margin:8mm}body{font-family:Arial,sans-serif;color:#172033;margin:0}h1{text-align:center;font-size:17px;margin:0 0 7px}.meta{display:flex;gap:18px;margin:0 0 8px;font-size:10px;font-weight:700}table{border-collapse:collapse;width:100%;font-size:9px}th{background:#0878ee;color:#fff}th,td{border:1px solid #333;padding:4px;text-align:left;vertical-align:top}small{color:#475467}
    </style></head><body><h1>Complaint Report</h1><div class="meta"><span>Period: ${this.escape(this.date(this.filters.start_date))} To ${this.escape(this.date(this.filters.end_date))}</span><span>Status: ${this.escape(this.statusLabel)}</span><span>Technician: ${this.escape(this.technicianLabel)}</span></div><table><thead><tr><th>S.No</th><th>Complaint No</th><th>Registered On</th><th>Type</th><th>Customer No</th><th>Customer / Contact</th><th>Complaint</th><th>Technician</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="9">No complaints found.</td></tr>'}</tbody><tfoot><tr><td colspan="9">Total Records: ${this.rows.length}</td></tr></tfoot></table><script>window.onload=()=>window.print();<\/script></body></html>`);
    popup.document.close();
  }

  private today() { return this.local(new Date()); }
  private monthStart() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`; }
  private local(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private escape(value: any) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character)); }
  private error(message: string) { this.snackbar.openSnackbar(message, globalConstants.errorRegex); }
  private handleError(error: any) { this.loader.stop(); this.error(error?.error?.message || error?.message || 'Complaint report request failed'); }
}
