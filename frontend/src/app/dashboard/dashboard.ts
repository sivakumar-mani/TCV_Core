import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { appConfig } from '../app-config';
import { PermissionService } from '../services/permission.service';
import { forkJoin } from 'rxjs';

interface DashboardSummary {
  workflow_waiting_count: number;
  catv: { active: number; deactive: number };
  internet: { active: number; deactive: number };
  fault_boxes_in_service: number;
  complaints: Record<string, number>;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnDestroy {
  private http = inject(HttpClient);
  readonly permissions = inject(PermissionService);
  private refreshTimer?: ReturnType<typeof setInterval>;
  loading = true;
  errorMessage = '';
  upcomingExpiries: any[] = [];
  expiryError = '';
  errorMessage = '';
  upcomingExpiries: any[] = [];
  expiryError = '';
  reminderMessage = '';
  sendingReminders = new Set<number>();
  reminderPreview: any = null;
  reminderCustomer: any = null;
  previewLoading = false;

  get canViewExpiries() {
    return this.permissions.can('CABLE_TV_CUSTOMERS', 'view') || this.permissions.can('INTERNET_CUSTOMERS', 'view');
  }

  openReminderPreview(row: any) {
    if (!this.permissions.can('INTERNET_CUSTOMERS', 'update') || !row.email || this.previewLoading) return;
    this.previewLoading = true;
    this.reminderMessage = '';
    this.http.get<any>(`${appConfig.apiUrl}/v1/dashboard/internet-expiries/${row.customer_id}/reminder-preview`).subscribe({
      next: preview => { this.previewLoading = false; this.reminderCustomer = row; this.reminderPreview = preview; },
      error: error => { this.previewLoading = false; this.reminderMessage = error?.error?.message || 'Reminder preview could not be loaded.'; }
    });
  }

  closeReminderPreview() {
    if (this.reminderCustomer && this.sendingReminders.has(this.reminderCustomer.customer_id)) return;
    this.reminderPreview = null;
    this.reminderCustomer = null;
  }

  sendExpiryReminder() {
    const row = this.reminderCustomer;
    const preview = this.reminderPreview;
    if (!row || !preview || !this.permissions.can('INTERNET_CUSTOMERS', 'update') || this.sendingReminders.has(row.customer_id)) return;
    this.sendingReminders.add(row.customer_id);
    this.reminderMessage = '';
    this.http.post<any>(`${appConfig.apiUrl}/v1/dashboard/internet-expiries/${row.customer_id}/reminder`, {
      preview_email: preview.email, preview_expiry: preview.expiry_date, preview_text: preview.text
    }).subscribe({
      next: response => {
        this.sendingReminders.delete(row.customer_id);
        row.sent_count = response.sent_count;
        this.reminderMessage = response.message;
        this.closeReminderPreview();
        this.loadExpiries();
      },
      error: error => { this.sendingReminders.delete(row.customer_id); this.reminderMessage = error?.error?.message || 'Reminder email could not be sent.'; }
    });
  }
  }
  summary: DashboardSummary = {
    workflow_waiting_count: 0,
    catv: { active: 0, deactive: 0 },
    internet: { active: 0, deactive: 0 },
    fault_boxes_in_service: 0,
    complaints: { OPEN: 0, IN_PROGRESS: 0, HOLD: 0, PENDING: 0, COMPLETED: 0 }
  };

  readonly complaintStatuses = [
    { key: 'OPEN', label: 'Open', tone: 'open' },
    { key: 'IN_PROGRESS', label: 'In Progress', tone: 'progress' },
    { key: 'HOLD', label: 'Hold', tone: 'hold' },
    { key: 'PENDING', label: 'Pending', tone: 'pending' },
    { key: 'COMPLETED', label: 'Completed', tone: 'completed' }
  ];

  ngOnInit() {
    this.loadSummary();
    this.refreshTimer = setInterval(() => this.loadSummary(false), 15 * 60 * 1000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  loadSummary(showLoading = true) {
    this.loadExpiries();
    if (showLoading) this.loading = true;
    this.errorMessage = '';
    this.http.get<DashboardSummary>(`${appConfig.apiUrl}/v1/dashboard/summary`).subscribe({
      next: response => {
        this.summary = response;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Dashboard counts could not be loaded.';
        this.loading = false;
      }
    });
  }

  private loadExpiries() {
    const requests: any[] = [];
    if (this.permissions.can('CABLE_TV_CUSTOMERS', 'view')) {
      requests.push(this.http.get<any[]>(`${appConfig.apiUrl}/v1/dashboard/upcoming-expiries`, { params: { type: 'CATV' } }));
    }
    if (this.permissions.can('INTERNET_CUSTOMERS', 'view')) {
      requests.push(this.http.get<any[]>(`${appConfig.apiUrl}/v1/dashboard/internet-expiries`));
    }
    if (!requests.length) { this.upcomingExpiries = []; return; }
    this.expiryError = '';
    forkJoin(requests).subscribe({
      next: results => {
        const rows = results.flat();
        this.upcomingExpiries = rows
          .map(row => ({ ...row, service: row.service || 'NET' }))
          .sort((a, b) => Number(a.days_remaining) - Number(b.days_remaining));
      },
      error: () => {
        this.upcomingExpiries = [];
        this.expiryError = 'Upcoming expiries could not be loaded.';
      }
    });
    });
  }
}
