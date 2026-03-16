import { Component } from '@angular/core';
import { FormBuilder, FormGroup,  ReactiveFormsModule, Validators } from '@angular/forms';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import {
  MAT_DIALOG_DATA,
 MatDialogModule, MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { UserServices } from '../..//services/user-services';
import { globalConstants } from '../../services/global-constants';
import { Snackbar } from '../../services/snackbar';
import { MatToolbarModule } from '@angular/material/toolbar';
@Component({
  selector: 'app-forgot-password',
  imports: [  MatFormFieldModule, ReactiveFormsModule,InputFormField, MatToolbarModule,
  MatDialogModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  forgotForm:any = FormGroup;
  forgotEmailForm:any = FormGroup
  responseMessage: any;

 constructor( private dialogConfig : MatDialogRef<ForgotPassword>,
  private fb: FormBuilder,
  private ngxLoader : NgxUiLoaderService,
  private userService : UserServices,
  private snackbarService: Snackbar 
 ){}

 ngOnInit():void{
  this.forgotForm = this.fb.group({
    userName : ['', Validators.required],
  });
   this.forgotEmailForm = this.fb.group({
    email:['', [Validators.required, Validators.pattern(globalConstants.emailRegex)]]
  })
 }
 onForgotPassword(){
  //  if (!this.forgotForm.valid && !this.forgotEmailForm.valid) {
  //   return;
  // }
  this.ngxLoader.start();
  var formData = this.forgotForm.value
  var formData1 = this.forgotEmailForm.value,
  data = {
  userName: formData.userName,
  email: formData1.email
}
  this.userService.forgotPassword(data).subscribe({
    next: (response:any)=>{
      this.ngxLoader.stop();
      localStorage.setItem('token', response.token);
      this.dialogConfig.close();
      this.responseMessage = response?.message;
      this.snackbarService.openSnackbar(this.responseMessage,"");
    },
    error: (error)=>{
      this.ngxLoader.stop();
      this.dialogConfig.close();
      if (error.error?.message){
         this.responseMessage = error.error?.message; 
      }else {
        this.responseMessage = globalConstants.genericError
      }
      this.snackbarService.openSnackbar(this.responseMessage, globalConstants.errorRegex)
    }
  })
 }
}
