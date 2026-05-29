import { CommonModule, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { SupplierServices } from '../../services/supplier-services';
import { CommonMethods } from '../../shared/common-methods';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-add-supplier',
  imports: [
    CommonModule,
    NgIf,
    MatDialogModule,
    MatDialogActions,
    MatFormFieldModule,
    ReactiveFormsModule,
    InputFormField,
    SelectFormField,
    TextareaFormField
  ],
  templateUrl: './add-supplier.html',
  styleUrl: './add-supplier.scss',
})
export class AddSupplier {
  supplierForm!: FormGroup;
  isEditMode = false;

  statusList = [
    { label: 'Active', value: 1 },
    { label: 'Inactive', value: 0 }
  ];

  constructor(
    private fb: FormBuilder,
    private supplierService: SupplierServices,
    private ngxUiLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private dialog: MatDialogRef<AddSupplier>,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public dialogData: any
  ) { }

  ngOnInit() {
    this.supplierFormInitiate();
  }

  supplierFormInitiate() {
    this.supplierForm = this.fb.group({
      supplier_name: ['', Validators.required],
      contact_person: [''],
      phone: [''],
      email: ['', Validators.email],
      gst_no: [''],
      address: [''],
      city: [''],
      state: [''],
      pincode: [''],
      status: [1]
    });

    if (this.dialogData) {
      this.isEditMode = true;
      this.supplierForm.patchValue(this.dialogData);
      this.supplierForm.get('status')?.setValidators([Validators.required]);
      this.supplierForm.get('status')?.updateValueAndValidity();
    }
  }

  addSubmit() {
    this.ngxUiLoader.start();
    const data = this.supplierForm.getRawValue();

    this.supplierService.addSupplier(data).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        if (response) {
          this.dialog.close('success');
        }
        this.router.navigateByUrl('/suppliers');
      },
      error: (error: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  editSubmit() {
    this.ngxUiLoader.start();
    const formData = this.supplierForm.getRawValue();
    const data = {
      supplier_id: this.dialogData.supplier_id,
      ...formData
    };

    this.supplierService.updateSupplier(data).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        if (response) {
          this.dialog.close('success');
        }
        this.router.navigateByUrl('/suppliers');
      },
      error: (error: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }
}
