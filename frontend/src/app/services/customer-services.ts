import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class CustomerServices {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCustomers() {
    return this.http.get(`${this.url}/customer/get`);
  }

  getCustomerById(customerId: number) {
    return this.http.get(`${this.url}/customer/get/${customerId}`);
  }

  addCustomer(data: any) {
    return this.http.post(`${this.url}/customer/add`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateCustomer(data: any) {
    return this.http.patch(`${this.url}/customer/update`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  deleteCustomer(data: any) {
    return this.http.delete(`${this.url}/customer/delete`, {
      body: data,
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
