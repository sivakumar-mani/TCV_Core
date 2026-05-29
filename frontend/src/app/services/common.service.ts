import { Injectable, signal, computed } from '@angular/core';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class CommonService {
  readonly loading = signal<boolean>(false);
  readonly toast = signal<ToastMessage | null>(null);

  readonly isLoading = computed(() => this.loading());

  setLoading(state: boolean): void {
    this.loading.set(state);
  }

  showToast(message: string, type: ToastMessage['type'] = 'info', duration = 3000): void {
    this.toast.set({ message, type, duration });
    setTimeout(() => this.toast.set(null), duration);
  }

  setLocalStorage(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  getLocalStorage<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  removeLocalStorage(key: string): void {
    localStorage.removeItem(key);
  }

  clearLocalStorage(): void {
    localStorage.clear();
  }
}
