import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  forwardRef
} from '@angular/core';

import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule
} from '@angular/forms';
import { ErrorComponent } from '../error-component/error-component';


@Component({
  selector: 'app-select-component',
  templateUrl: './select-component.html',
  styleUrls: ['./select-component.scss'],
  imports: [
  CommonModule,
  ReactiveFormsModule,
  ErrorComponent
],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ]
})
export class SelectComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() options: any[] = [];
  @Input() control!: AbstractControl | any;
  @Input() required: boolean = false;
  value: any;

  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  change(event: any): void {
    this.value = event.target.value;
    this.onChange(this.value);
  }
}