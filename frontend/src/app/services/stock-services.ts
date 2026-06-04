import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class StockServices {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSummary() {
    return this.http.get(`${this.url}/stock/summary`);
  }

  getLedger(productId?: number) {
    const params: any = {};
    if (productId) params.product_id = productId;
    return this.http.get(`${this.url}/stock/ledger`, { params });
  }
}
