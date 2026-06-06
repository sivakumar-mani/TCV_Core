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
      },
      {
        label: 'Stock Summary',
        icon: 'bi-clipboard-data-fill',
        route: '/stock'
      },
      {
        label: 'Stock Ledger',
        icon: 'bi-journal-text',
        route: '/stock-ledger'
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
      },
      {
        label: 'Purchase List',
        icon: 'bi-receipt',
        route: '/purchases'
      },
      {
        label: 'New Purchase',
        icon: 'bi-cart-plus-fill',
        route: '/purchases/add'
      }
    ]
  },

  {
    label: 'Sales',
    icon: 'bi-cash-coin',
    children: [
      {
        label: 'Customers',
        icon: 'bi-person-lines-fill',
        route: '/customers'
      },
      {
        label: 'New Customer',
        icon: 'bi-person-plus-fill',
        route: '/customers/add'
      },
      {
        label: 'Quotations',
        icon: 'bi-file-earmark-text-fill',
        route: '/quotations'
      },
      {
        label: 'New Quotation',
        icon: 'bi-file-earmark-plus-fill',
        route: '/quotations/add'
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
        route: '/approvals'
      },
      {
        label: 'Material Issue',
        icon: 'bi-box-arrow-up',
        route: '/material-issues'
      },
      {
        label: 'New Issue',
        icon: 'bi-plus-square-fill',
        route: '/material-issues/add'
      },
      {
        label: 'Material Return',
        icon: 'bi-box-arrow-in-down',
        route: '/material-returns'
      },
      {
        label: 'New Return',
        icon: 'bi-plus-square-fill',
        route: '/material-returns/add'
      }
    ]
  }
];

setActive(label: string): void {
  this.activeLabel = label;
  this.sidebarService.setActivePage(label);
}

hasChildren(item: any): boolean {
  return !!item.children?.length;
}

toggleMenu(label: string): void {
  if (this.openMenus.includes(label)) {
    this.openMenus = [];
  } else {
    this.openMenus = [label];
  }
}

isOpen(label: string): boolean {
  return this.openMenus.includes(label);
}

trackByLabel(index: number, item: any): string {
  return item.label;
}
}
