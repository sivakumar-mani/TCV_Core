import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarService } from '../../services/sidebar.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="tcv-breadcrumb-bar">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb tcv-breadcrumb">
          <li class="breadcrumb-item">
            <a routerLink="/dashboard"><i class="bi bi-house-door-fill me-1"></i>Dashboard</a>
          </li>
          <li class="breadcrumb-item active" *ngFor="let item of activeTrail" aria-current="page">
            {{ item }}
          </li>
        </ol>
      </nav>
      <div class="tcv-breadcrumb-title">{{ activePage }}</div>
    </div>
  `,
  styles: [`
    .tcv-breadcrumb-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 0 0 12px;
      padding: 8px 12px;
      border: 1px solid #9fc5ef;
      border-radius: 7px;
      background: linear-gradient(180deg, #eaf5ff 0%, #d6e9fb 100%);
      box-shadow: 0 2px 8px rgba(30, 64, 175, 0.08);
    }
    .tcv-breadcrumb {
      align-items: center;
      margin: 0;
      font-size: 12.5px;
      font-weight: 600;
    }
    .tcv-breadcrumb a {
      color: #005a9c;
      text-decoration: none;
    }
    .tcv-breadcrumb .active {
      color: #0f172a;
    }
    .tcv-breadcrumb-title {
      color: #003b68;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
    }
    @media (max-width: 768px) {
      .tcv-breadcrumb-bar {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `]
})
export class BreadcrumbComponent implements OnInit {
  activePage = 'Dashboard';
  activeTrail: string[] = [];

  private routeLabels: Record<string, string> = {
    users: 'Users',
    brands: 'Brands',
    categoriesLists: 'Categories',
    productList: 'Products',
    suppliers: 'Suppliers',
    add: 'Add',
    edit: 'Edit',
    approvals: 'Approvals',
    purchases: 'Purchases',
    'material-issues': 'Material Issues',
    'material-returns': 'Material Returns',
    stock: 'Stock Summary',
    'stock-ledger': 'Stock Ledger',
    customers: 'Customers',
    quotations: 'Quotations',
    dashboard: 'Dashboard'
  };

  constructor(
    private sidebarService: SidebarService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sidebarService.activePage$.subscribe(p => this.activePage = p);
    this.setRouteTrail(this.router.url);
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => this.setRouteTrail(event.urlAfterRedirects));
  }

  private setRouteTrail(url: string): void {
    const segments = url.split('?')[0].split('/').filter(Boolean);
    const labels = segments
      .filter(segment => Number.isNaN(Number(segment)))
      .map(segment => this.routeLabels[segment] || this.toTitle(segment));

    this.activeTrail = labels[0] === 'Dashboard' ? [] : labels;
    this.activePage = labels.length ? labels[labels.length - 1] : 'Dashboard';
  }

  private toTitle(value: string): string {
    return value
      .replace(/-/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }
}
