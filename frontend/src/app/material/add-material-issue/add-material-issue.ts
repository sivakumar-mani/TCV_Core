import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { LookupServices } from '../../services/lookup-services';
import { MaterialServices } from '../../services/material-services';
import { CommonMethods } from '../../shared/common-methods';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-add-material-issue',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatToolbarModule, ReactiveFormsModule, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './add-material-issue.html',
  styleUrl: './add-material-issue.scss',
})
export class AddMaterialIssue {
  issueForm!: FormGroup;
  workOrders: any[] = [];
  employees: any[] = [];
  products: any[] = [];

  constructor(
    private fb: FormBuilder,
    private lookupService: LookupServices,
    private materialService: MaterialServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.initiateForm();
    this.loadLookups();
  }

  initiateForm() {
    this.issueForm = this.fb.group({
      issue_date: ['', Validators.required],
      work_order_id: ['', Validators.required],
      received_by_employee_id: [''],
      product_id: ['', Validators.required],
      requested_qty: [0],
      issued_qty: [1, [Validators.required, Validators.min(0.01)]],
      unit: ['PCS'],
      remarks: ['']
    });
  }

  loadLookups() {
    this.lookupService.getWorkOrders().subscribe({
      next: (response: any) => this.workOrders = response?.data ?? response ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
    this.lookupService.getEmployees().subscribe({
      next: (response: any) => this.employees = response?.data ?? response ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
    this.lookupService.getProducts().subscribe({
      next: (response: any) => this.products = response?.data ?? response ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  save() {
    if (this.issueForm.invalid) {
      this.issueForm.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    const data = this.issueForm.getRawValue();

    this.materialService.addIssue({
      issue_date: data.issue_date,
      work_order_id: data.work_order_id,
      received_by_employee_id: data.received_by_employee_id || null,
      remarks: data.remarks,
      items: [{
        product_id: data.product_id,
        requested_qty: data.requested_qty || 0,
        issued_qty: data.issued_qty,
        unit: data.unit || 'PCS',
        remarks: data.remarks
      }]
    }).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/material-issues');
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  cancel() {
    this.router.navigateByUrl('/material-issues');
  }
}
