import {
  Component,
  Input,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import { ErrorComponent } from '../error-component/error-component';

@Component({
  selector: 'app-textarea-component',
  templateUrl: './textarea-component.html',
  styleUrls: ['./textarea-component.scss'],
  imports:[CommonModule, ErrorComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true
    }
  ]
})
export class TextareaComponent implements ControlValueAccessor {

  @Input() label = '';
 @Input() required: boolean = false;
  value = '';

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

  change(event: any) {
    this.value = event.target.value;
    this.onChange(this.value);
  }
}
