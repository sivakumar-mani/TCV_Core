import { Component, Inject, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

import { NgxUiLoaderService } from 'ngx-ui-loader';
import { Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CategoryServices } from '../../../services/category-services';
import { BrandServices } from '../../../services/brand-services';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { ProductService } from '../../../services/product-service';
import { CommonMethods } from '../../../shared/common-methods';
import { SelectFormField } from '../../../shared/select-form-field/select-form-field';
import { InputFormField } from '../../../shared/input-form-field/input-form-field';
@Component({
  selector: 'app-product',
  imports: [MatFormFieldModule, MatDialogModule, CommonModule, MatInputModule,
     NgIf, FormsModule, NgFor, ReactiveFormsModule, MatSelectModule, MatButtonModule],
  templateUrl: './product.html',
  styleUrl: './product.scss',
})
export class Product {
  productForm!: FormGroup;
  brands: any[] = [];
  levels: any[][] = [];   // multi-level categories
  selectedLevels: any[] = [];
  allCategories: any[] = []; // full tree from API
  isEditMode!: boolean;
  router = inject(Router)
  productCode: any;
  constructor(private fb: FormBuilder,
    private api: HttpClient,
    private categoryService: CategoryServices,
    private brandService: BrandServices,
    private productService: ProductService,
    private ngxUiLoader: NgxUiLoaderService,
    private comMethodService: CommonMethods,
    private dialog: MatDialogRef<Product>,
    @Inject(MAT_DIALOG_DATA) public dialogData: any
  ) { }

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
      product_code: ['', Validators.required],
      barcode: [''],
      description: [''],
      purchase_price: [0, [Validators.min(0)]],
      selling_price: [0, [Validators.min(0)]],
      gst_percent: [0, [Validators.min(0), Validators.max(100)]],
      hsn_code: [''],
      unit: ['PCS', Validators.required],
      reorder_level: [0, [Validators.min(0)]],
      status:['ACTIVE', Validators.required],
    });
    if (this.dialogData) {
      this.productForm.patchValue(this.dialogData);

      this.productForm.get('product_name')?.setValidators([Validators.required]);
      this.productForm.get('brand_id')?.setValidators([Validators.required]);

      this.productForm.get('category_id')?.updateValueAndValidity();
      this.productForm.get('product_code')?.updateValueAndValidity();
      this.productForm.get('barcode')?.updateValueAndValidity();
      this.productForm.get('description')?.updateValueAndValidity();
      this.productForm.get('purchase_price')?.updateValueAndValidity();
      this.productForm.get('selling_price')?.updateValueAndValidity();
      this.productForm.get('gst_percent')?.updateValueAndValidity();
      this.productForm.get('hsn_code')?.updateValueAndValidity();
      this.productForm.get('unit')?.updateValueAndValidity();
      this.productForm.get('reorder_level')?.updateValueAndValidity();
      this.productForm.get('status')?.updateValueAndValidity();
        
    } 
  }


  // LOAD BRANDS
  loadBrands() {
    this.brandService.getBrands().subscribe((res: any) => {
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

    // AUTO GENERATE PRODUCT NAME
    this.generateProductName();
  }

  // loadLevel(level: number, parentId: any) {
  //   this.categoryService.getCategoryById(parentId)
  //     .subscribe((res: any) => {

  //       this.levels[level] = res;
  //       console.log("test", res);

  //       // Optional: clear next levels when reloading
  //       this.levels.splice(level + 1);
  //       this.selectedLevels.splice(level + 1);

  //     });
  // }

  generateProductName() {

    // Get selected brand object
    const brandId = this.productForm.get('brand_id')?.value;

    const brand = this.brands.find(
      (b: any) => b.brand_id == brandId
    );

    const brandName = brand?.brand_name || '';

    // Skip root level category
    // Example:
    // CCTV -> IP Camera -> 5MP -> Dome
    // Result should ignore CCTV

    const categoryParts = this.selectedLevels
      .slice(1) // skip first/root level
      .map((c: any) => c.category_name);

    // Final Product Name
    const productName = [
      brandName,
      ...categoryParts
    ]
      .filter(Boolean)
      .join(' ');

    this.productForm.patchValue({
      product_name: productName,
      product_code: this.generateProductCode(productName)
    });
  }
  generateProductCode(name: string): string {
    const words = name.trim().split(' ');

    if (words.length === 1) {
      return words[0].substring(0, 3).toUpperCase();
    }

    return words
      .map(w => w.substring(0, 3))
      .join('')
      .toUpperCase();
  }

  // SUBMIT
  addSubmit() {
    this.ngxUiLoader.start();
    const formData = this.productForm.getRawValue();

    // ✅ Generate product code here
    this.productCode = this.generateProductCode(formData.product_name);
    const data = {
      product_name: formData.product_name,
      brand_id: formData.brand_id,
      category_id: formData.category_id,
      product_code: formData.product_code || this.productCode,
      barcode: formData.barcode,
      description: formData.description,
      purchase_price: formData.purchase_price,
      selling_price: formData.selling_price,
      gst_percent: formData.gst_percent,
      hsn_code: formData.hsn_code,
      unit: formData.unit,
      reorder_level: formData.reorder_level,
      status: formData.status,
    }

    this.productService.addProduct(data).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        this.comMethodService.handleTokenAndMessage(response);
        if (response) {
          this.dialog.close('success');
        }
        this.router.navigateByUrl('/productList');
      },
      error: (error: any) => {
        this.ngxUiLoader.stop();
        this.comMethodService.handleError(error);
      },

    })
  }

  statusList = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Discontinued', value: 'DISCONTINUED' }
  ];

  editSubmit() {

    this.ngxUiLoader.start();

    const formData = this.productForm.getRawValue();

    // ✅ Generate Product Code
    this.productCode = this.generateProductCode(formData.product_name);

    const data = {
      product_name: formData.product_name,
      brand_id: formData.brand_id,
      category_id: formData.category_id,
      product_code: formData.product_code || this.productCode,
      barcode: formData.barcode,
      description: formData.description,
      purchase_price: formData.purchase_price,
      selling_price: formData.selling_price,
      gst_percent: formData.gst_percent,
      hsn_code: formData.hsn_code,
      unit: formData.unit,
      reorder_level: formData.reorder_level,
      status: formData.status,
      product_id: this.dialogData.product_id // 👈 important
    };

    this.productService.updateProduct(data).subscribe({
      next: (response: any) => {

        this.ngxUiLoader.stop();

        this.comMethodService.handleTokenAndMessage(response);

        if (response) {
          this.dialog.close('success');
        }

        this.router.navigateByUrl('/productList');

      },
      error: (error: any) => {

        this.ngxUiLoader.stop();

        this.comMethodService.handleError(error);

      }
    });

  }
}
