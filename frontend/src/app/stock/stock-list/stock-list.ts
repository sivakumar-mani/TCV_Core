import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { ProductService } from '../../services/product-service';
import { StockServices } from '../../services/stock-services';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../../shared/common-methods';

@Component({
  selector: 'app-stock-list',
  imports: [CommonModule, AgGridList],
  templateUrl: './stock-list.html',
  styleUrl: './stock-list.scss',
})
export class StockList {
  stockRows: any[] = [];
  ledgerRows: any[] = [];
  products: any[] = [];
  selectedProductId: number | null = null;

  defaultColDef: ColDef = {
    resizable: true,
    minWidth: 120,
    flex: 1,
    filter: true,
    floatingFilter: true,
    headerClass: 'ag-header-style',
  };

  stockColDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'product_code', headerName: 'Code', maxWidth: 160 },
    { field: 'product_name', headerName: 'Product' },
    { field: 'brand_name', headerName: 'Brand', maxWidth: 160 },
    { field: 'unit', headerName: 'Unit', maxWidth: 100 },
    { field: 'available_qty', headerName: 'Available', maxWidth: 140, valueFormatter: (params) => this.decimal(params.value) },
    { field: 'reserved_qty', headerName: 'Reserved', maxWidth: 130, valueFormatter: (params) => this.decimal(params.value) },
    { field: 'free_qty', headerName: 'Free Qty', maxWidth: 130, valueFormatter: (params) => this.decimal(params.value) },
    { field: 'minimum_stock', headerName: 'Minimum', maxWidth: 130, valueFormatter: (params) => this.decimal(params.value) },
    { field: 'maximum_stock', headerName: 'Maximum', maxWidth: 130, valueFormatter: (params) => this.decimal(params.value) },
    { field: 'reorder_qty', headerName: 'Reorder', maxWidth: 130, valueFormatter: (params) => this.decimal(params.value) },
    { field: 'stock_status', headerName: 'Status', maxWidth: 120 },
    { field: 'last_purchase_price', headerName: 'Last Purchase', maxWidth: 150, valueFormatter: (params) => this.money(params.value) },
    { field: 'last_updated', headerName: 'Updated', maxWidth: 170, valueFormatter: (params) => this.displayDate(params.value) }
  ];

  ledgerColDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'transaction_date', headerName: 'Date', maxWidth: 170, valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'product_code', headerName: 'Code', maxWidth: 160 },
    { field: 'product_name', headerName: 'Product' },
    { field: 'transaction_type', headerName: 'Type', maxWidth: 140 },
    { field: 'reference_no', headerName: 'Reference', maxWidth: 160 },
    { field: 'qty_in', headerName: 'In', maxWidth: 110, valueFormatter: (params) => this.decimal(params.value) },
    { field: 'qty_out', headerName: 'Out', maxWidth: 110, valueFormatter: (params) => this.decimal(params.value) },
    { field: 'balance_qty', headerName: 'Balance', maxWidth: 130, valueFormatter: (params) => this.decimal(params.value) },
    { field: 'unit_cost', headerName: 'Unit Cost', maxWidth: 140, valueFormatter: (params) => this.money(params.value) },
    { field: 'remarks', headerName: 'Remarks' }
  ];

  constructor(
    private stockService: StockServices,
    private productService: ProductService,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.loadStock();
    this.loadLedger();
  }

  loadProducts() {
    this.productService.getProduct().subscribe({
      next: (response: any) => this.products = Array.isArray(response) ? response : response.data ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadStock() {
    this.ngxLoader.start();
    this.stockService.getStock().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.stockRows = Array.isArray(response) ? response : response.data ?? [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  loadLedger(productId: number | null = this.selectedProductId) {
    this.stockService.getLedger(productId || undefined).subscribe({
      next: (response: any) => this.ledgerRows = Array.isArray(response) ? response : response.data ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  filterLedger(productId: number | null) {
    this.selectedProductId = productId;
    this.loadLedger(productId);
  }

  toNumber(value: any) {
    return Number.parseFloat(value || 0) || 0;
  }

  decimal(value: number | string) {
    return this.toNumber(value).toFixed(2);
  }

  money(value: number | string) {
    return `Rs. ${this.toNumber(value).toFixed(2)}`;
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
