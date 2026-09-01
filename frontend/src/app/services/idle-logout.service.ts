import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, NgZone } from '@angular/core';
import { AuthService } from './auth-service';
import { Snackbar } from './snackbar';

@Injectable({ providedIn: 'root' })
export class IdleLogoutService {
  private readonly timeoutMs = 30 * 60 * 1000;
  private readonly activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
  private timeoutId?: ReturnType<typeof setTimeout>;
  private started = false;
  private lastReset = 0;
  private readonly activityHandler = () => this.resetTimer();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private zone: NgZone,
    private authService: AuthService,
    private snackbar: Snackbar
  ) {}

  start() {
    if (this.started || !this.authService.hasToken()) return;
    this.started = true;
    this.zone.runOutsideAngular(() => {
      this.activityEvents.forEach((event) => this.document.addEventListener(event, this.activityHandler, { passive: true }));
      this.scheduleLogout();
    });
  }

  stop() {
    if (!this.started) return;
    this.started = false;
    this.activityEvents.forEach((event) => this.document.removeEventListener(event, this.activityHandler));
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = undefined;
  }

  private resetTimer() {
    const now = Date.now();
    if (!this.started || now - this.lastReset < 1000) return;
    this.lastReset = now;
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.scheduleLogout();
  }

  private scheduleLogout() {
    this.timeoutId = setTimeout(() => {
      this.zone.run(() => {
        this.stop();
        this.authService.logout();
        this.snackbar.openSnackbar('You were logged out after 30 minutes of inactivity.', 'error');
      });
    }, this.timeoutMs);
  }
}
