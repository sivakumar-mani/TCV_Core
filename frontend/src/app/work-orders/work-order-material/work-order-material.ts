import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { EmployeeServices } from '../../services/employee-services';
import { WorkOrderServices } from '../../services/work-order-services';
import { CommonMethods } from '../../shared/common-methods';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../shared/select-form-field/select-form-field';
import { downloadSimplePdf } from '../../shared/simple-pdf';

@Component({
  selector: 'app-work-order-material',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatDialogModule, InputFormField, SelectFormField],
  templateUrl: './work-order-material.html',
  styleUrl: './work-order-material.scss',
})
export class WorkOrderMaterial {
  @ViewChild('materialWorkItemsDialog') materialWorkItemsDialog!: TemplateRef<unknown>;
  workOrderId!: number;
  workOrder: any;
  materials: any[] = [];
  employees: any[] = [];
  employeeOptions: any[] = [];
  returnIssueOptions: any[] = [];
  materialWorkItems: any[] = [];
  materialWorkItemsDialogRef?: MatDialogRef<unknown>;
  isPreviewMode = false;
  isWorkflowPreview = false;
  issueTableForm!: FormGroup;
  returnForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private workOrderService: WorkOrderServices,
    private employeeService: EmployeeServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.workOrderId = Number(this.route.snapshot.paramMap.get('id'));
    this.isPreviewMode = this.route.snapshot.queryParamMap.get('preview') === 'true';
    this.isWorkflowPreview = this.route.snapshot.queryParamMap.get('workflow') === 'true';
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

  conditionOptions = [
    { value: 'GOOD', label: 'GOOD' },
    { value: 'DAMAGED', label: 'DAMAGED' },
    { value: 'SCRAP', label: 'SCRAP' }
  ];

