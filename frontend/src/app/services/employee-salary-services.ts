import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class EmployeeSalaryServices {
  private url = environment.apiUrl;
  private http = inject(HttpClient);
  private jsonHeaders = new HttpHeaders().set('content-type', 'application/json');

  getSalaries() {
    return this.http.get(`${this.url}/employee-salary/get`);
  }

  getSalaryById(salaryId: number) {
    return this.http.get(`${this.url}/employee-salary/get/${salaryId}`);
  }

  addSalary(data: any) {
    return this.http.post(`${this.url}/employee-salary/add`, data, {
      headers: this.jsonHeaders,
    });
  }

  updateSalary(data: any) {
    return this.http.patch(`${this.url}/employee-salary/update`, data, {
      headers: this.jsonHeaders,
    });
  }

  deleteSalary(data: any) {
    return this.http.delete(`${this.url}/employee-salary/delete`, {
      body: data,
      headers: this.jsonHeaders,
    });
  }
}
