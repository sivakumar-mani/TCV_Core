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
  selector: 'app-checkbox-component',
  templateUrl: './checkbox-component.html',
  styleUrls: ['./checkbox-component.scss'],
  imports:[ErrorComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxComponent),
      multi: true
    }
  ]
})
export class CheckboxComponent implements ControlValueAccessor {

  @Input() label:string = '';

  value = false;

  onChange: any = () => {};

  writeValue(value: boolean): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(): void {}

  change(event: any) {
    this.value = event.target.checked;
    this.onChange(this.value);
  }
}