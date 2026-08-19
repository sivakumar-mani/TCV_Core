import { Component, Inject } from '@angular/core';
import { MatDialogActions, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { InputFormField } from '../../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../../shared/select-form-field/select-form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { globalConstants } from '../../../services/global-constants';
import { CommonModule, NgIf } from '@angular/common';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { UserServices } from '../../../services/user-services';
import { EmployeeServices } from '../../../services/employee-services';
import { Snackbar } from '../../../services/snackbar';
import { Router } from '@angular/router';
@Component({
  selector: 'app-signup',
  imports: [MatFormFieldModule, SelectFormField, CommonModule, MatDialogModule, MatDialogActions, InputFormField, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  signupForm: any = FormGroup;
  responseMessage: string = '';
  employeeOptions: any[] = [];
  employees: any[] = [];
   
  constructor(private dialog: MatDialogRef<Signup>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private ngxLoader: NgxUiLoaderService,
    private userService: UserServices,
    private employeeService: EmployeeServices,
    private snackBarService: Snackbar,
    private router: Router
  ) { }

  roleList = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'SALES', label: 'Sales' },
    { value: 'SERVICE', label: 'Service' }
  ];

  ngOnInit() {
    this.signupForm = this.fb.group({
      employee_id: [null, Validators.required],
      firstName: [{ value: '', disabled: true }],
      lastName: [{ value: '', disabled: true }],
      userName: ['', Validators.required],
      password: ['', [Validators.required, Validators.pattern(globalConstants.passwordRegex)]],
      email: [{ value: '', disabled: true }],
      contactNumber: [{ value: '', disabled: true }],
      role: ['', Validators.required],
      Status: ['', Validators.required],
    });
    if (this.data) {
      this.signupForm.patchValue(this.data);
    }
    this.signupForm.get('employee_id')?.valueChanges.subscribe((employeeId: any) => this.applyEmployeeDetails(employeeId));
    this.loadEmployees();
  }

  registeredDate = new Date().getDate();
  loginDate = new Date();

  private buildUserPayload() {
    const formData = this.signupForm.getRawValue();
    return {
      employee_id: formData.employee_id,
      userName: formData.userName,
      password: formData.password,
      email: formData.email,
      contactNumber: formData.contactNumber,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      Status: formData.Status
    };
  }

  loadEmployees() {
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => {
        this.employees = (Array.isArray(response) ? response : []).filter((employee: any) => Number(employee.is_active) === 1);
        this.employeeOptions = this.employees.map((employee: any) => ({
          value: employee.employee_id,
          label: employee.employee_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
        }));
        const employeeId = this.signupForm.get('employee_id')?.value;
        if (employeeId) this.applyEmployeeDetails(employeeId);
      },
      error: (error) => {
        this.responseMessage = error.error?.message || globalConstants.genericError;
        this.snackBarService.openSnackbar(this.responseMessage, globalConstants.errorRegex);
      }
    });
  }

  applyEmployeeDetails(employeeId: any) {
    const employee = this.employees.find((item: any) => Number(item.employee_id) === Number(employeeId));
    if (!employee) return;
    this.signupForm.patchValue({
      firstName: employee.first_name || '',
      lastName: employee.last_name || '',
      email: employee.email || '',
      contactNumber: employee.phone || ''
    }, { emitEvent: false });
  }

  sigupSubmit() {
    this.ngxLoader.start();
    const data = this.buildUserPayload();
    this.userService.signup(data).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
       if (response?.token) {
          localStorage.setItem('token', response.token);
        }
        this.responseMessage = response.message;
        this.snackBarService.openSnackbar(this.responseMessage, "");
        if (response) {
          this.dialog.close('success');
        }
        this.router.navigateByUrl('/users');
      },
      error: (error) => {
        this.ngxLoader.stop();
        if (error.error?.message) {
          this.responseMessage = error.error?.message;
        } else {
          this.responseMessage = globalConstants.genericError;
        }
        this.snackBarService.openSnackbar(this.responseMessage, globalConstants.errorRegex)
      }
    });
  }
  userEditSubmit() {
    this.ngxLoader.start();
    const data = {
      userId: this.data.userId,
      ...this.buildUserPayload()
    };

    this.userService.userEdit(data).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        if (response?.token) {
          localStorage.setItem('token', response.token);
        }
        this.responseMessage = response.message;
        this.snackBarService.openSnackbar(this.responseMessage, "");
        if (response) {
          this.dialog.close('success');
        }
        this.router.navigateByUrl('/users');
      }, error: (error) => {
        this.ngxLoader.stop();
        if (error.error?.message) {
          this.responseMessage = error.error?.message
        } else {
          this.responseMessage = globalConstants.genericError
        }
        this.snackBarService.openSnackbar(this.responseMessage, globalConstants.errorRegex);
      }
    })
  }
}
