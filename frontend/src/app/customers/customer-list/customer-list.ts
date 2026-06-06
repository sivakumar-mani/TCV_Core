import { Component } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, themeBalham } from 'ag-grid-community';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CustomerServices } from '../../services/customer-services';
import { CommonMethods } from '../../shared/common-methods';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-customer-list',
  imports: [AgGridModule],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
})
export class CustomerList {
  customerList: any[] = [];
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [10, 25, 50, 100];
  public theme = themeBalham;

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true,
    minWidth: 130,
    flex: 1,
    headerClass: 'ag-header-style'
  };

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => (params.node?.rowIndex ?? 0) + 1, filter: false },
    { field: 'customer_name', headerName: 'Customer Name', minWidth: 190 },
    { field: 'contact_person', headerName: 'Contact Person', minWidth: 160 },
    { field: 'phone', headerName: 'Phone', minWidth: 130 },
    { field: 'email', headerName: 'Email', minWidth: 190 },
    { field: 'city', headerName: 'City', minWidth: 130 },
    { field: 'customer_type', headerName: 'Type', minWidth: 130 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      valueFormatter: (params) => this.getStatusLabel(params.value)
    },
    {
      headerName: 'Action',
      minWidth: 150,
      filter: false,
      sortable: false,
      cellRenderer: (params: any) => {
        const wrap = document.createElement('div');
        wrap.className = 'ag-action-group';

        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn btn-link btn-sm p-0 me-3';
        edit.innerText = 'Edit';
        edit.addEventListener('click', () => this.editCustomer(params.data));

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btn-link btn-sm text-danger p-0';
        del.innerText = 'Delete';
        del.addEventListener('click', () => this.deleteCustomer(params.data));

        wrap.append(edit, del);
        return wrap;
      }
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
        this.customerList = response?.data ?? response ?? [];
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

  deleteCustomer(row: any) {
    if (!confirm(`Delete customer ${row.customer_name}?`)) return;
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
}
