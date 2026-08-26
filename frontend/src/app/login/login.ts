import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnDestroy, signal } from '@angular/core';
import { MatCard, MatCardModule } from '@angular/material/card';
import { InputFormField } from '../shared/input-form-field/input-form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { UserServices } from '../services/user-services';
import { Router } from '@angular/router';
import { Snackbar } from '../services/snackbar';
import { globalConstants } from '../services/global-constants';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ForgotPassword } from '../user/dialog/forgot-password/forgot-password';
@Component({
  selector: 'app-login',
  imports: [CommonModule, MatCardModule, InputFormField, ReactiveFormsModule, MatButtonModule, MatDividerModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnDestroy {

  loginForm: any = FormGroup;
  responseMessage: string = '';
  captchaQuestion = '';
  captchaToken = '';
  captchaLoading = false;
  private captchaExpiresAt = 0;
  private captchaRefreshTimer?: ReturnType<typeof setTimeout>;
  private captchaRequestId = 0;
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
    this.refreshCaptcha();
  }

  initLoginForm() {
    this.loginForm = this.fb.group({
      userName: [null, Validators.required],
      password: ['', Validators.required],
      captchaAnswer: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    })

  }
  onLogin() {
    if (this.loginForm.invalid || !this.captchaToken) {
      this.loginForm.markAllAsTouched();
      return;
    }
    if (Date.now() >= this.captchaExpiresAt - 10000) {
      this.snackbarService.openSnackbar('The security code expired and has been refreshed. Please enter the new code.', globalConstants.errorRegex);
      this.refreshCaptcha();
      return;
    }
    this.ngxLoader.start();
    var formData = this.loginForm.value,
      data = {
        userName: formData.userName,
        password: formData.password,
        captchaToken: this.captchaToken,
        captchaAnswer: Number(formData.captchaAnswer)
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
        this.loginForm.get('captchaAnswer')?.reset('');
        this.refreshCaptcha();
      }
    })
  }

  refreshCaptcha() {
    clearTimeout(this.captchaRefreshTimer);
    const requestId = ++this.captchaRequestId;
    this.captchaLoading = true;
    this.captchaQuestion = 'Loading CAPTCHA...';
    this.captchaToken = '';
    this.loginForm?.get('captchaAnswer')?.reset('');
    this.userService.getCaptcha().subscribe({
      next: (captcha) => {
        if (requestId !== this.captchaRequestId) return;
        this.captchaLoading = false;
        this.captchaQuestion = captcha.question;
        this.captchaToken = captcha.token;
        const apiExpiresAt = Number(captcha.expiresAt);
        this.captchaExpiresAt = Number.isFinite(apiExpiresAt) && apiExpiresAt > Date.now()
          ? apiExpiresAt
          : Date.now() + 5 * 60 * 1000;
        const refreshDelay = Math.max(this.captchaExpiresAt - Date.now() - 10000, 1000);
        this.captchaRefreshTimer = setTimeout(() => this.refreshCaptcha(), refreshDelay);
      },
      error: () => {
        if (requestId !== this.captchaRequestId) return;
        this.captchaLoading = false;
        this.captchaQuestion = 'Unable to load CAPTCHA';
        this.captchaToken = '';
        this.captchaExpiresAt = 0;
      }
    });
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (!document.hidden) this.refreshExpiredCaptcha();
  }

  @HostListener('window:focus')
  onWindowFocus() {
    this.refreshExpiredCaptcha();
  }

  private refreshExpiredCaptcha() {
    if (!this.captchaLoading && (!this.captchaToken || Date.now() >= this.captchaExpiresAt - 10000)) {
      this.refreshCaptcha();
    }
  }

  ngOnDestroy() {
    clearTimeout(this.captchaRefreshTimer);
  }

  forgotPassword() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = "500px";
    this.dialog.open(ForgotPassword, dialogConfig)
  }
}
