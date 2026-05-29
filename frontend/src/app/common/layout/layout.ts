import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarService } from '../../services/sidebar.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { StatCardsComponent } from '../../common/stat-cards/stat-cards.component';
import { BreadcrumbComponent } from '../../common/breadcrumb/breadcrumb.component';
@Component({
  selector: 'app-layout',
   imports: [RouterOutlet, SidebarComponent, TopbarComponent, CommonModule, StatCardsComponent, BreadcrumbComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
 constructor(public sidebarService: SidebarService) {}
}
