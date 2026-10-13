import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { appConfig } from '../app-config';

declare global {
  interface Window { NativeTracker?: { postMessage(message: string): void }; }
}
@Component({
  selector: 'app-tracker', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './tracker.html', styleUrl: './tracker.scss'
})
export class Tracker implements OnInit, OnDestroy {
  admin = false;
  native = !!window.NativeTracker;
  consent = false;
  session: any = null;
  employees: any[] = [];
  selected: any = null;
  history: any = { locations: [], sessions: [], events: [] };
  date = new Date().toISOString().slice(0, 10);
  remarks = '';
  message = '';
  busy = false;
  mapUrl: SafeResourceUrl | null = null;
  private timer?: ReturnType<typeof setInterval>;
  private watch?: number;
  private lastSent = 0;
  private endpoint = `${appConfig.apiUrl}/tracker`;
  constructor(private http: HttpClient, private route: ActivatedRoute, private sanitizer: DomSanitizer) {}
  ngOnInit() {
    this.admin = !!this.route.snapshot.data['trackerAdmin'];
    this.refresh();
    if (this.admin) this.timer = setInterval(() => this.refresh(), 30000);
  }
  refresh() {
    if (this.admin) this.http.get<any[]>(`${this.endpoint}/live`).subscribe({
      next: rows => { this.employees = rows; if (this.selected) { this.selected = rows.find(r => r.employee_id === this.selected.employee_id); this.showMap(this.selected); } },
      error: e => this.error(e)
    });
    else this.http.get<any>(`${this.endpoint}/me`).subscribe({
      next: data => { this.session = data.session; this.loadHistory(); }, error: e => this.error(e)
    });
  }
  start() {
    if (!this.consent || this.busy) return;
    this.busy = true;
    this.http.post<any>(`${this.endpoint}/duty/start`, { consent: true }).subscribe({
      next: result => { this.busy = false; this.session = { session_id: result.session_id }; this.resume(); this.message = 'Duty started. Location tracking is active during duty.'; this.loadHistory(); },
      error: e => { this.busy = false; this.error(e); }
    });
  }
  resume() {
    if (!this.session) return;
    if (this.native) {
      window.NativeTracker!.postMessage(JSON.stringify({ action: 'start', base: appConfig.apiUrl, token: localStorage.getItem('token') || '', session: String(this.session.session_id) }));
      this.message = 'Check the Android tracking notification for collection status.';
      return;
    }
    if (!navigator.geolocation) { this.message = 'Location is unavailable on this device.'; return; }
    if (this.watch !== undefined) return;
    this.watch = navigator.geolocation.watchPosition(position => {
      if (!this.session || Date.now() - this.lastSent < 60000) return;
      this.lastSent = Date.now();
      const p = { point_id: crypto.randomUUID(), latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, speed: position.coords.speed, recorded_at: new Date(position.timestamp).toISOString(), network_type: navigator.onLine ? 'ONLINE' : 'OFFLINE' };
      this.http.post(`${this.endpoint}/locations`, { session_id: this.session.session_id, points: [p] }).subscribe({
        next: () => { this.message = 'Location sent at ' + new Date().toLocaleTimeString(); this.showMap(p); }, error: e => this.error(e)
      });
    }, e => { this.message = e.message; }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
  }
  stop() {
    if (this.busy) return;
    this.clearWatch();
    window.NativeTracker?.postMessage(JSON.stringify({ action: 'stop' }));
    this.busy = true;
    this.http.post(`${this.endpoint}/duty/stop`, {}).subscribe({
      next: () => { this.busy = false; this.session = null; this.message = 'Duty ended. Location collection stopped.'; this.loadHistory(); },
      error: e => { this.busy = false; this.message = 'Collection stopped on this device. Retry End Duty to close the server session. ' + (e.error?.message || ''); }
    });
  }
  event(kind: string) {
    this.http.post(`${this.endpoint}/events`, { kind, remarks: this.remarks }).subscribe({
      next: () => { this.message = kind === 'SOS' ? 'SOS recorded for the office. Call emergency services directly if needed.' : 'Event recorded.'; this.remarks = ''; this.loadHistory(); }, error: e => this.error(e)
    });
  }
  select(row: any) { this.selected = row; this.showMap(row); this.loadHistory(); }
  loadHistory() {
    if (this.admin && !this.selected) return;
    const suffix = this.admin ? `/${this.selected.employee_id}` : '';
    this.http.get<any>(`${this.endpoint}/history${suffix}`, { params: { date: this.date } }).subscribe({ next: h => this.history = h, error: e => this.error(e) });
  }
  showMap(point: any) {
    if (!point || point.latitude == null || point.longitude == null) { this.mapUrl = null; return; }
    const lat = Number(point.latitude), lon = Number(point.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const bbox = [Math.max(-180, lon - .015), Math.max(-90, lat - .015), Math.min(180, lon + .015), Math.min(90, lat + .015)].join(',');
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`);
  }
  exportCsv() {
    const rows = [['UTC time', 'Latitude', 'Longitude', 'Accuracy (m)', 'Battery (%)'], ...this.history.locations.map((p: any) => [p.recorded_at, p.latitude, p.longitude, p.accuracy, p.battery_level])];
    const csv = rows.map(r => r.map((v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = `tracker-${this.date}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  private error(e: any) { this.message = e.error?.message || 'Tracker request failed. Please retry.'; }
  private clearWatch() { if (this.watch !== undefined) navigator.geolocation.clearWatch(this.watch); this.watch = undefined; this.lastSent = 0; }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); this.clearWatch(); }
}
