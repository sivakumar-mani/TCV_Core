import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { SignupDialog } from '../user/dialog/signup-dialog/signup-dialog';
import { InputComponent } from '../reusable-components/input-component/input-component';
import { ForgotPassword } from '../user/dialog/forgot-password/forgot-password';
import { UserServices } from '../services/user-services';
import { Snackbar } from '../services/snackbar';
import { globalConstants } from '../services/global-constants';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, SignupDialog, FormsModule, ReactiveFormsModule, InputComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private readonly rememberedUserNameKey = 'rememberedUserName';
  remember = false;
  loginForm!: FormGroup;
  responseMessage = '';
  expanded = true;
  submitted = false;
  private dialog = inject(MatDialog);

  @ViewChild('signupModal')
  signupModal!: SignupDialog;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private userService: UserServices,
    private snackbarService: Snackbar,
    private ngxLoader: NgxUiLoaderService
  ) { }

  ngOnInit(): void {
    this.initLoginForm();
    this.loadRememberedUser();
  }

  initLoginForm(): void {
    this.loginForm = this.fb.group({
      userName: [null, Validators.required],
      password: ['', Validators.required]
    });
  }

  private loadRememberedUser(): void {
    const rememberedUserName = localStorage.getItem(this.rememberedUserNameKey);
    console.log("test",rememberedUserName );
    if (rememberedUserName) {
      this.remember = true;
      this.loginForm.patchValue({
        userName: rememberedUserName
      });
    }
  }

  private updateRememberedUser(userName: string): void {
    if (this.remember) {
      localStorage.setItem(this.rememberedUserNameKey, userName);
      return;
    }

    localStorage.removeItem(this.rememberedUserNameKey);
  }

  openSignupModal(): void {
    this.signupModal.openModal();
  }

  onLogin(): void {
    this.submitted = true;
    this.responseMessage = '';
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      return;
    }

    this.ngxLoader.start();
    const formData = this.loginForm.value;
    const data = {
      userName: formData.userName,
      password: formData.password
    };

    this.userService.login(data).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        localStorage.setItem('token', response.token);
        this.updateRememberedUser(formData.userName);
        this.router.navigateByUrl('/dashboard');
      },
      error: (error) => {
        this.ngxLoader.stop();
        this.responseMessage = error.error?.message || globalConstants.genericError;
        this.snackbarService.openSnackbar(this.responseMessage, globalConstants.errorRegex);
      }
    });
  }

  forgotPassword(): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '500px';
    this.dialog.open(ForgotPassword, dialogConfig);
  }
}
