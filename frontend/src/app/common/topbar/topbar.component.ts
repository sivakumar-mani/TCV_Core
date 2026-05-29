import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { jwtDecode } from 'jwt-decode';
import { SidebarService } from '../../services/sidebar.service';

interface LoginUserDetails {
  userName: string;
  fullName: string;
  role: string;
  initials: string;
}

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit {
  topNavLinks = [
    { label: 'Home', icon: 'bi-house-fill', active: true },
    { label: 'Quick Actions', icon: 'bi-lightning-fill', active: false },
    { label: 'Recent', icon: 'bi-clock-history', active: false },
    { label: 'Saved', icon: 'bi-bookmark-fill', active: false },
  ];

  userDetails: LoginUserDetails | null = null;
  isLoggedIn = false;
  isUserMenuOpen = false;
  private dialog = inject(MatDialog);
  private router = inject(Router);

  constructor(public sidebarService: SidebarService) {}

  ngOnInit(): void {
    this.setLoginUserDetails();
  }

  setActiveLink(selected: any): void {
    this.topNavLinks.forEach(l => l.active = false);
    selected.active = true;
  }

  setLoginUserDetails(): void {
    const token = localStorage.getItem('token');

    if (!token) {
      this.userDetails = null;
      this.isLoggedIn = false;
      return;
    }

    try {
      const tokenPayload: any = jwtDecode(token);
      const userName = tokenPayload.userName || tokenPayload.username || tokenPayload.email || 'User';
      const fullName = [tokenPayload.firstName, tokenPayload.lastName].filter(Boolean).join(' ') || userName;
      const role = tokenPayload.role || '';

      this.userDetails = {
        userName,
        fullName,
        role,
        initials: this.getInitials(fullName)
      };
      this.isLoggedIn = true;
    } catch {
      localStorage.clear();
      this.userDetails = null;
      this.isLoggedIn = false;
    }
  }

  login(): void {
    this.isUserMenuOpen = false;
    this.router.navigateByUrl('/login');
  }

  async logout(): Promise<void> {
    this.isUserMenuOpen = false;
    const { ConfirmationPopup } = await import('../../shared/confirmation-popup/confirmation-popup');
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = window.innerWidth < 768 ? '95%' : '400px';
    dialogConfig.disableClose = true;
    dialogConfig.data = {
      message: 'Logout'
    };

    const dialogRef = this.dialog.open(ConfirmationPopup, dialogConfig);
    const sub = dialogRef.componentInstance.onEmitStatusChange.subscribe(() => {
      sub.unsubscribe();
      dialogRef.close();
      localStorage.clear();
      this.userDetails = null;
      this.isLoggedIn = false;
      this.router.navigateByUrl('/login');
    });
  }

  async changePassword(): Promise<void> {
    this.isUserMenuOpen = false;
    const { ChangePassword } = await import('../../user/dialog/change-password/change-password');
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '500px';
    dialogConfig.disableClose = true;
    this.dialog.open(ChangePassword, dialogConfig);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'U';
  }
}
