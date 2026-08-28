import { CommonModule } from '@angular/common';
import { Component, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../../shared/common-methods';
import { ActionMenu } from '../../shared/list-action-menu';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-cable-tv-customer-list',
  imports: [CommonModule, FormsModule, AgGridList],
  templateUrl: './cable-tv-customer-list.html',
  styleUrl: './cable-tv-customer-list.scss'
})
export class CableTvCustomerList {
  allCustomers: any[] = [];
  customers: any[] = [];
  selectedCustomerId = 0;
  lookups: any = {};
  selectedPackageInfo: any = null;
  filters = {
    customerNo: '', oldCustomerNo: '',
    networkId: '',
    name: '',
    mobile: '',
    areaId: '',
    streetId: '',
    status: ''
  };
  readonly statusOptions = ['ACTIVE', 'DISCONNECTED', 'FREE', 'LEASE_LINE', 'RETRIEVED', 'INACTIVE', 'SHIFTED', 'TRANSFERRED'];
  readonly customerActions = [
    { label: 'View', action: (row: any) => this.viewCustomer(row) },
    { label: 'Complaint', action: (row: any) => this.registerComplaint(row) },
    { label: 'Update', action: (row: any) => this.editCustomer(row), visible: (row: any) => this.canUpdateCustomer(row) }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    minWidth: 120,
    flex: 1,
    filter: 'agTextColumnFilter',
    floatingFilter: true,
    filterParams: { buttons: ['reset'], maxNumConditions: 1 },
    headerClass: 'ag-header-style'
  };

