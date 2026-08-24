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
    { field: 'approval_status', headerName: 'Approval', maxWidth: 140 },
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
          { label: 'Preview / PDF', action: (row: any) => this.previewWorkOrder(row) },
          { label: 'Material Issue', action: (row: any) => this.openMaterialIssue(row) },
          { label: 'Material Issue Preview / PDF', action: (row: any) => this.previewMaterialIssue(row) },
          { label: 'Create Invoice', action: (row: any) => this.createInvoice(row) },
          { label: 'Delete', action: (row: any) => this.deleteWorkOrder(row) }
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

  openMaterialIssue(row: any) {
    if (row.approval_status !== 'APPROVED' || row.work_status !== 'IN_PROGRESS' || Number(row.item_count) === 0) {
      alert('Material Issue is available only after the work order is moved to in progress and has work items.');
      return;
    }
    this.router.navigate(['/work-orders/material-issue', row.work_order_id]);
  }

  previewWorkOrder(row: any) {
    this.router.navigate(['/work-orders/preview', row.work_order_id]);
  }

  previewMaterialIssue(row: any) {
    if (Number(row.issue_count) === 0) {
      alert('No material issue is available for preview.');
      return;
    }
    this.router.navigate(['/work-orders/material-issue', row.work_order_id], { queryParams: { preview: true } });
  }

  deleteWorkOrder(row: any) {
    if (!confirm(`Delete work order ${row.work_order_no}?`)) return;
    this.workOrderService.deleteWorkOrder(row.work_order_id).subscribe({
      next: (response: any) => {
        this.commonMethods.handleTokenAndMessage(response);
        this.loadWorkOrders();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  createInvoice(row: any) {
    if (row.invoice_no) {
      alert(`Invoice already created: ${row.invoice_no}`);
      return;
    }

    if (row.work_status !== 'COMPLETED' || row.approval_status !== 'APPROVED') {
      alert('Invoice can be created only after the completed work order is approved.');
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
    if (Number.isNaN(date.getTime())) return String(value);
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }
}
