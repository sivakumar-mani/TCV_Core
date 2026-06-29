import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({ providedIn: 'root' })
export class CustomerPaymentServices {
  private http = inject(HttpClient);
  private endpoint = `${appConfig.apiUrl}/customer-payment`;

  getPayments() {
    return this.http.get(this.endpoint);
  }

  addPayment(data: any) {
    return this.http.post(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updatePayment(data: any) {
    return this.http.patch(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  deletePayment(data: any) {
    return this.http.delete(this.endpoint, {
      body: data,
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
