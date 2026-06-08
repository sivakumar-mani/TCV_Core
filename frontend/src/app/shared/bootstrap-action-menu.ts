import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

export interface BootstrapActionItem {
  label: string;
  className?: string;
  action: (row: any) => void;
}

@Component({
  selector: 'app-bootstrap-action-menu',
  imports: [CommonModule],
  template: `
    <div class="dropdown ag-action-dropdown">
      <button
        class="btn btn-outline-secondary btn-sm dropdown-toggle"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        Action
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li *ngFor="let item of params?.dropdownMenu">
          <button
            class="dropdown-item"
            [ngClass]="item.className"
            type="button"
            (click)="execute(item)"
          >
            {{ item.label }}
          </button>
        </li>
      </ul>
    </div>
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
