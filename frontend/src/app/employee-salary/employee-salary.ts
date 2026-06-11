import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { EmployeeServices } from '../services/employee-services';
import { EmployeeSalaryServices } from '../services/employee-salary-services';
import { CommonMethods } from '../shared/common-methods';
import { AgGridList } from '../shared/ag-grid-list/ag-grid-list';
import { ActionMenu } from '../shared/list-action-menu';

type SalaryItemType = 'EARNING' | 'DEDUCTION';

@Component({
  selector: 'app-employee-salary',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AgGridList],
  templateUrl: './employee-salary.html',
  styleUrl: './employee-salary.scss',
})
export class EmployeeSalary {
  salaryForm!: FormGroup;
  salarySlips: any[] = [];
  employees: any[] = [];
  selectedSlip: any = null;
  isEditMode = false;
  showEditor = false;
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [10, 25, 50, 100];

  monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    minWidth: 120,
    flex: 1,
    filter: true,
    floatingFilter: true,
    headerClass: 'ag-header-style',
  };

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'employee_name', headerName: 'Employee Name', minWidth: 180 },
    { field: 'company_name', headerName: 'Company', minWidth: 150 },
    { headerName: 'Month', maxWidth: 130, valueGetter: (params: any) => this.getMonthName(params.data.salary_month) },
    { field: 'salary_year', headerName: 'Year', maxWidth: 110 },
    { field: 'period_start_date', headerName: 'Start Date', valueFormatter: (params: any) => this.formatDate(params) },
    { field: 'period_end_date', headerName: 'End Date', valueFormatter: (params: any) => this.formatDate(params) },
    { field: 'earnings_total', headerName: 'Sub Total', valueFormatter: (params: any) => this.currency(params.value) },
    { field: 'deductions_total', headerName: 'Deductions', valueFormatter: (params: any) => this.currency(params.value) },
    { field: 'net_salary', headerName: 'Net Salary', valueFormatter: (params: any) => this.currency(params.value) },
    {
      headerName: 'Action',
      maxWidth: 130,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'View', action: (row: any) => this.viewSalarySlip(row) },
          { label: 'Edit', action: (row: any) => this.editSalarySlip(row) },
          { label: 'Download PDF', action: (row: any) => this.downloadSalarySlip(row) },
          { label: 'Delete', action: (row: any) => this.deleteSalarySlip(row) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeServices,
    private salaryService: EmployeeSalaryServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadEmployees();
    this.loadSalarySlips();
  }

  get items() {
    return this.salaryForm.get('items') as FormArray;
  }

  get earningsTotal() {
    return this.getTotalByType('EARNING');
  }

  get deductionsTotal() {
    return this.getTotalByType('DEDUCTION');
  }

  get netSalary() {
    return this.earningsTotal - this.deductionsTotal;
  }

  buildForm() {
    const today = new Date();
    this.salaryForm = this.fb.group({
      salary_id: [null],
      employee_id: ['', Validators.required],
      company_name: ['TCV', Validators.required],
      salary_month: [today.getMonth() + 1, Validators.required],
      salary_year: [today.getFullYear(), [Validators.required, Validators.min(2000)]],
      period_start_date: ['', Validators.required],
      period_end_date: ['', Validators.required],
      remarks: [''],
      items: this.fb.array([])
    });
    this.addItem('EARNING', 'Salary', 1, 0);
    this.addItem('DEDUCTION', 'Insurance due', 1, 0);
  }

  createItem(type: SalaryItemType, description = '', qty = 1, price = 0) {
    return this.fb.group({
      item_type: [type, Validators.required],
      description: [description, Validators.required],
      qty: [qty, [Validators.required, Validators.min(0)]],
      price: [price, [Validators.required, Validators.min(0)]]
    });
  }

  addItem(type: SalaryItemType = 'EARNING', description = '', qty = 1, price = 0) {
    this.items.push(this.createItem(type, description, qty, price));
  }

  removeItem(index: number) {
    if (this.items.length === 1) return;
    this.items.removeAt(index);
  }

  trackByIndex(index: number) {
    return index;
  }

  loadEmployees() {
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => {
        this.employees = Array.isArray(response) ? response : response?.data ?? [];
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadSalarySlips() {
    this.ngxLoader.start();
    this.salaryService.getSalarySlips().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.salarySlips = response?.data ?? [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  openAddForm() {
    this.isEditMode = false;
    this.showEditor = true;
    this.selectedSlip = null;
    this.buildForm();
  }

  editSalarySlip(row: any) {
    this.ngxLoader.start();
    this.salaryService.getSalarySlipById(row.salary_id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const slip = response?.data;
        this.isEditMode = true;
        this.showEditor = true;
        this.selectedSlip = null;
        this.items.clear();
        this.salaryForm.patchValue({
          salary_id: slip.salary_id,
          employee_id: slip.employee_id,
          company_name: slip.company_name,
          salary_month: Number(slip.salary_month),
          salary_year: Number(slip.salary_year),
          period_start_date: this.toInputDate(slip.period_start_date),
          period_end_date: this.toInputDate(slip.period_end_date),
          remarks: slip.remarks || ''
        });
        (slip.items || []).forEach((item: any) => {
          this.addItem(item.item_type, item.description, Number(item.qty), Number(item.price));
        });
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  viewSalarySlip(row: any) {
    this.ngxLoader.start();
    this.salaryService.getSalarySlipById(row.salary_id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.selectedSlip = response?.data;
        this.showEditor = false;
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  submit() {
    if (this.salaryForm.invalid) {
      this.salaryForm.markAllAsTouched();
      return;
    }

    const payload = {
      ...this.salaryForm.getRawValue(),
      salary_month: Number(this.salaryForm.value.salary_month),
      salary_year: Number(this.salaryForm.value.salary_year),
      items: this.items.getRawValue()
    };

    this.ngxLoader.start();
    const request = this.isEditMode
      ? this.salaryService.updateSalarySlip(payload)
      : this.salaryService.addSalarySlip(payload);

    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.cancelEditor();
        this.loadSalarySlips();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  deleteSalarySlip(row: any) {
    if (!confirm(`Delete salary slip for ${row.employee_name}?`)) return;

    this.ngxLoader.start();
    this.salaryService.deleteSalarySlip({ salary_id: row.salary_id }).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadSalarySlips();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  cancelEditor() {
    this.showEditor = false;
    this.isEditMode = false;
  }

  closeView() {
    this.selectedSlip = null;
  }

  getLineTotal(item: any) {
    const qty = Number(item.get('qty')?.value || 0);
    const price = Number(item.get('price')?.value || 0);
    return qty * price;
  }

  getTotalByType(type: SalaryItemType) {
    return this.items.controls
      .filter((control) => control.get('item_type')?.value === type)
      .reduce((sum, control) => sum + this.getLineTotal(control), 0);
  }

  getSlipItems(type: SalaryItemType) {
    return (this.selectedSlip?.items || []).filter((item: any) => item.item_type === type);
  }

  getMonthName(month: number | string) {
    const option = this.monthOptions.find((item) => item.value === Number(month));
    return option?.label || '';
  }

  toInputDate(value: string) {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
  }

  formatDate(params: any) {
    if (!params.value) return '';
    return new Intl.DateTimeFormat('en-IN').format(new Date(params.value));
  }

  currency(value: any) {
    return `Rs. ${Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  downloadSalarySlip(row: any) {
    this.salaryService.getSalarySlipById(row.salary_id).subscribe({
      next: (response: any) => this.openPrintWindow(response?.data),
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  openPrintWindow(slip: any) {
    const html = this.buildPrintHtml(slip);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      this.commonMethods.handleError({ error: { message: 'Allow popup to download the salary slip PDF' } });
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }

  buildPrintHtml(slip: any) {
    const rows = (slip.items || []).map((item: any, index: number) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.escapeHtml(item.description)}</td>
        <td class="right">${Number(item.qty).toLocaleString('en-IN')}</td>
        <td class="right">${this.currency(item.price)}</td>
        <td class="right">${item.item_type === 'DEDUCTION' ? '-' : ''}${this.currency(item.total)}</td>
      </tr>
    `).join('');

    return `
      <!doctype html>
      <html>
        <head>
          <title>Salary Slip - ${this.escapeHtml(slip.employee_name)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
            .slip { max-width: 820px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
            h1 { font-size: 24px; margin: 0 0 4px; }
            h2 { font-size: 18px; margin: 0; font-weight: 500; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 16px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #333; padding: 8px; font-size: 13px; }
            th { background: #e9f3f8; text-align: left; }
            .right { text-align: right; }
            .total-row td { background: #dfeacc; font-weight: 700; }
            .net-row td { background: #8ccf4f; font-weight: 700; }
            @media print { button { display: none; } body { margin: 12mm; } }
          </style>
        </head>
        <body>
          <div class="slip">
            <button onclick="window.print()">Download PDF</button>
            <div class="header">
              <h1>${this.escapeHtml(slip.company_name)}</h1>
              <h2>Salary Slip</h2>
            </div>
            <div class="meta">
              <div><strong>Employee:</strong> ${this.escapeHtml(slip.employee_name)}</div>
              <div><strong>Employee Code:</strong> ${this.escapeHtml(slip.employee_code || '')}</div>
              <div><strong>Salary Month:</strong> ${this.getMonthName(slip.salary_month)} ${slip.salary_year}</div>
              <div><strong>Period:</strong> ${this.formatDate({ value: slip.period_start_date })} to ${this.formatDate({ value: slip.period_end_date })}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 64px;">S.No</th>
                  <th>Description</th>
                  <th class="right" style="width: 100px;">Qty</th>
                  <th class="right" style="width: 140px;">Price</th>
                  <th class="right" style="width: 140px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
                <tr class="total-row"><td colspan="4" class="right">Sub Total</td><td class="right">${this.currency(slip.earnings_total)}</td></tr>
                <tr><td colspan="4" class="right">Deductions</td><td class="right">-${this.currency(slip.deductions_total)}</td></tr>
                <tr class="net-row"><td colspan="4" class="right">Net Salary</td><td class="right">${this.currency(slip.net_salary)}</td></tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;
  }

  escapeHtml(value: string) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
