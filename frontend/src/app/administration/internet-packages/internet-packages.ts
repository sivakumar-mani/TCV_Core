import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { appConfig } from '../../app-config';

@Component({
  selector: 'app-internet-packages',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './internet-packages.html',
  styleUrl: '../cable-tv-packages/cable-tv-packages.scss'
})
export class InternetPackages {
  private http = inject(HttpClient);
  private endpoint = `${appConfig.apiUrl}/v1/internet/packages`;
  packages: any[] = [];
  search = '';
  loading = false;
  saving = false;
  showModal = false;
  editingId: number | null = null;
  error = '';
  message = '';
  form = inject(FormBuilder).group({
    package_name: ['', [Validators.required, Validators.maxLength(255), Validators.pattern(/\S/)]],
    package_code: ['', Validators.maxLength(50)],
    provider_category: ['KRISHI', Validators.required],
    price: [0, [Validators.required, Validators.min(0), Validators.max(9999999999.99)]],
    gst_percent: [18, [Validators.required, Validators.min(0), Validators.max(100)]],
    description: ['']
  });
  ngOnInit() { this.load(); }
  get filteredPackages() {
    const search = this.search.trim().toLowerCase();
    return this.packages.filter(p => `${p.package_name} ${p.package_code || ''} ${p.provider_category}`.toLowerCase().includes(search));
  }
  get total() { return Number(this.form.controls.price.value || 0) * (1 + Number(this.form.controls.gst_percent.value || 0) / 100); }
  load() {
    this.error = '';
    this.loading = true;
    this.http.get<any>(this.endpoint).subscribe({
      next: result => { this.packages = result.packages || []; this.loading = false; },
      error: err => { this.error = err?.error?.message || 'Unable to load Internet packages'; this.loading = false; }
    });
  }
  open(pkg?: any) {
    this.editingId = pkg?.package_id ?? null;
    this.error = ''; this.message = '';
    this.form.reset(pkg ? {
      package_name: pkg.package_name, package_code: pkg.package_code || '', provider_category: pkg.provider_category,
      price: Number(pkg.price), gst_percent: Number(pkg.gst_percent), description: pkg.description || ''
    } : { package_name: '', package_code: '', provider_category: 'KRISHI', price: 0, gst_percent: 18, description: '' });
    if (pkg) this.form.controls.provider_category.disable();
    else this.form.controls.provider_category.enable();
    this.showModal = true;
  }
  close() { if (!this.saving) { this.showModal = false; this.error = ''; } }
  save() {
    if (this.saving) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true; this.error = '';
    const request = this.editingId
      ? this.http.put<any>(`${this.endpoint}/${this.editingId}`, this.form.getRawValue())
      : this.http.post<any>(this.endpoint, this.form.getRawValue());
    request.subscribe({
      next: result => { this.saving = false; this.showModal = false; this.message = result.message; this.load(); },
      error: err => { this.saving = false; this.error = err?.error?.message || 'Unable to save Internet package'; }
    });
  }
}
