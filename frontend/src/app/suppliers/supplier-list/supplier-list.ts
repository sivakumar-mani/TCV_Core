import { Component, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { SupplierServices } from '../../services/supplier-services';
import { CommonMethods } from '../../shared/common-methods';
import { ConfirmationPopup } from '../../shared/confirmation-popup/confirmation-popup';

@Component({
  selector: 'app-supplier-list',
  imports: [
    MatIconModule,
    MatToolbarModule,
    MatTableModule,
    MatPaginatorModule,
    MatMenuModule,
    MatButtonModule
  ],
  templateUrl: './supplier-list.html',
  styleUrl: './supplier-list.scss',
})
export class SupplierList {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

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
        this.dataSource.paginator = this.paginator;
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addSupplier() {
    this.router.navigateByUrl('/suppliers/add');
  }

  editSupplier(row: any) {
    this.router.navigate(['/suppliers/edit', row.supplier_id]);
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

    const confirmSub = dialogRef.componentInstance.onEmitStatusChange.subscribe(() => {
      this.ngxLoader.start();
      this.supplierService.deleteSupplier({ supplier_id: row.supplier_id }).subscribe({
        next: (response: any) => {
          this.ngxLoader.stop();
          this.commonMethods.handleTokenAndMessage(response);
          if (response) {
            dialogRef.close('success');
          }
        },
        error: (error: any) => {
          this.ngxLoader.stop();
          this.commonMethods.handleError(error);
        }
      });
    });

    dialogRef.afterClosed().subscribe((result) => {
      confirmSub.unsubscribe();
      if (result === 'success') {
        this.loadSuppliers();
      }
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

