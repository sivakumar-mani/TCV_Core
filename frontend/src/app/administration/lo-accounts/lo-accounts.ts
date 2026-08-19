import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-lo-accounts',
  imports: [CommonModule, FormsModule],
  templateUrl: './lo-accounts.html',
  styleUrl: './lo-accounts.scss'
})
export class LoAccounts {
  rows: any[] = [];
  filters = { search: '', status: 'ALL' };
  summary = { total_records: 0, active_records: 0, total_pending_amount: 0 };

  constructor(private api: CableTvServices, private loader: NgxUiLoaderService, private snackbar: Snackbar) {}

  ngOnInit() { this.load(); }

  load() {
    this.loader.start();
    this.api.getLoAccounts(this.filters).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.rows = response?.rows || [];
        this.summary = {
          total_records: Number(response?.total_records) || 0,
          active_records: Number(response?.active_records) || 0,
          total_pending_amount: Number(response?.total_pending_amount) || 0
        };
      },
      error: (error: any) => {
        this.loader.stop();
        this.snackbar.openSnackbar(error?.error?.message || 'LO account list failed', globalConstants.errorRegex);
      }
    });
  }

  reset() { this.filters = { search: '', status: 'ALL' }; this.load(); }
  displayStatus(value: string) {
    const status = String(value || '').toUpperCase();
    if (status === 'WAITING_APPROVAL') return 'Waiting Approval';
    return ['ACTIVE', 'LEASE_LINE'].includes(status) ? 'Active' : value || '-';
  }

  exportExcel() {
    const data = [
      ['S.No', 'Cust No', 'Name', 'STB Number', 'Package Amount', 'Top-up Base', 'GST %', 'Recharge Amount', 'Pending Amount', 'Status'],
      ...this.rows.map((row, index) => [index + 1, row.customer_code, row.full_name, row.stb_no || '-',
        row.package_amount, row.topup_base_amount, row.topup_gst_percent, row.recharge_amount,
        row.pending_amount, this.displayStatus(row.status)])
    ];
    const csv = data.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv' }));
    link.download = 'LO_Customer_Accounts.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  print() {
    const popup = window.open('', '_blank', 'width=1200,height=800');
    if (!popup) return;
    const table = document.querySelector('.lo-account-table')?.outerHTML || '';
    popup.document.write(`<html><head><title>LO Customer Accounts</title><style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #aaa;padding:6px;font-size:11px}.number{text-align:right}th{background:#eee}</style></head><body><h2>LO Customer Accounts</h2><p>Total Customers: ${this.summary.total_records} | Active: ${this.summary.active_records} | Pending Amount: ${this.summary.total_pending_amount.toFixed(2)}</p>${table}<script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  }
}
