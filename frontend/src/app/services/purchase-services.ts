import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class PurchaseServices {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPurchases() {
    return this.http.get(`${this.url}/purchase/get`);
  }

  getPurchaseItems(purchaseId: number) {
    return this.http.get(`${this.url}/purchase/${purchaseId}/items`);
  }

  addPurchase(data: any) {
    return this.http.post(`${this.url}/purchase/add`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  addPurchaseItem(purchaseId: number, data: any) {
    return this.http.post(`${this.url}/purchase/${purchaseId}/items/add`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
