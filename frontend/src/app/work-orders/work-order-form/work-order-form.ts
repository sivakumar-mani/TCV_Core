import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CustomerServices } from '../../services/customer-services';
import { EmployeeServices } from '../../services/employee-services';
import { ProductService } from '../../services/product-service';
import { QuotationServices } from '../../services/quotation-services';
import { WorkOrderServices } from '../../services/work-order-services';
import { CommonMethods } from '../../shared/common-methods';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../../shared/textarea-form-field/textarea-form-field';
import { downloadSimplePdf } from '../../shared/simple-pdf';

@Component({
  selector: 'app-work-order-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './work-order-form.html',
  styleUrl: './work-order-form.scss',
})
export class WorkOrderForm {
  workOrderForm!: FormGroup;
  customers: any[] = [];
  employees: any[] = [];
  products: any[] = [];
  quotations: any[] = [];
  materials: any[] = [];
  existingIssues: any[] = [];
  existingReturns: any[] = [];
  customerOptionList: { label: string; value: string | number }[] = [{ label: 'Select customer', value: '' }];
  employeeOptionList: { label: string; value: string | number }[] = [{ label: 'Select employee', value: '' }];
  supervisorOptionList: { label: string; value: string | number }[] = [{ label: 'Select supervisor', value: '' }];
  isEditMode = false;
  isPreviewMode = false;
  workOrderId!: number;
  currentWorkOrder: any;

