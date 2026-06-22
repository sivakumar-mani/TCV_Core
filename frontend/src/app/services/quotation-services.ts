import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class QuotationServices {
  private url = environment.apiUrl;
  private http = inject(HttpClient);
  private endpoint = `${this.url}/v1/quotations`;
  private headers = new HttpHeaders().set('content-type', 'application/json');

  getQuotations() {
    return this.http.get(this.endpoint);
  }

  getQuotationById(quotationId: number) {
    return this.http.get(`${this.endpoint}/${quotationId}`);
  }

  getNextQuotationNo() {
    return this.http.get(`${this.endpoint}/next-no`);
  }

  getWorkflow() {
    return this.http.get(`${this.url}/v1/workflow`);
  }

  addQuotation(data: any) {
    return this.http.post(this.endpoint, data, { headers: this.headers });
  }

  updateQuotation(data: any) {
    return this.http.patch(this.endpoint, data, { headers: this.headers });
  }

  approveQuotation(quotationId: number, data: any = {}) {
    return this.http.patch(`${this.endpoint}/${quotationId}/approve`, data, { headers: this.headers });
  }

  submitQuotation(quotationId: number) {
    return this.http.patch(`${this.endpoint}/${quotationId}/submit`, {}, { headers: this.headers });
  }

  updateCustomerResponse(quotationId: number, status: 'ACCEPTED' | 'CANCELLED' | 'EXPIRED') {
    return this.http.patch(`${this.endpoint}/${quotationId}/customer-response`, { status }, { headers: this.headers });
  }

  deleteQuotation(data: any) {
    return this.http.delete(this.endpoint, {
      body: data,
      headers: this.headers
    });
  }
}
