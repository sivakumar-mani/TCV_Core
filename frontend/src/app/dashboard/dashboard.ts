import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { appConfig } from '../app-config';

interface DashboardSummary {
  workflow_waiting_count: number;
  catv: { active: number; deactive: number };
  internet: { active: number; deactive: number };
  fault_boxes_in_service: number;
  complaints: Record<string, number>;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private http = inject(HttpClient);
  loading = true;
  errorMessage = '';
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
  }

  loadSummary() {
    this.loading = true;
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
}
