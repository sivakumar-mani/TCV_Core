import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private _collapsed = new BehaviorSubject<boolean>(true);
  private _mobileOpen = new BehaviorSubject<boolean>(false);
  private _activePage = new BehaviorSubject<string>('Dashboard');

  isCollapsed$ = this._collapsed.asObservable();
  mobileOpen$ = this._mobileOpen.asObservable();
  activePage$ = this._activePage.asObservable();

  get isCollapsed(): boolean { return this._collapsed.value; }

  toggle(): void {
    if (window.innerWidth <= 768) {
      this._mobileOpen.next(!this._mobileOpen.value);
    } else {
      this._collapsed.next(!this._collapsed.value);
    }
  }

  closeMobile(): void {
    this._mobileOpen.next(false);
  }

  setActivePage(label: string): void {
    this._activePage.next(label);
    if (window.innerWidth <= 768) this.closeMobile();
  }
}
