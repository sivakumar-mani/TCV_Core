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
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'SALES', label: 'Sales' },
    { value: 'SERVICE', label: 'Service' }
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
      Status: [1, Validators.required],
    });
    if (this.data) {
      this.signupForm.patchValue({
        firstName: this.data.first_name ?? this.data.firstName,
        lastName: this.data.last_name ?? this.data.lastName,
        userName: this.data.username ?? this.data.userName,
        password: this.data.password,
        email: this.data.email,
        contactNumber: this.data.contact_number ?? this.data.contactNumber,
        role: this.data.role,
        Status: this.data.status ?? this.data.Status
      });
    }
  }

  registeredDate = new Date().getDate();
  loginDate = new Date();

  sigupSubmit() {
    this.ngxLoader.start();
    var formData = this.signupForm.value,
      data = {
        username: formData.userName,
        password: formData.password,
        email: formData.email,
        contact_number: formData.contactNumber,
        first_name: formData.firstName,
        last_name: formData.lastName,
        last_login: null,
        role: formData.role,
        status: Number(formData.Status)
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
        user_id: this.data.user_id ?? this.data.userId,
        username: formData.userName,
        password: formData.password,
        email: formData.email,
        contact_number: formData.contactNumber,
        first_name: formData.firstName,
        last_name: formData.lastName,
        last_login: this.data.last_login ?? this.data.lastLogin ?? null,
        role: formData.role,
        status: Number(formData.Status)
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
