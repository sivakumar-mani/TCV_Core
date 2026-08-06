import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { forkJoin } from 'rxjs';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-cable-tv-stbs',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cable-tv-stbs.html',
  styleUrl: './cable-tv-stbs.scss'
})
export class CableTvStbs {
  stbs: any[] = [];
  msos: any[] = [];
  employees: any[] = [];
  stbForm!: FormGroup;
  showStbModal = false;
  editingStbId: number | null = null;
  boxTypes = ['HD', 'SD'];
  stockTypes = ['NEW', 'SERVICED', 'RETURNED', 'FAULT', 'DAMAGED', 'BURNT'];
  statuses = ['AVAILABLE', 'IN_SERVICE', 'NOT_SERVICEABLE', 'NOT_AVAILABLE'];
  filters = { stbNumber: '', stockType: '', employeeId: '', status: '' };

  get countWidgets() {
    const definitions = [
      { key: 'NEW', label: 'New', matches: (item: any) => String(item.stock_type || '').toUpperCase() === 'NEW' },
      { key: 'IN_SERVICE', label: 'In Service', matches: (item: any) => String(item.status || '').toUpperCase() === 'IN_SERVICE' },
      { key: 'SERVICED', label: 'Serviced', matches: (item: any) => String(item.stock_type || '').toUpperCase() === 'SERVICED' },
      { key: 'RETURNED', label: 'Returned', matches: (item: any) => String(item.stock_type || '').toUpperCase() === 'RETURNED' }
    ];
    return definitions.map((definition) => {
      const rows = this.stbs.filter(definition.matches);
      const available = rows.filter((item) => String(item.status || '').toUpperCase() === 'AVAILABLE').length;
      return {
        ...definition,
        total: rows.length,
        available,
        unavailable: rows.length - available
      };
    });
  }

  get filteredStbs() {
    const stbNumber = this.filters.stbNumber.trim().toLowerCase();
    return this.stbs
      .filter((item) =>
        (!stbNumber || String(item.stb_number || '').toLowerCase().includes(stbNumber))
        && (!this.filters.stockType || item.stock_type === this.filters.stockType)
        && (!this.filters.employeeId || String(item.assigned_employee_id || '') === this.filters.employeeId)
        && (!this.filters.status || item.status === this.filters.status)
      )
      .sort((left, right) =>
        String(left.status || '').localeCompare(String(right.status || ''))
        || String(left.stb_number || '').localeCompare(String(right.stb_number || ''))
      );
  }

  get availableStockTypes() {
    if (this.editingStbId) return this.stockTypes;
    const stbNumber = String(this.stbForm?.get('stb_number')?.value || '').trim().toLowerCase();
    if (!stbNumber) return this.stockTypes;
    const matches = this.stbs.filter(
      (item) => String(item.stb_number || '').trim().toLowerCase() === stbNumber
    );
    if (!matches.length) return this.stockTypes;
    const latest = [...matches].sort((a, b) => {
      const dateDifference = new Date(b.updated_date || b.updated_at || 0).getTime()
        - new Date(a.updated_date || a.updated_at || 0).getTime();
      return dateDifference || Number(b.stb_master_id || 0) - Number(a.stb_master_id || 0);
    })[0];
    return this.isFaultType(latest.stock_type)
      ? ['SERVICED']
      : String(latest.stock_type || '').toUpperCase() === 'SERVICED'
        ? ['FAULT', 'DAMAGED', 'BURNT']
        : [];
  }

  constructor(
    private fb: FormBuilder,
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private snackbar: Snackbar
  ) {}

  ngOnInit() {
    const today = new Date().toISOString().slice(0, 10);
    this.stbForm = this.fb.group({
      stb_number: ['', Validators.required],
      box_type: ['HD', Validators.required],
      stock_type: ['NEW', Validators.required],
      mso_id: [null],
      stb_amount: [500, [Validators.required, Validators.min(0)]],
      full_set_amount: [800, [Validators.required, Validators.min(0)]],
      assigned_employee_id: [null],
      status: ['AVAILABLE', Validators.required],
      updated_date: [today, Validators.required]
    });
    this.stbForm.get('stb_number')?.valueChanges.subscribe(() => {
      if (!this.editingStbId && this.availableStockTypes.length === 1) {
        this.stbForm.patchValue({ stock_type: 'SERVICED' }, { emitEvent: false });
      }
    });
    this.stbForm.get('stock_type')?.valueChanges.subscribe((stockType) => {
      if (this.isFaultType(stockType)) {
        this.stbForm.patchValue({
          status: 'IN_SERVICE',
          assigned_employee_id: null
        }, { emitEvent: false });
      }
    });
    this.stbForm.get('status')?.valueChanges.subscribe((status) => {
      if (['IN_SERVICE', 'NOT_SERVICEABLE'].includes(status)) {
        this.stbForm.patchValue({ stock_type: 'FAULT' }, { emitEvent: false });
      }
      if (
        ['IN_SERVICE', 'NOT_SERVICEABLE'].includes(status)
        || this.isFaultType(this.stbForm.get('stock_type')?.value)
      ) {
        this.stbForm.patchValue({ assigned_employee_id: null }, { emitEvent: false });
      }
      if (status === 'AVAILABLE' && this.isFaultType(this.stbForm.get('stock_type')?.value)) {
        this.stbForm.patchValue({ stock_type: 'SERVICED' }, { emitEvent: false });
      }
    });
    this.loadStbs();
  }

