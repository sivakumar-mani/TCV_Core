import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { CommonMethods } from '../../shared/common-methods';

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

  readonly networkTypes = ['ACTIVE', 'INACTIVE', 'DISCONNECTED', 'SHIFTED', 'TRANSFERRED'];
  readonly stbTypes = ['NEW', 'FAULT', 'REPLACED', 'EXCHANGE', 'CUSTOMER_OWNED'];
  readonly connectionTypes = ['NEW', 'SHIFTED', 'TRANSFERRED'];
  readonly billingBasis = ['MONTH', 'DAY'];
  readonly paymentModes = ['CASH', 'UPI', 'CARD', 'BANK', 'CHEQUE'];
  readonly months = Array.from({ length: 12 }, (_value, index) => ({
    value: index + 1,
    label: new Date(2026, index, 1).toLocaleString('en-US', { month: 'long' })
  }));

  constructor(
    private fb: FormBuilder,
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
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
      package: this.fb.group({
        package_id: [null],
        package_price: [0],
        start_date: [today],
        end_date: [''],
        is_active: [1]
      }),
      subscription: this.fb.group({
        subscription_month: [new Date().getMonth() + 1],
        subscription_year: [new Date().getFullYear()],
        days_in_month: [this.daysInMonth(new Date().getMonth() + 1, new Date().getFullYear())],
        billing_basis: ['MONTH'],
        number_of_days_or_months: [1],
        amount: [0],
        paid_amount: [0],
        balance_amount: [0],
        collect_date: [today],
        start_date: [today],
        expiry_date: [today],
        payment_mode: ['CASH'],
        remarks: ['']
      })
    });
  }

  setupDependencies() {
    this.form.get('location_id')?.valueChanges.subscribe((locationId: number) => {
      this.filteredAreas = (this.lookups.areas || []).filter((area: any) => Number(area.location_id) === Number(locationId));
      this.filteredStreets = [];
      this.form.patchValue({ area_id: null, street_id: null }, { emitEvent: false });
      const location = (this.lookups.locations || []).find((item: any) => Number(item.location_id) === Number(locationId));
      if (location) this.form.patchValue({ city: location.city, pincode: location.pincode || '' }, { emitEvent: false });
    });

    this.form.get('area_id')?.valueChanges.subscribe((areaId: number) => {
      this.filteredStreets = (this.lookups.streets || []).filter((street: any) => Number(street.area_id) === Number(areaId));
      this.form.patchValue({ street_id: null }, { emitEvent: false });
    });

    this.form.get('package.package_id')?.valueChanges.subscribe((packageId: number) => {
      const selectedPackage = (this.lookups.packages || []).find((item: any) => Number(item.package_id) === Number(packageId));
      if (selectedPackage) {
        this.form.get('package')?.patchValue({ package_price: Number(selectedPackage.price) || 0 }, { emitEvent: false });
        this.calculateSubscription();
      }
    });

    ['subscription.subscription_month', 'subscription.subscription_year', 'subscription.billing_basis', 'subscription.number_of_days_or_months', 'subscription.paid_amount'].forEach((path) => {
      this.form.get(path)?.valueChanges.subscribe(() => this.calculateSubscription());
    });
  }

  loadLookups() {
    this.ngxLoader.start();
    this.cableTvService.getLookups().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.lookups = response || {};
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
        this.filteredAreas = (this.lookups.areas || []).filter((area: any) => Number(area.location_id) === Number(customer.location_id));
        this.filteredStreets = (this.lookups.streets || []).filter((street: any) => Number(street.area_id) === Number(customer.area_id));
        if (response.stbs?.[0]) this.form.get('stb')?.patchValue(response.stbs[0]);
        if (response.connections?.[0]) this.form.get('connection')?.patchValue(response.connections[0]);
        if (response.customerPackages?.[0]) this.form.get('package')?.patchValue(response.customerPackages[0]);
        if (response.subscriptions?.[0]) this.form.get('subscription')?.patchValue(response.subscriptions[0]);
        if (response.materials?.length) {
          this.materials.clear();
          response.materials.forEach((material: any) => this.materials.push(this.createMaterialRow(material)));
        }
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
  }

  calculateSubscription() {
    const sub = this.form.get('subscription') as FormGroup;
    const month = Number(sub.get('subscription_month')?.value) || 1;
    const year = Number(sub.get('subscription_year')?.value) || new Date().getFullYear();
    const days = this.daysInMonth(month, year);
    const basis = sub.get('billing_basis')?.value;
    const quantity = Number(sub.get('number_of_days_or_months')?.value) || 1;
    const packagePrice = Number(this.form.get('package.package_price')?.value) || 0;
    const amount = basis === 'DAY' ? (packagePrice / days) * quantity : packagePrice * quantity;
    const paid = Number(sub.get('paid_amount')?.value) || 0;
    sub.patchValue({
      days_in_month: days,
      amount: Number(amount.toFixed(2)),
      balance_amount: Number((amount - paid).toFixed(2)),
      start_date: `${year}-${String(month).padStart(2, '0')}-01`,
      expiry_date: `${year}-${String(month).padStart(2, '0')}-${days}`
    }, { emitEvent: false });
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

  daysInMonth(month: number, year: number) {
    return new Date(year, month, 0).getDate();
  }
}
