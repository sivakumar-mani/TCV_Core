import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class WorkOrderServices {
  private url = environment.apiUrl;
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

  addMaterialIssue(workOrderId: number, data: any) {
    return this.http.post(`${this.endpoint}/${workOrderId}/material-issue`, data, { headers: this.headers });
  }

  addMaterialReturn(workOrderId: number, data: any) {
    return this.http.post(`${this.endpoint}/${workOrderId}/material-return`, data, { headers: this.headers });
  }

  createInvoice(workOrderId: number, data: any = {}) {
    return this.http.post(`${this.endpoint}/${workOrderId}/create-invoice`, data, { headers: this.headers });
  }
}
