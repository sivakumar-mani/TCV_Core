import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from '../app-config';

@Injectable({ providedIn: 'root' })
export class NotificationServices {
  private http = inject(HttpClient);
  private endpoint = `${appConfig.apiUrl}/notifications`;

  getNotifications(limit = 100, unread = false) {
    return this.http.get<any>(`${this.endpoint}?limit=${limit}&unread=${unread}`);
  }

  markRead(notificationId: number) {
    return this.http.patch(`${this.endpoint}/${notificationId}/read`, {});
  }

  markAllRead() {
    return this.http.patch(`${this.endpoint}/read-all`, {});
  }
}
