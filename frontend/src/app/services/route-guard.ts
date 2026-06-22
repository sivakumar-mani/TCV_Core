import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth-service';
import { Snackbar } from './snackbar';
import { globalConstants } from './global-constants';
import { PermissionService } from './permission.service';
import { catchError, map, of } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class RouteGuard {
  
  constructor( private router : Router,
    private authService :AuthService,
    private snackbarService: Snackbar,
    private permissions: PermissionService
  ){}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if (!this.authService.isAuthendicated()) return false;
    return this.permissions.refreshPermissions().pipe(
      map(() => {
        if (this.permissions.canRoute(state.url)) return true;
        this.snackbarService.openSnackbar(globalConstants.unauthorized, globalConstants.errorRegex);
        this.router.navigate(['/dashboard']);
        return false;
      }),
      catchError(() => {
        this.snackbarService.openSnackbar(globalConstants.unauthorized, globalConstants.errorRegex);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
