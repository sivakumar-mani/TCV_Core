import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PermissionService, RolePermission } from '../../services/permission.service';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

interface CatalogItem { group: string; key: string; label: string; route: string; }

@Component({
  selector: 'app-role-permissions',
  imports: [CommonModule, FormsModule, MatIconModule, MatToolbarModule],
  templateUrl: './role-permissions.html',
  styleUrl: './role-permissions.scss'
})
export class RolePermissions {
  roles: string[] = [];
  catalog: CatalogItem[] = [];
  selectedRole = '';
  matrix: Record<string, RolePermission> = {};
  allPermissions: any[] = [];
  saving = false;

  constructor(private permissionService: PermissionService, private snackbar: Snackbar) {}
  ngOnInit() { this.load(); }

  load() {
    this.permissionService.getRolePermissions().subscribe({
      next: response => {
        this.roles = response.roles;
        this.catalog = response.catalog;
        this.allPermissions = response.permissions;
        this.selectedRole ||= this.roles[0];
        this.buildMatrix();
      },
      error: error => this.snackbar.openSnackbar(error.error?.message || globalConstants.genericError, globalConstants.errorRegex)
    });
  }

  buildMatrix() {
    const roleRows = this.allPermissions.filter(row => row.role === this.selectedRole);
    this.matrix = Object.fromEntries(this.catalog.map(item => [item.key, roleRows.find(row => row.permission_key === item.key) || {
      permission_key: item.key, can_view: false, can_create: false, can_update: false, can_delete: false
    }]));
  }

  groups() { return [...new Set(this.catalog.map(item => item.group))]; }
  screens(group: string) { return this.catalog.filter(item => item.group === group); }
  setAction(item: CatalogItem, action: 'can_view' | 'can_create' | 'can_update' | 'can_delete', value: boolean) {
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
