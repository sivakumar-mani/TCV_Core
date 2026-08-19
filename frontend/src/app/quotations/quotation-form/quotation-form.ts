import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CustomerServices } from '../../services/customer-services';
import { EmployeeServices } from '../../services/employee-services';
import { ProductService } from '../../services/product-service';
import { QuotationServices } from '../../services/quotation-services';
import { CommonMethods } from '../../shared/common-methods';
import { InputFormField } from '../../shared/input-form-field/input-form-field';
import { SelectFormField } from '../../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-quotation-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './quotation-form.html',
  styleUrl: './quotation-form.scss',
})
export class QuotationForm implements OnDestroy {
  quotationForm!: FormGroup;
  customers: any[] = [];
  employees: any[] = [];
  products: any[] = [];
  customerOptionList: { label: string; value: string | number }[] = [{ label: 'Select customer', value: '' }];
  employeeOptionList: { label: string; value: string | number }[] = [{ label: 'Select employee', value: '' }];
  productSearchTerms: string[] = [];
  activeProductDropdownIndex: number | null = null;
  activeProductInputElement: Element | null = null;
  productDropdownStyle: Record<string, string> = {};
  quotation: any;
  isEditMode = false;
  isPreviewMode = false;
  quotationId!: number;
  private readonly handleAnyScroll = () => this.refreshProductDropdownPosition();

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
    document.addEventListener('scroll', this.handleAnyScroll, true);
  }

  ngOnDestroy() {
    document.removeEventListener('scroll', this.handleAnyScroll, true);
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
    return this.isPreviewMode && Boolean(this.quotation);
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
      const customerId = this.route.snapshot.queryParamMap.get('customerId');
      if (customerId) this.quotationForm.patchValue({ customer_id: customerId });
      this.quotationService.getNextQuotationNo().subscribe({
        next: (response: any) => this.quotationForm.get('quotation_no')?.setValue(response?.quotation_no || ''),
        error: (error: any) => this.commonMethods.handleError(error)
      });
    }
  }

  loadCustomers() {
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
  }

  loadProducts() {
    this.productService.getProduct().subscribe({
      next: (response: any) => {
        this.products = Array.isArray(response) ? response : response.data ?? [];
        this.syncProductSearchTerms();
      },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadEmployees() {
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => {
        this.employees = Array.isArray(response) ? response : response.data ?? [];
        this.employeeOptionList = [
          { label: 'Select employee', value: '' },
          ...this.employees.map((employee) => ({
            label: employee.employee_name,
            value: employee.employee_id
          }))
        ];
      },
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
        this.productSearchTerms = [];
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
    this.productSearchTerms.push(item.product_name || item.item_name || '');
    this.syncProductSearchTerms();
  }

  removeItem(index: number) {
    if (this.items.length === 1) return;
    this.items.removeAt(index);
    this.productSearchTerms.splice(index, 1);
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

  openProductDropdown(index: number, event?: Event) {
    this.setProductDropdownPosition(event?.target as HTMLElement | null);
    this.activeProductDropdownIndex = index;
  }

  toggleProductDropdown(index: number, event: MouseEvent) {
    event.preventDefault();
    const input = (event.currentTarget as HTMLElement).closest('.product-search')?.querySelector('input');
    if (this.activeProductDropdownIndex === index) {
      this.closeProductDropdown();
      return;
    }

    this.setProductDropdownPosition(input);
    this.activeProductDropdownIndex = index;
  }

  scheduleProductDropdownClose() {
    setTimeout(() => this.closeProductDropdown(), 120);
  }

  onProductSearch(index: number, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.productSearchTerms[index] = value;
    this.setProductDropdownPosition(event.target as HTMLElement);
    this.activeProductDropdownIndex = index;
    this.items.at(index).patchValue({ product_id: '' });
  }

  setProductDropdownPosition(element: Element | null | undefined) {
    if (!element) return;

    this.activeProductInputElement = element;
    const rect = element.getBoundingClientRect();
    const viewportPadding = 8;
    const dropdownGap = 2;
    const menuMaxHeight = 240;
    const menuMinHeight = 120;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (!element.isConnected || rect.bottom < 0 || rect.top > viewportHeight) {
      this.closeProductDropdown();
      return;
    }

    const width = Math.min(rect.width, viewportWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      Math.max(viewportPadding, viewportWidth - width - viewportPadding)
    );
    const belowSpace = viewportHeight - rect.bottom - dropdownGap - viewportPadding;
    const aboveSpace = rect.top - dropdownGap - viewportPadding;
    const openAbove = belowSpace < menuMinHeight && aboveSpace > belowSpace;
    const availableHeight = openAbove ? aboveSpace : belowSpace;
    const maxHeight = Math.max(menuMinHeight, Math.min(menuMaxHeight, availableHeight));
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - dropdownGap - maxHeight)
      : Math.min(rect.bottom + dropdownGap, viewportHeight - viewportPadding - maxHeight);

    this.productDropdownStyle = {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`
    };
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  refreshProductDropdownPosition() {
    if (this.activeProductDropdownIndex === null || !this.activeProductInputElement) return;
    this.setProductDropdownPosition(this.activeProductInputElement);
  }

  closeProductDropdown() {
    this.activeProductDropdownIndex = null;
    this.activeProductInputElement = null;
  }

  productSearchValue(index: number) {
    if (this.activeProductDropdownIndex === index) return this.productSearchTerms[index] || '';

    const row = this.items.at(index) as FormGroup;
    const selectedProduct = this.products.find((item) => Number(item.product_id) === Number(row.get('product_id')?.value));
    return selectedProduct?.product_name || this.productSearchTerms[index] || '';
  }

  filteredProducts(index: number) {
    const searchTerm = String(this.productSearchTerms[index] || '').trim().toLowerCase();
    if (!searchTerm) return this.products.slice(0, 20);

    return this.products
      .filter((product) => String(product.product_name || '').toLowerCase().includes(searchTerm))
      .slice(0, 20);
  }

  selectProduct(index: number, product: any) {
    const row = this.items.at(index) as FormGroup;
    this.productSearchTerms[index] = product.product_name || '';
    row.patchValue({
      product_id: product.product_id,
      item_name: product.product_name,
      description: product.description || '',
      selling_price: Number(product.selling_price ?? product.price ?? 0),
      tax_percent: Number(product.gst_percent ?? 0)
    });
    this.closeProductDropdown();
  }

  selectCustomProduct(index: number) {
    this.productSearchTerms[index] = '';
    this.items.at(index).patchValue({ product_id: '' });
    this.closeProductDropdown();
  }

  syncProductSearchTerms() {
    this.items.controls.forEach((control, index) => {
      const productId = control.get('product_id')?.value;
      if (!productId) return;

      const product = this.products.find((item) => Number(item.product_id) === Number(productId));
      if (product) this.productSearchTerms[index] = product.product_name || '';
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
    const pageWidth = pageRight - pageLeft;
    const tableTop = 614;
    const headerHeight = 24;
    const rowHeight = 24;
    const visibleItems = (quotation.items || []).slice(0, 10);
    const itemRows = Math.max(visibleItems.length, 1);
    const tableBottom = tableTop - headerHeight - rowHeight * itemRows;
    const descriptionRight = 311;
    const qtyRight = 367;
    const rateRight = 453;
    const amountRight = pageRight;

    this.pdfText(commands, pageLeft, 785, 22, 'TCV');
    this.pdfText(commands, pageLeft, 765, 9, 'No:2/3, Second Street, Arkeeswarar Colony');
    this.pdfText(commands, pageLeft, 751, 9, 'Chrompet, Chennai - 600044');
    this.pdfText(commands, pageLeft, 737, 9, 'Contact # : 9962543540');

    this.pdfLine(commands, pageLeft, 718, pageRight, 718);
    this.pdfText(commands, 267, 704, 15, 'Quotation');
    this.pdfLine(commands, pageLeft, 694, pageRight, 694);

    this.pdfFillStrokeRect(commands, pageLeft, 630, 248, 54, 241, 241, 241);
    this.pdfFillStrokeRect(commands, 307, 630, 248, 54, 241, 241, 241);
    this.pdfText(commands, pageLeft + 12, 667, 9, 'To:');
    this.pdfText(commands, pageLeft + 36, 667, 9, String(quotation.customer_name || '-').slice(0, 32));
    this.pdfText(commands, pageLeft + 36, 653, 8, String(quotation.address || '-').slice(0, 42));
    this.pdfText(commands, pageLeft + 36, 639, 8, `Contact #: ${quotation.phone || ''}`.slice(0, 42));
    this.pdfText(commands, 321, 667, 9, 'Quotation#');
    this.pdfText(commands, 408, 667, 9, String(quotation.quotation_no || ''));
    this.pdfText(commands, 321, 651, 9, 'Quotation Date');
    this.pdfText(commands, 408, 651, 9, String(quotation.quotation_date || ''));
    this.pdfText(commands, 321, 637, 9, 'Valid Until');
    this.pdfText(commands, 408, 637, 9, String(quotation.valid_until || ''));

    this.pdfFillStrokeRect(commands, pageLeft, tableTop - headerHeight, pageWidth, headerHeight, 212, 212, 212);
    this.pdfRect(commands, pageLeft, tableBottom, pageWidth, tableTop - tableBottom);
    [descriptionRight, qtyRight, rateRight].forEach((x) => this.pdfLine(commands, x, tableBottom, x, tableTop));
    this.pdfLine(commands, pageLeft, tableTop - headerHeight, pageRight, tableTop - headerHeight);
    for (let y = tableTop - headerHeight - rowHeight; y >= tableBottom; y -= rowHeight) {
      this.pdfLine(commands, pageLeft, y, pageRight, y);
    }

    this.pdfText(commands, pageLeft + 8, tableTop - 16, 9, 'Item #  Description');
    this.pdfRightText(commands, qtyRight - 8, tableTop - 16, 9, 'Qty');
    this.pdfRightText(commands, rateRight - 8, tableTop - 16, 9, 'Rate');
    this.pdfRightText(commands, amountRight - 8, tableTop - 16, 9, 'Amount');

    visibleItems.forEach((item: any, index: number) => {
      const y = tableTop - headerHeight - rowHeight * index - 16;
      this.pdfText(commands, pageLeft + 8, y, 9, `${index + 1}.`);
      this.pdfText(commands, pageLeft + 38, y, 9, String(item.item_name || '').slice(0, 38));
      this.pdfRightText(commands, qtyRight - 8, y, 9, this.decimal(item.qty));
      this.pdfRightText(commands, rateRight - 8, y, 9, this.quoteNumber(item.selling_price, 0));
      this.pdfRightMoney(commands, amountRight - 8, y, 9, item.amount);
    });

    const summaryTop = tableBottom;
    const summaryBottom = 180;
    const totalsLeft = 330;
    const totalsWidth = pageRight - totalsLeft;
    const totalsRowHeight = 17;

    this.pdfRect(commands, pageLeft, summaryBottom, pageWidth, summaryTop - summaryBottom);
    this.pdfLine(commands, totalsLeft, summaryBottom, totalsLeft, summaryTop);
    this.pdfText(commands, pageLeft + 10, summaryTop - 18, 10, 'Terms and Conditions');
    [
      'One Year service warranty for camera, DVR and Hard Disk.',
      'No burning warranty for any product.',
      'No replacement No exchange.',
      'Prices are subjected to change.',
      '50% advance payment along with confirmation of order.',
      'Free service support during the warranty period.'
    ].forEach((term, index) => {
      this.pdfText(commands, pageLeft + 16, summaryTop - 36 - index * 13, 7, `${index + 1}. ${term}`.slice(0, 64));
    });
    const contactLine = `For any enquiries, email us on ${quotation.prepared_by_email || 'timecablevision@gmail.com'} or call us on ${quotation.prepared_by_phone || '9876543210'}`;
    this.pdfText(commands, pageLeft + 10, summaryBottom + 12, 8, contactLine.slice(0, 72));

    [
      ['Sub Total', quotation.total_amount, false],
      ['Discount', quotation.discount_amount, true],
      ['Tax', quotation.tax_amount, false],
      ['Total', quotation.net_amount, false]
    ].forEach(([label, value], index) => {
      const rowTop = summaryTop - totalsRowHeight * index;
      const rowBottom = rowTop - totalsRowHeight;
      this.pdfFillStrokeRect(commands, totalsLeft, rowBottom, totalsWidth, totalsRowHeight, index === 3 ? 238 : 247, index === 3 ? 238 : 247, index === 3 ? 238 : 247);
      this.pdfText(commands, totalsLeft + 8, rowBottom + 5, 9, String(label));
      this.pdfRightMoney(commands, pageRight - 8, rowBottom + 5, 9, value as number | string, Boolean(index === 1));
    });

    this.pdfText(commands, totalsLeft + 8, summaryTop - 80, 8, 'Invoice Total (in words)');
    this.pdfText(commands, totalsLeft + 8, summaryTop - 96, 8, this.amountInWords(quotation.net_amount).slice(0, 50));
    this.pdfLine(commands, totalsLeft + 115, summaryBottom + 35, pageRight - 20, summaryBottom + 35);
    this.pdfText(commands, totalsLeft + 125, summaryBottom + 20, 8, 'Authorized Signature');

    const content = `${commands.join('\n')}\n`;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${this.pdfByteLength(content)} >> stream\n${content}endstream endobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object) => {
      offsets.push(this.pdfByteLength(pdf));
      pdf += `${object}\n`;
    });
    const xrefOffset = this.pdfByteLength(pdf);
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

  pdfRightMoney(commands: string[], rightX: number, y: number, size: number, value: number | string, negative = false) {
    const numberText = this.quoteNumber(value, 0);
    const numberWidth = numberText.length * size * 0.52;
    const symbolSize = size * 0.78;
    const symbolText = `${negative ? '- ' : ''}₹`;
    const symbolWidth = symbolText.length * symbolSize * 0.52;
    const numberX = Number((rightX - numberWidth).toFixed(2));
    const symbolX = Number((numberX - symbolWidth - 3).toFixed(2));
    this.pdfTextColor(commands, symbolX, y + 0.4, symbolSize, symbolText, 0.47, 0.47, 0.47);
    this.pdfText(commands, numberX, y, size, numberText);
  }

  pdfLine(commands: string[], x1: number, y1: number, x2: number, y2: number) {
    commands.push(`q 0.72 0.72 0.72 RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  }

  pdfRect(commands: string[], x: number, y: number, width: number, height: number) {
    commands.push(`q 0.72 0.72 0.72 RG 0.6 w ${x} ${y} ${width} ${height} re S Q`);
  }

  pdfTextColor(commands: string[], x: number, y: number, size: number, value: string, red: number, green: number, blue: number) {
    commands.push(`q ${red} ${green} ${blue} rg BT /F1 ${size} Tf ${x} ${y} Td (${this.escapePdf(String(value))}) Tj ET Q`);
  }

  pdfFillRect(commands: string[], x: number, y: number, width: number, height: number, red: number, green: number, blue: number) {
    commands.push(`q ${(red / 255).toFixed(3)} ${(green / 255).toFixed(3)} ${(blue / 255).toFixed(3)} rg ${x} ${y} ${width} ${height} re f Q`);
  }

  pdfFillStrokeRect(commands: string[], x: number, y: number, width: number, height: number, red: number, green: number, blue: number) {
    commands.push(`q ${(red / 255).toFixed(3)} ${(green / 255).toFixed(3)} ${(blue / 255).toFixed(3)} rg ${x} ${y} ${width} ${height} re f Q`);
    this.pdfRect(commands, x, y, width, height);
  }

  escapePdf(value: string) {
    return value.replace(/[^\x20-\x7E₹]/g, '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  pdfByteLength(value: string) {
    return new TextEncoder().encode(value).length;
  }

  decimal(value: number | string) {
    return this.toNumber(value).toFixed(2);
  }

  pdfMoney(value: number | string) {
    return `Rs. ${new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(this.toNumber(value))}`;
  }

  quoteNumber(value: number | string, fractionDigits = 2) {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(this.toNumber(value));
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
