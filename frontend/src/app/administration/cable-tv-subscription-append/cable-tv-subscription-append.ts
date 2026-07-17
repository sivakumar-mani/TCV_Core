import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-cable-tv-subscription-append',
  imports: [CommonModule, FormsModule],
  templateUrl: './cable-tv-subscription-append.html',
  styleUrl: './cable-tv-subscription-append.scss'
})
export class CableTvSubscriptionAppend {
  private readonly defaultBillingDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  readonly months = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Date(2000, index, 1).toLocaleString('en-US', { month: 'long' })
  }));
  readonly years = Array.from({ length: 8 }, (_, index) => new Date().getFullYear() - 1 + index);
  subscriptionMonth = this.defaultBillingDate.getMonth() + 1;
  subscriptionYear = this.defaultBillingDate.getFullYear();
  rows: any[] = [];
  selectedIds = new Set<number>();
  period: any = {};
  totalAmount = 0;

  constructor(
    private cableTvService: CableTvServices,
    private loader: NgxUiLoaderService,
    private snackbar: Snackbar
  ) {}

  ngOnInit() { this.preview(); }

  get allSelected() { return this.rows.length > 0 && this.selectedIds.size === this.rows.length; }
  get selectedRows() { return this.rows.filter(row => this.selectedIds.has(Number(row.cable_customer_id))); }
  get selectedAmount() { return this.selectedRows.reduce((sum, row) => sum + Number(row.amount || 0), 0); }

  preview() {
    this.loader.start();
    this.cableTvService.previewMonthlySubscriptions(this.subscriptionMonth, this.subscriptionYear).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.rows = response?.rows || [];
        this.period = response?.period || {};
        this.totalAmount = Number(response?.total_amount) || 0;
        this.selectedIds = new Set(this.rows.map(row => Number(row.cable_customer_id)));
      },
      error: error => this.handleError(error)
    });
  }

  toggleAll(checked: boolean) {
    this.selectedIds = checked
      ? new Set(this.rows.map(row => Number(row.cable_customer_id)))
      : new Set<number>();
  }

  toggleRow(customerId: number, checked: boolean) {
    const next = new Set(this.selectedIds);
    if (checked) next.add(Number(customerId)); else next.delete(Number(customerId));
    this.selectedIds = next;
  }

  generate() {
    if (!this.selectedIds.size) return this.showError('Select at least one active customer');
    const month = this.months.find(item => item.value === Number(this.subscriptionMonth))?.label;
    if (!window.confirm(`Generate ${this.selectedIds.size} unpaid subscription(s) for ${month} ${this.subscriptionYear}?`)) return;
    this.loader.start();
    this.cableTvService.generateMonthlySubscriptions({
      subscription_month: Number(this.subscriptionMonth),
      subscription_year: Number(this.subscriptionYear),
      customer_ids: [...this.selectedIds]
    }).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.snackbar.openSnackbar(response?.message || 'Subscriptions generated successfully', '');
        this.preview();
      },
      error: error => this.handleError(error)
    });
  }

  displayDate(value: any) {
    if (!value) return '-';
    const text = String(value).slice(0, 10);
    const [year, month, day] = text.split('-');
    return year && month && day ? `${day}-${month}-${year}` : String(value);
  }

  private showError(message: string) { this.snackbar.openSnackbar(message, globalConstants.errorRegex); }
  private handleError(error: any) {
    this.loader.stop();
    this.showError(error?.error?.message || error?.message || 'Subscription generation request failed');
  }
}
