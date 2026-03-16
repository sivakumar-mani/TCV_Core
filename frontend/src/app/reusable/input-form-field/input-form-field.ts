import { NgIf, TitleCasePipe } from '@angular/common';
import { Component, Input, Self } from '@angular/core';
import { ControlValueAccessor, FormControl, NgControl, ReactiveFormsModule } from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';

@Component({
  selector: 'app-input-form-field',
  imports: [ TitleCasePipe, NgIf, MatIconModule,MatInputModule, ReactiveFormsModule, MatFormFieldModule],
  templateUrl: './input-form-field.html',
  styleUrl: './input-form-field.scss',
})
export class InputFormField implements ControlValueAccessor{

  @Input() type : string='';
  @Input() label : string =''
  @Input() classLabel: string='';
  @Input()  inputClass: string='';
  @Input() formControl!: FormControl;

  constructor( @Self() public ngControl: NgControl){
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
