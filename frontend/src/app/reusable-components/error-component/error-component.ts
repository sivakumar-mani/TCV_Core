import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-error',
  templateUrl: './error-component.html',
  imports:[NgIf]
})
export class ErrorComponent {

  @Input() control!: AbstractControl | null;
  @Input() label = 'Field';

}