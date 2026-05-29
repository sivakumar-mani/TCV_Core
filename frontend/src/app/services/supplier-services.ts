import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class SupplierServices {
  url = environment.apiUrl;
  http = inject(HttpClient);

  getSuppliers() {
    return this.http.get(`${this.url}/supplier/get`);
  }

  getSupplierById(supplierId: number) {
    return this.http.get(`${this.url}/supplier/get/${supplierId}`);
  }

  addSupplier(data: any) {
    return this.http.post(`${this.url}/supplier/add`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateSupplier(data: any) {
    return this.http.patch(`${this.url}/supplier/update`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  deleteSupplier(data: any) {
    return this.http.delete(`${this.url}/supplier/delete`, {
      body: data,
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
