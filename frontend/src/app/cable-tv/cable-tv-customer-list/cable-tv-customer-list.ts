import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../../shared/common-methods';
import { ActionMenu } from '../../shared/list-action-menu';

@Component({
  selector: 'app-cable-tv-customer-list',
  imports: [AgGridList],
  templateUrl: './cable-tv-customer-list.html',
  styleUrl: './cable-tv-customer-list.scss'
})
export class CableTvCustomerList {
  customers: any[] = [];

  defaultColDef: ColDef = {
    resizable: true,
    minWidth: 130,
    flex: 1,
    filter: true,
    floatingFilter: true,
    headerClass: 'ag-header-style'
  };

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'network_name', headerName: 'Network', maxWidth: 130 },
    { field: 'network_type', headerName: 'Network Type', maxWidth: 140 },
    { field: 'customer_code', headerName: 'Customer No', maxWidth: 150 },
    { field: 'full_name', headerName: 'Customer Name', minWidth: 190 },
    { field: 'door_no', headerName: 'Door No', maxWidth: 130 },
    { field: 'location_name', headerName: 'Location' },
    { field: 'area_name', headerName: 'Area' },
    { field: 'street_name', headerName: 'Street' },
    { field: 'city', headerName: 'City', maxWidth: 130 },
    { field: 'pincode', headerName: 'Pincode', maxWidth: 130 },
    { field: 'mobile_no', headerName: 'Mobile', maxWidth: 140 },
    { field: 'aadhaar_no', headerName: 'Aadhaar', maxWidth: 150 },
    { field: 'alternate_mobile_no', headerName: 'Alt Mobile', maxWidth: 140 },
    { field: 'source_name', headerName: 'Source' },
    { field: 'installed_by_name', headerName: 'Installed By' },
    { field: 'stb_amount', headerName: 'STB Amount', maxWidth: 140 },
    { field: 'stb_discount', headerName: 'STB Discount', maxWidth: 150 },
    { field: 'connection_charge', headerName: 'Connection Charge', maxWidth: 170 },
    { field: 'connection_discount', headerName: 'Connection Discount', maxWidth: 180 },
    { field: 'labour_service_charge', headerName: 'Labour / Service', maxWidth: 160 },
    { field: 'subscription_amount', headerName: 'Monthly Subscription', maxWidth: 190 },
    { field: 'overall_discount', headerName: 'Overall Discount', maxWidth: 170 },
    { field: 'grand_total', headerName: 'Grand Total', maxWidth: 150 },
    { field: 'customer_paid_amount', headerName: 'Paid Amount', maxWidth: 150 },
    { field: 'balance_amount', headerName: 'Balance', maxWidth: 140 },
    { field: 'due_date', headerName: 'Due Date', maxWidth: 140 },
    { field: 'account_status', headerName: 'Account Status', maxWidth: 150 },
    { field: 'status', headerName: 'Status', maxWidth: 130 },
    { field: 'approval_status', headerName: 'Approval', maxWidth: 130 },
    {
      headerName: 'Action',
      maxWidth: 110,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'Edit Customer', action: (row: any) => this.editCustomer(row) },
          { label: 'Connection + Materials', action: (row: any) => this.openDetails(row) },
          { label: 'STB Details', action: (row: any) => this.openDetails(row) },
          { label: 'Package Details', action: (row: any) => this.openDetails(row) },
          { label: 'Subscription Details', action: (row: any) => this.openDetails(row) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.ngxLoader.start();
    this.cableTvService.getCustomers().subscribe({
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
    this.router.navigateByUrl('/cable-tv/customers/add');
  }

  editCustomer(row: any) {
    this.router.navigate(['/cable-tv/customers/edit', row.cable_customer_id]);
  }

  openDetails(row: any) {
    this.router.navigate(['/cable-tv/customers/edit', row.cable_customer_id], {
      queryParams: { details: true }
    });
  }
}
