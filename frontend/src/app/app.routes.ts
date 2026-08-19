import { Routes } from '@angular/router';
import { RouteGuard } from './services/route-guard';

export const routes: Routes = [
    {
        path:'',
        redirectTo:'login',
        pathMatch:'full'
    },
     {
        path:'login',
        loadComponent: () => import('./login/login').then(n =>n.Login)
    },
    {
        path:'',
        loadComponent: () => import('./layout/layout').then(n =>n.Layout),
       children:[
        {
            path:'dashboard',
            loadComponent: ()=> import('./dashboard/dashboard').then(n => n.Dashboard),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin','user']
            }
        },
         {
            path:'users',
            loadComponent: ()=> import('./user/user-list/user-list').then(n => n.UserList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'brands',
            loadComponent: ()=> import('./products/brands-list/brands-list').then(n => n.BrandsList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
       
       
         {
            path:'categoriesLists',
            loadComponent: ()=> import('./products/categories-list/categories-list').then(n => n.CategoriesList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
        
         {
            path:'productList',
            loadComponent: ()=> import('./products/product-list/product-list').then(n => n.ProductList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'role-permissions',
            loadComponent: ()=> import('./administration/role-permissions/role-permissions').then(n => n.RolePermissions),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin'] }
        },
         {
            path:'cable-tv-masters',
            loadComponent: ()=> import('./administration/cable-tv-masters/cable-tv-masters').then(n => n.CableTvMasters),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin'] }
        },
         {
            path:'cable-tv-packages',
            loadComponent: ()=> import('./administration/cable-tv-packages/cable-tv-packages').then(n => n.CableTvPackages),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin'] }
        },
         {
            path:'cable-tv-stbs',
            loadComponent: ()=> import('./administration/cable-tv-stbs/cable-tv-stbs').then(n => n.CableTvStbs),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin'] }
        },
         {
            path:'cable-tv-account-pending',
            loadComponent: ()=> import('./administration/cable-tv-account-pending/cable-tv-account-pending').then(n => n.CableTvAccountPending),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin'] }
        },
         {
            path:'lo-accounts',
            loadComponent: ()=> import('./administration/lo-accounts/lo-accounts').then(n => n.LoAccounts),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin'] }
        },
         {
            path:'cable-tv-subscription-pending',
            loadComponent: ()=> import('./administration/cable-tv-subscription-pending/cable-tv-subscription-pending').then(n => n.CableTvSubscriptionPending),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin','user'] }
        },
         {
            path:'cable-tv-subscription-append',
            loadComponent: ()=> import('./administration/cable-tv-subscription-append/cable-tv-subscription-append').then(n => n.CableTvSubscriptionAppend),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin'] }
         },
         {
            path:'net-subscription-pending',
            loadComponent: ()=> import('./administration/net-subscription-pending/net-subscription-pending').then(n => n.NetSubscriptionPending),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin','user'] }
        },
         {
            path:'net-subscription-append',
            loadComponent: ()=> import('./administration/net-subscription-append/net-subscription-append').then(n => n.NetSubscriptionAppend),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin'] }
        },
         {
            path:'net-cash-admin-correction',
            loadComponent: ()=> import('./administration/net-cash-admin-correction/net-cash-admin-correction').then(n => n.NetCashAdminCorrection),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin'] }
        },
         {
            path:'cable-tv-subscription-report',
            loadComponent: ()=> import('./administration/cable-tv-subscription-report/cable-tv-subscription-report').then(n => n.CableTvSubscriptionReport),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin','user'] }
         },
         {
            path:'net-subscription-report',
            loadComponent: ()=> import('./administration/net-subscription-report/net-subscription-report').then(n => n.NetSubscriptionReport),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin','user'] }
        },
         {
            path:'stb-payment-report',
            loadComponent: ()=> import('./administration/stb-payment-report/stb-payment-report').then(n => n.StbPaymentReport),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin','user'] }
        },
         {
            path:'transactions',
            loadComponent: ()=> import('./transactions/transaction-list/transaction-list').then(n => n.TransactionList),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin','user'] }
        },
         {
            path:'purchases',
            loadComponent: ()=> import('./purchases/purchase-list/purchase-list').then(n => n.PurchaseList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'quotations',
            loadComponent: ()=> import('./quotations/quotation-list/quotation-list').then(n => n.QuotationList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'quotations/add',
            loadComponent: ()=> import('./quotations/quotation-form/quotation-form').then(n => n.QuotationForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'quotations/edit/:id',
            loadComponent: ()=> import('./quotations/quotation-form/quotation-form').then(n => n.QuotationForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'quotations/preview/:id',
            loadComponent: ()=> import('./quotations/quotation-form/quotation-form').then(n => n.QuotationForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'workflow-approval',
            loadComponent: ()=> import('./workflows/workflow-list/workflow-list').then(n => n.WorkflowList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'notifications',
            loadComponent: ()=> import('./notifications/notification-list/notification-list').then(n => n.NotificationList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin','user']
            }
        },
         {
            path:'work-orders',
            loadComponent: ()=> import('./work-orders/work-order-list/work-order-list').then(n => n.WorkOrderList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'work-orders/add',
            loadComponent: ()=> import('./work-orders/work-order-form/work-order-form').then(n => n.WorkOrderForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'work-orders/edit/:id',
            loadComponent: ()=> import('./work-orders/work-order-form/work-order-form').then(n => n.WorkOrderForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'work-orders/material-issue/:id',
            loadComponent: ()=> import('./work-orders/work-order-material/work-order-material').then(n => n.WorkOrderMaterial),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'work-orders/preview/:id',
            loadComponent: ()=> import('./work-orders/work-order-form/work-order-form').then(n => n.WorkOrderForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'sales',
            loadComponent: ()=> import('./sales/sales').then(n => n.Sales),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'customer-payments',
            loadComponent: ()=> import('./customer-payments/customer-payments').then(n => n.CustomerPayments),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'supplier-payments',
            loadComponent: ()=> import('./supplier-payments/supplier-payments').then(n => n.SupplierPayments),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'supplier-payments/add',
            loadComponent: ()=> import('./supplier-payments/supplier-payments').then(n => n.SupplierPayments),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'supplier-payments/edit/:id',
            loadComponent: ()=> import('./supplier-payments/supplier-payments').then(n => n.SupplierPayments),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'service-tickets',
            loadComponent: ()=> import('./service-tickets/service-tickets').then(n => n.ServiceTickets),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'warranty-master',
            loadComponent: ()=> import('./warranty-master/warranty-master').then(n => n.WarrantyMaster),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'stock',
            loadComponent: ()=> import('./stock/stock-list/stock-list').then(n => n.StockList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'quotations',
            loadComponent: ()=> import('./quotations/quotation-list/quotation-list').then(n => n.QuotationList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'quotations/add',
            loadComponent: ()=> import('./quotations/quotation-form/quotation-form').then(n => n.QuotationForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'quotations/edit/:id',
            loadComponent: ()=> import('./quotations/quotation-form/quotation-form').then(n => n.QuotationForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'quotations/review/:id',
            loadComponent: ()=> import('./quotations/quotation-form/quotation-form').then(n => n.QuotationForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'workflow',
            loadComponent: ()=> import('./workflow/workflow-list/workflow-list').then(n => n.WorkflowList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'purchases/add',
            loadComponent: ()=> import('./purchases/purchase-form/purchase-form').then(n => n.PurchaseForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'purchases/edit/:id',
            loadComponent: ()=> import('./purchases/purchase-form/purchase-form').then(n => n.PurchaseForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'suppliers',
            loadComponent: ()=> import('./suppliers/supplier-list/supplier-list').then(n => n.SupplierList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'customers',
            loadComponent: ()=> import('./customers/customer-list/customer-list').then(n => n.CustomerList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'material-sales',
            loadComponent: ()=> import('./cable-tv/material-sales/material-sales').then(n => n.MaterialSales),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin','user'] }
        },
         {
            path:'cable-tv/complaints',
            loadComponent: ()=> import('./cable-tv/cable-tv-complaints/cable-tv-complaints').then(n => n.CableTvComplaints),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin','user']
            }
        },
         {
            path:'internet/customers',
            loadComponent: ()=> import('./internet/internet-customer-list/internet-customer-list').then(n => n.InternetCustomerList),
            canActivate:[RouteGuard], data:{ expectedRole:['admin','user'] }
        },
         {
            path:'internet/customers/add',
            loadComponent: ()=> import('./internet/internet-customer-form/internet-customer-form').then(n => n.InternetCustomerForm),
            canActivate:[RouteGuard], data:{ expectedRole:['admin','user'] }
        },
         {
            path:'internet/customers/edit/:id',
            loadComponent: ()=> import('./internet/internet-customer-form/internet-customer-form').then(n => n.InternetCustomerForm),
            canActivate:[RouteGuard], data:{ expectedRole:['admin','user'] }
        },
         {
            path:'internet/customers/view/:id',
            loadComponent: ()=> import('./internet/internet-customer-view/internet-customer-view').then(n => n.InternetCustomerView),
            canActivate:[RouteGuard], data:{ expectedRole:['admin','user'] }
        },
         {
            path:'internet/customers/:id/complaints',
            loadComponent: ()=> import('./internet/internet-complaints/internet-complaints').then(n => n.InternetComplaints),
            canActivate:[RouteGuard], data:{ expectedRole:['admin','user'] }
        },
         {
            path:'cable-tv/customers',
            loadComponent: ()=> import('./cable-tv/cable-tv-customer-list/cable-tv-customer-list').then(n => n.CableTvCustomerList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin','user']
            }
        },
         {
            path:'cable-tv/customers/add',
            loadComponent: ()=> import('./cable-tv/cable-tv-customer-form/cable-tv-customer-form').then(n => n.CableTvCustomerForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin','user']
            }
        },
         {
            path:'cable-tv/customers/edit/:id',
            loadComponent: ()=> import('./cable-tv/cable-tv-customer-form/cable-tv-customer-form').then(n => n.CableTvCustomerForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin','user']
            }
        },
         {
            path:'cable-tv/customers/view/:id',
            loadComponent: ()=> import('./cable-tv/cable-tv-customer-view/cable-tv-customer-view').then(n => n.CableTvCustomerView),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin','user']
            }
        },
         {
            path:'cable-tv/customers/:id',
            loadComponent: ()=> import('./cable-tv/cable-tv-customer-history/cable-tv-customer-history').then(n => n.CableTvCustomerHistory),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin','user']
            }
        },
         {
            path:'cable-tv/customers/:id/:section',
            loadComponent: ()=> import('./cable-tv/cable-tv-customer-history/cable-tv-customer-history').then(n => n.CableTvCustomerHistory),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin','user']
            }
        },
         {
            path:'customers/:customerId/invoice',
            loadComponent: ()=> import('./sales/sales').then(n => n.Sales),
            canActivate:[RouteGuard],
            data:{ expectedRole:['admin','user'] }
        },
         {
            path:'customers/add',
            loadComponent: ()=> import('./customers/customer-form/customer-form').then(n => n.CustomerForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'customers/edit/:id',
            loadComponent: ()=> import('./customers/customer-form/customer-form').then(n => n.CustomerForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'suppliers/add',
            loadComponent: ()=> import('./suppliers/add-supplier/add-supplier').then(n => n.AddSupplier),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'suppliers/edit/:id',
            loadComponent: ()=> import('./suppliers/add-supplier/add-supplier').then(n => n.AddSupplier),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'employees',
            loadComponent: ()=> import('./employees/employee-list/employee-list').then(n => n.EmployeeList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'employees/add',
            loadComponent: ()=> import('./employees/employee-form/employee-form').then(n => n.EmployeeForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'employees/edit/:id',
            loadComponent: ()=> import('./employees/employee-form/employee-form').then(n => n.EmployeeForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'employee-salary',
            loadComponent: ()=> import('./employee-salary/employee-salary').then(n => n.EmployeeSalary),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'employee-attendance',
            loadComponent: ()=> import('./employee-attendance/employee-attendance').then(n => n.EmployeeAttendance),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'audit-logs',
            loadComponent: ()=> import('./audit-logs/audit-log-list/audit-log-list').then(n => n.AuditLogList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'audit-logs/add',
            loadComponent: ()=> import('./audit-logs/audit-log-form/audit-log-form').then(n => n.AuditLogForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
         {
            path:'audit-logs/edit/:id',
            loadComponent: ()=> import('./audit-logs/audit-log-form/audit-log-form').then(n => n.AuditLogForm),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
        
    ]
    },
     {
        path:'**',
        loadComponent: () => import('./login/login').then(n =>n.Login)
    },
];
