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
  filteredAreas: any[] = [];
  filteredStreets: any[] = [];

  readonly statusTypes = ['ACTIVE', 'INACTIVE', 'DISCONNECTED', 'SHIFTED', 'TRANSFERRED'];
  readonly stbTypes = ['NEW', 'SERVICED', 'RETURNED'];
  readonly connectionTypes = ['NEW', 'SHIFTED', 'TRANSFERRED'];
  readonly accountStatuses = ['PENDING', 'RECEIVED'];
  readonly sourceOptions = [
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
    this.loadLookups();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.customerId = Number(id);
    }
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
      city: ['', Validators.required],
      pincode: [''],
      mobile_no: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      aadhaar_no: ['', Validators.pattern(/^[0-9]{12}$/)],
      alternate_mobile_no: ['', Validators.pattern(/^[0-9]{10}$/)],
      source_id: [null],
      installed_by_employee_id: [null],
      labour_service_charge: [0],
      status: ['ACTIVE', Validators.required],
      stb: this.fb.group({
        stb_master_id: [null],
        stb_type: ['NEW'],
        installed_mso_id: [null],
        exchange_original_mso_id: [null],
        stb_no: [''],
        stb_amount: [0],
        stb_discount: [0],
        labour_service_charge: [0],
        installed_date: [today]
      }),
      connection: this.fb.group({
        connection_date: [today],
        disconnection_date: [''],
        connection_type: ['NEW'],
        connection_charge: [0],
        labour_service_charge: [0],
        status: ['ACTIVE'],
        remarks: ['']
      }),
      materials: this.fb.array([this.createMaterialRow()]),
      packages: this.fb.array([this.createPackageRow()]),
      subscription: this.fb.group({
        subscription_month: [Number(today.slice(5, 7))],
        subscription_year: [Number(today.slice(0, 4))],
        collect_date: [today],
        start_date: [today],
        expiry_date: [today],
        payment_mode: ['CASH'],
        amount: [0],
        paid_amount: [0],
        balance_amount: [0],
        remarks: ['']
      }),
      account: this.fb.group({
        stb_amount: [0],
        connection_amount: [0],
        labor_amount: [0],
        material_cost: [0],
        subscription_amount: [0],
        sub_total: [0],
        discount: [0],
        grand_total: [0],
        account_status: ['PENDING']
      })
    });
  }

  setupDependencies() {
    this.form.get('network_id')?.valueChanges.subscribe(() => {
      this.refreshAreaOptions();
      this.filteredStreets = [];
      this.form.patchValue({ area_id: null, street_id: null }, { emitEvent: false });
    });

    this.form.get('location_id')?.valueChanges.subscribe((locationId: number) => {
      this.refreshAreaOptions(locationId);
      this.filteredStreets = [];
      this.form.patchValue({ area_id: null, street_id: null }, { emitEvent: false });
      const location = (this.lookups.locations || []).find((item: any) => Number(item.location_id) === Number(locationId));
      if (location) this.form.patchValue({ city: location.city, pincode: location.pincode || '' }, { emitEvent: false });
    });

    this.form.get('area_id')?.valueChanges.subscribe((areaId: number) => {
      this.filteredStreets = (this.lookups.streets || []).filter((street: any) => Number(street.area_id) === Number(areaId));
      this.form.patchValue({ street_id: null }, { emitEvent: false });
    });

    this.form.get('stb.stb_master_id')?.valueChanges.subscribe((stbMasterId: number) => this.selectStbMaster(stbMasterId));
    this.form.get('stb.stb_amount')?.valueChanges.subscribe((value: number) => {
      this.account.patchValue({ stb_amount: Number(value) || 0 }, { emitEvent: false });
      this.calculateAccountTotals();
    });
    this.form.get('stb.stb_discount')?.valueChanges.subscribe((value: number) => {
      this.account.patchValue({ discount: Number(value) || 0 }, { emitEvent: false });
      this.calculateAccountTotals();
    });
    this.form.get('stb.labour_service_charge')?.valueChanges.subscribe((value: number) => {
      this.account.patchValue({ labor_amount: Number(value) || 0 }, { emitEvent: false });
      this.calculateAccountTotals();
    });
    ['account.connection_amount', 'account.labor_amount', 'account.discount'].forEach((path) => {
      this.form.get(path)?.valueChanges.subscribe(() => this.calculateAccountTotals());
    });
  }

  get account(): FormGroup {
    return this.form.get('account') as FormGroup;
  }

  refreshAreaOptions(locationId = this.form.get('location_id')?.value) {
    const networkId = this.form.get('network_id')?.value;
    this.filteredAreas = (this.lookups.areas || []).filter((area: any) =>
      Number(area.location_id) === Number(locationId) &&
      (!area.network_id || Number(area.network_id) === Number(networkId))
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
        this.filteredAreas = (this.lookups.areas || []).filter((area: any) =>
          Number(area.location_id) === Number(customer.location_id) &&
          (!area.network_id || Number(area.network_id) === Number(customer.network_id))
        );
        this.filteredStreets = (this.lookups.streets || []).filter((street: any) => Number(street.area_id) === Number(customer.area_id));
        if (response.stbs?.[0]) this.form.get('stb')?.patchValue(response.stbs[0]);
        if (response.connections?.[0]) this.form.get('connection')?.patchValue(response.connections[0]);
        if (response.accounts?.[0]) this.account.patchValue(response.accounts[0]);
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
    const startDate = this.toDateInput(data.start_date) || this.today();
    const month = Number(data.subscription_month) || Number(startDate.slice(5, 7));
    const year = Number(data.subscription_year) || Number(startDate.slice(0, 4));
    const daysInMonth = this.daysInMonth(month, year);
    const endDate = this.toDateInput(data.end_date) || `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
    const row = this.fb.group({
      package_id: [data.package_id || null],
      package_price: [data.package_price || 0],
      start_date: [startDate],
      end_date: [endDate],
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

  selectStbMaster(stbMasterId: number) {
    const selectedStb = (this.lookups.stbMasters || []).find((item: any) => Number(item.stb_master_id) === Number(stbMasterId));
    if (!selectedStb) return;
    this.form.get('stb')?.patchValue({
      stb_type: selectedStb.stock_type,
      installed_mso_id: selectedStb.mso_id,
      stb_no: selectedStb.stb_number,
      stb_amount: Number(selectedStb.stb_amount) || 0
    }, { emitEvent: false });
    this.account.patchValue({ stb_amount: Number(selectedStb.stb_amount) || 0 }, { emitEvent: false });
    this.calculateAccountTotals();
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

    const startDate = row.get('start_date')?.value || this.today();
    const start = new Date(startDate);
    const month = start.getMonth() + 1;
    const year = start.getFullYear();
    const daysInMonth = this.daysInMonth(month, year);
    const endDate = row.get('end_date')?.value || `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
    const numberOfDays = this.inclusiveDays(startDate, endDate);
    const packagePrice = Number(row.get('package_price')?.value) || 0;
    const amount = Number(((packagePrice / daysInMonth) * numberOfDays).toFixed(2));

    row.patchValue({
      subscription_month: month,
      subscription_year: year,
      days_in_month: daysInMonth,
      number_of_days_or_months: numberOfDays,
      amount,
      paid_amount: amount,
      balance_amount: 0
    }, { emitEvent: false });
    this.calculateSubscriptionTotals();
  }

  calculateSubscriptionTotals() {
    const totalAmount = this.packages.controls.reduce((sum, row) => sum + (Number(row.get('amount')?.value) || 0), 0);
    const totalPaid = this.packages.controls.reduce((sum, row) => sum + (Number(row.get('paid_amount')?.value) || 0), 0);
    const starts = this.packages.controls.map((row) => row.get('start_date')?.value).filter(Boolean).sort();
    const ends = this.packages.controls.map((row) => row.get('end_date')?.value).filter(Boolean).sort();
    const sub = this.form.get('subscription') as FormGroup;
    sub.patchValue({
      amount: Number(totalAmount.toFixed(2)),
      paid_amount: Number(totalPaid.toFixed(2)),
      balance_amount: Number((totalAmount - totalPaid).toFixed(2)),
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
    const subscriptionAmount = this.packages.controls.reduce((sum, row) => sum + (Number(row.get('amount')?.value) || 0), 0);
    const stbAmount = Number(this.account.get('stb_amount')?.value ?? this.form.get('stb.stb_amount')?.value) || 0;
    const connectionAmount = Number(this.account.get('connection_amount')?.value) || 0;
    const laborAmount = Number(this.account.get('labor_amount')?.value) || 0;
    const discount = Number(this.account.get('discount')?.value) || 0;
    const subTotal = Number((stbAmount + connectionAmount + laborAmount + materialCost + subscriptionAmount).toFixed(2));
    this.account.patchValue({
      stb_amount: Number(stbAmount.toFixed(2)),
      material_cost: Number(materialCost.toFixed(2)),
      subscription_amount: Number(subscriptionAmount.toFixed(2)),
      sub_total: subTotal,
      grand_total: Number(Math.max(subTotal - discount, 0).toFixed(2))
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

  inclusiveDays(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  }
}
