import { Component } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CategoryServices } from '../../services/category-services';
import { NgClass, NgIf } from '@angular/common';
import { SelectModule } from 'primeng/select';


@Component({
  selector: 'app-category-list',
  imports: [TableModule,  ButtonModule, SelectModule, NgClass, NgIf,   DialogModule,  FormsModule,
   ],
  templateUrl: './category-list.html',
  providers: [ConfirmationService, MessageService],
  styleUrl: './category-list.scss',
})
export class CategoryList {
 
   flatCategories: any[] = [];
  displayDialog = false;
  selectedCategory: any = {};
  loading = false;

  constructor(
    private categoryService: CategoryServices,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading = true;
    this.categoryService.getCategory().subscribe({
      next: (res: any) => {
        const data = res.data ?? res;
        this.flatCategories = [];
        this.flattenCategories(data);
        this.loading = false;
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load categories' });
        this.loading = false;
      }
    });
  }

  private flattenCategories(nodes: any[]) {
    for (const node of nodes) {
      this.flatCategories.push({ ...node, children: undefined });
      if (node.children?.length) {
        this.flattenCategories(node.children);
      }
    }
  }

  editCategory(cat: any) {
    this.selectedCategory = { ...cat };
    this.displayDialog = true;
  }

  updateCategory() {
    // this.categoryService.updateCategory(this.selectedCategory.category_id, this.selectedCategory).subscribe({
    //   next: () => {
    //     this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Category updated successfully' });
    //     this.displayDialog = false;
    //     this.loadCategories(); // refresh list
    //   },
    //   error: () => {
    //     this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Update failed' });
    //   }
    // });
  }

  deleteCategory(cat: any) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete <b>${cat.category_name}</b>?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.categoryService.deleteCategory(cat.category_id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Category deleted successfully' });
            this.loadCategories();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed' });
          }
        });
      }
    });
  }
}
