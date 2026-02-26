import { DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogActions, MatDialogModule } from '@angular/material/dialog';
import { InputFormField } from '../../reusable/input-form-field/input-form-field';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-change-password',
  imports: [ MatDialogActions, MatDialogModule, InputFormField, ReactiveFormsModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export class ChangePassword {
  changePasswordForm:any = FormGroup;

  constructor(private dialog: DialogRef<ChangePassword>,
    private fb : FormBuilder
  ){}

  ngOnInit(){
    this.changePasswordForm = this.fb.group({
      oldPassword:  ['',[Validators.required]],
      newPassword: ['', [Validators.required, Validators.pattern(globalConstants.passwordRegex)],],
       confirmPassword: ['', [Validators.required, Validators.pattern(globalConstants.passwordRegex)],]
    })
  }
}
