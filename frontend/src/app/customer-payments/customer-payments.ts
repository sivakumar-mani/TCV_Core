import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CustomerPaymentServices } from '../services/customer-payment-services';
import { CustomerServices } from '../services/customer-services';
import { EmployeeServices } from '../services/employee-services';
import { AgGridList } from '../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../shared/common-methods';
import { InputFormField } from '../shared/input-form-field/input-form-field';
import { ActionMenu } from '../shared/list-action-menu';
import { SelectFormField } from '../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-customer-payments',
  imports: [CommonModule, ReactiveFormsModule, AgGridList, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './customer-payments.html',
  styleUrl: './customer-payments.scss',
})
export class CustomerPayments {
  form!: FormGroup;
  rows: any[] = [];
  customers: any[] = [];
  employees: any[] = [];
  selectedId: number | null = null;
  paymentModes = ['CASH', 'CARD', 'UPI', 'BANK', 'CHEQUE', 'ONLINE'];

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'payment_date', headerName: 'Date', valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'customer_name', headerName: 'Customer' },
    { field: 'invoice_no', headerName: 'Invoice' },
    { field: 'amount', headerName: 'Amount', valueFormatter: (params) => this.money(params.value) },
    { field: 'payment_mode', headerName: 'Mode' },
    { field: 'reference_no', headerName: 'Reference No' },
    { field: 'received_by_employee_name', headerName: 'Received By' },
    {
      headerName: 'Action',
      maxWidth: 110,
      cellRenderer: ActionMenu,
      cellRendererParams: { dropdownMenu: [
        { label: 'Edit', action: (row: any) => this.edit(row) },
        { label: 'Delete', action: (row: any) => this.delete(row) }
      ] },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private fb: FormBuilder,
    private paymentService: CustomerPaymentServices,
    private customerService: CustomerServices,
    private employeeService: EmployeeServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      customer_id: ['', Validators.required],
      sales_id: [''],
      amount: [0, [Validators.required, Validators.min(1)]],
      payment_date: [this.toInputDate(new Date()), Validators.required],
      payment_mode: ['CASH', Validators.required],
      reference_no: [''],
      payment_against: ['INVOICE'],
      narration: [''],
      received_by_employee_id: ['']
    });
    this.loadLookups();
    this.loadRows();
  }

  loadLookups() {
    this.customerService.getCustomers().subscribe({
      next: (response: any) => this.customers = Array.isArray(response) ? response : response.data ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => this.employees = Array.isArray(response) ? response : response.data ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadRows() {
    this.ngxLoader.start();
    this.paymentService.getPayments().subscribe({
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
    const payload = { ...this.form.value, payment_id: this.selectedId };
    const request = this.selectedId ? this.paymentService.updatePayment(payload) : this.paymentService.addPayment(payload);
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
    this.selectedId = row.payment_id;
    this.form.patchValue({ ...row, payment_date: this.toInputDate(row.payment_date) });
  }

  delete(row: any) {
    if (!confirm(`Delete payment Rs. ${row.amount}?`)) return;
    this.paymentService.deletePayment({ payment_id: row.payment_id }).subscribe({
      next: (response: any) => {
        this.commonMethods.handleTokenAndMessage(response);
        this.loadRows();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  reset() {
    this.selectedId = null;
    this.form.reset({ amount: 0, payment_date: this.toInputDate(new Date()), payment_mode: 'CASH', payment_against: 'INVOICE' });
  }

  toInputDate(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
  }

  displayDate(value: string | Date) {
    if (!value) return '';
    const date = new Date(value);
    return `${`${date.getDate()}`.padStart(2, '0')}/${`${date.getMonth() + 1}`.padStart(2, '0')}/${date.getFullYear()}`;
  }

  money(value: any) {
    return `Rs. ${(Number(value) || 0).toFixed(2)}`;
  }

  customerOptions() {
    return [
      { label: 'Select customer', value: '' },
      ...this.customers.map((customer) => ({
        label: customer.display_customer_name || customer.customer_name,
        value: customer.customer_id
      }))
    ];
  }

  employeeOptions() {
    return [
      { label: 'Select employee', value: '' },
      ...this.employees.map((employee) => ({ label: employee.employee_name, value: employee.employee_id }))
    ];
  }

  paymentModeOptions() {
    return this.paymentModes.map((mode) => ({ label: mode, value: mode }));
  }
}
