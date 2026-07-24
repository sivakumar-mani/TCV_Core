import { CommonModule, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
    RouterLink,
    MatButtonModule,
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
  stateOptions: any[] = [];
  districtOptions: any[] = [];

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
    this.setupLocationDependency();
    this.loadStates();
  }

  initializeFormData() {
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
      city_district: [''],
      state: [''],
      pincode: [''],
      status: [1]
    });

  }

  loadStates() {
    this.supplierService.getStates().subscribe({
      next: (response: any) => {
        const states = Array.isArray(response) ? response : [];
        this.stateOptions = states.map((state) => ({
          value: state.state_name,
          label: state.state_name,
          id: state.state_id
        }));
        this.initializeFormData();
      },
      error: (error: any) => {
        this.commonMethods.handleError(error);
        this.initializeFormData();
      }
    });
  }

  setupLocationDependency() {
    this.supplierForm.get('state')?.valueChanges.subscribe((stateName) => {
      this.loadDistrictOptions(stateName);
    });
  }

  loadDistrictOptions(stateName: string) {
    const state = this.stateOptions.find((item) => item.value === stateName);

    if (!state?.id) {
      this.districtOptions = [];
      this.supplierForm.get('city_district')?.setValue('');
      return;
    }

    this.supplierService.getDistricts(state.id).subscribe({
      next: (response: any) => {
        this.districtOptions = (Array.isArray(response) ? response : []).map((district) => ({
          value: district.district_name,
          label: district.district_name,
          id: district.district_id
        }));

        const currentDistrict = this.supplierForm.get('city_district')?.value;
        if (currentDistrict && !this.districtOptions.some((item) => item.value === currentDistrict)) {
          this.supplierForm.get('city_district')?.setValue('');
        }
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadSupplierDetails(supplierId: number) {
    this.isEditMode = true;
    this.ngxUiLoader.start();
    this.supplierService.getSupplierById(supplierId).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        const supplierData = response?.data ?? response;
        this.supplierForm.patchValue({
          ...supplierData,
          city_district: supplierData.city_district || supplierData.city
        });
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
