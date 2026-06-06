import { Component, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { ApprovalServices } from '../../services/approval-services';
import { PurchaseServices } from '../../services/purchase-services';
import { CommonMethods } from '../../shared/common-methods';

@Component({
  selector: 'app-purchase-list',
  imports: [MatButtonModule, MatIconModule, MatPaginatorModule, MatTableModule, MatToolbarModule],
  templateUrl: './purchase-list.html',
  styleUrl: './purchase-list.scss',
})
export class PurchaseList {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'serial',
    'purchase_no',
    'supplier_name',
    'invoice_no',
    'invoice_date',
    'net_amount',
    'purchase_status',
    'payment_status',
    'action'
  ];
  dataSource = new MatTableDataSource<any>([]);

  constructor(
    private purchaseService: PurchaseServices,
    private approvalService: ApprovalServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPurchases();
  }

  loadPurchases() {
    this.ngxLoader.start();
    this.purchaseService.getPurchases().subscribe({
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

  submitForApproval(row: any) {
    this.ngxLoader.start();
    this.approvalService.submit({
      module_name: 'PURCHASE',
      record_id: row.purchase_id,
      request_no: row.purchase_no,
      remarks: row.remarks
    }).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadPurchases();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addPurchase() {
    this.router.navigateByUrl('/purchases/add');
  }

  applyFilter(event: Event) {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }
}

