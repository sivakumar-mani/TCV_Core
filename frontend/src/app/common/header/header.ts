import { Component, EventEmitter, inject, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ConfirmationPopup } from '../../dialog/confirmation-popup/confirmation-popup';
import { Router } from '@angular/router';
import { DialogRef } from '@angular/cdk/dialog';
@Component({
  selector: 'app-header',
  imports: [MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Output() toggleSidebar = new EventEmitter<void>();

  dialog = inject(MatDialog);
  router = inject(Router)
  logout() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = "400px";
    dialogConfig.data = {
      message: "Logout"
    }
    const dialogRef = this.dialog.open(ConfirmationPopup, dialogConfig);
    const sub = dialogRef.componentInstance.onEmitStatusChange.subscribe((user) => {
      dialogRef.close();
      localStorage.clear();
      this.router.navigateByUrl('/login')
    })

  }
}
