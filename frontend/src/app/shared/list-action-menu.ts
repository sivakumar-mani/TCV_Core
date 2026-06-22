import { Component, inject } from '@angular/core';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NgFor } from '@angular/common';
import { PermissionService } from '../services/permission.service';
import { Router } from '@angular/router';
export interface ActionItem {
  label: string;
  icon?: string;
  action: () => void;
}
@Component({
  selector: 'app-action-menu',
   imports: [MatMenuModule, MatButtonModule, MatIcon, NgFor ],
  template: `<button mat-icon-button [matMenuTriggerFor]="menu">
  <mat-icon>more_vert</mat-icon>
</button>

<mat-menu #menu="matMenu">
  <button
    mat-menu-item
    *ngFor="let actionMenu of visibleActions"
    (click)="execute(actionMenu.action)"
  >
    {{ actionMenu.label }}
  </button>
</mat-menu>`,
 
})
export class ActionMenu {
    params: any;
  private permissions = inject(PermissionService);
  private router = inject(Router);
  visibleActions: any[] = [];

  agInit(params: any): void {
    this.params = params;
    const key = params.permissionKey || this.permissions.keyForRoute(this.router.url);
    this.visibleActions = (params.dropdownMenu || []).filter((item: any) => {
      const inferredAction = /^delete$/i.test(item.label) ? 'delete' : /^(edit|approve|review)/i.test(item.label) ? 'update' : 'view';
      return this.permissions.can(key, item.permission || inferredAction);
    });
  }

  refresh(): boolean {
    return false;
  }

  execute(action: any) {
    action(this.params.data);
  }
}
