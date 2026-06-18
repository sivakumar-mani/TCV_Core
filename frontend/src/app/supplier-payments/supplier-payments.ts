import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { EmployeeServices } from '../services/employee-services';
import { PurchaseServices } from '../services/purchase-services';
import { SupplierPaymentServices } from '../services/supplier-payment-services';
import { SupplierServices } from '../services/supplier-services';
import { AgGridList } from '../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../shared/common-methods';
import { InputFormField } from '../shared/input-form-field/input-form-field';
import { ActionMenu } from '../shared/list-action-menu';
import { SelectFormField } from '../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-supplier-payments',
  imports: [CommonModule, ReactiveFormsModule, AgGridList, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './supplier-payments.html',
  styleUrl: './supplier-payments.scss',
})
export class SupplierPayments {
  form!: FormGroup;
  rows: any[] = [];
  suppliers: any[] = [];
  employees: any[] = [];
  purchases: any[] = [];
  selectedId: number | null = null;
  paymentModes = ['CASH', 'CARD', 'UPI', 'BANK', 'CHEQUE', 'ONLINE'];

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'payment_date', headerName: 'Date', valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'supplier_name', headerName: 'Supplier' },
    { field: 'purchase_no', headerName: 'Purchase' },
    { field: 'amount', headerName: 'Amount', valueFormatter: (params) => this.money(params.value) },
    { field: 'balance_amount', headerName: 'Purchase Balance', valueFormatter: (params) => this.money(params.value) },
    { field: 'payment_mode', headerName: 'Mode' },
    { field: 'reference_no', headerName: 'Reference No' },
    { field: 'paid_by_employee_name', headerName: 'Paid By' },
    {
      headerName: 'Action',
      maxWidth: 110,
      cellRenderer: ActionMenu,
      cellRendererParams: { dropdownMenu: [
        { label: 'Edit', action: (row: any) => this.edit(row) },
        { label: 'Delete', action: (row: any) => this.delete(row) }
      ] },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private fb: FormBuilder,
    private paymentService: SupplierPaymentServices,
    private supplierService: SupplierServices,
    private purchaseService: PurchaseServices,
    private employeeService: EmployeeServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      supplier_id: ['', Validators.required],
      purchase_id: ['', Validators.required],
      purchased_amount: [{ value: 0, disabled: true }],
      balance_amount: [{ value: 0, disabled: true }],
      amount: [0, [Validators.required, Validators.min(1)]],
      payment_date: [this.toInputDate(new Date()), Validators.required],
      payment_mode: ['CASH', Validators.required],
      reference_no: [''],
      narration: [''],
      paid_by_employee_id: ['']
    });
    this.form.get('supplier_id')?.valueChanges.subscribe(() => {
      this.form.patchValue({ purchase_id: '', purchased_amount: 0, balance_amount: 0 }, { emitEvent: false });
    });
    this.form.get('purchase_id')?.valueChanges.subscribe(() => this.updateSelectedPurchaseAmounts());
    this.loadLookups();
    this.loadRows();
  }

  loadLookups() {
    this.supplierService.getSuppliers().subscribe({
      next: (response: any) => this.suppliers = Array.isArray(response) ? response : response.data ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => this.employees = Array.isArray(response) ? response : response.data ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
    this.loadPurchases();
  }

  loadPurchases() {
    this.purchaseService.getPurchases().subscribe({
      next: (response: any) => {
        this.purchases = Array.isArray(response) ? response : response.data ?? [];
        this.applyQueryParams();
        this.updateSelectedPurchaseAmounts();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadRows() {
    this.ngxLoader.start();
    this.paymentService.getPayments().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.rows = response?.data ?? [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const rawValue = this.form.getRawValue();
    const payload = {
      ...rawValue,
      payment_id: this.selectedId
    };
    const request = this.selectedId ? this.paymentService.updatePayment(payload) : this.paymentService.addPayment(payload);
    request.subscribe({
      next: (response: any) => {
        this.commonMethods.handleTokenAndMessage(response);
        this.reset();
        this.loadPurchases();
        this.loadRows();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  edit(row: any) {
    this.selectedId = row.payment_id;
    this.form.patchValue({
      ...row,
      payment_date: this.toInputDate(row.payment_date)
    });
    this.updateSelectedPurchaseAmounts();
  }

  delete(row: any) {
    if (!confirm(`Delete payment Rs. ${row.amount}?`)) return;
    this.paymentService.deletePayment({ payment_id: row.payment_id }).subscribe({
      next: (response: any) => {
        this.commonMethods.handleTokenAndMessage(response);
        this.loadPurchases();
        this.loadRows();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  reset() {
    this.selectedId = null;
    this.form.reset({ amount: 0, payment_date: this.toInputDate(new Date()), payment_mode: 'CASH', purchased_amount: 0, balance_amount: 0 });
  }

  applyQueryParams() {
    const supplierId = this.route.snapshot.queryParamMap.get('supplierId');
    const purchaseId = this.route.snapshot.queryParamMap.get('purchaseId');
    if (!supplierId && !purchaseId) return;

    const purchase = purchaseId ? this.purchases.find((item) => Number(item.purchase_id) === Number(purchaseId)) : null;
    this.form.patchValue({
      supplier_id: supplierId || purchase?.supplier_id || '',
      purchase_id: purchaseId ? Number(purchaseId) : ''
    });
    this.updateSelectedPurchaseAmounts();
  }

  filteredPurchases() {
    const supplierId = Number(this.form?.get('supplier_id')?.value);
    const selectedPurchaseId = Number(this.form?.get('purchase_id')?.value);
    if (!supplierId) return [];
    return this.purchases.filter((purchase) =>
      Number(purchase.supplier_id) === supplierId &&
      (Number(purchase.balance_amount) > 0 || Number(purchase.purchase_id) === selectedPurchaseId)
    );
  }

  selectedPurchases() {
    const purchaseId = Number(this.form?.get('purchase_id')?.value);
    if (!purchaseId) return [];
    return this.purchases.filter((purchase) => Number(purchase.purchase_id) === purchaseId);
  }

  selectedPurchase() {
    return this.selectedPurchases()[0] || null;
  }

  updateSelectedPurchaseAmounts() {
    const purchase = this.selectedPurchase();
    this.form?.patchValue({
      purchased_amount: this.toNumber(purchase?.net_amount),
      balance_amount: this.toNumber(purchase?.balance_amount)
    }, { emitEvent: false });
  }

  purchasedAmount() {
    return this.toNumber(this.form?.get('purchased_amount')?.value);
  }

  balanceAmount() {
    return this.toNumber(this.form?.get('balance_amount')?.value);
  }

  supplierOptions() {
    return [
      { label: 'Select supplier', value: '' },
      ...this.suppliers.map((supplier) => ({ label: supplier.supplier_name, value: supplier.supplier_id }))
    ];
  }

  purchaseOptions() {
    return [
      { label: 'Select purchase no', value: '' },
      ...this.filteredPurchases().map((purchase) => ({
        label: `${purchase.purchase_no} - Balance ${this.money(purchase.balance_amount)}`,
        value: purchase.purchase_id
      }))
    ];
  }

  employeeOptions() {
    return [
      { label: 'Select employee', value: '' },
      ...this.employees.map((employee) => ({ label: employee.employee_name, value: employee.employee_id }))
    ];
  }

  paymentModeOptions() {
    return this.paymentModes.map((mode) => ({ label: mode, value: mode }));
  }

  toInputDate(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
  }

  displayDate(value: string | Date) {
    if (!value) return '';
    const date = new Date(value);
    return `${`${date.getDate()}`.padStart(2, '0')}/${`${date.getMonth() + 1}`.padStart(2, '0')}/${date.getFullYear()}`;
  }

  money(value: any) {
    return `Rs. ${(Number(value) || 0).toFixed(2)}`;
  }

  toNumber(value: any) {
    return Number.parseFloat(value || 0) || 0;
  }
}
