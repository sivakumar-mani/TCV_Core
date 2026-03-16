import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MatCard, MatCardModule } from '@angular/material/card';
import { InputFormField } from '../shared/input-form-field/input-form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { UserServices } from '../services/user-services';
import { Router } from '@angular/router';
import { Snackbar } from '../services/snackbar';
import { globalConstants } from '../services/global-constants';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ForgotPassword } from '../dialog/forgot-password/forgot-password';
@Component({
  selector: 'app-login',
  imports: [MatCardModule, InputFormField, ReactiveFormsModule, MatButtonModule, MatDividerModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {

  loginForm: any = FormGroup;
  responseMessage: string = '';
  router = inject(Router)
  dialog = inject(MatDialog);

  hide = signal(true);
  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation()
  }
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private userService: UserServices,
    private snackbarService: Snackbar,
    private ngxLoader: NgxUiLoaderService
  ) { }
  ngOnInit(): void {
    this.initLoginForm();
  }

  initLoginForm() {
    this.loginForm = this.fb.group({
      userName: [null, Validators.required],
      password: ['', Validators.required]
    })

  }
  onLogin() {
    this.ngxLoader.start();
    var formData = this.loginForm.value,
      data = {
        userName: formData.userName,
        password: formData.password
      }
    this.userService.login(data).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        localStorage.setItem('token', response.token);
        this.router.navigateByUrl('/dashboard');
      },
      error: (error) => {
        this.ngxLoader.stop();
        if (error.error?.message) {
          this.responseMessage = error.error?.message;
        } else {
          this.responseMessage = globalConstants.genericError
        }
        this.snackbarService.openSnackbar(this.responseMessage, globalConstants.errorRegex);
      }
    })
  }

  forgotPassword() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = "500px";
    this.dialog.open(ForgotPassword, dialogConfig)
  }
}