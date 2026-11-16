import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PermissionService, RolePermission } from '../../services/permission.service';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

interface CatalogItem { group: string; key: string; label: string; route: string; createOnly?: boolean; }

@Component({
  selector: 'app-role-permissions',
  imports: [CommonModule, FormsModule, MatToolbarModule],
  templateUrl: './role-permissions.html',
  styleUrl: './role-permissions.scss'
})
export class RolePermissions {
  private readonly requiredCatalog: CatalogItem[] = [
    ...[
      ['DASHBOARD_COMPLAINTS', 'Complaints by Status'],
      ['DASHBOARD_WORKFLOW', 'Workflow Approvals Waiting'],
      ['DASHBOARD_FAULT_BOXES', 'Fault Boxes in Service'],
      ['DASHBOARD_CATV_CUSTOMERS', 'CATV Customers'],
      ['DASHBOARD_INTERNET_CUSTOMERS', 'Internet Customers'],
      ['DASHBOARD_INTERNET_EXPIRIES', 'Internet Expiry Pending'],
      ['DASHBOARD_CATV_UNPAID', 'CATV Unpaid Subscriptions'],
      ['DASHBOARD_INTERNET_UNPAID', 'Internet Unpaid Subscriptions']
    ].map(([key, label]) => ({ group: 'Dashboard Widgets', key, label, route: '/dashboard' })),
    { group: 'Accounts', key: 'CABLE_TV_ACCOUNTS', label: 'Pending Accounts', route: '/cable-tv-account-pending' }
  ];

  roles: string[] = [];
  catalog: CatalogItem[] = [];
  selectedRole = '';
  matrix: Record<string, RolePermission> = {};
  allPermissions: any[] = [];
  saving = false;
  supportedWidgetKeys = new Set<string>();
  get widgetCatalogMissing() {
    return this.requiredCatalog.some(item => this.isWidget(item) && !this.supportedWidgetKeys.has(item.key));
  }
  isWidget(item: CatalogItem) { return item.group === 'Dashboard Widgets'; }

  constructor(private permissionService: PermissionService, private snackbar: Snackbar) {}
  ngOnInit() { this.load(); }

  load() {
    this.permissionService.getRolePermissions().subscribe({
      next: response => {
        this.roles = response.roles;
        this.supportedWidgetKeys = new Set((response.catalog || []).filter((item: CatalogItem) => this.isWidget(item)).map((item: CatalogItem) => item.key));
        this.catalog = this.mergeRequiredCatalog(response.catalog || []);
        this.allPermissions = response.permissions;
        this.selectedRole ||= this.roles[0];
        this.buildMatrix();
      },
      error: error => this.snackbar.openSnackbar(error.error?.message || globalConstants.genericError, globalConstants.errorRegex)
    });
  }

  mergeRequiredCatalog(catalog: CatalogItem[]) {
    const merged = [...catalog];
    this.requiredCatalog.forEach(item => {
      if (!merged.some(existing => existing.key === item.key)) merged.push(item);
    });
    return merged;
  }

  buildMatrix() {
    const roleRows = this.allPermissions.filter(row => row.role === this.selectedRole);
    this.matrix = Object.fromEntries(this.catalog.map(item => [item.key, roleRows.find(row => row.permission_key === item.key) || {
      permission_key: item.key, can_view: false, can_create: false, can_update: false, can_delete: false
    }]));
  }

  groups() {
    const groups = [...new Set(this.catalog.map(item => item.group))].filter(group => group !== 'Dashboard Widgets');
    if (this.catalog.some(item => this.isWidget(item))) groups.splice(Math.max(groups.indexOf('General') + 1, 0), 0, 'Dashboard Widgets');
    return groups;
  }
  screens(group: string) { return this.catalog.filter(item => item.group === group); }
  setAction(item: CatalogItem, action: 'can_view' | 'can_create' | 'can_update' | 'can_delete', value: boolean) {
    if (this.isWidget(item) && (action !== 'can_view' || !this.supportedWidgetKeys.has(item.key))) return;
    this.matrix[item.key][action] = value;
    if (action !== 'can_view' && value) this.matrix[item.key].can_view = true;
    if (action === 'can_view' && !value) {
      this.matrix[item.key].can_create = false;
      this.matrix[item.key].can_update = false;
      this.matrix[item.key].can_delete = false;
    }
  }

  save() {
    this.saving = true;
    this.permissionService.updateRolePermissions(this.selectedRole, Object.values(this.matrix)).subscribe({
      next: response => { this.saving = false; this.snackbar.openSnackbar(response.message, ''); this.load(); },
      error: error => { this.saving = false; this.snackbar.openSnackbar(error.error?.message || globalConstants.genericError, globalConstants.errorRegex); }
    });
  }
}
