import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({ providedIn: 'root' })
export class ServiceTicketServices {
  private http = inject(HttpClient);
  private endpoint = `${appConfig.apiUrl}/service-ticket`;

  getTickets() {
    return this.http.get(this.endpoint);
  }

  addTicket(data: any) {
    return this.http.post(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  updateTicket(data: any) {
    return this.http.patch(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }

  deleteTicket(data: any) {
    return this.http.delete(this.endpoint, {
      body: data,
      headers: new HttpHeaders().set('content-type', 'application/json')
    });
  }
}
