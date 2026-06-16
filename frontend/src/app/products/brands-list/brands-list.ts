import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { BrandServices } from '../../services/brand-services';
import { globalConstants } from '../../services/global-constants';
import { Snackbar } from '../../services/snackbar';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { ActionMenu } from '../../shared/list-action-menu';
import { ConfirmationPopup } from '../../shared/confirmation-popup/confirmation-popup';
import { Brands } from '../dialog/brands/brands';

@Component({
  selector: 'app-brands-list',
  imports: [MatIconModule, MatToolbarModule, AgGridList],
  templateUrl: './brands-list.html',
  styleUrl: './brands-list.scss',
})
export class BrandsList {
  isMobile = window.innerWidth < 768;
  brandList: any[] = [];
  responseMessage: any;
  dialog = inject(MatDialog);
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [10, 25, 50, 100];

  constructor(
    private brandServices: BrandServices,
    private ngxLoader: NgxUiLoaderService,
    private snackbarService: Snackbar,
    private router: Router,
  ) { }

  ngOnInit() {
    this.ngxLoader.start();
    this.brandData();
  }

  brandData() {
    this.brandServices.getBrands().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.brandList = response ?? [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.handleError(error);
      }
    });
  }

  addBrand() {
    const dialogConfig = this.dialog.open(Brands, {
      width: this.isMobile ? '96%' : '50%',
      height: this.isMobile ? '90%' : '70%',
      maxHeight: '100vh',
      maxWidth: '100vw',
      disableClose: true,
      position: {
        top: 'calc(1vw + 20px)'
      },
    });

    dialogConfig.afterClosed().subscribe((result) => {
      if (result === 'success') {
        this.brandData();
      }
    });
  }

  viewBrand(brandData: any) {
    this.dialog.open(Brands, {
      data: { mode: 'view', brand: brandData },
      width: this.isMobile ? '96%' : '50%',
      height: this.isMobile ? '90%' : '70%',
      maxHeight: '100vh',
      maxWidth: '100vw',
      disableClose: true,
      position: {
        top: '20px'
      },
    });
  }

  editBrand(brandData: any) {
    const dialogConfig = this.dialog.open(Brands, {
      data: { mode: 'edit', brand: brandData },
      width: this.isMobile ? '96%' : '50%',
      height: this.isMobile ? '90%' : '70%',
      maxHeight: '100vh',
      maxWidth: '100vw',
      disableClose: true,
      position: {
        top: 'calc(1vw + 20px)'
      },
    });

    dialogConfig.afterClosed().subscribe((result) => {
      if (result === 'success') {
        this.brandData();
      }
    });
  }

  deleteBrand(brandData: any) {
    const dialogConfig = this.dialog.open(ConfirmationPopup, {
      data: {
        data: brandData,
        message: "Delete",
        brandName: "Brand Name"
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
      this.brandServices.deleteBrand(brandData).subscribe({
        next: (response: any) => {
          this.ngxLoader.stop();
          this.handleTokenAndMessage(response);
          dialogConfig.close('success');
          this.router.navigateByUrl('/brands');
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
        this.brandData();
      }
    });
  }

  defaultColDef: ColDef = {
    resizable: true,
    minWidth: 120,
    flex: 1,
    filter: true,
    floatingFilter: true,
    headerClass: 'ag-header-style',
  };

  formatIndiaDate = (params: any) => {
    if (!params.value) return '';
    const date = new Date(params.value);
    if (Number.isNaN(date.getTime())) return String(params.value);
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  };

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 70, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'brand_code', headerName: 'Brand Code', maxWidth: 160 },
    { field: 'brand_name', headerName: 'Brand Name', maxWidth: 180 },
    { field: 'description', headerName: 'Description', minWidth: 260 },
    { field: 'status', headerName: 'Status', maxWidth: 120 },
    { field: 'created_at', headerName: 'Created Date', valueFormatter: this.formatIndiaDate },
    { field: 'updated_at', headerName: 'Updated Date', valueFormatter: this.formatIndiaDate },
    {
      headerName: 'Action',
      maxWidth: 120,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'View', action: (brandData: any) => this.viewBrand(brandData) },
          { label: 'Edit', action: (brandData: any) => this.editBrand(brandData) },
          { label: 'Delete', action: (brandData: any) => this.deleteBrand(brandData) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  private handleTokenAndMessage(response: any) {
    if (response?.token) {
      localStorage.setItem('token', response?.token);
    }
    this.responseMessage = response?.message;
    this.snackbarService.openSnackbar(this.responseMessage, '');
  }

  private handleError(error: any) {
    this.responseMessage = error?.error?.message || globalConstants.genericError;
    this.snackbarService.openSnackbar(this.responseMessage, globalConstants.errorRegex);
  }
}
