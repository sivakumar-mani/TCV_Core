import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { LookupServices } from '../../services/lookup-services';
import { PurchaseServices } from '../../services/purchase-services';
import { CommonMethods } from '../../shared/common-methods';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-add-purchase',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    ReactiveFormsModule,
    InputFormField,
    SelectFormField,
    TextareaFormField
  ],
  templateUrl: './add-purchase.html',
  styleUrl: './add-purchase.scss',
})
export class AddPurchase {
  purchaseForm!: FormGroup;
  suppliers: any[] = [];
  products: any[] = [];

  paymentStatusList = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Partial', value: 'PARTIAL' },
    { label: 'Paid', value: 'PAID' }
  ];

  constructor(
    private fb: FormBuilder,
    private lookupService: LookupServices,
    private purchaseService: PurchaseServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.initiateForm();
    this.loadLookups();
  }

  initiateForm() {
    this.purchaseForm = this.fb.group({
      supplier_id: ['', Validators.required],
      invoice_no: [''],
      invoice_date: [''],
      payment_status: ['PENDING'],
      product_id: ['', Validators.required],
      qty: [1, [Validators.required, Validators.min(0.01)]],
      purchase_price: [0, [Validators.required, Validators.min(0)]],
      selling_price: [0, [Validators.required, Validators.min(0)]],
      discount_amount: [0],
      tax_percent: [0],
      tax_amount: [0],
      remarks: ['']
    });
  }

  loadLookups() {
    this.lookupService.getSuppliers().subscribe({
      next: (response: any) => {
        this.suppliers = response?.data ?? response ?? [];
      },
      error: (error: any) => {
        this.commonMethods.handleError(error);
      }
    });

    this.lookupService.getProducts().subscribe({
      next: (response: any) => {
        this.products = response?.data ?? response ?? [];
      },
      error: (error: any) => {
        this.commonMethods.handleError(error);
      }
    });
  }

  save() {
    if (this.purchaseForm.invalid) {
      this.purchaseForm.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    const formData = this.purchaseForm.getRawValue();
    const qty = Number(formData.qty || 0);
    const purchasePrice = Number(formData.purchase_price || 0);
    const discountAmount = Number(formData.discount_amount || 0);
    const taxAmount = Number(formData.tax_amount || 0);
    const amount = (qty * purchasePrice) + taxAmount - discountAmount;

    this.purchaseService.addPurchase({
      supplier_id: formData.supplier_id,
      invoice_no: formData.invoice_no,
      invoice_date: formData.invoice_date,
      total_amount: amount,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      net_amount: amount,
      balance_amount: amount,
      payment_status: formData.payment_status,
      remarks: formData.remarks
    }).subscribe({
      next: (purchaseResponse: any) => {
        const purchaseId = purchaseResponse.purchase_id;
        this.purchaseService.addPurchaseItem(purchaseId, {
          product_id: formData.product_id,
          qty,
          purchase_price: purchasePrice,
          discount_amount: discountAmount,
          tax_percent: formData.tax_percent,
          tax_amount: taxAmount,
          amount,
          selling_price: formData.selling_price,
          remarks: formData.remarks
        }).subscribe({
          next: (itemResponse: any) => {
            this.ngxLoader.stop();
            this.commonMethods.handleTokenAndMessage(itemResponse);
            this.router.navigateByUrl('/purchases');
          },
          error: (error: any) => {
            this.ngxLoader.stop();
            this.commonMethods.handleError(error);
          }
        });
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
}
