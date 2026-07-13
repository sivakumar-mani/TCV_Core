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
  readonly packageTypes = ['ADDON', 'ALACARTE', 'BROADCASTER'];
  readonly stbTypes = ['NEW', 'SERVICED', 'RETURNED'];
  readonly stbStatuses = ['ACTIVE', 'RETRIEVED', 'FAULT', 'DISCONNECTED', 'UPGRADE', 'RETURNED', 'FAULTY', 'REPLACED'];
  readonly stbReasons = [
    'REACTIVATE',
    'REPLACED',
    'UPGRADE',
    'REPLACE',
    'FAULT',
    'BROKEN',
    'BURNT',
    'DISCONNECT',
    'VACATED',
    'STB_LOST',
    'OUTSTATION'
  ];
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
    return (this.details.stbs || []).find((item: any) => String(item.status || '').toUpperCase() === 'ACTIVE') || this.latestStb || {};
  }
  get headerStatus() { return this.latestStb.status || this.customer.status || 'Pending'; }
  get headerStbNo() { return this.latestStb.stb_no || '-'; }
  get headerDate() { return this.latestStb.installed_date || this.latestConnection.connection_date || this.customer.installation_date || ''; }
  get isReplacementReason() { return String(this.form?.get('reason')?.value || '').toUpperCase() === 'REPLACED'; }
  get filteredStbMasters() {
    const selectedType = String(this.form?.get('stb_type')?.value || 'NEW').toUpperCase();
    return (this.lookups.stbMasters || []).filter((stb: any) => String(stb.stock_type || '').toUpperCase() === selectedType);
  }
  get filteredPackages() {
    const selectedType = String(this.form?.get('package_type')?.value || '').toUpperCase();
    const matches = (this.lookups.packages || []).filter((item: any) => this.normalizePackageType(item.package_type) === selectedType);
    return matches.length ? matches : (this.lookups.packages || []);
  }
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
        installed_by_employee_id: [null],
        connection_charge: [0],
        connection_discount: [0],
        labour_service_charge: [0],
        overall_discount: [0],
        customer_paid_amount: [0],
        balance_amount: [0],
        due_date: [''],
        status: ['ACTIVE'],
        remarks: [''],
        materials: this.fb.array([this.createMaterialRow()])
      });
      this.watchBalance(['connection_charge', 'connection_discount', 'labour_service_charge', 'overall_discount', 'customer_paid_amount']);
      return;
    }
    if (this.section === 'stbs') {
      this.form = this.fb.group({
        current_stb_no: [this.currentActiveStb.stb_no || ''],
        updated_date: [today, Validators.required],
        reason: ['DISCONNECT', Validators.required],
        remarks: ['', [Validators.maxLength(500)]],
        stb_master_id: [null],
        stb_no: [''],
        stb_type: ['NEW', Validators.required],
        stb_amount: [0],
        stb_discount: [0],
        labour_service_charge: [0],
        installed_by_employee_id: [null],
        customer_paid_amount: [0],
        balance_amount: [0],
        due_date: [''],
        overall_discount: [0],
        status: ['DISCONNECTED', Validators.required],
        accessories: this.fb.array([])
      });
      this.buildStbAccessoryRows();
      this.form.get('reason')?.valueChanges.subscribe(() => this.applyStbReasonState());
      this.form.get('stb_type')?.valueChanges.subscribe(() => this.resetSelectedStbIfTypeMismatch());
      this.watchBalance(['stb_amount', 'stb_discount', 'labour_service_charge', 'overall_discount', 'customer_paid_amount']);
      this.applyStbReasonState();
      return;
    }
    if (this.section === 'packages') {
      this.form = this.fb.group({
        package_type: ['ADDON', Validators.required],
        package_id: [null, Validators.required],
        package_price: [0],
        start_date: [today],
        end_date: [''],
        updated_by_employee_id: [null],
        is_active: [1]
      });
      this.form.get('package_type')?.valueChanges.subscribe(() => {
        this.form.patchValue({ package_id: null, package_price: 0 }, { emitEvent: false });
      });
      this.form.get('is_active')?.valueChanges.subscribe(() => this.applyPackageStatusPrice());
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
    if (this.section === 'packages') {
      this.form.patchValue({
        package_type: row.package_type || 'ADDON',
        package_id: Number(row.package_id) || null,
        package_price: Number(row.package_price) || 0,
        start_date: this.dateInputValue(row.start_date),
        end_date: this.dateInputValue(row.end_date),
        updated_by_employee_id: row.updated_by_employee_id || null,
        is_active: Number(row.is_active) === 1 ? 1 : 0
      }, { emitEvent: false });
      this.showModal = true;
      return;
    }
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
      this.form.patchValue({
        current_stb_no: this.currentActiveStb.stb_no || row.current_stb_no || row.stb_no || '',
        updated_date: row.updated_date || row.installed_date || new Date().toISOString().slice(0, 10),
        reason: row.update_reason || row.reason || 'REPLACED',
        remarks: row.reason_remarks || row.remarks || '',
        labour_service_charge: row.labour_service_charge || 0,
        overall_discount: row.overall_discount || 0
      }, { emitEvent: false });
      this.applyStbReasonState();
    }
    this.showModal = true;
  }

  save() {
    if (this.section === 'stbs') this.applyStbReasonState();
    this.calculateBalance();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.commonMethods.handleError({ error: { message: 'Please fill the required fields before saving' } });
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

  deactivatePackage(row: any) {
    if (!confirm('Deactivate this package?')) return;
    this.ngxLoader.start();
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      ...row,
      package_type: row.package_type || 'ADDON',
      package_price: 0,
      end_date: today,
      is_active: 0
    };
    this.cableTvService.updateCustomerPackage(this.customerId, Number(row.customer_package_id), payload).subscribe({
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

  selectMaterialProduct(index: number) {
    const row = this.materials.at(index) as FormGroup;
    const product = (this.lookups.products || []).find((item: any) => Number(item.product_id) === Number(row.get('product_id')?.value));
    if (!product) return;
    row.patchValue({
      item_name: product.product_name,
      unit: product.unit || 'PCS',
      unit_rate: Number(product.selling_price) || 0
    }, { emitEvent: false });
    this.calculateMaterialAmount(index);
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
        - (Number(this.form.get('connection_discount')?.value) || 0)
        - (Number(this.form.get('overall_discount')?.value) || 0);
      this.patchBalance(total);
    }
    if (this.section === 'stbs') {
      if (!this.isReplacementReason) return;
      const total = (Number(this.form.get('stb_amount')?.value) || 0)
        + (Number(this.form.get('labour_service_charge')?.value) || 0)
        - (Number(this.form.get('stb_discount')?.value) || 0)
        - (Number(this.form.get('overall_discount')?.value) || 0);
      this.patchBalance(total);
    }
  }

  patchBalance(total: number) {
    const paid = Number(this.form.get('customer_paid_amount')?.value) || 0;
    const balance = Math.max(Number(total.toFixed(2)) - paid, 0);
    this.form.patchValue({ balance_amount: Number(balance.toFixed(2)) }, { emitEvent: false });
    const dueDate = this.form.get('due_date');
    if (balance > 0) {
      dueDate?.setValidators([Validators.required]);
    } else {
      dueDate?.clearValidators();
      dueDate?.setValue('', { emitEvent: false });
    }
    dueDate?.updateValueAndValidity({ emitEvent: false });
  }

  connectionMaterialCost() {
    return this.materials?.controls.reduce((sum, row) => sum + (Number(row.get('amount')?.value) || 0), 0) || 0;
  }

  connectionTotal() {
    const total = (Number(this.form.get('connection_charge')?.value) || 0)
      + (Number(this.form.get('labour_service_charge')?.value) || 0)
      + this.connectionMaterialCost()
      - (Number(this.form.get('connection_discount')?.value) || 0)
      - (Number(this.form.get('overall_discount')?.value) || 0);
    return Math.max(Number(total.toFixed(2)), 0);
  }

  selectPackage() {
    const selected = (this.lookups.packages || []).find((item: any) => Number(item.package_id) === Number(this.form.get('package_id')?.value));
    if (selected && Number(this.form.get('is_active')?.value) === 1) this.form.patchValue({ package_price: Number(selected.price) || 0 });
  }

  applyPackageStatusPrice() {
    if (this.section !== 'packages' || !this.form) return;
    if (Number(this.form.get('is_active')?.value) !== 1) {
      this.form.patchValue({ package_price: 0 }, { emitEvent: false });
      return;
    }
    const selected = (this.lookups.packages || []).find((item: any) => Number(item.package_id) === Number(this.form.get('package_id')?.value));
    this.form.patchValue({ package_price: Number(selected?.price) || 0 }, { emitEvent: false });
  }

  packageStatusLabel(row: any) {
    if (String(row.approval_status || '').toUpperCase() === 'PENDING') return 'Pending';
    return Number(row.is_active) === 1 ? 'Active' : 'Removed';
  }

  normalizePackageType(value: any) {
    const type = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
    if (type === 'ALA_CARTE' || type === 'ALACARTE') return 'ALACARTE';
    if (type === 'BROADCAST' || type === 'BROADCASTER') return 'BROADCASTER';
    if (type === 'BROADCASTER') return 'BROADCASTER';
    return 'ADDON';
  }

  packageTypeLabel(type: string) {
    return this.normalizePackageType(type).replace('ALACARTE', 'Alacarte').replace('ADDON', 'Addon').replace('BROADCASTER', 'Broadcaster');
  }

  dateInputValue(value: any) {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
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

  resetSelectedStbIfTypeMismatch() {
    const selected = (this.lookups.stbMasters || []).find((item: any) => Number(item.stb_master_id) === Number(this.form.get('stb_master_id')?.value));
    const selectedType = String(this.form.get('stb_type')?.value || '').toUpperCase();
    if (selected && String(selected.stock_type || '').toUpperCase() !== selectedType) {
      this.form.patchValue({
        stb_master_id: null,
        stb_no: '',
        stb_amount: 0
      }, { emitEvent: false });
      this.calculateBalance();
    }
  }

  applyStbReasonState() {
    if (this.section !== 'stbs' || !this.form) return;
    const replacement = this.isReplacementReason;
    const stbNo = this.form.get('stb_no');
    const stbMaster = this.form.get('stb_master_id');
    if (replacement) {
      stbNo?.setValidators([Validators.required]);
      stbMaster?.setValidators([Validators.required]);
      this.form.patchValue({ status: 'ACTIVE' }, { emitEvent: false });
    } else {
      stbNo?.clearValidators();
      stbMaster?.clearValidators();
      this.form.patchValue({
        stb_master_id: null,
        stb_no: '',
        stb_amount: 0,
        stb_discount: 0,
        labour_service_charge: 0,
        customer_paid_amount: 0,
        balance_amount: 0,
        due_date: '',
        overall_discount: 0,
        status: this.form.get('reason')?.value === 'REACTIVATE' ? 'ACTIVE' : 'DISCONNECTED'
      }, { emitEvent: false });
      this.stbAccessories.controls.forEach((row) => row.patchValue({ selected: false }, { emitEvent: false }));
    }
    stbNo?.updateValueAndValidity({ emitEvent: false });
    stbMaster?.updateValueAndValidity({ emitEvent: false });
    this.calculateBalance();
  }

  reasonLabel(reason: string) {
    return String(reason || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  stbTotal() {
    const total = (Number(this.form.get('stb_amount')?.value) || 0)
      + (Number(this.form.get('labour_service_charge')?.value) || 0)
      - (Number(this.form.get('stb_discount')?.value) || 0)
      - (Number(this.form.get('overall_discount')?.value) || 0);
    return Math.max(Number(total.toFixed(2)), 0);
  }

  private handleError(error: any) {
    this.ngxLoader.stop();
    this.commonMethods.handleError(error);
  }
}
