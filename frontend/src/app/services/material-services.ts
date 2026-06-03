import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class MaterialServices {
  url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getIssues() {
    return this.http.get(`${this.url}/material/issue/get`);
  }

  addIssue(data: any) {
    return this.http.post(`${this.url}/material/issue/add`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateIssueStatus(materialIssueId: number, issueStatus: string) {
    return this.http.patch(`${this.url}/material/issue/status/${materialIssueId}`, { issue_status: issueStatus }, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  getReturns() {
    return this.http.get(`${this.url}/material/return/get`);
  }

  addReturn(data: any) {
    return this.http.post(`${this.url}/material/return/add`, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateReturnStatus(materialReturnId: number, returnStatus: string) {
    return this.http.patch(`${this.url}/material/return/status/${materialReturnId}`, { return_status: returnStatus }, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
