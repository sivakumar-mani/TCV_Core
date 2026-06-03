import { Component, OnInit } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { SidebarService } from '../../services/sidebar.service';
import { NavSection, NavItem } from '../../models/nav.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
activeLabel = 'Dashboard';

openMenus: string[] = [];

constructor(
  public sidebarService: SidebarService
) {}

navSections: NavItem[] = [
  {
    label: 'Dashboard',
    icon: 'bi-house-fill',
    route: '/dashboard'
  },

  {
    label: 'Administration',
    icon: 'bi-people-fill',
    children: [
      {
        label: 'Users',
        icon: 'bi-list-ul',
        route: '/users'
      }
    ]
  },

  {
    label: 'Inventory',
    icon: 'bi-box-seam-fill',
    children: [
      {
        label: 'Brands',
        icon: 'bi-tags-fill',
        route: '/brands'
      },
      {
        label: 'Categories',
        icon: 'bi-diagram-3-fill',
        route: '/categoriesLists'
      },
      {
        label: 'Products',
        icon: 'bi-box-fill',
        route: '/productList'
      }
    ]
  },

  {
    label: 'Purchase',
    icon: 'bi-cart-check-fill',
    children: [
      {
        label: 'Suppliers',
        icon: 'bi-building-fill',
        route: '/suppliers'
      },
      {
        label: 'New Supplier',
        icon: 'bi-person-plus-fill',
        route: '/suppliers/add'
      }
    ]
  },

  {
    label: 'Workflow',
    icon: 'bi-check2-square',
    children: [
      {
        label: 'Approvals',
        icon: 'bi-patch-check-fill',
        route: '/dashboard'
      },
      {
        label: 'Material Issue',
        icon: 'bi-box-arrow-up',
        route: '/dashboard'
      },
      {
        label: 'Material Return',
        icon: 'bi-box-arrow-in-down',
        route: '/dashboard'
      }
    ]
  }
];

setActive(label: string): void {
  this.activeLabel = label;
}

hasChildren(item: any): boolean {
  return !!item.children?.length;
}

toggleMenu(label: string): void {
  if (this.openMenus.includes(label)) {
    this.openMenus = this.openMenus.filter(menu => menu !== label);
  } else {
    this.openMenus.push(label);
  }
}

isOpen(label: string): boolean {
  return this.openMenus.includes(label);
}

trackByLabel(index: number, item: any): string {
  return item.label;
}
}