  workTypes = ['INSTALLATION', 'SERVICE', 'REPAIR', 'MAINTENANCE', 'OTHER'];
  workStatuses = ['PENDING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
  priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  workTypeOptionList = this.optionList(this.workTypes);
  workStatusOptionList = this.optionList(this.workStatuses);
  priorityOptionList = this.optionList(this.priorities);

  constructor(
    private fb: FormBuilder,
    private workOrderService: WorkOrderServices,
    private quotationService: QuotationServices,
    private customerService: CustomerServices,
    private employeeService: EmployeeServices,
    private productService: ProductService,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadLookups();
    this.initializeForm();
  }

  get items() {
    return this.workOrderForm.get('items') as FormArray;
  }

  get materialIssues() {
    return this.workOrderForm.get('material_issues') as FormArray;
  }

  get materialReturnForm() {
    return this.workOrderForm.get('material_return') as FormGroup;
  }

  get customerQuotations() {
    const customerId = Number(this.workOrderForm?.get('customer_id')?.value);
    return customerId ? this.quotations.filter((item) => Number(item.customer_id) === customerId) : [];
  }

  buildForm() {
    this.workOrderForm = this.fb.group({
      work_order_no: [{ value: '', disabled: true }],
      quotation_id: [''],
      customer_id: ['', Validators.required],
      work_type: ['INSTALLATION', Validators.required],
      work_status: ['PENDING', Validators.required],
      priority: ['MEDIUM', Validators.required],
      start_date: [this.today()],
      completion_date: [''],
      site_address: ['', Validators.required],
      site_contact_person: [''],
      site_contact_phone: [''],
      assigned_to_employee_id: [''],
      supervisor_id: [''],
      created_by_employee_id: [''],
      work_notes: [''],
      completion_remarks: [''],
      items: this.fb.array([]),
      material_issues: this.fb.array([]),
      material_return: this.fb.group({
        issue_id: [''],
        material_id: [''],
        product_id: [''],
        returned_qty: [0, [Validators.min(0)]],
        return_date: [this.today()],
        returned_by_employee_id: [''],
        received_by_employee_id: [''],
        condition_status: ['GOOD'],
        remarks: ['']
      })
    });

    this.addItem();
  }

  initializeForm() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isPreviewMode = this.router.url.includes('/preview/');
      this.isEditMode = !this.isPreviewMode;
      this.workOrderId = Number(id);
      this.loadWorkOrder(this.workOrderId);
    } else {
      this.workOrderService.getNextWorkOrderNo().subscribe({
        next: (response: any) => this.workOrderForm.get('work_order_no')?.setValue(response?.work_order_no || ''),
        error: (error: any) => this.commonMethods.handleError(error)
      });
      const quotationId = this.route.snapshot.queryParamMap.get('quotationId');
      if (quotationId) {
        this.workOrderForm.get('quotation_id')?.setValue(Number(quotationId));
        this.onQuotationChange();
      }
    }
  }

  loadLookups() {
    this.customerService.getCustomers().subscribe({
      next: (response: any) => {
        this.customers = Array.isArray(response) ? response : response.data ?? [];
        this.customerOptionList = [
          { label: 'Select customer', value: '' },
          ...this.customers.map((customer) => ({
            label: customer.display_customer_name || ((customer.salutation ? customer.salutation + ' ' : '') + customer.customer_name),
            value: customer.customer_id
          }))
        ];
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => {
        this.employees = Array.isArray(response) ? response : response.data ?? [];
        const employeeOptions = this.employees.map((employee) => ({
          label: employee.employee_name,
          value: employee.employee_id
        }));
        this.employeeOptionList = [{ label: 'Select employee', value: '' }, ...employeeOptions];
        this.supervisorOptionList = [{ label: 'Select supervisor', value: '' }, ...employeeOptions];
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
    this.productService.getProduct().subscribe({
      next: (response: any) => {
        this.products = Array.isArray(response) ? response : response.data ?? [];
        this.syncMaterialIssueMaterials();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
    this.quotationService.getQuotations().subscribe({
      next: (response: any) => {
        const rows = Array.isArray(response) ? response : response.data ?? [];
        this.quotations = rows.filter((item: any) => item.quotation_status === 'ACCEPTED');
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
    this.workOrderService.getMaterials().subscribe({
      next: (response: any) => {
        this.materials = Array.isArray(response) ? response : response.data ?? [];
        this.syncMaterialIssueMaterials();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  optionList(values: string[]) {
    return values.map((value) => ({ label: value, value }));
  }

  loadWorkOrder(workOrderId: number) {
    this.ngxLoader.start();
    this.workOrderService.getWorkOrderById(workOrderId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const workOrder = response?.data ?? response;
        this.currentWorkOrder = workOrder;
        this.items.clear();
        (workOrder.items || []).forEach((item: any) => this.addItem(item));
        this.materialIssues.clear();
        (workOrder.material_issues || []).forEach((issue: any) => this.addMaterialIssue(issue));
        this.existingIssues = workOrder.material_issues || [];
        this.existingReturns = workOrder.material_returns || [];
        this.workOrderForm.patchValue({
          ...workOrder,
          start_date: this.toInputDate(workOrder.start_date),
          completion_date: this.toInputDate(workOrder.completion_date)
        });
        if (this.isPreviewMode) this.workOrderForm.disable();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  onQuotationChange() {
    const quotationId = Number(this.workOrderForm.get('quotation_id')?.value);
    if (!quotationId) {
      this.resetQuoteDerivedRows();
      return;
    }

    this.ngxLoader.start();
    this.quotationService.getQuotationById(quotationId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const quotation = response?.data ?? response;
        this.items.clear();
        (quotation.items || []).forEach((item: any) => this.addItem(item));
        this.materialIssues.clear();
        this.workOrderForm.patchValue({
          customer_id: quotation.customer_id,
          site_address: quotation.address || 'Customer site',
          site_contact_person: quotation.contact_person || '',
          site_contact_phone: quotation.phone || '',
          work_notes: quotation.requirement_details || ''
        });
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  onCustomerChange() {
    const quotationId = Number(this.workOrderForm.get('quotation_id')?.value);
    if (!quotationId) return;
    const quotation = this.quotations.find((item) => Number(item.quotation_id) === quotationId);
    if (quotation && Number(quotation.customer_id) !== Number(this.workOrderForm.get('customer_id')?.value)) {
      this.workOrderForm.get('quotation_id')?.setValue('');
      this.resetQuoteDerivedRows(false);
    }
  }

  addItem(item: any = {}) {
    this.items.push(this.fb.group({
      quotation_item_id: [item.quotation_item_id || ''],
      product_id: [item.product_id || ''],
      item_name: [item.item_name || item.product_name || '', Validators.required],
      description: [item.description || ''],
      qty: [Number(item.qty ?? 1), [Validators.required, Validators.min(0.01)]],
      selling_price: [Number(item.selling_price ?? item.price ?? 0), [Validators.required, Validators.min(0)]],
      discount_percent: [Number(item.discount_percent ?? 0), [Validators.min(0)]],
      discount_amount: [Number(item.discount_amount ?? 0), [Validators.min(0)]],
      tax_percent: [Number(item.tax_percent ?? 0), [Validators.min(0)]],
      tax_amount: [0, [Validators.min(0)]]
    }));
  }

  resetQuoteDerivedRows(resetCustomer = true) {
    this.items.clear();
    this.addItem();
    this.materialIssues.clear();
    this.workOrderForm.patchValue({
      ...(resetCustomer ? { customer_id: '' } : {}),
      site_address: '',
      site_contact_person: '',
      site_contact_phone: '',
      work_notes: ''
    });
  }

  removeItem(index: number) {
    if (this.items.length === 1) return;
    this.items.removeAt(index);
  }

  addMaterialIssue(issue: any = {}) {
    this.materialIssues.push(this.fb.group({
      issue_id: [issue.issue_id || ''],
      material_id: [issue.material_id || this.materialIdForProduct(issue.product_id) || ''],
      product_id: [issue.product_id || ''],
      issued_qty: [Number(issue.issued_qty ?? issue.qty ?? 1), [Validators.required, Validators.min(0.01)]],
      issued_date: [this.toInputDate(issue.issued_date) || this.today()],
      issued_to_employee_id: [issue.issued_to_employee_id || ''],
      issued_by_employee_id: [issue.issued_by_employee_id || ''],
      remarks: [issue.remarks || '']
    }));
  }

  materialIdForProduct(productId: any) {
    if (!productId) return '';
    const material = this.materials.find((item) => Number(item.product_id) === Number(productId));
    return material?.material_id || '';
  }

  syncMaterialIssueMaterials() {
    for (let index = this.materialIssues.length - 1; index >= 0; index--) {
      const row = this.materialIssues.at(index) as FormGroup;
      const productId = row.get('product_id')?.value;
      const materialId = this.materialIdForProduct(productId);
      if (productId && !materialId && !this.isMaterialProduct(productId)) {
        this.materialIssues.removeAt(index);
      }
    }

    this.materialIssues.controls.forEach((control) => {
      const row = control as FormGroup;
      if (row.get('material_id')?.value) return;
      const materialId = this.materialIdForProduct(row.get('product_id')?.value);
      if (materialId) row.get('material_id')?.setValue(materialId);
    });
  }

  isMaterialProduct(productId: any) {
    if (!productId) return false;
    const product = this.products.find((item) => Number(item.product_id) === Number(productId));
    if (product) return (product.product_type || 'MATERIAL') === 'MATERIAL';
    return Boolean(this.materialIdForProduct(productId));
  }

  productTypeLabel(product: any) {
    const labels: Record<string, string> = {
      MATERIAL: 'Material',
      SERVICE: 'Service',
      LABOR: 'Labor'
    };
    return labels[product?.product_type || 'MATERIAL'] || 'Material';
  }

  onMaterialChange(index: number) {
    const row = this.materialIssues.at(index) as FormGroup;
    const material = this.materials.find((item) => Number(item.material_id) === Number(row.get('material_id')?.value));
    row.patchValue({ product_id: material?.product_id || '' });
  }

  copyMaterialsFromWorkItems() {
    const copiedItems = new Map<number, any>();

    this.items.controls.forEach((control) => {
      const item = (control as FormGroup).getRawValue();
      const productId = Number(item.product_id);
      if (!productId || !this.isMaterialProduct(productId)) return;

      const materialId = this.materialIdForProduct(productId);
      if (!materialId) return;

      const existing = copiedItems.get(productId);
      copiedItems.set(productId, {
        material_id: materialId,
        product_id: productId,
        issued_qty: (existing?.issued_qty || 0) + this.toNumber(item.qty),
        remarks: 'From work items'
      });
    });

    this.materialIssues.clear();
    copiedItems.forEach((issue) => this.addMaterialIssue(issue));
  }

  removeMaterialIssue(index: number) {
    this.materialIssues.removeAt(index);
  }

  onProductChange(index: number) {
    const row = this.items.at(index) as FormGroup;
    const product = this.products.find((item) => Number(item.product_id) === Number(row.get('product_id')?.value));
    if (!product) return;
    row.patchValue({
      item_name: product.product_name,
      description: product.description || '',
      selling_price: Number(product.selling_price ?? product.price ?? 0),
      tax_percent: Number(product.gst_percent ?? 0)
    });
  }

  lineGross(index: number) {
    const item = this.items.at(index).value;
    return this.toNumber(item.qty) * this.toNumber(item.selling_price);
  }

  lineDiscount(index: number) {
    const item = this.items.at(index).value;
    const gross = this.lineGross(index);
    return this.toNumber(item.discount_amount) || gross * this.toNumber(item.discount_percent) / 100;
  }

  lineTax(index: number) {
    const item = this.items.at(index).value;
    const taxable = Math.max(this.lineGross(index) - this.lineDiscount(index), 0);
    return taxable * this.toNumber(item.tax_percent) / 100;
  }

  lineTotal(index: number) {
    return Math.max(this.lineGross(index) - this.lineDiscount(index), 0) + this.lineTax(index);
  }

  netAmount() {
    return this.items.controls.reduce((sum, _control, index) => sum + this.lineTotal(index), 0);
  }

  submit() {
    if (this.workOrderForm.invalid) {
      this.workOrderForm.markAllAsTouched();
      return;
    }

    const rawValue = this.workOrderForm.getRawValue();
    const payload = {
      ...rawValue,
      ...(this.isEditMode ? { work_order_id: this.workOrderId } : {}),
      items: rawValue.items.map((item: any, index: number) => ({
        ...item,
        discount_amount: this.lineDiscount(index),
        tax_amount: this.lineTax(index),
        amount: this.lineTotal(index)
      })),
      material_issues: []
    };

    delete payload.work_order_no;
    delete payload.material_return;

    this.ngxLoader.start();
    const request = this.isEditMode
      ? this.workOrderService.updateWorkOrder(payload)
      : this.workOrderService.addWorkOrder(payload);

    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/work-orders');
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  saveMaterialReturn() {
    if (!this.isEditMode || !this.workOrderId) return;
    const payload = this.materialReturnForm.getRawValue();
    if (!payload.returned_qty || Number(payload.returned_qty) <= 0) {
      alert('Returned quantity is required');
      return;
    }

    const issue = this.existingIssues.find((item) => Number(item.issue_id) === Number(payload.issue_id));
    const requestPayload = {
      ...payload,
      work_order_id: this.workOrderId,
      material_id: payload.material_id || issue?.material_id || null,
      product_id: payload.product_id || issue?.product_id || null
    };

    this.ngxLoader.start();
    this.workOrderService.addMaterialReturn(this.workOrderId, requestPayload).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadWorkOrder(this.workOrderId);
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  createInvoice() {
    if (!this.isEditMode) return;
    if (this.currentWorkOrder?.work_status !== 'COMPLETED' || this.currentWorkOrder?.approval_status !== 'APPROVED') {
      alert('Invoice can be created only after the completed work order is approved.');
      return;
    }
    this.workOrderService.createInvoice(this.workOrderId).subscribe({
      next: (response: any) => this.commonMethods.handleTokenAndMessage(response),
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  cancel() {
    this.router.navigateByUrl('/work-orders');
  }

  downloadPdf() {
    const order = this.currentWorkOrder;
    if (!order) return;
    downloadSimplePdf({
      filename: `work-order-${order.work_order_no}.pdf`,
      title: 'Work Order',
      details: [
        ['Work Order No', order.work_order_no],
        ['Status', order.work_status],
        ['Customer', order.customer_name],
        ['Assigned To', order.assigned_employee_name],
        ['Start Date', this.toInputDate(order.start_date)],
        ['Site', order.site_address]
      ],
      columns: ['S.No', 'Item', 'Description', 'Qty', 'Rate', 'Amount'],
      columnWidths: [30, 105, 220, 48, 55, 57],
      rightAlignedColumns: [0, 3, 4, 5],
      wrappedColumns: [1, 2],
      rows: (order.items || []).map((item: any, index: number) => [
        index + 1, item.item_name, item.description, item.qty,
        Number(item.selling_price || 0).toFixed(2), Number(item.amount || 0).toFixed(2)
      ])
    });
  }

  reviewWorkOrder(action: 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED') {
    if (!this.workOrderId || this.currentWorkOrder?.approval_status !== 'PENDING') return;
    const label = action === 'COMPLETED'
      ? 'approve this completed work order'
      : action === 'IN_PROGRESS' ? 'move this work order to in progress' : 'reject this work order';
    if (!confirm(`Are you sure you want to ${label}?`)) return;
    this.ngxLoader.start();
    this.workOrderService.reviewWorkOrder(this.workOrderId, action).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        if (action === 'IN_PROGRESS') {
          this.router.navigate(['/work-orders/material-issue', this.workOrderId]);
        } else {
          this.router.navigateByUrl('/work-orders');
        }
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  money(value: number | string) {
    return `Rs. ${this.toNumber(value).toFixed(2)}`;
  }

  toNumber(value: any) {
    return Number.parseFloat(value || 0) || 0;
  }

  today() {
    return this.toInputDate(new Date());
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
