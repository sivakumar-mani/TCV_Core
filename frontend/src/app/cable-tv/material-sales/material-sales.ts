import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-material-sales',
  imports: [CommonModule, FormsModule],
  templateUrl: './material-sales.html',
  styleUrl: './material-sales.scss'
})
export class MaterialSales {
  products: any[] = [];
  employees: any[] = [];
  technicianStock: any[] = [];
  movements: any[] = [];
  customerDirectories: Record<string, any[]> = { CATV: [], NET: [], CCTV: [] };
  customerSearch = '';
  showEntry = false;
  mappingMovement: any = null;
  customerMapping: any = { customer_type: 'CATV', customer_id: null };
  movement = this.emptyMovement();
  issueRows: any[] = [];
  saleRows: any[] = [];
  filters = { employee_id: '', movement_type: '', start_date: '', end_date: '' };
  movementTypes = ['ISSUE', 'SALE', 'FAULT', 'RETURN'];
  loggedInEmployeeId: number | null = null;

  constructor(
    private service: CableTvServices,
    private loader: NgxUiLoaderService,
    private snackbar: Snackbar,
    public permissions: PermissionService
  ) {}

  ngOnInit() { this.loadAll(); }

  emptyMovement(): any {
    return {
      movement_type: 'ISSUE', employee_id: null, product_id: null, qty: 1,
      unit_price: 0, commission_amount: 0, customer_type: 'CATV', customer_id: null,
      anonymous_name: '', anonymous_mobile: '', reason: '', remarks: '',
      movement_date: this.localDateTime()
    };
  }

  get selectedProduct() {
    return this.products.find(product => Number(product.product_id) === Number(this.movement.product_id));
  }

  get availableProducts() {
    if (this.permissions.isAdmin() || this.movement.movement_type === 'ISSUE') return this.products;
    const employeeId = Number(this.loggedInEmployeeId || this.movement.employee_id);
    const issuedProductIds = new Set(
      this.technicianStock
        .filter(row => Number(row.employee_id) === employeeId && Number(row.available_qty) > 0)
        .map(row => Number(row.product_id))
    );
    return this.products.filter(product => issuedProductIds.has(Number(product.product_id)));
  }

  get selectedTechnicianQty() {
    return Number(this.technicianStock.find(row =>
      Number(row.employee_id) === Number(this.movement.employee_id)
      && Number(row.product_id) === Number(this.movement.product_id)
    )?.available_qty || 0);
  }

  get grossSaleAmount() {
    return Number(this.movement.qty || 0) * Number(this.movement.unit_price || 0);
  }

  get netSaleAmount() {
    return Math.max(this.grossSaleAmount - Number(this.movement.commission_amount || 0), 0);
  }

  technicianProductQty(productId: number) {
    const employeeId = Number(this.loggedInEmployeeId || this.movement.employee_id);
    return Number(this.technicianStock.find(row =>
      Number(row.employee_id) === employeeId && Number(row.product_id) === Number(productId)
    )?.available_qty || 0);
  }

  get filteredCustomers() {
    const list = this.customerDirectories[this.movement.customer_type] || [];
    const search = this.customerSearch.trim().toLowerCase();
    if (!search) return list;
    return list.filter(customer => [
      customer.customer_code, customer.customer_name, customer.phone,
      customer.alternate_phone, customer.address
    ].some(value => String(value || '').toLowerCase().includes(search)));
  }

  get saleCustomerOptions() {
    return this.customerDirectories[this.movement.customer_type] || [];
  }

  get mappingCustomerOptions() {
    return this.customerDirectories[this.customerMapping.customer_type] || [];
  }

  customerOptionLabel(customer: any) {
    return [customer.customer_code, customer.customer_name, customer.phone, customer.address]
      .filter(Boolean).join(' - ');
  }

  selectCustomerFromSearch(value: string, target: 'SALE' | 'MAPPING') {
    const type = target === 'SALE' ? this.movement.customer_type : this.customerMapping.customer_type;
    const customer = (this.customerDirectories[type] || []).find(item =>
      this.customerOptionLabel(item).toLowerCase() === String(value || '').trim().toLowerCase()
    );
    if (target === 'SALE') this.movement.customer_id = customer?.customer_id || null;
    else this.customerMapping.customer_id = customer?.customer_id || null;
  }

  loadAll() {
    this.loader.start();
    forkJoin({
      lookups: this.service.getMaterialSalesLookups(),
      stock: this.service.getTechnicianMaterialStock(),
      movements: this.service.getMaterialMovements(this.filters),
      catv: this.service.getComplaintCustomers('CATV'),
      net: this.service.getComplaintCustomers('NET'),
      cctv: this.service.getComplaintCustomers('CCTV')
    }).subscribe({
      next: ({ lookups, stock, movements, catv, net, cctv }: any) => {
        this.loader.stop();
        this.products = lookups?.products || [];
        this.employees = lookups?.employees || [];
        this.loggedInEmployeeId = lookups?.logged_in_employee_id
          ? Number(lookups.logged_in_employee_id)
          : this.permissions.employeeId();
        if (!this.permissions.isAdmin() && this.loggedInEmployeeId) {
          this.filters.employee_id = String(this.loggedInEmployeeId);
        }
        this.technicianStock = Array.isArray(stock) ? stock : [];
        this.movements = Array.isArray(movements) ? movements : [];
        this.customerDirectories = { CATV: catv || [], NET: net || [], CCTV: cctv || [] };
      },
      error: error => this.handleError(error)
    });
  }