  colDefs: ColDef[] = [
    { headerName: 'Serial #', width: 92, minWidth: 92, maxWidth: 92, flex: 0, cellRenderer: ActionMenu, cellRendererParams: { showSerial: true, statusAware: true, dropdownMenu: this.customerActions }, filter: false, floatingFilter: false, sortable: false },
    { field: 'customer_code', headerName: 'Cust No', width: 92, minWidth: 92, maxWidth: 92, flex: 0 },
    { field: 'legacy_customer_no', headerName: 'Old C No', width: 100, minWidth: 100, maxWidth: 100, flex: 0 },
    { field: 'network_display', headerName: 'Network', width: 100, minWidth: 100, maxWidth: 100, flex: 0, valueFormatter: (params: any) => this.titleCaseText(params.value), filter: 'agTextColumnFilter', filterParams: { filterOptions: ['equals'], defaultOption: 'equals', buttons: ['reset'], maxNumConditions: 1 } },
    { field: 'customer_type', headerName: 'CType', width: 92, minWidth: 92, maxWidth: 92, flex: 0, valueFormatter: (params: any) => this.titleCaseText(params.value) },
    { field: 'full_name', headerName: 'Full Name', minWidth: 180, valueFormatter: (params: any) => this.titleCaseText(params.value) },
    { field: 'address_display', headerName: 'Address', minWidth: 240, valueFormatter: (params: any) => this.titleCaseText(params.value) },
    { field: 'mobile_display', headerName: 'Mobile No', minWidth: 180 },
    { field: 'stb_no', headerName: 'STB Number', width: 150, minWidth: 150, maxWidth: 150, flex: 0, valueFormatter: (params: any) => params.value || '-' },
    { field: 'installed_date', headerName: 'Installed Date', width: 120, minWidth: 120, maxWidth: 120, flex: 0, valueFormatter: (params: any) => this.formatDate(params.value) || '-' },
    {
      headerName: 'Package',
      width: 120,
      minWidth: 120,
      maxWidth: 120,
      flex: 0,
      cellRenderer: (params: any) => {
        const wrapper = document.createElement('span');
        wrapper.className = 'package-cell';
        wrapper.textContent = params.data?.package_amount_display || '-';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'package-info';
        button.textContent = 'i';
        button.title = 'View package information';
        button.setAttribute('aria-label', 'View package information');
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          this.zone.run(() => this.openPackageInfo(params.data));
        });
        wrapper.appendChild(button);
        return wrapper;
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      maxWidth: 150,
      cellRenderer: (params: any) => {
        const status = String(params.value || '-').trim().toUpperCase().replaceAll('_', ' ');
        const pill = document.createElement('span');
        pill.className = 'status-pill';
        if (status === 'ACTIVE') pill.classList.add('success');
        if (['DISCONNECT', 'DISCONNECTED'].includes(status)) pill.classList.add('danger');
        pill.dataset['status'] = status;
        pill.textContent = this.titleCaseText(status);
        return pill;
      },
      filter: 'agTextColumnFilter',
      filterParams: { filterOptions: ['equals'], defaultOption: 'equals', buttons: ['reset'], maxNumConditions: 1 }
    }
  ];

  constructor(
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router,
    private route: ActivatedRoute,
    private zone: NgZone,
    private permissions: PermissionService
  ) {}

  canUpdateCustomer(row: any) {
    if (this.permissions.isAdmin()) return true;
    const status = String(row?.status || '').trim().toUpperCase();
    return !['WAITING APPROVAL', 'PENDING PAYMENT'].includes(status);
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.selectedCustomerId = Number(params.get('customerId') || 0);
      this.loadLookups();
      this.loadCustomers();
    });
  }

  get streetOptions() {
    const streets = this.lookups.streets || [];
    return this.filters.areaId
      ? streets.filter((street: any) => Number(street.area_id) === Number(this.filters.areaId))
      : streets;
  }

  get areaOptions() {
    const areas = this.lookups.areas || [];
    return this.filters.networkId
      ? areas.filter((area: any) => Number(area.network_id) === Number(this.filters.networkId))
      : areas;
  }

  loadLookups() {
    this.cableTvService.getLookups().subscribe({
      next: (response: any) => this.lookups = response || {},
      error: (error: any) => this.commonMethods.handleError(error)
    });
  }

  loadCustomers() {
    this.ngxLoader.start();
    this.cableTvService.getCustomers().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const customers = Array.isArray(response) ? response : response.data ?? [];
        this.allCustomers = customers.map((customer: any) => this.decorateCustomer(customer));
        this.applyFilters();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  applyFilters() {
    const text = (value: any) => String(value || '').toLowerCase().trim();
    this.customers = this.allCustomers.filter((customer: any) => {
      if (this.selectedCustomerId && Number(customer.cable_customer_id) !== this.selectedCustomerId) return false;
      if (this.filters.customerNo && !text(customer.customer_code).includes(text(this.filters.customerNo))) return false;
      if (this.filters.oldCustomerNo && !text(customer.legacy_customer_no).includes(text(this.filters.oldCustomerNo))) return false;
      if (this.filters.networkId && Number(customer.network_id) !== Number(this.filters.networkId)) return false;
      if (this.filters.status && text(customer.status) !== text(this.filters.status).replace('_', ' ')) return false;
      return true;
    });
  }

  resetFilters() {
    this.filters = { customerNo: '', oldCustomerNo: '', networkId: '', name: '', mobile: '', areaId: '', streetId: '', status: '' };
    this.applyFilters();
  }

  onAreaChange() {
    this.filters.streetId = '';
    this.applyFilters();
  }

  onNetworkChange() {
    this.filters.areaId = '';
    this.filters.streetId = '';
    this.applyFilters();
  }

  addCustomer() {
    this.router.navigateByUrl('/cable-tv/customers/add');
  }

  editCustomer(row: any) {
    this.router.navigate(['/cable-tv/customers', row.cable_customer_id]);
  }

  viewCustomer(row: any) {
    this.router.navigate(['/cable-tv/customers/view', row.cable_customer_id]);
  }

  registerComplaint(row: any) {
    this.router.navigate(['/cable-tv/complaints'], {
      queryParams: { customerId: row.cable_customer_id }
    });
  }

  decorateCustomer(customer: any) {
    const amountValue = customer.package_amount ?? customer.package_price ?? customer.master_package_price ?? customer.subscription_amount;
    return {
      ...customer,
      network_display: customer.network_type || customer.network_name || '-',
      address_display: [customer.door_no, customer.street_name, customer.area_name].filter(Boolean).join(' / ') || '-',
      mobile_display: [customer.mobile_no, customer.alternate_mobile_no].filter(Boolean).join(' / ') || '-',
      package_amount_display: amountValue === null || amountValue === undefined ? '-' : this.formatMoney(amountValue)
    };
  }

  openPackageInfo(customer: any) {
    const packages = Array.isArray(customer?.package_information)
      ? customer.package_information.map((item: any) => ({
          package_name: item.package_name || '-',
          package_type: this.formatPackageType(item.package_type),
          amount: Number(item.amount) || 0
        }))
      : [];
    this.selectedPackageInfo = {
      packages,
      total: packages.reduce((total: number, item: any) => total + item.amount, 0)
    };
  }

  closePackageInfo() {
    this.selectedPackageInfo = null;
  }

  formatDate(value: any) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB').replaceAll('/', '-');
  }

  formatMoney(value: any) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
  }

  formatPackageType(value: any) {
    return String(value || '-')
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  titleCaseText(value: any) {
    return String(value ?? '-')
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w+/g, (word) => ['tcv', 'svn', 'lo', 'stb', 'hd'].includes(word) ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`);
  }

}
