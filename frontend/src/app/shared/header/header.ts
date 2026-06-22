import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, OnDestroy, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ConfirmationPopup } from '../confirmation-popup/confirmation-popup';
import { Router } from '@angular/router';
import { ChangePassword } from '../../user/dialog/change-password/change-password';
import { AuthService } from '../../services/auth-service';
import { NotificationServices } from '../../services/notification-services';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  dialog = inject(MatDialog);
  router = inject(Router)
  authService = inject(AuthService);
  notificationService = inject(NotificationServices);
  permissions = inject(PermissionService);
  isMobile = window.innerWidth < 768;
  notifications: any[] = [];
  unreadCount = 0;
  private notificationTimer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    if (this.permissions.can('NOTIFICATIONS')) {
      this.loadNotifications();
      this.notificationTimer = setInterval(() => this.loadNotifications(), 60000);
    }
  }

  ngOnDestroy() {
    if (this.notificationTimer) clearInterval(this.notificationTimer);
  }

  loadNotifications() {
    this.notificationService.getNotifications(6).subscribe({
      next: (response) => {
        this.notifications = response?.data ?? [];
        this.unreadCount = Number(response?.unread_count || 0);
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
        this.unreadCount = Math.max(this.unreadCount - 1, 0);
        navigate();
      }
    });
  }

  markAllNotificationsRead() {
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.notifications.forEach((item) => item.is_read = 1);
        this.unreadCount = 0;
      }
    });
  }

  viewAllNotifications() {
    this.router.navigateByUrl('/notifications');
  }

  logout() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = "this.isMobile?'95%' : '400px'";
    dialogConfig.disableClose = true;
    dialogConfig.data = {
      message: "Logout"
    }
    const dialogRef = this.dialog.open(ConfirmationPopup, dialogConfig);
    const sub = dialogRef.componentInstance.onEmitStatusChange.subscribe((user) => {
      dialogRef.close();
      this.authService.logout();
    })

  }

  changePassword(){
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width= "500px";
    dialogConfig.disableClose = true;
    this.dialog.open(ChangePassword, dialogConfig)
  }


}
