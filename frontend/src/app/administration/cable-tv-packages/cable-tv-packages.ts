import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-cable-tv-packages',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cable-tv-packages.html',
  styleUrl: './cable-tv-packages.scss'
})
export class CableTvPackages {
  packages: any[] = [];
  packageSearch = '';
  packageForm!: FormGroup;
  showPackageModal = false;
  editingPackageId: number | null = null;
  saving = false;
  packageTypes = ['MSO_PACKAGE', 'ADDON', 'ALACARTE', 'BROADCAST'];

  constructor(
    private fb: FormBuilder,
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private snackbar: Snackbar,
    public permissions: PermissionService
  ) {}

  ngOnInit() {
    this.packageForm = this.fb.group({
      package_name: ['', Validators.required],
      package_type: ['MSO_PACKAGE', Validators.required],
      service_category: ['CATV', Validators.required],
      internet_network_type: [null],
      price: [0, [Validators.required, Validators.min(0)]],
      gst_percent: [0, [Validators.min(0), Validators.max(100)]],
      price_including_gst: [0, [Validators.min(0)]],
      description: ['']
    });
    this.packageForm.get('price')?.valueChanges.subscribe(() => this.calculateInternetPackagePrice());
    this.packageForm.get('gst_percent')?.valueChanges.subscribe(() => this.calculateInternetPackagePrice());
    this.packageForm.get('service_category')?.valueChanges.subscribe(category => {
      this.packageForm.patchValue({ package_type: 'MSO_PACKAGE', internet_network_type: category === 'INTERNET' ? 'KRISHI' : null, gst_percent: category === 'INTERNET' ? 18 : 0 }, { emitEvent: false });
      this.calculateInternetPackagePrice();
    });
    this.loadPackages();
  }

  get filteredPackages() {
    const search = this.packageSearch.trim().toLocaleLowerCase();
    if (!search) return this.packages;
    return this.packages.filter(item => String(item?.package_name || '').toLocaleLowerCase().includes(search));
  }

  updatePackageSearch(event: Event) {
    this.packageSearch = (event.target as HTMLInputElement).value;
  }

  loadPackages() {
    this.ngxLoader.start();
    this.cableTvService.getMasters().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.packages = response?.packages || [];
      },
      error: (error: any) => this.handleError(error)
    });
  }

  openPackageModal(item?: any) {
    this.editingPackageId = item?.package_id ?? null;
    this.packageForm.reset(item ? { ...item, price: Number(item.price) } : { package_type: 'MSO_PACKAGE', service_category: 'CATV', internet_network_type: null, price: 0, gst_percent: 0, price_including_gst: 0 }, { emitEvent: false });
    for (const field of ['package_type', 'service_category', 'internet_network_type']) {
      if (item) this.packageForm.get(field)?.disable({ emitEvent: false });
      else this.packageForm.get(field)?.enable({ emitEvent: false });
    }
    this.showPackageModal = true;
  }

  closePackageModal() {
    if (this.saving) return;
    this.showPackageModal = false;
  }

  savePackage() {
    if (this.saving) return;
    if (this.packageForm.invalid) {
      this.packageForm.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    this.saving = true;
    const request = this.editingPackageId
      ? this.cableTvService.updatePackage(this.editingPackageId, this.packageForm.getRawValue())
      : this.cableTvService.addPackage(this.packageForm.value);
    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.saving = false;
        this.snackbar.openSnackbar(response?.message || 'Package saved successfully', '');
        this.closePackageModal();
        this.loadPackages();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  private calculateInternetPackagePrice() {
    if (!this.packageForm || this.packageForm.get('service_category')?.value !== 'INTERNET') {
      this.packageForm?.get('price_including_gst')?.setValue(0, { emitEvent: false });
      return;
    }
    const price = Number(this.packageForm.get('price')?.value) || 0;
    const gst = 18;
    this.packageForm.get('price_including_gst')?.setValue(Number((price + price * gst / 100).toFixed(2)), { emitEvent: false });
  }

  private handleError(error: any) {
    this.saving = false;
    this.ngxLoader.stop();
    this.snackbar.openSnackbar(error?.error?.message || globalConstants.genericError, globalConstants.errorRegex);
  }
}
