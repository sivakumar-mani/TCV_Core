import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { CommonMethods } from '../../shared/common-methods';
import { WorkflowServices } from '../../services/workflow-services';

type ViewSection = 'customer' | 'connections' | 'stbs' | 'packages' | 'subscriptions' | 'accounts';

@Component({
  selector: 'app-cable-tv-customer-view',
  imports: [CommonModule, RouterLink],
  templateUrl: './cable-tv-customer-view.html',
  styleUrl: './cable-tv-customer-view.scss'
})
export class CableTvCustomerView {
  customerId = 0;
  customer: any = {};
  details: any = {};
  lookups: any = {};
  isReviewMode = false;
  workflowId = '';
  openSections = new Set<ViewSection>(['customer', 'connections', 'stbs', 'packages', 'subscriptions', 'accounts']);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cableTvService: CableTvServices,
    private workflowService: WorkflowServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods
  ) {}

  ngOnInit() {
    this.customerId = Number(this.route.snapshot.paramMap.get('id'));
    this.isReviewMode = this.route.snapshot.queryParamMap.get('review') === 'true';
    this.workflowId = this.route.snapshot.queryParamMap.get('workflowId') || '';
    this.loadData();
  }

  get connections() { return this.details.connections || []; }
  get stbs() { return this.details.stbs || []; }
  get packages() { return this.details.customerPackages || []; }
  get subscriptions() { return this.details.subscriptions || []; }
  get accounts() { return this.details.accounts || []; }
  get latestStb() { return this.stbs[0] || {}; }
  get canApprove() {
    return this.isReviewMode
      && Boolean(this.workflowId)
      && String(this.customer.approval_status || '').toUpperCase() === 'PENDING';
  }

  get customerAddress() {
    return [
      this.customer.door_no,
      this.customer.street_name || this.lookupLabel('streets', 'street_id', this.customer.street_id, 'street_name'),
      this.customer.area_name || this.lookupLabel('areas', 'area_id', this.customer.area_id, 'area_name'),
      this.customer.location_name || this.lookupLabel('locations', 'location_id', this.customer.location_id, 'location_name'),
      this.customer.city,
      this.customer.pincode
    ].filter(Boolean).join(', ') || '-';
  }

  get networkName() {
    return this.customer.network_name
      || this.lookupLabel('networks', 'network_id', this.customer.network_id, 'network_name')
      || this.customer.network_type
      || '-';
  }

  get sourceName() {
    return this.customer.source_name
      || this.lookupLabel('sources', 'source_id', this.customer.source_id, 'source_name')
      || '-';
  }

  get installedByName() {
    return this.customer.installed_by_name
      || this.lookupLabel('employees', 'employee_id', this.customer.installed_by_employee_id, 'employee_name')
      || '-';
  }

  loadData() {
    this.ngxLoader.start();
    forkJoin({
      details: this.cableTvService.getCustomerById(this.customerId),
      lookups: this.cableTvService.getLookups()
    }).subscribe({
      next: ({ details, lookups }: any) => {
        this.ngxLoader.stop();
        this.details = details || {};
        this.customer = this.details.customer || {};
        this.lookups = lookups || {};
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  toggle(section: ViewSection) {
    if (this.isReviewMode) return;
    if (this.openSections.has(section)) this.openSections.delete(section);
    else this.openSections.add(section);
  }

  isOpen(section: ViewSection) {
    return this.openSections.has(section);
  }

  materialsFor(connection: any) {
    return (this.details.materials || [])
      .filter((item: any) => Number(item.connection_id) === Number(connection.connection_id))
      .map((item: any) => `${item.item_name || 'Material'} (${item.qty || 0} ${item.unit || ''})`)
      .join(', ') || '-';
  }

  accessoriesFor(stb: any) {
    return (this.details.stbAccessories || [])
      .filter((item: any) => Number(item.customer_stb_id) === Number(stb.customer_stb_id))
      .map((item: any) => `${item.product_name || item.accessory_name || 'Accessory'} (${item.qty || 0} ${item.unit || ''})`)
      .join(', ') || '-';
  }

  subscriptionPeriod(row: any) {
    const month = new Date(2000, Number(row.subscription_month || 1) - 1, 1)
      .toLocaleString('en-US', { month: 'short' }).toUpperCase();
    return `${month}-${row.subscription_year || '-'}`;
  }

  periodCount(row: any) {
    const count = Number(row.number_of_days_or_months || 0);
    const basis = String(row.billing_basis || '').toLowerCase();
    return count ? `${count} ${basis}${count === 1 ? '' : 's'}` : '-';
  }

  packageStatus(row: any) {
    if (String(row.approval_status || '').toUpperCase() === 'PENDING') return 'Pending';
    return Number(row.is_active) === 1 ? 'Active' : 'Inactive';
  }

  subscriptionStatus(row: any) {
    if (String(row.approval_status || '').toUpperCase() === 'PENDING') return 'Pending';
    const status = String(row.payment_status || '').toUpperCase();
    if (status === 'PAID') return 'Paid';
    if (status === 'PARTIAL') return 'Partially Paid';
    return status === 'PENDING' ? 'Unpaid' : (status || '-');
  }

  printPage() {
    window.print();
  }

  approveCustomer() {
    if (!this.canApprove) return;
    if (!confirm(`Approve CATV customer ${this.customer.customer_code || this.customerId}?`)) return;
    this.ngxLoader.start();
    this.workflowService.approveWorkflow(this.workflowId, { remarks: 'CATV new customer approved from review' }).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.router.navigateByUrl('/workflow-approval');
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  goBack() {
    this.router.navigateByUrl(this.isReviewMode ? '/workflow-approval' : '/cable-tv/customers');
  }

  private lookupLabel(listName: string, idKey: string, id: any, labelKey: string) {
    if (id === null || id === undefined || id === '') return '';
    const item = (this.lookups[listName] || []).find((entry: any) => String(entry[idKey]) === String(id));
    return item?.[labelKey] || '';
  }
}
