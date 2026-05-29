import { NgFor } from '@angular/common';
import {
  Component,
  Input,
  forwardRef
} from '@angular/core';

import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import { ErrorComponent } from '../error-component/error-component';

@Component({
  selector: 'app-radio-component',
  templateUrl: './radio-component.html',
  styleUrls: ['./radio-component.scss'],
  imports:[ErrorComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioComponent),
      multi: true
    }
  ]
})
export class RadioComponent implements ControlValueAccessor {

  @Input() options: any[] = [];
  @Input() label: string ='';
   @Input() value: any;
   @Input() groupName:string='';
modelValue: any;
onChange(val: any) {
  this.modelValue = val;
  this.onTouched();
  this.onChange(val);
}
  onTouched() {
    throw new Error('Method not implemented.');
  }

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(): void {}

  change(value: any) {
    this.value = value;
    this.onChange(value);
  }
}