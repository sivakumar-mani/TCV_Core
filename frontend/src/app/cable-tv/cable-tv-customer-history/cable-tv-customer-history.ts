import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { CommonMethods } from '../../shared/common-methods';
import { PermissionService } from '../../services/permission.service';

type Section = 'connections' | 'stbs' | 'packages' | 'subscriptions';

@Component({
  selector: 'app-cable-tv-customer-history',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './cable-tv-customer-history.html',
  styleUrl: './cable-tv-customer-history.scss'
})
export class CableTvCustomerHistory {
  customerId = 0;
  section: Section = 'connections';
  customer: any = {};
  details: any = {};
  lookups: any = {};
  rows: any[] = [];
  form!: FormGroup;
  showModal = false;
  editId = 0;

  readonly titles: Record<Section, string> = {
    connections: 'Connection Details',
    stbs: 'STB Details',
    packages: 'Package Details',
    subscriptions: 'Subscription Details'
  };
  readonly connectionTypes = ['RECONNECTION', 'SHIFTED', 'TRANSFERRED', 'NEW'];
  readonly stbTypes = ['FAULT', 'DAMAGED', 'NEW', 'UPGRADE'];
  readonly stbStatuses = ['ACTIVE', 'RETRIEVED', 'FAULT', 'DISCONNECTED'];
  readonly previousStbStatuses = ['FAULT', 'UPGRADE', 'DISCONNECTED'];
  readonly months = Array.from({ length: 12 }, (_value, index) => ({
    value: index + 1,
    label: new Date(2026, index, 1).toLocaleString('en-US', { month: 'long' })
  }));

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    public permissions: PermissionService
  ) {}

  ngOnInit() {
    this.customerId = Number(this.route.snapshot.paramMap.get('id'));
    this.section = (this.route.snapshot.paramMap.get('section') || 'connections') as Section;
    this.buildForm();
    this.loadData();
  }

  get title() { return this.titles[this.section]; }
  get materials(): FormArray { return this.form.get('materials') as FormArray; }
  get stbAccessories(): FormArray { return this.form.get('accessories') as FormArray; }
  get addButtonLabel() { return this.section === 'connections' ? 'Add Connection Details' : `Add ${this.title}`; }
  get latestConnection() { return (this.details.connections || [])[0] || {}; }
  get latestStb() { return (this.details.stbs || [])[0] || {}; }
  get currentActiveStb() {
    return (this.details.stbs || []).find((item: any) => String(item.status || '').toUpperCase() === 'ACTIVE') || {};
  }
  get headerStatus() { return this.latestStb.status || this.customer.status || 'Pending'; }
  get headerStbNo() { return this.latestStb.stb_no || '-'; }
  get headerDate() { return this.latestStb.installed_date || this.latestConnection.connection_date || this.customer.installation_date || ''; }
  get headerAddress() {
    return [this.customer.door_no, this.customer.street_name, this.customer.area_name, this.customer.city]
      .filter(Boolean)
      .join(', ') || '-';
  }

  buildForm() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.section === 'connections') {
      this.form = this.fb.group({
        connection_date: [today, Validators.required],
        connection_type: ['RECONNECTION', Validators.required],
        installed_by_employee_id: [null, this.permissions.isAdmin() ? Validators.required : []],
        connection_charge: [0],
        connection_discount: [0],
        labour_service_charge: [0],
        customer_paid_amount: [0],
        balance_amount: [0],
        due_date: [''],
        status: ['ACTIVE'],
        remarks: [''],
        materials: this.fb.array([this.createMaterialRow()])
      });
      this.watchBalance(['connection_charge', 'connection_discount', 'labour_service_charge', 'customer_paid_amount']);
      return;
    }
    if (this.section === 'stbs') {
      this.form = this.fb.group({
        current_stb_no: [this.currentActiveStb.stb_no || ''],
        previous_status: [''],
        stb_master_id: [null],
        stb_no: ['', Validators.required],
        stb_type: ['NEW', Validators.required],
        stb_amount: [0],
        stb_discount: [0],
        installed_date: [today],
        installed_by_employee_id: [null, this.permissions.isAdmin() ? Validators.required : []],
        customer_paid_amount: [0],
        balance_amount: [0],
        due_date: [''],
        status: ['ACTIVE', Validators.required],
        accessories: this.fb.array([])
      });
      this.buildStbAccessoryRows();
      if (this.currentActiveStb.stb_no) this.form.get('previous_status')?.setValidators([Validators.required]);
      this.watchBalance(['stb_amount', 'stb_discount', 'customer_paid_amount']);
      return;
    }
    if (this.section === 'packages') {
      this.form = this.fb.group({
        package_id: [null, Validators.required],
        package_price: [0],
        start_date: [today],
        end_date: [''],
        is_active: [1]
      });
      return;
    }
    this.form = this.fb.group({
      customer_package_id: [null, Validators.required],
      subscription_month: [Number(today.slice(5, 7))],
      subscription_year: [Number(today.slice(0, 4))],
      start_date: [today],
      expiry_date: [today],
      collect_date: [today],
      amount: [0],
      paid_amount: [0],
      balance_amount: [0],
      due_date: [''],
      payment_mode: ['CASH'],
      remarks: ['']
    });
  }

  createMaterialRow(data: any = {}) {
    return this.fb.group({
      product_id: [data.product_id || null],
      item_name: [data.item_name || ''],
      qty: [data.qty || 1],
      unit: [data.unit || 'PCS'],
      unit_rate: [data.unit_rate || 0],
      amount: [data.amount || 0]
    });
  }

  buildStbAccessoryRows(selectedAccessories: any[] = []) {
    const accessories = this.stbAccessories;
    if (!accessories) return;
    accessories.clear();
    (this.lookups.stbAccessories || []).forEach((product: any) => {
      const selected = selectedAccessories.find((item: any) => Number(item.product_id) === Number(product.product_id));
      accessories.push(this.fb.group({
        product_id: [product.product_id],
        product_name: [product.product_name],
        available_qty: [Number(product.available_qty) || 0],
        unit: [product.unit || 'PCS'],
        qty: [selected?.qty || 1],
        selected: [!!selected]
      }));
    });
  }

  loadData() {
    this.ngxLoader.start();
    this.cableTvService.getLookups().subscribe({
      next: (lookups: any) => {
        this.lookups = lookups || {};
        this.cableTvService.getCustomerById(this.customerId).subscribe({
          next: (response: any) => {
            this.ngxLoader.stop();
            this.details = response || {};
            this.customer = response.customer || {};
            this.refreshRows();
          },
          error: (error: any) => this.handleError(error)
        });
      },
      error: (error: any) => this.handleError(error)
    });
  }

  refreshRows() {
    const map: Record<Section, any[]> = {
      connections: this.details.connections || [],
      stbs: this.details.stbs || [],
      packages: this.details.customerPackages || [],
      subscriptions: this.details.subscriptions || []
    };
    this.rows = map[this.section];
  }

  openAdd() {
    this.editId = 0;
    this.buildForm();
    this.showModal = true;
  }

  goBack() {
    this.router.navigate(['/cable-tv/customers'], { queryParams: { customerId: this.customerId } });
  }

  edit(row: any) {
    this.editId = this.idFor(row);
    this.buildForm();
    this.form.patchValue(row);
    if (this.section === 'connections') {
      this.materials.clear();
      (this.details.materials || [])
        .filter((item: any) => Number(item.connection_id) === Number(row.connection_id))
        .forEach((item: any) => this.materials.push(this.createMaterialRow(item)));
      if (!this.materials.length) this.materials.push(this.createMaterialRow());
    }
    if (this.section === 'stbs') {
      this.buildStbAccessoryRows((this.details.stbAccessories || [])
        .filter((item: any) => Number(item.customer_stb_id) === Number(row.customer_stb_id)));
    }
    this.showModal = true;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.ngxLoader.start();
    const payload = this.form.getRawValue();
    const request = this.requestForSave(payload);
    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.showModal = false;
        this.loadData();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  requestForSave(payload: any): any {
    if (this.section === 'connections') {
      return this.editId
        ? this.cableTvService.updateCustomerConnection(this.customerId, this.editId, payload)
        : this.cableTvService.addCustomerConnection(this.customerId, payload);
    }
    if (this.section === 'stbs') {
      return this.editId
        ? this.cableTvService.updateCustomerStb(this.customerId, this.editId, payload)
        : this.cableTvService.addCustomerStb(this.customerId, payload);
    }
    if (this.section === 'packages') {
      return this.editId
        ? this.cableTvService.updateCustomerPackage(this.customerId, this.editId, payload)
        : this.cableTvService.addCustomerPackage(this.customerId, payload);
    }
    return this.editId
      ? this.cableTvService.updateCustomerSubscription(this.customerId, this.editId, payload)
      : this.cableTvService.addCustomerSubscription(this.customerId, payload);
  }

  delete(row: any) {
    if (!confirm('Delete this record?')) return;
    this.ngxLoader.start();
    const id = this.idFor(row);
    const request = this.section === 'connections'
      ? this.cableTvService.deleteCustomerConnection(this.customerId, id)
      : this.section === 'stbs'
        ? this.cableTvService.deleteCustomerStb(this.customerId, id)
        : this.section === 'packages'
          ? this.cableTvService.deleteCustomerPackage(this.customerId, id)
          : this.cableTvService.deleteCustomerSubscription(this.customerId, id);
    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadData();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  idFor(row: any) {
    return Number(row.connection_id || row.customer_stb_id || row.customer_package_id || row.subscription_id);
  }

  addMaterialRow() { this.materials.push(this.createMaterialRow()); }
  removeMaterialRow(index: number) { if (this.materials.length > 1) this.materials.removeAt(index); }

  calculateMaterialAmount(index: number) {
    const row = this.materials.at(index) as FormGroup;
    const amount = (Number(row.get('qty')?.value) || 0) * (Number(row.get('unit_rate')?.value) || 0);
    row.patchValue({ amount: Number(amount.toFixed(2)) }, { emitEvent: false });
    this.calculateBalance();
  }

  watchBalance(paths: string[]) {
    paths.forEach((path) => this.form.get(path)?.valueChanges.subscribe(() => this.calculateBalance()));
    setTimeout(() => this.calculateBalance());
  }

  calculateBalance() {
    if (this.section === 'connections') {
      const materialCost = this.materials?.controls.reduce((sum, row) => sum + (Number(row.get('amount')?.value) || 0), 0) || 0;
      const total = (Number(this.form.get('connection_charge')?.value) || 0)
        + (Number(this.form.get('labour_service_charge')?.value) || 0)
        + materialCost
        - (Number(this.form.get('connection_discount')?.value) || 0);
      this.patchBalance(total);
    }
    if (this.section === 'stbs') {
      const total = (Number(this.form.get('stb_amount')?.value) || 0)
        - (Number(this.form.get('stb_discount')?.value) || 0);
      this.patchBalance(total);
    }
  }

  patchBalance(total: number) {
    const paid = Number(this.form.get('customer_paid_amount')?.value) || 0;
    const balance = Math.max(Number(total.toFixed(2)) - paid, 0);
    this.form.patchValue({ balance_amount: Number(balance.toFixed(2)) }, { emitEvent: false });
    if (balance <= 0) this.form.get('due_date')?.setValue('', { emitEvent: false });
  }

  selectPackage() {
    const selected = (this.lookups.packages || []).find((item: any) => Number(item.package_id) === Number(this.form.get('package_id')?.value));
    if (selected) this.form.patchValue({ package_price: Number(selected.price) || 0 });
  }

  selectStbMaster() {
    const selected = (this.lookups.stbMasters || []).find((item: any) => Number(item.stb_master_id) === Number(this.form.get('stb_master_id')?.value));
    if (!selected) return;
    this.form.patchValue({
      stb_no: selected.stb_number,
      stb_type: selected.stock_type || 'NEW',
      stb_amount: Number(selected.stb_amount) || 0,
      status: 'ACTIVE'
    });
  }

  private handleError(error: any) {
    this.ngxLoader.stop();
    this.commonMethods.handleError(error);
  }
}