  openEntry(type: string) {
    if (!this.permissions.isAdmin() && type === 'ISSUE') return;
    this.movement = this.emptyMovement();
    this.movement.movement_type = type;
    this.issueRows = type === 'ISSUE' ? [this.emptyIssueRow()] : [];
    this.saleRows = type === 'SALE' ? [this.emptySaleRow()] : [];
    if (!this.permissions.isAdmin()) this.movement.employee_id = this.loggedInEmployeeId;
    this.customerSearch = '';
    this.showEntry = true;
  }

  closeEntry() { this.showEntry = false; }

  emptyIssueRow(): any {
    return {
      employee_id: null, product_id: null, material_search: '',
      qty: 1, movement_date: this.localDateTime(), remarks: ''
    };
  }

  addIssueRow() { this.issueRows.push(this.emptyIssueRow()); }

  removeIssueRow(index: number) {
    if (this.issueRows.length === 1) {
      this.issueRows[0] = this.emptyIssueRow();
      return;
    }
    this.issueRows.splice(index, 1);
  }

  productOptionLabel(product: any) {
    return `${product.product_code} - ${product.product_name} (Office: ${product.office_qty} ${product.unit || ''})`;
  }

  selectIssueProduct(row: any) {
    const search = String(row.material_search || '').trim().toLowerCase();
    const product = this.products.find(item =>
      this.productOptionLabel(item).toLowerCase() === search
      || String(item.product_code || '').toLowerCase() === search
    );
    row.product_id = product?.product_id || null;
  }

  emptySaleRow(): any {
    return {
      product_id: null, material_search: '', qty: 1, unit_price: 0,
      commission_amount: 0, remarks: ''
    };
  }

  addSaleRow() { this.saleRows.push(this.emptySaleRow()); }

  removeSaleRow(index: number) {
    if (this.saleRows.length === 1) this.saleRows[0] = this.emptySaleRow();
    else this.saleRows.splice(index, 1);
  }

  selectSaleProduct(row: any) {
    const search = String(row.material_search || '').trim().toLowerCase();
    const product = this.availableProducts.find(item =>
      this.saleProductLabel(item).toLowerCase() === search
      || String(item.product_code || '').toLowerCase() === search
    );
    row.product_id = product?.product_id || null;
    if (product) row.unit_price = Number(product.selling_price || 0);
  }

  saleProductLabel(product: any) {
    return `${product.product_code} - ${product.product_name} (Issued: ${this.technicianProductQty(product.product_id)} ${product.unit || ''})`;
  }

  saleRowGross(row: any) {
    return Number(row.qty || 0) * Number(row.unit_price || 0);
  }

  saleRowNet(row: any) {
    return Math.max(this.saleRowGross(row) - Number(row.commission_amount || 0), 0);
  }

  get saleGrossTotal() { return this.saleRows.reduce((sum, row) => sum + this.saleRowGross(row), 0); }
  get saleCommissionTotal() { return this.saleRows.reduce((sum, row) => sum + Number(row.commission_amount || 0), 0); }
  get salePendingTotal() { return this.saleRows.reduce((sum, row) => sum + this.saleRowNet(row), 0); }

  onProductChange() {
    if (this.selectedProduct && this.movement.movement_type === 'SALE') {
      this.movement.unit_price = Number(this.selectedProduct.selling_price || 0);
    }
  }

  onCustomerTypeChange() {
    this.customerSearch = '';
    this.movement.customer_id = null;
  }

  openCustomerMapping(row: any) {
    this.mappingMovement = row;
    this.customerMapping = { customer_type: 'CATV', customer_id: null };
    this.customerSearch = '';
  }

  closeCustomerMapping() { this.mappingMovement = null; }

