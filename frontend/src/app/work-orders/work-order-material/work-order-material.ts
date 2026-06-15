import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { EmployeeServices } from '../../services/employee-services';
import { WorkOrderServices } from '../../services/work-order-services';
import { CommonMethods } from '../../shared/common-methods';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../shared/select-form-field/select-form-field';

@Component({
  selector: 'app-work-order-material',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputFormField, SelectFormField],
  templateUrl: './work-order-material.html',
  styleUrl: './work-order-material.scss',
})
export class WorkOrderMaterial {
  workOrderId!: number;
  workOrder: any;
  materials: any[] = [];
  employees: any[] = [];
  issueTableForm!: FormGroup;
  returnForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private workOrderService: WorkOrderServices,
    private employeeService: EmployeeServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.workOrderId = Number(this.route.snapshot.paramMap.get('id'));
    this.buildForms();
    this.loadLookups();
    this.loadWorkOrder();
  }

  buildForms() {
    this.issueTableForm = this.fb.group({
      rows: this.fb.array([])
    });

    this.returnForm = this.fb.group({
      issue_id: ['', Validators.required],
      material_id: [''],
      product_id: [''],
      returned_qty: ['', [Validators.required, Validators.min(0.01)]],
      return_date: [this.today(), Validators.required],
      returned_by_employee_id: [''],
      received_by_employee_id: [''],
      condition_status: ['GOOD', Validators.required],
      remarks: ['']
    });

    this.returnForm.get('issue_id')?.valueChanges.subscribe((issueId) => {
      this.patchReturnIssue(issueId);
    });
  }

  get issueRows() {
    return this.issueTableForm.get('rows') as FormArray;
  }

  get employeeOptions() {
    return this.employees.map((employee) => ({
      value: employee.employee_id,
      label: `${employee.employee_code} - ${employee.employee_name}`
    }));
  }

  get returnIssueOptions() {
    return (this.workOrder?.material_issues || []).map((issue: any) => ({
      value: issue.issue_id,
      label: `${issue.issue_no} - ${issue.material_name}`
    }));
  }

  conditionOptions = [
    { value: 'GOOD', label: 'GOOD' },
    { value: 'DAMAGED', label: 'DAMAGED' },
    { value: 'SCRAP', label: 'SCRAP' }
  ];

  loadLookups() {
    this.workOrderService.getMaterials().subscribe({
      next: (response: any) => {
        this.materials = Array.isArray(response) ? response : response.data ?? [];
        this.rebuildIssueRows();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });

    this.employeeService.getEmployees().subscribe({
      next: (response: any) => this.employees = Array.isArray(response) ? response : response.data ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadWorkOrder() {
    this.ngxLoader.start();
    this.workOrderService.getWorkOrderById(this.workOrderId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.workOrder = response?.data ?? response;
        this.rebuildIssueRows();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  createIssueRow(source: any = {}, existing = false) {
    return this.fb.group({
      issue_id: [source.issue_id || ''],
      issue_no: [source.issue_no || ''],
      material_id: [source.material_id || '', Validators.required],
      product_id: [source.product_id || ''],
      issued_qty: [source.issued_qty || '', existing ? [] : [Validators.min(0.01)]],
      issued_date: [this.toInputDate(source.issued_date) || this.today(), Validators.required],
      issued_to_employee_id: [source.issued_to_employee_id || ''],
      issued_by_employee_id: [source.issued_by_employee_id || ''],
      remarks: [source.remarks || '']
    });
  }

  rebuildIssueRows() {
    if (!this.workOrder || !this.materials.length) return;

    this.issueRows.clear();
    (this.workOrder.material_issues || []).forEach((issue: any) => {
      this.issueRows.push(this.createIssueRow(issue, true));
    });

    const issuedMaterialIds = new Set((this.workOrder.material_issues || []).map((issue: any) => Number(issue.material_id)));
    this.materials
      .filter((material) => !issuedMaterialIds.has(Number(material.material_id)))
      .forEach((material) => {
        this.issueRows.push(this.createIssueRow({
          material_id: material.material_id,
          product_id: material.product_id,
          issued_date: this.today()
        }));
      });
  }

  addMaterialRow() {
    this.issueRows.push(this.createIssueRow({ issued_date: this.today() }));
  }

  onIssueMaterialChange(index: number) {
    const row = this.issueRows.at(index) as FormGroup;
    const material = this.materials.find((item) => Number(item.material_id) === Number(row.get('material_id')?.value));
    row.patchValue({ product_id: material?.product_id || '' });
  }

  selectReturnIssue(issue: any) {
    this.returnForm.patchValue({
      issue_id: issue.issue_id,
      material_id: issue.material_id || '',
      product_id: issue.product_id || '',
      returned_qty: '',
      return_date: this.today(),
      returned_by_employee_id: issue.issued_to_employee_id || '',
      received_by_employee_id: '',
      condition_status: 'GOOD',
      remarks: ''
    });
  }

  patchReturnIssue(issueId: any) {
    if (!issueId || !this.workOrder?.material_issues?.length) return;
    const issue = this.workOrder.material_issues.find((item: any) => Number(item.issue_id) === Number(issueId));
    if (!issue) return;

    this.returnForm.patchValue({
      material_id: issue.material_id || '',
      product_id: issue.product_id || '',
      returned_by_employee_id: issue.issued_to_employee_id || ''
    }, { emitEvent: false });
  }

  saveMaterialIssue(index: number) {
    const row = this.issueRows.at(index) as FormGroup;
    if (row.invalid || row.get('issue_id')?.value || !Number(row.get('issued_qty')?.value)) {
      row.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    this.workOrderService.addMaterialIssue(this.workOrderId, row.getRawValue()).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadWorkOrder();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  saveMaterialReturn() {
    if (this.returnForm.invalid) {
      this.returnForm.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    this.workOrderService.addMaterialReturn(this.workOrderId, this.returnForm.getRawValue()).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.returnForm.reset({
          issue_id: '',
          material_id: '',
          product_id: '',
          returned_qty: '',
          return_date: this.today(),
          returned_by_employee_id: '',
          received_by_employee_id: '',
          condition_status: 'GOOD',
          remarks: ''
        });
        this.loadWorkOrder();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  back() {
    this.router.navigateByUrl('/work-orders');
  }

  displayDate(value: string | Date) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN');
  }

  today() {
    const date = new Date();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  toInputDate(value: string | Date) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
