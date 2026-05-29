import { Injectable } from '@angular/core';
import { ModuleCard } from '../models/module.model';

@Injectable({ providedIn: 'root' })
export class ModuleDataService {
  modules: ModuleCard[] = [
    {
      id: 'supplier',
      title: 'Supplier Management',
      icon: 'bi-building-fill-gear',
      route: '/supplier',
      description: 'Onboard, evaluate, and maintain your entire supplier network. Track performance KPIs, manage vendor relationships, and ensure compliance across your supply chain.',
      tags: ['Onboarding', 'KPI Tracking', 'Compliance', 'Audit Trail'],
      statA: { icon: 'bi-check-circle-fill', label: '214 Active', color: '#34d399' },
      statB: { icon: 'bi-clock-fill', label: '34 Pending', color: '#fbbf24' },
      count: '248', countLabel: 'Suppliers',
      gradientA: '#0ea5e9', gradientB: '#6366f1',
      orbColor: '#0ea5e9', dotA: '#0ea5e9', dotB: '#6366f1',
    },
    {
      id: 'employee',
      title: 'Employee Directory',
      icon: 'bi-people-fill',
      route: '/employee',
      description: 'Centralise your workforce data with a smart employee directory. Manage profiles, departments, roles, and org structures — with HR workflow integration built in.',
      tags: ['Profiles', 'Org Chart', 'Departments', 'Attendance'],
      statA: { icon: 'bi-person-check-fill', label: '1,780 Active', color: '#34d399' },
      statB: { icon: 'bi-person-dash-fill', label: '62 On Leave', color: '#f87171' },
      count: '1,842', countLabel: 'Employees',
      gradientA: '#10b981', gradientB: '#0ea5e9',
      orbColor: '#10b981', dotA: '#10b981', dotB: '#0ea5e9',
    },
    {
      id: 'upload',
      title: 'Upload Center',
      icon: 'bi-cloud-arrow-up-fill',
      route: '/upload-center',
      description: 'Secure, centralised document management with version control, smart categorisation, and bulk operations. Drag-and-drop with OCR extraction and full-text search.',
      tags: ['Drag & Drop', 'Versioning', 'OCR', 'Search'],
      statA: { icon: 'bi-file-earmark-check-fill', label: '4.9K Processed', color: '#34d399' },
      statB: { icon: 'bi-arrow-repeat', label: '18 Processing', color: '#fbbf24' },
      count: '5.2K', countLabel: 'Documents',
      gradientA: '#f59e0b', gradientB: '#ef4444',
      orbColor: '#f59e0b', dotA: '#f59e0b', dotB: '#ef4444',
    },
    {
      id: 'contract',
      title: 'Contract Management',
      icon: 'bi-file-earmark-text-fill',
      route: '/contract',
      description: 'End-to-end contract lifecycle management from creation to renewal. E-signature workflows, expiry alerts, clause library, and full approval audit trails built in.',
      tags: ['E-Signature', 'Lifecycle', 'Renewals', 'Approvals'],
      statA: { icon: 'bi-patch-check-fill', label: '72 Active', color: '#34d399' },
      statB: { icon: 'bi-exclamation-triangle-fill', label: '8 Expiring', color: '#fbbf24' },
      count: '94', countLabel: 'Contracts',
      gradientA: '#8b5cf6', gradientB: '#ec4899',
      orbColor: '#8b5cf6', dotA: '#8b5cf6', dotB: '#ec4899',
    },
  ];

  getById(id: string) {
    return this.modules.find(m => m.id === id);
  }
}
