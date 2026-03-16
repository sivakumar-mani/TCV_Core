import { CommonModule, NgIf, TitleCasePipe } from '@angular/common';
import { Component, Input, Self } from '@angular/core';
import { ControlValueAccessor, NgControl, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import { MatSelectModule} from '@angular/material/select';
import { MatOption } from '@angular/material/core';
@Component({
  selector: 'app-select-form-field',
   imports: [ TitleCasePipe, NgIf, MatIconModule,CommonModule, MatOption, MatInputModule,MatSelectModule, ReactiveFormsModule, MatFormFieldModule],
  templateUrl: './select-form-field.html',
  styleUrl: './select-form-field.scss',
})
export class SelectFormField implements ControlValueAccessor{
  @Input() label : string='';
  // @Input() options : { value : string | number; label: string}[]=[];
  @Input() options: any[] = [];
  @Input() labelClass: string ='';
  @Input() selectClass: string='';

  constructor(@Self() public ngControl : NgControl){
    this.ngControl.valueAccessor = this;
  }
 get control(): FormControl{
    return this.ngControl.control as FormControl;
  }
  writeValue(obj: any): void {}
  registerOnChange(fn: any): void {}
  registerOnTouched(fn: any): void {}
  setDisabledState?(isDisabled: boolean): void {}

}
