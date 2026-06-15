import {Component, Input, signal} from '@angular/core';
import { NgIf } from '@angular/common';
import {MatExpansionModule} from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';
@Component({
  selector: 'app-sidebar',
  imports: [NgIf, MatExpansionModule, MatListModule, MatIcon, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
@Input() collapsed = false;
readonly panelOpenState = signal(false);  // using to expand collapse the accordion
}
