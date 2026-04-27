import { Component } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CategoryServices } from '../../services/category-services';
import { NgFor, NgStyle } from '@angular/common';

interface Category {
  category_id: number;
  category_name: string;
  parent_id: number | null;
  level: number;
  slug: string;
  status: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

@Component({
  selector: 'app-category-lists',
  imports: [  AccordionModule, NgFor, 
    TableModule,
    ButtonModule],
  templateUrl: './category-lists.html',
  styleUrl: './category-lists.scss',
})
export class CategoryLists {
 categories: Category[] = [];
flattenedMap: { [key: number]: Category[] } = {};

constructor(
  private categoryService: CategoryServices,
) {}

ngOnInit() {
  this.categoryService.getCategory().subscribe({
    next: (res: any) => {
      this.categories = res.data ?? res;

      // ✅ IMPORTANT: run AFTER data is set
      this.buildFlattenMap();
    },
    error: (err) => {
      console.error(err);
    }
  });
}

 buildFlattenMap() {
  this.flattenedMap = {};

  this.categories.forEach((parent: Category) => {
    parent.children?.forEach((child: Category) => {
      this.flattenedMap[child.category_id] =
        this.flatten(child.children || [], child.level + 1);
    });
  });
}
flatten(children: any[], level: number): any[] {
  let result: any[] = [];

  if (!children) return result;

  children.forEach(child => {
    result.push({ ...child, level });

    if (child.children?.length) {
      result = result.concat(
        this.flatten(child.children, level + 1)
      );
    }
  });

  return result;
}

getFlattened(childId: number) {
  return this.flattenedMap[childId] || [];
}

  edit(item: any) {
    console.log('Edit:', item);
  }

  update(item: any) {
    console.log('Update:', item);
  }
}