  saveCustomerMapping() {
    if (!this.customerMapping.customer_id) {
      this.error('Select a customer');
      return;
    }
    const payload = {
      customer_type: this.customerMapping.customer_type,
      cable_customer_id: this.customerMapping.customer_type === 'CATV' ? this.customerMapping.customer_id : null,
      service_customer_id: ['NET', 'CCTV'].includes(this.customerMapping.customer_type) ? this.customerMapping.customer_id : null
    };
    this.loader.start();
    this.service.mapMaterialSaleCustomer(Number(this.mappingMovement.material_movement_id), payload).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.snackbar.openSnackbar(response.message, '');
        this.closeCustomerMapping();
        this.searchReport();
      },
      error: error => this.handleError(error)
    });
  }

  get mappingCustomers() {
    const list = this.customerDirectories[this.customerMapping.customer_type] || [];
    const search = this.customerSearch.trim().toLowerCase();
    if (!search) return list;
    return list.filter(customer => [customer.customer_code, customer.customer_name, customer.phone, customer.address]
      .some(value => String(value || '').toLowerCase().includes(search)));
  }

  save() {
    if (this.movement.movement_type === 'ISSUE') {
      this.saveIssueBatch();
      return;
    }
    if (this.movement.movement_type === 'SALE') {
      this.saveSaleBatch();
      return;
    }
    if (!this.movement.employee_id || !this.movement.product_id || Number(this.movement.qty) <= 0) {
      this.error('Technician, material and quantity are required');
      return;
    }
    if (this.movement.movement_type === 'FAULT' && !this.movement.reason?.trim()) {
      this.error('Fault reason is required');
      return;
    }
    if (this.movement.movement_type === 'SALE' && this.movement.customer_type !== 'ANONYMOUS' && !this.movement.customer_id) {
      this.error('Select a customer');
      return;
    }
    if (this.movement.movement_type === 'SALE' && Number(this.movement.commission_amount || 0) > this.grossSaleAmount) {
      this.error('Commission amount cannot exceed the gross sale amount');
      return;
    }
    const payload = {
      ...this.movement,
      cable_customer_id: this.movement.customer_type === 'CATV' ? this.movement.customer_id : null,
      service_customer_id: ['NET', 'CCTV'].includes(this.movement.customer_type) ? this.movement.customer_id : null,
      movement_date: this.mysqlDateTime(this.movement.movement_date)
    };
    this.loader.start();
    this.service.addMaterialMovement(payload).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.snackbar.openSnackbar(`${response.message} (${response.movement_no})`, '');
        this.closeEntry();
        this.loadAll();
      },
      error: error => this.handleError(error)
    });
  }

  saveIssueBatch() {
    const invalidIndex = this.issueRows.findIndex(row =>
      !row.employee_id || !row.product_id || Number(row.qty) <= 0
    );
    if (invalidIndex >= 0) {
      this.error(`Complete technician, material and quantity in row ${invalidIndex + 1}`);
      return;
    }
    this.loader.start();
    this.service.addMaterialIssueBatch(this.issueRows).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.snackbar.openSnackbar(response.message, '');
        this.closeEntry();
        this.loadAll();
      },
      error: error => this.handleError(error)
    });
  }

  saveSaleBatch() {
    if (!this.movement.employee_id) {
      this.error('Technician is required');
      return;
    }
    if (this.movement.customer_type !== 'ANONYMOUS' && !this.movement.customer_id) {
      this.error('Select a customer');
      return;
    }
    const invalidIndex = this.saleRows.findIndex(row =>
      !row.product_id || Number(row.qty) <= 0 || Number(row.unit_price) < 0
      || Number(row.commission_amount) < 0 || Number(row.commission_amount) > this.saleRowGross(row)
    );
    if (invalidIndex >= 0) {
      this.error(`Check material, quantity, price and commission in row ${invalidIndex + 1}`);
      return;
    }
    const payload = {
      employee_id: this.movement.employee_id,
      customer_type: this.movement.customer_type,
      cable_customer_id: this.movement.customer_type === 'CATV' ? this.movement.customer_id : null,
      service_customer_id: ['NET', 'CCTV'].includes(this.movement.customer_type) ? this.movement.customer_id : null,
      anonymous_name: this.movement.anonymous_name,
      anonymous_mobile: this.movement.anonymous_mobile,
      movement_date: this.mysqlDateTime(this.movement.movement_date),
      items: this.saleRows
    };
    this.loader.start();
    this.service.addMaterialSaleBatch(payload).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.snackbar.openSnackbar(response.message, '');
        this.closeEntry();
        this.loadAll();
      },
      error: error => this.handleError(error)
    });
  }

  searchReport() {
    this.loader.start();
    forkJoin({
      stock: this.service.getTechnicianMaterialStock(this.filters.employee_id),
      movements: this.service.getMaterialMovements(this.filters)
    }).subscribe({
      next: ({ stock, movements }: any) => {
        this.loader.stop();
        this.technicianStock = stock || [];
        this.movements = movements || [];
      },
      error: error => this.handleError(error)
    });
  }

  resetReport() {
    this.filters = {
      employee_id: !this.permissions.isAdmin() && this.loggedInEmployeeId ? String(this.loggedInEmployeeId) : '',
      movement_type: '', start_date: '', end_date: ''
    };
    this.searchReport();
  }

  printReport() { window.print(); }
  label(value: string) { return String(value || '').replaceAll('_', ' '); }
  localDateTime() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }
  mysqlDateTime(value: string) { return value ? `${value.replace('T', ' ')}:00` : null; }
  private error(message: string) { this.snackbar.openSnackbar(message, globalConstants.errorRegex); }
  private handleError(error: any) { this.loader.stop(); this.error(error?.error?.message || globalConstants.genericError); }
}
