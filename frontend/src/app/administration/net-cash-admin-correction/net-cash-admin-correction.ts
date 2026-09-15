import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InternetCustomerServices } from '../../services/internet-customer-services';
import { CommonMethods } from '../../shared/common-methods';

@Component({
  selector: 'app-net-cash-admin-correction',
  imports: [CommonModule, FormsModule],
  templateUrl: './net-cash-admin-correction.html',
  styleUrl: './net-cash-admin-correction.scss',
})
export class NetCashAdminCorrection {
  readonly monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  readonly years = Array.from({ length: new Date().getFullYear() - 2019 + 3 }, (_, index) => 2020 + index);
  subscriptionMonth = new Date().getMonth() + 1;
  subscriptionYear = new Date().getFullYear();
  selection = { renewed_by_value: 'ADMIN', payment_mode: 'CASH', payment_status: 'PENDING' };
  netIds = '';
  preview: any = null;
  loading = false;
  applying = false;
  private previewVersion = 0;

  constructor(private api: InternetCustomerServices, private common: CommonMethods) {}

  previewChanges() {
    if (!this.netIds.trim()) return this.common.handleError({ error: { message: 'Enter at least one Net ID' } });
    const version = ++this.previewVersion;
    this.loading = true;
    this.preview = null;
    this.api.previewCashAdminCorrection(this.netIds, this.subscriptionMonth, this.subscriptionYear, this.selection).subscribe({
      next: result => { if (version === this.previewVersion) this.preview = result; this.loading = false; },
      error: error => { this.loading = false; this.common.handleError(error); },
    });
  }

  applyChanges() {
    if (!this.preview?.subscription_count || this.applying) return;
    const period = `${this.monthNames[this.subscriptionMonth - 1]} ${this.subscriptionYear}`;
    if (!confirm(`Update ${this.preview.subscription_count} subscription(s) for ${period} to ${this.selection.renewed_by_value === 'CUSTOMER' ? 'Online' : 'Admin'} / ${this.selection.payment_mode} / ${this.selection.payment_status === 'PAID' ? 'Paid' : 'Unpaid'}?`)) return;
    this.applying = true;
    this.api.applyCashAdminCorrection(this.netIds, this.subscriptionMonth, this.subscriptionYear, this.selection).subscribe({
      next: result => { this.applying = false; this.common.handleTokenAndMessage(result); this.previewChanges(); },
      error: error => { this.applying = false; this.common.handleError(error); },
    });
  }

  renewedChanged() { this.selection.payment_mode = this.selection.renewed_by_value === 'CUSTOMER' ? 'DASHBOARD' : 'CASH'; this.periodChanged(); }

  async uploadNetIds(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.periodChanged();
    try { this.netIds = (await file.text()).replace(/^\uFEFF/, '').replace(/^net[ _]?ids?[,\r\n]*/i, '').replace(/"/g, ''); }
    catch (error) { this.common.handleError({error:{message:'Unable to read Net IDs file'}}); }
    input.value = '';
  }

  periodChanged() { this.previewVersion++; this.preview = null; }

  clear() { this.netIds = ''; this.periodChanged(); }
}
