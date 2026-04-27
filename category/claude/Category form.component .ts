// src/app/components/category-form/category-form.component.ts
import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CategoryService } from '../../services/category.service';
import { Category, CategoryNode } from '../../models/category.model';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-form.component.html',
  styleUrls: ['./category-form.component.scss']
})
export class CategoryFormComponent implements OnInit, OnChanges {
  @Input() editData: Category | null = null;        // null = create mode
  @Input() parentPreset: Category | null = null;    // when "add child" clicked
  @Output() saved    = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  parentOptions: { label: string; value: number | null; level: number }[] = [];
  saving = false;
  error  = '';

  readonly MAX_LEVELS = 4;

  constructor(private fb: FormBuilder, private svc: CategoryService) {}

  ngOnInit() {
    this.buildForm();
    this.loadParentOptions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['editData'] || changes['parentPreset']) && this.form) {
      this.buildForm();
    }
  }

  get isEdit() { return !!this.editData; }
  get title()  { return this.isEdit ? 'Edit Category' : 'New Category'; }

  buildForm() {
    const d = this.editData;
    this.form = this.fb.group({
      category_name: [d?.category_name ?? '',     [Validators.required, Validators.maxLength(150)]],
      parent_id:     [d?.parent_id ?? this.parentPreset?.category_id ?? null],
      slug:          [d?.slug ?? ''],
      status:        [d?.status ?? 1,             Validators.required],
      sort_order:    [d?.sort_order ?? 0,         [Validators.required, Validators.min(0)]]
    });

    // Auto-generate slug from name (create mode only)
    if (!this.isEdit) {
      this.form.get('category_name')!.valueChanges.subscribe(v => {
        if (!this.form.get('slug')!.dirty) {
          this.form.get('slug')!.setValue(this.toSlug(v), { emitEvent: false });
        }
      });
    }
  }

  loadParentOptions() {
    this.svc.getTree(true).subscribe({
      next: tree => {
        this.parentOptions = [
          { label: '— No Parent (Root Category) —', value: null, level: 0 },
          ...this.svc.buildSelectOptions(tree)
            .filter(o => o.level < this.MAX_LEVELS)
            .filter(o => !this.editData || o.value !== this.editData.category_id)
        ];
      }
    });
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error  = '';

    const payload = this.form.value;

    const obs = this.isEdit
      ? this.svc.update(this.editData!.category_id, payload)
      : this.svc.create(payload);

    obs.subscribe({
      next:  () => { this.saving = false; this.saved.emit(); },
      error: err => { this.error = err.message; this.saving = false; }
    });
  }

  cancel() { this.cancelled.emit(); }

  private toSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  }

  // Template helpers
  field(name: string) { return this.form.get(name)!; }
  invalid(name: string) { return this.field(name).invalid && this.field(name).touched; }
}