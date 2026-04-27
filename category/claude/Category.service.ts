// src/app/services/category.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse, Category, CategoryFormData, CategoryNode, CategoryStats } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private base = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}

  // ─── TREE ─────────────────────────────────────────────────────────────────
  getTree(all = false): Observable<CategoryNode[]> {
    const params = all ? new HttpParams().set('all', 'true') : undefined;
    return this.http.get<ApiResponse<CategoryNode[]>>(`${this.base}/tree`, { params })
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ─── FLAT LIST ────────────────────────────────────────────────────────────
  getAll(filters?: { status?: number; level?: number; parent_id?: number; search?: string }): Observable<Category[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
      });
    }
    return this.http.get<ApiResponse<Category[]>>(this.base, { params })
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ─── ROOTS ────────────────────────────────────────────────────────────────
  getRoots(): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(`${this.base}/roots`)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ─── CHILDREN ─────────────────────────────────────────────────────────────
  getChildren(parentId: number): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(`${this.base}/${parentId}/children`)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ─── SINGLE ───────────────────────────────────────────────────────────────
  getById(id: number): Observable<Category> {
    return this.http.get<ApiResponse<Category>>(`${this.base}/${id}`)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ─── STATS ────────────────────────────────────────────────────────────────
  getStats(): Observable<CategoryStats> {
    return this.http.get<ApiResponse<CategoryStats>>(`${this.base}/stats`)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────
  create(data: CategoryFormData): Observable<Category> {
    return this.http.post<ApiResponse<Category>>(this.base, data)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────
  update(id: number, data: Partial<CategoryFormData>): Observable<Category> {
    return this.http.put<ApiResponse<Category>>(`${this.base}/${id}`, data)
      .pipe(map(r => r.data), catchError(this.handleError));
  }

  // ─── DEACTIVATE ───────────────────────────────────────────────────────────
  deactivate(id: number): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/${id}/deactivate`, {})
      .pipe(map(() => undefined), catchError(this.handleError));
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────
  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`)
      .pipe(map(() => undefined), catchError(this.handleError));
  }

  // ─── REORDER ──────────────────────────────────────────────────────────────
  reorder(items: { category_id: number; sort_order: number }[]): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/reorder`, { items })
      .pipe(map(() => undefined), catchError(this.handleError));
  }

  // ─── HELPER: flatten tree to list ─────────────────────────────────────────
  flattenTree(nodes: CategoryNode[], depth = 0): (CategoryNode & { depth: number })[] {
    const result: (CategoryNode & { depth: number })[] = [];
    for (const node of nodes) {
      result.push({ ...node, depth });
      if (node.children?.length) {
        result.push(...this.flattenTree(node.children, depth + 1));
      }
    }
    return result;
  }

  // ─── HELPER: build label with indent ──────────────────────────────────────
  buildSelectOptions(nodes: CategoryNode[], prefix = ''): { label: string; value: number; level: number }[] {
    const result: { label: string; value: number; level: number }[] = [];
    for (const node of nodes) {
      result.push({ label: prefix + node.category_name, value: node.category_id, level: node.level });
      if (node.children?.length) {
        result.push(...this.buildSelectOptions(node.children, prefix + '  ↳ '));
      }
    }
    return result;
  }

  private handleError(err: any) {
    const msg = err?.error?.message || err?.message || 'Unknown error';
    return throwError(() => new Error(msg));
  }
}