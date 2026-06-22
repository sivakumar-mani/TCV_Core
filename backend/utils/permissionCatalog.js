const permissionCatalog = [
  ['General', 'DASHBOARD', 'Dashboard', '/dashboard'],
  ['General', 'NOTIFICATIONS', 'Notifications', '/notifications'],
  ['Business Partners', 'CUSTOMERS', 'Customers', '/customers'],
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
  ['Administration', 'USERS', 'Users', '/users'],
  ['Administration', 'AUDIT_LOGS', 'Audit Logs', '/audit-logs'],
  ['Administration', 'ROLE_PERMISSIONS', 'Role Permissions', '/role-permissions'],
].map(([group, key, label, route]) => ({ group, key, label, route }));

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
