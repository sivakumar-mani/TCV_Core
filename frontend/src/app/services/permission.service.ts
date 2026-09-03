import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { appConfig } from '../app-config';
import { tap } from 'rxjs';

export type PermissionAction = 'view' | 'create' | 'update' | 'delete';
export interface RolePermission {
  permission_key: string;
  can_view: boolean | number;
  can_create: boolean | number;
  can_update: boolean | number;
  can_delete: boolean | number;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private livePermissions: RolePermission[] | null = null;
  private readonly routePermissions: Record<string, string> = {
    dashboard: 'DASHBOARD', notifications: 'NOTIFICATIONS', customers: 'CUSTOMERS', 'cable-tv': 'CABLE_TV_CUSTOMERS', internet: 'INTERNET_CUSTOMERS', suppliers: 'SUPPLIERS',
    brands: 'BRANDS', categoriesLists: 'CATEGORIES', productList: 'PRODUCTS', stock: 'STOCK',
    purchases: 'PURCHASES', quotations: 'QUOTATIONS', sales: 'SALES', 'work-orders': 'WORK_ORDERS',
    'customer-payments': 'CUSTOMER_PAYMENTS', 'supplier-payments': 'SUPPLIER_PAYMENTS',
    'service-tickets': 'SERVICE_TICKETS', 'warranty-master': 'WARRANTIES', employees: 'EMPLOYEES',
    'employee-attendance': 'EMPLOYEE_ATTENDANCE', 'employee-salary': 'EMPLOYEE_SALARY',
    'workflow-approval': 'WORKFLOW_APPROVAL', workflow: 'WORKFLOW_APPROVAL', users: 'USERS',
    'audit-logs': 'AUDIT_LOGS', 'role-permissions': 'ROLE_PERMISSIONS', 'cable-tv-masters': 'CABLE_TV_MASTERS',
    'cable-tv-packages': 'CABLE_TV_PACKAGES', 'cable-tv-stbs': 'CABLE_TV_STBS',
    'cable-tv-account-pending': 'CABLE_TV_ACCOUNTS',
    'lo-accounts': 'LO_ACCOUNTS',
    'cable-tv-subscription-pending': 'CABLE_TV_SUBSCRIPTION_DUES',
    'net-subscription-pending': 'NET_SUBSCRIPTION',
    'net-subscription-append': 'NET_SUBSCRIPTION_APPEND',
    'cable-tv-subscription-append': 'CABLE_TV_SUBSCRIPTION_GENERATE',
    'cable-tv-subscription-report': 'CABLE_TV_SUBSCRIPTION_REPORT',
    'stb-payment-report': 'STB_PAYMENT_REPORT',
    'net-subscription-report': 'NET_SUBSCRIPTION_REPORT',
    'net-cash-admin-correction': 'INTERNET_CUSTOMERS',
    transactions: 'TRANSACTIONS', 'material-sales': 'MATERIAL_SALES', 'material-sales-report': 'MATERIAL_SALES',
    complaints: 'CABLE_TV_COMPLAINTS'
  };

  constructor(private http: HttpClient) {}
  private payload(): any { try { return jwtDecode(localStorage.getItem('token') || ''); } catch { return null; } }
  isAdmin(): boolean { return String(this.payload()?.role).toUpperCase() === 'ADMIN'; }
  role(): string { return String(this.payload()?.role || ''); }
  username(): string { return this.payload()?.username || this.payload()?.userName || ''; }
  employeeId(): number | null { return this.payload()?.employee_id ? Number(this.payload().employee_id) : null; }
  employeeCode(): string { return this.payload()?.employee_code || ''; }

  can(key: string, action: PermissionAction = 'view'): boolean {
    if (key === 'TRANSACTIONS') return true;
    if (this.isAdmin()) return true;
    const permissions = this.livePermissions ?? this.payload()?.permissions ?? [];
    const row = permissions.find((item: RolePermission) => item.permission_key === key);
    return Boolean(row?.[`can_${action}` as keyof RolePermission]);
  }

  canRoute(path: string): boolean {
    const key = this.keyForRoute(path);
    const updateRoute = ['/edit', '/review', '/material-issue'].some(part => path.includes(part));
    return Boolean(key) && this.can(key, path.includes('/add') ? 'create' : updateRoute ? 'update' : 'view');
  }

  keyForRoute(path: string): string {
    const normalizedPath = path.replace(/^\//, '').split(/[?]/)[0];
    if (normalizedPath.startsWith('cable-tv/complaints')) return 'CABLE_TV_COMPLAINTS';
    const segment = normalizedPath.split('/')[0];
    return this.routePermissions[segment] || '';
  }

  refreshPermissions() {
    return this.http.get<any>(`${appConfig.apiUrl}/user/my-permissions`).pipe(
      tap(response => this.livePermissions = Array.isArray(response.permissions) ? response.permissions : [])
    );
  }

  getRolePermissions() { return this.http.get<any>(`${appConfig.apiUrl}/permissions`); }
  updateRolePermissions(role: string, permissions: RolePermission[]) {
    return this.http.put<any>(`${appConfig.apiUrl}/permissions/${role}`, { permissions });
  }
}
