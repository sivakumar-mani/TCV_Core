import { CommonModule, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, Router } from '@angular/router';
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
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
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
  supplierId!: number;

  statusList = [
    { label: 'Active', value: 1 },
    { label: 'Inactive', value: 0 }
  ];

  constructor(
    private fb: FormBuilder,
    private supplierService: SupplierServices,
    private ngxUiLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.supplierFormInitiate();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.supplierId = Number(id);
      this.loadSupplierDetails(this.supplierId);
    }
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

  }

  loadSupplierDetails(supplierId: number) {
    this.isEditMode = true;
    this.ngxUiLoader.start();
    this.supplierService.getSupplierById(supplierId).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        const supplierData = response?.data ?? response;
        this.supplierForm.patchValue(supplierData);
        this.supplierForm.get('status')?.setValidators([Validators.required]);
        this.supplierForm.get('status')?.updateValueAndValidity();
      },
      error: (error: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addSubmit() {
    this.ngxUiLoader.start();
    const data = this.supplierForm.getRawValue();

    this.supplierService.addSupplier(data).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
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
      supplier_id: this.supplierId,
      ...formData
    };

    this.supplierService.updateSupplier(data).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/suppliers');
      },
      error: (error: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  cancel() {
    this.router.navigateByUrl('/suppliers');
  }
}
