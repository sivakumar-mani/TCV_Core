import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { EmployeeServices } from '../../services/employee-services';
import { CommonMethods } from '../../shared/common-methods';
import { environment } from '../../../environments/environment.development';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../../shared/textarea-form-field/textarea-form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-employee-form',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    InputFormField,
    SelectFormField,
    TextareaFormField,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.scss',
})
export class EmployeeForm {
  employeeForm!: FormGroup;
  isEditMode = false;
  employeeId!: number;
  selectedPhotoName = '';
  photoPreview = '';
  photoError = '';
  stateOptions: any[] = [];
  permanentDistrictOptions: any[] = [];
  temporaryDistrictOptions: any[] = [];
  private assetBaseUrl = environment.apiUrl.replace('/api', '');
  private phoneRegex = /^[0-9]{10}$/;

  departmentOptions = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'ENGINEER', label: 'Engineer' },
    { value: 'TECHNICAL', label: 'Technical' },
    { value: 'STAFF', label: 'Staff' },
    { value: 'SALES', label: 'Sales' },
    { value: 'PURCHASE', label: 'Purchase' },
    { value: 'STORE', label: 'Store' },
    { value: 'INSTALLATION', label: 'Installation' },
    { value: 'SERVICE', label: 'Service' },
    { value: 'ACCOUNTS', label: 'Accounts' }
  ];
  statusOptions = [
    { value: 1, label: 'Active' },
    { value: 0, label: 'Inactive' }
  ];
  idProofTypes = [
    { value: 'AADHAAR', label: 'Aadhaar' },
    { value: 'PAN', label: 'PAN Card' },
    { value: 'VOTER_ID', label: 'Voter ID' },
    { value: 'PASSPORT', label: 'Passport' },
    { value: 'DRIVING_LICENSE', label: 'Driving License' },
    { value: 'RATION_CARD', label: 'Ration Card' },
    { value: 'NREGA_JOB_CARD', label: 'NREGA Job Card' },
    { value: 'BANK_PASSBOOK', label: 'Bank Passbook' },
    { value: 'POST_OFFICE_PASSBOOK', label: 'Post Office Passbook' },
    { value: 'GOVERNMENT_EMPLOYEE_ID', label: 'Government Employee ID' },
    { value: 'DEFENCE_ID', label: 'Defence ID' },
    { value: 'PENSIONER_CARD', label: 'Pensioner Card' },
    { value: 'BIRTH_CERTIFICATE', label: 'Birth Certificate' },
    { value: 'OTHER', label: 'Other' }
  ];

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.buildForm();
    this.setupLocationDependencies();
    this.loadStates();
  }

  initializeFormData() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.employeeId = Number(id);
      this.loadEmployee(this.employeeId);
    } else {
      this.loadNextEmployeeCode();
    }
  }

  buildForm() {
    this.employeeForm = this.fb.group({
      employee_code: [{ value: '', disabled: true }], // Auto-generated, disabled, no validation
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(this.phoneRegex)]],
      alternate_phone: ['', Validators.pattern(this.phoneRegex)],
      email: ['', Validators.email],
      designation: ['', Validators.required],
      department: ['SERVICE', Validators.required],
      date_of_birth: ['', Validators.required],
      qualification: ['', Validators.required],
      photo: [''],
      spouse_or_parent_name: ['', Validators.required],
      relationship: [''],
      kids_details: [''],
      id_proof_type: ['', Validators.required],
      id_proof_name: [''],
      id_proof_number: ['', Validators.required],
      joining_date: ['', Validators.required],
      photo_file_name: [''],
      photo_path: [''],
      permanent_address: ['', Validators.required],
      permanent_city_district: ['', Validators.required],
      permanent_state: ['', Validators.required],
      permanent_pincode: ['', Validators.required],
      temporary_address: [''],
      temporary_city_district: [''],
      temporary_state: [''],
      temporary_pincode: [''],
      is_active: [1, Validators.required]
    });
  }

  loadNextEmployeeCode() {
    this.employeeService.getNextEmployeeCode().subscribe({
      next: (response: any) => {
        this.employeeForm.get('employee_code')?.setValue(response?.employee_code || '');
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadStates() {
    this.employeeService.getStates().subscribe({
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

  setupLocationDependencies() {
    this.employeeForm.get('permanent_state')?.valueChanges.subscribe((stateName) => {
      this.loadDistrictOptions(stateName, 'permanent');
    });

    this.employeeForm.get('temporary_state')?.valueChanges.subscribe((stateName) => {
      this.loadDistrictOptions(stateName, 'temporary');
    });
  }

  loadDistrictOptions(stateName: string, addressType: 'permanent' | 'temporary') {
    const state = this.stateOptions.find((item) => item.value === stateName);
    const districtControlName = addressType === 'permanent' ? 'permanent_city_district' : 'temporary_city_district';

    if (!state?.id) {
      if (addressType === 'permanent') this.permanentDistrictOptions = [];
      else this.temporaryDistrictOptions = [];
      this.employeeForm.get(districtControlName)?.setValue('');
      return;
    }

    this.employeeService.getDistricts(state.id).subscribe({
      next: (response: any) => {
        const districtOptions = (Array.isArray(response) ? response : []).map((district) => ({
          value: district.district_name,
          label: district.district_name,
          id: district.district_id
        }));

        if (addressType === 'permanent') this.permanentDistrictOptions = districtOptions;
        else this.temporaryDistrictOptions = districtOptions;

        const currentDistrict = this.employeeForm.get(districtControlName)?.value;
        if (currentDistrict && !districtOptions.some((item) => item.value === currentDistrict)) {
          this.employeeForm.get(districtControlName)?.setValue('');
        }
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadEmployee(employeeId: number) {
    this.ngxLoader.start();
    this.employeeService.getEmployeeById(employeeId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const data = response?.data ?? response;
        data.date_of_birth = this.toDatePickerValue(data.date_of_birth);
        data.joining_date = this.toDatePickerValue(data.joining_date);
        this.employeeForm.patchValue(data);
        this.selectedPhotoName = data.photo_file_name || '';
        this.photoPreview = this.getPhotoUrl(data.photo_path);
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  onPhotoSelected(event: Event) {
    this.photoError = '';
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.photoError = 'Only jpeg, jpg, and png files are allowed.';
      input.value = '';
      return;
    }

    if (file.size > 1024 * 1024) {
      this.photoError = 'Photo must be below 1 MB.';
      input.value = '';
      return;
    }

    this.ngxLoader.start();
    this.employeeService.uploadEmployeePhoto(file).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.selectedPhotoName = response.photo_file_name;
        this.photoPreview = this.getPhotoUrl(response.photo_path);
        this.employeeForm.patchValue({
          photo_file_name: response.photo_file_name,
          photo_path: response.photo_path
        });
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  getPhotoUrl(path: string) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.assetBaseUrl}${path}`;
  }

  toDatePickerValue(value: string | Date) {
    if (!value) return '';
    return value instanceof Date ? value : new Date(value);
  }

  toSqlDate(value: string | Date) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  submit() {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    const formData = this.employeeForm.getRawValue();
    const payload = {
      ...formData,
      date_of_birth: this.toSqlDate(formData.date_of_birth),
      joining_date: this.toSqlDate(formData.joining_date),
      ...(this.isEditMode ? { employee_id: this.employeeId } : {})
    };

    // In create mode, don't send employee_code (backend will auto-generate it)
    if (!this.isEditMode) {
      delete payload.employee_code;
    }

    const request = this.isEditMode
      ? this.employeeService.updateEmployee(payload)
      : this.employeeService.addEmployee(payload);

    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        if (!this.isEditMode && response?.employee_code) {
          // Optionally store or display the generated employee code
          console.log('Generated Employee Code:', response.employee_code);
        }
        this.router.navigateByUrl('/employees');
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  cancel() {
    this.router.navigateByUrl('/employees');
  }
}
