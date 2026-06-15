import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ColDef } from 'ag-grid-community';
import { ProductService } from '../../services/product-service';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { ActionMenu } from '../../shared/list-action-menu';
import { Product } from '../dialog/product/product';

@Component({
  selector: 'app-product-list',
  imports: [AgGridList],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  products: any[] = [];
  dialog = inject(MatDialog);

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
    { field: 'product_name', headerName: 'Product' },
    { field: 'product_code', headerName: 'Code', maxWidth: 160 },
    {
      field: 'product_type',
      headerName: 'Type',
      maxWidth: 150,
      valueFormatter: (params) => this.productTypeLabel(params.value),
    },
    { field: 'barcode', headerName: 'Barcode', maxWidth: 160 },
    { field: 'brand_name', headerName: 'Brand' },
    { field: 'category_path', headerName: 'Category' },
    {
      field: 'purchase_price',
      headerName: 'Purchase',
      maxWidth: 140,
      valueFormatter: (params) => this.money(params.value),
    },
    {
      field: 'selling_price',
      headerName: 'Selling',
      maxWidth: 140,
      valueFormatter: (params) => this.money(params.value),
    },
    {
      field: 'gst_percent',
      headerName: 'GST',
      maxWidth: 110,
      valueFormatter: (params) => `${Number(params.value) || 0}%`,
    },
    { field: 'hsn_code', headerName: 'HSN', maxWidth: 130 },
    { field: 'unit', headerName: 'Unit', maxWidth: 110 },
    { field: 'reorder_level', headerName: 'Reorder', maxWidth: 130 },
    { field: 'status', headerName: 'Status', maxWidth: 140 },
    {
      headerName: 'Action',
      maxWidth: 110,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'Edit', action: (row: any) => this.editProduct(row) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.productService.getProduct().subscribe((response: any) => {
      const data = Array.isArray(response) ? response : response.data ?? [];
      this.products = data.map((p: any) => ({
        ...p,
        purchase_price: Number(p.purchase_price ?? 0),
        selling_price: Number(p.selling_price ?? p.price ?? 0),
        gst_percent: Number(p.gst_percent ?? 0),
        reorder_level: Number(p.reorder_level ?? 0)
      }));
    });
  }

  addProduct() {
    const dialogRef = this.dialog.open(Product, {
      width: '70%',
      height: '60%',
      maxHeight: '100vh',
      maxWidth: '100vw',
      disableClose: true,
      position: { top: 'calc(1vw + 20px)' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        this.loadProducts();
      }
    });
  }

  editProduct(row: any) {
    const dialogRef = this.dialog.open(Product, {
      data: row,
      width: '70%',
      height: '70%',
      maxHeight: '100vh',
      maxWidth: '100vw',
      disableClose: true,
      position: { top: 'calc(1vw + 20px)' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        this.loadProducts();
      }
    });
  }

  money(value: number | string) {
    return `Rs. ${(Number(value) || 0).toFixed(2)}`;
  }

  productTypeLabel(value: string) {
    const labels: Record<string, string> = {
      MATERIAL: 'Material',
      SERVICE: 'Service',
      LABOR: 'Labor'
    };
    return labels[value] || 'Material';
  }
}
