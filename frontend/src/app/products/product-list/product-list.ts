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

@Component({
  selector: 'app-product-list',
  imports: [TableModule, ButtonModule,MenuModule,TagModule,InputTextModule, MatIcon, MatToolbarModule ],
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
