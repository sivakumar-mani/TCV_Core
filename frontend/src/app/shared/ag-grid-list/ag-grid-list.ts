import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, themeBalham } from 'ag-grid-community';
import { PermissionService } from '../../services/permission.service';
import { Router } from '@angular/router';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-ag-grid-list',
  imports: [CommonModule, FormsModule, AgGridModule],
  templateUrl: './ag-grid-list.html',
  styleUrl: './ag-grid-list.scss',
})
export class AgGridList {
  private permissions = inject(PermissionService);
  private router = inject(Router);
  @Input() title = '';
  @Input() addButtonLabel = 'Add';
  @Input() showAddButton = true;
  @Input() rowData: any[] | null = [];
  @Input() columnDefs: ColDef[] = [];
  @Input() defaultColDef: ColDef = {
    resizable: true,
    minWidth: 120,
    flex: 1,
    filter: true,
    floatingFilter: true,
    headerClass: 'ag-header-style',
  };
  @Input() pagination = true;
  @Input() paginationPageSize = 10;
  @Input() paginationPageSizeSelector: number[] = [10, 25, 50, 100];
  @Output() add = new EventEmitter<void>();

  public theme = themeBalham;
  quickFilterText = '';
  canAdd() {
    const key = this.permissions.keyForRoute(this.router.url);
    return this.showAddButton && Boolean(key) && this.permissions.can(key, 'create');
  }
}
