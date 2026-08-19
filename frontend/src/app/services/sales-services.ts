import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({ providedIn: 'root' })
export class SalesServices {
  private http = inject(HttpClient);
  private endpoint = `${appConfig.apiUrl}/sales`;

  getSales() {
    return this.http.get(this.endpoint);
  }

  getSaleById(salesId: number) {
    return this.http.get(`${this.endpoint}/${salesId}`);
  }

  addSale(data: any) {
    return this.http.post(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  addCustomerInvoice(customerId: number, data: any) {
    return this.http.post(`${appConfig.apiUrl}/customer/${customerId}/invoice`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateSale(data: any) {
    return this.http.patch(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  deleteSale(data: any) {
    return this.http.delete(this.endpoint, {
      body: data,
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
