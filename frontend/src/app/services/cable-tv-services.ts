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

  getMasters() {
    return this.http.get(`${this.endpoint}/masters`);
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

  addLocation(data: any) {
    return this.http.post(`${this.endpoint}/masters/locations`, data, { headers: this.jsonHeaders });
  }

  addArea(data: any) {
    return this.http.post(`${this.endpoint}/masters/areas`, data, { headers: this.jsonHeaders });
  }

  addStreet(data: any) {
    return this.http.post(`${this.endpoint}/masters/streets`, data, { headers: this.jsonHeaders });
  }

  addLocationInfo(data: any) {
    return this.http.post(`${this.endpoint}/masters/location-info`, data, { headers: this.jsonHeaders });
  }

  updateLocationInfo(streetId: number, data: any) {
    return this.http.patch(`${this.endpoint}/masters/location-info/${streetId}`, data, { headers: this.jsonHeaders });
  }

  deleteLocationInfo(streetId: number) {
    return this.http.delete(`${this.endpoint}/masters/location-info/${streetId}`);
  }

  addPackage(data: any) {
    return this.http.post(`${this.endpoint}/masters/packages`, data, { headers: this.jsonHeaders });
  }

  addStbMaster(data: any) {
    return this.http.post(`${this.endpoint}/masters/stbs`, data, { headers: this.jsonHeaders });
  }

  getPendingAccounts() {
    return this.http.get(`${this.endpoint}/accounts/pending`);
  }

  receiveAccount(accountId: number) {
    return this.http.patch(`${this.endpoint}/accounts/${accountId}/receive`, {}, { headers: this.jsonHeaders });
  }
}
