const permissionCatalog = [
  ['General', 'DASHBOARD', 'Dashboard', '/dashboard'],
  ['General', 'NOTIFICATIONS', 'Notifications', '/notifications'],
  ['Business Partners', 'CUSTOMERS', 'Customers', '/customers'],
  ['Business Partners', 'CABLE_TV_CUSTOMERS', 'Cable TV Customers', '/cable-tv/customers'],
  ['Business Partners', 'INTERNET_CUSTOMERS', 'Internet Customers', '/internet/customers'],
  ['Cable TV Customer Actions', 'CABLE_TV_CONNECTIONS', 'Connection Actions', '/cable-tv/customers/:id/connections'],
  ['Cable TV Customer Actions', 'CABLE_TV_CUSTOMER_STBS', 'STB Actions', '/cable-tv/customers/:id/stbs'],
  ['Cable TV Customer Actions', 'CABLE_TV_CUSTOMER_PACKAGES', 'Package Actions', '/cable-tv/customers/:id/packages'],
  ['Cable TV Customer Actions', 'CABLE_TV_SUBSCRIPTIONS', 'Subscription Actions', '/cable-tv/customers/:id/subscriptions'],
  ['Business Partners', 'SUPPLIERS', 'Suppliers', '/suppliers'],
  ['Inventory', 'BRANDS', 'Brands', '/brands'],
  ['Inventory', 'CATEGORIES', 'Categories', '/categoriesLists'],
  ['Inventory', 'PRODUCTS', 'Products', '/productList'],
  ['Inventory', 'STOCK', 'Stock', '/stock'],
  ['Inventory', 'PURCHASES', 'Purchases', '/purchases'],
  ['Sales', 'QUOTATIONS', 'Quotations', '/quotations'],
  ['Sales', 'SALES', 'Sales', '/sales'],
  ['Sales', 'WORK_ORDERS', 'Work Orders', '/work-orders'],
  ['Sales', 'CUSTOMER_PAYMENTS', 'Customer Payments', '/customer-payments'],
  ['Sales', 'SUPPLIER_PAYMENTS', 'Supplier Payments', '/supplier-payments'],
  ['Service', 'SERVICE_TICKETS', 'Service Tickets', '/service-tickets'],
  ['Service', 'WARRANTIES', 'Warranty Master', '/warranty-master'],
  ['HR Process', 'EMPLOYEES', 'Employees', '/employees'],
  ['HR Process', 'EMPLOYEE_ATTENDANCE', 'Employee Attendance', '/employee-attendance'],
  ['HR Process', 'EMPLOYEE_SALARY', 'Employee Salary', '/employee-salary'],
  ['Administration', 'WORKFLOW_APPROVAL', 'Workflow Approvals', '/workflow-approval'],
  ['Administration', 'CABLE_TV_MASTERS', 'Location Info', '/cable-tv-masters'],
  ['Administration', 'CABLE_TV_PACKAGES', 'Package List', '/cable-tv-packages'],
  ['Administration', 'CABLE_TV_STBS', 'STB Master', '/cable-tv-stbs'],
  ['Administration', 'USERS', 'Users', '/users'],
  ['Administration', 'AUDIT_LOGS', 'Audit Logs', '/audit-logs'],
  ['Administration', 'ROLE_PERMISSIONS', 'Role Permissions', '/role-permissions'],
  ['Accounts', 'CABLE_TV_ACCOUNTS', 'Pending Accounts', '/cable-tv-account-pending'],
  ['Accounts', 'CABLE_TV_SUBSCRIPTION_DUES', 'CATV Subscription', '/cable-tv-subscription-pending'],
  ['Accounts', 'CABLE_TV_SUBSCRIPTION_GENERATE', 'Append CATV Subscriptions', '/cable-tv-subscription-append'],
  ['Accounts', 'TRANSACTIONS', 'Transactions', '/transactions'],
  ['Reports', 'CABLE_TV_SUBSCRIPTION_REPORT', 'CATV Subscription Report', '/cable-tv-subscription-report'],
].map(([group, key, label, route]) => ({ group, key, label, route }));

const createOnlyPermissionKeys = new Set([
  'CABLE_TV_CONNECTIONS',
  'CABLE_TV_CUSTOMER_STBS',
  'CABLE_TV_CUSTOMER_PACKAGES',
  'CABLE_TV_SUBSCRIPTIONS'
]);
permissionCatalog.forEach((item) => {
  if (createOnlyPermissionKeys.has(item.key)) item.createOnly = true;
});

const apiModules = {
  brand: 'BRANDS', category: 'CATEGORIES', product: 'PRODUCTS', supplier: 'SUPPLIERS',
  customer: 'CUSTOMERS', purchase: 'PURCHASES', stock: 'STOCK', quotation: 'QUOTATIONS',
  workflow: 'WORKFLOW_APPROVAL', 'work-order': 'WORK_ORDERS', employee: 'EMPLOYEES',
  'employee-salary': 'EMPLOYEE_SALARY', 'employee-attendance': 'EMPLOYEE_ATTENDANCE',
  'audit-log': 'AUDIT_LOGS', 'customer-payment': 'CUSTOMER_PAYMENTS',
  'supplier-payment': 'SUPPLIER_PAYMENTS', sales: 'SALES',
  'service-ticket': 'SERVICE_TICKETS', warranty: 'WARRANTIES', notifications: 'NOTIFICATIONS'
};

Object.assign(apiModules, {
  brands: 'BRANDS', categories: 'CATEGORIES', products: 'PRODUCTS', suppliers: 'SUPPLIERS',
  customers: 'CUSTOMERS', quotations: 'QUOTATIONS', workflows: 'WORKFLOW_APPROVAL',
  'work-orders': 'WORK_ORDERS', 'customer-payments': 'CUSTOMER_PAYMENTS',
  'supplier-payments': 'SUPPLIER_PAYMENTS', 'service-tickets': 'SERVICE_TICKETS',
  warranties: 'WARRANTIES'
});

module.exports = { permissionCatalog, apiModules };
