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
  selectedIds = new Set<number>();
  loading = false;
  applying = false;
  private previewVersion = 0;

  constructor(private api: InternetCustomerServices, private common: CommonMethods) {}

  previewChanges() {
    if (!this.netIds.trim()) return this.common.handleError({ error: { message: 'Enter at least one Net ID' } });
    const version = ++this.previewVersion;
    this.loading = true;
    this.preview = null;
    this.selectedIds.clear();
    this.api.previewCashAdminCorrection(this.netIds, this.subscriptionMonth, this.subscriptionYear, this.selection).subscribe({
      next: result => { if (version === this.previewVersion) this.preview = result; this.loading = false; },
      error: error => { this.loading = false; this.common.handleError(error); },
    });
  }

  applyChanges() {
    if (!this.selectedSubscriptionCount || this.applying || this.loading) return;
    const period = `${this.monthNames[this.subscriptionMonth - 1]} ${this.subscriptionYear}`;
    if (!confirm(`Update ${this.selectedSubscriptionCount} subscription(s) for ${period} to ${this.selection.renewed_by_value === 'CUSTOMER' ? 'Online' : 'Admin'} / ${this.selection.payment_mode} / ${this.selection.payment_status === 'PAID' ? 'Paid' : 'Unpaid'}?`)) return;
    this.applying = true;
    this.api.applyCashAdminCorrection(this.netIds, this.subscriptionMonth, this.subscriptionYear, this.selection, this.selectedCustomers.map(row => Number(row.internet_customer_id))).subscribe({
      next: result => { this.applying = false; this.common.handleTokenAndMessage(result); this.previewChanges(); },
      error: error => { this.applying = false; this.common.handleError(error); },
    });
  }

  get eligibleCustomers(): any[] { return (this.preview?.customers || []).filter((row: any) => Number(row.subscription_count) > 0); }
  get selectedCustomers(): any[] { return this.eligibleCustomers.filter(row => this.selectedIds.has(Number(row.internet_customer_id))); }
  get selectedSubscriptionCount() { return this.selectedCustomers.reduce((sum, row) => sum + Number(row.subscription_count), 0); }
  get allSelected() { return this.eligibleCustomers.length > 0 && this.selectedCustomers.length === this.eligibleCustomers.length; }
  toggleAll(checked: boolean) { this.selectedIds = new Set(checked ? this.eligibleCustomers.map(row => Number(row.internet_customer_id)) : []); }
  toggleCustomer(row: any, checked: boolean) {
    if (Number(row.subscription_count) <= 0) return;
    const id = Number(row.internet_customer_id);
    if (checked) this.selectedIds.add(id); else this.selectedIds.delete(id);
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

  periodChanged() { this.previewVersion++; this.preview = null; this.selectedIds.clear(); }

  clear() { this.netIds = ''; this.periodChanged(); }
}
