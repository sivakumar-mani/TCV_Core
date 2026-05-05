import { inject, Injectable } from '@angular/core';
import { Snackbar } from '../services/snackbar';
import { globalConstants } from '../services/global-constants';
@Injectable({
  providedIn: 'root',
})
export class CommonMethods {
  responseMessage: any;
snackbarService =inject(Snackbar);
  
handleTokenAndMessage(response: any) {
      if (response?.token) {
        localStorage.setItem('token', response.token);
      }
      this.responseMessage = response?.message;
      this.snackbarService.openSnackbar(this.responseMessage, '');
    }
  
     handleError(error: any) {
      this.responseMessage = error?.error?.message || globalConstants.genericError;
      this.snackbarService.openSnackbar(this.responseMessage, globalConstants.errorRegex);
    }
  }
  

