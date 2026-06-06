import { Component, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { ApprovalServices } from '../../services/approval-services';
import { CommonMethods } from '../../shared/common-methods';

@Component({
  selector: 'app-approval-list',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatTableModule,
    MatToolbarModule
  ],
  templateUrl: './approval-list.html',
  styleUrl: './approval-list.scss',
})
export class ApprovalList {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'serial',
    'request_no',
    'module_name',
    'record_id',
    'approval_status',
    'requested_by_name',
    'requested_at',
    'remarks',
    'action'
  ];
  dataSource = new MatTableDataSource<any>([]);

  constructor(
    private approvalService: ApprovalServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods
  ) {}

  ngOnInit() {
    this.loadApprovals();
  }

  loadApprovals() {
    this.ngxLoader.start();
    this.approvalService.getApprovals().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.dataSource = new MatTableDataSource(response?.data ?? response ?? []);
        this.dataSource.paginator = this.paginator;
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  approve(row: any) {
    this.ngxLoader.start();
    this.approvalService.approve(row.approval_request_id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadApprovals();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  reject(row: any) {
    this.ngxLoader.start();
    this.approvalService.reject(row.approval_request_id, { rejection_reason: 'Rejected by admin' }).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadApprovals();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  applyFilter(event: Event) {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }
}

