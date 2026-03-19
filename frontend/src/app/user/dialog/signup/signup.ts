import { Component, Inject } from '@angular/core';
import { MatDialogActions, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { InputFormField } from '../../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../../shared/select-form-field/select-form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { globalConstants } from '../../../services/global-constants';
import { CommonModule, NgIf } from '@angular/common';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { UserServices } from '../../../services/user-services';
import { Snackbar } from '../../../services/snackbar';
import { Router } from '@angular/router';
@Component({
  selector: 'app-signup',
  imports: [MatFormFieldModule, SelectFormField, CommonModule, MatDialogModule, MatDialogActions, InputFormField, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  signupForm: any = FormGroup;
  responseMessage: string = '';
   
  constructor(private dialog: MatDialogRef<Signup>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private ngxLoader: NgxUiLoaderService,
    private userService: UserServices,
    private snackBarService: Snackbar,
    private router: Router
  ) { }

  roleList = [
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'User' },
    { value: 'staff', label: 'Staff' }
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
    if (this.data) {
      this.signupForm.patchValue(this.data);
    }
  }

  registeredDate = new Date().getDate();
  loginDate = new Date();

  sigupSubmit() {
    this.ngxLoader.start();
    var formData = this.signupForm.value,
      data = {
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
    this.userService.signup(data).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
       if (response?.token) {
          localStorage.setItem('token', response.token);
        }
        this.responseMessage = response.message;
        this.snackBarService.openSnackbar(this.responseMessage, "");
        if (response) {
          this.dialog.close('success');
        }
        this.router.navigateByUrl('/users');
      },
      error: (error) => {
        this.ngxLoader.stop();
        if (error.error?.message) {
          this.responseMessage = error.error?.message;
        } else {
          this.responseMessage = globalConstants.genericError;
        }
        this.snackBarService.openSnackbar(this.responseMessage, globalConstants.errorRegex)
      }
    });
  }
  userEditSubmit() {
    this.ngxLoader.start();
    var formData = this.signupForm.value,
      data = {
        userId: this.data.userId,
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

    this.userService.userEdit(data).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        if (response?.token) {
          localStorage.setItem('token', response.token);
        }
        this.responseMessage = response.message;
        this.snackBarService.openSnackbar(this.responseMessage, "");
        if (response) {
          this.dialog.close('success');
        }
        this.router.navigateByUrl('/users');
      }, error: (error) => {
        this.ngxLoader.stop();
        if (error.error?.message) {
          this.responseMessage = error.error?.message
        } else {
          this.responseMessage = globalConstants.genericError
        }
        this.snackBarService.openSnackbar(this.responseMessage, globalConstants.errorRegex);
      }
    })
  }
}
