import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { QuotationServices } from '../../services/quotation-services';
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
  workflowRows: any[] = [];

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
    { field: 'module_name', headerName: 'Module', maxWidth: 150 },
    { field: 'reference_no', headerName: 'Reference No', maxWidth: 170 },
    { headerName: 'Party', valueGetter: (params: any) => params.data?.customer_name || params.data?.supplier_name || '' },
    { field: 'net_amount', headerName: 'Amount', maxWidth: 140, valueFormatter: (params) => this.money(params.value) },
    { field: 'balance_amount', headerName: 'Balance', maxWidth: 140, valueFormatter: (params) => this.money(params.value) },
    { field: 'workflow_status', headerName: 'Workflow', maxWidth: 140 },
    { headerName: 'Status', maxWidth: 170, valueGetter: (params: any) => params.data?.quotation_status || params.data?.workflow_status },
    { field: 'quotation_version', headerName: 'Version', maxWidth: 110 },
    { field: 'requested_at', headerName: 'Requested', maxWidth: 180, valueFormatter: (params) => this.displayDate(params.value) },
    {
      headerName: 'Action',
      maxWidth: 110,
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
    private quotationService: QuotationServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadWorkflow();
  }

  loadWorkflow() {
    this.ngxLoader.start();
    this.quotationService.getWorkflow().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.workflowRows = Array.isArray(response) ? response : response.data ?? [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  review(row: any) {
    if (row.module_name === 'SUPPLIER_PAYMENT') {
      this.router.navigate(['/purchases/edit', row.reference_id], {
        queryParams: { review: true, workflowId: row.workflow_id }
      });
      return;
    }
    if (row.module_name === 'SUPPLIER') {
      const supplierId = row.supplier_id || row.reference_id;
      this.router.navigate(['/suppliers/edit', supplierId], {
        queryParams: { review: true, workflowId: row.workflow_id }
      });
      return;
    }
    this.router.navigate(['/quotations/review', row.reference_id]);
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
}
