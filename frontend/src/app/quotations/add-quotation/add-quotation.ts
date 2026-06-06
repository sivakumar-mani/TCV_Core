import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { LookupServices } from '../../services/lookup-services';
import { QuotationServices } from '../../services/quotation-services';
import { CommonMethods } from '../../shared/common-methods';
import { downloadQuotationPdf } from '../../shared/quotation-pdf';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-add-quotation',
  imports: [CommonModule, ReactiveFormsModule, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './add-quotation.html',
  styleUrl: './add-quotation.scss',
})
export class AddQuotation {
  quotationForm!: FormGroup;
  customers: any[] = [];
  products: any[] = [];
  isEditMode = false;
  quotationId!: number;
  showPreview = false;
  previewData: any = null;

  constructor(
    private fb: FormBuilder,
    private lookupService: LookupServices,
    private quotationService: QuotationServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get items(): FormArray {
    return this.quotationForm.get('items') as FormArray;
  }

  ngOnInit() {
    this.initForm();
    this.loadLookups();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.quotationId = Number(id);
      this.loadQuotation(this.quotationId);
    }
  }

  initForm() {
    this.quotationForm = this.fb.group({
      quotation_date: ['', Validators.required],
      valid_until: [''],
      customer_id: ['', Validators.required],
      requirement_details: [''],
      remarks: [''],
      items: this.fb.array([])
    });

    this.addItem();
  }

  createItem(item: any = {}) {
    return this.fb.group({
      product_id: [item.product_id || ''],
      item_name: [item.item_name || item.product_name || '', Validators.required],
      description: [item.description || ''],
      qty: [item.qty ?? 1, [Validators.required, Validators.min(0.01)]],
      selling_price: [item.selling_price ?? 0, [Validators.required, Validators.min(0)]],
      discount_amount: [item.discount_amount ?? 0],
      tax_percent: [item.tax_percent ?? 0],
      tax_amount: [item.tax_amount ?? 0],
      amount: [{ value: item.amount ?? 0, disabled: true }]
    });
  }

  loadLookups() {
    this.lookupService.getCustomers().subscribe({
      next: (response: any) => this.customers = response?.data ?? response ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
    this.lookupService.getProducts().subscribe({
      next: (response: any) => this.products = response?.data ?? response ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadQuotation(quotationId: number) {
    this.ngxLoader.start();
    this.quotationService.getQuotationById(quotationId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const data = response?.data ?? response;
        this.quotationForm.patchValue({
          quotation_date: data.quotation_date,
          valid_until: data.valid_until,
          customer_id: data.customer_id,
          requirement_details: data.requirement_details,
          remarks: data.remarks
        });
        this.items.clear();
        const rows = data.items?.length ? data.items : [{}];
        rows.forEach((item: any) => {
          this.items.push(this.createItem(item));
          this.calculateItem(this.items.length - 1);
        });
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addItem() {
    this.items.push(this.createItem());
  }

  removeItem(index: number) {
    if (this.items.length === 1) {
      this.items.at(0).reset({
        product_id: '',
        item_name: '',
        description: '',
        qty: 1,
        selling_price: 0,
        discount_amount: 0,
        tax_percent: 0,
        tax_amount: 0,
        amount: 0
      });
      return;
    }
    this.items.removeAt(index);
  }

  onProductChange(index: number) {
    const group = this.items.at(index) as FormGroup;
    const product = this.products.find((row) => String(row.value) === String(group.get('product_id')?.value));
    if (!product) {
      return;
    }

    group.patchValue({
      item_name: product.product_name || product.label,
      selling_price: Number(product.selling_price || 0)
    });
    this.calculateItem(index);
  }

  calculateItem(index: number) {
    const group = this.items.at(index) as FormGroup;
    const qty = Number(group.get('qty')?.value || 0);
    const price = Number(group.get('selling_price')?.value || 0);
    const discount = Number(group.get('discount_amount')?.value || 0);
    const taxPercent = Number(group.get('tax_percent')?.value || 0);
    const taxable = Math.max((qty * price) - discount, 0);
    const taxAmount = Number((taxable * (taxPercent / 100)).toFixed(2));
    const amount = Number(((qty * price) + taxAmount - discount).toFixed(2));

    group.patchValue({ tax_amount: taxAmount, amount }, { emitEvent: false });
  }

  subtotal() {
    return this.items.controls.reduce((sum, control) => {
      const row = control.getRawValue();
      return sum + (Number(row.qty || 0) * Number(row.selling_price || 0));
    }, 0);
  }

  discountTotal() {
    return this.items.controls.reduce((sum, control) => sum + Number(control.get('discount_amount')?.value || 0), 0);
  }

  taxTotal() {
    return this.items.controls.reduce((sum, control) => sum + Number(control.get('tax_amount')?.value || 0), 0);
  }

  netTotal() {
    return this.items.controls.reduce((sum, control) => sum + Number(control.get('amount')?.value || 0), 0);
  }

  buildPayload() {
    const data = this.quotationForm.getRawValue();
    const customer = this.customers.find((row) => String(row.value) === String(data.customer_id));
    const items = data.items.map((item: any) => ({
      ...item,
      product_id: item.product_id || null,
      qty: Number(item.qty || 0),
      selling_price: Number(item.selling_price || 0),
      discount_amount: Number(item.discount_amount || 0),
      tax_percent: Number(item.tax_percent || 0),
      tax_amount: Number(item.tax_amount || 0),
      amount: Number(item.amount || 0)
    }));

    return {
      quotation_id: this.quotationId,
      quotation_date: data.quotation_date,
      valid_until: data.valid_until,
      customer_id: data.customer_id,
      customer_name: customer?.label,
      requirement_details: data.requirement_details,
      total_amount: this.subtotal(),
      discount_amount: this.discountTotal(),
      tax_amount: this.taxTotal(),
      net_amount: this.netTotal(),
      remarks: data.remarks,
      items
    };
  }

  preview() {
    if (this.quotationForm.invalid) {
      this.quotationForm.markAllAsTouched();
      return;
    }
    this.previewData = this.buildPayload();
    this.showPreview = true;
  }

  closePreview() {
    this.showPreview = false;
  }

  downloadPreview() {
    downloadQuotationPdf({ ...this.previewData, quotation_no: this.previewData?.quotation_no || 'Draft-Quotation' });
  }

  save() {
    if (this.quotationForm.invalid) {
      this.quotationForm.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    const payload = this.buildPayload();

    const request = this.isEditMode
      ? this.quotationService.updateQuotation(payload)
      : this.quotationService.addQuotation(payload);

    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/quotations');
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  cancel() {
    this.router.navigateByUrl('/quotations');
  }
}
