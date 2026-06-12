import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EmployeeSalaryService } from './employee-salary.service';

@Component({
  selector: 'app-salary-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule
  ],
  template: `
    <div class="salary-list-container">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>Employee Salary Management</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="header-content">
            <div class="employee-info">
              <p><strong>Employee ID:</strong> {{ employeeId }}</p>
            </div>
            <button mat-raised-button color="primary" (click)="addSalary()">
              <mat-icon>add</mat-icon>
              Add New Salary Record
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="table-card">
        <mat-card-content *ngIf="salaries.length > 0; else noData">
          <table mat-table [dataSource]="salaries" class="salary-table">
            <!-- Month Column -->
            <ng-container matColumnDef="month">
              <th mat-header-cell *matHeaderCellDef>Month/Year</th>
              <td mat-cell *matCellDef="let element">
                {{ getMonthName(element.salary_month) }}/{{ element.salary_year }}
              </td>
            </ng-container>

            <!-- Period Column -->
            <ng-container matColumnDef="period">
              <th mat-header-cell *matHeaderCellDef>Period</th>
              <td mat-cell *matCellDef="let element">
                {{ element.period_start_date | date: 'MMM dd' }} - 
                {{ element.period_end_date | date: 'MMM dd, yyyy' }}
              </td>
            </ng-container>

            <!-- Salary Amount Column -->
            <ng-container matColumnDef="salary">
              <th mat-header-cell *matHeaderCellDef>Salary Amount</th>
              <td mat-cell *matCellDef="let element">
                ₹ {{ element.salary_amount | number: '1.2-2' }}
              </td>
            </ng-container>

            <!-- Earnings Column -->
            <ng-container matColumnDef="earnings">
              <th mat-header-cell *matHeaderCellDef>Earnings</th>
              <td mat-cell *matCellDef="let element">
                ₹ {{ element.earnings_total | number: '1.2-2' }}
              </td>
            </ng-container>

            <!-- Deductions Column -->
            <ng-container matColumnDef="deductions">
              <th mat-header-cell *matHeaderCellDef>Deductions</th>
              <td mat-cell *matCellDef="let element">
                ₹ {{ element.deductions_total | number: '1.2-2' }}
              </td>
            </ng-container>

            <!-- Net Salary Column -->
            <ng-container matColumnDef="netSalary">
              <th mat-header-cell *matHeaderCellDef>Net Salary</th>
              <td mat-cell *matCellDef="let element" class="net-salary">
                ₹ {{ element.net_salary | number: '1.2-2' }}
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let element">
                <span class="status-badge" [ngClass]="element.status.toLowerCase()">
                  {{ element.status }}
                </span>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let element">
                <button 
                  mat-icon-button 
                  matTooltip="View Details"
                  (click)="viewSalary(element.salary_id)"
                >
                  <mat-icon>visibility</mat-icon>
                </button>
                <button 
                  mat-icon-button 
                  matTooltip="Edit"
                  (click)="editSalary(element.salary_id)"
                >
                  <mat-icon>edit</mat-icon>
                </button>
                <button 
                  mat-icon-button 
                  matTooltip="Delete"
                  color="warn"
                  (click)="deleteSalary(element.salary_id)"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card-content>

        <ng-template #noData>
          <div class="no-data">
            <mat-icon>note_alt_off</mat-icon>
            <p>No salary records found for this employee</p>
            <button mat-raised-button color="primary" (click)="addSalary()">
              <mat-icon>add</mat-icon>
              Add First Salary Record
            </button>
          </div>
        </ng-template>
      </mat-card>
    </div>
  `,
  styles: [`
    .salary-list-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header-card, .table-card {
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    mat-card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 4px 4px 0 0;
      margin: -16px -16px 16px -16px;

      mat-card-title {
        margin: 0;
        font-size: 20px;
      }
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
    }

    .employee-info {
      p {
        margin: 5px 0;
        font-size: 14px;
      }
    }

    .salary-table {
      width: 100%;

      th {
        background-color: #f5f5f5;
        font-weight: 600;
        border-bottom: 2px solid #ddd;
      }

      td {
        border-bottom: 1px solid #eee;
        padding: 12px;
      }

      tr:hover {
        background-color: #fafafa;
      }
    }

    .net-salary {
      font-weight: 600;
      color: #2e7d32;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;

      &.final {
        background-color: #4caf50;
        color: white;
      }

      &.draft {
        background-color: #ff9800;
        color: white;
      }
    }

    .no-data {
      text-align: center;
      padding: 60px 20px;
      color: #999;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #ccc;
      }

      p {
        font-size: 16px;
        margin: 20px 0;
      }

      button {
        margin-top: 20px;
      }
    }

    button[mat-icon-button] {
      margin: 0 4px;
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        align-items: flex-start;
      }

      .salary-table {
        font-size: 12px;

        td, th {
          padding: 8px;
        }
      }
    }
  `]
})
export class SalaryList implements OnInit, OnDestroy {
  employeeId: number = 0;
  salaries: any[] = [];
  displayedColumns: string[] = ['month', 'period', 'salary', 'earnings', 'deductions', 'netSalary', 'status', 'actions'];
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salaryService: EmployeeSalaryService
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (params) => {
          if (params['id']) {
            this.employeeId = params['id'];
            this.loadSalaries();
          }
        }
      });
  }

  loadSalaries(): void {
    this.salaryService.getSalaryByEmployee(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.salaries = data;
        },
        error: (err) => console.error('Error loading salaries:', err)
      });
  }

  getMonthName(month: number): string {
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month] || '';
  }

  addSalary(): void {
    this.router.navigate(['/employee-salary/add', { employeeId: this.employeeId }]);
  }

  viewSalary(salaryId: number): void {
    this.router.navigate(['/employee-salary/view', salaryId]);
  }

  editSalary(salaryId: number): void {
    this.router.navigate(['/employee-salary/edit', salaryId]);
  }

  deleteSalary(salaryId: number): void {
    if (confirm('Are you sure you want to delete this salary record?')) {
      this.salaryService.deleteSalary(salaryId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            alert('Salary record deleted successfully');
            this.loadSalaries();
          },
          error: (err) => alert('Error deleting salary record: ' + err.error?.message)
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