  loadStbs() {
    this.ngxLoader.start();
    forkJoin({
      masters: this.cableTvService.getMasters(),
      lookups: this.cableTvService.getLookups()
    }).subscribe({
      next: ({ masters, lookups }: any) => {
        this.ngxLoader.stop();
        this.msos = lookups?.installedMsos || [];
        this.employees = lookups?.employees || [];
        this.stbs = masters?.stbMasters || [];
      },
      error: (error: any) => this.handleError(error)
    });
  }

  openStbModal() {
    this.editingStbId = null;
    this.stbForm.reset({
      box_type: 'HD',
      stock_type: 'NEW',
      stb_amount: 500,
      full_set_amount: 800,
      assigned_employee_id: null,
      status: 'AVAILABLE',
      updated_date: new Date().toISOString().slice(0, 10)
    });
    this.showStbModal = true;
  }

  editStb(item: any) {
    this.editingStbId = Number(item.stb_master_id);
    this.stbForm.reset({
      stb_number: item.stb_number,
      box_type: item.box_type,
      stock_type: item.stock_type,
      mso_id: item.mso_id ? Number(item.mso_id) : null,
      stb_amount: Number(item.stb_amount),
      full_set_amount: Number(item.full_set_amount),
      assigned_employee_id: item.assigned_employee_id ? Number(item.assigned_employee_id) : null,
      status: item.status,
      updated_date: this.dateInputValue(item.updated_date || item.updated_at)
    }, { emitEvent: false });
    this.showStbModal = true;
  }

  closeStbModal() {
    this.showStbModal = false;
    this.editingStbId = null;
  }

  resetFilters() {
    this.filters = { stbNumber: '', stockType: '', employeeId: '', status: '' };
  }

  saveStb() {
    if (this.stbForm.invalid) {
      this.stbForm.markAllAsTouched();
      this.snackbar.openSnackbar('Please complete all required STB fields', globalConstants.errorRegex);
      return;
    }

    this.ngxLoader.start();
    const request = this.editingStbId
      ? this.cableTvService.updateStbMaster(this.editingStbId, this.stbForm.value)
      : this.cableTvService.addStbMaster(this.stbForm.value);
    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.snackbar.openSnackbar(response?.message || 'STB saved successfully', '');
        this.closeStbModal();
        this.loadStbs();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  deleteStb(item: any) {
    if (!confirm(`Delete STB ${item.stb_number}?`)) return;
    this.ngxLoader.start();
    this.cableTvService.deleteStbMaster(Number(item.stb_master_id)).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.snackbar.openSnackbar(response?.message || 'STB deleted successfully', '');
        this.loadStbs();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  assignStb(item: any, employeeId: any) {
    const assignedEmployeeId = Number(employeeId);
    if (!assignedEmployeeId || assignedEmployeeId === Number(item.assigned_employee_id)) return;
    this.ngxLoader.start();
    this.cableTvService.assignStbMaster(item.stb_master_id, assignedEmployeeId).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.snackbar.openSnackbar(response?.message || 'STB assigned successfully', '');
        this.loadStbs();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  canAssign(item: any) {
    return item.status === 'AVAILABLE' && !this.isFaultType(item.stock_type);
  }

  statusLabel(status: any) {
    return String(status || '').replace(/_/g, ' ');
  }

  private isFaultType(value: any) {
    return ['FAULT', 'DAMAGED', 'BURNT'].includes(String(value || '').toUpperCase());
  }

  private handleError(error: any) {
    this.ngxLoader.stop();
    this.snackbar.openSnackbar(error?.error?.message || globalConstants.genericError, globalConstants.errorRegex);
  }

  private dateInputValue(value: any) {
    if (!value) return '';
    return String(value).slice(0, 10);
  }
}
