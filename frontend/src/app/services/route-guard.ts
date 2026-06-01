import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './auth-service';
import { Snackbar } from './snackbar';
import { jwtDecode } from 'jwt-decode';
import { globalConstants } from './global-constants';
@Injectable({
  providedIn: 'root',
})
export class RouteGuard {
  
  constructor( private router : Router,
    private authService :AuthService,
    private snackbarService: Snackbar
  ){}

  canActivate(route:ActivatedRouteSnapshot):boolean{
    const expectedRoleArray = route.data['expectedRole'] || [];

    const token:any  = localStorage.getItem('token');
    var tokenPayload :any
    try {
        tokenPayload = jwtDecode(token);
    } catch (error) {
        localStorage.clear();
        this.router.navigate(['/login']);
        return false;
    }

    const userRole = tokenPayload?.role?.toString().toUpperCase();
    const checkRole = expectedRoleArray
      .map((role: string) => role.toUpperCase())
      .includes(userRole);

    if (this.authService.isAuthendicated() && checkRole) {
      return true;
    }

    if (tokenPayload?.role) {
      this.snackbarService.openSnackbar(globalConstants.unauthorized, globalConstants.errorRegex);
      this.router.navigate(['/login']);
      return false;
    }

    this.router.navigate(['/login']);
    localStorage.clear();
    return false;
  }
}
