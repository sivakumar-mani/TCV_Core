import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { QuotationServices } from '../../services/quotation-services';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../../shared/common-methods';
import { ActionMenu } from '../../shared/list-action-menu';

@Component({
  selector: 'app-quotation-list',
  imports: [AgGridList],
  templateUrl: './quotation-list.html',
  styleUrl: './quotation-list.scss',
})
export class QuotationList {
  quotations: any[] = [];

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
    { field: 'quotation_no', headerName: 'Quotation No', maxWidth: 170 },
    { field: 'quotation_version', headerName: 'Version', maxWidth: 110 },
    { field: 'customer_name', headerName: 'Customer' },
    {
      headerName: 'Created By',
      minWidth: 190,
      valueGetter: (params: any) => this.createdByLabel(params.data)
    },
    { field: 'prepared_by_department', headerName: 'Department', maxWidth: 150 },
    { field: 'quotation_date', headerName: 'Date', maxWidth: 140, valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'valid_until', headerName: 'Valid Until', maxWidth: 140, valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'item_count', headerName: 'Items', maxWidth: 100 },
    { field: 'total_qty', headerName: 'Qty', maxWidth: 100, valueFormatter: (params) => this.decimal(params.value) },
    { field: 'net_amount', headerName: 'Net Amount', maxWidth: 150, valueFormatter: (params) => this.money(params.value) },
    { field: 'quotation_status', headerName: 'Status', maxWidth: 140 },
    { field: 'workflow_status', headerName: 'Workflow', maxWidth: 140 },
    {
      headerName: 'Action',
      maxWidth: 120,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'Preview', action: (row: any) => this.previewQuotation(row) },
          { label: 'Edit', action: (row: any) => this.editQuotation(row) },
          { label: 'Accepted', action: (row: any) => this.setCustomerResponse(row, 'ACCEPTED') },
          { label: 'Cancelled', action: (row: any) => this.setCustomerResponse(row, 'CANCELLED') },
          { label: 'Expired', action: (row: any) => this.setCustomerResponse(row, 'EXPIRED') },
          { label: 'Delete', action: (row: any) => this.deleteQuotation(row) }
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
    this.loadQuotations();
  }

  loadQuotations() {
    this.ngxLoader.start();
    this.quotationService.getQuotations().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.quotations = Array.isArray(response) ? response : response.data ?? [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addQuotation() {
    this.router.navigateByUrl('/quotations/add');
  }

  editQuotation(row: any) {
    this.router.navigate(['/quotations/edit', row.quotation_id]);
  }

  previewQuotation(row: any) {
    this.router.navigate(['/quotations/review', row.quotation_id]);
  }

  deleteQuotation(row: any) {
    if (!confirm(`Delete quotation ${row.quotation_no}?`)) return;

    this.ngxLoader.start();
    this.quotationService.deleteQuotation({ quotation_id: row.quotation_id }).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadQuotations();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  setCustomerResponse(row: any, status: 'ACCEPTED' | 'CANCELLED' | 'EXPIRED') {
    if (row.quotation_status !== 'SENT') {
      alert('Only quotations sent to the customer can be updated.');
      return;
    }
    if (!confirm(`Mark ${row.quotation_no} as ${status.toLowerCase()}?`)) return;
    this.quotationService.updateCustomerResponse(row.quotation_id, status).subscribe({
      next: (response: any) => {
        this.commonMethods.handleTokenAndMessage(response);
        this.loadQuotations();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  money(value: number | string) {
    return `Rs. ${(Number(value) || 0).toFixed(2)}`;
  }

  decimal(value: number | string) {
    return (Number(value) || 0).toFixed(2);
  }

  createdByLabel(row: any) {
    const name = row?.prepared_by_employee_name || '';
    const code = row?.prepared_by_employee_code || '';
    return [code, name].filter(Boolean).join(' - ') || 'Not assigned';
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
