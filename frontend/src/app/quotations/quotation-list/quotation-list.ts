import { Component } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, themeBalham } from 'ag-grid-community';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { ApprovalServices } from '../../services/approval-services';
import { CommonMethods } from '../../shared/common-methods';
import { QuotationServices } from '../../services/quotation-services';
import { downloadQuotationPdf } from '../../shared/quotation-pdf';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-quotation-list',
  imports: [AgGridModule],
  templateUrl: './quotation-list.html',
  styleUrl: './quotation-list.scss',
})
export class QuotationList {
  quotationList: any[] = [];
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
    { field: 'quotation_no', headerName: 'Quotation No', minWidth: 170 },
    { field: 'quotation_date', headerName: 'Date', minWidth: 135 },
    { field: 'customer_name', headerName: 'Customer', minWidth: 190 },
    { field: 'net_amount', headerName: 'Net Amount', minWidth: 130 },
    { field: 'quotation_status', headerName: 'Status', minWidth: 135 },
    {
      headerName: 'Action',
      minWidth: 210,
      filter: false,
      sortable: false,
      cellRenderer: (params: any) => {
        const wrap = document.createElement('div');
        wrap.className = 'ag-action-group';

        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn btn-link btn-sm p-0 me-3';
        edit.innerText = 'Edit';
        edit.addEventListener('click', () => this.editQuotation(params.data));

        const submit = document.createElement('button');
        submit.type = 'button';
        submit.className = 'btn btn-link btn-sm text-success p-0';
        submit.innerText = 'Submit';
        submit.disabled = params.data?.quotation_status !== 'DRAFT';
        submit.addEventListener('click', () => this.submitForApproval(params.data));

        const download = document.createElement('button');
        download.type = 'button';
        download.className = 'btn btn-link btn-sm text-primary p-0 ms-3';
        download.title = 'Download PDF';
        download.innerHTML = '<i class="bi bi-download"></i>';
        download.addEventListener('click', () => this.downloadQuotation(params.data));

        wrap.append(edit, submit, download);
        return wrap;
      }
    }
  ];

  constructor(
    private quotationService: QuotationServices,
    private approvalService: ApprovalServices,
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
        this.quotationList = response?.data ?? response ?? [];
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

  submitForApproval(row: any) {
    this.ngxLoader.start();
    this.approvalService.submit({
      module_name: 'QUOTATION',
      record_id: row.quotation_id,
      request_no: row.quotation_no,
      remarks: row.remarks
    }).subscribe({
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

  downloadQuotation(row: any) {
    this.ngxLoader.start();
    this.quotationService.getQuotationById(row.quotation_id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const quotation = response?.data ?? response;
        downloadQuotationPdf({ ...row, ...quotation });
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }
}
