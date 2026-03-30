import { Component } from '@angular/core';
import { MatDialog, MatDialogActions, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputFormField } from '../../../../shared/input-form-field/input-form-field';
import { TextareaFormField } from '../../../../shared/textarea-form-field/textarea-form-field';
import { NgIf } from '@angular/common';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { BrandServices } from '../../../../services/brand-services';
import { Snackbar } from '../../../../services/snackbar';
import { Router } from '@angular/router';
import { globalConstants } from '../../../../services/global-constants';
@Component({
  selector: 'app-brands',
  imports: [ MatDialogModule, MatDialogActions, 
    InputFormField,TextareaFormField, MatFormFieldModule, ReactiveFormsModule],
  templateUrl: './brands.html',
  styleUrl: './brands.scss',
})
export class Brands {
 brandForm: any = FormGroup;
 responeMessage:any
 constructor( private fb: FormBuilder,
  private ngxUiLoader : NgxUiLoaderService,
  private brandService : BrandServices,
  private snackbarService: Snackbar,
  private dialog: MatDialogRef<Brands>,
  private router: Router
 ){}

 ngOnInit(){
  this.brandFormInitiate();
 }

 brandFormInitiate(){
  this.brandForm = this.fb.group({
    brandName:['',[Validators.required]],
     description:['',[Validators.required]]
  })
 }

 onSubmit(){  
  this.ngxUiLoader.start();
  var formData = this.brandForm.value,
  data ={
    brand_name : formData.brandName,
    description : formData.description
  }
  this.brandService.addBrands(data).subscribe({
    next: (response:any)=>{
      this.ngxUiLoader.stop();
      if(response.token){
        localStorage.setItem('token', response.token)
      }
      this.responeMessage = response.message;
      this.snackbarService.openSnackbar(this.responeMessage, '');
      if(response){
        this.dialog.close('success');
      }
      this.router.navigateByUrl('/brands');
    },
    error: (error:any)=>{
      if(error.error?.message){
        this.responeMessage = error.error?.message;
      }else {
        this.responeMessage= globalConstants.genericError
      }
      this.snackbarService.openSnackbar(this.responeMessage, globalConstants.errorRegex)
    },
   
  })
 }

}
