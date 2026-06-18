import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { ProductService } from '../../services/product-service';
import { PurchaseServices } from '../../services/purchase-services';
import { SupplierServices } from '../../services/supplier-services';
import { CommonMethods } from '../../shared/common-methods';

@Component({
  selector: 'app-purchase-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './purchase-form.html',
  styleUrl: './purchase-form.scss',
})
export class PurchaseForm {
  purchaseForm!: FormGroup;
  suppliers: any[] = [];
  products: any[] = [];
  isEditMode = false;
  purchaseId!: number;

  purchaseStatuses = ['DRAFT', 'RECEIVED', 'COMPLETED', 'CANCELLED'];
  paymentStatuses = ['PENDING', 'PARTIAL', 'PAID'];

  constructor(
    private fb: FormBuilder,
    private purchaseService: PurchaseServices,
    private supplierService: SupplierServices,
    private productService: ProductService,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadSuppliers();
    this.loadProducts();
    this.initializeForm();
  }

  get items() {
    return this.purchaseForm.get('items') as FormArray;
  }

  buildForm() {
    this.purchaseForm = this.fb.group({
      purchase_no: [{ value: '', disabled: true }],
      supplier_id: ['', Validators.required],
      invoice_no: [''],
      invoice_date: [''],
      purchase_date: [this.today(), Validators.required],
      discount_amount: [0, [Validators.min(0)]],
      discount_percent: [0, [Validators.min(0)]],
      paid_amount: [0, [Validators.min(0)]],
      purchase_status: ['DRAFT', Validators.required],
      payment_status: ['PENDING', Validators.required],
      remarks: [''],
      received_date: [''],
      items: this.fb.array([])
    });

    this.addItem();
  }

  initializeForm() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.purchaseId = Number(id);
      this.loadPurchase(this.purchaseId);
    } else {
      const supplierId = this.route.snapshot.queryParamMap.get('supplierId');
      if (supplierId) this.purchaseForm.patchValue({ supplier_id: supplierId });
      this.purchaseService.getNextPurchaseNo().subscribe({
        next: (response: any) => this.purchaseForm.get('purchase_no')?.setValue(response?.purchase_no || ''),
        error: (error: any) => this.commonMethods.handleError(error)
      });
    }
  }

  loadSuppliers() {
    this.supplierService.getSuppliers().subscribe({
      next: (response: any) => this.suppliers = Array.isArray(response) ? response : response.data ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadProducts() {
    this.productService.getProduct().subscribe({
      next: (response: any) => this.products = Array.isArray(response) ? response : response.data ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadPurchase(purchaseId: number) {
    this.ngxLoader.start();
    this.purchaseService.getPurchaseById(purchaseId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const purchase = response?.data ?? response;
        this.items.clear();
        (purchase.items || []).forEach((item: any) => this.addItem(item));
        this.purchaseForm.patchValue({
          ...purchase,
          invoice_date: this.toInputDate(purchase.invoice_date),
          purchase_date: this.toInputDate(purchase.purchase_date),
          received_date: this.toInputDate(purchase.received_date)
        });
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addItem(item: any = {}) {
    this.items.push(this.fb.group({
      product_id: [item.product_id || '', Validators.required],
      qty: [Number(item.qty ?? 1), [Validators.required, Validators.min(0.01)]],
      purchase_price: [Number(item.purchase_price ?? 0), [Validators.required, Validators.min(0)]],
      discount_amount: [Number(item.discount_amount ?? 0), [Validators.min(0)]],
      discount_percent: [Number(item.discount_percent ?? 0), [Validators.min(0)]],
      tax_percent: [Number(item.tax_percent ?? 0), [Validators.min(0)]],
      tax_amount: [0, [Validators.min(0)]],
      received_qty: [Number(item.received_qty ?? item.qty ?? 1), [Validators.min(0)]],
      remarks: [item.remarks || '']
    }));
  }

  removeItem(index: number) {
    if (this.items.length === 1) return;
    this.items.removeAt(index);
  }

  onProductChange(index: number) {
    const row = this.items.at(index) as FormGroup;
    const product = this.products.find((item) => Number(item.product_id) === Number(row.get('product_id')?.value));
    if (!product) return;

    row.patchValue({
      purchase_price: Number(product.purchase_price ?? 0),
      tax_percent: Number(product.gst_percent ?? 0)
    });
  }

  lineGross(index: number) {
    const item = this.items.at(index).value;
    return this.toNumber(item.qty) * this.toNumber(item.purchase_price);
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

  totalAmount() {
    return this.items.controls.reduce((sum, _control, index) => sum + this.lineGross(index), 0);
  }

  itemDiscountTotal() {
    return this.items.controls.reduce((sum, _control, index) => sum + this.lineDiscount(index), 0);
  }

  taxAmount() {
    return this.items.controls.reduce((sum, _control, index) => sum + this.lineTax(index), 0);
  }

  headerDiscount() {
    const value = this.purchaseForm.getRawValue();
    return this.toNumber(value.discount_amount) || this.totalAmount() * this.toNumber(value.discount_percent) / 100;
  }

  netAmount() {
    return Math.max(this.totalAmount() - this.itemDiscountTotal() - this.headerDiscount() + this.taxAmount(), 0);
  }

  balanceAmount() {
    return this.netAmount() - this.toNumber(this.purchaseForm.get('paid_amount')?.value);
  }

  submit() {
    if (this.purchaseForm.invalid) {
      this.purchaseForm.markAllAsTouched();
      return;
    }

    const rawValue = this.purchaseForm.getRawValue();
    const payload = {
      ...rawValue,
      ...(this.isEditMode ? { purchase_id: this.purchaseId } : {}),
      total_amount: this.totalAmount(),
      tax_amount: this.taxAmount(),
      net_amount: this.netAmount(),
      balance_amount: this.balanceAmount(),
      items: rawValue.items.map((item: any, index: number) => ({
        ...item,
        amount: this.lineTotal(index),
        tax_amount: this.lineTax(index),
        discount_amount: this.lineDiscount(index),
        received_qty: item.received_qty || item.qty
      }))
    };

    if (!this.isEditMode) delete payload.purchase_no;

    this.ngxLoader.start();
    const request = this.isEditMode
      ? this.purchaseService.updatePurchase(payload)
      : this.purchaseService.addPurchase(payload);

    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/purchases');
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  cancel() {
    this.router.navigateByUrl('/purchases');
  }

  money(value: number) {
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
