import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { AuditLogServices } from '../../services/audit-log-services';
import { CommonMethods } from '../../shared/common-methods';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-audit-log-form',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './audit-log-form.html',
  styleUrl: './audit-log-form.scss',
})
export class AuditLogForm {
  auditLogForm!: FormGroup;
  isEditMode = false;
  auditId!: number;
  actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW'];

  constructor(
    private fb: FormBuilder,
    private auditLogService: AuditLogServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.buildForm();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.auditId = Number(id);
      this.loadAuditLog(this.auditId);
    }
  }

  buildForm() {
    this.auditLogForm = this.fb.group({
      user_id: [''],
      module: ['', Validators.required],
      action: ['', Validators.required],
      table_name: ['', Validators.required],
      record_id: [''],
      old_values: [''],
      new_values: [''],
      ip_address: [''],
      browser_info: [''],
      change_reason: ['']
    });
  }

  loadAuditLog(auditId: number) {
    this.ngxLoader.start();
    this.auditLogService.getAuditLogById(auditId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const data = response?.data ?? response;
        this.auditLogForm.patchValue({
          ...data,
          old_values: this.formatJson(data.old_values),
          new_values: this.formatJson(data.new_values)
        });
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  formatJson(value: any) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
  }

  submit() {
    if (this.auditLogForm.invalid) return;

    this.ngxLoader.start();
    const payload = this.isEditMode
      ? { audit_id: this.auditId, ...this.auditLogForm.getRawValue() }
      : this.auditLogForm.getRawValue();
    const request = this.isEditMode
      ? this.auditLogService.updateAuditLog(payload)
      : this.auditLogService.addAuditLog(payload);

    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/audit-logs');
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  cancel() {
    this.router.navigateByUrl('/audit-logs');
  }

  actionOptions() {
    return [
      { label: 'Select Action', value: '' },
      ...this.actions.map((action) => ({ label: action, value: action }))
    ];
  }
}
