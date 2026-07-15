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
    customerNo: '',
    networkId: '',
    name: '',
    mobile: '',
    areaId: '',
    streetId: '',
    status: ''
  };
  readonly statusOptions = ['ACTIVE', 'INACTIVE', 'DISCONNECTED', 'SHIFTED', 'TRANSFERRED'];

  defaultColDef: ColDef = {
    resizable: true,
    minWidth: 120,
    flex: 1,
    filter: false,
    floatingFilter: false,
    headerClass: 'ag-header-style'
  };

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'customer_code', headerName: 'Customer No', maxWidth: 140 },
    { field: 'network_display', headerName: 'Network', maxWidth: 140 },
    { field: 'full_name', headerName: 'Full Name', minWidth: 180 },
    { field: 'address_display', headerName: 'Address', minWidth: 240 },
    { field: 'mobile_display', headerName: 'Mobile No', minWidth: 180 },
    { field: 'stb_display', headerName: 'STB', minWidth: 260 },
    {
      headerName: 'Package Amount',
      minWidth: 170,
      cellRenderer: (params: any) => {
        const wrapper = document.createElement('span');
        wrapper.className = 'package-cell';
        wrapper.textContent = params.data?.package_amount_display || '-';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'package-info';
        button.textContent = 'i';
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          this.zone.run(() => this.openPackageInfo(params.data));
        });
        wrapper.appendChild(button);
        return wrapper;
      }
    },
    { field: 'status', headerName: 'Status', maxWidth: 130 },
    {
      headerName: 'Action',
      maxWidth: 120,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'View', action: (row: any) => this.viewCustomer(row) },
          { label: 'Update', action: (row: any) => this.editCustomer(row) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router,
    private route: ActivatedRoute,
    private zone: NgZone
  ) {}

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
      return true;
    });
  }

  resetFilters() {
    this.filters = { customerNo: '', networkId: '', name: '', mobile: '', areaId: '', streetId: '', status: '' };
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

  decorateCustomer(customer: any) {
    const stbParts = customer.stb_no
      ? [
          customer.stb_no,
          this.formatDate(customer.installed_date),
          customer.stb_installed_by_name || customer.installed_by_name
        ].filter(Boolean)
      : [];
    const amountValue = customer.package_price ?? customer.master_package_price ?? customer.subscription_amount;
    return {
      ...customer,
      network_display: customer.network_type || customer.network_name || '-',
      address_display: [customer.door_no, customer.street_name, customer.area_name].filter(Boolean).join(' / ') || '-',
      mobile_display: [customer.mobile_no, customer.alternate_mobile_no].filter(Boolean).join(' / ') || '-',
      stb_display: stbParts.length ? stbParts.join(' / ') : '-',
      package_amount_display: amountValue === null || amountValue === undefined ? '-' : this.formatMoney(amountValue)
    };
  }

  openPackageInfo(customer: any) {
    this.selectedPackageInfo = {
      package_name: customer?.package_name || '-',
      package_type: customer?.package_type || '-',
      package_price: customer?.package_price ?? customer?.master_package_price,
      subscription_amount: customer?.subscription_amount
    };
  }

  closePackageInfo() {
    this.selectedPackageInfo = null;
  }

  formatDate(value: any) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB');
  }

  formatMoney(value: any) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
  }

}
