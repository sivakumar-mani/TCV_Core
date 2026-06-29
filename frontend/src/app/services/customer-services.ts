import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({
  providedIn: 'root',
})
export class CustomerServices {
  private url = appConfig.apiUrl;
  private http = inject(HttpClient);
  private endpoint = `${this.url}/v1/customers`;

  getCustomers() {
    return this.http.get(this.endpoint);
  }

  getCustomerById(customerId: number) {
    return this.http.get(`${this.endpoint}/${customerId}`);
  }

  getStates() {
    return this.http.get(`${this.url}/location/states`);
  }

  getDistricts(stateId: number) {
    return this.http.get(`${this.url}/location/districts/${stateId}`);
  }

  getMarketingEmployees() {
    return this.http.get(`${this.endpoint}/marketing-employees`);
  }

  addCustomer(data: any) {
    return this.http.post(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateCustomer(data: any) {
    return this.http.patch(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  deleteCustomer(data: any) {
    return this.http.delete(this.endpoint, {
      body: data,
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
