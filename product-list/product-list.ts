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
     MatIcon, MatToolbarModule, NgClass ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {

  products: any;
  router = inject(Router)
  dialog = inject(MatDialog)
  constructor( private productService : ProductService){}

  ngOnInit(): void {
    this.loadProducts();
  }

 loadProducts() {
  this.productService.getProduct().subscribe((response: any) => {
    this.products = response.map((p: any) => ({
      ...p,
      price: parseFloat(p.price),       // convert '100.00' → 100
      stock_qty: Number(p.stock_qty)    // convert string → number
    }));
  });
}
 products1 = [
    {
      product_name: 'Hikvision IP Camera',
      brand: 'Hikvision',
      category: 'CCTV',
      price: 4500,
      stock: 25,
      status: 'ACTIVE'
    },
    {
      product_name: 'CP Plus Dome Camera',
      brand: 'CP Plus',
      category: 'CCTV',
      price: 3200,
      stock: 12,
      status: 'ACTIVE'
    },
    {
      product_name: 'Solar Panel 440W',
      brand: 'Adani',
      category: 'Solar',
      price: 14500,
      stock: 8,
      status: 'INACTIVE'
    },
    {
      product_name: 'Fiber ONU Router',
      brand: 'TP-Link',
      category: 'Internet',
      price: 2100,
      stock: 40,
      status: 'ACTIVE'
    },
    {
      product_name: 'CAT6 Cable',
      brand: 'D-Link',
      category: 'Networking',
      price: 6500,
      stock: 100,
      status: 'ACTIVE'
    },
    {
      product_name: 'WiFi Camera 3MP',
      brand: 'Imou',
      category: 'CCTV',
      price: 2800,
      stock: 18,
      status: 'INACTIVE'
    }
  ];
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
  addProduct(){
    const dialogConfig = this.dialog.open(Product,{
       width: '70%',
      height: '60%',
      maxHeight: '100vh',
      maxWidth: '100vw',
      disableClose: true,
      position: {
        top: 'calc(1vw + 20px)'
      },
    });

    dialogConfig.afterClosed().subscribe((results)=>{
      if(results == 'success'){
        this.loadProducts();
      }
    })
    
  }
  editProduct(row:any) {
    const dialogConfig = this.dialog.open( Product,{
      data: row,
      width: '70%',
      height: '70%',
      maxHeight: '100vh',
      maxWidth: '100vw',
      disableClose : true,
      position:{
          top: 'calc(1vw + 20px)'
      }
    });
    dialogConfig.afterClosed().subscribe((results)=>{
      if(results == 'success'){
        this.loadProducts();
      }
    })
  }

  deleteProduct(row: any) {
    console.log('DELETE', row);
  }
}