  loadLookups() {
    this.workOrderService.getMaterials().subscribe({
      next: (response: any) => {
        this.materials = Array.isArray(response) ? response : response.data ?? [];
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });

    this.employeeService.getEmployees().subscribe({
      next: (response: any) => {
        this.employees = Array.isArray(response) ? response : response.data ?? [];
        this.employeeOptions = this.employees.map((employee) => ({
          value: employee.employee_id,
          label: employee.employee_name
        }));
      },
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
        this.returnIssueOptions = (this.workOrder?.material_issues || []).map((issue: any) => ({
          value: issue.issue_id,
          label: `${issue.issue_no} - ${issue.material_name}`
        }));
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  createIssueRow(source: any = {}, existing = false) {
    return this.fb.group({
      selected: [source.selected ?? true],
      issue_id: [source.issue_id || ''],
      issue_no: [source.issue_no || ''],
      approval_status: [source.approval_status || (existing ? 'PENDING' : 'DRAFT')],
      material_id: [source.material_id || '', Validators.required],
      material_code: [source.material_code || ''],
      material_name: [source.material_name || ''],
      product_id: [source.product_id || ''],
      issued_qty: [source.issued_qty || '', existing ? [] : [Validators.min(0.01)]],
      issued_date: [this.toInputDate(source.issued_date) || this.today(), Validators.required],
      issued_to_employee_id: [source.issued_to_employee_id || ''],
      issued_to_employee_name: [source.issued_to_employee_name || ''],
      issued_by_employee_id: [source.issued_by_employee_id || ''],
      remarks: [source.remarks || '']
    });
  }

  rebuildIssueRows() {
    if (!this.workOrder) return;

    this.issueRows.clear();
    const issues = this.isWorkflowPreview
      ? (this.workOrder.material_issues || []).filter((issue: any) => issue.approval_status === 'PENDING')
      : (this.workOrder.material_issues || []);
    issues.forEach((issue: any) => {
      this.issueRows.push(this.createIssueRow(issue, true));
    });
  }

  addMaterialRow() {
    this.issueRows.push(this.createIssueRow({ issued_date: this.today() }));
  }

  openMaterialWorkItemsDialog() {
    const existingProductIds = new Set(this.issueRows.controls.map((row) => Number(row.get('product_id')?.value)));
    this.materialWorkItems = (this.workOrder?.items || []).map((item: any) => {
      const material = this.materials.find((entry) => Number(entry.product_id) === Number(item.product_id));
      if (!material) return null;
      const availableQty = Number(material.available_qty || 0);
      const alreadyAdded = existingProductIds.has(Number(item.product_id));
      return {
        ...item,
        material_id: material.material_id,
        material_code: material.material_code,
        material_name: material.material_name,
        available_qty: availableQty,
        already_added: alreadyAdded,
        selected: false
      };
    }).filter(Boolean);
    this.materialWorkItemsDialogRef = this.dialog.open(this.materialWorkItemsDialog, {
      width: 'min(1100px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '86vh',
      panelClass: 'material-work-items-dialog-panel'
    });
  }

  addSelectedWorkItems() {
    const selectedItems = this.materialWorkItems.filter((item) => item.selected && !item.already_added && item.available_qty > 0);
    if (!selectedItems.length) {
      alert('Select at least one available material item.');
      return;
    }
    selectedItems.forEach((item) => {
      this.issueRows.push(this.createIssueRow({
        material_id: item.material_id,
        material_code: item.material_code,
        material_name: item.material_name,
        product_id: item.product_id,
        issued_qty: Number(item.qty),
        issued_to_employee_id: this.workOrder.assigned_to_employee_id,
        available_qty: item.available_qty
      }));
    });
    this.closeMaterialWorkItemsDialog();
  }

  closeMaterialWorkItemsDialog() {
    this.materialWorkItemsDialogRef?.close();
    this.materialWorkItemsDialogRef = undefined;
    this.materialWorkItems = [];
  }

  materialStock(materialId: any) {
    return Number(this.materials.find((item) => Number(item.material_id) === Number(materialId))?.available_qty || 0);
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
    const available = this.materialStock(row.get('material_id')?.value);
    if (available <= 0 || Number(row.get('issued_qty')?.value) > available) {
      alert(available <= 0 ? 'Stock is 0. This material cannot be selected.' : `Only ${available} is available.`);
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

  saveMaterialList() {
    const newRows = this.issueRows.controls
      .map((control) => control as FormGroup)
      .filter((row) => !row.get('issue_id')?.value);
    if (!newRows.length) {
      alert('Add at least one material before saving.');
      return;
    }
    for (const row of newRows) {
      const available = this.materialStock(row.get('material_id')?.value);
      if (row.invalid || available <= 0 || Number(row.get('issued_qty')?.value) > available) {
        row.markAllAsTouched();
        alert(available <= 0 ? 'A selected material has stock 0.' : 'Check selected material quantities.');
        return;
      }
    }
    this.ngxLoader.start();
    this.workOrderService.submitMaterialIssueList(
      this.workOrderId,
      newRows.map((row) => row.getRawValue())
    ).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadWorkOrder();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
        this.loadWorkOrder();
      }
    });
  }

  removeMaterialRow(index: number) {
    const row = this.issueRows.at(index);
    if (row.get('issue_id')?.value) return;
    this.issueRows.removeAt(index);
  }

  get hasPendingMaterialList() {
    return (this.workOrder?.material_issues || []).some((issue: any) => issue.approval_status === 'PENDING');
  }

  reviewMaterialList(action: 'ACCEPTED' | 'REJECTED') {
    if (!this.hasPendingMaterialList) return;
    if (!confirm(`${action === 'ACCEPTED' ? 'Accept' : 'Reject'} this material issue list?`)) return;
    this.ngxLoader.start();
    this.workOrderService.reviewMaterialIssueList(this.workOrderId, action).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/workflow-approval');
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

  downloadPdf() {
    if (!this.workOrder) return;
    const issues = this.issueRows.controls.map((row) => row.getRawValue());
    downloadSimplePdf({
      filename: `material-issue-${this.workOrder.work_order_no}.pdf`,
      title: 'Material Issue',
      details: [
        ['Work Order No', this.workOrder.work_order_no],
        ['Customer', this.workOrder.customer_name],
        ['Work Status', this.workOrder.work_status],
        ['Assigned To', this.workOrder.assigned_employee_name],
        ['Site', this.workOrder.site_address],
        ['Issue Status', issues[0]?.approval_status || '-']
      ],
      columns: ['S.No', 'Issue No', 'Material', 'Qty', 'Issue To', 'Status'],
      rows: issues.map((issue: any, index: number) => [
        index + 1, issue.issue_no, issue.material_name, issue.issued_qty,
        issue.issued_to_employee_name || this.workOrder.assigned_employee_name,
        issue.approval_status
      ])
    });
  }

  displayDate(value: string | Date) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
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

  trackByControl(index: number) {
    return index;
  }

  trackById(_index: number, item: any) {
    return item?.return_id || item?.issue_id || item?.material_id || item?.employee_id || _index;
  }
}
