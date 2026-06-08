import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class EmployeeServices {
  private url = environment.apiUrl;
  private http = inject(HttpClient);

  getEmployees() {
    return this.http.get(`${this.url}/employee/get`);
  }

  getEmployeeById(employeeId: number) {
    return this.http.get(`${this.url}/employee/get/${employeeId}`);
  }

  getNextEmployeeCode() {
    return this.http.get(`${this.url}/employee/next-code`);
  }

  uploadEmployeePhoto(file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post(`${this.url}/employee/upload-photo`, formData);
  }

  getStates() {
    return this.http.get(`${this.url}/location/states`);
  }

  getDistricts(stateId: number) {
    return this.http.get(`${this.url}/location/districts/${stateId}`);
  }

  addEmployee(data: any) {
    return this.http.post(`${this.url}/employee/add`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateEmployee(data: any) {
    return this.http.patch(`${this.url}/employee/update`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  deleteEmployee(data: any) {
    return this.http.delete(`${this.url}/employee/delete`, {
      body: data,
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
