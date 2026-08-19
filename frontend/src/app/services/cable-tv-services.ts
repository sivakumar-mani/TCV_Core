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

  getCustomers(approvalStatus = 'ALL') {
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

  updateCustomerInformation(customerId: number, data: any) {
    return this.http.patch(`${this.endpoint}/customers/${customerId}/information`, data, { headers: this.jsonHeaders });
  }

  addCustomerConnection(customerId: number, data: any) {
    return this.http.post(`${this.endpoint}/customers/${customerId}/connections`, data, { headers: this.jsonHeaders });
  }

  updateCustomerConnection(customerId: number, connectionId: number, data: any) {
    return this.http.patch(`${this.endpoint}/customers/${customerId}/connections/${connectionId}`, data, { headers: this.jsonHeaders });
  }

  deleteCustomerConnection(customerId: number, connectionId: number) {
    return this.http.delete(`${this.endpoint}/customers/${customerId}/connections/${connectionId}`);
  }

  addCustomerStb(customerId: number, data: any) {
    return this.http.post(`${this.endpoint}/customers/${customerId}/stbs`, data, { headers: this.jsonHeaders });
  }

  updateCustomerStb(customerId: number, stbId: number, data: any) {
    return this.http.patch(`${this.endpoint}/customers/${customerId}/stbs/${stbId}`, data, { headers: this.jsonHeaders });
  }

  deleteCustomerStb(customerId: number, stbId: number) {
    return this.http.delete(`${this.endpoint}/customers/${customerId}/stbs/${stbId}`);
  }

  addCustomerPackage(customerId: number, data: any) {
    return this.http.post(`${this.endpoint}/customers/${customerId}/packages`, data, { headers: this.jsonHeaders });
  }

  updateCustomerPackage(customerId: number, packageId: number, data: any) {
    return this.http.patch(`${this.endpoint}/customers/${customerId}/packages/${packageId}`, data, { headers: this.jsonHeaders });
  }

  removeCustomerPackage(customerId: number, packageId: number) {
    return this.http.post(`${this.endpoint}/customers/${customerId}/packages/${packageId}/remove`, {}, { headers: this.jsonHeaders });
  }

  deleteCustomerPackage(customerId: number, packageId: number) {
    return this.http.delete(`${this.endpoint}/customers/${customerId}/packages/${packageId}`);
  }

  addCustomerSubscription(customerId: number, data: any) {
    return this.http.post(`${this.endpoint}/customers/${customerId}/subscriptions`, data, { headers: this.jsonHeaders });
  }

  updateCustomerSubscription(customerId: number, subscriptionId: number, data: any) {
    return this.http.patch(`${this.endpoint}/customers/${customerId}/subscriptions/${subscriptionId}`, data, { headers: this.jsonHeaders });
  }

  deleteCustomerSubscription(customerId: number, subscriptionId: number) {
    return this.http.delete(`${this.endpoint}/customers/${customerId}/subscriptions/${subscriptionId}`);
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

  updateStbMaster(stbMasterId: number, data: any) {
    return this.http.patch(`${this.endpoint}/masters/stbs/${stbMasterId}`, data, { headers: this.jsonHeaders });
  }

  deleteStbMaster(stbMasterId: number) {
    return this.http.delete(`${this.endpoint}/masters/stbs/${stbMasterId}`);
  }

  assignStbMaster(stbMasterId: number, assignedEmployeeId: number) {
    return this.http.patch(`${this.endpoint}/masters/stbs/${stbMasterId}/assign`, { assigned_employee_id: assignedEmployeeId }, { headers: this.jsonHeaders });
  }

  getPendingAccounts(filters: { name?: string; status?: string; installed_by_employee_id?: string; start_date?: string; end_date?: string } = {}) {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    return this.http.get(`${this.endpoint}/accounts/pending`, { params });
  }

  getLoAccounts(filters: { search?: string; status?: string } = {}) {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value; });
    return this.http.get(`${this.endpoint}/accounts/lo-customers`, { params });
  }

  getAccountPayments(accountId: number) {
    return this.http.get(`${this.endpoint}/accounts/${accountId}/payments`);
  }

  receiveAccount(accountId: number, data: any) {
    return this.http.patch(`${this.endpoint}/accounts/${accountId}/receive`, data, { headers: this.jsonHeaders });
  }

  revertAccountToPending(accountId: number) {
    return this.http.patch(`${this.endpoint}/accounts/${accountId}/revert-pending`, {}, { headers: this.jsonHeaders });
  }

  getPendingSubscriptions(filters: { customer_no?: string; customer_name?: string; area_id?: string; street_id?: string } = {}) {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    return this.http.get(`${this.endpoint}/subscriptions/pending`, { params });
  }

  receiveSubscriptionPayment(subscriptionId: number, data: any) {
    return this.http.patch(`${this.endpoint}/subscriptions/${subscriptionId}/receive`, data, { headers: this.jsonHeaders });
  }

  getCableSubscriptionReport(filters: { network_id?: string; collected_by_employee_id?: string; customer_type?: string; start_date?: string; end_date?: string }) {
    const params: Record<string, string> = {};
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    return this.http.get(`${this.endpoint}/reports/subscriptions`, { params });
  }
  getStbPaymentReport(filters:any){return this.http.get<any>(`${this.endpoint}/reports/stb-payments`,{params:filters});}

  previewMonthlySubscriptions(subscriptionMonth: number, subscriptionYear: number) {
    return this.http.get(`${this.endpoint}/subscriptions/generation-preview`, {
      params: { subscription_month: subscriptionMonth, subscription_year: subscriptionYear }
    });
  }

  generateMonthlySubscriptions(data: { subscription_month: number; subscription_year: number; customer_ids: number[] }) {
    return this.http.post(`${this.endpoint}/subscriptions/generate`, data, { headers: this.jsonHeaders });
  }

  getComplaints(filters: { search?: string; status?: string; assigned_employee_id?: string } = {}) {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    return this.http.get(`${this.endpoint}/complaints`, { params });
  }

  getComplaintById(complaintId: number) {
    return this.http.get(`${this.endpoint}/complaints/${complaintId}`);
  }

  getComplaintCustomers(type: 'CATV' | 'NET' | 'CCTV') {
    return this.http.get(`${this.endpoint}/complaints/customers/lookup`, { params: { type } });
  }

  addComplaint(data: any) {
    return this.http.post(`${this.endpoint}/complaints`, data, { headers: this.jsonHeaders });
  }

  addComplaintAttempt(complaintId: number, data: any) {
    return this.http.post(`${this.endpoint}/complaints/${complaintId}/attempts`, data, { headers: this.jsonHeaders });
  }

  getMaterialSalesLookups() {
    return this.http.get(`${this.endpoint}/material-sales/lookups`);
  }

  getTechnicianMaterialStock(employeeId = '') {
    return this.http.get(`${this.endpoint}/material-sales/stock`, {
      params: employeeId ? { employee_id: employeeId } : {}
    });
  }

  getMaterialMovements(filters: Record<string, string> = {}) {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value; });
    return this.http.get(`${this.endpoint}/material-sales/movements`, { params });
  }

  addMaterialMovement(data: any) {
    return this.http.post(`${this.endpoint}/material-sales/movements`, data, { headers: this.jsonHeaders });
  }

  addMaterialIssueBatch(items: any[]) {
    return this.http.post(`${this.endpoint}/material-sales/issues/batch`, { items }, { headers: this.jsonHeaders });
  }

  addMaterialSaleBatch(data: any) {
    return this.http.post(`${this.endpoint}/material-sales/sales/batch`, data, { headers: this.jsonHeaders });
  }

  mapMaterialSaleCustomer(movementId: number, data: any) {
    return this.http.patch(`${this.endpoint}/material-sales/movements/${movementId}/customer`, data, { headers: this.jsonHeaders });
  }
}
