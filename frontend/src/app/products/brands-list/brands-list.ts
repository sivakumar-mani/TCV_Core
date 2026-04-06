import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';

import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BrandServices } from '../../services/brand-services';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { Snackbar } from '../../services/snackbar';
import { Router } from '@angular/router';
import { globalConstants } from '../../services/global-constants';
import { ActionMenu } from '../../shared/list-action-menu';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Brands } from './dialog/brands/brands';
import { ConfirmationPopup } from '../../shared/confirmation-popup/confirmation-popup';

@Component({
  selector: 'app-brands-list',
  imports: [MatIconModule, MatToolbarModule,
    MatTableModule, MatPaginatorModule, MatMenuModule, MatMenuModule,
    MatInputModule, MatFormFieldModule, ReactiveFormsModule,
  ],
  templateUrl: './brands-list.html',
  styleUrl: './brands-list.scss',
})
export class BrandsList {
  displayedColumns: string[] = ['serial', 'brand_code', 'brand_name', 'description', 'status', 'created_at', 'updated_at', 'action'];
  dataSource: any;
  responseMessage: any;
  dialog = inject(MatDialog);

  constructor(private http: HttpClient,
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
    this.brandServices.getBrands().subscribe((response: any) => {
      this.ngxLoader.stop();
      this.dataSource = new MatTableDataSource(response);
    },
      (error: any) => {
        this.ngxLoader.stop();
        if (error.error?.message) {
          this.responseMessage = error.error?.message;
        } else {
          this.responseMessage = globalConstants.genericError;
        }
        this.snackbarService.openSnackbar(this.responseMessage, globalConstants.errorRegex)
      }
    )
  }

  addBrand() {
    const dialogConfig = this.dialog.open(Brands, {
      width: '40%',
      height: '60%',
      maxHeight: '100vh',
      maxWidth: '100vw',
      disableClose: true,
      position: {
        top: 'calc(1vw + 20px)'
      },
    });
    dialogConfig.afterClosed().subscribe((results) => {
      if (results == 'success') {
        this.brandData();
      }
    })
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
  editBrand(value: any) {
    const dialogConfig = this.dialog.open(Brands, {
      data: value,
      width: '40%',
      height: '60%',
      maxHeight: '100vh',
      maxWidth: '100vw',
      disableClose: true,
      position: {
        top: 'calc(1vw + 20px)'
      },
    })
    dialogConfig.afterClosed().subscribe((results) => {
      if (results == 'success') {
        this.brandData();
      }
    })
  }
  deleteBrand(dialogData: any) {
    const dialogConfig = this.dialog.open(ConfirmationPopup, {
      data: {
        data: dialogData,
        message: "Delete",
        brandName: "Brand Name"
      },
      width: '60%',
      height: '60%',
      maxWidth: '100vw',
      maxHeight: '100vh',
      disableClose: true,
      position: {
        top: 'calc(1vw + 20px)'
      }
    })
      dialogConfig.afterClosed().subscribe((results) => {
            if (results == 'success') {
              this.brandData();
            }
          })
    const sub = dialogConfig.componentInstance.onEmitStatusChange.subscribe(() => {
      this.brandServices.deleteBrand(dialogData).subscribe({
        next: (response: any) => {
          this.ngxLoader.stop();
          this.handleTokenAndMessage(response);
          if (response) {
            dialogConfig.close('success');
          }
          this.router.navigateByUrl('/brands');
        },
        error: (error: any) => {
          this.ngxLoader.stop();
          this.handleError(error);
        }
      })
    })
    
  }

  public handleTokenAndMessage(response: any) {
    if (response?.token) {
      localStorage.setItem('token', response?.token)
    }
    this.responseMessage = response.message;
    this.snackbarService.openSnackbar(this.responseMessage, '')
  }
  public handleError(error: any) {
    if (error.error?.message) {
      this.responseMessage = error.error?.message || globalConstants.genericError
    }
    this.snackbarService.openSnackbar(this.responseMessage, globalConstants.errorRegex)
  }
}
