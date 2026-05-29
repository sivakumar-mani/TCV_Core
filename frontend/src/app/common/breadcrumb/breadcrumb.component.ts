import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <ul class="breadcrumb-custom">
        <li><a href="#" (click)="$event.preventDefault()"><i class="bi bi-house me-1"></i>Home</a></li>

        <li class="active">{{ activePage }}</li>
      </ul>
      <h1 class="page-title">{{ activePage }}</h1>
     
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 22px; font-weight: 700; color: var(--text-main); letter-spacing: -0.4px; }
    .page-subtitle { font-size: 13.5px; color: var(--text-muted); margin-top: 2px; }
    .breadcrumb-custom {
      display: flex; align-items: center; gap: 6px;
      list-style: none; padding: 0;
      font-size: 12.5px; margin-bottom: 6px;
      li { display: flex; align-items: center; gap: 6px; color: var(--text-muted); }
      li a { color: var(--text-muted); text-decoration: none; transition: color 0.15s; }
      li a:hover { color: var(--accent); }
      li.active { color: var(--text-main); font-weight: 500; }
      li:not(:last-child)::after {
        content: ''; display: inline-block;
        width: 4px; height: 4px;
        background: var(--border); border-radius: 50%;
      }
    }
  `]
})
export class BreadcrumbComponent implements OnInit {
  activePage = 'Home';
  constructor(private sidebarService: SidebarService) {}
  ngOnInit(): void {
    this.sidebarService.activePage$.subscribe(p => this.activePage = p);
  }
}
