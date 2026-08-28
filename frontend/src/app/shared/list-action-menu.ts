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
  visible?: (row: any) => boolean;
}
@Component({
  selector: 'app-action-menu',
   imports: [MatMenuModule, MatButtonModule, NgFor, NgClass],
  template: `<span class="serial-number" [class.hidden]="!showSerial">{{ serialNumber }}</span>
<button mat-icon-button [class.customer-action-trigger]="params?.statusAware" [matMenuTriggerFor]="menu"
  [attr.aria-label]="params?.statusAware ? statusTooltip : 'Open row actions'"
  [attr.title]="params?.statusAware ? statusTooltip : 'Open row actions'">
  <i class="bi" [ngClass]="triggerIconClasses" aria-hidden="true"></i>
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
    :host {
      align-items: center;
      display: inline-flex;
      gap: .15rem;
    }
    .serial-number {
      font-weight: 600;
      min-width: 1.4rem;
      text-align: right;
    }
    .serial-number.hidden {
      display: none;
    }
    .action-menu-icon {
      display: inline-block;
      font-size: 1rem;
      margin-right: .65rem;
      width: 1.1rem;
    }
    .customer-action-trigger {
      height: 28px;
      padding: 0;
      width: 28px;
    }
    .customer-action-icon {
      align-items: center;
      background: #14223b;
      border-radius: 50%;
      color: #fff;
      display: inline-flex;
      font-size: .7rem;
      font-weight: 800;
      height: 20px;
      justify-content: center;
      line-height: 1;
      width: 20px;
    }
    .customer-action-icon.status-active {
      background: #16a34a;
    }
    .customer-action-icon.status-disconnected {
      background: #dc2626;
    }
    .customer-action-icon.status-warning {
      background: #f59e0b;
      color: #241500;
    }
  `]
 
})
export class ActionMenu {
    params: any;
  private permissions = inject(PermissionService);
  private router = inject(Router);
  visibleActions: any[] = [];
  showSerial = false;
  serialNumber = 0;
  triggerIconClasses = ['bi-three-dots-vertical'];
  statusTooltip = 'Open row actions';

  agInit(params: any): void {
    this.params = params;
    this.showSerial = Boolean(params.showSerial);
    this.serialNumber = Number(params.node?.rowIndex ?? 0) + 1;
    if (params.statusAware) {
      const rawStatus = params.data?.status;
      const status = String(rawStatus ?? '').trim().toUpperCase();
      const isActive = Number(rawStatus) === 1 || rawStatus === true || status === 'ACTIVE';
      const isDisconnected = ['DISCONNECT', 'DISCONNECTED'].includes(status);
      const statusLabel = isActive
        ? 'Active'
        : isDisconnected
          ? 'Disconnected'
          : (Number(rawStatus) === 0
            ? 'Inactive'
            : String(rawStatus || 'Unknown').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()));
      this.statusTooltip = `Status: ${statusLabel}`;
      this.triggerIconClasses = ['bi-chevron-down', 'customer-action-icon',
        isActive ? 'status-active' : isDisconnected ? 'status-disconnected' : 'status-warning'];
    }
    const key = params.permissionKey || this.permissions.keyForRoute(this.router.url);
    this.visibleActions = (params.dropdownMenu || []).filter((item: any) => {
      const inferredAction = /^delete$/i.test(item.label) ? 'delete' : /^(edit|approve|review)/i.test(item.label) ? 'update' : 'view';
      return this.permissions.can(key, item.permission || inferredAction)
        && (typeof item.visible !== 'function' || item.visible(params.data));
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
