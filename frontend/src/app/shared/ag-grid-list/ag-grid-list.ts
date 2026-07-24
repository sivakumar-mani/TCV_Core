import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { PermissionService } from '../../services/permission.service';
import { Router } from '@angular/router';

ModuleRegistry.registerModules([AllCommunityModule]);

const tcvGridTheme = themeQuartz.withParams({
  accentColor: '#4154f1',
  borderColor: '#e7e9f3',
  borderRadius: 8,
  wrapperBorderRadius: 10,
  headerBackgroundColor: '#eef1ff',
  headerTextColor: '#1c2569',
  headerFontWeight: 600,
  oddRowBackgroundColor: '#fafbff',
  rowHoverColor: '#f5f6fb',
  fontSize: 13,
  spacing: 6,
});

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

  public theme = tcvGridTheme;
  quickFilterText = '';
  canAdd() {
    const key = this.permissions.keyForRoute(this.router.url);
    return this.showAddButton && Boolean(key) && this.permissions.can(key, 'create');
  }
}
