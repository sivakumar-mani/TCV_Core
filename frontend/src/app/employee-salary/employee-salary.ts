import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-employee-salary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="employee-salary-container">
      <h2>Employee Salary Management</h2>
      <p>Employee salary component placeholder</p>
    </div>
  `,
  styles: [`
    .employee-salary-container {
      padding: 20px;
    }
  `]
})
export class EmployeeSalary {
  constructor() {}
}
