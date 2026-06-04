import { Component, ViewChild } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { StockServices } from '../../services/stock-services';
import { CommonMethods } from '../../shared/common-methods';

@Component({
  selector: 'app-stock-list',
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, MatPaginatorModule, MatTableModule, MatToolbarModule],
  templateUrl: './stock-list.html',
  styleUrl: './stock-list.scss',
})
export class StockList {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'serial',
    'product_code',
    'product_name',
    'unit',
    'purchase_price',
    'selling_price',
    'available_qty',
    'minimum_stock',
    'last_updated'
  ];
  dataSource = new MatTableDataSource<any>([]);

  constructor(
    private stockService: StockServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods
  ) {}

  ngOnInit() {
    this.loadStock();
  }

  loadStock() {
    this.ngxLoader.start();
    this.stockService.getSummary().subscribe({
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

  applyFilter(event: Event) {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }
}
