import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({
  providedIn: 'root',
})
export class WorkflowServices {
  private url = appConfig.apiUrl;
  private http = inject(HttpClient);
  private endpoint = `${this.url}/v1/workflow`;

  getWorkflowApprovals() {
    return this.http.get(this.endpoint);
  }

  approveWorkflow(workflowId: number, data: any = {}) {
    return this.http.post(`${this.endpoint}/${workflowId}/approve`, data);
  }
}
