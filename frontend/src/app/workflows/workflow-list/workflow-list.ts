import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { WorkflowServices } from '../../services/workflow-services';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../../shared/common-methods';
import { ActionMenu } from '../../shared/list-action-menu';

@Component({
  selector: 'app-workflow-list',
  imports: [AgGridList],
  templateUrl: './workflow-list.html',
  styleUrl: './workflow-list.scss',
})
export class WorkflowList {
  workflows: any[] = [];

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
    { field: 'module_name', headerName: 'Module', maxWidth: 140 },
    { field: 'reference_no', headerName: 'Reference No', maxWidth: 170 },
    { field: 'customer_name', headerName: 'Customer' },
    { field: 'quotation_date', headerName: 'Quotation Date', maxWidth: 150, valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'net_amount', headerName: 'Amount', maxWidth: 140, valueFormatter: (params) => this.money(params.value) },
    { field: 'quotation_status', headerName: 'Quote Status', maxWidth: 150 },
    { field: 'workflow_status', headerName: 'Approval Status', maxWidth: 160 },
    { field: 'requested_at', headerName: 'Requested At', maxWidth: 180, valueFormatter: (params) => this.displayDateTime(params.value) },
    {
      headerName: 'Action',
      maxWidth: 120,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'Review', action: (row: any) => this.review(row) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private workflowService: WorkflowServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadWorkflows();
  }

  loadWorkflows() {
    this.ngxLoader.start();
    this.workflowService.getWorkflowApprovals().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.workflows = Array.isArray(response) ? response : response.data ?? [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  review(row: any) {
    if (row.module_name === 'QUOTATION') {
      this.router.navigate(['/quotations/preview', row.reference_id]);
    }
  }

  money(value: number | string) {
    return `Rs. ${(Number(value) || 0).toFixed(2)}`;
  }

  displayDate(value: string | Date) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }

  displayDateTime(value: string | Date) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }
}
