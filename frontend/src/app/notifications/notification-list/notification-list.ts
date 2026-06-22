import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { NotificationServices } from '../../services/notification-services';
import { CommonMethods } from '../../shared/common-methods';

@Component({
  selector: 'app-notification-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.scss'
})
export class NotificationList {
  notifications: any[] = [];
  unreadOnly = false;
  selectedType = '';

  constructor(
    private notificationService: NotificationServices,
    private loader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  get types() {
    return [...new Set(this.notifications.map((item) => item.notification_type))].sort();
  }

  get filteredNotifications() {
    return this.notifications.filter((item) =>
      (!this.unreadOnly || !item.is_read) && (!this.selectedType || item.notification_type === this.selectedType)
    );
  }

  loadNotifications() {
    this.loader.start();
    this.notificationService.getNotifications(200).subscribe({
      next: (response) => {
        this.loader.stop();
        this.notifications = response?.data ?? [];
      },
      error: (error) => {
        this.loader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  openNotification(item: any) {
    const navigate = () => item.navigation_url && this.router.navigateByUrl(item.navigation_url);
    if (item.is_read) {
      navigate();
      return;
    }
    this.notificationService.markRead(item.notification_id).subscribe({
      next: () => {
        item.is_read = 1;
        navigate();
      },
      error: (error) => this.commonMethods.handleError(error)
    });
  }

  markAllRead() {
    this.notificationService.markAllRead().subscribe({
      next: () => this.notifications.forEach((item) => item.is_read = 1),
      error: (error) => this.commonMethods.handleError(error)
    });
  }

  typeLabel(value: string) {
    return String(value || '').replaceAll('_', ' ');
  }

  displayDateTime(value: string | Date) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-IN');
  }
}
