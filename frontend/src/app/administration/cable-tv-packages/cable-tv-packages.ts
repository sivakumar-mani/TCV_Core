import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-cable-tv-packages',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cable-tv-packages.html',
  styleUrl: './cable-tv-packages.scss'
})
export class CableTvPackages {
  packages: any[] = [];
  packageForm!: FormGroup;
  showPackageModal = false;
  packageTypes = ['MSO_PACKAGE', 'ADDON', 'ALACARTE', 'BROADCAST'];

  constructor(
    private fb: FormBuilder,
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private snackbar: Snackbar
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

  openPackageModal() {
    this.packageForm.reset({ package_type: 'MSO_PACKAGE', service_category: 'CATV', internet_network_type: null, price: 0, gst_percent: 0, price_including_gst: 0 });
    this.showPackageModal = true;
  }

  closePackageModal() {
    this.showPackageModal = false;
  }

  savePackage() {
    if (this.packageForm.invalid) {
      this.packageForm.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    this.cableTvService.addPackage(this.packageForm.value).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
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
    this.ngxLoader.stop();
    this.snackbar.openSnackbar(error?.error?.message || globalConstants.genericError, globalConstants.errorRegex);
  }
}
