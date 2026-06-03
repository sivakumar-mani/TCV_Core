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
    ]
            
            
        },
  {
    path: '**',
    loadComponent: () => import('./login/login.component').then(n => n.LoginComponent)
  },
];
