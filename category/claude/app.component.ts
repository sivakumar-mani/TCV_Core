// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryTreeComponent } from './components/category-tree/category-tree.component';
import { CategoryFormComponent } from './components/category-form/category-form.component';
import { CategoryService } from './services/category.service';
import { Category, CategoryNode, CategoryStats } from './models/category.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CategoryTreeComponent, CategoryFormComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  stats: CategoryStats | null = null;
  showForm  = false;
  editData: Category | null = null;
  parentPreset: Category | null = null;
  refreshTrigger = 0;

  // Delete confirm
  deleteTarget: CategoryNode | null = null;
  deleting = false;
  deleteError = '';

  // Toast
  toast: { msg: string; type: 'success' | 'error' } | null = null;

  readonly STAT_LEVELS = [
    { key: 'level1', label: 'L1 Root',     icon: '🏷', color: '#6366f1' },
    { key: 'level2', label: 'L2 Category', icon: '📁', color: '#0ea5e9' },
    { key: 'level3', label: 'L3 Sub-Cat',  icon: '📂', color: '#10b981' },
    { key: 'level4', label: 'L4 Variant',  icon: '🔖', color: '#f59e0b' }
  ];

  constructor(private svc: CategoryService) {}

  ngOnInit() { this.loadStats(); }

  loadStats() {
    this.svc.getStats().subscribe({ next: s => this.stats = s });
  }

  // ── Form open/close ────────────────────────────────────────────────────────
  openCreate() {
    this.editData     = null;
    this.parentPreset = null;
    this.showForm     = true;
  }

  onEdit(node: CategoryNode) {
    this.editData     = node;
    this.parentPreset = null;
    this.showForm     = true;
  }

  onAddChild(node: CategoryNode) {
    this.editData     = null;
    this.parentPreset = node;
    this.showForm     = true;
  }

  onSaved() {
    this.showForm = false;
    this.refreshTrigger++;
    this.loadStats();
    this.showToast('Category saved successfully!', 'success');
  }

  onCancelled() { this.showForm = false; }

  // ── Delete flow ────────────────────────────────────────────────────────────
  onDeleteRequest(node: CategoryNode) {
    this.deleteTarget = node;
    this.deleteError  = '';
  }

  confirmDelete() {
    if (!this.deleteTarget) return;
    this.deleting = true;
    this.svc.delete(this.deleteTarget.category_id).subscribe({
      next: () => {
        this.deleting     = false;
        this.deleteTarget = null;
        this.refreshTrigger++;
        this.loadStats();
        this.showToast('Category deleted', 'success');
      },
      error: err => {
        this.deleteError = err.message;
        this.deleting    = false;
      }
    });
  }

  cancelDelete() { this.deleteTarget = null; }

  // ── Toast ─────────────────────────────────────────────────────────────────
  showToast(msg: string, type: 'success' | 'error') {
    this.toast = { msg, type };
    setTimeout(() => this.toast = null, 3500);
  }

  statValue(key: string): number {
    return (this.stats as any)?.[key] ?? 0;
  }
}