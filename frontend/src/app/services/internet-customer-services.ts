import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({ providedIn: 'root' })
export class InternetCustomerServices {
  private http = inject(HttpClient);
  private endpoint = `${appConfig.apiUrl}/v1/internet`;
  getLookups() { return this.http.get<any>(`${this.endpoint}/lookups`); }
  getCustomers() { return this.http.get<any[]>(`${this.endpoint}/customers`); }
  getCustomer(id: number) { return this.http.get<any>(`${this.endpoint}/customers/${id}`); }
  addCustomer(data: any) { return this.http.post<any>(`${this.endpoint}/customers`, data); }
  updateCustomer(id: number, data: any) { return this.http.put<any>(`${this.endpoint}/customers/${id}`, data); }
  getComplaints(id: number) { return this.http.get<any[]>(`${this.endpoint}/customers/${id}/complaints`); }
  addComplaint(id: number, data: any) { return this.http.post<any>(`${this.endpoint}/customers/${id}/complaints`, data); }
}
