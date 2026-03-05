import { Routes } from '@angular/router';

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
            loadComponent: ()=> import('./dashboard/dashboard').then(n => n.Dashboard)
        }
    ]
    },
     {
        path:'**',
        loadComponent: () => import('./login/login').then(n =>n.Login)
    },
];
