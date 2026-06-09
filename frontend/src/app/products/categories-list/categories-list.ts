import { Component, inject } from '@angular/core';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TreeTableModule } from 'primeng/treetable';
import { TagModule } from 'primeng/tag';
import { MatButtonModule } from '@angular/material/button';
import { CategoryServices } from '../../services/category-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';
import { ConfirmationPopup } from '../../shared/confirmation-popup/confirmation-popup';
import { Category } from '../dialog/category/category';

@Component({
  selector: 'app-categories-list',
  imports: [MatToolbar, MatIcon, TagModule, MatButtonModule, MatMenuModule, TreeTableModule],
  templateUrl: './categories-list.html',
  styleUrl: './categories-list.scss',
})
export class CategoriesList {
  dialog = inject(MatDialog);
  isMobile = window.innerWidth < 768;
  treeData: any[] = [];
  responseMessage: any;

  constructor(
    private snackBarService: Snackbar,
    private categoryService: CategoryServices,
    private ngxLoader: NgxUiLoaderService,
    private router: Router
  ) { }

  ngOnInit() {
    this.ngxLoader.start();
    this.getCategoriesList();
  }

  convertToTreeNodes(data: any[]): any[] {
    return data.map(item => ({
      key: item.category_id,
      data: item,
      children: item.children ? this.convertToTreeNodes(item.children) : []
    }));
  }

  getCategoriesList() {
    this.categoryService.getCategory().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.treeData = this.convertToTreeNodes(response ?? []);
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.handleError(error);
      }
    });
  }

  addCategory() {
    const dialogConfig = this.dialog.open(Category, {
      width: this.isMobile ? '96%' : '60%',
      height: this.isMobile ? '90%' : '80%',
      maxWidth: '100vw',
      maxHeight: '100vh',
      disableClose: true,
      position: {
        top: 'calc(1vw + 20px)'
      }
    });

    dialogConfig.afterClosed().subscribe((result) => {
      if (result === 'success') {
        this.getCategoriesList();
      }
    });
  }

  editCategory(categoryValue: any) {
    const dialogConfig = this.dialog.open(Category, {
      data: categoryValue,
      width: this.isMobile ? '96%' : '60%',
      height: this.isMobile ? '90%' : '80%',
      maxWidth: '100vw',
      maxHeight: '100vh',
      disableClose: true,
      position: {
        top: 'calc(1vw + 20px)'
      }
    });

    dialogConfig.afterClosed().subscribe((result) => {
      if (result === 'success') {
        this.getCategoriesList();
      }
    });
  }

  deleteCategory(category: any) {
    const dialogConfig = this.dialog.open(ConfirmationPopup, {
      data: {
        data: category,
        message: "Delete",
        brandName: "Category Name"
      },
      width: this.isMobile ? '90%' : '40%',
      height: this.isMobile ? '40%' : '40%',
      maxWidth: '100vw',
      maxHeight: '100vh',
      disableClose: true,
      position: {
        top: 'calc(1vw + 20px)'
      }
    });

    const sub = dialogConfig.componentInstance.onEmitStatusChange.subscribe(() => {
      this.categoryService.deleteCategory(category.category_id).subscribe({
        next: (response: any) => {
          this.ngxLoader.stop();
          this.handleTokenAndMessage(response);
          dialogConfig.close('success');
          this.router.navigateByUrl('/categoriesLists');
        },
        error: (error: any) => {
          this.ngxLoader.stop();
          this.handleError(error);
        }
      });
    });

    dialogConfig.afterClosed().subscribe((result) => {
      if (result === 'success') {
        sub.unsubscribe();
        this.getCategoriesList();
      }
    });
  }

  formatIndiaDate(value: string) {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    }).format(new Date(value));
  }

  private handleTokenAndMessage(response: any) {
    if (response?.token) {
      localStorage.setItem('token', response.token);
    }
    this.responseMessage = response?.message;
    this.snackBarService.openSnackbar(this.responseMessage, '');
  }

  private handleError(error: any) {
    this.responseMessage = error?.error?.message || globalConstants.genericError;
    this.snackBarService.openSnackbar(this.responseMessage, globalConstants.errorRegex);
  }
}
