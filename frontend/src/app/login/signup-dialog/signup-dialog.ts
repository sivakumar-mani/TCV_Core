import { Component, ElementRef, ViewChild } from '@angular/core';
import { Modal } from 'bootstrap';


import { NgClass, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputComponent } from '../../reusable-components/input-component/input-component';
import { SelectComponent } from '../../reusable-components/select-component/select-component';

@Component({
  selector: 'app-signup-dialog',
  imports: [InputComponent, SelectComponent, NgClass, NgIf],
  templateUrl: './signup-dialog.html',
  styleUrl: './signup-dialog.scss',
})
export class SignupDialog {

  @ViewChild('signupModal') modalElement!: ElementRef;
 email = '';
  password = '';
  showPass = false;
  remember = false;
  supplierForm: any = FormGroup;
  expanded = true;
  modalInstance!: Modal;

    constructor( private fb: FormBuilder,) { }
    
  ngOnInit() {
    this.supplierForm = this.fb.group({
      supplier_classification: [null],
      company_name: ['', Validators.required],
      company_native: [''],
      trade_license: [''],
      tax_registration: [''],

      salutation: [null],
      first_name: [''],
      middle_name: [''],
      last_name: [''],
      designation: [''],
      role: [null],

      email: [''],
      country_code: ['+91'],
      mobile_number: [''],

      username: [''],
      password: [''],
      confirm_password: ['']
    });
  }

  openModal(): void {
    if (!this.modalInstance) {
      this.modalInstance = new Modal(this.modalElement.nativeElement, {
        backdrop: 'static',
        keyboard: false
      });
    }

    this.modalInstance.show();
  }

  closeModal(): void {
    this.modalInstance.hide();
  }

  submitForm(): void {
    console.log('submitted');
    this.closeModal();
  }
  // component.ts
  companyOptions = [
    { label: 'Apple', value: 'APPLE' },
    { label: 'Samsung', value: 'SAMSUNG' },
    { label: 'Sony', value: 'SONY' }
  ];
  supplierClassifications = [
    { label: 'Manufacturer', value: 'MANUFACTURER' },
    { label: 'Distributor', value: 'DISTRIBUTOR' },
    { label: 'Retailer', value: 'RETAILER' },
    { label: 'Service Provider', value: 'SERVICE_PROVIDER' }
  ];

  salutations = [
    { label: 'Mr.', value: 'MR' },
    { label: 'Mrs.', value: 'MRS' },
    { label: 'Ms.', value: 'MS' },
    { label: 'Dr.', value: 'DR' }
  ];

  roles = [
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Editor', value: 'EDITOR' },
    { label: 'Viewer', value: 'VIEWER' },
    { label: 'Approver', value: 'APPROVER' }
  ];

  countryCodes = [
    { label: '+91 (IN)', value: '+91' },
    { label: '+1 (US)', value: '+1' },
    { label: '+44 (UK)', value: '+44' }
  ];
 
}
