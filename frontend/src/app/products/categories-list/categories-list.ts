import { HttpClient } from '@angular/common/http';
import { Component, inject, ViewChild } from '@angular/core';
import { Snackbar } from '../../services/snackbar';
import { CategoryServices } from '../../services/category-services';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { JsonPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { InputTextModule } from 'primeng/inputtext';

import { TagModule } from 'primeng/tag';

import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { SelectModule } from 'primeng/select';
import { Category } from '../dialog/category/category';
@Component({
  selector: 'app-categories-list',
  imports: [TableModule, MatToolbar, MatIcon, SelectModule,  InputTextModule,TagModule,MatButtonModule,
    FormsModule, MatMenuModule, MatMenuModule,],
  templateUrl: './categories-list.html',
  styleUrl: './categories-list.scss',
})
export class CategoriesList {

    categories:any;
    http = inject(HttpClient);
    flatCategories: any[]=[];
    dialog = inject(MatDialog)
    isMobile:boolean = false;
    levelOptions: any[] = [];
    @ViewChild('dt') dt: any;

 constructor( private snackBarService: Snackbar,
  private categoryService : CategoryServices,
  private ngxLoader: NgxUiLoaderService,
  private router: Router
 ){}

 ngOnInit(){
  this.getCategoriesList();
  // this.levelFilter()
 }

 getCategoriesList(){
  this.categoryService.getCategory().subscribe(( response:any)=>{
    this.ngxLoader.stop();
      // this.categories = response;
      this.flatCategories = this.flattenCategories(response);
       this.levelFilter();
      
  })
 }

 flattenCategories(categories: any[], level: number = 0, parent: any = null): any[] {
  let result: any[] = [];

  categories.forEach(cat => {
    result.push({
      ...cat,
      levelDepth: level,
      parentName: parent ? parent.category_name : 'Main'
    });

    if (cat.children && cat.children.length) {
      result = result.concat(this.flattenCategories(cat.children, level + 1, cat));
    }
  });

  return result;
}

addCategory(){
  const dialogConfig = this.dialog.open(Category,{
      width: this.isMobile ? '96%' : '60%',
      height: this.isMobile ? '90%' : '80%',
      maxWidth: '100vw',
      maxHeight:'100vh',
       disableClose: true,
      position:{
         top: 'calc(1vw + 20px)'
      }
  });
  dialogConfig.afterClosed().subscribe((results)=>{
    if(results =='success'){
       this.getCategoriesList();
    }
  }); 
}
editCategory(categoryValue: any) {
 const dialogConfig = this.dialog.open(Category, {
    data : categoryValue,
      width: this.isMobile ? '96%' : '60%',
      height: this.isMobile ? '90%' : '80%',
      maxWidth: '100vw',
      maxHeight:'100vh',
       disableClose: true,
      position:{
         top: 'calc(1vw + 20px)'
      }
 });
  dialogConfig.afterClosed().subscribe((results)=>{
    if(results == 'success'){
      this.getCategoriesList();
    }
  })
}

levelFilter(){
 const levels = [...new Set(this.flatCategories.map( c => c.level))];
this.levelOptions = [
  { label: 'All', value: null },
  ...levels.map(l => ({
    label: 'Level ' + l,
    value: l
  }))
];
}

statusOptions = [
  { label: 'Active', value: 1 },
  { label: 'Inactive', value: 0 }
];

onSingleFilter(value: any, filterCallback: Function) {

  this.dt.clear();

  if (value) {
    filterCallback(value);
  }
}



deleteCategory(category: any) {
  console.log('Delete:', category);
}

}
