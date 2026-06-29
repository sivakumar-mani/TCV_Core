import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({
  providedIn: 'root',
})
export class WorkOrderServices {
  private url = appConfig.apiUrl;
  private http = inject(HttpClient);
  private endpoint = `${this.url}/v1/work-orders`;
  private headers = new HttpHeaders().set('content-type', 'application/json');

  getWorkOrders() {
    return this.http.get(this.endpoint);
  }

  getWorkOrderById(workOrderId: number) {
    return this.http.get(`${this.endpoint}/${workOrderId}`);
  }

  getNextWorkOrderNo() {
    return this.http.get(`${this.endpoint}/next-no`);
  }

  getMaterials() {
    return this.http.get(`${this.endpoint}/materials`);
  }

  addWorkOrder(data: any) {
    return this.http.post(this.endpoint, data, { headers: this.headers });
  }

  updateWorkOrder(data: any) {
    return this.http.patch(this.endpoint, data, { headers: this.headers });
  }

  deleteWorkOrder(workOrderId: number) {
    return this.http.delete(`${this.endpoint}/${workOrderId}`, { headers: this.headers });
  }

  reviewWorkOrder(workOrderId: number, action: 'IN_PROGRESS' | 'REJECTED') {
    return this.http.post(`${this.endpoint}/${workOrderId}/review`, { action }, { headers: this.headers });
  }

  addMaterialIssue(workOrderId: number, data: any) {
    return this.http.post(`${this.endpoint}/${workOrderId}/material-issue`, data, { headers: this.headers });
  }

  submitMaterialIssueList(workOrderId: number, rows: any[]) {
    return this.http.post(`${this.endpoint}/${workOrderId}/material-issues/submit`, { rows }, { headers: this.headers });
  }

  reviewMaterialIssueList(workOrderId: number, action: 'ACCEPTED' | 'REJECTED') {
    return this.http.post(`${this.endpoint}/${workOrderId}/material-issues/review`, { action }, { headers: this.headers });
  }

  addMaterialReturn(workOrderId: number, data: any) {
    return this.http.post(`${this.endpoint}/${workOrderId}/material-return`, data, { headers: this.headers });
  }

  createInvoice(workOrderId: number, data: any = {}) {
    return this.http.post(`${this.endpoint}/${workOrderId}/create-invoice`, data, { headers: this.headers });
  }
}
