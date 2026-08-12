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
  updateCustomerInformation(id: number, data: any) { return this.http.patch<any>(`${this.endpoint}/customers/${id}/information`, data); }
  addCustomerHistory(id: number, section: string, data: any) { return this.http.post<any>(`${this.endpoint}/customers/${id}/${section}`, data); }
  getComplaints(id: number) { return this.http.get<any[]>(`${this.endpoint}/customers/${id}/complaints`); }
  addComplaint(id: number, data: any) { return this.http.post<any>(`${this.endpoint}/customers/${id}/complaints`, data); }
  getSubscriptionLookups() { return this.http.get<any>(`${this.endpoint}/subscription-dues/lookups`); }
  getPendingSubscriptions(filters: any) { return this.http.get<any>(`${this.endpoint}/subscription-dues`, { params: filters }); }
  receiveSubscriptionPayment(id: number, data: any) { return this.http.patch<any>(`${this.endpoint}/subscription-dues/${id}/receive`, data); }
  updateSubscription(customerId: number, subscriptionId: number, data: any) { return this.http.patch<any>(`${this.endpoint}/customers/${customerId}/subscriptions/${subscriptionId}`, data); }
  deleteSubscription(customerId: number, subscriptionId: number) { return this.http.delete<any>(`${this.endpoint}/customers/${customerId}/subscriptions/${subscriptionId}`); }
  updatePackage(customerId: number, packageRowId: number, data: any) { return this.http.patch<any>(`${this.endpoint}/customers/${customerId}/packages/${packageRowId}`, data); }
  deletePackage(customerId: number, packageRowId: number) { return this.http.delete<any>(`${this.endpoint}/customers/${customerId}/packages/${packageRowId}`); }
  getSubscriptionReport(filters: any) { return this.http.get<any>(`${this.endpoint}/subscription-report`, { params: filters }); }
}
