import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class WorkflowServices {
  private url = environment.apiUrl;
  private http = inject(HttpClient);
  private endpoint = `${this.url}/v1/workflow`;

  getWorkflowApprovals() {
    return this.http.get(this.endpoint);
  }

  approveWorkflow(workflowId: number, data: any = {}) {
    return this.http.post(`${this.endpoint}/${workflowId}/approve`, data);
  }
}
