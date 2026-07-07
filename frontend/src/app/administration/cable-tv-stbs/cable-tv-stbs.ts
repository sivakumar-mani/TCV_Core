import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-cable-tv-stbs',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cable-tv-stbs.html',
  styleUrl: './cable-tv-stbs.scss'
})
export class CableTvStbs {
  stbs: any[] = [];
  msos: any[] = [];
  stbForm!: FormGroup;
  showStbModal = false;
  boxTypes = ['HD', 'SD'];
  stockTypes = ['NEW', 'SERVICED', 'RETURNED', 'FAULT'];
  statuses = ['AVAILABLE', 'NOT_AVAILABLE'];

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
      mso_id: [null, Validators.required],
      stb_amount: [0, [Validators.required, Validators.min(0)]],
      status: ['AVAILABLE', Validators.required]
    });
    this.loadStbs();
  }

  loadStbs() {
    this.ngxLoader.start();
    this.cableTvService.getMasters().subscribe({
      next: (masters: any) => {
        this.stbs = masters?.stbMasters || [];
        this.cableTvService.getLookups().subscribe({
          next: (lookups: any) => {
            this.ngxLoader.stop();
            this.msos = lookups?.installedMsos || [];
          },
          error: (error: any) => this.handleError(error)
        });
      },
      error: (error: any) => this.handleError(error)
    });
  }

  openStbModal() {
    this.stbForm.reset({ box_type: 'HD', stock_type: 'NEW', stb_amount: 0, status: 'AVAILABLE' });
    this.showStbModal = true;
  }

  closeStbModal() {
    this.showStbModal = false;
  }

  saveStb() {
    if (this.stbForm.invalid) {
      this.stbForm.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    this.cableTvService.addStbMaster(this.stbForm.value).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.snackbar.openSnackbar(response?.message || 'STB saved successfully', '');
        this.closeStbModal();
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
