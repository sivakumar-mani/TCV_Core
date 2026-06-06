import { Routes } from '@angular/router';
import { RouteGuard } from './services/route-guard';



export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(n => n.LoginComponent)
  },

 {
        path:'',
        loadComponent: () => import('./common/layout/layout').then(n =>n.Layout),
       children:[
        {
            path:'home',
            redirectTo:'dashboard',
            pathMatch:'full'
        },
        {
            path:'dashboard',
            loadComponent: ()=> import('./dashboard/dashboard').then(n => n.Dashboard),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN','MANAGER']
            }
        },
        {
            path:'users',
            loadComponent: ()=> import('./user/user-list/user-list').then(n => n.UserList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'brands',
            loadComponent: ()=> import('./products/brands-list/brands-list').then(n => n.BrandsList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'categoriesLists',
            loadComponent: ()=> import('./products/categories-list/categories-list').then(n => n.CategoriesList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'productList',
            loadComponent: ()=> import('./products/product-list/product-list').then(n => n.ProductList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'suppliers',
            loadComponent: ()=> import('./suppliers/supplier-list/supplier-list').then(n => n.SupplierList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'suppliers/add',
            loadComponent: ()=> import('./suppliers/add-supplier/add-supplier').then(n => n.AddSupplier),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'suppliers/edit/:id',
            loadComponent: ()=> import('./suppliers/add-supplier/add-supplier').then(n => n.AddSupplier),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'customers',
            loadComponent: ()=> import('./customers/customer-list/customer-list').then(n => n.CustomerList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'customers/add',
            loadComponent: ()=> import('./customers/add-customer/add-customer').then(n => n.AddCustomer),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'customers/edit/:id',
            loadComponent: ()=> import('./customers/add-customer/add-customer').then(n => n.AddCustomer),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'quotations',
            loadComponent: ()=> import('./quotations/quotation-list/quotation-list').then(n => n.QuotationList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'quotations/add',
            loadComponent: ()=> import('./quotations/add-quotation/add-quotation').then(n => n.AddQuotation),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'quotations/edit/:id',
            loadComponent: ()=> import('./quotations/add-quotation/add-quotation').then(n => n.AddQuotation),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'approvals',
            loadComponent: ()=> import('./workflow/approval-list/approval-list').then(n => n.ApprovalList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'purchases',
            loadComponent: ()=> import('./purchase/purchase-list/purchase-list').then(n => n.PurchaseList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'purchases/add',
            loadComponent: ()=> import('./purchase/add-purchase/add-purchase').then(n => n.AddPurchase),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'material-issues',
            loadComponent: ()=> import('./material/material-issue-list/material-issue-list').then(n => n.MaterialIssueList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'material-issues/add',
            loadComponent: ()=> import('./material/add-material-issue/add-material-issue').then(n => n.AddMaterialIssue),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'material-returns',
            loadComponent: ()=> import('./material/material-return-list/material-return-list').then(n => n.MaterialReturnList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'material-returns/add',
            loadComponent: ()=> import('./material/add-material-return/add-material-return').then(n => n.AddMaterialReturn),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'stock',
            loadComponent: ()=> import('./stock/stock-list/stock-list').then(n => n.StockList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
        {
            path:'stock-ledger',
            loadComponent: ()=> import('./stock/stock-ledger-list/stock-ledger-list').then(n => n.StockLedgerList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN']
            }
        },
    ]
            
            
        },
  {
    path: '**',
    loadComponent: () => import('./login/login.component').then(n => n.LoginComponent)
  },
];
