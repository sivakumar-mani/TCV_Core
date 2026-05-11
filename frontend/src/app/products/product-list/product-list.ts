import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ProductService } from '../../services/product-service';

@Component({
  selector: 'app-product-list',
  imports: [TableModule, ButtonModule,MenuModule,TagModule,InputTextModule ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {

  products: any;

  constructor( private productService : ProductService){}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.productService.getProduct().subscribe((response)=>{
      this.products = response
    })
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
