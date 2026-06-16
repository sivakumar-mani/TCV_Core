import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CustomerServices } from '../../services/customer-services';
import { EmployeeServices } from '../../services/employee-services';
import { ProductService } from '../../services/product-service';
import { QuotationServices } from '../../services/quotation-services';
import { CommonMethods } from '../../shared/common-methods';

@Component({
  selector: 'app-quotation-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './quotation-form.html',
  styleUrl: './quotation-form.scss',
})
export class QuotationForm {
  quotationForm!: FormGroup;
  customers: any[] = [];
  employees: any[] = [];
  products: any[] = [];
  quotation: any;
  isEditMode = false;
  isPreviewMode = false;
  quotationId!: number;

  constructor(
    private fb: FormBuilder,
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
    this.loadCustomers();
    this.loadEmployees();
    this.loadProducts();
    this.initializeForm();
  }

  get items() {
    return this.quotationForm.get('items') as FormArray;
  }

  get isApproved() {
    return this.quotation?.quotation_status === 'APPROVED';
  }

  get canApprove() {
    return this.isPreviewMode && this.quotation?.quotation_status === 'DRAFT';
  }

  get canSubmit() {
    return this.isPreviewMode && this.quotation?.quotation_status === 'APPROVED';
  }

  get canDownload() {
    return this.isPreviewMode && ['APPROVED', 'SENT', 'CONVERTED'].includes(this.quotation?.quotation_status);
  }

  get canCreateWorkOrder() {
    return this.isPreviewMode && ['APPROVED', 'SENT'].includes(this.quotation?.quotation_status);
  }

  buildForm() {
    this.quotationForm = this.fb.group({
      quotation_no: [{ value: '', disabled: true }],
      quotation_date: [this.today(), Validators.required],
      valid_until: [''],
      customer_id: ['', Validators.required],
      prepared_by_employee_id: [''],
      requirement_details: [''],
      discount_amount: [0, [Validators.min(0)]],
      discount_percent: [0, [Validators.min(0)]],
      cgst_percent: [0, [Validators.min(0)]],
      sgst_percent: [0, [Validators.min(0)]],
      remarks: [''],
      items: this.fb.array([])
    });

    this.addItem();
  }

  initializeForm() {
    const id = this.route.snapshot.paramMap.get('id');
    this.isPreviewMode = this.router.url.includes('/review/') || this.router.url.includes('/preview/');
    this.isEditMode = Boolean(id) && !this.isPreviewMode;

    if (id) {
      this.quotationId = Number(id);
      this.loadQuotation(this.quotationId);
    } else {
      this.quotationService.getNextQuotationNo().subscribe({
        next: (response: any) => this.quotationForm.get('quotation_no')?.setValue(response?.quotation_no || ''),
        error: (error: any) => this.commonMethods.handleError(error)
      });
    }
  }

