import { Component, Inject, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormArray, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { CategoryServices } from '../../../services/category-services';
import { CategoryInterface } from '../../../interfaces/category-interface'
import { CommonMethods } from '../../../shared/common-methods';


@Component({
  selector: 'app-category',
  imports: [MatToolbarModule, MatIconModule, MatDialogModule, NgIf,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule, ReactiveFormsModule,
    FormsModule, NgFor
  ],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})

export class Category {

  categories: any[] = [];
  levels: any[][] = [];
  selectedLevels: any[] = [];
  categoryForm: any = FormGroup;
  router = inject(Router)
  isEditData!: boolean


  constructor(private fb: FormBuilder,
    private categoryService: CategoryServices,
    private ngxLoader: NgxUiLoaderService,
    private comMethodService: CommonMethods,
    private dialog: MatDialogRef<Category>,
    @Inject(MAT_DIALOG_DATA) public dialogData: any) { }


  initForm() {
    this.categoryForm = this.fb.group({
      category_id: [null], // ✅ REQUIRED for update
      category_name: ['', Validators.required],
      slug: [''],
      parent_id: [null],
      level: [1],
      status: [1],
      sort_order: [0],
      levelControls: this.fb.array([])
    });
  }

  ngOnInit() {
    this.initForm();
    if (this.dialogData) {
      this.isEditData = true;
    }
    this.loadCategories();
  }

  loadCategories() {
    this.categoryService.getCategory().subscribe((response: any) => {
      this.ngxLoader.stop();
      this.categories = response;

      this.levels = [];
      this.levelControls.clear();

      // Level 1
      this.levels[0] = this.categories;
  
      this.levelControls.push(this.fb.control(null));
     

      // 🔥 PATCH AFTER DATA LOAD
      if (this.isEditData) {
        this.patchEditData(this.dialogData);
      }
    });
  }

  patchEditData(data: any) {
    this.categoryForm.patchValue({
      category_id: data.category_id,
      category_name: data.category_name,
      status: data.status,
      sort_order: data.sort_order
    });

    this.buildParentLevels(data.parent_id);
  }


  buildParentLevels(parentId: number | null) {
    this.levelControls.clear();
    this.levels = [];

    // level 1
    this.levels[0] = this.categories;

    console.log("buildParentLevels", this.levels[0])

    let hierarchy: any[] = [];

    while (parentId) {
      const parent = this.findCategoryById(parentId, this.categories);
      if (!parent) break;

      hierarchy.unshift(parent);
      parentId = parent.parent_id;
    }

    hierarchy.forEach((item, index) => {
      this.levelControls.push(this.fb.control(item));

      if (item.children?.length) {
        this.levels[index + 1] = item.children;
      }
    });

    // Ensure at least one control
    if (this.levelControls.length === 0) {
      this.levelControls.push(this.fb.control(null));
    }
  }

  findCategoryById(id: number, list: any[]): any {
    for (let item of list) {
      if (item.category_id === id) return item;

      if (item.children?.length) {
        const found = this.findCategoryById(id, item.children);
        if (found) return found;
      }
    }
    return null;
  }

  onLevelChange(index: number) {
    const selected = this.levelControls.at(index).value;

    while (this.levelControls.length > index + 1) {
      this.levelControls.removeAt(this.levelControls.length - 1);
      this.levels.pop();
    }

    if (selected?.children?.length) {
      this.levels[index + 1] = selected.children;
      this.levelControls.push(this.fb.control(null));
    }
  }

  get levelControls(): FormArray {
    return this.categoryForm.get('levelControls') as FormArray;
  }

  getSelectedParent(): any {
    const values = this.levelControls.value;
    return values.filter((x: any) => x).slice(-1)[0] || null;
  }

  slugify(text: string) {
    return text.toLowerCase().replace(/\s+/g, '-');
  }

  saveSubmit() {
    const parent = this.getSelectedParent();

    const payload = {
      category_name: this.categoryForm.value.category_name,
      parent_id: parent ? parent.category_id : null,
      level: parent ? parent.level + 1 : 1,
      status: this.categoryForm.value.status,
      sort_order: this.categoryForm.value.sort_order,
      slug: this.slugify(this.categoryForm.value.category_name)
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
    const parent = this.getSelectedParent();

    const payload = {
      category_id: this.categoryForm.value.category_id, // ✅ FIX
      category_name: this.categoryForm.value.category_name,
      parent_id: parent ? parent.category_id : null,
      level: parent ? parent.level + 1 : 1, // ✅ FIX
      status: this.categoryForm.value.status,
      sort_order: this.categoryForm.value.sort_order,
      slug: this.slugify(this.categoryForm.value.category_name)
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
