import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { SupplierServices } from '../../services/supplier-services';
import { CommonMethods } from '../../shared/common-methods';
import { ConfirmationPopup } from '../../shared/confirmation-popup/confirmation-popup';
import { AddSupplier } from '../add-supplier/add-supplier';

@Component({
  selector: 'app-supplier-list',
  imports: [
    MatIconModule,
    MatToolbarModule,
    MatTableModule,
    MatPaginatorModule,
    MatMenuModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule
  ],
  templateUrl: './supplier-list.html',
  styleUrl: './supplier-list.scss',
})
export class SupplierList {
  displayedColumns: string[] = [
    'serial',
    'supplier_name',
    'contact_person',
    'phone',
    'email',
    'gst_no',
    'city',
    'state',
    'pincode',
    'status',
    'action'
  ];
  dataSource = new MatTableDataSource<any>([]);
  dialog = inject(MatDialog);

  constructor(
    private supplierService: SupplierServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.ngxLoader.start();
    this.supplierService.getSuppliers().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const data = Array.isArray(response) ? response : response.data ?? [];
        this.dataSource = new MatTableDataSource(data);
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addSupplier() {
    const dialogRef = this.dialog.open(AddSupplier, {
      width: '60%',
      height: '75%',
      maxHeight: '100vh',
      maxWidth: '100vw',
      disableClose: true,
      position: {
        top: 'calc(1vw + 20px)'
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') {
        this.loadSuppliers();
      }
    });
  }

  editSupplier(row: any) {
    const dialogRef = this.dialog.open(AddSupplier, {
      data: row,
      width: '60%',
      height: '75%',
      maxHeight: '100vh',
      maxWidth: '100vw',
      disableClose: true,
      position: {
        top: 'calc(1vw + 20px)'
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') {
        this.loadSuppliers();
      }
    });
  }

  deleteSupplier(row: any) {
    const dialogRef = this.dialog.open(ConfirmationPopup, {
      data: {
        data: row,
        message: 'Delete',
        brandName: 'Supplier Name'
      },
      width: '60%',
      height: '60%',
      maxWidth: '100vw',
      maxHeight: '100vh',
      disableClose: true,
      position: {
        top: 'calc(1vw + 20px)'
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') {
        this.loadSuppliers();
      }
    });

    dialogRef.componentInstance.onEmitStatusChange.subscribe(() => {
      this.ngxLoader.start();
      this.supplierService.deleteSupplier({ supplier_id: row.supplier_id }).subscribe({
        next: (response: any) => {
          this.ngxLoader.stop();
          this.commonMethods.handleTokenAndMessage(response);
          if (response) {
            dialogRef.close('success');
          }
          this.router.navigateByUrl('/suppliers');
        },
        error: (error: any) => {
          this.ngxLoader.stop();
          this.commonMethods.handleError(error);
        }
      });
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  getStatusLabel(status: number | string) {
    return Number(status) === 1 ? 'Active' : 'Inactive';
  }
}
