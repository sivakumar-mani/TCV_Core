import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class PurchaseServices {
  private url = environment.apiUrl;
  private http = inject(HttpClient);
  private endpoint = `${this.url}/v1/purchase`;
  private headers = new HttpHeaders().set('content-type', 'application/json');

  getPurchases() {
    return this.http.get(this.endpoint);
  }

  getPurchaseById(purchaseId: number) {
    return this.http.get(`${this.endpoint}/${purchaseId}`);
  }

  getNextPurchaseNo() {
    return this.http.get(`${this.endpoint}/next-no`);
  }

  addPurchase(data: any) {
    return this.http.post(this.endpoint, data, { headers: this.headers });
  }

  updatePurchase(data: any) {
    return this.http.patch(this.endpoint, data, { headers: this.headers });
  }

  deletePurchase(data: any) {
    return this.http.delete(this.endpoint, {
      body: data,
      headers: this.headers
    });
  }
}
