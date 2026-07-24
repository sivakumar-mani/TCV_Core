import { Component, inject } from '@angular/core';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import { NgClass, NgFor } from '@angular/common';
import { PermissionService } from '../services/permission.service';
import { Router } from '@angular/router';
export interface ActionItem {
  label: string;
  icon?: string;
  action: () => void;
}
@Component({
  selector: 'app-action-menu',
   imports: [MatMenuModule, MatButtonModule, NgFor, NgClass],
  template: `<button mat-icon-button [matMenuTriggerFor]="menu">
  <i class="bi bi-three-dots-vertical" aria-hidden="true"></i>
</button>

<mat-menu #menu="matMenu">
  <button
    mat-menu-item
    *ngFor="let actionMenu of visibleActions"
    (click)="execute(actionMenu.action)"
  >
    <i class="bi action-menu-icon" [ngClass]="iconClass(actionMenu.label)" aria-hidden="true"></i>
    <span>{{ actionMenu.label }}</span>
  </button>
</mat-menu>`,
  styles: [`
    .action-menu-icon {
      display: inline-block;
      font-size: 1rem;
      margin-right: .65rem;
      width: 1.1rem;
    }
  `]
 
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

  iconClass(label: string): string {
    const action = String(label || '').trim().toLowerCase();
    if (action.includes('delete')) return 'bi-trash';
    if (action.includes('edit') || action.includes('update')) return 'bi-pencil-square';
    if (action.includes('view') || action.includes('preview')) return 'bi-eye';
    if (action.includes('review') || action.includes('approve')) return 'bi-clipboard-check';
    if (action.includes('print') || action.includes('pdf')) return 'bi-printer';
    if (action.includes('payment')) return 'bi-cash-coin';
    if (action.includes('material')) return 'bi-box-seam';
    return 'bi-three-dots';
  }

  execute(action: any) {
    action(this.params.data);
  }
}
