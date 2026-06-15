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
