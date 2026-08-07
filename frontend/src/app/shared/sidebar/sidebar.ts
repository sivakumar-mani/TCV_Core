import {Component, EventEmitter, Input, Output, signal} from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import {MatExpansionModule} from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PermissionService } from '../../services/permission.service';
@Component({
  selector: 'app-sidebar',
  imports: [NgIf, NgFor, NgClass, MatExpansionModule, MatListModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  @Input() collapsed = false;
  @Output() expandRequested = new EventEmitter<void>();
  expandedGroup = '';
  readonly panelOpenState = signal(false);
  readonly groups = [
    { label: 'Business Partners', icon: 'bi-people', items: [['CCTV Customer', '/customers', 'CUSTOMERS'], ['Cable TV Customers', '/cable-tv/customers', 'CABLE_TV_CUSTOMERS'], ['Internet Customers', '/internet/customers', 'INTERNET_CUSTOMERS'], ['Suppliers', '/suppliers', 'SUPPLIERS']] },
    { label: 'Inventory', icon: 'bi-box-seam', items: [['Brands', '/brands', 'BRANDS'], ['Categories', '/categoriesLists', 'CATEGORIES'], ['Products', '/productList', 'PRODUCTS'], ['Stock', '/stock', 'STOCK'], ['Purchases', '/purchases', 'PURCHASES']] },
    { label: 'Sales', icon: 'bi-receipt', items: [['Quotations', '/quotations', 'QUOTATIONS'], ['Sales', '/sales', 'SALES'], ['Material Sales', '/material-sales', 'MATERIAL_SALES'], ['Work Orders', '/work-orders', 'WORK_ORDERS'], ['Customer Payments', '/customer-payments', 'CUSTOMER_PAYMENTS'], ['Supplier Payments', '/supplier-payments', 'SUPPLIER_PAYMENTS']] },
    { label: 'Service', icon: 'bi-headset', items: [['Complaints', '/cable-tv/complaints', 'CABLE_TV_CUSTOMERS'], ['Service Tickets', '/service-tickets', 'SERVICE_TICKETS'], ['Warranty Master', '/warranty-master', 'WARRANTIES']] },
    { label: 'HR Process', icon: 'bi-person-badge', items: [['Employees', '/employees', 'EMPLOYEES'], ['Employee Attendance', '/employee-attendance', 'EMPLOYEE_ATTENDANCE'], ['Employee Salary', '/employee-salary', 'EMPLOYEE_SALARY']] },
    { label: 'Accounts', icon: 'bi-bank', items: [['Transactions', '/transactions', 'TRANSACTIONS'], ['Pending Accounts', '/cable-tv-account-pending', 'CABLE_TV_ACCOUNTS'], ['CATV Subscription', '/cable-tv-subscription-pending', 'CABLE_TV_SUBSCRIPTION_DUES'], ['Append Subscriptions', '/cable-tv-subscription-append', 'CABLE_TV_SUBSCRIPTION_GENERATE']] },
    { label: 'Reports', icon: 'bi-bar-chart', items: [['CATV Subscription Report', '/cable-tv-subscription-report', 'CABLE_TV_SUBSCRIPTION_REPORT']] },
    { label: 'Administration', icon: 'bi-shield-lock', items: [['Workflow Approvals', '/workflow-approval', 'WORKFLOW_APPROVAL'], ['Location Info', '/cable-tv-masters', 'CABLE_TV_MASTERS'], ['Package List', '/cable-tv-packages', 'CABLE_TV_PACKAGES'], ['STB Master', '/cable-tv-stbs', 'CABLE_TV_STBS'], ['Users', '/users', 'USERS'], ['Role Permissions', '/role-permissions', 'ROLE_PERMISSIONS'], ['Audit Logs', '/audit-logs', 'AUDIT_LOGS']] }
  ];
  constructor(public permissions: PermissionService) {}
  visible(group: any) { return group.items.some((item: string[]) => this.permissions.can(item[2])); }

  expandGroup(groupLabel: string) {
    this.expandedGroup = groupLabel;
    this.expandRequested.emit();
  }
}
