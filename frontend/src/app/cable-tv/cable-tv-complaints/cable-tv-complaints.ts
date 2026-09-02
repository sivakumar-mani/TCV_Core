import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-cable-tv-complaints',
  imports: [CommonModule, FormsModule],
  templateUrl: './cable-tv-complaints.html',
  styleUrl: './cable-tv-complaints.scss'
})
export class CableTvComplaints {
  complaints: any[] = [];
  customers: any[] = [];
  customerDirectories: Record<string, any[]> = { CATV: [], NET: [], CCTV: [] };
  employees: any[] = [];
  selectedComplaint: any = null;
  viewedComplaint: any = null;
  showRegisterModal = false;
  customerContextLocked = false;
  showAttemptModal = false;
  showViewModal = false;
  callerType: 'CATV' | 'NET' | 'CCTV' | 'ANONYMOUS' = 'CATV';
  customerSearch = '';
  mapCustomerSearch = '';
  filters = { search: '', status: '', assigned_employee_id: '' };
  statuses = ['OPEN', 'IN_PROGRESS', 'HOLD', 'PENDING', 'COMPLETED'];
  updateStatuses = ['IN_PROGRESS', 'HOLD', 'PENDING', 'COMPLETED'];
  readonly complaintSubjects = [
    'Accessories Required', 'CCTV Not Working', 'Channel Problem/Package Change',
    'Disconnection', 'Internet Not Working', 'Location Change', 'New Connection /Enquiry',
    'Other CATV Issue', 'Picture Not Clear', 'Recharge / Payment Collection', 'Reconnection',
    'Signal Issue/ Bad Signal', 'Slow Internet', 'STB Problem', 'Subscription Failure',
    'Wire Cut / Cable Fault'
  ];
  complaint = this.emptyComplaint();
  attempt = this.emptyAttempt();

  constructor(
    private cableTvService: CableTvServices,
    private loader: NgxUiLoaderService,
    private snackbar: Snackbar,
    private route: ActivatedRoute,
    public permissions: PermissionService
  ) {}

  ngOnInit() {
    const requestedStatus = String(this.route.snapshot.queryParamMap.get('status') || '').toUpperCase();
    if (this.statuses.includes(requestedStatus)) this.filters.status = requestedStatus;
    this.loadReferenceData();
    this.route.queryParamMap.subscribe(params => {
      const customerId = Number(params.get('customerId') || 0);
      const customerType = String(params.get('customerType') || 'CATV').toUpperCase();
      if (customerId) {
        this.openRegister(customerId, ['CATV', 'NET', 'CCTV'].includes(customerType) ? customerType : 'CATV');
      }
    });
  }

  emptyComplaint(): any {
    return {
      complainant_type: 'CATV', customer_id: null, cable_customer_id: null,
      service_customer_id: null, internet_customer_id: null,
      anonymous_name: '', anonymous_mobile: '',
      reported_mobile: '', anonymous_address: '', subject: '', nature_of_complaint: ''
    };
  }

  emptyAttempt(): any {
    return {
      status: 'IN_PROGRESS', assigned_employee_id: null, mapping_type: 'CATV',
      cable_customer_id: null, internet_customer_id: null, service_customer_id: null,
      start_time: '', end_time: '', description: ''
    };
  }

  get availableUpdateStatuses() {
    return this.selectedComplaint?.status === 'OPEN' ? ['IN_PROGRESS'] : this.updateStatuses;
  }

  get registrationCustomers() {
    return this.filterCustomers(this.customerSearch, this.callerType);
  }

  get mappingCustomers() {
    return this.filterCustomers(this.mapCustomerSearch, this.attempt.mapping_type);
  }

  get selectedRegistrationCustomer() {
    return (this.customerDirectories[this.callerType] || this.customers).find(customer =>
      Number(customer.customer_id) === Number(this.complaint.customer_id)
    );
  }

