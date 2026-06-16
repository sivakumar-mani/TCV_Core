import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { PurchaseServices } from '../../services/purchase-services';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../../shared/common-methods';
import { ActionMenu } from '../../shared/list-action-menu';

@Component({
  selector: 'app-purchase-list',
  imports: [AgGridList],
  templateUrl: './purchase-list.html',
  styleUrl: './purchase-list.scss',
})
export class PurchaseList {
  purchases: any[] = [];

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
    { field: 'purchase_no', headerName: 'Purchase No', maxWidth: 170 },
    { field: 'supplier_name', headerName: 'Supplier' },
    { field: 'invoice_no', headerName: 'Invoice No', maxWidth: 150 },
    { field: 'purchase_date', headerName: 'Purchase Date', maxWidth: 150, valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'item_count', headerName: 'Items', maxWidth: 110 },
    { field: 'total_qty', headerName: 'Qty', maxWidth: 110, valueFormatter: (params) => this.decimal(params.value) },
    { field: 'total_received_qty', headerName: 'Received Qty', maxWidth: 150, valueFormatter: (params) => this.decimal(params.value) },
    { field: 'net_amount', headerName: 'Net Amount', maxWidth: 150, valueFormatter: (params) => this.money(params.value) },
    { field: 'paid_amount', headerName: 'Paid', maxWidth: 130, valueFormatter: (params) => this.money(params.value) },
    { field: 'balance_amount', headerName: 'Balance', maxWidth: 140, valueFormatter: (params) => this.money(params.value) },
    { field: 'purchase_status', headerName: 'Purchase Status', maxWidth: 170 },
    { field: 'payment_status', headerName: 'Payment Status', maxWidth: 160 },
    {
      headerName: 'Action',
      maxWidth: 110,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'Edit', action: (row: any) => this.editPurchase(row) },
          { label: 'Delete', action: (row: any) => this.deletePurchase(row) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private purchaseService: PurchaseServices,
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
        this.purchases = Array.isArray(response) ? response : response.data ?? [];
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

  editPurchase(row: any) {
    this.router.navigate(['/purchases/edit', row.purchase_id]);
  }

  deletePurchase(row: any) {
    if (!confirm(`Delete purchase ${row.purchase_no}?`)) return;

    this.ngxLoader.start();
    this.purchaseService.deletePurchase({ purchase_id: row.purchase_id }).subscribe({
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

  money(value: number | string) {
    return `Rs. ${(Number(value) || 0).toFixed(2)}`;
  }

  decimal(value: number | string) {
    return (Number(value) || 0).toFixed(2);
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
