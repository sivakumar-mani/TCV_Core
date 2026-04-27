// src/app/models/category.model.ts
export interface Category {
  category_id: number;
  category_name: string;
  parent_id: number | null;
  level: number;
  slug: string;
  status: 0 | 1;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  // Relations
  parent_name?: string;
  breadcrumb?: BreadcrumbItem[];
  children?: Category[];
}

export interface BreadcrumbItem {
  category_id: number;
  category_name: string;
  slug: string;
  level: number;
}

export interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  level1: number;
  level2: number;
  level3: number;
  level4: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CategoryFormData {
  category_name: string;
  parent_id: number | null;
  slug?: string;
  status: 0 | 1;
  sort_order: number;
}

// For tree display
export interface CategoryNode extends Category {
  children: CategoryNode[];
  expanded?: boolean;
  selected?: boolean;
  depth?: number;  // UI depth for indentation
}