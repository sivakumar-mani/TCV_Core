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
  selector: 'app-add-material-return',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatToolbarModule, ReactiveFormsModule, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './add-material-return.html',
  styleUrl: './add-material-return.scss',
})
export class AddMaterialReturn {
  returnForm!: FormGroup;
  workOrders: any[] = [];
  materialIssues: any[] = [];
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
    this.returnForm = this.fb.group({
      return_date: ['', Validators.required],
      work_order_id: ['', Validators.required],
      material_issue_id: [''],
      returned_by_employee_id: [''],
      product_id: ['', Validators.required],
      returned_qty: [1, [Validators.required, Validators.min(0)]],
      damaged_qty: [0],
      consumed_qty: [0],
      unit: ['PCS'],
      remarks: ['']
    });
  }

  loadLookups() {
    this.lookupService.getWorkOrders().subscribe({
      next: (response: any) => this.workOrders = response?.data ?? response ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
    this.lookupService.getMaterialIssues().subscribe({
      next: (response: any) => this.materialIssues = response?.data ?? response ?? [],
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
    if (this.returnForm.invalid) {
      this.returnForm.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    const data = this.returnForm.getRawValue();

    this.materialService.addReturn({
      return_date: data.return_date,
      work_order_id: data.work_order_id,
      material_issue_id: data.material_issue_id || null,
      returned_by_employee_id: data.returned_by_employee_id || null,
      remarks: data.remarks,
      items: [{
        product_id: data.product_id,
        returned_qty: data.returned_qty || 0,
        damaged_qty: data.damaged_qty || 0,
        consumed_qty: data.consumed_qty || 0,
        unit: data.unit || 'PCS',
        remarks: data.remarks
      }]
    }).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/material-returns');
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  cancel() {
    this.router.navigateByUrl('/material-returns');
  }
}