  loadReferenceData() {
    this.loader.start();
    forkJoin({
      complaints: this.cableTvService.getComplaints(this.filters),
      catvCustomers: this.cableTvService.getComplaintCustomers('CATV'),
      netCustomers: this.cableTvService.getComplaintCustomers('NET'),
      cctvCustomers: this.cableTvService.getComplaintCustomers('CCTV'),
      lookups: this.cableTvService.getLookups()
    }).subscribe({
      next: ({ complaints, catvCustomers, netCustomers, cctvCustomers, lookups }: any) => {
        this.loader.stop();
        this.complaints = Array.isArray(complaints) ? complaints : [];
        this.customerDirectories = {
          CATV: Array.isArray(catvCustomers) ? catvCustomers : [],
          NET: Array.isArray(netCustomers) ? netCustomers : [],
          CCTV: Array.isArray(cctvCustomers) ? cctvCustomers : []
        };
        this.customers = this.callerType === 'ANONYMOUS' ? [] : this.customerDirectories[this.callerType] || [];
        this.employees = lookups?.employees || [];
      },
      error: error => this.handleError(error)
    });
  }

  search() {
    this.loader.start();
    this.cableTvService.getComplaints(this.filters).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.complaints = Array.isArray(response) ? response : [];
      },
      error: error => this.handleError(error)
    });
  }

  resetFilters() {
    this.filters = { search: '', status: '', assigned_employee_id: '' };
    this.search();
  }

  openRegister(customerId?: number, customerType: string = 'CATV') {
    this.complaint = this.emptyComplaint();
    this.customerSearch = '';
    this.customerContextLocked = Boolean(customerId);
    this.callerType = customerType as 'CATV' | 'NET' | 'CCTV';
    this.complaint.complainant_type = this.callerType;
    this.customers = this.customerDirectories[this.callerType] || [];
    this.complaint.customer_id = customerId || null;
    this.showRegisterModal = true;
    if (customerId) this.loadLockedCustomer(this.callerType, customerId);
  }

  private loadLockedCustomer(customerType: 'CATV' | 'NET' | 'CCTV', customerId: number) {
    this.cableTvService.getComplaintCustomers(customerType, customerId).subscribe({
      next: (response: any) => {
        const customer = (Array.isArray(response) ? response : []).find(item =>
          Number(item.customer_id) === Number(customerId)
        );
        if (!customer) return;
        const directory = this.customerDirectories[customerType] || [];
        this.customerDirectories[customerType] = [
          customer,
          ...directory.filter(item => Number(item.customer_id) !== Number(customerId))
        ];
        if (this.callerType === customerType) this.customers = this.customerDirectories[customerType];
      },
      error: error => this.handleError(error)
    });
  }

  closeRegister() {
    this.showRegisterModal = false;
  }

  onCallerTypeChange() {
    this.complaint.complainant_type = this.callerType;
    this.complaint.customer_id = null;
    this.customerSearch = '';
    this.customers = this.callerType === 'ANONYMOUS' ? [] : this.customerDirectories[this.callerType] || [];
    if (this.callerType !== 'ANONYMOUS') {
      this.complaint.anonymous_name = '';
      this.complaint.anonymous_mobile = '';
      this.complaint.anonymous_address = '';
    }
  }

  registerComplaint() {
    if (!this.complaint.subject?.trim()) {
      this.showError('Subject is required');
      return;
    }
    if (!this.complaint.nature_of_complaint?.trim()) {
      this.showError('Nature of complaint is required');
      return;
    }
    if (this.callerType !== 'ANONYMOUS' && !this.complaint.customer_id) {
      this.showError('Select a customer');
      return;
    }
    if (this.callerType === 'ANONYMOUS' && !this.complaint.anonymous_name?.trim() && !this.complaint.anonymous_mobile?.trim()) {
      this.showError('Enter caller name or mobile number');
      return;
    }
    this.loader.start();
    const payload = {
      ...this.complaint,
      complainant_type: this.callerType,
      cable_customer_id: this.callerType === 'CATV' ? this.complaint.customer_id : null,
      internet_customer_id: this.callerType === 'NET' ? this.complaint.customer_id : null,
      service_customer_id: this.callerType === 'CCTV' ? this.complaint.customer_id : null
    };
    this.cableTvService.addComplaint(payload).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.snackbar.openSnackbar(`${response.message} (${response.complaint_no})`, '');
        this.closeRegister();
        this.search();
      },
      error: error => this.handleError(error)
    });
  }

  openComplaint(row: any) {
    this.loader.start();
    this.cableTvService.getComplaintById(Number(row.complaint_id)).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.selectedComplaint = response;
        this.attempt = this.emptyAttempt();
        this.mapCustomerSearch = '';
        this.attempt.assigned_employee_id = response.assigned_employee_id
          ? Number(response.assigned_employee_id)
          : this.permissions.employeeId();
        this.attempt.cable_customer_id = response.cable_customer_id
          ? Number(response.cable_customer_id)
          : null;
        this.attempt.service_customer_id = response.service_customer_id
          ? Number(response.service_customer_id)
          : null;
        this.attempt.internet_customer_id = response.internet_customer_id
          ? Number(response.internet_customer_id)
          : null;
        this.attempt.mapping_type = response.complainant_type === 'ANONYMOUS' ? 'CATV' : response.complainant_type;
        this.attempt.start_time = this.localDateTime();
        this.attempt.end_time = this.localDateTime();
        this.showAttemptModal = true;
      },
      error: error => this.handleError(error)
    });
  }

  viewComplaint(row: any) {
    this.loader.start();
    this.cableTvService.getComplaintById(Number(row.complaint_id)).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.viewedComplaint = response;
        this.showViewModal = true;
      },
      error: error => this.handleError(error)
    });
  }

  closeView() {
    this.showViewModal = false;
    this.viewedComplaint = null;
  }

  closeAttempt() {
    this.showAttemptModal = false;
    this.selectedComplaint = null;
  }

  saveAttempt() {
    if (!this.attempt.assigned_employee_id) {
      this.showError('Select the assigned technician');
      return;
    }
    if ((this.attempt.cable_customer_id || this.attempt.internet_customer_id || this.attempt.service_customer_id)
      && (!this.attempt.start_time || !this.attempt.end_time)) {
      this.showError('Start time and end time are required for customer complaints');
      return;
    }
    const payload = {
      ...this.attempt,
      cable_customer_id: this.attempt.mapping_type === 'CATV' ? this.attempt.cable_customer_id : null,
      internet_customer_id: this.attempt.mapping_type === 'NET' ? this.attempt.internet_customer_id : null,
      service_customer_id: this.attempt.mapping_type === 'CCTV' ? this.attempt.service_customer_id : null,
      start_time: this.mysqlDateTime(this.attempt.start_time),
      end_time: this.mysqlDateTime(this.attempt.end_time)
    };
    this.loader.start();
    this.cableTvService.addComplaintAttempt(Number(this.selectedComplaint.complaint_id), payload).subscribe({
      next: (response: any) => {
        this.loader.stop();
        this.snackbar.openSnackbar(response.message, '');
        this.closeAttempt();
        this.search();
      },
      error: error => this.handleError(error)
    });
  }

  displayCustomer(row: any) {
    return row.customer_code
      ? `${row.customer_code} - ${row.customer_name}`
      : `${row.anonymous_name || 'Anonymous'}${row.anonymous_mobile ? ` - ${row.anonymous_mobile}` : ''}`;
  }

  customerAddress(customer: any) {
    return customer?.address || '-';
  }

  onMappingTypeChange() {
    this.mapCustomerSearch = '';
    this.attempt.cable_customer_id = null;
    this.attempt.internet_customer_id = null;
    this.attempt.service_customer_id = null;
  }

  selectMappedCustomer(customerId: any) {
    if (this.attempt.mapping_type === 'CATV') this.attempt.cable_customer_id = customerId;
    else if (this.attempt.mapping_type === 'NET') this.attempt.internet_customer_id = customerId;
    else this.attempt.service_customer_id = customerId;
  }

  mappedCustomerId() {
    return this.attempt.mapping_type === 'CATV'
      ? this.attempt.cable_customer_id
      : this.attempt.mapping_type === 'NET'
        ? this.attempt.internet_customer_id
        : this.attempt.service_customer_id;
  }

  private filterCustomers(searchValue: string, type: string) {
    const directory = this.customerDirectories[type] || [];
    const search = String(searchValue || '').trim().toLowerCase();
    if (!search) return directory;
    return directory.filter(customer => [
      customer.customer_code, customer.full_name, customer.mobile_no,
      customer.customer_name, customer.phone, customer.alternate_phone, this.customerAddress(customer)
    ].some(value => String(value || '').toLowerCase().includes(search)));
  }

  statusLabel(status: string) {
    return String(status || '').replaceAll('_', ' ');
  }

  localDateTime() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  mysqlDateTime(value: string) {
    return value ? `${value.replace('T', ' ')}:00` : null;
  }

  private showError(message: string) {
    this.snackbar.openSnackbar(message, globalConstants.errorRegex);
  }

  private handleError(error: any) {
    this.loader.stop();
    this.showError(error?.error?.message || globalConstants.genericError);
  }
}
