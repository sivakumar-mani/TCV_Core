import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CustomerServices } from '../../services/customer-services';
import { CommonMethods } from '../../shared/common-methods';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-add-customer',
  imports: [CommonModule, ReactiveFormsModule, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './add-customer.html',
  styleUrl: './add-customer.scss',
})
export class AddCustomer {
  customerForm!: FormGroup;
  isEditMode = false;
  customerId!: number;

  customerTypes = [
    { label: 'Retail', value: 'RETAIL' },
    { label: 'Wholesale', value: 'WHOLESALE' },
    { label: 'Dealer', value: 'DEALER' },
    { label: 'Corporate', value: 'CORPORATE' }
  ];
  statusList = [
    { label: 'Active', value: 1 },
    { label: 'Inactive', value: 0 }
  ];

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.initForm();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.customerId = Number(id);
      this.isEditMode = true;
      this.loadCustomer(this.customerId);
    }
  }

  initForm() {
    this.customerForm = this.fb.group({
      customer_name: ['', Validators.required],
      contact_person: [''],
      phone: [''],
      alternate_phone: [''],
      email: ['', Validators.email],
      gst_no: [''],
      address: [''],
      city: [''],
      state: [''],
      pincode: [''],
      customer_type: ['RETAIL'],
      credit_limit: [0],
      opening_balance: [0],
      status: [1]
    });
  }

  loadCustomer(customerId: number) {
    this.ngxLoader.start();
    this.customerService.getCustomerById(customerId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.customerForm.patchValue(response?.data ?? response);
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  save() {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    const data = this.customerForm.getRawValue();
    const request = this.isEditMode
      ? this.customerService.updateCustomer({ customer_id: this.customerId, ...data })
      : this.customerService.addCustomer(data);

    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/customers');
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  cancel() {
    this.router.navigateByUrl('/customers');
  }
}
