import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class EmployeeSalaryServices {
  private url = environment.apiUrl;
  private http = inject(HttpClient);

  getSalarySlips() {
    return this.http.get(`${this.url}/employee-salary/get`);
  }

  getSalarySlipById(salaryId: number) {
    return this.http.get(`${this.url}/employee-salary/get/${salaryId}`);
  }

  addSalarySlip(data: any) {
    return this.http.post(`${this.url}/employee-salary/add`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateSalarySlip(data: any) {
    return this.http.patch(`${this.url}/employee-salary/update`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  deleteSalarySlip(data: any) {
    return this.http.delete(`${this.url}/employee-salary/delete`, {
      body: data,
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
