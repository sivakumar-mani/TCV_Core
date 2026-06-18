import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CustomerServices } from '../../services/customer-services';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../../shared/common-methods';
import { ActionMenu } from '../../shared/list-action-menu';

@Component({
  selector: 'app-customer-list',
  imports: [AgGridList],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
})
export class CustomerList {
  customers: any[] = [];

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
    {
      field: 'display_customer_name',
      headerName: 'Customer Name',
      valueGetter: (params: any) => params.data?.display_customer_name || this.getCustomerName(params.data)
    },
    { field: 'contact_person', headerName: 'Contact Person' },
    { field: 'phone', headerName: 'Phone', maxWidth: 140 },
    { field: 'email', headerName: 'Email' },
    { field: 'customer_type', headerName: 'Type', maxWidth: 140 },
    { field: 'marketing_employee_name', headerName: 'Marketing Person' },
    { field: 'referral_details', headerName: 'Referral' },
    { field: 'city_district', headerName: 'City/District' },
    { field: 'state', headerName: 'State' },
    {
      field: 'credit_limit',
      headerName: 'Credit Limit',
      maxWidth: 150,
      valueFormatter: (params) => this.money(params.value),
    },
    {
      field: 'outstanding_balance',
      headerName: 'Outstanding',
      maxWidth: 150,
      valueFormatter: (params) => this.money(params.value),
    },
    {
      field: 'status',
      headerName: 'Status',
      maxWidth: 120,
      valueFormatter: (params) => this.getStatusLabel(params.value),
    },
    {
      headerName: 'Action',
      maxWidth: 110,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'Edit', action: (row: any) => this.editCustomer(row) },
          { label: 'Create Quotation', action: (row: any) => this.createQuotation(row) },
          { label: 'Delete', action: (row: any) => this.deleteCustomer(row) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private customerService: CustomerServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.ngxLoader.start();
    this.customerService.getCustomers().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.customers = Array.isArray(response) ? response : response.data ?? [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addCustomer() {
    this.router.navigateByUrl('/customers/add');
  }

  editCustomer(row: any) {
    this.router.navigate(['/customers/edit', row.customer_id]);
  }

  createQuotation(row: any) {
    this.router.navigate(['/quotations/add'], { queryParams: { customerId: row.customer_id } });
  }

  deleteCustomer(row: any) {
    if (!confirm(`Delete customer ${this.getCustomerName(row)}?`)) return;

    this.ngxLoader.start();
    this.customerService.deleteCustomer({ customer_id: row.customer_id }).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadCustomers();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  getStatusLabel(status: number | string) {
    return Number(status) === 1 ? 'Active' : 'Inactive';
  }

  money(value: number | string) {
    return `Rs. ${(Number(value) || 0).toFixed(2)}`;
  }

  getCustomerName(customer: any) {
    return [customer?.salutation, customer?.customer_name].filter(Boolean).join(' ');
  }
}
