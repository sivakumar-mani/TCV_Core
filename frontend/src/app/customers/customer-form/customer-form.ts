import { CommonModule, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CustomerServices } from '../../services/customer-services';
import { EmployeeServices } from '../../services/employee-services';
import { CommonMethods } from '../../shared/common-methods';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-customer-form',
  imports: [
    CommonModule,
    NgIf,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    InputFormField,
    SelectFormField,
    TextareaFormField
  ],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.scss',
})
export class CustomerForm {
  customerForm!: FormGroup;
  isEditMode = false;
  customerId!: number;
  stateOptions: any[] = [];
  districtOptions: any[] = [];
  marketingEmployeeOptions: any[] = [];
  private phoneRegex = /^[0-9]{10}$/;

  salutationOptions = [  
    { label: 'Mr.', value: 'Mr.' },
    { label: 'Mrs.', value: 'Mrs.' },
    { label: 'Ms.', value: 'Ms.' },
    { label: 'M/S', value: 'M/S' },
    { label: 'Mr/Mrs/Ms', value: 'Mr/Mrs/Ms' }
  ];

  customerTypeOptions = [
    { label: 'Retail', value: 'RETAIL' },
    { label: 'Wholesale', value: 'WHOLESALE' },
    { label: 'Dealer', value: 'DEALER' },
    { label: 'Corporate', value: 'CORPORATE' },
    { label: 'Service', value: 'SERVICE' }
  ];

  statusList = [
    { label: 'Active', value: 1 },
    { label: 'Inactive', value: 0 }
  ];

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerServices,
    private employeeService: EmployeeServices,
    private ngxUiLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.buildForm();
    this.setupLocationDependency();
    this.loadMarketingEmployees();
    this.loadStates();
  }

  buildForm() {
    this.customerForm = this.fb.group({
      salutation: ['Mr/Mrs/Ms', Validators.required],
      customer_name: ['', Validators.required],
      contact_person: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(this.phoneRegex)]],
      alternate_phone: ['', Validators.pattern(this.phoneRegex)],
      email: ['', Validators.email],
      gst_no: [''],
      customer_type: ['RETAIL', Validators.required],
      marketing_employee_id: [null],
      referral_details: [''],
      address: ['', Validators.required],
      state: ['', Validators.required],
      city_district: ['', Validators.required],
      pincode: [''],
      credit_limit: [0, [Validators.min(0)]],
      opening_balance: [0],
      outstanding_balance: [0],
      status: [1, Validators.required]
    });
  }

  loadMarketingEmployees() {
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => {
        const employees = Array.isArray(response) ? response : response.data ?? [];
        this.marketingEmployeeOptions = [
          { label: 'Select marketing person', value: null },
          ...employees
            .filter((employee: any) => Number(employee.is_active) === 1)
            .map((employee: any) => ({
              value: employee.employee_id,
              label: `${employee.employee_code ? employee.employee_code + ' - ' : ''}${employee.employee_name || ''}`.trim()
            }))
        ];
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadStates() {
    this.customerService.getStates().subscribe({
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

  initializeFormData() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.customerId = Number(id);
      this.loadCustomerDetails(this.customerId);
    }
  }

  setupLocationDependency() {
    this.customerForm.get('state')?.valueChanges.subscribe((stateName) => {
      this.loadDistrictOptions(stateName);
    });
  }

  loadDistrictOptions(stateName: string) {
    const state = this.stateOptions.find((item) => item.value === stateName);

    if (!state?.id) {
      this.districtOptions = [];
      this.customerForm.get('city_district')?.setValue('');
      return;
    }

    this.customerService.getDistricts(state.id).subscribe({
      next: (response: any) => {
        this.districtOptions = (Array.isArray(response) ? response : []).map((district) => ({
          value: district.district_name,
          label: district.district_name,
          id: district.district_id
        }));

        const currentDistrict = this.customerForm.get('city_district')?.value;
        if (currentDistrict && !this.districtOptions.some((item) => item.value === currentDistrict)) {
          this.customerForm.get('city_district')?.setValue('');
        }
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadCustomerDetails(customerId: number) {
    this.ngxUiLoader.start();
    this.customerService.getCustomerById(customerId).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        const customerData = response?.data ?? response;
        this.customerForm.patchValue({
          ...customerData,
          status: customerData.status ?? customerData.is_active
        });
      },
      error: (error: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addSubmit() {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.ngxUiLoader.start();
    const data = this.customerForm.getRawValue();

    this.customerService.addCustomer(data).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/customers');
      },
      error: (error: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  editSubmit() {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.ngxUiLoader.start();
    const data = {
      customer_id: this.customerId,
      ...this.customerForm.getRawValue()
    };

    this.customerService.updateCustomer(data).subscribe({
      next: (response: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/customers');
      },
      error: (error: any) => {
        this.ngxUiLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  cancel() {
    this.router.navigateByUrl('/customers');
  }
}
