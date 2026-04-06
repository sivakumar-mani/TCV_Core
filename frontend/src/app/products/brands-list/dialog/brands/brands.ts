import { Component, Inject } from '@angular/core';
import { MatDialog, MatDialogActions, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputFormField } from '../../../../shared/input-form-field/input-form-field';
import { TextareaFormField } from '../../../../shared/textarea-form-field/textarea-form-field';
import { CommonModule, NgIf } from '@angular/common';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { BrandServices } from '../../../../services/brand-services';
import { Snackbar } from '../../../../services/snackbar';
import { Router } from '@angular/router';
import { globalConstants } from '../../../../services/global-constants';
import { SelectFormField } from '../../../../shared/select-form-field/select-form-field';
@Component({
  selector: 'app-brands',
  imports: [ MatDialogModule, MatDialogActions, SelectFormField, CommonModule,
    InputFormField,TextareaFormField, MatFormFieldModule, ReactiveFormsModule],
  templateUrl: './brands.html',
  styleUrl: './brands.scss',
})
export class Brands {

 brandForm: any = FormGroup;
 responseMessage:any
  isEditMode!: boolean;

 constructor( private fb: FormBuilder,
  private ngxUiLoader : NgxUiLoaderService,
  private brandService : BrandServices,
  private snackbarService: Snackbar,
  private dialog: MatDialogRef<Brands>,
  private router: Router,
  @Inject(MAT_DIALOG_DATA) public dialogData:any
 ){}

 ngOnInit(){
  this.brandFormInitiate();
 }

 brandFormInitiate(){
  this.brandForm = this.fb.group({
    brand_name:['',[Validators.required]],
    brand_code:[''],
     description:['',[Validators.required]],
     status:[''],
  });
  if (this.dialogData) {
        this.isEditMode = true;
        this.brandForm.patchValue(this.dialogData);

    this.brandForm.get('brand_code')?.setValidators([Validators.required]);
    this.brandForm.get('status')?.setValidators([Validators.required]);

    this.brandForm.get('brand_code')?.updateValueAndValidity();
    this.brandForm.get('status')?.updateValueAndValidity();
  } else {
    this.isEditMode = false;
  }
 }

   statusList = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' }
];
    
 addSubmit(){  
  this.ngxUiLoader.start();
  var formData = this.brandForm.value,
  data ={
    brand_name : formData.brand_name, 
    description : formData.description,
  }
 
  this.brandService.addBrands(data).subscribe({
    next: (response:any)=>{
      this.ngxUiLoader.stop();
     this.handleTokenAndMessage(response);
      if(response){
        this.dialog.close('success');
      }
      this.router.navigateByUrl('/brands');
    },
    error: (error:any)=>{
      this.ngxUiLoader.stop();
     this.handleError(error);
    },
   
  })
 }

 editSubmit(){
  this.ngxUiLoader.start();
  const formData = this.brandForm.value,
  data ={
    brand_id : this.dialogData.brand_id,
    brand_name : formData.brand_name,
    brand_code : formData.brand_code,
    description: formData.description,
    status: formData.status
  }
  this.brandService.updateBrand(data).subscribe({
    next: (response:any)=>{
      this.ngxUiLoader.stop();
      this.handleTokenAndMessage(response);
      if(response){
        this.dialog.close('success');
      }
      this.router.navigateByUrl('/brands');
    },
    error: (error)=>{
      this.ngxUiLoader.stop();
      this.handleError(error);
    }
  })
 }


 // ─── HELPERS ───────────────────────────────────────────────────────────────
  private handleTokenAndMessage(response: any) {
    if (response?.token) {
      localStorage.setItem('token', response.token);
    }
    this.responseMessage = response?.message;
    this.snackbarService.openSnackbar(this.responseMessage, '');
  }

  private handleError(error: any) {
    this.responseMessage = error?.error?.message || globalConstants.genericError;
    this.snackbarService.openSnackbar(this.responseMessage, globalConstants.errorRegex);
  }
}
