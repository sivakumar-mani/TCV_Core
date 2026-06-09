import { Component, inject, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ProductService } from '../../services/product-service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Product } from '../dialog/product/product';
import { MatIcon } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';

@Component({
  selector: 'app-product-list',
  imports: [TableModule, ButtonModule,MenuModule,InputIconModule,MultiSelectModule, SelectModule,FormsModule, IconFieldModule,TagModule,InputTextModule,
     MatIcon, MatToolbarModule ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {

  products: any[] = [];

  router = inject(Router);
  dialog = inject(MatDialog);

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.productService.getProduct().subscribe((response: any) => {
      const data = Array.isArray(response) ? response : response.data ?? [];
      this.products = data.map((p: any) => ({
        ...p,
        price: parseFloat(p.price),
        stock_qty: Number(p.stock_qty),
        purchase_price: Number(p.purchase_price),
        selling_price: Number(p.selling_price),
        gst_percent: Number(p.gst_percent),
        reorder_level: Number(p.reorder_level)
      }));
    });
  }

  getStatusSeverity(status: string) {
    if (status === 'ACTIVE') return 'success';
    if (status === 'DISCONTINUED') return 'warn';
    return 'danger';
  }

  getMenuItems(row: any): MenuItem[] {
    return [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.editProduct(row)
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => this.deleteProduct(row)
      }
    ];
  }

  addProduct() {
    const dialogRef = this.dialog.open(Product, {
      width: '70%',
      height: '90%',
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
      height: '90%',
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

  deleteProduct(row: any) {
    console.log('DELETE', row);
  }
}
