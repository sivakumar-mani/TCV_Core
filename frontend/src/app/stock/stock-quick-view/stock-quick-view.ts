import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { StockServices } from '../../services/stock-services';
import { CommonMethods } from '../../shared/common-methods';

type QuickStatus = 'available' | 'low' | 'unavailable';

@Component({
  selector: 'app-stock-quick-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-quick-view.html',
  styleUrl: './stock-quick-view.scss'
})
export class StockQuickView {
  rows: any[] = [];
  search = '';
  filter: 'all' | QuickStatus = 'all';

  constructor(private stockService: StockServices, private loader: NgxUiLoaderService, private commonMethods: CommonMethods) {}

  ngOnInit() {
    this.loader.start();
    this.stockService.getStock().subscribe({
      next: (response: any) => {
        this.rows = Array.isArray(response) ? response : response?.data || [];
        this.loader.stop();
      },
      error: (error: any) => {
        this.loader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  status(row: any): QuickStatus {
    const quantity = Number(row.available_qty) || 0;
    if (quantity <= 0) return 'unavailable';
    return quantity <= (Number(row.minimum_stock) || 0) ? 'low' : 'available';
  }

  count(status: QuickStatus) { return this.rows.filter(row => this.status(row) === status).length; }

  get visibleRows() {
    const query = this.search.trim().toLowerCase();
    return this.rows.filter(row =>
      (this.filter === 'all' || this.status(row) === this.filter) &&
      (!query || [row.brand_name, row.product_name, row.product_code].some(value => String(value || '').toLowerCase().includes(query)))
    );
  }
}
