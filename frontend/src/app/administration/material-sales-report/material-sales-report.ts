import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-material-sales-report',
  imports: [CommonModule, FormsModule],
  templateUrl: './material-sales-report.html',
  styleUrl: '../cable-tv-subscription-report/cable-tv-subscription-report.scss'
})
export class MaterialSalesReport {
  employees: any[] = [];
  rows: any[] = [];
  filters = { start_date: '', end_date: '', employee_id: '', issued_by_employee_id: '', status: '' };

  constructor(private service: CableTvServices, private loader: NgxUiLoaderService, private snackbar: Snackbar) {}

  ngOnInit() {
    this.service.getMaterialSalesLookups().subscribe({
      next: (response: any) => { this.employees = response?.employees || []; this.load(); },
      error: error => this.fail(error)
    });
  }

  load() {
    if (this.filters.start_date && this.filters.end_date && this.filters.end_date < this.filters.start_date) {
      this.snackbar.openSnackbar('End Date cannot be before Start Date', globalConstants.errorRegex);
      return;
    }
    this.loader.start();
    this.service.getMaterialMovements({ movement_type: 'SALE', ...this.filters }).subscribe({
      next: (rows: any) => { this.loader.stop(); this.rows = rows || []; },
      error: error => this.fail(error)
    });
  }

  clear() {
    this.filters = { start_date: '', end_date: '', employee_id: '', issued_by_employee_id: '', status: '' };
    this.load();
  }

  get totalAmount() { return this.rows.reduce((total, row) => total + Number(row.total_amount || 0), 0); }
  private fail(error: any) { this.loader.stop(); this.snackbar.openSnackbar(error?.error?.message || globalConstants.genericError, globalConstants.errorRegex); }
}
