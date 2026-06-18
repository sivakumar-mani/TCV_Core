import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CustomerServices } from '../services/customer-services';
import { ProductService } from '../services/product-service';
import { WarrantyServices } from '../services/warranty-services';
import { AgGridList } from '../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../shared/common-methods';
import { InputFormField } from '../shared/input-form-field/input-form-field';
import { ActionMenu } from '../shared/list-action-menu';
import { SelectFormField } from '../shared/select-form-field/select-form-field';
import { TextareaFormField } from '../shared/textarea-form-field/textarea-form-field';

@Component({
  selector: 'app-warranty-master',
  imports: [CommonModule, ReactiveFormsModule, AgGridList, InputFormField, SelectFormField, TextareaFormField],
  templateUrl: './warranty-master.html',
  styleUrl: './warranty-master.scss',
})
export class WarrantyMaster {
  form!: FormGroup;
  rows: any[] = [];
  customers: any[] = [];
  products: any[] = [];
  selectedId: number | null = null;
  warrantyTypes = ['MANUFACTURER', 'EXTENDED', 'VOID'];
  warrantyStatuses = ['ACTIVE', 'EXPIRED', 'CLAIMED', 'VOID'];

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'warranty_no', headerName: 'Warranty No' },
    { field: 'customer_name', headerName: 'Customer' },
    { field: 'product_name', headerName: 'Product' },
    { field: 'serial_no', headerName: 'Serial No' },
    { field: 'warranty_end_date', headerName: 'End Date', valueFormatter: (params) => this.displayDate(params.value) },
    { field: 'warranty_status', headerName: 'Status' },
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
    private warrantyService: WarrantyServices,
    private customerService: CustomerServices,
    private productService: ProductService,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods
  ) {}

  ngOnInit() {
    const today = new Date();
    const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    this.form = this.fb.group({
      warranty_no: [''],
      customer_id: ['', Validators.required],
      product_id: ['', Validators.required],
      sales_id: [''],
      serial_no: [''],
      warranty_start_date: [this.toInputDate(today), Validators.required],
      warranty_end_date: [this.toInputDate(nextYear), Validators.required],
      warranty_type: ['MANUFACTURER'],
      warranty_status: ['ACTIVE'],
      coverage_type: ['Parts and Labor'],
      warranty_cost: [0],
      claims_count: [0],
      remarks: ['']
    });
    this.loadLookups();
    this.loadRows();
  }

  loadLookups() {
    this.customerService.getCustomers().subscribe({ next: (r: any) => this.customers = Array.isArray(r) ? r : r.data ?? [], error: (e: any) => this.commonMethods.handleError(e) });
    this.productService.getProduct().subscribe({ next: (r: any) => this.products = Array.isArray(r) ? r : r.data ?? [], error: (e: any) => this.commonMethods.handleError(e) });
  }

  loadRows() {
    this.ngxLoader.start();
    this.warrantyService.getWarranties().subscribe({
      next: (response: any) => { this.ngxLoader.stop(); this.rows = response?.data ?? []; },
      error: (error: any) => { this.ngxLoader.stop(); this.commonMethods.handleError(error); }
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = { ...this.form.value, warranty_id: this.selectedId };
    const request = this.selectedId ? this.warrantyService.updateWarranty(payload) : this.warrantyService.addWarranty(payload);
    request.subscribe({
      next: (response: any) => { this.commonMethods.handleTokenAndMessage(response); this.reset(); this.loadRows(); },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  edit(row: any) {
    this.selectedId = row.warranty_id;
    this.form.patchValue({
      ...row,
      warranty_start_date: this.toInputDate(row.warranty_start_date),
      warranty_end_date: this.toInputDate(row.warranty_end_date)
    });
  }

  delete(row: any) {
    if (!confirm(`Delete warranty ${row.warranty_no}?`)) return;
    this.warrantyService.deleteWarranty({ warranty_id: row.warranty_id }).subscribe({
      next: (response: any) => { this.commonMethods.handleTokenAndMessage(response); this.loadRows(); },
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  reset() {
    const today = new Date();
    const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    this.selectedId = null;
    this.form.reset({ warranty_start_date: this.toInputDate(today), warranty_end_date: this.toInputDate(nextYear), warranty_type: 'MANUFACTURER', warranty_status: 'ACTIVE', coverage_type: 'Parts and Labor', warranty_cost: 0, claims_count: 0 });
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

  customerOptions() {
    return [
      { label: 'Select customer', value: '' },
      ...this.customers.map((customer) => ({
        label: customer.display_customer_name || customer.customer_name,
        value: customer.customer_id
      }))
    ];
  }

  productOptions() {
    return [
      { label: 'Select product', value: '' },
      ...this.products.map((product) => ({ label: product.product_name, value: product.product_id }))
    ];
  }

  optionList(values: string[]) {
    return values.map((value) => ({ label: value, value }));
  }
}
