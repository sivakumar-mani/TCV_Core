import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CustomerServices } from '../services/customer-services';
import { EmployeeServices } from '../services/employee-services';
import { ProductService } from '../services/product-service';
import { ServiceTicketServices } from '../services/service-ticket-services';
import { AgGridList } from '../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../shared/common-methods';
import { InputFormField } from '../shared/input-form-field/input-form-field';
import { ActionMenu } from '../shared/list-action-menu';
import { SelectFormField } from '../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-service-tickets',
  imports: [CommonModule, ReactiveFormsModule, AgGridList, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './service-tickets.html',
  styleUrl: './service-tickets.scss',
})
export class ServiceTickets {
  form!: FormGroup;
  rows: any[] = [];
  customers: any[] = [];
  employees: any[] = [];
  products: any[] = [];
  customerOptionList: { label: string; value: string | number }[] = [{ label: 'Select customer', value: '' }];
  employeeOptionList: { label: string; value: string | number }[] = [{ label: 'Select employee', value: '' }];
  productOptionList: { label: string; value: string | number }[] = [{ label: 'Select product', value: '' }];
  selectedId: number | null = null;
  statuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED'];
  priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  statusOptionList = this.optionList(this.statuses);
  priorityOptionList = this.optionList(this.priorities);

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'ticket_no', headerName: 'Ticket No' },
    { field: 'opened_date', headerName: 'Opened', valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'customer_name', headerName: 'Customer' },
    { field: 'assigned_employee_name', headerName: 'Assigned To' },
    { field: 'service_status', headerName: 'Status' },
    { field: 'priority', headerName: 'Priority' },
    { field: 'complaint_details', headerName: 'Complaint' },
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
    private ticketService: ServiceTicketServices,
    private customerService: CustomerServices,
    private employeeService: EmployeeServices,
    private productService: ProductService,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      ticket_no: [''],
      customer_id: ['', Validators.required],
      product_id: [''],
      assigned_to_employee_id: [''],
      complaint_details: ['', Validators.required],
      service_status: ['OPEN', Validators.required],
      priority: ['MEDIUM', Validators.required],
      opened_date: [this.toInputDate(new Date()), Validators.required],
      closed_date: [''],
      resolution_notes: [''],
      resolution_time_hours: ['']
    });
    this.loadLookups();
    this.loadRows();
  }

  loadLookups() {
    this.customerService.getCustomers().subscribe({
      next: (r: any) => {
        this.customers = Array.isArray(r) ? r : r.data ?? [];
        this.customerOptionList = [
          { label: 'Select customer', value: '' },
          ...this.customers.map((customer) => ({
            label: customer.display_customer_name || customer.customer_name,
            value: customer.customer_id
          }))
        ];
      },
      error: (e: any) => this.commonMethods.handleError(e)
    });
    this.employeeService.getEmployees().subscribe({
      next: (r: any) => {
        this.employees = Array.isArray(r) ? r : r.data ?? [];
        this.employeeOptionList = [
          { label: 'Select employee', value: '' },
          ...this.employees.map((employee) => ({ label: employee.employee_name, value: employee.employee_id }))
        ];
      },
      error: (e: any) => this.commonMethods.handleError(e)
    });
    this.productService.getProduct().subscribe({
      next: (r: any) => {
        this.products = Array.isArray(r) ? r : r.data ?? [];
        this.productOptionList = [
          { label: 'Select product', value: '' },
          ...this.products.map((product) => ({ label: product.product_name, value: product.product_id }))
        ];
      },
      error: (e: any) => this.commonMethods.handleError(e)
    });
  }

  loadRows() {
    this.ngxLoader.start();
    this.ticketService.getTickets().subscribe({
      next: (response: any) => { this.ngxLoader.stop(); this.rows = response?.data ?? []; },
      error: (error: any) => { this.ngxLoader.stop(); this.commonMethods.handleError(error); }
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = { ...this.form.value, service_ticket_id: this.selectedId };
    const request = this.selectedId ? this.ticketService.updateTicket(payload) : this.ticketService.addTicket(payload);
    request.subscribe({
      next: (response: any) => { this.commonMethods.handleTokenAndMessage(response); this.reset(); this.loadRows(); },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  edit(row: any) {
    this.selectedId = row.service_ticket_id;
    this.form.patchValue({ ...row, opened_date: this.toInputDate(row.opened_date), closed_date: row.closed_date ? this.toInputDate(row.closed_date) : '' });
  }

  delete(row: any) {
    if (!confirm(`Delete ticket ${row.ticket_no}?`)) return;
    this.ticketService.deleteTicket({ service_ticket_id: row.service_ticket_id }).subscribe({
      next: (response: any) => { this.commonMethods.handleTokenAndMessage(response); this.loadRows(); },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  reset() {
    this.selectedId = null;
    this.form.reset({ opened_date: this.toInputDate(new Date()), service_status: 'OPEN', priority: 'MEDIUM' });
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

  optionList(values: string[]) {
    return values.map((value) => ({ label: value, value }));
  }
}
