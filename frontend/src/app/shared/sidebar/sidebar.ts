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
    { label: 'Accounts', icon: 'bi-bank', items: [['Transactions', '/transactions', 'TRANSACTIONS'], ['Pending Accounts', '/cable-tv-account-pending', 'CABLE_TV_ACCOUNTS'], ['CATV Subscription', '/cable-tv-subscription-pending', 'CABLE_TV_SUBSCRIPTION_DUES'], ['Net Subscription', '/net-subscription-pending', 'NET_SUBSCRIPTION'], ['Append CATV Subscriptions', '/cable-tv-subscription-append', 'CABLE_TV_SUBSCRIPTION_GENERATE'], ['Append Net Subscriptions', '/net-subscription-append', 'NET_SUBSCRIPTION_APPEND']] },
    { label: 'Reports', icon: 'bi-bar-chart', items: [['CATV Subscription Report', '/cable-tv-subscription-report', 'CABLE_TV_SUBSCRIPTION_REPORT'], ['Net Subscription Report', '/net-subscription-report', 'INTERNET_CUSTOMERS']] },
    { label: 'Administration', icon: 'bi-shield-lock', items: [['Workflow Approvals', '/workflow-approval', 'WORKFLOW_APPROVAL'], ['Location Info', '/cable-tv-masters', 'CABLE_TV_MASTERS'], ['Package List', '/cable-tv-packages', 'CABLE_TV_PACKAGES'], ['STB Master', '/cable-tv-stbs', 'CABLE_TV_STBS'], ['Users', '/users', 'USERS'], ['Role Permissions', '/role-permissions', 'ROLE_PERMISSIONS'], ['Audit Logs', '/audit-logs', 'AUDIT_LOGS']] }
  ];
  constructor(public permissions: PermissionService) {}
  visible(group: any) { return group.items.some((item: string[]) => this.permissions.can(item[2])); }
  itemIcon(route: string) {
    const icons: Record<string, string> = {
      '/customers': 'bi-camera-video', '/cable-tv/customers': 'bi-tv', '/internet/customers': 'bi-router', '/suppliers': 'bi-truck',
      '/brands': 'bi-tags', '/categoriesLists': 'bi-grid', '/productList': 'bi-box', '/stock': 'bi-boxes', '/purchases': 'bi-cart',
      '/quotations': 'bi-file-earmark-text', '/sales': 'bi-receipt', '/material-sales': 'bi-bag', '/work-orders': 'bi-clipboard-check',
      '/customer-payments': 'bi-wallet2', '/supplier-payments': 'bi-cash-stack', '/cable-tv/complaints': 'bi-megaphone',
      '/service-tickets': 'bi-ticket-perforated', '/warranty-master': 'bi-shield-check', '/employees': 'bi-people',
      '/employee-attendance': 'bi-calendar-check', '/employee-salary': 'bi-currency-rupee', '/transactions': 'bi-arrow-left-right',
      '/cable-tv-account-pending': 'bi-hourglass-split', '/cable-tv-subscription-pending': 'bi-tv-fill',
      '/net-subscription-pending': 'bi-wifi', '/cable-tv-subscription-append': 'bi-calendar-plus', '/net-subscription-append': 'bi-calendar-plus',
      '/cable-tv-subscription-report': 'bi-bar-chart-line', '/workflow-approval': 'bi-check2-square',
      '/net-subscription-report': 'bi-wifi',
      '/cable-tv-masters': 'bi-geo-alt', '/cable-tv-packages': 'bi-box-seam', '/cable-tv-stbs': 'bi-router-fill',
      '/users': 'bi-person-gear', '/role-permissions': 'bi-shield-lock', '/audit-logs': 'bi-journal-text'
    };
    return icons[route] || 'bi-circle-fill';
  }

  expandGroup(groupLabel: string) {
    this.expandedGroup = groupLabel;
    this.expandRequested.emit();
  }
}
