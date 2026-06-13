import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { EmployeeServices } from '../services/employee-services';
import { EmployeeSalaryServices } from '../services/employee-salary-services';
import { AgGridList } from '../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../shared/common-methods';
import { ActionMenu } from '../shared/list-action-menu';

type SalaryItemType = 'EARNING' | 'DEDUCTION';

@Component({
  selector: 'app-employee-salary',
  imports: [CommonModule, ReactiveFormsModule, AgGridList],
  templateUrl: './employee-salary.html',
  styleUrl: './employee-salary.scss',
})
export class EmployeeSalary {
  salaryForm!: FormGroup;
  salaries: any[] = [];
  employees: any[] = [];
  selectedSalaryId: number | null = null;

  defaultColDef: ColDef = {
    resizable: true,
    minWidth: 120,
    flex: 1,
    filter: true,
    floatingFilter: true,
    headerClass: 'ag-header-style',
  };

  salaryColDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    {
      headerName: 'Employee',
      valueGetter: (params: any) => `${params.data?.employee_code || ''} - ${params.data?.employee_name || `${params.data?.first_name || ''} ${params.data?.last_name || ''}`.trim()}`.trim(),
    },
    {
      headerName: 'Month',
      valueGetter: (params: any) => `${this.monthName(params.data?.salary_month)} ${params.data?.salary_year || ''}`.trim(),
    },
    {
      headerName: 'Period',
      valueGetter: (params: any) => `${this.displayDate(params.data?.period_start_date)} to ${this.displayDate(params.data?.period_end_date)}`,
    },
    {
      field: 'net_salary',
      headerName: 'Net Salary',
      maxWidth: 150,
      valueFormatter: (params) => this.money(params.value),
    },
    { field: 'status', headerName: 'Status', maxWidth: 130 },
    {
      headerName: 'Action',
      maxWidth: 110,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'Edit', action: (row: any) => this.editSalary(row.salary_id) },
          { label: 'PDF', action: (row: any) => this.downloadExistingPdf(row) },
          { label: 'Delete', action: (row: any) => this.deleteSalary(row.salary_id) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  months = [
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
    { value: 12, label: 'December' },
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
    this.loadSalaries();
  }

  get items() {
    return this.salaryForm.get('items') as FormArray;
  }

  buildForm() {
    const today = new Date();

    this.salaryForm = this.fb.group({
      employee_id: ['', Validators.required],
      company_name: ['TCV', Validators.required],
      salary_month: [today.getMonth() + 1, Validators.required],
      salary_year: [today.getFullYear(), Validators.required],
      period_start_date: [this.toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)), Validators.required],
      period_end_date: [this.toInputDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)), Validators.required],
      status: ['FINAL', Validators.required],
      remarks: [''],
      items: this.fb.array([]),
    });

    this.addItem('EARNING', 'Basic Salary');
    this.addItem('DEDUCTION', 'Deduction');
  }

  loadEmployees() {
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => {
        this.employees = Array.isArray(response) ? response : response?.data || [];
      },
      error: (error: any) => this.commonMethods.handleError(error),
    });
  }

  loadSalaries() {
    this.ngxLoader.start();
    this.salaryService.getSalaries().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.salaries = response?.data || [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      },
    });
  }

  addItem(type: SalaryItemType = 'EARNING', description = '') {
    this.items.push(
      this.fb.group({
        item_type: [type, Validators.required],
        description: [description, Validators.required],
        qty: [1, [Validators.required, Validators.min(0)]],
        price: [0, [Validators.required, Validators.min(0)]],
      })
    );
  }

  removeItem(index: number) {
    if (this.items.length === 1) return;
    this.items.removeAt(index);
  }

  lineTotal(index: number) {
    const item = this.items.at(index).value;
    return this.toNumber(item.qty) * this.toNumber(item.price);
  }

  earningsTotal() {
    return this.items.controls
      .filter((control) => control.value.item_type === 'EARNING')
      .reduce((total, control) => total + this.lineTotal(this.items.controls.indexOf(control)), 0);
  }

  deductionsTotal() {
    return this.items.controls
      .filter((control) => control.value.item_type === 'DEDUCTION')
      .reduce((total, control) => total + this.lineTotal(this.items.controls.indexOf(control)), 0);
  }

  netSalary() {
    return this.earningsTotal() - this.deductionsTotal();
  }

  editSalary(salaryId: number) {
    this.ngxLoader.start();
    this.salaryService.getSalaryById(salaryId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const salary = response?.data;
        if (!salary) return;

        this.selectedSalaryId = salary.salary_id;
        this.items.clear();
        (salary.items || []).forEach((item: any) => {
          this.items.push(
            this.fb.group({
              item_type: [item.item_type, Validators.required],
              description: [item.description, Validators.required],
              qty: [Number(item.qty), [Validators.required, Validators.min(0)]],
              price: [Number(item.price), [Validators.required, Validators.min(0)]],
            })
          );
        });

        this.salaryForm.patchValue({
          employee_id: salary.employee_id,
          company_name: salary.company_name,
          salary_month: salary.salary_month,
          salary_year: salary.salary_year,
          period_start_date: this.toInputDate(salary.period_start_date),
          period_end_date: this.toInputDate(salary.period_end_date),
          status: salary.status,
          remarks: salary.remarks,
        });
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      },
    });
  }

  submit() {
    if (this.salaryForm.invalid || this.items.length === 0) {
      this.salaryForm.markAllAsTouched();
      return;
    }

    const formData = this.salaryForm.value;
    const payload = {
      ...formData,
      salary_id: this.selectedSalaryId,
      earnings_total: this.earningsTotal(),
      deductions_total: this.deductionsTotal(),
      net_salary: this.netSalary(),
      salary_amount: this.earningsTotal(),
      items: formData.items.map((item: any, index: number) => ({
        ...item,
        line_no: index + 1,
        qty: this.toNumber(item.qty),
        price: this.toNumber(item.price),
        total: this.toNumber(item.qty) * this.toNumber(item.price),
      })),
    };

    this.ngxLoader.start();
    const request = this.selectedSalaryId
      ? this.salaryService.updateSalary(payload)
      : this.salaryService.addSalary(payload);

    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.resetForm();
        this.loadSalaries();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      },
    });
  }

  deleteSalary(salaryId: number) {
    this.salaryService.deleteSalary({ salary_id: salaryId }).subscribe({
      next: (response: any) => {
        this.commonMethods.handleTokenAndMessage(response);
        if (this.selectedSalaryId === salaryId) this.resetForm();
        this.loadSalaries();
      },
      error: (error: any) => this.commonMethods.handleError(error),
    });
  }

  resetForm() {
    this.selectedSalaryId = null;
    this.items.clear();
    this.salaryForm.reset({
      company_name: 'TCV',
      salary_month: new Date().getMonth() + 1,
      salary_year: new Date().getFullYear(),
      period_start_date: this.toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
      period_end_date: this.toInputDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)),
      status: 'FINAL',
    });
    this.addItem('EARNING', 'Basic Salary');
    this.addItem('DEDUCTION', 'Deduction');
  }

  downloadPdf(salary = this.currentSlipData()) {
    const pdf = this.createSalarySlipPdf(salary);
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `salary-slip-${salary.employee_name}-${salary.salary_month}-${salary.salary_year}.pdf`.replace(/\s+/g, '-');
    anchor.click();
    URL.revokeObjectURL(url);
  }

  downloadExistingPdf(salary: any) {
    this.salaryService.getSalaryById(salary.salary_id).subscribe({
      next: (response: any) => this.downloadPdf(this.mapSlipData(response?.data)),
      error: (error: any) => this.commonMethods.handleError(error),
    });
  }

  currentSlipData() {
    const value = this.salaryForm.value;
    const employee = this.employees.find((item) => Number(item.employee_id) === Number(value.employee_id));

    return this.mapSlipData({
      ...value,
      employee_code: employee?.employee_code,
      first_name: employee?.first_name,
      last_name: employee?.last_name,
      items: value.items.map((item: any) => ({
        ...item,
        total: this.toNumber(item.qty) * this.toNumber(item.price),
      })),
      earnings_total: this.earningsTotal(),
      deductions_total: this.deductionsTotal(),
      net_salary: this.netSalary(),
    });
  }

  mapSlipData(data: any) {
    return {
      ...data,
      employee_name: data.employee_name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      period_start_date: this.toInputDate(data.period_start_date),
      period_end_date: this.toInputDate(data.period_end_date),
      earnings_total: this.toNumber(data.earnings_total),
      deductions_total: this.toNumber(data.deductions_total),
      net_salary: this.toNumber(data.net_salary),
      items: data.items || [],
    };
  }

  createSalarySlipPdf(salary: any) {
    const commands: string[] = [];
    const pageLeft = 40;
    const pageRight = 555;
    const tableTop = 640;
    const rowHeight = 24;
    const itemRows = Math.max(salary.items.length, 1);
    const tableBottom = tableTop - rowHeight * (itemRows + 1);
    const columns = [40, 80, 150, 330, 385, 465, 555];

    this.pdfRect(commands, pageLeft, 690, pageRight - pageLeft, 112);
    this.pdfText(commands, pageLeft + 14, 775, 18, salary.company_name || 'TCV');
    this.pdfText(commands, pageLeft + 14, 752, 14, 'Salary Slip');
    this.pdfText(commands, pageLeft + 14, 726, 10, `Employee: ${salary.employee_name}`);
    this.pdfText(commands, 330, 726, 10, `Code: ${salary.employee_code || ''}`);
    this.pdfText(commands, pageLeft + 14, 708, 10, `Month/Year: ${this.monthName(salary.salary_month)} ${salary.salary_year}`);
    this.pdfText(commands, 330, 708, 10, `Period: ${this.displayDate(salary.period_start_date)} to ${this.displayDate(salary.period_end_date)}`);

    this.pdfRect(commands, pageLeft, tableBottom, pageRight - pageLeft, tableTop - tableBottom);
    columns.forEach((x) => this.pdfLine(commands, x, tableBottom, x, tableTop));
    for (let y = tableTop; y >= tableBottom; y -= rowHeight) {
      this.pdfLine(commands, pageLeft, y, pageRight, y);
    }

    this.pdfText(commands, 48, 625, 10, 'S.No');
    this.pdfText(commands, 88, 625, 10, 'Type');
    this.pdfText(commands, 158, 625, 10, 'Description');
    this.pdfRightText(commands, 377, 625, 10, 'Qty');
    this.pdfRightText(commands, 457, 625, 10, 'Price');
    this.pdfRightText(commands, 547, 625, 10, 'Total');

    salary.items.forEach((item: any, index: number) => {
      const y = tableTop - rowHeight * (index + 1) + 9;
      this.pdfText(commands, 48, y, 9, String(index + 1));
      this.pdfText(commands, 88, y, 9, item.item_type);
      this.pdfText(commands, 158, y, 9, String(item.description || '').slice(0, 30));
      this.pdfRightText(commands, 377, y, 9, this.decimal(item.qty));
      this.pdfRightText(commands, 457, y, 9, this.money(item.price));
      this.pdfRightText(commands, 547, y, 9, this.money(item.total));
    });

    const totalsTop = tableBottom - 22;
    this.pdfRect(commands, 330, totalsTop - 74, 225, 74);
    this.pdfLine(commands, 330, totalsTop - 25, 555, totalsTop - 25);
    this.pdfLine(commands, 330, totalsTop - 50, 555, totalsTop - 50);
    this.pdfLine(commands, 450, totalsTop - 74, 450, totalsTop);
    this.pdfText(commands, 342, totalsTop - 16, 10, 'Sub Total');
    this.pdfRightText(commands, 545, totalsTop - 16, 10, this.money(salary.earnings_total));
    this.pdfText(commands, 342, totalsTop - 41, 10, 'Deductions');
    this.pdfRightText(commands, 545, totalsTop - 41, 10, this.money(salary.deductions_total));
    this.pdfText(commands, 342, totalsTop - 66, 12, 'Net Salary');
    this.pdfRightText(commands, 545, totalsTop - 66, 12, this.money(salary.net_salary));

    const content = `${commands.join('\n')}\n`;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${content.length} >> stream\n${content}endstream endobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object) => {
      offsets.push(pdf.length);
      pdf += `${object}\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return pdf;
  }

  pdfText(commands: string[], x: number, y: number, size: number, value: string) {
    commands.push(`BT /F1 ${size} Tf ${x} ${y} Td (${this.escapePdf(String(value))}) Tj ET`);
  }

  pdfRightText(commands: string[], rightX: number, y: number, size: number, value: string) {
    const text = String(value);
    const approximateWidth = text.length * size * 0.52;
    this.pdfText(commands, Number((rightX - approximateWidth).toFixed(2)), y, size, text);
  }

  pdfLine(commands: string[], x1: number, y1: number, x2: number, y2: number) {
    commands.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  }

  pdfRect(commands: string[], x: number, y: number, width: number, height: number) {
    commands.push(`${x} ${y} ${width} ${height} re S`);
  }

  escapePdf(value: string) {
    return value.replace(/[^\x20-\x7E]/g, '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  monthName(month: number) {
    return this.months.find((item) => Number(item.value) === Number(month))?.label || '';
  }

  money(value: number) {
    return `Rs. ${this.toNumber(value).toFixed(2)}`;
  }

  decimal(value: number) {
    return this.toNumber(value).toFixed(2);
  }

  toNumber(value: any) {
    return Number.parseFloat(value || 0) || 0;
  }

  toInputDate(value: string | Date) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  displayDate(value: string | Date) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }
}
