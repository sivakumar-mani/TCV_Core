import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class QuotationServices {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getQuotations() {
    return this.http.get(`${this.url}/quotation/get`);
  }

  getQuotationById(quotationId: number) {
    return this.http.get(`${this.url}/quotation/get/${quotationId}`);
  }

  addQuotation(data: any) {
    return this.http.post(`${this.url}/quotation/add`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateQuotation(data: any) {
    return this.http.patch(`${this.url}/quotation/update`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  deleteQuotation(data: any) {
    return this.http.delete(`${this.url}/quotation/delete`, {
      body: data,
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
