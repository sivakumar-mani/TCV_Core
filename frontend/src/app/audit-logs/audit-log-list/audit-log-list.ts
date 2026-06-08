import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { AuditLogServices } from '../../services/audit-log-services';
import { CommonMethods } from '../../shared/common-methods';
import { BootstrapActionMenu } from '../../shared/bootstrap-action-menu';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';

@Component({
  selector: 'app-audit-log-list',
  imports: [CommonModule, RouterLink, AgGridList],
  templateUrl: './audit-log-list.html',
  styleUrl: './audit-log-list.scss',
})
export class AuditLogList {
  auditLogs: any[] = [];
  selectedAuditLog: any;
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [10, 25, 50, 100];

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
    { field: 'audit_id', headerName: 'Audit ID', maxWidth: 120 },
    { field: 'module', headerName: 'Module' },
    { field: 'action', headerName: 'Action', maxWidth: 130 },
    { field: 'table_name', headerName: 'Table' },
    { field: 'record_id', headerName: 'Record ID', maxWidth: 130 },
    { field: 'ip_address', headerName: 'IP Address' },
    { field: 'created_at', headerName: 'Created At' },
    {
      headerName: 'Action',
      maxWidth: 130,
      cellRenderer: BootstrapActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'View', action: (row: any) => this.viewAuditLog(row) },
          { label: 'Edit', action: (row: any) => this.editAuditLog(row) },
          { label: 'Delete', className: 'text-danger', action: (row: any) => this.deleteAuditLog(row) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private auditLogService: AuditLogServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAuditLogs();
  }

  loadAuditLogs() {
    this.ngxLoader.start();
    this.auditLogService.getAuditLogs().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.auditLogs = Array.isArray(response) ? response : response?.data ?? [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addAuditLog() {
    this.router.navigateByUrl('/audit-logs/add');
  }

  editAuditLog(row: any) {
    this.router.navigate(['/audit-logs/edit', row.audit_id]);
  }

  viewAuditLog(row: any) {
    this.ngxLoader.start();
    this.auditLogService.getAuditLogById(row.audit_id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.selectedAuditLog = response?.data ?? response;
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  closeView() {
    this.selectedAuditLog = null;
  }

  deleteAuditLog(row: any) {
    if (!confirm(`Delete audit log #${row.audit_id}?`)) return;

    this.ngxLoader.start();
    this.auditLogService.deleteAuditLog({ audit_id: row.audit_id }).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadAuditLogs();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }
}
