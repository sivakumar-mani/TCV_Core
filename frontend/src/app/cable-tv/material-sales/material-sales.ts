import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';
import { PermissionService } from '../../services/permission.service';

@Component({ selector: 'app-material-sales', imports: [CommonModule, FormsModule], templateUrl: './material-sales.html', styleUrl: './material-sales.scss' })
export class MaterialSales {
  products: any[] = []; employees: any[] = []; technicianStock: any[] = [];
  issuedMaterials: any[] = []; adjustments: any[] = [];
  customerDirectories: Record<string, any[]> = { CATV: [], NET: [], CCTV: [] };
  loggedInEmployeeId: number | null = null;
  header = this.emptyHeader(); saleRows: any[] = [this.emptySaleRow()]; adjustment: any = null;

  constructor(private service: CableTvServices, private loader: NgxUiLoaderService, private snackbar: Snackbar, public permissions: PermissionService) {}
  ngOnInit() { this.loadAll(); }
  emptyHeader(): any { return {}; }
  emptySaleRow() { return { movement_date: this.today(), employee_id: this.permissions?.isAdmin() ? null : this.loggedInEmployeeId, product_id: null, material_search: '', qty: 1, unit_price: 0, commission_amount: 0, remarks: '' }; }

  loadAll() {
    this.loader.start();
    forkJoin({ lookups: this.service.getMaterialSalesLookups(), stock: this.service.getTechnicianMaterialStock(), issued: this.service.getIssuedMaterialSales(), adjustments: this.service.getMaterialSaleAdjustments(), catv: this.service.getComplaintCustomers('CATV'), net: this.service.getComplaintCustomers('NET'), cctv: this.service.getComplaintCustomers('CCTV') }).subscribe({
      next: ({ lookups, stock, issued, adjustments, catv, net, cctv }: any) => {
        this.loader.stop(); this.products = lookups?.products || []; this.employees = lookups?.employees || [];
        this.loggedInEmployeeId = lookups?.logged_in_employee_id ? Number(lookups.logged_in_employee_id) : this.permissions.employeeId();
        if (!this.permissions.isAdmin()) this.saleRows.forEach(row => row.employee_id = this.loggedInEmployeeId);
        this.technicianStock = stock || []; this.issuedMaterials = issued || []; this.adjustments = adjustments || [];
        this.customerDirectories = { CATV: catv || [], NET: net || [], CCTV: cctv || [] };
      }, error: error => this.handleError(error)
    });
  }

  materialLabel(product: any, row: any) { return `${product.product_name} (Available: ${this.availableQty(product.product_id)} ${product.unit || ''})`; }
  availableQty(productId: number) { return Number(this.products.find(product => Number(product.product_id) === Number(productId))?.office_qty || 0); }
  selectProduct(row: any) {
    const value = String(row.material_search || '').trim().toLowerCase();
    const product = this.products.find(item => this.materialLabel(item, row).toLowerCase() === value || String(item.product_name).toLowerCase() === value);
    row.product_id = product?.product_id || null; if (product) row.unit_price = Number(product.selling_price || 0);
  }
  onTechnicianChange(row: any) { row.product_id = null; row.material_search = ''; row.unit_price = 0; }
  onCustomerTypeChange(row: any) { row.customer_id = null; row.customer_search = ''; }
  customerOptions(row: any) { return this.customerDirectories[row.customer_type] || []; }
  customerLabel(customer: any) { return [customer.customer_code, customer.customer_name, customer.phone, customer.address].filter(Boolean).join(' - '); }
  selectCustomer(row: any) { const value = String(row.customer_search || '').trim().toLowerCase(); const customer = this.customerOptions(row).find(item => this.customerLabel(item).toLowerCase() === value); row.customer_id = customer?.customer_id || null; }
  addRow() { this.saleRows.push(this.emptySaleRow()); }
  removeRow(index: number) { this.saleRows.splice(index, 1); if (!this.saleRows.length) this.saleRows.push(this.emptySaleRow()); }
  rowTotal(row: any) { return Math.max((Number(row.unit_price) - Number(row.commission_amount)) * Number(row.qty), 0); }
  get grandTotal() { return this.saleRows.reduce((sum, row) => sum + this.rowTotal(row), 0); }

