import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { CommonMethods } from '../../shared/common-methods';
import { PermissionAction, PermissionService } from '../../services/permission.service';
import { WorkflowServices } from '../../services/workflow-services';

type Section = 'customer' | 'connections' | 'stbs' | 'packages' | 'subscriptions';

@Component({
  selector: 'app-cable-tv-customer-history',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './cable-tv-customer-history.html',
  styleUrl: './cable-tv-customer-history.scss'
})
export class CableTvCustomerHistory {
  customerId = 0;
  section: Section = 'subscriptions';
  customer: any = {};
  details: any = {};
  lookups: any = {};
  rows: any[] = [];
  form!: FormGroup;
  showModal = false;
  editId = 0;
  customerSearchNo = '';
  isReviewMode = false;
  workflowId = '';
  approvalInProgress = false;
  editingInitialStb = false;
  private returnAccessoriesInitialized = false;

  readonly titles: Record<Section, string> = {
    customer: 'Customer Information',
    connections: 'Connection Details',
    stbs: 'STB Details',
    packages: 'Package Details',
    subscriptions: 'Subscription Details'
  };
  readonly tabs: { key: Section; label: string }[] = [
    { key: 'subscriptions', label: 'Subscription' },
    { key: 'stbs', label: 'STB' },
    { key: 'connections', label: 'Connection' },
    { key: 'packages', label: 'Package' }
  ];
  readonly sectionPermissionKeys: Record<Section, string> = {
    customer: 'CABLE_TV_CUSTOMERS',
    connections: 'CABLE_TV_CONNECTIONS',
    stbs: 'CABLE_TV_CUSTOMER_STBS',
    packages: 'CABLE_TV_CUSTOMER_PACKAGES',
    subscriptions: 'CABLE_TV_SUBSCRIPTIONS'
  };
  readonly connectionTypes = ['NEW', 'RECONNECTION', 'SHIFTED', 'TRANSFERRED'];
  readonly packageTypes = ['ADDON', 'ALACARTE', 'BROADCASTER'];
  readonly stbTypes = ['NEW', 'SERVICED', 'RETURNED'];
  readonly stbStatuses = ['ACTIVE', 'RETRIEVED', 'FAULT', 'DISCONNECTED', 'UPGRADE', 'RETURNED', 'FAULTY', 'REPLACED'];
  readonly activeStbReasons = ['FAULT', 'DAMAGED', 'BURNT', 'DISCONNECT', 'VACATED', 'STB_LOST', 'OUTSTATION', 'RETURNED'];
  readonly disconnectedStbReasons = ['REACTIVATE', 'REPLACED'];
  readonly months = Array.from({ length: 12 }, (_value, index) => ({
    value: index + 1,
    label: new Date(2026, index, 1).toLocaleString('en-US', { month: 'long' })
  }));
  readonly billingBasisOptions = ['MONTH', 'YEAR', 'DAY'];
  readonly paymentModes = ['CASH', 'ONLINE', 'OFFICE'];
  readonly periodCountOptions = Array.from({ length: 12 }, (_value, index) => index + 1);
  readonly yearOptions = Array.from({ length: 7 }, (_value, index) => new Date().getFullYear() - 1 + index);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private cableTvService: CableTvServices,
    private workflowService: WorkflowServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    public permissions: PermissionService
  ) {}

  ngOnInit() {
    this.customerId = Number(this.route.snapshot.paramMap.get('id'));
    this.section = this.asSection(this.route.snapshot.paramMap.get('section'));
    this.isReviewMode = this.route.snapshot.queryParamMap.get('review') === 'true';
    this.workflowId = this.route.snapshot.queryParamMap.get('workflowId') || '';
    this.buildForm();
    this.loadData();
  }

  get title() { return this.titles[this.section]; }
  get reviewApprovalPending() {
    const approvalGroupId = Number(String(this.workflowId || '').replace(/^CTV-/i, ''));
    const group = (this.details.approvalGroups || []).find(
      (item: any) => Number(item.approval_group_id) === approvalGroupId
    );
    return !group || String(group.approval_status || '').toUpperCase() === 'PENDING';
  }
  get materials(): FormArray { return this.form.get('materials') as FormArray; }
  get stbAccessories(): FormArray { return this.form.get('accessories') as FormArray; }
  get addButtonLabel() {
    if (this.section === 'connections') return 'Add Connection Details';
    if (this.section === 'stbs') return 'Add STB';
    if (this.section === 'packages') return 'Add Package';
    return 'Add Subscription';
  }
  get hasPendingStbApproval() {
    return (this.details.stbs || []).some(
      (item: any) => String(item.approval_status || '').toUpperCase() === 'PENDING'
    );
  }
  get latestConnection() { return (this.details.connections || [])[0] || {}; }
  get latestStb() { return (this.details.stbs || [])[0] || {}; }
  get currentActiveStb() {
    const history = (this.details.stbs || []).find((item: any) =>
      String(item.stb_no || this.stbMasterNumber(item.stb_master_id) || '').trim()
    );
    if (history) {
      return {
        ...history,
        stb_no: history.stb_no || this.stbMasterNumber(history.stb_master_id)
      };
    }
    return this.customer.stb_no ? {
        stb_no: this.customer.stb_no,
        stb_master_id: this.customer.stb_master_id,
        customer_stb_id: this.customer.customer_stb_id,
        status: this.customer.stb_status || this.customer.status
      } : {};
  }
  private stbMasterNumber(stbMasterId: any) {
    return (this.lookups.stbMasters || []).find(
      (item: any) => Number(item.stb_master_id) === Number(stbMasterId)
    )?.stb_number || '';
  }
  get availableStbReasons() {
    const currentStatus = String(this.latestStb.status || this.customer.status || '').toUpperCase();
    return currentStatus === 'ACTIVE' ? this.activeStbReasons : this.disconnectedStbReasons;
  }
  get headerStatus() {
    return String(this.latestStb.approval_status || '').toUpperCase() === 'PENDING'
      ? 'Pending'
      : (this.latestStb.status || this.customer.status || 'Pending');
  }
  get headerStbNo() { return this.latestStb.stb_no || '-'; }
  get headerDate() { return this.latestStb.installed_date || this.latestConnection.connection_date || this.customer.installation_date || ''; }
  get isReactivateReason() { return String(this.form?.get('reason')?.value || '').toUpperCase() === 'REACTIVATE'; }
  get isReplacementReason() { return String(this.form?.get('reason')?.value || '').toUpperCase() === 'REPLACED'; }
  get isFullSetIssue() { return String(this.form?.get('issue_mode')?.value || '').toUpperCase() === 'FULL_SET'; }
  get showStbIssueDetails() { return this.isReplacementReason || this.editingInitialStb; }
  get showStbChargeDetails() { return this.isReactivateReason || this.showStbIssueDetails; }
  get isReturnReason() { return String(this.form?.get('reason')?.value || '').toUpperCase() === 'RETURNED'; }
  get isLocationChange() { return this.section === 'connections' && String(this.form?.get('connection_type')?.value || '').toUpperCase() === 'SHIFTED'; }
  get locationChangePostalAreas() {
    const networkId = Number(this.customer?.network_id);
    const locationIds = new Set((this.lookups.areas || [])
      .filter((area: any) => Number(area.network_id) === networkId)
      .map((area: any) => Number(area.location_id)));
    return (this.lookups.locations || []).filter((location: any) => locationIds.has(Number(location.location_id)));
  }
  get locationChangeAreas() {
    const networkId = Number(this.customer?.network_id);
    const locationId = Number(this.form?.get('new_location_id')?.value);
    return (this.lookups.areas || []).filter((area: any) =>
      Number(area.network_id) === networkId && Number(area.location_id) === locationId
    );
  }
  get locationChangeStreets() {
    const areaId = Number(this.form?.get('new_area_id')?.value);
    return (this.lookups.streets || []).filter((street: any) => Number(street.area_id) === areaId);
  }
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
  get loggedInEmployee() {
    const employeeId = this.permissions.employeeId();
    const identity = String(
      this.permissions.employeeCode() || this.permissions.username() || ''
    ).trim().toLowerCase();
    return (this.lookups.employees || []).find((item: any) =>
      (employeeId && Number(item.employee_id) === Number(employeeId))
      || String(item.employee_code || '').trim().toLowerCase() === identity
      || String(item.employee_name || '').trim().toLowerCase() === identity
    );
  }

  get loggedInEmployeeName() {
    return this.loggedInEmployee?.employee_name
      || this.loggedInEmployee?.employee_code
      || this.permissions.username();
  }

  canSection(section: Section, action: PermissionAction = 'view') {
    if (section === 'customer') return this.permissions.isAdmin();
    if (action === 'view') return true;
    if (this.isReviewMode) return false;
    if (action === 'delete') return this.permissions.isAdmin();
    if (action === 'update') {
      return this.permissions.isAdmin()
        || (section === 'subscriptions' && this.permissions.can(this.sectionPermissionKeys[section], 'create'));
    }
    return this.permissions.can(this.sectionPermissionKeys[section], action);
  }

  canEditRow(row: any) {
    if (!this.canSection(this.section, 'update')) return false;
    if (this.section !== 'subscriptions' || this.permissions.isAdmin()) return true;
    return String(this.customer?.status || '').toUpperCase() === 'ACTIVE'
      && String(row?.payment_status || '').toUpperCase() !== 'PAID';
  }

  buildForm() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.section === 'customer') {
      this.form = this.fb.group({
        network_id: [this.customer.network_id || null, Validators.required],
        full_name: [this.customer.full_name || '', Validators.required],
        mobile_no: [this.customer.mobile_no || '', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
        alternate_mobile_no: [this.customer.alternate_mobile_no || '', Validators.pattern(/^[0-9]{10}$/)],
        aadhaar_no: [this.customer.aadhaar_no || '', Validators.pattern(/^[0-9]{12}$/)],
        source_id: [this.customer.source_id || null],
        installed_by_employee_id: [this.customer.installed_by_employee_id || null, Validators.required]
      });
      return;
    }
    if (this.section === 'connections') {
      this.form = this.fb.group({
        connection_date: [today, Validators.required],
        connection_type: ['RECONNECTION', Validators.required],
        new_door_no: [''],
        new_location_id: [null],
        new_area_id: [null],
        new_street_id: [null],
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
      this.form.get('connection_type')?.valueChanges.subscribe(() => this.applyLocationChangeState());
      this.form.get('new_location_id')?.valueChanges.subscribe(() => {
        this.form.patchValue({ new_area_id: null, new_street_id: null }, { emitEvent: false });
      });
      this.form.get('new_area_id')?.valueChanges.subscribe(() => {
        this.form.patchValue({ new_street_id: null }, { emitEvent: false });
      });
      this.applyLocationChangeState();
      this.watchBalance(['connection_charge', 'connection_discount', 'labour_service_charge', 'overall_discount', 'customer_paid_amount']);
      return;
    }
    if (this.section === 'stbs') {
      this.returnAccessoriesInitialized = false;
      const defaultReason = this.availableStbReasons[0] || 'DISCONNECT';
      this.form = this.fb.group({
        current_stb_no: [this.currentActiveStb.stb_no || ''],
        updated_date: [today, Validators.required],
        reason: [defaultReason, Validators.required],
        remarks: ['', [Validators.maxLength(500)]],
        stb_master_id: [null],
        stb_no: [''],
        stb_type: ['NEW', Validators.required],
        issue_mode: ['BOX_ONLY', Validators.required],
        stb_amount: [0],
        master_stb_amount: [0],
        master_full_set_amount: [0],
        stb_discount: [0],
        labour_service_charge: [0],
        refund_amount: [0],
        refund_payment_mode: ['CASH'],
        installed_by_employee_id: [null],
        customer_paid_amount: [0],
        balance_amount: [0],
        due_date: [''],
        overall_discount: [0],
        status: [this.statusForStbReason(defaultReason), Validators.required],
        accessories: this.fb.array([])
      });
      this.buildStbAccessoryRows();
      this.form.get('reason')?.valueChanges.subscribe(() => this.applyStbReasonState());
      this.form.get('stb_type')?.valueChanges.subscribe(() => this.resetSelectedStbIfTypeMismatch());
      this.form.get('issue_mode')?.valueChanges.subscribe(() => this.applyStbIssuePrice());
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
      customer_package_id: [this.defaultCustomerPackageId()],
      subscription_month: [Number(today.slice(5, 7))],
      subscription_year: [Number(today.slice(0, 4))],
      billing_basis: ['MONTH'],
      number_of_days_or_months: [1],
      days_in_month: [Number(today.slice(8, 10))],
      received_count: [1],
      start_date: [today],
      expiry_date: [today],
      collect_date: [today],
      collected_by_employee_id: [null, Validators.required],
      package_amount: [0],
      amount: [0],
      paid_amount: [0],
      balance_amount: [0],
      payment_status: ['PENDING'],
      payment_mode: ['CASH'],
      payment_mapped_employee_id: [null],
      payment_reference: [''],
      remarks: ['']
    });
    if (!this.permissions.isAdmin()) {
      this.form.patchValue({ collect_date: today, payment_mode: 'CASH' }, { emitEvent: false });
      this.form.get('payment_mode')?.disable({ emitEvent: false });
    }
    this.form.get('received_count')?.disable({ emitEvent: false });
    this.form.get('customer_package_id')?.valueChanges.subscribe(() => this.applySubscriptionPackage());
    this.form.get('billing_basis')?.valueChanges.subscribe((basis) => {
      const selectedBasis = String(basis || '').toUpperCase();
      if (selectedBasis === 'DAY') {
        const todayDate = this.today();
        const today = new Date(todayDate);
        this.form.patchValue({
          subscription_month: today.getMonth() + 1,
          subscription_year: today.getFullYear(),
          start_date: todayDate,
          expiry_date: this.monthLastDate(today.getMonth() + 1, today.getFullYear())
        }, { emitEvent: false });
      } else {
        this.form.patchValue({ number_of_days_or_months: 1, received_count: 1 }, { emitEvent: false });
      }
      this.calculateSubscription();
    });
    ['subscription_month', 'subscription_year', 'number_of_days_or_months', 'start_date', 'expiry_date', 'paid_amount'].forEach((path) => {
      this.form.get(path)?.valueChanges.subscribe(() => this.calculateSubscription());
    });
    this.applySubscriptionPackage();
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

  accessoryDisplayName(name: string) {
    return String(name || '').replace(/\s*STB\s+Accessories\s*/i, ' ').replace(/\s+/g, ' ').trim();
  }

  private normalizedAccessoryName(name: any) {
    return String(name || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  }

  isMandatoryFullSetAccessory(accessory: any) {
    if (this.form?.get('issue_mode')?.value !== 'FULL_SET') return false;
    const name = this.normalizedAccessoryName(accessory?.get?.('product_name')?.value ?? accessory?.product_name);
    return name.includes('AAA BATTERY')
      || (name.includes('ADAPTOR') && name.includes('12V') && name.includes('1AMP'))
      || (name.includes('REMOTE') && name.includes('BLUE'));
  }

  private isFullSetVideoAccessory(accessory: any) {
    const name = this.normalizedAccessoryName(accessory?.get?.('product_name')?.value ?? accessory?.product_name);
    return (name.includes('HDMI') && (name.includes('1MTS') || name.includes('1 MTS') || name.includes('1M')))
      || (name.includes('AV CARD') && name.includes('1 PIN'))
      || (name.includes('AV CARD') && name.includes('3 PIN') && name.includes('3 RCA'));
  }

  private enforceFullSetAccessories() {
    if (this.form?.get('issue_mode')?.value !== 'FULL_SET') return;
    this.stbAccessories.controls
      .filter(accessory => this.isMandatoryFullSetAccessory(accessory))
      .forEach(accessory => accessory.patchValue({ selected: true, qty: 1 }, { emitEvent: false }));
    const videoAccessories = this.stbAccessories.controls.filter(accessory => this.isFullSetVideoAccessory(accessory));
    if (videoAccessories.length && !videoAccessories.some(accessory => accessory.get('selected')?.value)) {
      const hdmi = videoAccessories.find(accessory =>
        this.normalizedAccessoryName(accessory.get('product_name')?.value).includes('HDMI')
      ) || videoAccessories[0];
      hdmi.patchValue({ selected: true, qty: 1 }, { emitEvent: false });
    }
  }

  stbAccessorySelectionChanged(index: number) {
    if (this.form?.get('issue_mode')?.value !== 'FULL_SET') return;
    const selectedAccessory = this.stbAccessories.at(index);
    if (this.isMandatoryFullSetAccessory(selectedAccessory)) {
      selectedAccessory.patchValue({ selected: true, qty: 1 }, { emitEvent: false });
      return;
    }
    if (!this.isFullSetVideoAccessory(selectedAccessory)) return;
    if (selectedAccessory.get('selected')?.value) {
      this.stbAccessories.controls
        .filter(accessory => accessory !== selectedAccessory && this.isFullSetVideoAccessory(accessory))
        .forEach(accessory => accessory.patchValue({ selected: false }, { emitEvent: false }));
      selectedAccessory.patchValue({ qty: 1 }, { emitEvent: false });
    } else {
      selectedAccessory.patchValue({ selected: true, qty: 1 }, { emitEvent: false });
    }
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
            this.customerSearchNo = this.customer.customer_code || this.customerSearchNo;
            if (this.section === 'stbs' && !this.showModal) this.buildForm();
            if (!this.permissions.isAdmin()) this.applyLoggedInEmployee();
            this.refreshRows();
          },
          error: (error: any) => this.handleError(error)
        });
      },
      error: (error: any) => this.handleError(error)
    });
  }

  searchCustomerByNumber() {
    const customerNo = String(this.customerSearchNo || '').trim().toLowerCase();
    if (!customerNo) {
      this.commonMethods.handleError({ error: { message: 'Enter customer number' } });
      return;
    }
    this.ngxLoader.start();
    this.cableTvService.getCustomers().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const customers = Array.isArray(response) ? response : response.data ?? [];
        const match = customers.find((customer: any) => String(customer.customer_code || '').trim().toLowerCase() === customerNo);
        if (!match) {
          this.commonMethods.handleError({ error: { message: 'Customer number not found' } });
          return;
        }
        this.router.navigate(['/cable-tv/customers', match.cable_customer_id]).then(() => {
          this.customerId = Number(match.cable_customer_id);
          this.section = 'subscriptions';
          this.buildForm();
          this.loadData();
        });
      },
      error: (error: any) => this.handleError(error)
    });
  }

  applyLoggedInEmployee() {
    if (this.permissions.isAdmin()) return;
    const employeeId = this.loggedInEmployee?.employee_id || this.permissions.employeeId();
    if (!employeeId) return;
    const field = this.section === 'subscriptions'
      ? 'collected_by_employee_id'
      : (this.section === 'stbs' || this.section === 'connections')
        ? 'installed_by_employee_id'
        : '';
    if (!field) return;
    const control = this.form?.get(field);
    control?.setValue(Number(employeeId), { emitEvent: false });
    control?.disable({ emitEvent: false });
  }

  refreshRows() {
    const map: Record<Section, any[]> = {
      customer: [],
      connections: this.details.connections || [],
      stbs: this.details.stbs || [],
      packages: this.details.customerPackages || [],
      subscriptions: this.details.subscriptions || []
    };
    this.rows = map[this.section];
  }

  asSection(value: any): Section {
    return this.tabs.some((tab) => tab.key === value) ? value as Section : 'subscriptions';
  }

  switchSection(section: Section) {
    if (this.section === section) return;
    this.section = section;
    this.showModal = false;
    this.editId = 0;
    this.editingInitialStb = false;
    this.buildForm();
    if (!this.permissions.isAdmin()) this.applyLoggedInEmployee();
    this.refreshRows();
  }

  saveCustomerInformation() {
    if (!this.permissions.isAdmin() || this.section !== 'customer') return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.commonMethods.handleError({ error: { message: 'Enter valid customer information before saving' } });
      return;
    }
    this.ngxLoader.start();
    this.cableTvService.updateCustomerInformation(this.customerId, this.form.getRawValue()).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadData();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  openAdd() {
    if (!this.canSection(this.section, 'create')) return;
    if (this.section === 'stbs' && this.hasPendingStbApproval) {
      this.commonMethods.handleError({
        error: { message: 'An STB update is pending for administrator approval. Add STB is disabled until approval is completed.' }
      });
      return;
    }
    this.editId = 0;
    this.editingInitialStb = false;
    this.buildForm();
    if (!this.permissions.isAdmin()) this.applyLoggedInEmployee();
    this.showModal = true;
  }

  goBack() {
    this.router.navigateByUrl('/cable-tv/customers');
  }

  edit(row: any) {
    if (!this.canEditRow(row)) return;
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
      this.form.patchValue({
        connection_date: this.dateInputValue(row.connection_date),
        connection_type: String(row.connection_type || 'RECONNECTION').toUpperCase(),
        installed_by_employee_id: Number(
          row.connected_by_employee_id || row.installed_by_employee_id
        ) || null,
        connection_charge: Number(row.connection_charge) || 0,
        labour_service_charge: Number(row.labour_service_charge) || 0,
        remarks: row.remarks || ''
      }, { emitEvent: false });
      this.applyLocationChangeState();
    }
    if (this.section === 'subscriptions') {
      const billingBasis = String(row.billing_basis || 'MONTH').toUpperCase();
      this.form.patchValue({
        customer_package_id: Number(row.customer_package_id) || this.defaultCustomerPackageId(),
        subscription_month: Number(row.subscription_month) || Number(new Date().toISOString().slice(5, 7)),
        subscription_year: Number(row.subscription_year) || Number(new Date().toISOString().slice(0, 4)),
        billing_basis: billingBasis,
        number_of_days_or_months: billingBasis === 'DAY' ? Number(row.number_of_days_or_months) || 1 : 1,
        days_in_month: Number(row.days_in_month) || this.daysInSelectedMonth(),
        received_count: billingBasis === 'DAY' ? Number(row.received_count) || 1 : Number(row.received_count) || 1,
        start_date: this.dateInputValue(row.start_date),
        expiry_date: this.dateInputValue(row.expiry_date),
        collect_date: this.dateInputValue(row.collect_date),
        collected_by_employee_id: row.collected_by_employee_id || null,
        package_amount: Number(row.package_price || row.amount) || 0,
        amount: Number(row.amount) || 0,
        paid_amount: Number(row.paid_amount) || 0,
        balance_amount: Number(row.balance_amount) || 0,
        payment_status: row.payment_status || 'PENDING',
        payment_mode: this.permissions.isAdmin() ? (row.payment_mode || 'CASH') : 'CASH',
        payment_mapped_employee_id: this.permissions.isAdmin() ? (row.payment_mapped_employee_id || null) : null,
        payment_reference: row.payment_reference || ''
      }, { emitEvent: false });
      if (!this.permissions.isAdmin()) this.applyLoggedInEmployee();
      if (!this.permissions.isAdmin()) {
        Object.keys(this.form.controls)
          .filter(control => control !== 'paid_amount')
          .forEach(control => this.form.get(control)?.disable({ emitEvent: false }));
      }
      this.form.get('subscription_month')?.disable({ emitEvent: false });
      this.form.get('subscription_year')?.disable({ emitEvent: false });
      this.calculateSubscription();
    }
    if (this.section === 'connections') {
      this.materials.clear();
      (this.details.materials || [])
        .filter((item: any) => Number(item.connection_id) === Number(row.connection_id))
        .forEach((item: any) => this.materials.push(this.createMaterialRow(item)));
      if (!this.materials.length) this.materials.push(this.createMaterialRow());
    }
    if (this.section === 'stbs') {
      this.editingInitialStb = !row.update_reason;
      this.buildStbAccessoryRows((this.details.stbAccessories || [])
        .filter((item: any) => Number(item.customer_stb_id) === Number(row.customer_stb_id)));
      this.form.patchValue({
        current_stb_no: this.currentActiveStb.stb_no || row.current_stb_no || row.stb_no || '',
        updated_date: new Date().toISOString().slice(0, 10),
        reason: row.update_reason || row.reason || 'NEW',
        remarks: row.reason_remarks || row.remarks || '',
        stb_master_id: Number(row.stb_master_id) || null,
        stb_no: row.stb_no || '',
        stb_type: row.stb_type || 'NEW',
        issue_mode: row.issue_mode || 'FULL_SET',
        stb_amount: Number(row.stb_amount) || 0,
        master_stb_amount: Number(row.master_stb_amount) || 0,
        master_full_set_amount: Number(row.master_full_set_amount) || 0,
        stb_discount: Number(row.stb_discount) || 0,
        status: row.status || 'ACTIVE',
        labour_service_charge: row.labour_service_charge || 0,
        refund_amount: row.refund_amount || 0,
        overall_discount: row.overall_discount || 0
      }, { emitEvent: false });
      this.form.get('stb_type')?.disable({ emitEvent: false });
      this.form.get('stb_master_id')?.disable({ emitEvent: false });
      this.applyStbReasonState();
    }
    this.showModal = true;
  }

  save() {
    if (!this.canSection(this.section, this.editId ? 'update' : 'create')) return;
    if (this.section === 'stbs') this.applyStbReasonState();
    if (this.section === 'subscriptions') this.calculateSubscription();
    this.calculateBalance();
    if (this.section === 'subscriptions' && this.hasDuplicateSubscriptionPeriod()) {
      this.commonMethods.handleError({ error: { message: 'Subscription already exists for selected month and year' } });
      return;
    }
    if (this.section === 'subscriptions' && !this.isSubscriptionStatusValid()) {
      this.commonMethods.handleError({ error: { message: 'Status can be Paid only when balance is exactly 0. Keep status Unpaid when balance is not 0.' } });
      return;
    }
    if (this.section === 'subscriptions' && !this.form.get('collected_by_employee_id')?.value) {
      this.commonMethods.handleError({ error: { message: 'Collected By employee name is required' } });
      return;
    }
    const paymentMode = String(this.form.get('payment_mode')?.value || '').toUpperCase();
    if (
      this.section === 'subscriptions'
      && this.permissions.isAdmin()
      && ['ONLINE', 'OFFICE'].includes(paymentMode)
      && !this.form.get('payment_mapped_employee_id')?.value
    ) {
      this.commonMethods.handleError({ error: { message: 'Payment Mapped Employee is required for Online or Office payment' } });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.commonMethods.handleError({ error: { message: 'Please fill the required fields before saving' } });
      return;
    }
    const payload = this.form.getRawValue();
    if (
      this.section === 'stbs'
      && payload.issue_mode === 'FULL_SET'
      && !this.stbAccessories.controls.some(accessory =>
        accessory.get('selected')?.value && this.isFullSetVideoAccessory(accessory)
      )
    ) {
      this.commonMethods.handleError({ error: { message: 'Select HDMI 1 Mts, VK AV Card 1 Pin, or VK AV Card 3 Pin - 3 RCA for a Full Set' } });
      return;
    }
    this.ngxLoader.start();
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
    if (!this.canSection(this.section, 'delete')) return;
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
    if (!this.canSection('packages', 'update')) return;
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
    if (this.section === 'connections') return Number(row.connection_id);
    if (this.section === 'stbs') return Number(row.customer_stb_id);
    if (this.section === 'packages') return Number(row.customer_package_id);
    return Number(row.subscription_id);
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
      if (!this.showStbIssueDetails) return;
      const total = (Number(this.form.get('stb_amount')?.value) || 0)
        + (Number(this.form.get('labour_service_charge')?.value) || 0)
        - (Number(this.form.get('stb_discount')?.value) || 0)
        - (Number(this.form.get('overall_discount')?.value) || 0);
      this.patchBalance(total);
    }
  }

  defaultCustomerPackageId() {
    const activePackage = (this.details.customerPackages || []).find((item: any) => Number(item.is_active) === 1);
    return activePackage?.customer_package_id || (this.details.customerPackages || [])[0]?.customer_package_id || null;
  }

  selectedCustomerPackage() {
    return (this.details.customerPackages || []).find((item: any) => Number(item.customer_package_id) === Number(this.form?.get('customer_package_id')?.value));
  }

  applySubscriptionPackage() {
    if (this.section !== 'subscriptions' || !this.form) return;
    const selected = this.selectedCustomerPackage();
    const packageAmount = Number(selected?.package_price || selected?.amount || selected?.price) || Number(this.form.get('package_amount')?.value) || 0;
    this.form.patchValue({ package_amount: packageAmount }, { emitEvent: false });
    this.calculateSubscription();
  }

  calculateSubscription() {
    if (this.section !== 'subscriptions' || !this.form) return;
    const basis = String(this.form.get('billing_basis')?.value || 'MONTH').toUpperCase();
    const selectedMonth = Number(this.form.get('subscription_month')?.value) || Number(new Date().toISOString().slice(5, 7));
    const selectedYear = Number(this.form.get('subscription_year')?.value) || Number(new Date().toISOString().slice(0, 4));
    const monthFirstDate = this.selectedMonthFirstDate();
    const monthLastDate = this.monthLastDate(selectedMonth, selectedYear);
    const rawPeriodCount = basis === 'DAY'
      ? Math.max(Number(this.form.get('number_of_days_or_months')?.value) || 1, 1)
      : Math.min(Math.max(Number(this.form.get('number_of_days_or_months')?.value) || 1, 1), 12);
    const startDate = basis === 'DAY'
      ? this.form.get('start_date')?.value || monthFirstDate
      : monthFirstDate;
    const packageAmount = Number(this.form.get('package_amount')?.value) || 0;
    const start = new Date(startDate);
    const month = selectedMonth;
    const year = selectedYear;
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayEndDate = basis === 'DAY'
      ? this.form.get('expiry_date')?.value || this.monthLastDate(month, year)
      : this.monthLastDate(month, year);
    const dayCount = basis === 'DAY' ? this.inclusiveDayCount(startDate, dayEndDate) : rawPeriodCount;
    const periodCount = basis === 'DAY' ? dayCount : rawPeriodCount;
    const receivedCount = basis === 'YEAR'
      ? rawPeriodCount * 12
      : basis === 'MONTH'
        ? rawPeriodCount
        : Number((dayCount / daysInMonth).toFixed(2));
    const amount = basis === 'YEAR'
      ? packageAmount * receivedCount
      : basis === 'MONTH'
        ? packageAmount * receivedCount
        : (packageAmount / daysInMonth) * periodCount;
    const roundedAmount = Math.round(amount);
    const paid = Number(this.form.get('paid_amount')?.value) || 0;
    const balance = Math.round(roundedAmount - paid);
    this.form.patchValue({
      subscription_month: month,
      subscription_year: year,
      start_date: startDate,
      days_in_month: daysInMonth,
      number_of_days_or_months: periodCount,
      received_count: receivedCount,
      amount: roundedAmount,
      balance_amount: balance,
      expiry_date: basis === 'DAY' ? dayEndDate : this.subscriptionEndDate(monthFirstDate, basis, periodCount)
    }, { emitEvent: false });
    this.applySubscriptionStatusState(balance);
  }

  selectedMonthFirstDate() {
    const month = Number(this.form?.get('subscription_month')?.value) || Number(new Date().toISOString().slice(5, 7));
    const year = Number(this.form?.get('subscription_year')?.value) || Number(new Date().toISOString().slice(0, 4));
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  today() {
    return new Date().toISOString().slice(0, 10);
  }

  hasDuplicateSubscriptionPeriod() {
    const month = Number(this.form.get('subscription_month')?.value);
    const year = Number(this.form.get('subscription_year')?.value);
    return (this.details.subscriptions || []).some((item: any) =>
      Number(item.subscription_month) === month
      && Number(item.subscription_year) === year
      && Number(item.subscription_id) !== Number(this.editId)
    );
  }

  isSubscriptionStatusValid() {
    if (this.permissions.isAdmin()) return true;
    const balance = Number(this.form.get('balance_amount')?.value) || 0;
    const paid = Number(this.form.get('paid_amount')?.value) || 0;
    const status = String(this.form.get('payment_status')?.value || 'PENDING').toUpperCase();
    return balance <= 0 ? status === 'PAID' : paid > 0 ? status === 'PARTIAL' : status === 'PENDING';
  }

  applySubscriptionStatusState(balance: number = Number(this.form?.get('balance_amount')?.value) || 0) {
    const statusControl = this.form?.get('payment_status');
    if (!statusControl) return;
    if (this.permissions.isAdmin()) {
      statusControl.enable({ emitEvent: false });
      return;
    }
    const paid = Number(this.form.get('paid_amount')?.value) || 0;
    statusControl.setValue(balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING', { emitEvent: false });
    statusControl.disable({ emitEvent: false });
  }

  subscriptionEndDate(startDate: string, basis: string, periodCount: number) {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return '';
    if (basis === 'DAY') {
      start.setDate(start.getDate() + periodCount - 1);
      return start.toISOString().slice(0, 10);
    }
    const months = basis === 'YEAR' ? periodCount * 12 : periodCount;
    start.setMonth(start.getMonth() + months);
    start.setDate(start.getDate() - 1);
    return start.toISOString().slice(0, 10);
  }

  subscriptionPeriodLabel(row: any) {
    const month = this.months.find((item) => Number(item.value) === Number(row.subscription_month))?.label || row.subscription_month || '-';
    return `${month} - ${row.subscription_year || '-'}`;
  }

  noOfPeriodLabel(value: any = this.form?.get('number_of_days_or_months')?.value, basis: any = this.form?.get('billing_basis')?.value) {
    const count = Number(value) || 1;
    const unit = String(basis || 'MONTH').toLowerCase();
    const label = unit === 'day' ? 'Days' : unit === 'year' ? 'Year' : 'Month';
    return `${count}${label}`;
  }

  daysInSelectedMonth() {
    const month = Number(this.form?.get('subscription_month')?.value) || Number(new Date().toISOString().slice(5, 7));
    const year = Number(this.form?.get('subscription_year')?.value) || Number(new Date().toISOString().slice(0, 4));
    return new Date(year, month, 0).getDate();
  }

  monthLastDate(month: number, year: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  }

  inclusiveDayCount(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
    return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  }

  monthLabel(value: any) {
    return this.months.find((item) => Number(item.value) === Number(value))?.label || value || '-';
  }

  paidAmountWarning() {
    if (this.section !== 'subscriptions' || !this.form) return '';
    const paid = Number(this.form.get('paid_amount')?.value) || 0;
    const amount = Number(this.form.get('amount')?.value) || 0;
    if (paid === amount) return '';
    return `Paid amount is not equal to package amount. Balance: ${this.form.get('balance_amount')?.value || 0}`;
  }

  subscriptionStatusLabel(row: any) {
    const status = String(row?.payment_status || '').toUpperCase();
    if (status === 'PAID') return 'Paid';
    if (status === 'PARTIAL') return 'Partially Paid';
    return 'Unpaid';
  }

  subscriptionStatusClass(row: any) {
    return String(row?.payment_status || '').toUpperCase() === 'PAID' ? 'status-badge paid' : 'status-badge unpaid';
  }

  subscriptionCollectedByLabel(row: any) {
    const directName = row?.collected_by_display || row?.collected_by_name;
    if (directName) return directName;
    const employee = (this.lookups.employees || []).find((item: any) =>
      Number(item.employee_id) === Number(row?.collected_by_employee_id)
    );
    return employee?.employee_name || employee?.employee_code || '-';
  }

  subscriptionOverallBalance() {
    return (this.details.subscriptions || []).reduce((sum: number, item: any) => sum + (Number(item.balance_amount) || 0), 0);
  }

  patchBalance(total: number) {
    const paid = Number(this.form.get('customer_paid_amount')?.value) || 0;
    const balance = Math.max(Number(total.toFixed(2)) - paid, 0);
    this.form.patchValue({ balance_amount: Number(balance.toFixed(2)) }, { emitEvent: false });
    this.form.get('due_date')?.setValue('', { emitEvent: false });
  }

  connectionMaterialCost() {
    return this.materials?.controls.reduce((sum, row) => sum + (Number(row.get('amount')?.value) || 0), 0) || 0;
  }

  connectionTotal() {
    const total = (Number(this.form.get('connection_charge')?.value) || 0)
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

  paymentStatusLabel(value: any) {
    const status = String(value || 'PENDING').toUpperCase();
    if (status === 'PAID') return 'Paid';
    if (status === 'PARTIAL') return 'Partially Paid';
    return 'Payment Pending';
  }

  approveReview() {
    if (!this.permissions.isAdmin() || !this.isReviewMode || !this.workflowId || !this.reviewApprovalPending || this.approvalInProgress) return;
    if (!confirm('Approve the reviewed Cable TV customer details?')) return;
    this.approvalInProgress = true;
    this.ngxLoader.start();
    this.workflowService.approveWorkflow(this.workflowId).subscribe({
      next: (response: any) => {
        this.approvalInProgress = false;
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/workflow-approval');
      },
      error: (error: any) => {
        this.approvalInProgress = false;
        this.handleError(error);
      }
    });
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
      status: 'ACTIVE'
    });
    this.applyStbIssuePrice();
  }

  applyStbIssuePrice() {
    if (this.section !== 'stbs') return;
    const selected = (this.lookups.stbMasters || []).find((item: any) => Number(item.stb_master_id) === Number(this.form.get('stb_master_id')?.value));
    const fullSet = this.form.get('issue_mode')?.value === 'FULL_SET';
    const fallbackAmount = Number(fullSet
      ? this.form.get('master_full_set_amount')?.value
      : this.form.get('master_stb_amount')?.value
    );
    this.form.patchValue({
      stb_amount: selected
        ? Number(fullSet ? selected.full_set_amount : selected.stb_amount) || (fullSet ? 800 : 500)
        : fallbackAmount || 0
    }, { emitEvent: false });
    if (fullSet) {
      this.enforceFullSetAccessories();
    } else {
      this.stbAccessories.controls.forEach((row) => row.patchValue({ selected: false }, { emitEvent: false }));
    }
    this.calculateBalance();
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
    const replacement = this.showStbIssueDetails;
    const reactivate = this.isReactivateReason;
    const returned = this.isReturnReason;
    const stbNo = this.form.get('stb_no');
    const stbMaster = this.form.get('stb_master_id');
    const refundAmount = this.form.get('refund_amount');
    if (replacement) {
      stbNo?.setValidators([Validators.required]);
      stbMaster?.setValidators([Validators.required]);
      this.form.patchValue({ status: 'ACTIVE' }, { emitEvent: false });
      refundAmount?.clearValidators();
      this.form.patchValue({ refund_amount: 0 }, { emitEvent: false });
      this.enforceFullSetAccessories();
    } else if (reactivate) {
      stbNo?.clearValidators();
      stbMaster?.clearValidators();
      refundAmount?.clearValidators();
      this.form.patchValue({
        stb_master_id: null,
        stb_no: '',
        issue_mode: 'BOX_ONLY',
        customer_paid_amount: 0,
        balance_amount: 0,
        due_date: '',
        overall_discount: 0,
        refund_amount: 0,
        status: 'ACTIVE'
      }, { emitEvent: false });
      this.returnAccessoriesInitialized = false;
      this.stbAccessories.controls.forEach((row) => row.patchValue({ selected: false }, { emitEvent: false }));
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
        status: this.statusForStbReason(this.form.get('reason')?.value)
      }, { emitEvent: false });
      if (returned) {
        refundAmount?.setValidators([Validators.required, Validators.min(0)]);
        if (!this.returnAccessoriesInitialized) {
          const activeStbId = Number(this.currentActiveStb.customer_stb_id);
          const returnedProductIds = new Set((this.details.stbAccessories || [])
            .filter((item: any) => Number(item.customer_stb_id) === activeStbId
              && String(item.movement_type || 'ISSUE').toUpperCase() === 'ISSUE')
            .map((item: any) => Number(item.product_id)));
          this.stbAccessories.controls.forEach((row) => row.patchValue({
            selected: returnedProductIds.has(Number(row.get('product_id')?.value)),
            qty: 1
          }, { emitEvent: false }));
          this.returnAccessoriesInitialized = true;
        }
      } else {
        refundAmount?.clearValidators();
        this.form.patchValue({ refund_amount: 0 }, { emitEvent: false });
        this.returnAccessoriesInitialized = false;
        this.stbAccessories.controls.forEach((row) => row.patchValue({ selected: false }, { emitEvent: false }));
      }
    }
    stbNo?.updateValueAndValidity({ emitEvent: false });
    stbMaster?.updateValueAndValidity({ emitEvent: false });
    refundAmount?.updateValueAndValidity({ emitEvent: false });
    this.calculateBalance();
  }

  reasonLabel(reason: string) {
    if (['BROKEN', 'DAMAGED'].includes(String(reason || '').toUpperCase())) return 'Damaged';
    return String(reason || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  statusForStbReason(reason: any) {
    const value = String(reason || '').toUpperCase();
    if (this.disconnectedStbReasons.includes(value)) return 'ACTIVE';
    if (['FAULT', 'DAMAGED', 'BROKEN', 'BURNT'].includes(value)) return 'FAULT';
    if (value === 'RETURNED') return 'RETRIEVED';
    return 'DISCONNECTED';
  }

  stbTypeLabel(row: any) {
    const reason = String(row?.update_reason || '').toUpperCase();
    if (['FAULT', 'DAMAGED', 'BROKEN', 'BURNT'].includes(reason)) return 'Fault';
    if (['DISCONNECT', 'VACATED', 'STB_LOST', 'OUTSTATION'].includes(reason)) return 'Disconnected';
    if (reason === 'RETURNED') return 'Retrieved';
    return row?.stb_type || '-';
  }

  connectionTypeLabel(row: any) {
    const firstConnectionId = Math.min(
      ...(this.details.connections || []).map((item: any) => Number(item.connection_id)).filter(Number.isFinite)
    );
    if (Number(row?.connection_id) === firstConnectionId) return 'New';
    const value = String(row?.connection_type || '').toUpperCase();
    if (value === 'NEW') return 'New';
    if (value === 'SHIFTED') return 'Location Change';
    if (value === 'TRANSFERRED') return 'Transferred';
    return 'Reconnection';
  }

  applyLocationChangeState() {
    if (this.section !== 'connections' || !this.form) return;
    for (const name of ['new_door_no', 'new_location_id', 'new_area_id', 'new_street_id']) {
      const control = this.form.get(name);
      if (this.isLocationChange) control?.setValidators([Validators.required]);
      else {
        control?.clearValidators();
        control?.setValue(name === 'new_door_no' ? '' : null, { emitEvent: false });
      }
      control?.updateValueAndValidity({ emitEvent: false });
    }
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
