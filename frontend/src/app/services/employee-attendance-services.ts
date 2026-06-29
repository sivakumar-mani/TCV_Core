import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({ providedIn: 'root' })
export class EmployeeAttendanceServices {
  private http = inject(HttpClient);
  private endpoint = `${appConfig.apiUrl}/employee-attendance`;

  getAttendance() {
    return this.http.get(this.endpoint);
  }

  addAttendance(data: any) {
    return this.http.post(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateAttendance(data: any) {
    return this.http.patch(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  deleteAttendance(data: any) {
    return this.http.delete(this.endpoint, {
      body: data,
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
