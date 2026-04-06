import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogActions, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputFormField } from '../../../../shared/input-form-field/input-form-field';
import { TextareaFormField } from '../../../../shared/textarea-form-field/textarea-form-field';
import { CommonModule, NgIf } from '@angular/common';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { BrandServices } from '../../../../services/brand-services';
import { Snackbar } from '../../../../services/snackbar';
import { Router } from '@angular/router';
import { globalConstants } from '../../../../services/global-constants';
import { SelectFormField } from '../../../../shared/select-form-field/select-form-field';
@Component({
 selector: 'app-brands',
  imports: [ MatDialogModule, MatDialogActions, SelectFormField, CommonModule,
    InputFormField,TextareaFormField, MatFormFieldModule, ReactiveFormsModule],
  templateUrl: './brands.html',
  styleUrl: './brands.scss',
})
export class Brands implements OnInit {

  brandForm!: FormGroup;
  responseMessage: any;
  isEditMode!: boolean;

  statusList = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' }
  ];

  constructor(
    private fb: FormBuilder,
    private ngxUiLoader: NgxUiLoaderService,
    private brandService: BrandServices,
    private snackbarService: Snackbar,
    private dialog: MatDialogRef<Brands>,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public dialogData: any
  ) {}

  ngOnInit():void {
    this.brandFormInitiate();
  }

  brandFormInitiate() {
    this.brandForm = this.fb.group({
      brand_name: ['', [Validators.required]],
      brand_code: ['', [Validators.required]],
      description: ['', [Validators.required]],
      status: ['', [Validators.required]],
    });

    if (this.dialogData) {
      this.brandForm.patchValue(this.dialogData);
      this.isEditMode = true;
    } else {
      this.isEditMode = false;
    }
  }

  // ─── ADD ───────────────────────────────────────────────────────────────────
  addSubmit() {
    if (this.brandForm.invalid) return;

    this.ngxUiLoader.start();
    const formData = this.brandForm.value;
    const data = {
      brand_name: formData.brand_name,
      description: formData.description
    };

    this.brandService.addBrands(data).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        this.handleTokenAndMessage(response);
        this.dialog.close('success');
        this.router.navigateByUrl('/brands');
      },
      error: (error: any) => {
        this.ngxUiLoader.stop();
        this.handleError(error);
      }
    });
  }

  // ─── EDIT ──────────────────────────────────────────────────────────────────
  editSubmit() {
    if (this.brandForm.invalid) return;

    this.ngxUiLoader.start();
    const formData = this.brandForm.value;
    const data = {
      brand_name: formData.brand_name,
      brand_code: formData.brand_code,
      description: formData.description,
      status: formData.status,
    };

    this.brandService.updateBrand(data).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        this.handleTokenAndMessage(response);
        this.dialog.close('success');
        this.router.navigateByUrl('/brands');
      },
      error: (error: any) => {
        this.ngxUiLoader.stop();
        this.handleError(error);
      }
    });
  }

  // ─── DELETE ────────────────────────────────────────────────────────────────
  deleteSubmit() {
    if (!this.dialogData?.id) return;

    this.ngxUiLoader.start();

    this.brandService.deleteBrand(this.dialogData.id).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        this.handleTokenAndMessage(response);
        this.dialog.close('deleted');
        this.router.navigateByUrl('/brands');
      },
      error: (error: any) => {
        this.ngxUiLoader.stop();
        this.handleError(error);
      }
    });
  }

  // ─── SUBMIT ROUTER ─────────────────────────────────────────────────────────
  onSubmit() {
    if (this.isEditMode) {
      this.editSubmit();
    } else {
      this.addSubmit();
    }
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────
  private handleTokenAndMessage(response: any) {
    if (response?.token) {
      localStorage.setItem('token', response.token);
    }
    this.responseMessage = response?.message;
    this.snackbarService.openSnackbar(this.responseMessage, '');
  }

  private handleError(error: any) {
    this.responseMessage = error?.error?.message || globalConstants.genericError;
    this.snackbarService.openSnackbar(this.responseMessage, globalConstants.errorRegex);
  }
}