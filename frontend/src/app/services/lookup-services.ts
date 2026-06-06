import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class LookupServices {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSuppliers() {
    return this.http.get(`${this.url}/lookup/suppliers`);
  }

  getCustomers() {
    return this.http.get(`${this.url}/lookup/customers`);
  }

  getProducts() {
    return this.http.get(`${this.url}/lookup/products`);
  }

  getEmployees() {
    return this.http.get(`${this.url}/lookup/employees`);
  }

  getWorkOrders() {
    return this.http.get(`${this.url}/lookup/work-orders`);
  }

  getMaterialIssues() {
    return this.http.get(`${this.url}/lookup/material-issues`);
  }
}
