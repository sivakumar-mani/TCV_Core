import { NgIf, TitleCasePipe } from '@angular/common';
import { Component, input, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule,  } from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
@Component({
  selector: 'app-textarea-form-field',
  imports: [ TitleCasePipe, MatFormFieldModule,MatInputModule, ReactiveFormsModule, MatFormFieldModule, NgIf],
  templateUrl: './textarea-form-field.html',
  styleUrl: './textarea-form-field.scss',
})
export class TextareaFormField {
   @Input() label: string = '';
@Input() placeholder: string = 'Enter Text ...';
@Input() classLabel: string = '';
@Input() rows: number = 3;
@Input() maxLength?: number;
@Input() control!: FormControl;
@Input() required: boolean = false;
@Input() disabled: boolean = false;
}
