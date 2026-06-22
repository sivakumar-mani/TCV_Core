import {Component, Input, signal} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import {MatExpansionModule} from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PermissionService } from '../../services/permission.service';
@Component({
  selector: 'app-sidebar',
  imports: [NgIf, NgFor, MatExpansionModule, MatListModule, MatIcon, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  @Input() collapsed = false;
  readonly panelOpenState = signal(false);
  readonly groups = [
    { label: 'Business Partners', icon: 'groups', items: [['Customers', '/customers', 'CUSTOMERS'], ['Suppliers', '/suppliers', 'SUPPLIERS']] },
    { label: 'Inventory', icon: 'inventory', items: [['Brands', '/brands', 'BRANDS'], ['Categories', '/categoriesLists', 'CATEGORIES'], ['Products', '/productList', 'PRODUCTS'], ['Stock', '/stock', 'STOCK'], ['Purchases', '/purchases', 'PURCHASES']] },
    { label: 'Sales', icon: 'request_quote', items: [['Quotations', '/quotations', 'QUOTATIONS'], ['Sales', '/sales', 'SALES'], ['Work Orders', '/work-orders', 'WORK_ORDERS'], ['Customer Payments', '/customer-payments', 'CUSTOMER_PAYMENTS'], ['Supplier Payments', '/supplier-payments', 'SUPPLIER_PAYMENTS']] },
    { label: 'Service', icon: 'support_agent', items: [['Service Tickets', '/service-tickets', 'SERVICE_TICKETS'], ['Warranty Master', '/warranty-master', 'WARRANTIES']] },
    { label: 'HR Process', icon: 'badge', items: [['Employees', '/employees', 'EMPLOYEES'], ['Employee Attendance', '/employee-attendance', 'EMPLOYEE_ATTENDANCE'], ['Employee Salary', '/employee-salary', 'EMPLOYEE_SALARY']] },
    { label: 'Administration', icon: 'admin_panel_settings', items: [['Workflow Approvals', '/workflow-approval', 'WORKFLOW_APPROVAL'], ['Users', '/users', 'USERS'], ['Role Permissions', '/role-permissions', 'ROLE_PERMISSIONS'], ['Audit Logs', '/audit-logs', 'AUDIT_LOGS']] }
  ];
  constructor(public permissions: PermissionService) {}
  visible(group: any) { return group.items.some((item: string[]) => this.permissions.can(item[2])); }
}
