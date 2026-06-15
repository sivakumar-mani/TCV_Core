import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { WorkOrderServices } from '../../services/work-order-services';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../../shared/common-methods';
import { ActionMenu } from '../../shared/list-action-menu';

@Component({
  selector: 'app-work-order-list',
  imports: [AgGridList],
  templateUrl: './work-order-list.html',
  styleUrl: './work-order-list.scss',
})
export class WorkOrderList {
  workOrders: any[] = [];

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
    { field: 'work_order_no', headerName: 'Work Order No', maxWidth: 170 },
    { field: 'quotation_no', headerName: 'Quotation No', maxWidth: 170 },
    { field: 'customer_name', headerName: 'Customer' },
    { field: 'assigned_employee_name', headerName: 'Assigned To' },
    { field: 'work_type', headerName: 'Type', maxWidth: 140 },
    { field: 'work_status', headerName: 'Status', maxWidth: 140 },
    { field: 'priority', headerName: 'Priority', maxWidth: 120 },
    { field: 'start_date', headerName: 'Start Date', maxWidth: 140, valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'completion_date', headerName: 'Completion Date', maxWidth: 160, valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'item_count', headerName: 'Items', maxWidth: 100 },
    { field: 'issue_count', headerName: 'Issues', maxWidth: 100 },
    { field: 'invoice_no', headerName: 'Invoice No', maxWidth: 160 },
    {
      headerName: 'Action',
      maxWidth: 130,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'Edit', action: (row: any) => this.editWorkOrder(row) },
          { label: 'Create Invoice', action: (row: any) => this.createInvoice(row) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private workOrderService: WorkOrderServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadWorkOrders();
  }

  loadWorkOrders() {
    this.ngxLoader.start();
    this.workOrderService.getWorkOrders().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.workOrders = Array.isArray(response) ? response : response.data ?? [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addWorkOrder() {
    this.router.navigateByUrl('/work-orders/add');
  }

  editWorkOrder(row: any) {
    this.router.navigate(['/work-orders/edit', row.work_order_id]);
  }

  createInvoice(row: any) {
    if (row.invoice_no) {
      alert(`Invoice already created: ${row.invoice_no}`);
      return;
    }

    if (!confirm(`Create invoice for ${row.work_order_no}?`)) return;

    this.ngxLoader.start();
    this.workOrderService.createInvoice(row.work_order_id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadWorkOrders();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  displayDate(value: string | Date) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN');
  }
}
