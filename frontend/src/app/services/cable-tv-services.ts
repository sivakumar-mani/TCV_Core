import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({ providedIn: 'root' })
export class CableTvServices {
  private http = inject(HttpClient);
  private endpoint = `${appConfig.apiUrl}/v1/cable-tv`;
  private jsonHeaders = new HttpHeaders().set('content-type', 'application/json');

  getLookups() {
    return this.http.get(`${this.endpoint}/lookups`);
  }

  getCustomers(approvalStatus = 'APPROVED') {
    return this.http.get(`${this.endpoint}/customers`, {
      params: { approval_status: approvalStatus }
    });
  }

  getCustomerById(customerId: number) {
    return this.http.get(`${this.endpoint}/customers/${customerId}`);
  }

  addCustomer(data: any) {
    return this.http.post(`${this.endpoint}/customers`, data, { headers: this.jsonHeaders });
  }

  updateCustomer(customerId: number, data: any) {
    return this.http.patch(`${this.endpoint}/customers/${customerId}`, data, { headers: this.jsonHeaders });
  }
}
