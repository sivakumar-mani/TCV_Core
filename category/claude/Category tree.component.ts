// src/app/components/category-tree/category-tree.component.ts
import { Component, OnInit, Output, EventEmitter, Input, OnChanges } from '@angular/core';
import { CategoryService } from '../../services/category.service';
import { CategoryNode } from '../../models/category.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-tree',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-tree.component.html',
  styleUrls: ['./category-tree.component.scss']
})
export class CategoryTreeComponent implements OnInit, OnChanges {
  @Input() refreshTrigger = 0;
  @Output() editCategory   = new EventEmitter<CategoryNode>();
  @Output() addChild       = new EventEmitter<CategoryNode>();
  @Output() deleteCategory = new EventEmitter<CategoryNode>();

  tree: CategoryNode[] = [];
  loading = false;
  error   = '';

  readonly LEVEL_COLORS: Record<number, string> = {
    1: '#6366f1',  // indigo
    2: '#0ea5e9',  // sky
    3: '#10b981',  // emerald
    4: '#f59e0b'   // amber
  };

  readonly LEVEL_LABELS: Record<number, string> = {
    1: 'Root',
    2: 'Category',
    3: 'Sub-Category',
    4: 'Variant'
  };

  constructor(private svc: CategoryService) {}

  ngOnInit() { this.load(); }
  ngOnChanges() { if (this.refreshTrigger) this.load(); }

  load() {
    this.loading = true;
    this.error   = '';
    this.svc.getTree(true).subscribe({
      next:  tree => { this.tree = this.initTree(tree); this.loading = false; },
      error: err  => { this.error = err.message; this.loading = false; }
    });
  }

  private initTree(nodes: CategoryNode[]): CategoryNode[] {
    return nodes.map(n => ({
      ...n,
      expanded: n.level <= 2,
      children: n.children ? this.initTree(n.children) : []
    }));
  }

  toggle(node: CategoryNode) { node.expanded = !node.expanded; }
  expandAll()   { this.setExpanded(this.tree, true);  }
  collapseAll() { this.setExpanded(this.tree, false); }

  private setExpanded(nodes: CategoryNode[], val: boolean) {
    nodes.forEach(n => { n.expanded = val; if (n.children) this.setExpanded(n.children, val); });
  }

  levelColor(level: number) { return this.LEVEL_COLORS[level] || '#94a3b8'; }
  levelLabel(level: number) { return this.LEVEL_LABELS[level] || `L${level}`; }
  canAddChild(node: CategoryNode) { return node.level < 4; }
}