import { Component, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { MaterialServices } from '../../services/material-services';
import { CommonMethods } from '../../shared/common-methods';

@Component({
  selector: 'app-material-return-list',
  imports: [MatButtonModule, MatIconModule, MatPaginatorModule, MatTableModule, MatToolbarModule],
  templateUrl: './material-return-list.html',
  styleUrl: './material-return-list.scss',
})
export class MaterialReturnList {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'serial',
    'return_no',
    'return_date',
    'work_order_no',
    'returned_by_employee_name',
    'received_by_name',
    'return_status',
    'remarks',
    'action'
  ];
  dataSource = new MatTableDataSource<any>([]);

  constructor(
    private materialService: MaterialServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadReturns();
  }

  loadReturns() {
    this.ngxLoader.start();
    this.materialService.getReturns().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.dataSource = new MatTableDataSource(response?.data ?? response ?? []);
        this.dataSource.paginator = this.paginator;
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  markReturned(row: any) {
    this.ngxLoader.start();
    this.materialService.updateReturnStatus(row.material_return_id, 'RETURNED').subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadReturns();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addReturn() {
    this.router.navigateByUrl('/material-returns/add');
  }

  applyFilter(event: Event) {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }
}

