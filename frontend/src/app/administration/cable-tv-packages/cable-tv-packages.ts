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
      price: [0, [Validators.required, Validators.min(0)]],
      description: ['']
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
    this.packageForm.reset({ package_type: 'MSO_PACKAGE', price: 0 });
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

  private handleError(error: any) {
    this.ngxLoader.stop();
    this.snackbar.openSnackbar(error?.error?.message || globalConstants.genericError, globalConstants.errorRegex);
  }
}
