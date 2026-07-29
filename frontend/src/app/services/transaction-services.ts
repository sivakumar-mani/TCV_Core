import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({ providedIn: 'root' })
export class TransactionServices {
  private http = inject(HttpClient);
  private endpoint = `${appConfig.apiUrl}/v1/transactions`;

  getTransactions(filters: any) {
    const params: Record<string, string> = {};
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') params[key] = String(value);
    });
    return this.http.get(this.endpoint, { params });
  }

  addTransaction(data: any) {
    return this.http.post(this.endpoint, data);
  }
}
