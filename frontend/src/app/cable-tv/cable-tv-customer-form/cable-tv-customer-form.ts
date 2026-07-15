import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { CommonMethods } from '../../shared/common-methods';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-cable-tv-customer-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './cable-tv-customer-form.html',
  styleUrl: './cable-tv-customer-form.scss'
})
export class CableTvCustomerForm {
  form!: FormGroup;
  isEditMode = false;
  customerId = 0;
  lookups: any = {};
  filteredPostalAreas: any[] = [];
  filteredAreas: any[] = [];
  filteredStreets: any[] = [];
  showStbSearchOptions = false;

  readonly statusTypes = ['ACTIVE', 'INACTIVE', 'DISCONNECTED', 'SHIFTED', 'TRANSFERRED', 'RETRIEVED', 'FAULT', 'UPGRADE'];
  readonly stbStatuses = ['ACTIVE', 'RETRIEVED', 'FAULT', 'DISCONNECTED', 'UPGRADE'];
  readonly stbTypes = ['NEW', 'SERVICED', 'RETURNED'];
  readonly connectionTypes = ['NEW', 'SHIFTED', 'TRANSFERRED'];
  readonly accountStatuses = ['PENDING', 'RECEIVED'];
  readonly paymentTypes = ['DAY', 'MONTH', 'YEAR'];
  readonly periodCounts = Array.from({ length: 12 }, (_value, index) => index + 1);
  readonly yearOptions = Array.from({ length: 12 }, (_value, index) => new Date().getFullYear() + index);
  readonly sourceOptions = [
    { source_id: 'Direct', source_name: 'Direct' },
    { source_id: 'Customer Approach Office', source_name: 'Customer Approach Office' },
    { source_id: 'Customer Approach Engineer', source_name: 'Customer Approach Engineer' }
  ];
  readonly months = Array.from({ length: 12 }, (_value, index) => ({
    value: index + 1,
    label: new Date(2026, index, 1).toLocaleString('en-US', { month: 'long' })
  }));

