import { NgIf, TitleCasePipe } from '@angular/common';
import { Component, ElementRef, Input, Self, ViewChild } from '@angular/core';
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

  @ViewChild('fieldInput') fieldInput?: ElementRef<HTMLInputElement>;

  @Input() type : string='';
  @Input() label : string =''
  @Input() classLabel: string='';
  @Input()  inputClass: string='';
  @Input() formControl!: FormControl;
  @Input() readonly: boolean = false;
  @Input() maxLength?: number;
  @Input() inputMode: string = '';
  @Input() numericOnly: boolean = false;
  

  constructor( @Self() public ngControl: NgControl){
     this.ngControl.valueAccessor = this;
  }

  get control(): FormControl{
    return this.ngControl.control as FormControl;
  }

  onInput(event: Event) {
    if (!this.numericOnly) return;

    const input = event.target as HTMLInputElement;
    const nextValue = input.value.replace(/\D/g, '').slice(0, this.maxLength || undefined);
    input.value = nextValue;
    this.control.setValue(nextValue, { emitEvent: true });
  }

  openDatePicker(event: Event) {
    if (this.type !== 'date' || this.readonly || this.control.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const input = this.fieldInput?.nativeElement as (HTMLInputElement & { showPicker?: () => void }) | undefined;
    if (!input) return;
    input.focus();
    if (typeof input.showPicker !== 'function') return;
    try {
      input.showPicker();
    } catch {
      // The native date field remains editable in browsers without showPicker support.
    }
  }

  writeValue(obj: any): void {}
  registerOnChange(fn: any): void {}
  registerOnTouched(fn: any): void {}
  setDisabledState?(isDisabled: boolean): void {}
}
