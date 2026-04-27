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
            path:'categoryList',
            loadComponent: ()=> import('./products/category-list/category-list').then(n => n.CategoryList),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['admin']
            }
        },
        {
            path:'categoryLists',
            loadComponent: ()=> import('./products/category-lists/category-lists').then(n => n.CategoryLists),
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
        
    ]
    },
     {
        path:'**',
        loadComponent: () => import('./login/login').then(n =>n.Login)
    },
];
