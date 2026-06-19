import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { EmployeeAttendanceServices } from '../services/employee-attendance-services';
import { EmployeeServices } from '../services/employee-services';
import { AgGridList } from '../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../shared/common-methods';
import { InputFormField } from '../shared/input-form-field/input-form-field';
import { ActionMenu } from '../shared/list-action-menu';
import { SelectFormField } from '../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-employee-attendance',
  imports: [CommonModule, ReactiveFormsModule, AgGridList, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './employee-attendance.html',
  styleUrl: './employee-attendance.scss',
})
export class EmployeeAttendance {
  form!: FormGroup;
  rows: any[] = [];
  employees: any[] = [];
  employeeOptionList: { label: string; value: string | number }[] = [{ label: 'Select employee', value: '' }];
  selectedId: number | null = null;

  statuses = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY'];
  statusOptionList = this.statuses.map((status) => ({ label: status, value: status }));

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'attendance_date', headerName: 'Date', valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'employee_code', headerName: 'Code', maxWidth: 120 },
    { field: 'employee_name', headerName: 'Employee' },
    { field: 'status', headerName: 'Status', maxWidth: 130 },
    { field: 'check_in', headerName: 'Check In', maxWidth: 120 },
    { field: 'check_out', headerName: 'Check Out', maxWidth: 120 },
    { field: 'remarks', headerName: 'Remarks' },
    {
      headerName: 'Action',
      maxWidth: 110,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'Edit', action: (row: any) => this.edit(row) },
          { label: 'Delete', action: (row: any) => this.delete(row) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private fb: FormBuilder,
    private attendanceService: EmployeeAttendanceServices,
    private employeeService: EmployeeServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      employee_id: ['', Validators.required],
      attendance_date: [this.toInputDate(new Date()), Validators.required],
      status: ['PRESENT', Validators.required],
      check_in: [''],
      check_out: [''],
      remarks: ['']
    });
    this.loadEmployees();
    this.loadRows();
  }

  loadEmployees() {
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => {
        this.employees = Array.isArray(response) ? response : response.data ?? [];
        this.employeeOptionList = [
          { label: 'Select employee', value: '' },
          ...this.employees.map((employee) => ({
            label: `${employee.employee_code} - ${employee.employee_name}`,
            value: employee.employee_id
          }))
        ];
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadRows() {
    this.ngxLoader.start();
    this.attendanceService.getAttendance().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.rows = response?.data ?? [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = { ...this.form.value, attendance_id: this.selectedId };
    const request = this.selectedId
      ? this.attendanceService.updateAttendance(payload)
      : this.attendanceService.addAttendance(payload);
    request.subscribe({
      next: (response: any) => {
        this.commonMethods.handleTokenAndMessage(response);
        this.reset();
        this.loadRows();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  edit(row: any) {
    this.selectedId = row.attendance_id;
    this.form.patchValue({
      ...row,
      attendance_date: this.toInputDate(row.attendance_date)
    });
  }

  delete(row: any) {
    if (!confirm(`Delete attendance for ${row.employee_name}?`)) return;
    this.attendanceService.deleteAttendance({ attendance_id: row.attendance_id }).subscribe({
      next: (response: any) => {
        this.commonMethods.handleTokenAndMessage(response);
        this.loadRows();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  reset() {
    this.selectedId = null;
    this.form.reset({ attendance_date: this.toInputDate(new Date()), status: 'PRESENT' });
  }

  toInputDate(value: string | Date) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
  }

  displayDate(value: string | Date) {
    if (!value) return '';
    const date = new Date(value);
    return `${`${date.getDate()}`.padStart(2, '0')}/${`${date.getMonth() + 1}`.padStart(2, '0')}/${date.getFullYear()}`;
  }

}
