import { DialogRef } from '@angular/cdk/dialog';
import { Component, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialog, MatDialogActions, MatDialogModule } from '@angular/material/dialog';
import { InputFormField } from '../../../shared/input-form-field/input-form-field';
import { globalConstants } from '../../../services/global-constants';
import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';
import { Snackbar } from '../../../services/snackbar';
import { UserServices } from '../../../services/user-services';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-change-password',
  imports: [ MatDialogActions, MatDialogModule,InputFormField, MatIcon,  ReactiveFormsModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export class ChangePassword {
  changePasswordForm:any = FormGroup;
  responseMessage: any
  
  hideConfirmPassword:boolean = true
 hide = signal(true);
  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }
  constructor(private dialog: DialogRef<ChangePassword>,
    private fb : FormBuilder,
    private ngxLoader: NgxUiLoaderService, 
    private snackbarService: Snackbar,
    private userService: UserServices, 
    private router : Router
  ){}

  ngOnInit(){
    this.changePasswordForm = this.fb.group({
      oldPassword:  ['',[Validators.required]],
      newPassword: ['', [Validators.required, Validators.pattern(globalConstants.passwordRegex)],],
       confirmPassword: ['', [Validators.required],]
    },{
      validators: this.passwordMatchValidator,
      
    })
  }
    passwordMatchValidator(control: AbstractControl): void {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');

  if (!newPassword || !confirmPassword) return;

  if (newPassword.value !== confirmPassword.value) {
    confirmPassword.setErrors({ mismatch: true });
  } else {
    confirmPassword.setErrors(null);
  }
}
changePassword(){
  this.ngxLoader.start()
  var formData = this.changePasswordForm.value,
  data ={
   oldPassword : formData.oldPassword,
   newPassword : formData.newPassword
  }
  this.userService.changePassword(data).subscribe({
    next: (response:any)=>{
      this.ngxLoader.stop();
      this.dialog.close();
      this.responseMessage = response?.message;
      this.snackbarService.openSnackbar(this.responseMessage, "");
      this.router.navigateByUrl('/login')
    },
    error: (error:any)=>{
      if(error.error?.message){
        this.responseMessage = error.error?.message;
      }else {
        this.responseMessage = globalConstants.genericError;
      }
      this.snackbarService.openSnackbar(this.responseMessage, globalConstants.errorRegex)
    }
   
  })
}
}
