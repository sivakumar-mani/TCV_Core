import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormArray, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgxUiLoaderService } from 'ngx-ui-loader';
import { Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CategoryServices } from '../../../services/category-services';
import { BrandServices } from '../../../services/brand-services';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-product',
   imports: [MatFormFieldModule ,  FormsModule, NgFor, ReactiveFormsModule , MatSelectModule, MatInputModule],
  templateUrl: './product.html',
  styleUrl: './product.scss',
})
export class Product {
productForm!: FormGroup;
brands: any[] = [];
levels: any[][] = [];   // multi-level categories
selectedLevels: any[] = [];
allCategories: any[] = []; // full tree from API

constructor(private fb: FormBuilder,
            private api: HttpClient,
          private categoryService : CategoryServices,
        private brandService : BrandServices) {}

ngOnInit() {
  this.initForm();
  this.loadBrands();
 this.loadCategories();
}

initForm() {
  this.productForm = this.fb.group({
    product_name: ['', Validators.required],
    brand_id: ['', Validators.required],
    category_id: ['', Validators.required],
    product_code: [''],
    description: [''],
    price: [0],
    stock_qty: [0]
  });
}


// LOAD BRANDS
loadBrands() {
   this.brandService.getBrands().subscribe((res:any) => {
    this.brands = res;
  });
}

loadCategories() {
  this.categoryService.getCategory().subscribe((res: any) => {
    this.allCategories = res;

    // first level (root)
    this.levels[0] = res;
  });
}


// HANDLE SELECTION
onSelectLevel(level: number, category: any) {
  this.selectedLevels[level] = category;

  // remove next levels
  this.levels.splice(level + 1);
  this.selectedLevels.splice(level + 1);

  // if children exist → push next level
  if (category.children && category.children.length > 0) {
    this.levels[level + 1] = category.children;
  }

  // set final category_id
  this.productForm.patchValue({
    category_id: category.category_id
  });
}

loadLevel(level: number, parentId: any) {
  this.categoryService.getCategoryById(parentId)
    .subscribe((res:any) => {

      this.levels[level] = res;
      console.log("test", res);

      // Optional: clear next levels when reloading
      this.levels.splice(level + 1);
      this.selectedLevels.splice(level + 1);

    });
}




// SUBMIT
submit() {
  if (this.productForm.invalid) return;

  this.api.post('/api/products/add', this.productForm.value)
    .subscribe(() => {
      alert('Product Added');
      this.productForm.reset();
    });
}
}
