import { Component , Input, forwardRef} from '@angular/core';
import {  ControlValueAccessor,  NG_VALUE_ACCESSOR,AbstractControl,  NgControl, ReactiveFormsModule} from '@angular/forms';
import { ErrorComponent } from '../error-component/error-component';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-input-component',
  imports: [ErrorComponent,  CommonModule,
  ReactiveFormsModule,],
  templateUrl: './input-component.html',
  styleUrl: './input-component.scss',
   providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ]
})
export class InputComponent implements ControlValueAccessor {
 @Input() label = '';
  @Input() type = 'text';
  @Input() placeholder = ' ';
  @Input() submitted = false;
  @Input() control!: AbstractControl | any;
  value: any = '';
  disabled = false;
  @Input() required: boolean = false;
  onChange: any = () => {};
  onTouched: any = () => {};
@Input() icon: string = '';

 showPassword: boolean = false;


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

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  get inputType(): string {

    if (this.type === 'password') {
      return this.showPassword ? 'text' : 'password';
    }

    return this.type;
  }
}
