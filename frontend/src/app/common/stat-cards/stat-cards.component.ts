import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StatCard } from '../../models/nav.model';

@Component({
  selector: 'app-stat-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-xl-3" *ngFor="let card of statCards">
        <div class="stat-card">
          <div class="stat-icon"
               [style.background]="card.iconBg"
               [style.color]="card.iconColor">
            <i class="bi {{ card.icon }}"></i>
          </div>
          <div>
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
            <span class="stat-badge"
                  [style.background]="card.badgeBg"
                  [style.color]="card.badgeColor">{{ card.badge }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      box-shadow: var(--shadow-card);
      display: flex; align-items: flex-start; gap: 16px;
      transition: transform 0.18s, box-shadow 0.18s;
      &:hover { transform: translateY(-2px); box-shadow: 0 4px 24px rgba(0,0,0,0.09); }
    }
    .stat-icon {
      width: 46px; height: 46px;
      border-radius: 11px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    .stat-value { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: var(--text-main); line-height: 1; }
    .stat-label { font-size: 12.5px; color: var(--text-muted); margin-top: 3px; }
    .stat-badge { font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 20px; margin-top: 6px; display: inline-block; }
  `]
})
export class StatCardsComponent implements OnInit {
  statCards: StatCard[] = [];
  constructor() {}
  ngOnInit(): void {  }
}
