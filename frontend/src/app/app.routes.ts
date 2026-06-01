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
            path:'dashboard',
            loadComponent: ()=> import('./dashboard/dashboard').then(n => n.Dashboard),
            canActivate:[RouteGuard],
            data:{
                expectedRole:['ADMIN','MANAGER']
            }
        },
    ]
            
            
        },
  {
    path: '**',
    loadComponent: () => import('./login/login.component').then(n => n.LoginComponent)
  },
];
