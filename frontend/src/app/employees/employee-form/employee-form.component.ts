import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EmployeeService } from '../services/employee.service';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatCheckboxModule,
    MatTabsModule
  ],
  templateUrl: './employee-form.component.html',
  styleUrls: ['./employee-form.component.scss']
})
export class EmployeeForm implements OnInit, OnDestroy {
  employeeForm: FormGroup;
  isEditMode = false;
  isLoading = false;
  photoPreview: string | null = null;
  selectedFile: File | null = null;

  states: any[] = [];
  permanentDistricts: any[] = [];
  temporaryDistricts: any[] = [];
  idProofTypes: any[] = [];
  departments: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private locationService: LocationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.employeeForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadDropdownData();
    this.checkEditMode();
  }

  createForm(): FormGroup {
    return this.fb.group({
      // Employee Code (Auto-generated, disabled)
      employeeCode: [{ value: '', disabled: true }],

      // Personal Information
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      dateOfBirth: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      alternatePhone: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.email]],
      photo: [''],

      // Employment Information
      designation: ['', Validators.required],
      department: ['', Validators.required],
      joiningDate: ['', Validators.required],
      qualification: ['', Validators.required],

      // Identification
      idProofType: ['', Validators.required],
      idProofNumber: ['', Validators.required],

      // Family Information
      spouseOrParentName: ['', Validators.required],
      relationship: [''],
      kidsDetails: [''],

      // Permanent Address
      permanentAddress: ['', Validators.required],
      permanentState: ['', Validators.required],
      permanentDistrict: ['', Validators.required],
      permanentPincode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],

      // Temporary Address (Optional)
      temporaryAddress: [''],
      temporaryState: [''],
      temporaryDistrict: [''],
      temporaryPincode: ['', [Validators.pattern(/^[0-9]{6}$/)]]
    });
  }

  loadDropdownData(): void {
    this.locationService.getStates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (states) => {
          this.states = states;
        },
        error: (err) => console.error('Error loading states:', err)
      });

    this.locationService.getIdProofTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => {
          this.idProofTypes = types;
        },
        error: (err) => console.error('Error loading ID proof types:', err)
      });

    this.locationService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (depts) => {
          this.departments = depts;
        },
        error: (err) => console.error('Error loading departments:', err)
      });
  }

  checkEditMode(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (params) => {
          if (params['id']) {
            this.isEditMode = true;
            this.loadEmployee(params['id']);
          }
        },
        error: (err) => console.error('Error reading params:', err)
      });
  }

  loadEmployee(employeeId: number): void {
    this.isLoading = true;
    this.employeeService.getEmployeeById(employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.populateForm(response.data);
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading employee:', err);
          this.isLoading = false;
        }
      });
  }

  populateForm(employee: any): void {
    this.employeeForm.patchValue({
      employeeCode: employee.employee_code,
      firstName: employee.first_name,
      lastName: employee.last_name,
      dateOfBirth: employee.date_of_birth,
      phone: employee.phone,
      alternatePhone: employee.alternate_phone,
      email: employee.email,
      designation: employee.designation,
      department: employee.department,
      joiningDate: employee.joining_date,
      qualification: employee.qualification,
      idProofType: employee.id_proof_type,
      idProofNumber: employee.id_proof_number,
      spouseOrParentName: employee.spouse_or_parent_name,
      relationship: employee.relationship,
      kidsDetails: employee.kids_details,
      permanentAddress: employee.permanent_address,
      permanentPincode: employee.permanent_pincode,
      temporaryAddress: employee.temporary_address,
      temporaryPincode: employee.temporary_pincode
    });

    if (employee.photo_file_name) {
      this.photoPreview = `${employee.photo_path}/${employee.photo_file_name}`;
    }

    // Load districts for permanent state
    if (employee.permanent_state) {
      const state = this.states.find(s => s.state_name === employee.permanent_state);
      if (state) {
        this.employeeForm.patchValue({ permanentState: state.state_id });
        this.loadDistricts('permanent', state.state_id);
        // Set district after districts load
        setTimeout(() => {
          this.employeeForm.patchValue({ permanentDistrict: employee.permanent_city_district });
        }, 500);
      }
    }

    // Load districts for temporary state
    if (employee.temporary_state) {
      const state = this.states.find(s => s.state_name === employee.temporary_state);
      if (state) {
        this.employeeForm.patchValue({ temporaryState: state.state_id });
        this.loadDistricts('temporary', state.state_id);
        // Set district after districts load
        setTimeout(() => {
          this.employeeForm.patchValue({ temporaryDistrict: employee.temporary_city_district });
        }, 500);
      }
    }
  }

  onPermanentStateChange(stateId: number): void {
    this.loadDistricts('permanent', stateId);
    this.employeeForm.get('permanentDistrict')?.reset();
  }

  onTemporaryStateChange(stateId: number): void {
    this.loadDistricts('temporary', stateId);
    this.employeeForm.get('temporaryDistrict')?.reset();
  }

  loadDistricts(type: string, stateId: number): void {
    this.locationService.getDistrictsByState(stateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (districts) => {
          if (type === 'permanent') {
            this.permanentDistricts = districts;
          } else {
            this.temporaryDistricts = districts;
          }
        },
        error: (err) => console.error('Error loading districts:', err)
      });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only JPEG, JPG, and PNG files are allowed');
        return;
      }

      // Validate file size (1MB)
      if (file.size > 1024 * 1024) {
        alert('File size must be less than 1MB');
        return;
      }

      this.selectedFile = file;

      // Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  getFormData(): FormData {
    const formData = new FormData();

    // Get state and district names from the state_id values
    const permanentStateId = this.employeeForm.get('permanentState')?.value;
    const permanentStateName = this.states.find(s => s.state_id === permanentStateId)?.state_name || '';

    const temporaryStateId = this.employeeForm.get('temporaryState')?.value;
    const temporaryStateName = this.states.find(s => s.state_id === temporaryStateId)?.state_name || '';

    // Add text fields
    formData.append('first_name', this.employeeForm.get('firstName')?.value);
    formData.append('last_name', this.employeeForm.get('lastName')?.value);
    formData.append('phone', this.employeeForm.get('phone')?.value);
    formData.append('alternate_phone', this.employeeForm.get('alternatePhone')?.value || '');
    formData.append('email', this.employeeForm.get('email')?.value || '');
    formData.append('designation', this.employeeForm.get('designation')?.value);
    formData.append('department', this.employeeForm.get('department')?.value);
    formData.append('date_of_birth', this.employeeForm.get('dateOfBirth')?.value);
    formData.append('joining_date', this.employeeForm.get('joiningDate')?.value);
    formData.append('qualification', this.employeeForm.get('qualification')?.value);
    formData.append('id_proof_type', this.employeeForm.get('idProofType')?.value);
    formData.append('id_proof_number', this.employeeForm.get('idProofNumber')?.value);
    formData.append('spouse_or_parent_name', this.employeeForm.get('spouseOrParentName')?.value);
    formData.append('relationship', this.employeeForm.get('relationship')?.value || '');
    formData.append('kids_details', this.employeeForm.get('kidsDetails')?.value || '');
    formData.append('permanent_address', this.employeeForm.get('permanentAddress')?.value);
    formData.append('permanent_city_district', this.employeeForm.get('permanentDistrict')?.value);
    formData.append('permanent_state', permanentStateName);
    formData.append('permanent_pincode', this.employeeForm.get('permanentPincode')?.value);
    formData.append('temporary_address', this.employeeForm.get('temporaryAddress')?.value || '');
    formData.append('temporary_city_district', this.employeeForm.get('temporaryDistrict')?.value || '');
    formData.append('temporary_state', temporaryStateName);
    formData.append('temporary_pincode', this.employeeForm.get('temporaryPincode')?.value || '');

    if (this.selectedFile) {
      formData.append('photo', this.selectedFile);
    }

    return formData;
  }

  onSubmit(): void {
    if (this.employeeForm.invalid) {
      alert('Please fill all required fields correctly');
      return;
    }

    this.isLoading = true;
    const formData = this.getFormData();

    if (this.isEditMode) {
      // Update employee
      const employeeId = this.route.snapshot.params['id'];
      this.employeeService.updateEmployee(employeeId, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              alert('Employee updated successfully');
              this.router.navigate(['/employees']);
            }
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error updating employee:', err);
            alert(err.error?.message || 'Error updating employee');
            this.isLoading = false;
          }
        });
    } else {
      // Add new employee
      this.employeeService.addEmployee(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              alert('Employee added successfully');
              this.router.navigate(['/employees']);
            }
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error adding employee:', err);
            alert(err.error?.message || 'Error adding employee');
            this.isLoading = false;
          }
        });
    }
  }

  onCancel(): void {
    this.router.navigate(['/employees']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
