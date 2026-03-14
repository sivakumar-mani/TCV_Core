import { Component } from '@angular/core';
import { MatDialogActions, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { InputFormField } from '../../reusable/input-form-field/input-form-field';
import { SelectFormField } from '../../reusable/select-form-field/select-form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { globalConstants } from '../../services/global-constants';
import { CommonModule } from '@angular/common';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { UserServices } from '../../services/user-services';
import { Snackbar } from '../../services/snackbar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  imports: [MatFormFieldModule,SelectFormField, CommonModule,  MatDialogModule, MatDialogActions, InputFormField, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  signupForm: any = FormGroup;
  responseMessage: string='';

  constructor(private dialog: MatDialogRef<Signup>,
    private fb: FormBuilder,
    private ngxLoader: NgxUiLoaderService,
    private userService: UserServices,
    private snackBarService: Snackbar,
    private router: Router
  ) { }

roleList = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' }
];
  ngOnInit() {
    this.signupForm = this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        userName: ['', Validators.required],
        password: ['', [Validators.required, Validators.pattern(globalConstants.passwordRegex)]],
        email: ['', [Validators.required, Validators.pattern(globalConstants.emailRegex)]],
        contactNumber: ['', Validators.required],
        role: ['', Validators.required],
        Status: ['', Validators.required],
    });
  }

    registeredDate= new Date().getDate();
    loginDate= new Date();

  sigupSubmit(){
    this.ngxLoader.start();
    var formData = this.signupForm.value,
    data={
        userName: formData.userName,
        password: formData.password,
        email: formData.email,
        contactNumber: formData.contactNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
        // dateRegistered: this.registeredDate.toString(),
        // lastLogin: this.loginDate.toString(),
        dateRegistered: "2026-10-12",
        lastLogin: "2026-10-12 10:00:00",
        role: formData.role,
        Status: formData.Status
    }
    //console.log("sign", data);
    this.userService.signup(data).subscribe({
      next: (response:any)=>{
         this.ngxLoader.stop();
        localStorage.setItem('token', response.token);
        this.responseMessage = response.message;
        this.snackBarService.openSnackbar( this.responseMessage, "");
        this.dialog.close();
        this.router.navigateByUrl('/users');
      },
      error: (error)=>{
        this.ngxLoader.stop();
        if(error.error?.message){
          this.responseMessage = error.error?.message;
        }else{
          this.responseMessage = globalConstants.genericError;
        }
        this.snackBarService.openSnackbar( this.responseMessage, globalConstants.errorRegex)
      }
    })
  }
}