  loadCustomers() {
    this.customerService.getCustomers().subscribe({
      next: (response: any) => this.customers = Array.isArray(response) ? response : response.data ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadProducts() {
    this.productService.getProduct().subscribe({
      next: (response: any) => this.products = Array.isArray(response) ? response : response.data ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadEmployees() {
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => this.employees = Array.isArray(response) ? response : response.data ?? [],
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadQuotation(quotationId: number) {
    this.ngxLoader.start();
    this.quotationService.getQuotationById(quotationId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.quotation = response?.data ?? response;
        this.items.clear();
        (this.quotation.items || []).forEach((item: any) => this.addItem(item));
        this.quotationForm.patchValue({
          ...this.quotation,
          quotation_date: this.toInputDate(this.quotation.quotation_date),
          valid_until: this.toInputDate(this.quotation.valid_until)
        });
        if (this.isPreviewMode) this.quotationForm.disable();
        if (this.route.snapshot.queryParamMap.get('download') === 'pdf' && this.canDownload) {
          setTimeout(() => this.downloadPdf(), 300);
        }
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addItem(item: any = {}) {
    this.items.push(this.fb.group({
      product_id: [item.product_id || ''],
      item_name: [item.item_name || item.product_name || '', Validators.required],
      description: [item.description || ''],
      qty: [Number(item.qty ?? 1), [Validators.required, Validators.min(0.01)]],
      selling_price: [Number(item.selling_price ?? item.price ?? 0), [Validators.required, Validators.min(0)]],
      discount_percent: [Number(item.discount_percent ?? 0), [Validators.min(0)]],
      discount_amount: [Number(item.discount_amount ?? 0), [Validators.min(0)]],
      tax_percent: [Number(item.tax_percent ?? 0), [Validators.min(0)]],
      tax_amount: [0, [Validators.min(0)]],
      notes: [item.notes || '']
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

  subtotal() {
    return this.items.controls.reduce((sum, _control, index) => sum + this.lineGross(index), 0);
  }

  itemDiscountTotal() {
    return this.items.controls.reduce((sum, _control, index) => sum + this.lineDiscount(index), 0);
  }

  itemTaxTotal() {
    return this.items.controls.reduce((sum, _control, index) => sum + this.lineTax(index), 0);
  }

  headerDiscount() {
    const value = this.quotationForm.getRawValue();
    return this.toNumber(value.discount_amount) || this.subtotal() * this.toNumber(value.discount_percent) / 100;
  }

  taxableAmount() {
    return Math.max(this.subtotal() - this.itemDiscountTotal() - this.headerDiscount(), 0);
  }

  cgstAmount() {
    return this.taxableAmount() * this.toNumber(this.quotationForm.get('cgst_percent')?.value) / 100;
  }

  sgstAmount() {
    return this.taxableAmount() * this.toNumber(this.quotationForm.get('sgst_percent')?.value) / 100;
  }

  totalTax() {
    return this.itemTaxTotal() + this.cgstAmount() + this.sgstAmount();
  }

  netAmount() {
    return this.taxableAmount() + this.totalTax();
  }

  saveDraft() {
    this.saveQuotation('DRAFT');
  }

  saveQuotation(status: 'DRAFT' | 'APPROVED' | 'SENT' = 'DRAFT') {
    if (this.quotationForm.invalid) {
      this.quotationForm.markAllAsTouched();
      return;
    }

    const rawValue = this.quotationForm.getRawValue();
    const payload = {
      ...rawValue,
      ...(this.isEditMode ? { quotation_id: this.quotationId } : {}),
      quotation_status: status,
      total_amount: this.subtotal(),
      tax_amount: this.totalTax(),
      net_amount: this.netAmount(),
      items: rawValue.items.map((item: any, index: number) => ({
        ...item,
        discount_amount: this.lineDiscount(index),
        tax_amount: this.lineTax(index),
        amount: this.lineTotal(index)
      }))
    };

    if (!this.isEditMode) delete payload.quotation_no;

    this.ngxLoader.start();
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

  approveQuotation() {
    if (!this.quotationId) return;
    this.ngxLoader.start();
    this.quotationService.approveQuotation(this.quotationId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadQuotation(this.quotationId);
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  submitToCustomer() {
    if (!this.quotationId) return;
    this.ngxLoader.start();
    this.quotationService.submitQuotation(this.quotationId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadQuotation(this.quotationId);
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  downloadPdf() {
    if (!this.quotation) return;

    const pdf = this.createQuotationPdf(this.mapQuotationPdfData(this.quotation));
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `quotation-${this.quotation.quotation_no}-v${this.quotation.quotation_version}.pdf`.replace(/\s+/g, '-');
    anchor.click();
    URL.revokeObjectURL(url);
  }

  mapQuotationPdfData(quotation: any) {
    const subtotal = this.toNumber(quotation.total_amount);
    const discount = this.toNumber(quotation.discount_amount);
    const taxable = Math.max(subtotal - discount, 0);

    return {
      ...quotation,
      quotation_date: this.displayDate(quotation.quotation_date),
      valid_until: this.displayDate(quotation.valid_until),
      items: quotation.items || [],
      total_amount: subtotal,
      discount_amount: discount,
      cgst_amount: taxable * this.toNumber(quotation.cgst_percent) / 100,
      sgst_amount: taxable * this.toNumber(quotation.sgst_percent) / 100,
      tax_amount: this.toNumber(quotation.tax_amount),
      net_amount: this.toNumber(quotation.net_amount)
    };
  }

  createQuotationPdf(quotation: any) {
    const commands: string[] = [];
    const pageLeft = 40;
    const pageRight = 555;
    const tableTop = 620;
    const rowHeight = 24;
    const itemRows = Math.max(quotation.items.length, 1);
    const tableBottom = Math.max(tableTop - rowHeight * (itemRows + 1), 215);
    const columns = [40, 78, 250, 310, 380, 455, 555];

    this.pdfRect(commands, pageLeft, 690, pageRight - pageLeft, 112);
    this.pdfText(commands, pageLeft + 14, 775, 18, 'TCV');
    this.pdfText(commands, pageLeft + 14, 752, 14, 'Quotation');
    this.pdfText(commands, pageLeft + 14, 728, 10, `Quotation No: ${quotation.quotation_no}`);
    this.pdfText(commands, 330, 728, 10, `Version: ${quotation.quotation_version || 1}`);
    this.pdfText(commands, pageLeft + 14, 710, 10, `Date: ${quotation.quotation_date}`);
    this.pdfText(commands, 330, 710, 10, `Valid Until: ${quotation.valid_until || ''}`);
    this.pdfText(commands, pageLeft + 14, 694, 9, `Prepared By: ${quotation.prepared_by_employee_name || ''}`);

    this.pdfRect(commands, pageLeft, 640, pageRight - pageLeft, 38);
    this.pdfText(commands, pageLeft + 12, 662, 10, `Customer: ${quotation.customer_name || ''}`);
    this.pdfText(commands, pageLeft + 12, 646, 9, `Contact: ${quotation.contact_person || ''} ${quotation.phone || ''} ${quotation.email || ''}`.slice(0, 90));

    this.pdfRect(commands, pageLeft, tableBottom, pageRight - pageLeft, tableTop - tableBottom);
    columns.forEach((x) => this.pdfLine(commands, x, tableBottom, x, tableTop));
    for (let y = tableTop; y >= tableBottom; y -= rowHeight) {
      this.pdfLine(commands, pageLeft, y, pageRight, y);
    }

    this.pdfText(commands, 48, 605, 9, 'S.No');
    this.pdfText(commands, 86, 605, 9, 'Item');
    this.pdfRightText(commands, 302, 605, 9, 'Qty');
    this.pdfRightText(commands, 372, 605, 9, 'Rate');
    this.pdfRightText(commands, 447, 605, 9, 'Tax');
    this.pdfRightText(commands, 547, 605, 9, 'Amount');

    quotation.items.forEach((item: any, index: number) => {
      if (index > 15) return;
      const y = tableTop - rowHeight * (index + 1) + 9;
      this.pdfText(commands, 48, y, 9, String(index + 1));
      this.pdfText(commands, 86, y, 9, String(item.item_name || '').slice(0, 30));
      this.pdfRightText(commands, 302, y, 9, this.decimal(item.qty));
      this.pdfRightText(commands, 372, y, 9, this.money(item.selling_price));
      this.pdfRightText(commands, 447, y, 9, this.money(item.tax_amount));
      this.pdfRightText(commands, 547, y, 9, this.money(item.amount));
    });

    const totalsTop = tableBottom - 22;
    this.pdfRect(commands, 330, totalsTop - 146, 225, 146);
    [24, 48, 72, 96, 120].forEach((offset) => this.pdfLine(commands, 330, totalsTop - offset, 555, totalsTop - offset));
    this.pdfLine(commands, 450, totalsTop - 146, 450, totalsTop);
    this.pdfText(commands, 342, totalsTop - 16, 9, 'Subtotal');
    this.pdfRightText(commands, 545, totalsTop - 16, 9, this.money(quotation.total_amount));
    this.pdfText(commands, 342, totalsTop - 40, 9, 'Discount');
    this.pdfRightText(commands, 545, totalsTop - 40, 9, this.money(quotation.discount_amount));
    this.pdfText(commands, 342, totalsTop - 64, 9, `CGST ${quotation.cgst_percent || 0}%`);
    this.pdfRightText(commands, 545, totalsTop - 64, 9, this.money(quotation.cgst_amount));
    this.pdfText(commands, 342, totalsTop - 88, 9, `SGST ${quotation.sgst_percent || 0}%`);
    this.pdfRightText(commands, 545, totalsTop - 88, 9, this.money(quotation.sgst_amount));
    this.pdfText(commands, 342, totalsTop - 112, 9, 'Total Tax');
    this.pdfRightText(commands, 545, totalsTop - 112, 9, this.money(quotation.tax_amount));
    this.pdfText(commands, 342, totalsTop - 136, 12, 'Net Amount');
    this.pdfRightText(commands, 545, totalsTop - 136, 12, this.money(quotation.net_amount));

    if (quotation.remarks) {
      this.pdfText(commands, pageLeft, 92, 9, `Remarks: ${String(quotation.remarks).slice(0, 95)}`);
    }
    this.pdfText(commands, pageLeft, 62, 9, 'This is a system generated quotation.');

    const content = `${commands.join('\n')}\n`;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${content.length} >> stream\n${content}endstream endobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object) => {
      offsets.push(pdf.length);
      pdf += `${object}\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return pdf;
  }

  pdfText(commands: string[], x: number, y: number, size: number, value: string) {
    commands.push(`BT /F1 ${size} Tf ${x} ${y} Td (${this.escapePdf(String(value))}) Tj ET`);
  }

  pdfRightText(commands: string[], rightX: number, y: number, size: number, value: string) {
    const text = String(value);
    const approximateWidth = text.length * size * 0.52;
    this.pdfText(commands, Number((rightX - approximateWidth).toFixed(2)), y, size, text);
  }

  pdfLine(commands: string[], x1: number, y1: number, x2: number, y2: number) {
    commands.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  }

  pdfRect(commands: string[], x: number, y: number, width: number, height: number) {
    commands.push(`${x} ${y} ${width} ${height} re S`);
  }

  escapePdf(value: string) {
    return value.replace(/[^\x20-\x7E]/g, '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  decimal(value: number | string) {
    return this.toNumber(value).toFixed(2);
  }

  quoteMoney(value: number | string, fractionDigits = 2) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(this.toNumber(value));
  }

  previewSubtotal() {
    return this.toNumber(this.quotation?.total_amount);
  }

  previewDiscount() {
    return this.toNumber(this.quotation?.discount_amount);
  }

  previewNetAmount() {
    return this.toNumber(this.quotation?.net_amount);
  }

  previewContactLine() {
    const email = this.quotation?.prepared_by_email || 'timecablevision@gmail.com';
    const phone = this.quotation?.prepared_by_phone || '9876543210';
    return `For any enquiries, email us on ${email} or call us on ${phone}`;
  }

  amountInWords(value: number | string) {
    const amount = Math.round(this.toNumber(value));
    if (amount === 0) return 'Zero Rupees Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const twoDigits = (num: number) => num < 20 ? ones[num] : `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ''}`;
    const threeDigits = (num: number) => {
      const hundred = Math.floor(num / 100);
      const rest = num % 100;
      return `${hundred ? `${ones[hundred]} Hundred` : ''}${hundred && rest ? ' ' : ''}${rest ? twoDigits(rest) : ''}`.trim();
    };

    const crore = Math.floor(amount / 10000000);
    const lakh = Math.floor((amount % 10000000) / 100000);
    const thousand = Math.floor((amount % 100000) / 1000);
    const rest = amount % 1000;
    const parts = [
      crore ? `${threeDigits(crore)} Crore` : '',
      lakh ? `${threeDigits(lakh)} Lakh` : '',
      thousand ? `${threeDigits(thousand)} Thousand` : '',
      rest ? threeDigits(rest) : ''
    ].filter(Boolean);

    return `${parts.join(' ')} Rupees Only`;
  }

  editQuotation() {
    this.router.navigate(['/quotations/edit', this.quotationId]);
  }

  createWorkOrder() {
    this.router.navigate(['/work-orders/add'], { queryParams: { quotationId: this.quotationId } });
  }

  cancel() {
    this.router.navigateByUrl('/quotations');
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

  displayDate(value: string | Date) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }
}
