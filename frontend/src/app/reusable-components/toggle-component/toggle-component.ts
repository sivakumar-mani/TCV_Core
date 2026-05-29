import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  forwardRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  AbstractControl,
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toggle-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './toggle-component.html',
  styleUrls: ['./toggle-component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleComponent),
      multi: true
    }
  ]
})
export class ToggleComponent implements ControlValueAccessor, OnInit, OnDestroy {

  /** Text shown beside the toggle */
  @Input() label: string = '';

  /** Smaller description text below the label */
  @Input() subLabel: string = '';

  /** Bind directly to a reactive FormControl */
  @Input() control: AbstractControl | FormControl | null = null;

  /** Label position relative to the toggle knob */
  @Input() labelPosition: 'left' | 'right' = 'right';

  /** Size variant */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  /** Colour when ON */
  @Input() activeColor: 'primary' | 'success' | 'warning' | 'danger' = 'primary';

  /** Show ON / OFF text inside the track */
  @Input() showStateText: boolean = false;

  /** Disabled state */
  @Input() disabled: boolean = false;

  /** Makes the component read-only (visually on, not interactive) */
  @Input() readonly: boolean = false;

  // ── Internal state ──────────────────────────────────────────────────────────
  checked: boolean = false;

  // ── CVA callbacks ───────────────────────────────────────────────────────────
  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};
  private controlSub?: Subscription;

  // Unique ID for aria linkage
  readonly uid = `toggle-${Math.random().toString(36).slice(2, 8)}`;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.control) {
      // Sync initial value
      this.checked = !!this.control.value;

      // Keep in sync if the control value changes externally
      this.controlSub = this.control.valueChanges.subscribe(val => {
        this.checked = !!val;
        this.cdr.markForCheck();
      });

      // Reflect disabled state from control
      if ((this.control as FormControl).disabled) {
        this.disabled = true;
      }
    }
  }

  ngOnDestroy(): void {
    this.controlSub?.unsubscribe();
  }

  // ── User interaction ────────────────────────────────────────────────────────
  toggle(): void {
    if (this.disabled || this.readonly) return;

    this.checked = !this.checked;

    // Notify CVA
    this.onChange(this.checked);
    this.onTouched();

    // Patch FormControl directly when used via [control] input binding
    if (this.control) {
      (this.control as FormControl).setValue(this.checked, { emitEvent: true });
      (this.control as FormControl).markAsDirty();
      (this.control as FormControl).markAsTouched();
    }

    this.cdr.markForCheck();
  }

  /** Keyboard accessibility: toggle on Space / Enter */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggle();
    }
  }

  // ── ControlValueAccessor ────────────────────────────────────────────────────
  writeValue(value: boolean): void {
    this.checked = !!value;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  // ── Computed helpers ────────────────────────────────────────────────────────
  get trackClasses(): Record<string, boolean> {
    return {
      'toggle-track': true,
      'is-checked': this.checked,
      'is-disabled': this.disabled,
      'is-readonly': this.readonly,
      [`size-${this.size}`]: true,
      [`color-${this.activeColor}`]: true
    };
  }

  get wrapperClasses(): Record<string, boolean> {
    return {
      'toggle-wrapper': true,
      [`label-${this.labelPosition}`]: true,
      'is-disabled': this.disabled,
      'is-readonly': this.readonly
    };
  }

  get stateText(): string {
    return this.checked ? 'ON' : 'OFF';
  }

  get isInvalid(): boolean {
    if (!this.control) return false;
    return this.control.invalid && (this.control.dirty || this.control.touched);
  }
}