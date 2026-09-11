import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';

export interface BootstrapActionItem {
  label: string;
  className?: string;
  action: (row: any) => void;
}

@Component({
  selector: 'app-bootstrap-action-menu',
  imports: [CommonModule, MatMenuModule],
  template: `
    <button type="button" class="app-action-trigger" [matMenuTriggerFor]="menu" aria-label="Open row actions">
      Action<span class="app-action-caret" aria-hidden="true"></span>
    </button>
    <mat-menu #menu="matMenu" class="app-row-action-menu">
      <button mat-menu-item *ngFor="let item of params?.dropdownMenu" [ngClass]="item.className" type="button" (click)="execute(item)">{{ item.label }}</button>
    </mat-menu>
  `,
})
export class BootstrapActionMenu {
  params: any;

  agInit(params: any): void {
    this.params = params;
  }

  refresh(): boolean {
    return false;
  }

  execute(item: BootstrapActionItem) {
    item.action(this.params.data);
  }
}
