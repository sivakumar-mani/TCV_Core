import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class ApprovalServices {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getApprovals(status?: string, moduleName?: string) {
    const params: any = {};
    if (status) params.status = status;
    if (moduleName) params.module_name = moduleName;
    return this.http.get(`${this.url}/approval/get`, { params });
  }

  getHistory(approvalRequestId: number) {
    return this.http.get(`${this.url}/approval/history/${approvalRequestId}`);
  }

  submit(data: any) {
    return this.http.post(`${this.url}/approval/submit`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  approve(approvalRequestId: number, data: any = {}) {
    return this.http.patch(`${this.url}/approval/approve/${approvalRequestId}`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  reject(approvalRequestId: number, data: any = {}) {
    return this.http.patch(`${this.url}/approval/reject/${approvalRequestId}`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