  save() {
    const invalid = this.saleRows.findIndex(row => !row.employee_id || !row.product_id || Number(row.qty) <= 0 || Number(row.qty) > this.availableQty(row.product_id) || Number(row.unit_price) < 0 || Number(row.commission_amount) < 0 || Number(row.commission_amount) > Number(row.unit_price));
    if (invalid >= 0) return this.error(`Check material, available quantity, price and commission in row ${invalid + 1}`);
    const rowsByTechnician = this.saleRows.reduce((groups: Map<number, any[]>, row: any) => {
      const employeeId = Number(row.employee_id);
      groups.set(employeeId, [...(groups.get(employeeId) || []), row]);
      return groups;
    }, new Map<number, any[]>());
    const requests = Array.from(rowsByTechnician.entries()).map(([employeeId, items]) =>
      this.service.addMaterialSaleBatch({ employee_id: employeeId, items })
    );
    this.loader.start();
    forkJoin(requests).subscribe({
      next: (responses: any[]) => { this.loader.stop(); const count = this.saleRows.length; this.snackbar.openSnackbar(`${count} material issue row${count === 1 ? '' : 's'} saved successfully`, ''); this.saleRows = [this.emptySaleRow()]; this.loadAll(); },
      error: error => this.handleError(error)
    });
  }
  sold(row: any) {
    const customerType = row.customer_type || 'ANONYMOUS';
    this.loader.start(); this.service.markMaterialSaleSold(row.material_movement_id, { customer_type: customerType, cable_customer_id: customerType === 'CATV' ? row.customer_id : null, service_customer_id: ['NET', 'CCTV'].includes(customerType) ? row.customer_id : null }).subscribe({ next: (response: any) => { this.loader.stop(); this.snackbar.openSnackbar(response.message, ''); this.loadAll(); }, error: error => this.handleError(error) });
  }
  openAdjustment(row: any, type: 'RETURN' | 'FAULT') { this.adjustment = { ...row, adjustment_type: type, adjustment_qty: 1, adjustment_remarks: '' }; }
  closeAdjustment() { this.adjustment = null; }
  saveAdjustment() {
    const qty = Number(this.adjustment?.adjustment_qty || 0);
    if (qty <= 0 || qty > Number(this.adjustment.available_adjustment_qty)) return this.error(`Quantity cannot exceed ${this.adjustment.available_adjustment_qty}`);
    this.loader.start(); this.service.requestMaterialSaleAdjustment(this.adjustment.material_movement_id, { adjustment_type: this.adjustment.adjustment_type, qty, remarks: this.adjustment.adjustment_remarks }).subscribe({ next: (response: any) => { this.loader.stop(); this.snackbar.openSnackbar(response.message, ''); this.closeAdjustment(); this.loadAll(); }, error: error => this.handleError(error) });
  }
  review(row: any, action: 'APPROVED' | 'REJECTED') {
    if (!confirm(`${action === 'APPROVED' ? 'Approve' : 'Reject'} this ${row.adjustment_type.toLowerCase()} request?`)) return;
    this.loader.start(); this.service.reviewMaterialSaleAdjustment(row.material_sale_adjustment_id, { action }).subscribe({ next: (response: any) => { this.loader.stop(); this.snackbar.openSnackbar(response.message, ''); this.loadAll(); }, error: error => this.handleError(error) });
  }
  today() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 10); }
  private error(message: string) { this.snackbar.openSnackbar(message, globalConstants.errorRegex); }
  private handleError(error: any) { this.loader.stop(); this.error(error?.error?.message || globalConstants.genericError); }
}
