import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-category-list',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatCardModule, MatSlideToggleModule],
  templateUrl: './category-list.html',
  styleUrl: './category-list.scss',
})
export class CategoryList {
 fb = inject(FormBuilder);
  // service = inject(CategoryService);
  categories = signal<any[]>([]);

  categoryForm: FormGroup;
  isEdit = signal(false);

  constructor() {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      slug: [''],
      parentId: [null],
      status: [1],
      sortOrder: [0]
    });
    // this.loadCategories();
  }

  // loadCategories() {
  //   this.service.getCategories().subscribe(cats => this.categories.set(cats));
  // }

  // save() {
  //   if (this.categoryForm.valid) {
  //     const data = this.categoryForm.value;
  //     if (this.isEdit()) {
  //       this.service.update(data.category_id, data).subscribe();
  //     } else {
  //       this.service.create(data).subscribe(() => this.loadCategories());
  //     }
  //   }
  // }

  reset() { this.categoryForm.reset(); this.isEdit.set(false); }
}
