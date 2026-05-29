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
activeLabel = 'Home';

openMenus: string[] = [];

constructor(
  public sidebarService: SidebarService
) {}

navSections: NavItem[] = [
  {
    label: 'Home',
    icon: 'bi-house-fill',
    route: '/home'
  },
  {
    label: 'Dashboard',
    icon: 'bi-grid-1x2-fill',
    route: '/dashboard'
  },

  // =====================================================
  // Supplier Management
  // =====================================================

  {
    label: 'Supplier Management',
    icon: 'bi-people-fill',
    children: [
      {
        label: 'Supplier Dashboard',
        icon: 'bi-speedometer2',
        route: '/supplierDashboard'
      },
      {
        label: 'Supplier List',
        icon: 'bi-list-ul',
        route: '/listSupplier'
      },
      {
        label: 'New Supplier',
        icon: 'bi-person-plus-fill',
        route: '/newSupplier'
      }
    ]
  },

  // =====================================================
  // Employee Management
  // =====================================================

  {
    label: 'Employee Management',
    icon: 'bi-person-workspace',
    children: [
      {
        label: 'Employee Dashboard',
        icon: 'bi-speedometer2',
        route: '/employeeDashboard'
      },
      {
        label: 'Employee List',
        icon: 'bi-list-ul',
        route: '/listEmployee'
      },
      {
        label: 'New Employee',
        icon: 'bi-person-plus-fill',
        route: '/newEmployee'
      }
    ]
  },

  // =====================================================
  // Upload Center
  // =====================================================

  {
    label: 'Upload Center',
    icon: 'bi-cloud-upload-fill',
    children: [
      {
        label: 'Documents',
        icon: 'bi-file-earmark-text',
        route: '/documents'
      },
      {
        label: 'Images',
        icon: 'bi-image-fill',
        route: '/images'
      },
      {
        label: 'Bulk Upload',
        icon: 'bi-upload',
        route: '/bulkUpload'
      }
    ]
  },

  // =====================================================
  // Contract Management
  // =====================================================

  {
    label: 'Contract Management',
    icon: 'bi-file-earmark-lock-fill',
    children: [
      {
        label: 'Contract Dashboard',
        icon: 'bi-speedometer2',
        route: '/contractDashboard'
      },
      {
        label: 'Contract List',
        icon: 'bi-file-earmark-text-fill',
        route: '/contractList'
      },
      {
        label: 'New Contract',
        icon: 'bi-file-earmark-plus-fill',
        route: '/newContract'
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
