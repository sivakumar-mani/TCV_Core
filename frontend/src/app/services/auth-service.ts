import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  
  router = inject(Router);

  public hasToken(): boolean {
    return Boolean(localStorage.getItem('token'));
  }

  public logout(): void {
    localStorage.removeItem('token');
    this.router.navigateByUrl('/login');
  }

  public isAuthendicated(): boolean{
    if(!this.hasToken()){
      this.router.navigate(['/login']);
      return false;
    }else {
      return true;
    }
  }
}
