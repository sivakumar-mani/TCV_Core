import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-cable-tv-account-pending',
  imports: [CommonModule],
  templateUrl: './cable-tv-account-pending.html',
  styleUrl: './cable-tv-account-pending.scss'
})
export class CableTvAccountPending {
  accounts: any[] = [];

  constructor(
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private snackbar: Snackbar,
    public permissions: PermissionService
  ) {}

  ngOnInit() {
    this.loadAccounts();
  }

  loadAccounts() {
    this.ngxLoader.start();
    this.cableTvService.getPendingAccounts().subscribe({
      next: (rows: any) => {
        this.ngxLoader.stop();
        this.accounts = rows || [];
      },
      error: (error: any) => this.handleError(error)
    });
  }

  markReceived(accountId: number) {
    this.ngxLoader.start();
    this.cableTvService.receiveAccount(accountId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.snackbar.openSnackbar(response?.message || 'Account amount marked as received', '');
        this.loadAccounts();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  private handleError(error: any) {
    this.ngxLoader.stop();
    this.snackbar.openSnackbar(error?.error?.message || globalConstants.genericError, globalConstants.errorRegex);
  }
}
