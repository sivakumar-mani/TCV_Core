import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { BrandServices } from '../../../services/brand-services';
import { globalConstants } from '../../../services/global-constants';
import { Snackbar } from '../../../services/snackbar';
import { InputFormField } from '../../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../../../shared/textarea-form-field/textarea-form-field';

const maxWords = (limit: number) => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value || '';
    const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
    return wordCount > limit ? { maxWords: { requiredLength: limit, actualLength: wordCount } } : null;
  };
};

@Component({
  selector: 'app-brands',
  imports: [
    MatDialogModule,
    MatDialogActions,
    SelectFormField,
    CommonModule,
    InputFormField,
    TextareaFormField,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  templateUrl: './brands.html',
  styleUrl: './brands.scss',
})
export class Brands {
  brandForm!: FormGroup;
  responseMessage: any;
  isEditMode = false;
  isViewMode = false;
  brandData: any;

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
  ) { }

  ngOnInit() {
    this.brandData = this.dialogData?.brand || this.dialogData;
    this.isViewMode = this.dialogData?.mode === 'view';
    this.isEditMode = this.dialogData?.mode === 'edit' || (!!this.dialogData && !this.isViewMode);
    this.brandFormInitiate();
  }

  brandFormInitiate() {
    this.brandForm = this.fb.group({
      brand_id: [null],
      brand_name: ['', [Validators.required]],
      brand_code: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
      description: ['', [Validators.required, Validators.minLength(10), maxWords(200)]],
      status: ['ACTIVE', [Validators.required]],
    });

    if (this.brandData) {
      this.brandForm.patchValue(this.brandData);
    }

    if (this.isViewMode) {
      this.brandForm.disable();
    }

    this.brandForm.get('brand_name')?.valueChanges.subscribe((value) => {
      if (this.isEditMode || this.isViewMode) return;

      const brandCodeControl = this.brandForm.get('brand_code');
      if (!brandCodeControl?.dirty) {
        brandCodeControl?.setValue(this.slugify(value || ''), { emitEvent: false });
      }
    });

    this.brandForm.get('brand_code')?.valueChanges.subscribe((value) => {
      if (this.isViewMode) return;

      const nextValue = this.slugify(value || '');
      if (value !== nextValue) {
        this.brandForm.get('brand_code')?.setValue(nextValue, { emitEvent: false });
      }
    });
  }

  addSubmit() {
    if (this.brandForm.invalid) {
      this.brandForm.markAllAsTouched();
      return;
    }

    this.ngxUiLoader.start();
    const formData = this.brandForm.getRawValue();
    const data = {
      brand_name: formData.brand_name,
      brand_code: this.slugify(formData.brand_code),
      description: formData.description,
      status: formData.status
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
      },
    });
  }

  editSubmit() {
    if (this.brandForm.invalid) {
      this.brandForm.markAllAsTouched();
      return;
    }

    this.ngxUiLoader.start();
    const formData = this.brandForm.getRawValue();
    const data = {
      brand_id: this.brandData.brand_id,
      brand_name: formData.brand_name,
      brand_code: this.slugify(formData.brand_code),
      description: formData.description,
      status: formData.status
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

  private slugify(value: string) {
    return value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

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
