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
  stockTypes = ['NEW', 'SERVICED', 'RETURNED', 'FAULT'];
  statuses = ['AVAILABLE', 'NOT_AVAILABLE'];
  filters = { stbNumber: '', stockType: '', employeeId: '', status: '' };

  get filteredStbs() {
    const stbNumber = this.filters.stbNumber.trim().toLowerCase();
    return this.stbs.filter((item) =>
      (!stbNumber || String(item.stb_number || '').toLowerCase().includes(stbNumber))
      && (!this.filters.stockType || item.stock_type === this.filters.stockType)
      && (!this.filters.employeeId || String(item.assigned_employee_id || '') === this.filters.employeeId)
      && (!this.filters.status || item.status === this.filters.status)
    );
  }

  get availableStockTypes() {
    if (this.editingStbId) return this.stockTypes;
    const stbNumber = String(this.stbForm?.get('stb_number')?.value || '').trim().toLowerCase();
    if (!stbNumber) return this.stockTypes;
    const matches = this.stbs.filter(
      (item) => String(item.stb_number || '').trim().toLowerCase() === stbNumber
    );
    return matches.length > 0 && matches.every((item) => item.stock_type === 'FAULT')
      ? ['SERVICED']
      : this.stockTypes;
  }

  constructor(
    private fb: FormBuilder,
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private snackbar: Snackbar
  ) {}

  ngOnInit() {
    this.stbForm = this.fb.group({
      stb_number: ['', Validators.required],
      box_type: ['HD', Validators.required],
      stock_type: ['NEW', Validators.required],
      mso_id: [null],
      stb_amount: [500, [Validators.required, Validators.min(0)]],
      full_set_amount: [800, [Validators.required, Validators.min(0)]],
      assigned_employee_id: [null, Validators.required],
      status: ['AVAILABLE', Validators.required]
    });
    this.stbForm.get('stb_number')?.valueChanges.subscribe(() => {
      if (!this.editingStbId && this.availableStockTypes.length === 1) {
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
    this.stbForm.reset({ box_type: 'HD', stock_type: 'NEW', stb_amount: 500, full_set_amount: 800, assigned_employee_id: null, status: 'AVAILABLE' });
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
      status: item.status
    });
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

  private handleError(error: any) {
    this.ngxLoader.stop();
    this.snackbar.openSnackbar(error?.error?.message || globalConstants.genericError, globalConstants.errorRegex);
  }
}