  constructor(
    private fb: FormBuilder,
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    public permissions: PermissionService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.buildForm();
    this.setupDependencies();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.customerId = Number(id);
    }
    this.loadLookups();
  }

  get materials(): FormArray {
    return this.form.get('materials') as FormArray;
  }

  get packages(): FormArray {
    return this.form.get('packages') as FormArray;
  }

  buildForm() {
    const today = this.today();
    this.form = this.fb.group({
      network_id: [null, Validators.required],
      legacy_customer_no: [''],
      customer_code: [''],
      full_name: ['', Validators.required],
      door_no: ['', Validators.required],
      location_id: [null, Validators.required],
      area_id: [null, Validators.required],
      street_id: [null, Validators.required],
      city: ['Chennai', Validators.required],
      pincode: [''],
      mobile_no: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      aadhaar_no: ['', Validators.pattern(/^[0-9]{12}$/)],
      alternate_mobile_no: ['', Validators.pattern(/^[0-9]{10}$/)],
      source_id: ['Direct'],
      installed_by_employee_id: [null, this.permissions.isAdmin() ? Validators.required : []],
      labour_service_charge: [0],
      status: ['ACTIVE'],
      stb: this.fb.group({
        stb_master_id: [null],
        stb_search: [''],
        stb_type: ['NEW'],
        issue_mode: ['FULL_SET'],
        installed_mso_id: [null],
        exchange_original_mso_id: [null],
        stb_no: [''],
        stb_amount: [0],
        stb_discount: [0],
        labour_service_charge: [0],
        installed_date: [today],
        status: ['ACTIVE', Validators.required],
        accessories: this.fb.array([])
      }),
      connection: this.fb.group({
        connection_date: [today],
        disconnection_date: [''],
        connection_type: ['NEW'],
        connection_charge: [0],
        connection_discount: [0],
        labour_service_charge: [0],
        status: ['ACTIVE'],
        remarks: ['']
      }),
      materials: this.fb.array([this.createMaterialRow()]),
      packages: this.fb.array([this.createPackageRow()]),
      subscription: this.fb.group({
        payment_type: ['DAY', Validators.required],
        no_of_months: [1],
        no_of_years: [1],
        subscription_month: [Number(today.slice(5, 7))],
        subscription_year: [Number(today.slice(0, 4))],
        collect_date: [today],
        start_date: [today],
        expiry_date: [today],
        payment_mode: ['CASH'],
        payment_status: ['PENDING'],
        amount: [0],
        paid_amount: [0],
        balance_amount: [0],
        remarks: ['']
      }),
      account: this.fb.group({
        stb_amount: [0],
        stb_discount: [0],
        connection_amount: [0],
        connection_discount: [0],
        labor_amount: [0],
        material_cost: [0],
        material_discount: [0],
        subscription_amount: [0],
        sub_total: [0],
        discount: [0],
        overall_discount: [0],
        grand_total: [0],
        customer_paid_amount: [0],
        balance_amount: [0],
        due_date: [''],
        account_status: [{ value: 'PENDING', disabled: !this.permissions.isAdmin() }]
      })
    });
  }

  setupDependencies() {
    this.form.get('network_id')?.valueChanges.subscribe((networkId: number) => {
      this.refreshPostalAreaOptions(networkId);
      this.filteredAreas = [];
      this.filteredStreets = [];
      this.form.patchValue({ location_id: null, area_id: null, street_id: null, city: 'Chennai', pincode: '' }, { emitEvent: false });
    });

    this.form.get('location_id')?.valueChanges.subscribe((locationId: number) => {
      this.refreshAreaOptions(locationId);
      this.filteredStreets = [];
      this.form.patchValue({ area_id: null, street_id: null }, { emitEvent: false });
      const location = (this.lookups.locations || []).find((item: any) => Number(item.location_id) === Number(locationId));
      this.form.patchValue({ city: 'Chennai', pincode: location?.pincode || '' }, { emitEvent: false });
    });

    this.form.get('area_id')?.valueChanges.subscribe((areaId: number) => {
      this.filteredStreets = (this.lookups.streets || []).filter((street: any) => Number(street.area_id) === Number(areaId));
      this.form.patchValue({ street_id: null }, { emitEvent: false });
    });

    this.form.get('stb.stb_master_id')?.valueChanges.subscribe((stbMasterId: number) => this.selectStbMaster(stbMasterId));
    this.form.get('stb.issue_mode')?.valueChanges.subscribe(() => this.applyStbIssuePrice());
    this.form.get('stb.stb_type')?.valueChanges.subscribe(() => {
      this.form.get('stb')?.patchValue({
        stb_master_id: null,
        stb_search: '',
        installed_mso_id: null,
        stb_no: '',
        stb_amount: 0
      }, { emitEvent: false });
      this.account.patchValue({ stb_amount: 0 }, { emitEvent: false });
      this.calculateAccountTotals();
    });
    this.form.get('stb.installed_date')?.valueChanges.subscribe((value: string) => {
      this.form.get('connection.connection_date')?.setValue(value || this.today(), { emitEvent: false });
      this.packages.controls.forEach((row) => {
        row.get('start_date')?.setValue(value || this.today(), { emitEvent: false });
        this.calculatePackageRow(this.packages.controls.indexOf(row));
      });
    });
    this.form.get('stb.status')?.valueChanges.subscribe((value: string) => {
      this.form.get('status')?.setValue(value || 'ACTIVE', { emitEvent: false });
      this.form.get('connection.status')?.setValue(value === 'DISCONNECTED' ? 'DISCONNECTED' : 'ACTIVE', { emitEvent: false });
    });
    this.form.get('stb.stb_amount')?.valueChanges.subscribe((value: number) => {
      this.account.patchValue({ stb_amount: Number(value) || 0 }, { emitEvent: false });
      this.calculateAccountTotals();
    });
    this.form.get('stb.stb_discount')?.valueChanges.subscribe((value: number) => {
      this.account.patchValue({ stb_discount: Number(value) || 0 }, { emitEvent: false });
      this.calculateAccountTotals();
    });
    this.form.get('connection.connection_charge')?.valueChanges.subscribe((value: number) => {
      this.account.patchValue({ connection_amount: Number(value) || 0 }, { emitEvent: false });
      this.calculateAccountTotals();
    });
    this.form.get('connection.connection_discount')?.valueChanges.subscribe((value: number) => {
      this.account.patchValue({ connection_discount: Number(value) || 0 }, { emitEvent: false });
      this.calculateAccountTotals();
    });
    this.form.get('connection.labour_service_charge')?.valueChanges.subscribe((value: number) => {
      this.account.patchValue({ labor_amount: Number(value) || 0 }, { emitEvent: false });
      this.calculateAccountTotals();
    });
    ['account.customer_paid_amount', 'account.overall_discount', 'account.material_discount', 'account.account_status'].forEach((path) => {
      this.form.get(path)?.valueChanges.subscribe(() => this.calculateAccountTotals());
    });
    [
      'subscription.payment_type',
      'subscription.no_of_months',
      'subscription.no_of_years',
      'subscription.subscription_year',
      'subscription.start_date',
      'subscription.payment_status'
    ].forEach((path) => this.form.get(path)?.valueChanges.subscribe(() => this.applySubscriptionPeriod()));
  }

  get account(): FormGroup {
    return this.form.get('account') as FormGroup;
  }

  get stbAccessories(): FormArray {
    return this.form.get('stb.accessories') as FormArray;
  }

  get filteredStbMasters() {
    const selectedType = String(this.form?.get('stb.stb_type')?.value || '').toUpperCase();
    return (this.lookups.stbMasters || []).filter((stb: any) =>
      !selectedType || String(stb.stock_type || '').toUpperCase() === selectedType
    );
  }

  get filteredStbSearchOptions() {
    const searchValue = String(this.form?.get('stb.stb_search')?.value || '').trim().toLowerCase();
    if (!searchValue) return this.filteredStbMasters.slice(0, 20);
    return this.filteredStbMasters.filter((stb: any) =>
      [
        stb.stb_number,
        stb.box_type,
        stb.stock_type,
        stb.mso_name
      ].some((value) => String(value || '').toLowerCase().includes(searchValue))
    ).slice(0, 20);
  }

  get loggedInEmployee() {
    const employeeId = this.permissions.employeeId();
    const employeeCode = String(this.permissions.employeeCode() || this.permissions.username() || '').trim().toLowerCase();
    return (this.lookups.employees || []).find((employee: any) =>
      (employeeId && Number(employee.employee_id) === Number(employeeId))
      || String(employee.employee_code || '').trim().toLowerCase() === employeeCode
      || String(employee.employee_name || '').trim().toLowerCase() === employeeCode
    );
  }

  get loggedInEmployeeName() {
    const employee = this.loggedInEmployee;
    return employee?.employee_name || employee?.employee_code || '';
  }

  refreshPostalAreaOptions(networkId = this.form.get('network_id')?.value) {
    const mappedLocationIds = new Set(
      (this.lookups.areas || [])
        .filter((area: any) => Number(area.network_id) === Number(networkId))
        .map((area: any) => Number(area.location_id))
    );
    this.filteredPostalAreas = (this.lookups.locations || []).filter((location: any) =>
      mappedLocationIds.has(Number(location.location_id))
    );
  }

  refreshAreaOptions(locationId = this.form.get('location_id')?.value) {
    const networkId = this.form.get('network_id')?.value;
    this.filteredAreas = (this.lookups.areas || []).filter((area: any) =>
      Number(area.network_id) === Number(networkId)
      && Number(area.location_id) === Number(locationId)
    );
  }

  loadLookups() {
    this.ngxLoader.start();
    this.cableTvService.getLookups().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.lookups = response || {};
        const allowedNetworks = ['TCV', 'SVN', 'PAMMAL', 'LO'];
        this.lookups.networks = (this.lookups.networks || []).filter((network: any) =>
          allowedNetworks.includes(String(network.network_code).toUpperCase())
        );
        this.lookups.sources = this.normalizeSources(this.lookups.sources);
        this.lookups.installedMsos = this.lookups.installedMsos?.length
          ? this.lookups.installedMsos
          : (this.lookups.msos || []).filter((mso: any) => ['VK', 'DM'].includes(String(mso.mso_name).toUpperCase()));
        this.setLoggedInEmployee();
        this.refreshPostalAreaOptions();
        this.buildStbAccessoryRows();
        if (this.isEditMode) this.loadCustomerDetails();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  loadCustomerDetails() {
    this.ngxLoader.start();
    this.cableTvService.getCustomerById(this.customerId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const customer = response.customer || {};
        this.form.patchValue(customer);
        this.refreshPostalAreaOptions(customer.network_id);
        this.filteredAreas = (this.lookups.areas || []).filter((area: any) =>
          Number(area.network_id) === Number(customer.network_id)
          && Number(area.location_id) === Number(customer.location_id)
        );
        this.filteredStreets = (this.lookups.streets || []).filter((street: any) => Number(street.area_id) === Number(customer.area_id));
        if (response.stbs?.[0]) this.form.get('stb')?.patchValue(response.stbs[0]);
        if (response.stbAccessories?.length) this.buildStbAccessoryRows(response.stbAccessories);
        if (response.connections?.[0]) this.form.get('connection')?.patchValue(response.connections[0]);
        if (response.accounts?.[0]) this.account.patchValue(response.accounts[0]);
        if (!this.permissions.isAdmin()) this.account.get('account_status')?.setValue('PENDING', { emitEvent: false });
        if (response.customerPackages?.length) {
          this.packages.clear();
          response.customerPackages.forEach((item: any) => this.packages.push(this.createPackageRow(item)));
        }
        if (response.materials?.length) {
          this.materials.clear();
          response.materials.forEach((material: any) => this.materials.push(this.createMaterialRow(material)));
        }
        this.calculateSubscriptionTotals();
        this.calculateAccountTotals();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
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

  addMaterialRow() {
    this.materials.push(this.createMaterialRow());
  }

  removeMaterialRow(index: number) {
    if (this.materials.length > 1) this.materials.removeAt(index);
  }

  createPackageRow(data: any = {}) {
    const startDate = this.toDateInput(data.start_date) || this.subscriptionStartDate();
    const month = Number(data.subscription_month) || Number(startDate.slice(5, 7));
    const year = Number(data.subscription_year) || Number(startDate.slice(0, 4));
    const daysInMonth = this.daysInMonth(month, year);
    const endDate = this.toDateInput(data.end_date) || this.subscriptionExpiryDate(startDate);
    const row = this.fb.group({
      package_id: [data.package_id || null],
      package_price: [data.package_price || 0],
      start_date: [startDate],
      end_date: [endDate],
      billing_basis: [data.billing_basis || data.payment_type || this.form?.get('subscription.payment_type')?.value || 'DAY'],
      payment_status: [data.payment_status || this.form?.get('subscription.payment_status')?.value || 'PENDING'],
      subscription_month: [month],
      subscription_year: [year],
      days_in_month: [daysInMonth],
      number_of_days_or_months: [data.number_of_days_or_months || this.inclusiveDays(startDate, endDate)],
      amount: [data.amount || 0],
      paid_amount: [data.paid_amount || 0],
      balance_amount: [data.balance_amount || 0],
      is_active: [data.is_active ?? 1]
    });

    row.valueChanges.subscribe(() => this.calculatePackageRow(this.packages.controls.indexOf(row)));
    setTimeout(() => this.calculatePackageRow(this.packages.controls.indexOf(row)));
    return row;
  }

  addPackageRow() {
    this.packages.push(this.createPackageRow());
  }

  removePackageRow(index: number) {
    if (this.packages.length > 1) {
      this.packages.removeAt(index);
      this.calculateSubscriptionTotals();
    }
  }

  selectPackage(index: number) {
    const row = this.packages.at(index) as FormGroup;
    const packageId = row.get('package_id')?.value;
    const selectedPackage = (this.lookups.packages || []).find((item: any) => Number(item.package_id) === Number(packageId));
    if (!selectedPackage) return;
    row.patchValue({ package_price: Number(selectedPackage.price) || 0 });
    this.calculatePackageRow(index);
  }

  setLoggedInEmployee() {
    if (this.permissions.isAdmin()) return;
    const employee = this.loggedInEmployee;
    if (employee?.employee_id) {
      this.form.patchValue({ installed_by_employee_id: employee.employee_id }, { emitEvent: false });
    }
  }

  buildStbAccessoryRows(selectedAccessories: any[] = []) {
    this.stbAccessories.clear();
    const products = this.stbAccessoryProducts();
    const hasSavedSelection = selectedAccessories.length > 0;
    products.forEach((product: any) => {
      const selected = selectedAccessories.find((item: any) => Number(item.product_id) === Number(product.product_id));
      this.stbAccessories.push(this.fb.group({
        product_id: [product.product_id],
        product_name: [product.product_name],
        available_qty: [Number(product.available_qty) || 0],
        unit: [product.unit || 'PCS'],
        qty: [selected?.qty || 1],
        selected: [!!selected || (!hasSavedSelection && !this.isEditMode && this.isDefaultFullSetAccessory(product, products))]
      }));
    });
  }

  onStbAccessoryChange(index: number) {
    const selectedRow = this.stbAccessories.at(index);
    if (!selectedRow.get('selected')?.value) return;
    const category = this.stbAccessoryCategory(selectedRow.get('product_name')?.value);
    if (!category) return;

    this.stbAccessories.controls.forEach((row, rowIndex) => {
      if (rowIndex !== index && this.stbAccessoryCategory(row.get('product_name')?.value) === category) {
        row.get('selected')?.setValue(false, { emitEvent: false });
      }
    });
  }

  accessoryChoiceLabel(name: string) {
    const category = this.stbAccessoryCategory(name);
    return category === 'VIDEO' || category === 'ADAPTOR' ? 'Choose one' : '';
  }

  private isDefaultFullSetAccessory(product: any, products: any[]) {
    const name = String(product.product_name || '').toLowerCase();
    const category = this.stbAccessoryCategory(name);
    if (!category) return false;

    const preferred: Record<string, (value: string) => boolean> = {
      VIDEO: (value) => value.includes('hdmi 1m') || value.includes('hdmi'),
      ADAPTOR: (value) => /12\s*v.*1\s*amp/.test(value),
      BATTERY: (value) => value.includes('aaa battery'),
      REMOTE: (value) => value.includes('remote') && value.includes('rr blue')
    };
    const categoryProducts = products.filter((item: any) => this.stbAccessoryCategory(item.product_name) === category);
    const preferredProduct = categoryProducts.find((item: any) => preferred[category](String(item.product_name || '').toLowerCase()))
      || categoryProducts[0];
    return Number(preferredProduct?.product_id) === Number(product.product_id);
  }

  private stbAccessoryCategory(name: string) {
    const value = String(name || '').toLowerCase();
    if (value.includes('hdmi') || (value.includes('av') && value.includes('card'))) return 'VIDEO';
    if (value.includes('adaptor') || value.includes('adapter')) return 'ADAPTOR';
    if (value.includes('battery')) return 'BATTERY';
    if (value.includes('remote')) return 'REMOTE';
    return '';
  }

  stbAccessoryProducts() {
    const explicitAccessories = this.lookups.stbAccessories || [];
    if (explicitAccessories.length) return explicitAccessories;
    const accessoryPatterns = ['stb accessories', 'hdmi', 'remote', '3pin av', '3 pin av', '1pin av', '1 pin av', 'adaptor 12v', 'adapter 12v', 'aaa battery', 'aa battery'];
    return (this.lookups.products || []).filter((product: any) => {
      const name = String(product.product_name || '').toLowerCase();
      return accessoryPatterns.some((pattern) => name.includes(pattern));
    });
  }

  accessoryDisplayName(name: string) {
    return String(name || '').replace(/\s*STB\s+Accessories\s*/i, ' ').replace(/\s+/g, ' ').trim();
  }

  applySubscriptionPeriod() {
    const sub = this.form.get('subscription') as FormGroup;
    const type = sub.get('payment_type')?.value || 'DAY';
    const selectedYear = Number(sub.get('subscription_year')?.value) || new Date().getFullYear();
    const rawStart = sub.get('start_date')?.value || this.today();
    const startWithYear = type === 'DAY' ? this.today() : `${selectedYear}-${rawStart.slice(5, 7)}-${rawStart.slice(8, 10)}`;
    const startDate = this.normalizedSubscriptionStartDate(startWithYear, type);
    const expiryDate = this.subscriptionExpiryDate(startDate);
    sub.patchValue({
      start_date: startDate,
      expiry_date: expiryDate,
      subscription_month: Number(startDate.slice(5, 7)),
      subscription_year: Number(startDate.slice(0, 4))
    }, { emitEvent: false });
    this.packages.controls.forEach((row) => {
      row.patchValue({ start_date: startDate, end_date: expiryDate, billing_basis: type }, { emitEvent: false });
      this.calculatePackageRow(this.packages.controls.indexOf(row));
    });
  }

  selectStbMaster(stbMasterId: number) {
    const selectedStb = (this.lookups.stbMasters || []).find((item: any) => Number(item.stb_master_id) === Number(stbMasterId));
    if (!selectedStb) return;
    this.form.get('stb')?.patchValue({
      stb_search: selectedStb.stb_number,
      stb_type: selectedStb.stock_type,
      installed_mso_id: selectedStb.mso_id,
      stb_no: selectedStb.stb_number,
      stb_amount: this.stbIssueAmount(selectedStb)
    }, { emitEvent: false });
    this.account.patchValue({ stb_amount: this.stbIssueAmount(selectedStb) }, { emitEvent: false });
    this.calculateAccountTotals();
  }

  applyStbIssuePrice() {
    const selectedStb = (this.lookups.stbMasters || []).find((item: any) =>
      Number(item.stb_master_id) === Number(this.form.get('stb.stb_master_id')?.value)
    );
    const amount = selectedStb ? this.stbIssueAmount(selectedStb) : 0;
    this.form.get('stb.stb_amount')?.setValue(amount, { emitEvent: false });
    this.account.patchValue({ stb_amount: amount }, { emitEvent: false });
    if (this.form.get('stb.issue_mode')?.value === 'BOX_ONLY') {
      this.stbAccessories.controls.forEach((row) => row.patchValue({ selected: false }, { emitEvent: false }));
    } else if (!this.stbAccessories.controls.some((row) => row.get('selected')?.value)) {
      this.buildStbAccessoryRows();
    }
    this.calculateAccountTotals();
  }

  private stbIssueAmount(stb: any) {
    return this.form.get('stb.issue_mode')?.value === 'BOX_ONLY'
      ? Number(stb.stb_amount) || 500
      : Number(stb.full_set_amount) || 800;
  }

  onStbSearchInput() {
    this.showStbSearchOptions = true;
    this.selectStbFromSearch(false);
  }

  selectStbFromSearch(hideOptions = true) {
    const searchValue = String(this.form.get('stb.stb_search')?.value || '').trim().toLowerCase();
    const selectedStb = this.filteredStbMasters.find((item: any) =>
      String(item.stb_number || '').trim().toLowerCase() === searchValue
    );
    if (selectedStb) {
      this.form.get('stb.stb_master_id')?.setValue(selectedStb.stb_master_id);
      this.showStbSearchOptions = !hideOptions;
      return;
    }
    this.form.get('stb')?.patchValue({
      stb_master_id: null,
      stb_no: '',
      stb_amount: 0
    }, { emitEvent: false });
    this.account.patchValue({ stb_amount: 0 }, { emitEvent: false });
    this.calculateAccountTotals();
  }

  selectStbOption(stb: any) {
    this.form.get('stb.stb_master_id')?.setValue(stb.stb_master_id);
    this.showStbSearchOptions = false;
  }

  selectMaterialProduct(index: number) {
    const row = this.materials.at(index) as FormGroup;
    const productId = row.get('product_id')?.value;
    const product = (this.lookups.products || []).find((item: any) => Number(item.product_id) === Number(productId));
    if (!product) return;
    row.patchValue({
      item_name: product.product_name,
      unit: product.unit || 'PCS',
      unit_rate: Number(product.selling_price) || 0
    });
    this.calculateMaterialAmount(index);
  }

  calculateMaterialAmount(index: number) {
    const row = this.materials.at(index) as FormGroup;
    const qty = Number(row.get('qty')?.value) || 0;
    const rate = Number(row.get('unit_rate')?.value) || 0;
    row.patchValue({ amount: Number((qty * rate).toFixed(2)) }, { emitEvent: false });
    this.calculateAccountTotals();
  }

  calculatePackageRow(index: number) {
    if (index < 0) return;
    const row = this.packages.at(index) as FormGroup;
    if (!row) return;

    const type = this.form.get('subscription.payment_type')?.value || row.get('billing_basis')?.value || 'DAY';
    const startDate = this.normalizedSubscriptionStartDate(row.get('start_date')?.value || this.subscriptionStartDate(), type);
    const start = new Date(startDate);
    const month = start.getMonth() + 1;
    const year = start.getFullYear();
    const daysInMonth = this.daysInMonth(month, year);
    const endDate = this.subscriptionExpiryDate(startDate);
    const periodCount = type === 'MONTH'
      ? Number(this.form.get('subscription.no_of_months')?.value) || 1
      : type === 'YEAR'
        ? Number(this.form.get('subscription.no_of_years')?.value) || 1
        : this.inclusiveDays(startDate, endDate);
    const packagePrice = Number(row.get('package_price')?.value) || 0;
    const amount = type === 'MONTH'
      ? Number((packagePrice * periodCount).toFixed(2))
      : type === 'YEAR'
        ? Number((packagePrice * 12 * periodCount).toFixed(2))
        : Number(((packagePrice / daysInMonth) * periodCount).toFixed(2));
    const paidAmount = 0;

    row.patchValue({
      start_date: startDate,
      end_date: endDate,
      billing_basis: type,
      subscription_month: month,
      subscription_year: year,
      days_in_month: daysInMonth,
      number_of_days_or_months: periodCount,
      amount,
      paid_amount: paidAmount,
      balance_amount: amount - paidAmount,
      payment_status: 'PENDING'
    }, { emitEvent: false });
    this.calculateSubscriptionTotals();
  }

  calculateSubscriptionTotals() {
    const totalAmount = Math.round(this.packages.controls.reduce((sum, row) => sum + (Number(row.get('amount')?.value) || 0), 0));
    const totalPaid = Math.round(this.packages.controls.reduce((sum, row) => sum + (Number(row.get('paid_amount')?.value) || 0), 0));
    const starts = this.packages.controls.map((row) => row.get('start_date')?.value).filter(Boolean).sort();
    const ends = this.packages.controls.map((row) => row.get('end_date')?.value).filter(Boolean).sort();
    const sub = this.form.get('subscription') as FormGroup;
    sub.patchValue({
      amount: totalAmount,
      paid_amount: totalPaid,
      balance_amount: totalAmount - totalPaid,
      subscription_month: starts[0] ? Number(starts[0].slice(5, 7)) : Number(this.today().slice(5, 7)),
      subscription_year: starts[0] ? Number(starts[0].slice(0, 4)) : Number(this.today().slice(0, 4)),
      start_date: starts[0] || this.today(),
      expiry_date: ends[ends.length - 1] || this.today()
    }, { emitEvent: false });
    this.calculateAccountTotals();
  }

  calculateAccountTotals() {
    if (!this.form) return;
    const materialCost = this.materials.controls.reduce((sum, row) => sum + (Number(row.get('amount')?.value) || 0), 0);
    const subscriptionAmount = Math.round(this.packages.controls.reduce((sum, row) => sum + (Number(row.get('amount')?.value) || 0), 0));
    const stbAmount = Number(this.account.get('stb_amount')?.value ?? this.form.get('stb.stb_amount')?.value) || 0;
    const stbDiscount = Number(this.form.get('stb.stb_discount')?.value) || 0;
    const connectionAmount = Number(this.form.get('connection.connection_charge')?.value) || 0;
    const connectionDiscount = Number(this.form.get('connection.connection_discount')?.value) || 0;
    const laborAmount = Number(this.form.get('connection.labour_service_charge')?.value) || 0;
    const materialDiscount = Number(this.account.get('material_discount')?.value) || 0;
    const overallDiscount = Number(this.account.get('overall_discount')?.value) || 0;
    const discount = stbDiscount + connectionDiscount + materialDiscount + overallDiscount;
    const subTotal = Number((stbAmount + connectionAmount + materialCost + subscriptionAmount).toFixed(2));
    const grandTotal = Number(Math.max(subTotal - discount, 0).toFixed(2));
    const paidAmount = Number(this.account.get('customer_paid_amount')?.value) || 0;
    const balanceAmount = Number(Math.max(grandTotal - paidAmount, 0).toFixed(2));
    const dueDate = this.account.get('due_date');
    if (balanceAmount > 0) {
      dueDate?.setValidators([Validators.required]);
    } else {
      dueDate?.clearValidators();
      dueDate?.setValue('', { emitEvent: false });
    }
    dueDate?.updateValueAndValidity({ emitEvent: false });
    this.account.patchValue({
      stb_amount: Number(stbAmount.toFixed(2)),
      stb_discount: Number(stbDiscount.toFixed(2)),
      connection_amount: Number(connectionAmount.toFixed(2)),
      connection_discount: Number(connectionDiscount.toFixed(2)),
      labor_amount: Number(laborAmount.toFixed(2)),
      material_cost: Number(materialCost.toFixed(2)),
      material_discount: Number(materialDiscount.toFixed(2)),
      subscription_amount: subscriptionAmount,
      sub_total: subTotal,
      discount: Number(discount.toFixed(2)),
      overall_discount: Number(overallDiscount.toFixed(2)),
      grand_total: grandTotal,
      balance_amount: balanceAmount
    }, { emitEvent: false });
  }

  normalizeSources(sources: any[] = []) {
    const defaultSources = this.sourceOptions;
    const lookupSources = sources.map((source: any) => ({
      source_id: source.source_id || source.source_name,
      source_name: source.source_name
    }));
    const merged = [...lookupSources, ...defaultSources];
    return merged.filter((source, index, list) =>
      source.source_name && list.findIndex((item) => item.source_name === source.source_name) === index
    );
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    this.applySubscriptionPeriod();
    if (!this.permissions.isAdmin()) this.account.get('account_status')?.setValue('PENDING', { emitEvent: false });
    const payload = this.form.getRawValue();
    const request = this.isEditMode
      ? this.cableTvService.updateCustomer(this.customerId, payload)
      : this.cableTvService.addCustomer(payload);

    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/cable-tv/customers');
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  cancel() {
    this.router.navigateByUrl('/cable-tv/customers');
  }

  today() {
    return new Date().toISOString().slice(0, 10);
  }

  toDateInput(value: any) {
    return value ? new Date(value).toISOString().slice(0, 10) : '';
  }

  daysInMonth(month: number, year: number) {
    return new Date(year, month, 0).getDate();
  }

  subscriptionStartDate() {
    return this.normalizedSubscriptionStartDate(this.form?.get('subscription.start_date')?.value || this.today(), this.form?.get('subscription.payment_type')?.value || 'DAY');
  }

  normalizedSubscriptionStartDate(value: string, type: string) {
    const fallback = this.today();
    const raw = value || fallback;
    if (type === 'DAY') return this.today();
    return `${raw.slice(0, 7)}-01`;
  }

  subscriptionDayCount() {
    const startDate = this.form?.get('subscription.start_date')?.value || this.today();
    const expiryDate = this.form?.get('subscription.expiry_date')?.value || this.subscriptionExpiryDate(startDate);
    return this.inclusiveDays(startDate, expiryDate);
  }

  subscriptionExpiryDate(startDate: string) {
    const type = this.form?.get('subscription.payment_type')?.value || 'DAY';
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return this.today();
    if (type === 'DAY') {
      const year = start.getFullYear();
      const month = start.getMonth() + 1;
      return `${year}-${String(month).padStart(2, '0')}-${this.daysInMonth(month, year)}`;
    }
    if (type === 'MONTH') {
      return this.endDateAfterMonths(startDate, Number(this.form.get('subscription.no_of_months')?.value) || 1);
    }
    return this.endDateAfterMonths(startDate, (Number(this.form.get('subscription.no_of_years')?.value) || 1) * 12);
  }

  endDateAfterMonths(startDate: string, months: number) {
    const start = new Date(startDate);
    const endMonthIndex = start.getMonth() + months - 1;
    const end = new Date(start.getFullYear(), endMonthIndex + 1, 0);
    return this.toLocalDateInput(end);
  }

  toLocalDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  inclusiveDays(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  }
}
