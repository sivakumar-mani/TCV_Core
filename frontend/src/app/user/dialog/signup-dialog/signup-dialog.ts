import { Component, ElementRef, ViewChild } from '@angular/core';
import { Modal } from 'bootstrap';


import { NgClass, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputComponent } from '../../../reusable-components/input-component/input-component';
import { SelectComponent } from '../../../reusable-components/select-component/select-component';
import { globalConstants } from '../../../services/global-constants';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { UserServices } from '../../../services/user-services';
import { Snackbar } from '../../../services/snackbar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup-dialog',
  imports: [InputComponent, SelectComponent, NgClass, NgIf, ReactiveFormsModule],
  templateUrl: './signup-dialog.html',
  styleUrl: './signup-dialog.scss',
})
export class SignupDialog {

  @ViewChild('signupModal') modalElement!: ElementRef;
  signupForm: any = FormGroup;
  responseMessage: string = '';
  expanded = true;
  modalInstance!: Modal;

  constructor(
    private fb: FormBuilder,
    private ngxLoader: NgxUiLoaderService,
    private userService: UserServices,
    private snackBarService: Snackbar,
    private router: Router
  ) { }
    
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
  }

  openModal(): void {
    if (!this.modalInstance) {
      this.modalInstance = new Modal(this.modalElement.nativeElement, {
        backdrop: 'static',
        keyboard: false
      });
    }

    this.modalInstance.show();
  }

  closeModal(): void {
    this.modalInstance?.hide();
  }

  roleList = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'SALES', label: 'Sales' },
    { value: 'SERVICE', label: 'Service' }
  ];

  statusList = [
    { value: 1, label: 'Active' },
    { value: 0, label: 'Inactive' }
  ];

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
          this.closeModal();
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
}
