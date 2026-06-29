import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({
  providedIn: 'root',
})
export class StockServices {
  private url = appConfig.apiUrl;
  private http = inject(HttpClient);
  private endpoint = `${this.url}/v1/stock`;
  private headers = new HttpHeaders().set('content-type', 'application/json');

  getStock() {
    return this.http.get(this.endpoint);
  }

  getLedger(productId?: number) {
    const suffix = productId ? `?product_id=${productId}` : '';
    return this.http.get(`${this.endpoint}/ledger${suffix}`);
  }

  updateSettings(data: any) {
    return this.http.patch(`${this.endpoint}/settings`, data, { headers: this.headers });
  }

  adjustStock(data: any) {
    return this.http.post(`${this.endpoint}/adjust`, data, { headers: this.headers });
  }
}
