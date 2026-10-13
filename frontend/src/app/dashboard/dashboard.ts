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
  get canViewExpiries() {
    return this.permissions.can('CABLE_TV_CUSTOMERS', 'view') || this.permissions.can('INTERNET_CUSTOMERS', 'view');
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
    const types = [
      ...(this.permissions.can('CABLE_TV_CUSTOMERS', 'view') ? ['CATV'] : []),
      ...(this.permissions.can('INTERNET_CUSTOMERS', 'view') ? ['NET'] : [])
    ];
    if (!types.length) { this.upcomingExpiries = []; return; }
    this.expiryError = '';
    forkJoin(types.map(type => this.http.get<any[]>(`${appConfig.apiUrl}/v1/dashboard/upcoming-expiries`, { params: { type } }))).subscribe({
      next: results => this.upcomingExpiries = results.flat().sort((a, b) => Number(a.days_remaining) - Number(b.days_remaining)),
      error: () => { this.upcomingExpiries = []; this.expiryError = 'Upcoming expiries could not be loaded.'; }
    });
  }
}
