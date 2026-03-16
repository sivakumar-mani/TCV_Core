import { Component } from '@angular/core';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NgFor } from '@angular/common';
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
    *ngFor="let action of params.actions"
    (click)="execute(action.action)"
  >
    {{ action.label }}
  </button>
</mat-menu>`,
 
})
export class ActionMenu {
    params: any;

  agInit(params: any): void {
    this.params = params;
  }

  refresh(): boolean {
    return false;
  }

  execute(action: any) {
    action(this.params.data);
  }
}
