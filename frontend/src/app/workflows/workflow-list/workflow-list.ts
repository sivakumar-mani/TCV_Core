import { formatIndianDate } from '../../shared/india-date';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { WorkflowServices } from '../../services/workflow-services';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../../shared/common-methods';

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
    minWidth: 40,
    flex: 1,
    wrapText: true,
    autoHeight: true,
    wrapHeaderText: true,
    autoHeaderHeight: true,
    filter: true,
    floatingFilter: true,
    headerClass: 'ag-header-style',
  };

  colDefs: ColDef[] = [
    { headerName: 'S.No', minWidth: 40, maxWidth: 55, flex: 0.5, valueGetter: (params: any) => params.node.rowIndex + 1, filter: false, floatingFilter: false, sortable: false },
    { field: 'requested_at', headerName: 'Updated', maxWidth: 150, valueFormatter: (params) => this.displayDateTime(params.value) },
    { headerName: 'Reference No', maxWidth: 190, valueGetter: (params: any) => this.referenceLabel(params.data) },
    { headerName: 'Party', flex: 1.4, cellClass: 'workflow-party-cell', valueGetter: (params: any) => params.data?.customer_name || params.data?.supplier_name || '' },
    { field: 'subject', headerName: 'Subject', flex: 1.8, cellRenderer: (params: any) => this.subjectBadges(params.value) },
    { headerName: 'Date', maxWidth: 150, valueGetter: (params: any) => params.data?.quotation_date || params.data?.purchase_date, valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'net_amount', headerName: 'Amount', maxWidth: 140, valueFormatter: (params) => this.money(params.value) },
    { field: 'balance_amount', headerName: 'Balance', maxWidth: 140, valueFormatter: (params) => this.money(params.value) },
    { headerName: 'Status', maxWidth: 160, valueGetter: (params: any) => params.data?.quotation_status || params.data?.workflow_status, cellRenderer: (params: any) => this.statusPill(params.value) },
    { field: 'workflow_status', headerName: 'Workflow', maxWidth: 160, cellRenderer: (params: any) => this.statusPill(params.value) },
    {
      headerName: 'Action',
      cellClass: 'workflow-action-cell',
      minWidth: 60,
      maxWidth: 85,
      flex: 0.6,
      cellRenderer: (params: any) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-sm btn-outline-primary';
        button.style.cssText = 'max-width:100%;white-space:normal;padding-inline:5px;';
        const isInternetCustomer = ['INTERNET_CUSTOMER','INTERNET_CUSTOMER_UPDATE'].includes(params.data?.module_name);
        button.innerHTML = isInternetCustomer
          ? '<i class="bi bi-check-circle" aria-hidden="true"></i> Approve'
          : '<i class="bi bi-file-earmark-check" aria-hidden="true"></i>';
        if (!isInternetCustomer) {
          button.className = 'workflow-review-icon';
          button.style.cssText = 'border:0;padding:0;background:transparent;';
          button.setAttribute('aria-label', 'Review');
          button.title = 'Review';
        }
        button.addEventListener('click', () => this.review(params.data));
        return button;
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
    } else if (row.module_name === 'WORK_ORDER') {
      this.router.navigate(['/work-orders/preview', row.reference_id]);
    } else if (row.module_name === 'MATERIAL_ISSUE') {
      this.router.navigate(['/work-orders/material-issue', row.work_order_id], { queryParams: { preview: true, workflow: true } });
    } else if (row.module_name === 'SUPPLIER_PAYMENT') {
      this.router.navigate(['/purchases/edit', row.reference_id], {
        queryParams: { review: true, workflowId: row.workflow_id }
      });
    } else if (row.module_name === 'SUPPLIER') {
      const supplierId = row.supplier_id || row.reference_id;
      this.router.navigate(['/suppliers/edit', supplierId], {
        queryParams: { review: true, workflowId: row.workflow_id }
      });
    } else if (row.module_name === 'CABLE_TV_CUSTOMER') {
      this.router.navigate(['/cable-tv/customers', row.reference_id], {
        queryParams: { review: true, workflowId: row.workflow_id }
      });
    } else if (row.module_name === 'CCTV_CUSTOMER') {
      this.router.navigate(['/customers/edit', row.reference_id], {
        queryParams: { review: true, workflowId: row.workflow_id }
      });
    } else if (['INTERNET_CUSTOMER','INTERNET_CUSTOMER_UPDATE'].includes(row.module_name)) {
      const updateTab = String(row.remarks || '').match(/^Internet customer (subscription|router|connection|package) update/iu)?.[1];
      this.router.navigate(['/internet/customers/view', row.reference_id], {
        queryParams: { review: true, workflowId: row.workflow_id, tab: updateTab || 'subscription' }
      });
    }
  }

  approve(row: any) {
    if (row.module_name === 'SUPPLIER_PAYMENT') {
      this.review(row);
      return;
    }
    if (['WORK_ORDER', 'MATERIAL_ISSUE'].includes(row.module_name)) {
      alert('Preview this request to choose its approval action.');
      return;
    }
    if (row.module_name === 'CABLE_TV_CUSTOMER') {
      if (row.workflow_status !== 'PENDING') {
        alert('This request has already been reviewed.');
        return;
      }
      if (!confirm(`Approve Cable TV customer ${row.reference_no}?`)) return;
      this.workflowService.approveWorkflow(row.workflow_id).subscribe({
        next: (response: any) => {
          this.commonMethods.handleTokenAndMessage(response);
          this.loadWorkflows();
        },
        error: (error: any) => this.commonMethods.handleError(error)
      });
      return;
    }
    if (['INTERNET_CUSTOMER','INTERNET_CUSTOMER_UPDATE'].includes(row.module_name)) {
      if (row.workflow_status !== 'PENDING') {
        alert('This Internet customer request has already been reviewed.');
        return;
      }
      if (!confirm(`Approve Internet customer ${row.reference_no}?`)) return;
      this.workflowService.approveWorkflow(row.workflow_id).subscribe({
        next: (response: any) => {
          this.commonMethods.handleTokenAndMessage(response);
          this.loadWorkflows();
        },
        error: (error: any) => this.commonMethods.handleError(error)
      });
      return;
    }
    if (row.module_name !== 'MATERIAL_ISSUE') {
      alert('Approve this request from its review screen.');
      return;
    }
    if (row.workflow_status !== 'PENDING') {
      alert('This request has already been reviewed.');
      return;
    }
    if (!confirm(`Approve ${row.reference_no}?`)) return;
    this.workflowService.approveWorkflow(row.workflow_id).subscribe({
      next: (response: any) => {
        this.commonMethods.handleTokenAndMessage(response);
        this.loadWorkflows();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  money(value: number | string) {
    return `Rs. ${(Number(value) || 0).toFixed(2)}`;
  }

  referenceLabel(row: any) {
    const reference = String(row?.reference_no || '').trim();
    if (row?.module_name === 'CABLE_TV_CUSTOMER') return `${reference} - CATV`;
    if (row?.module_name === 'CCTV_CUSTOMER') return `${reference} - CCTV`;
    return reference;
  }

  statusPill(value: any) {
    const status = String(value || 'PENDING').trim();
    const pill = document.createElement('span');
    pill.className = 'status-pill';
    pill.dataset['status'] = status;
    pill.textContent = status.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
    return pill;
  }

  displayDate(value: string | Date) {
    return formatIndianDate(value, '');
  }

  subjectBadges(value: any) {
    const container = document.createElement('span');
    container.style.cssText = 'display:flex;align-items:center;gap:5px;flex-wrap:wrap;min-width:0;padding-block:5px;';
    const subjects = String(value || 'General').split('•').map(item => item.trim()).filter(item => item && item.toUpperCase() !== 'DISCOUNT');
    subjects.forEach(subject => {
      const badge = document.createElement('span');
      const key = subject.toUpperCase();
      const colors = key.includes('LOCATION') ? ['#e0f2fe', '#075985']
        : key.includes('DISCOUNT') ? ['#fef3c7', '#92400e']
        : key.includes('REACTIV') || key.includes('RECONNECT') ? ['#dcfce7', '#166534']
        : key.includes('RETURN') || key.includes('DISCONNECT') ? ['#fee2e2', '#991b1b']
        : key.includes('STB') ? ['#ede9fe', '#5b21b6']
        : key.includes('NEW') ? ['#dbeafe', '#1d4ed8']
        : ['#eef2f6', '#344054'];
      badge.textContent = subject;
      badge.style.cssText = `background:${colors[0]};color:${colors[1]};border-radius:999px;font-size:12px;font-weight:750;line-height:1.2;padding:5px 9px;white-space:normal;overflow-wrap:anywhere;max-width:100%;`;
      container.appendChild(badge);
    });
    return container;
  }

  displayDateTime(value: string | Date) {
    return formatIndianDate(value, '');
  }
}
