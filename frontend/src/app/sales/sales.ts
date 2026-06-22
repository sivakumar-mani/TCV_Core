import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CustomerServices } from '../services/customer-services';
import { SalesServices } from '../services/sales-services';
import { AgGridList } from '../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../shared/common-methods';
import { InputFormField } from '../shared/input-form-field/input-form-field';
import { ActionMenu } from '../shared/list-action-menu';
import { SelectFormField } from '../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../shared/textarea-form-field/textarea-form-field';
import { downloadSimplePdf } from '../shared/simple-pdf';

@Component({
  selector: 'app-sales',
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, AgGridList, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './sales.html',
  styleUrl: './sales.scss',
})
export class Sales {
  @ViewChild('invoicePreviewDialog') invoicePreviewDialog!: TemplateRef<unknown>;
  form!: FormGroup;
  rows: any[] = [];
  customers: any[] = [];
  customerOptionList: { label: string; value: string | number }[] = [{ label: 'Select customer', value: '' }];
  selectedId: number | null = null;
  previewInvoice: any;
  invoiceDialogRef?: MatDialogRef<unknown>;
  paymentModes = ['CASH', 'CARD', 'UPI', 'BANK', 'CHEQUE', 'CREDIT'];
  paymentStatuses = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'];
  salesStatuses = ['DRAFT', 'COMPLETED', 'CANCELLED', 'RETURNED'];
  paymentModeOptions = this.optionList(this.paymentModes);
  paymentStatusOptions = this.optionList(this.paymentStatuses);
  salesStatusOptions = this.optionList(this.salesStatuses);

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'invoice_no', headerName: 'Invoice No' },
    { field: 'invoice_date', headerName: 'Date', valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'customer_name', headerName: 'Customer' },
    { field: 'net_amount', headerName: 'Net', valueFormatter: (params) => this.money(params.value) },
    { field: 'paid_amount', headerName: 'Paid', valueFormatter: (params) => this.money(params.value) },
    { field: 'balance_amount', headerName: 'Balance', valueFormatter: (params) => this.money(params.value) },
    { field: 'payment_status', headerName: 'Payment' },
    { field: 'sales_status', headerName: 'Status' },
    {
      headerName: 'Action',
      maxWidth: 110,
      cellRenderer: ActionMenu,
      cellRendererParams: { dropdownMenu: [
        { label: 'Preview / PDF', action: (row: any) => this.preview(row) },
        { label: 'Edit', action: (row: any) => this.edit(row) },
        { label: 'Delete', action: (row: any) => this.delete(row) }
      ] },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private fb: FormBuilder,
    private salesService: SalesServices,
    private customerService: CustomerServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      invoice_no: [''],
      invoice_date: [this.toInputDate(new Date()), Validators.required],
      customer_id: ['', Validators.required],
      total_amount: [0, [Validators.required, Validators.min(0)]],
      discount_amount: [0, [Validators.min(0)]],
      tax_amount: [0, [Validators.min(0)]],
      net_amount: [0, [Validators.min(0)]],
      paid_amount: [0, [Validators.min(0)]],
      payment_mode: ['CREDIT'],
      payment_status: ['PENDING'],
      sales_status: ['DRAFT'],
      due_date: [''],
      remarks: ['']
    });
    this.loadCustomers();
    this.loadRows();
  }

  loadCustomers() {
    this.customerService.getCustomers().subscribe({
      next: (response: any) => {
        this.customers = Array.isArray(response) ? response : response.data ?? [];
        this.customerOptionList = [
          { label: 'Select customer', value: '' },
          ...this.customers.map((customer) => ({
            label: customer.display_customer_name || customer.customer_name,
            value: customer.customer_id
          }))
        ];
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadRows() {
    this.ngxLoader.start();
    this.salesService.getSales().subscribe({
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
    const payload = { ...this.form.value, sales_id: this.selectedId };
    const request = this.selectedId ? this.salesService.updateSale(payload) : this.salesService.addSale(payload);
    request.subscribe({
      next: (response: any) => {
        this.commonMethods.handleTokenAndMessage(response);
        this.reset();
        this.loadRows();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  edit(row: any) {
    this.selectedId = row.sales_id;
    this.form.patchValue({
      ...row,
      invoice_date: this.toInputDate(row.invoice_date),
      due_date: row.due_date ? this.toInputDate(row.due_date) : ''
    });
  }

  preview(row: any) {
    this.ngxLoader.start();
    this.salesService.getSaleById(row.sales_id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.previewInvoice = response?.data ?? response;
        this.invoiceDialogRef = this.dialog.open(this.invoicePreviewDialog, {
          width: 'min(1000px, 94vw)',
          maxWidth: '94vw',
          maxHeight: '90vh',
          panelClass: 'invoice-preview-dialog-panel'
        });
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  closePreview() {
    this.invoiceDialogRef?.close();
    this.invoiceDialogRef = undefined;
  }

  downloadInvoicePdf() {
    const invoice = this.previewInvoice;
    if (!invoice) return;
    downloadSimplePdf({
      filename: `invoice-${invoice.invoice_no}.pdf`,
      title: 'Sales Invoice',
      details: [
        ['Invoice No', invoice.invoice_no],
        ['Invoice Date', this.displayDate(invoice.invoice_date)],
        ['Customer', invoice.customer_name],
        ['Phone', invoice.phone],
        ['Work Order', invoice.work_order_no],
        ['Payment', invoice.payment_status]
      ],
      columns: ['S.No', 'Item', 'Description', 'Qty', 'Rate', 'Amount'],
      rows: (invoice.items || []).map((item: any, index: number) => [
        index + 1, item.item_name, item.description, item.qty,
        Number(item.selling_price || 0).toFixed(2), Number(item.amount || 0).toFixed(2)
      ])
    });
  }

  delete(row: any) {
    if (!confirm(`Delete invoice ${row.invoice_no}?`)) return;
    this.salesService.deleteSale({ sales_id: row.sales_id }).subscribe({
      next: (response: any) => {
        this.commonMethods.handleTokenAndMessage(response);
        this.loadRows();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  reset() {
    this.selectedId = null;
    this.form.reset({ invoice_date: this.toInputDate(new Date()), total_amount: 0, discount_amount: 0, tax_amount: 0, net_amount: 0, paid_amount: 0, payment_mode: 'CREDIT', payment_status: 'PENDING', sales_status: 'DRAFT' });
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

  optionList(values: string[]) {
    return values.map((value) => ({ label: value, value }));
  }
}
