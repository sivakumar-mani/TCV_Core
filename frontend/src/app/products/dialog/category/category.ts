import { NgFor, NgIf } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CategoryServices } from '../../../services/category-services';
import { CommonMethods } from '../../../shared/common-methods';

@Component({
  selector: 'app-category',
  imports: [
    MatDialogModule,
    NgIf,
    NgFor,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule
  ],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class Category {
  categories: any[] = [];
  parentCategory = [
    { label: 'CCTV', value: 'CCTV' },
    { label: 'CATV', value: 'CATV' },
    { label: 'Internet', value: 'Internet' },
    { label: 'Solar', value: 'Solar' },
    { label: 'Other', value: 'Other' }
  ];
  categoryForm!: FormGroup;
  router = inject(Router);
  isEditData = false;

  statusOptions = [
    { label: 'Active', value: 1 },
    { label: 'Inactive', value: 0 }
  ];

  levelFields = [
    { control: 'level_1', label: 'Level 1' },
    { control: 'level_2', label: 'Level 2' },
    { control: 'level_3', label: 'Level 3' },
    { control: 'level_4', label: 'Level 4' }
  ];

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryServices,
    private ngxLoader: NgxUiLoaderService,
    private comMethodService: CommonMethods,
    private dialog: MatDialogRef<Category>,
    @Inject(MAT_DIALOG_DATA) public dialogData: any
  ) { }

  ngOnInit() {
    this.isEditData = !!this.dialogData;
    this.initForm();
    this.loadCategories();
  }

  initForm() {
    this.categoryForm = this.fb.group({
      category_id: [null],
      parent_category: [null, Validators.required],
      parent_id: [null],
      category_name: [''],
      level_1: [''],
      level_2: [''],
      level_3: [''],
      level_4: [''],
      status: [1, Validators.required],
      sort_order: [0]
    });

    if (!this.isEditData) {
      this.categoryForm.get('level_1')?.setValidators([Validators.required]);
      this.categoryForm.get('level_1')?.updateValueAndValidity();
    }
  }

  loadCategories() {
    this.categoryService.getCategory().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.categories = response ?? [];

        if (this.isEditData) {
          this.patchEditData(this.dialogData);
        }
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.comMethodService.handleError(error);
      }
    });
  }

  patchEditData(data: any) {
    this.categoryForm.patchValue({
      category_id: data.category_id,
      parent_category: null,
      parent_id: data.parent_id,
      category_name: data.category_name,
      level_1: data.category_name,
      status: data.status,
      sort_order: data.sort_order
    });

    this.categoryForm.get('parent_id')?.clearValidators();
    this.categoryForm.get('parent_category')?.clearValidators();
    this.categoryForm.get('category_name')?.setValidators([Validators.required]);
    this.categoryForm.get('parent_id')?.updateValueAndValidity();
    this.categoryForm.get('parent_category')?.updateValueAndValidity();
    this.categoryForm.get('category_name')?.updateValueAndValidity();
  }

  saveSubmit() {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const formValue = this.categoryForm.getRawValue();
    const levelNames = this.levelFields
      .map((field) => formValue[field.control]?.trim())
      .filter(Boolean);

    const payload = {
      parent_category: formValue.parent_category,
      level_names: levelNames,
      status: formValue.status,
      sort_order: formValue.sort_order
    };

    this.ngxLoader.start();

    this.categoryService.addCategory(payload).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.comMethodService.handleTokenAndMessage(response);
        this.dialog.close('success');
        this.router.navigateByUrl('/categoriesLists');
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.comMethodService.handleError(error);
      }
    });
  }

  editSubmit() {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const formValue = this.categoryForm.getRawValue();
    const payload = {
      category_id: formValue.category_id,
      category_name: formValue.category_name,
      parent_id: formValue.parent_id,
      status: formValue.status,
      sort_order: formValue.sort_order
    };

    this.ngxLoader.start();

    this.categoryService.updateCategory(payload).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.comMethodService.handleTokenAndMessage(response);
        this.dialog.close('success');
        this.router.navigateByUrl('/categoriesLists');
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.comMethodService.handleError(error);
      }
    });
  }
}
