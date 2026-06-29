import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({
  providedIn: 'root',
})
export class AuditLogServices {
  private url = appConfig.apiUrl;
  private http = inject(HttpClient);

  getAuditLogs() {
    return this.http.get(`${this.url}/audit-log/get`);
  }

  getAuditLogById(auditId: number) {
    return this.http.get(`${this.url}/audit-log/get/${auditId}`);
  }

  addAuditLog(data: any) {
    return this.http.post(`${this.url}/audit-log/add`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateAuditLog(data: any) {
    return this.http.patch(`${this.url}/audit-log/update`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  deleteAuditLog(data: any) {
    return this.http.delete(`${this.url}/audit-log/delete`, {
      body: data,
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
