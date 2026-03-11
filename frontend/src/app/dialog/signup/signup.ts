import { Component } from '@angular/core';
import { MatDialogActions, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { InputFormField } from '../../reusable/input-form-field/input-form-field';
import { SelectFormField } from '../../reusable/select-form-field/select-form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { globalConstants } from '../../services/global-constants';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  imports: [MatFormFieldModule,SelectFormField, CommonModule,  MatDialogModule, MatDialogActions, InputFormField, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  signupForm: any = FormGroup;

  constructor(private dialog: MatDialogRef<Signup>,
    private fb: FormBuilder
  ) { }
roleList = [
  { value: 1, label: 'Admin' },
  { value: 2, label: 'User' }
];
  ngOnInit() {
    this.signupForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      userName: ['', Validators.required],
      password: ['', [Validators.required, Validators.pattern(globalConstants.passwordRegex)]],
      email: ['', [Validators.required, Validators.pattern(globalConstants.emailRegex)]],
      contactNumber: ['', Validators.required],
       role: ['', Validators.required],
         status: ['', Validators.required],
    });
  }
}
