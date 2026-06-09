import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class SupplierServices {
  url = environment.apiUrl;
  http = inject(HttpClient);
  private endpoint = `${this.url}/v1/suppliers`;

  getSuppliers() {
    return this.http.get(this.endpoint);
  }

  getSupplierById(supplierId: number) {
    return this.http.get(`${this.endpoint}/${supplierId}`);
  }

  addSupplier(data: any) {
    return this.http.post(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateSupplier(data: any) {
    return this.http.patch(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  deleteSupplier(data: any) {
    return this.http.delete(this.endpoint, {
      body: data,
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
