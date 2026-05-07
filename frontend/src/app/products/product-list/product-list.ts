import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-product-list',
  imports: [TableModule, ButtonModule,MenuModule,TagModule,InputTextModule ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {

  products: any[] = [];

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {

    // API RESPONSE SAMPLE
    this.products = [
      {
        product_id: 1,
        product_name: 'Hikvision Dome Camera',
        product_code: 'HK-DM-001',
        brand_name: 'Hikvision',
        category_path: 'CCTV > IP Camera > 5MP',
        price: 3500,
        stock_qty: 20,
        status: 'ACTIVE'
      },
      {
        product_id: 2,
        product_name: 'CP Plus AHD Camera',
        product_code: 'CPP-AHD-002',
        brand_name: 'CP Plus',
        category_path: 'CCTV > AHD Camera > 3 MP',
        price: 2200,
        stock_qty: 10,
        status: 'INACTIVE'
      }
    ];
  }

  getMenuItems(row: any): MenuItem[] {

    return [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => {
          this.editProduct(row);
        }
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => {
          this.deleteProduct(row);
        }
      }
    ];
  }

  editProduct(row: any) {
    console.log('EDIT', row);
  }

  deleteProduct(row: any) {
    console.log('DELETE', row);
  }
}
